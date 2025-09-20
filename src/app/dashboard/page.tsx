'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IUser, ITeam, IMember_Team, IPost, INotification, IMessage, ITeam_Message } from '@/types/main.db';
import { 
  FiPlus, FiUsers, FiUser, FiEdit2, FiTrash2, FiMail, FiBell, 
  FiMessageSquare, FiSearch, FiX, FiExternalLink, FiImage 
} from 'react-icons/fi';

interface MemberWithTeam extends IMember_Team {
  teams: ITeam;
}

interface WorkPost extends IPost {
  type: 'work';
}

export default function Dashboard() {
  const [authUser, setAuthUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [memberTeams, setMemberTeams] = useState<MemberWithTeam[]>([]);
  const [works, setWorks] = useState<WorkPost[]>([]);
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [teamMessages, setTeamMessages] = useState<ITeam_Message[]>([]);
  
  // Team states
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDescription, setNewTeamDescription] = useState('');
  const [newTeamVisibility, setNewTeamVisibility] = useState<'public' | 'private'>('private');
  const [teamError, setTeamError] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<ITeam | null>(null);

  // Work states
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [newWorkTitle, setNewWorkTitle] = useState('');
  const [newWorkContent, setNewWorkContent] = useState('');
  const [newWorkAttachment, setNewWorkAttachment] = useState('');
  const [newWorkLink, setNewWorkLink] = useState('');
  const [newWorkVisibility, setNewWorkVisibility] = useState<'public' | 'private'>('public');
  const [workError, setWorkError] = useState<string | null>(null);
  const [editingWork, setEditingWork] = useState<WorkPost | null>(null);

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    teams: ITeam[],
    works: WorkPost[],
    memberTeams: MemberWithTeam[]
  }>({ teams: [], works: [], memberTeams: [] });

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push('/sign-in');
        return;
      }
      
      setAuthUser({
        id: user.id,
        email: user.email ?? '',
        full_name: user.user_metadata?.full_name ?? '',
        name: user.user_metadata?.name ?? '',
        password: '',
        created_at: new Date(),
        updated_at: new Date(),
      });
      setLoading(false);
    };

    fetchUser();
  }, [router, supabase]);

  const fetchAllData = async () => {
    if (!authUser) return;

    try {
      // Fetch teams where user is owner
      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .eq('owner_id', authUser.id);
      
      setTeams(teamsData || []);

      // Fetch teams where user is member with team details
      const { data: memberTeamsData } = await supabase
        .from('member_team')
        .select('*, teams(*)')
        .eq('user_id', authUser.id);
      
      setMemberTeams(memberTeamsData as MemberWithTeam[] || []);

      // Fetch works (posts with type 'work')
      const { data: worksData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('type', 'work')
        .order('created_at', { ascending: false });

      setWorks(worksData as WorkPost[] || []);

      // Fetch other data
      const [
        { data: notificationsData },
        { data: messagesData }
      ] = await Promise.all([
        supabase.from('notifications').select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('messages').select('*')
          .or(`from_id.eq.${authUser.id},to_id.eq.${authUser.id}`)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      setNotifications(notificationsData || []);
      setMessages(messagesData || []);

      // Fetch team messages
      const teamIds = [
        ...(teamsData?.map(t => t.id) || []),
        ...(memberTeamsData?.map(mt => mt.team_id) || [])
      ];

      if (teamIds.length > 0) {
        const { data: teamMessagesData } = await supabase
          .from('team_messages')
          .select('*')
          .in('team_id', teamIds)
          .order('created_at', { ascending: false })
          .limit(5);
        
        setTeamMessages(teamMessagesData || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    if (authUser) {
      fetchAllData();
    }
  }, [authUser]);

  const handleSearch = async () => {
    if (!authUser || !searchQuery.trim()) {
      setSearchResults({ teams: [], works: [], memberTeams: [] });
      return;
    }

    try {
      const [teamsResult, worksResult, memberTeamsResult] = await Promise.all([
        supabase
          .from('teams')
          .select('*')
          .eq('owner_id', authUser.id)
          .ilike('name', `%${searchQuery}%`),
        
        supabase
          .from('posts')
          .select('*')
          .eq('user_id', authUser.id)
          .eq('type', 'work')
          .ilike('title', `%${searchQuery}%`),
        
        supabase
          .from('member_team')
          .select('*, teams(*)')
          .eq('user_id', authUser.id)
          .ilike('teams.name', `%${searchQuery}%`)
      ]);

      setSearchResults({
        teams: teamsResult.data || [],
        works: worksResult.data as WorkPost[] || [],
        memberTeams: memberTeamsResult.data as MemberWithTeam[] || []
      });
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        setSearchResults({ teams: [], works: [], memberTeams: [] });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Team CRUD operations
  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || !authUser) return;
    
    setTeamError(null);
    
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          name: newTeamName,
          description: newTeamDescription,
          owner_id: authUser.id,
          visibility: newTeamVisibility
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        await supabase.from('member_team').insert({
          user_id: authUser.id,
          team_id: data.id,
          role_id: 1 // Admin role
        });
        
        setShowTeamModal(false);
        resetTeamForm();
        fetchAllData();
      }
    } catch (error: any) {
      console.error('Error creating team:', error);
      setTeamError(error.message || 'Failed to create team');
    }
  };

  const handleUpdateTeam = async () => {
    if (!editingTeam || !newTeamName.trim()) return;
    
    setTeamError(null);
    
    try {
      const { error } = await supabase
        .from('teams')
        .update({
          name: newTeamName,
          description: newTeamDescription,
          visibility: newTeamVisibility
        })
        .eq('id', editingTeam.id);
      
      if (error) throw error;
      
      setShowTeamModal(false);
      resetTeamForm();
      fetchAllData();
    } catch (error: any) {
      console.error('Error updating team:', error);
      setTeamError(error.message || 'Failed to update team');
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (!authUser) return;
    
    try {
      await supabase
        .from('member_team')
        .delete()
        .eq('team_id', teamId);
      
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
      
      if (error) throw error;
      
      fetchAllData();
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  // Work CRUD operations
  const handleCreateWork = async () => {
    if (!newWorkTitle.trim() || !authUser) return;
    
    setWorkError(null);
    
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          title: newWorkTitle,
          content: newWorkContent,
          attachment: newWorkAttachment,
          link: newWorkLink,
          visibility: newWorkVisibility,
          type: 'work',
          user_id: authUser.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) {
        setShowWorkModal(false);
        resetWorkForm();
        fetchAllData();
      }
    } catch (error: any) {
      console.error('Error creating work:', error);
      setWorkError(error.message || 'Failed to create work');
    }
  };

  const handleUpdateWork = async () => {
    if (!editingWork || !newWorkTitle.trim()) return;
    
    setWorkError(null);
    
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          title: newWorkTitle,
          content: newWorkContent,
          attachment: newWorkAttachment,
          link: newWorkLink,
          visibility: newWorkVisibility
        })
        .eq('id', editingWork.id);
      
      if (error) throw error;
      
      setShowWorkModal(false);
      resetWorkForm();
      fetchAllData();
    } catch (error: any) {
      console.error('Error updating work:', error);
      setWorkError(error.message || 'Failed to update work');
    }
  };

  const handleDeleteWork = async (workId: number) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', workId)
        .eq('type', 'work');
      
      if (error) throw error;
      
      fetchAllData();
    } catch (error) {
      console.error('Error deleting work:', error);
    }
  };

  // Helper functions
  const resetTeamForm = () => {
    setEditingTeam(null);
    setNewTeamName('');
    setNewTeamDescription('');
    setNewTeamVisibility('private');
    setTeamError(null);
  };

  const resetWorkForm = () => {
    setEditingWork(null);
    setNewWorkTitle('');
    setNewWorkContent('');
    setNewWorkAttachment('');
    setNewWorkLink('');
    setNewWorkVisibility('public');
    setWorkError(null);
  };

  const openTeamEditModal = (team: ITeam) => {
    setEditingTeam(team);
    setNewTeamName(team.name);
    setNewTeamDescription(team.description || '');
    setNewTeamVisibility(team.visibility as 'public' | 'private');
    setShowTeamModal(true);
  };

  const openWorkEditModal = (work: WorkPost) => {
    setEditingWork(work);
    setNewWorkTitle(work.title);
    setNewWorkContent(work.content);
    setNewWorkAttachment(work.attachment || '');
    setNewWorkLink(work.link || '');
    setNewWorkVisibility(work.visibility as 'public' | 'private');
    setShowWorkModal(true);
  };

  const renderAttachmentPreview = (url: string) => {
    if (!url) return null;
    
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return (
        <div className="mt-3">
          <img 
            src={url} 
            alt="Work attachment" 
            className="max-h-48 w-full object-contain rounded-md bg-gray-100"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600x400/1a1a1a/ffffff?text=Image+Not+Found';
            }}
          />
        </div>
      );
    }
    
    if (url.match(/^https?:\/\//i)) {
      return (
        <div className="mt-3 border rounded-md overflow-hidden">
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="block hover:bg-gray-50 p-3 flex items-center"
          >
            <FiExternalLink className="mr-2" />
            <span className="truncate">{url}</span>
          </a>
        </div>
      );
    }
    
    return null;
  };

  const getDomainFromUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch {
      return url;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
      </div>
    );
  }

  const isSearching = searchQuery.trim().length > 0;
  const showingTeams = isSearching ? searchResults.teams : teams;
  const showingMemberTeams = isSearching ? searchResults.memberTeams : memberTeams;
  const showingWorks = isSearching ? searchResults.works : works;

  return (
    <Layout>
      <main className="min-h-screen bg-gray-50 pt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-2 text-gray-600">
                Welcome back, {authUser?.full_name || authUser?.email}
              </p>
            </div>
            
            <div className="relative w-full md:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search teams, works..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Teams You Own Section */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Teams You Own</h2>
                  <button
                    onClick={() => setShowTeamModal(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
                  >
                    <FiPlus /> Create Team
                  </button>
                </div>

                {showingTeams.length === 0 ? (
                  <p className="text-gray-500">
                    {isSearching ? 'No matching teams found' : 'You haven\'t created any teams yet.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {showingTeams.map(team => (
                      <div key={team.id} className="border rounded-lg p-4 hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                          <a 
                            href={`/team/${team.id}`}
                            className="font-medium text-lg hover:underline"
                          >
                            {team.name}
                          </a>
                          <div className="flex flex-col items-end gap-1">
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              Owner
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              team.visibility === 'public' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {team.visibility === 'public' ? 'Public' : 'Private'}
                            </span>
                          </div>
                        </div>
                        {team.description && (
                          <p className="text-gray-600 mt-2 text-sm">{team.description}</p>
                        )}
                        <div className="mt-4 flex justify-between items-center">
                          <div className="flex items-center text-sm text-gray-500">
                            <FiUsers className="mr-1" /> Members
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => openTeamEditModal(team)}
                              className="text-gray-500 hover:text-blue-600"
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteTeam(team.id)}
                              className="text-gray-500 hover:text-red-600"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Teams You're Member Of Section */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Teams Youre Member Of</h2>
                
                {showingMemberTeams.length === 0 ? (
                  <p className="text-gray-500">
                    {isSearching ? 'No matching teams found' : 'You\'re not a member of any teams yet.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {showingMemberTeams.map(memberTeam => (
                      <div key={memberTeam.id} className="border rounded-lg p-4 hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                          <a 
                            href={`/team/${memberTeam.team_id}`}
                            className="font-medium text-lg hover:underline"
                          >
                            {memberTeam.teams?.name || `Team ${memberTeam.team_id}`}
                          </a>
                          <div className="flex flex-col items-end gap-1">
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                              {memberTeam.role_id === 1 ? 'Admin' : 'Member'}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              memberTeam.teams?.visibility === 'public' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {memberTeam.teams?.visibility === 'public' ? 'Public' : 'Private'}
                            </span>
                          </div>
                        </div>
                        {memberTeam.teams?.description && (
                          <p className="text-gray-600 mt-2 text-sm">{memberTeam.teams.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Works Section */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-800">Your Works</h2>
                  <button
                    onClick={() => setShowWorkModal(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
                  >
                    <FiPlus /> Add Work
                  </button>
                </div>

                {showingWorks.length === 0 ? (
                  <p className="text-gray-500">
                    {isSearching ? 'No matching works found' : 'You haven\'t created any works yet.'}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {showingWorks.map(work => (
                      <div key={work.id} className="border rounded-lg p-4 hover:shadow-md transition">
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-lg">{work.title}</h3>
                          <span className={`text-xs px-2 py-1 rounded ${
                            work.visibility === 'public' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {work.visibility === 'public' ? 'Public' : 'Private'}
                          </span>
                        </div>
                        <p className="text-gray-600 mt-2 text-sm line-clamp-2">{work.content}</p>
                        {work.attachment && renderAttachmentPreview(work.attachment)}
                        {work.link && (
                          <div className="mt-2">
                            <a 
                              href={work.link} 
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline text-sm flex items-center"
                            >
                              <FiExternalLink className="mr-1" />
                              {getDomainFromUrl(work.link)}
                            </a>
                          </div>
                        )}
                        <div className="mt-4 flex justify-between items-center">
                          <div className="text-sm text-gray-500">
                            {new Date(work.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => openWorkEditModal(work)}
                              className="text-gray-500 hover:text-blue-600"
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteWork(work.id)}
                              className="text-gray-500 hover:text-red-600"
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Notifications and Messages */}
            <div className="space-y-6">
              {/* Notifications Section */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Notifications</h2>
                {notifications.length === 0 ? (
                  <p className="text-gray-500">No notifications</p>
                ) : (
                  <div className="space-y-3">
                    {notifications.map(notification => (
                      <div key={notification.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded">
                        <div className="mt-1">
                          <FiBell className="text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{notification.type}</p>
                          <p className="text-xs text-gray-500">{notification.payload}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Messages Section */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Messages</h2>
                {messages.length === 0 && teamMessages.length === 0 ? (
                  <p className="text-gray-500">No messages</p>
                ) : (
                  <div className="space-y-3">
                    {messages.slice(0, 3).map(message => (
                      <div key={message.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded">
                        <div className="mt-1">
                          <FiMail className="text-gray-400" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium truncate">
                            {message.from_id === authUser?.id ? 'You' : 'User'} → {message.to_id === authUser?.id ? 'You' : 'User'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{message.content}</p>
                        </div>
                      </div>
                    ))}
                    
                    {teamMessages.slice(0, 3).map(message => (
                      <div key={message.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded">
                        <div className="mt-1">
                          <FiMessageSquare className="text-gray-400" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-medium truncate">
                            Team: {teams.find(t => t.id === message.team_id)?.name || memberTeams.find(mt => mt.team_id === message.team_id)?.teams?.name || 'Team'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{message.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Team Modal */}
        {showTeamModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">
                  {editingTeam ? 'Edit Team' : 'Create New Team'}
                </h3>
                <button 
                  onClick={() => {
                    setShowTeamModal(false);
                    resetTeamForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX size={20} />
                </button>
              </div>
              
              {teamError && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                  {teamError}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-1">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    id="teamName"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter team name"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="teamDescription" className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    id="teamDescription"
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter team description"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visibility
                  </label>
                  <div className="flex gap-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio text-blue-600"
                        name="visibility"
                        value="private"
                        checked={newTeamVisibility === 'private'}
                        onChange={() => setNewTeamVisibility('private')}
                      />
                      <span className="ml-2">Private (Only members can see)</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio text-blue-600"
                        name="visibility"
                        value="public"
                        checked={newTeamVisibility === 'public'}
                        onChange={() => setNewTeamVisibility('public')}
                      />
                      <span className="ml-2">Public (Anyone can see)</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowTeamModal(false);
                    resetTeamForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={editingTeam ? handleUpdateTeam : handleCreateTeam}
                  disabled={!newTeamName.trim()}
                  className={`px-4 py-2 rounded-md ${newTeamName.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  {editingTeam ? 'Update Team' : 'Create Team'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Work Modal */}
        {showWorkModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">
                  {editingWork ? 'Edit Work' : 'Create New Work'}
                </h3>
                <button 
                  onClick={() => {
                    setShowWorkModal(false);
                    resetWorkForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX size={20} />
                </button>
              </div>
              
              {workError && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                  {workError}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="workTitle" className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    id="workTitle"
                    value={newWorkTitle}
                    onChange={(e) => setNewWorkTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter work title"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="workContent" className="block text-sm font-medium text-gray-700 mb-1">
                    Content
                  </label>
                  <textarea
                    id="workContent"
                    value={newWorkContent}
                    onChange={(e) => setNewWorkContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter work content"
                    rows={5}
                  />
                </div>

                <div>
                  <label htmlFor="workLink" className="block text-sm font-medium text-gray-700 mb-1">
                    Link (Optional)
                  </label>
                  <input
                    type="url"
                    id="workLink"
                    value={newWorkLink}
                    onChange={(e) => setNewWorkLink(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com"
                  />
                </div>
                
                <div>
                  <label htmlFor="workAttachment" className="block text-sm font-medium text-gray-700 mb-1">
                    Attachment URL (Optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      id="workAttachment"
                      value={newWorkAttachment}
                      onChange={(e) => setNewWorkAttachment(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/image.jpg"
                    />
                    <button className="px-3 py-2 border border-gray-300 rounded-md bg-gray-100 hover:bg-gray-200">
                      <FiImage />
                    </button>
                  </div>
                  {newWorkAttachment && renderAttachmentPreview(newWorkAttachment)}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visibility
                  </label>
                  <div className="flex gap-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio text-blue-600"
                        name="workVisibility"
                        value="public"
                        checked={newWorkVisibility === 'public'}
                        onChange={() => setNewWorkVisibility('public')}
                      />
                      <span className="ml-2">Public (Anyone can see)</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio text-blue-600"
                        name="workVisibility"
                        value="private"
                        checked={newWorkVisibility === 'private'}
                        onChange={() => setNewWorkVisibility('private')}
                      />
                      <span className="ml-2">Private (Only you can see)</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowWorkModal(false);
                    resetWorkForm();
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={editingWork ? handleUpdateWork : handleCreateWork}
                  disabled={!newWorkTitle.trim()}
                  className={`px-4 py-2 rounded-md ${newWorkTitle.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                >
                  {editingWork ? 'Update Work' : 'Create Work'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}