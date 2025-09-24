'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { ITeam, ITeamMember, IProfile } from '@/types/main.db';
import { 
  FiPlus, FiUsers, FiUser, FiEdit2, FiTrash2, 
  FiChevronRight, FiGlobe, FiLock, FiSearch,
  FiX, FiSettings, FiArrowLeft, FiAlertCircle
} from 'react-icons/fi';

// Extended interface to include joined team data
interface ITeamMemberWithTeam extends ITeamMember {
  teams: ITeam;
}

export default function CreateTeamPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [userTeams, setUserTeams] = useState<ITeam[]>([]);
  const [userMemberships, setUserMemberships] = useState<ITeamMemberWithTeam[]>([]);
  const [userProfile, setUserProfile] = useState<IProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTeamData, setNewTeamData] = useState({
    name: '',
    description: '',
    visibility: 'private' as 'private' | 'public'
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch user data and teams
  useEffect(() => {
    const fetchUserData = async () => {
      setIsLoading(true);
      
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          router.push('/login');
          return;
        }

        // Get or create user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist, create one
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
              created_at: new Date(),
              updated_at: new Date()
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
            setErrorMessage('Failed to setup user profile');
          } else {
            setUserProfile(newProfile);
          }
        } else if (profileError) {
          console.error('Error fetching profile:', profileError);
          setErrorMessage('Error loading user profile');
        } else {
          setUserProfile(profile);
        }

        // Get teams owned by user
        const { data: ownedTeams, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });

        if (teamsError) {
          console.error('Error fetching teams:', teamsError);
        } else {
          setUserTeams(ownedTeams || []);
        }

        // Get team memberships
        const { data: memberships, error: membershipsError } = await supabase
          .from('team_members')
          .select(`
            *,
            teams (*)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (membershipsError) {
          console.error('Error fetching memberships:', membershipsError);
        } else {
          setUserMemberships(memberships as ITeamMemberWithTeam[] || []);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        setErrorMessage('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [router, supabase]);

  // Handle creating a new team
  const createNewTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsCreating(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMessage('You must be logged in to create a team');
      setIsCreating(false);
      return;
    }

    try {
      // Validate profile exists
      if (!userProfile) {
        // Create profile if it doesn't exist
        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
            created_at: new Date(),
            updated_at: new Date()
          })
          .select()
          .single();

        if (profileError) {
          throw new Error(`Failed to create user profile: ${profileError.message}`);
        }
        setUserProfile(newProfile);
      }

      // Create the new team
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: newTeamData.name.trim(),
          description: newTeamData.description.trim(),
          visibility: newTeamData.visibility,
          owner_id: user.id
        })
        .select()
        .single();

      if (teamError) {
        if (teamError.code === '23503') {
          throw new Error('User profile not properly set up. Please try again.');
        }
        throw new Error(`Failed to create team: ${teamError.message}`);
      }

      // Add the creator as an owner member
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: newTeam.id,
          user_id: user.id,
          role: 'owner'
        });

      if (memberError) {
        console.error('Error adding team member:', memberError);
        // Continue anyway since the team was created successfully
      }

      // Reset form and redirect to the new team page
      setNewTeamData({ name: '', description: '', visibility: 'private' });
      setShowCreateForm(false);
      router.push(`/team/${newTeam.id}`);
      
    } catch (error) {
      console.error('Error creating team:', error);
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred while creating the team');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
            <p className="text-gray-600">Create and manage your research teams</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50"
            disabled={isCreating}
          >
            <FiPlus className="mr-2" /> New Team
          </button>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6 flex items-center">
            <FiAlertCircle className="mr-2 flex-shrink-0" />
            {errorMessage}
          </div>
        )}

        {/* Create Team Form */}
        {showCreateForm && (
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Create New Team</h2>
              <button 
                onClick={() => {
                  setShowCreateForm(false);
                  setErrorMessage(null);
                }}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                disabled={isCreating}
              >
                <FiX size={20} />
              </button>
            </div>
            
            <form onSubmit={createNewTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={50}
                  value={newTeamData.name}
                  onChange={(e) => setNewTeamData({...newTeamData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="Enter team name (2-50 characters)"
                  disabled={isCreating}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newTeamData.description}
                  onChange={(e) => setNewTeamData({...newTeamData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="Describe your team&apos;s purpose..."
                  rows={3}
                  maxLength={200}
                  disabled={isCreating}
                />
                <p className="text-xs text-gray-500 mt-1">{newTeamData.description.length}/200 characters</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visibility
                </label>
                <div className="flex flex-col sm:flex-row sm:space-x-6 space-y-2 sm:space-y-0">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="visibility"
                      value="private"
                      checked={newTeamData.visibility === 'private'}
                      onChange={() => setNewTeamData({...newTeamData, visibility: 'private'})}
                      className="mr-2"
                      disabled={isCreating}
                    />
                    <div className="flex items-center">
                      <FiLock className="mr-1" /> Private
                    </div>
                    <span className="ml-1 text-sm text-gray-500">Only invited members</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="visibility"
                      value="public"
                      checked={newTeamData.visibility === 'public'}
                      onChange={() => setNewTeamData({...newTeamData, visibility: 'public'})}
                      className="mr-2"
                      disabled={isCreating}
                    />
                    <div className="flex items-center">
                      <FiGlobe className="mr-1" /> Public
                    </div>
                    <span className="ml-1 text-sm text-gray-500">Anyone can join</span>
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setErrorMessage(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  disabled={isCreating || !newTeamData.name.trim()}
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Team'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Teams Owned by User */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Teams You Own</h2>
          
          {userTeams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userTeams.map(team => (
                <div key={team.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900 flex items-center">
                        {team.name}
                        {team.visibility === 'public' ? (
                          <FiGlobe className="ml-2 text-gray-500" size={14} title="Public team" />
                        ) : (
                          <FiLock className="ml-2 text-gray-500" size={14} title="Private team" />
                        )}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{team.description || 'No description'}</p>
                    </div>
                    <button 
                      className="text-gray-400 hover:text-gray-600"
                      onClick={() => router.push(`/team/${team.id}/settings`)}
                      title="Team settings"
                    >
                      <FiSettings size={16} />
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-xs text-gray-500">
                      Created {new Date(team.created_at).toLocaleDateString()}
                    </span>
                    <button 
                      onClick={() => router.push(`/team/${team.id}`)}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      Manage <FiChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
              <FiUsers className="mx-auto text-3xl text-gray-400 mb-3" />
              <p className="text-gray-500">You haven&apos;t created any teams yet.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                disabled={isCreating}
              >
                Create Your First Team
              </button>
            </div>
          )}
        </div>

        {/* Teams User is a Member Of */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Teams You&apos;re a Member Of</h2>

          {userMemberships.filter(m => m.role !== 'owner').length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userMemberships
                .filter(membership => membership.role !== 'owner')
                .map(membership => (
                  <div key={membership.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900 flex items-center">
                          {membership.teams.name}
                          {membership.teams.visibility === 'public' ? (
                            <FiGlobe className="ml-2 text-gray-500" size={14} title="Public team" />
                          ) : (
                            <FiLock className="ml-2 text-gray-500" size={14} title="Private team" />
                          )}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">{membership.teams.description || 'No description'}</p>
                        <p className="text-xs text-gray-500 mt-1 capitalize">Role: {membership.role}</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-4">
                      <span className="text-xs text-gray-500">
                        Joined {new Date(membership.created_at).toLocaleDateString()}
                      </span>
                      <button 
                        onClick={() => router.push(`/team/${membership.teams.id}`)}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        View <FiChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center">
              <FiUser className="mx-auto text-3xl text-gray-400 mb-3" />
              <p className="text-gray-500">You&apos;re not a member of any other teams.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}