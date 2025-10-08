'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IResearchSession, ITeam, IProfile, ITeamMember, ITeamMessage, AnalyticsData, PresenceUser, RealTimeEvent } from '@/types/main.db';
import { 
  FiPlus, FiUsers, FiUser, FiTrash2, FiMessageSquare, 
  FiSearch, FiExternalLink, FiBarChart2, FiClock, 
  FiDownload, FiSend, FiGlobe, FiSettings, 
  FiFileText, FiCopy, FiCheck, FiTrendingUp, FiEye,
  FiRefreshCw, FiUserPlus, FiSliders, FiDatabase,
  FiTarget, FiLock, FiAward, FiThumbsUp, FiThumbsDown, 
  FiZap, FiFilter, FiMoreVertical, FiAnchor, FiEdit3,
  FiX, FiShare2, FiBell, FiStar, FiGitBranch, FiGitPullRequest,
  FiCalendar, FiPieChart, FiBarChart, FiUsers as FiUsersIcon,
  FiVolume2, FiVideo, FiMail, FiLink, FiShield, FiAlertCircle
} from 'react-icons/fi';




export default function TeamPage() {
  const router = useRouter();
  const { id: teamId } = useParams();
  const supabase = createClient();
  
  const [team, setTeam] = useState<ITeam | null>(null);
  const [userProfile, setUserProfile] = useState<IProfile | null>(null);
  const [teamMembers, setTeamMembers] = useState<ITeamMember[]>([]);
  const [sessions, setSessions] = useState<IResearchSession[]>([]);
  const [teamMessages, setTeamMessages] = useState<ITeamMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'members' | 'chat' | 'analytics'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [editedTeam, setEditedTeam] = useState({ name: '', description: '' });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);



  // Initialize team data
  const initializeTeamData = useCallback(async () => {
    if (!teamId) return;

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setUserProfile(profile);

      // Fetch team data
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();
      
      setTeam(teamData);

      if (!teamData) {
        router.push('/dashboard');
        return;
      }

      // Check membership
      const { data: membership } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single();

      if (membership) {
        setIsMember(true);
        setUserRole(membership.role);

        // Load all team data
        const [
          { data: members },
          { data: sessionsData },
          { data: messages },
        ] = await Promise.all([
          supabase
            .from('team_members')
            .select('*, profiles(*)')
            .eq('team_id', teamId),
          supabase
            .from('research_sessions')
            .select('*')
            .eq('team_id', teamId)
            .order('created_at', { ascending: false }),
          supabase
            .from('team_messages')
            .select('*, profiles(*)')
            .eq('team_id', teamId)
            .order('created_at', { ascending: true })
            .limit(100),
        ]);

        setTeamMembers(members || []);
        setSessions(sessionsData || []);
        setTeamMessages(messages || []);
        setAnalyticsData(await fetchAnalyticsData(teamId as string));
        setEditedTeam({
          name: teamData.name,
          description: teamData.description || ''
        });
      } else {
        setIsMember(false);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [teamId, router, supabase]);

  // Analytics data fetcher
  const fetchAnalyticsData = async (teamId: string): Promise<AnalyticsData> => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const weeklySessions = sessions.filter(s => new Date(s.created_at) > oneWeekAgo);
    const weeklyMessages = teamMessages.filter(m => new Date(m.created_at) > oneWeekAgo);
    const activeMembers = new Set(weeklyMessages.map(m => m.user_id)).size;

    const uniqueActiveMembers = new Set(weeklyMessages.map(msg => msg.user_id) || []).size;
    const totalMembers = teamMembers.length;
    const engagementRate = totalMembers > 0 ? Math.round((uniqueActiveMembers / totalMembers) * 100) : 0;

    return {
      sessionsCreated: sessions.length,
      messagesSent: teamMessages.length,
      activeMembers: uniqueActiveMembers,
      engagementRate,
      weeklyActivity: generateWeeklyActivity(weeklySessions || [], weeklyMessages || [])
    };
  };

  const generateWeeklyActivity = (sessions: Partial<IResearchSession>[], messages: Partial<ITeamMessage>[]) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(day => ({
      day,
      sessions: sessions.filter(s => new Date(s.created_at).getDay() === days.indexOf(day)).length,
      messages: messages.filter(m => new Date(m.created_at).getDay() === days.indexOf(day)).length
    }));
  };

  // Real-time subscriptions
  useEffect(() => {
    if (!teamId || !isMember) return;

    // Subscribe to real-time changes
    const subscription = supabase
      .channel(`team-${teamId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'team_messages',
          filter: `team_id=eq.${teamId}`
        }, 
        (payload) => {
          handleNewMessage(payload.new as ITeamMessage);
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
          filter: `team_id=eq.${teamId}`
        },
        () => {
          refreshTeamMembers();
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'research_sessions',
          filter: `team_id=eq.${teamId}`
        },
        () => {
          refreshSessions();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [teamId, isMember, supabase]);

  const handleNewMessage = async (message: ITeamMessage) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', message.user_id)
      .single();

    if (profile) {
      const newMessage = { ...message, profiles: profile };
      setTeamMessages(prev => [...prev, newMessage]);
      
      if (activeTab !== 'chat') {
        setUnreadMessages(prev => prev + 1);
      }


    }
  };

  const refreshTeamMembers = async () => {
    const { data: members } = await supabase
      .from('team_members')
      .select('*, profiles(*)')
      .eq('team_id', teamId);
    
    setTeamMembers(members || []);
  };

  const refreshSessions = async () => {
    const { data: sessionsData } = await supabase
      .from('research_sessions')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });
    
    setSessions(sessionsData || []);
  };

  // Message handling
  const sendMessage = async () => {
    if (!newMessage.trim() || !userProfile || !teamId) return;

    try {
      const { error } = await supabase
        .from('team_messages')
        .insert({
          team_id: teamId as string,
          user_id: userProfile.id,
          content: newMessage.trim(),
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      
      const notifications = teamMembers.map(member => ({
        user_id: member.user_id,
        type: 'team_chat_message',
        message: `You have a new message in the team "${team?.name}" `,
        read: false,
        updated_at: new Date().toISOString(),
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        throw notificationError;
      }

      setNewMessage('');
      setUnreadMessages(0);
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Member management
  const inviteMember = async () => {
    if (!userRole || !['owner', 'admin'].includes(userRole)) {
      console.warn('Insufficient permissions to invite members.');
      return;
    }

    try {
      // Find user by email
      const { data: userData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', inviteEmail.trim())
        .single();

      if (!userData) {
        console.error('User not found');
        return;
      }

      // Check if already member
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', userData.id)
        .single();

      if (existingMember) {
        console.error('User is already a team member');
        return;
      }

      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId as string,
          user_id: userData.id,
          role: inviteRole,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userData.id,
          type: 'team_invitation',
          message: `You have been invited to join the team "${team?.name}" `,
          read: false,
          updated_at: new Date().toISOString(),
        });

      if (notificationError) {
        throw notificationError;
      }

      setIsInviteModalOpen(false);
      setInviteEmail('');
    } catch (error) {
      console.error('Error inviting member:', error);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!userRole || !['owner', 'admin'].includes(userRole)) return;

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)
        .eq('team_id', teamId);

      if (error) throw error;


    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const updateTeamSettings = async () => {
    if (userRole !== 'owner') {
      console.warn('Only team owners can update settings');
      return;
    }

    try {
      const { error } = await supabase
        .from('teams')
        .update({
          name: editedTeam.name,
          description: editedTeam.description,
        })
        .eq('id', teamId);

      if (error) throw error;

      setTeam(prev => prev ? { ...prev, ...editedTeam } : null);
      setIsEditingTeam(false);
    } catch (error) {
      console.error('Error updating team:', error);
    }
  };

  const createNewSession = async () => {
    if (!userProfile || !teamId) return;

    try {
      const { data: session, error } = await supabase
        .from('research_sessions')
        .insert({
          team_id: teamId as string,
          user_id: userProfile.id,
          title: `Team Session ${new Date().toLocaleDateString()}`,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      router.push(`/session/${session.id}`);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    initializeTeamData();
  }, [initializeTeamData]);

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
      setUnreadMessages(0);
    }
  }, [teamMessages, activeTab]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (!team || !isMember) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FiLock className="mx-auto text-4xl text-gray-400 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {!team ? 'Team Not Found' : 'Access Denied'}
            </h1>
            <p className="text-gray-600 mb-4">
              {!team ? 'The requested team does not exist.' : 'You must be a member to view this team.'}
            </p>
            <button 
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <FiUsers className="text-2xl text-white" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>

                  </div>
                  <p className="text-gray-600 flex items-center space-x-2 mt-1">
                    <span>{teamMembers.length} members</span>
                    <span>•</span>
                    <span className="capitalize">{team.visibility || 'private'} team</span>
                    {userRole && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {userRole}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">

                
                {(userRole === 'owner' || userRole === 'admin') && (
                  <button 
                    onClick={() => setIsInviteModalOpen(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                  >
                    <FiUserPlus className="mr-2" /> Invite
                  </button>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex space-x-8 border-b">
              {(['overview', 'sessions', 'members', 'chat'] as const).map(tab => (
                <button
                  key={tab}
                  className={`pb-3 px-1 font-medium border-b-2 transition-colors relative ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'chat' && unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadMessages}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>


        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Sessions</p>
                      <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
                    </div>
                    <FiFileText className="text-blue-500 text-xl" />
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Members</p>
                      <p className="text-2xl font-bold text-gray-900">{teamMembers.length}</p>
                    </div>
                    <FiUsers className="text-green-500 text-xl" />
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Messages</p>
                      <p className="text-2xl font-bold text-gray-900">{teamMessages.length}</p>
                    </div>
                    <FiMessageSquare className="text-purple-500 text-xl" />
                  </div>
                </div>
                
                {/* <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Engagement</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsData ? `${analyticsData.engagementRate}%` : '0%'}
                      </p>
                    </div>
                    <FiActivity className="text-orange-500 text-xl" />
                  </div>
                </div> */}
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <h3 className="text-lg font-semibold mb-4">Recent Sessions</h3>
                  <div className="space-y-4">
                    {sessions.slice(0, 5).map(session => (
                      <div key={session.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded">
                        <div>
                          <h4 className="font-medium">{session.title}</h4>
                          <p className="text-sm text-gray-600">
                            Created {new Date(session.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button 
                          onClick={() => router.push(`/session/${session.id}`)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                        >
                          Open
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={createNewSession}
                      className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-gray-600 hover:text-blue-600 flex items-center justify-center"
                    >
                      <FiPlus className="mr-2" /> Create New Session
                    </button>
                  </div>
                </div>


              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">Research Sessions</h3>
                    <p className="text-gray-600">{sessions.length} sessions</p>
                  </div>
                  <button 
                    onClick={createNewSession}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    New Session
                  </button>
                </div>
              </div>
              
              <div className="divide-y">
                {sessions.map(session => (
                  <div key={session.id} className="p-6 hover:bg-gray-50 flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold">{session.title}</h4>
                      <p className="text-sm text-gray-600">
                        Created {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button 
                      onClick={() => router.push(`/session/${session.id}`)}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Open Session
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold">Team Members</h3>
                    <p className="text-gray-600">{teamMembers.length} members</p>
                  </div>
                  {(userRole === 'owner' || userRole === 'admin') && (
                    <button 
                      onClick={() => setIsInviteModalOpen(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Invite Member
                    </button>
                  )}
                </div>
              </div>
              
              <div className="divide-y">
                {teamMembers.map(member => (
                  <div key={member.id} className="p-6 hover:bg-gray-50 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <FiUser className="text-gray-600" />
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold">
                          {member.profiles?.full_name || member.profiles?.email}
                          {member.user_id === userProfile?.id && (
                            <span className="ml-2 text-blue-600 text-sm">(You)</span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-600 capitalize">{member.role}</p>
                      </div>
                    </div>
                    
                    {(userRole === 'owner' || userRole === 'admin') && member.user_id !== userProfile?.id && (
                      <button 
                        onClick={() => removeMember(member.id)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="bg-white rounded-lg border shadow-sm h-[600px] flex flex-col">
              <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Team Chat</h3>
                </div>
              </div>
              
              <div ref={messagesEndRef} className="flex-1 overflow-y-auto p-4 space-y-4">
               {teamMessages.map((message, idx) => (
                   <div key={`${message.id}-${idx}`} className="flex space-x-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center">
                      {/* <FiUser className="text-gray-600 text-sm" /> */}
                      <img className="w-8 h-8 rounded-full" src={message.profiles?.avatar_url || '/default-avatar.png'} alt="" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-sm">
                          {message.profiles?.full_name || message.profiles?.email}
                          {message.user_id === userProfile?.id && (
                            <span className="text-blue-600 ml-1">(You)</span>
                          )}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="bg-gray-100 rounded-lg p-3">
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="p-4 border-t">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    <FiSend className="text-lg" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && analyticsData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <h4 className="font-semibold mb-2">Weekly Activity</h4>
                  <div className="space-y-2">
                    {analyticsData.weeklyActivity.map((day, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{day.day}</span>
                        <span>{day.sessions} sessions, {day.messages} messages</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <h4 className="font-semibold mb-2">Member Activity</h4>
                  <div className="space-y-2">
                    {teamMembers.slice(0, 5).map(member => (
                      <div key={member.id} className="flex justify-between text-sm">
                        <span>{member.profiles?.full_name?.split(' ')[0] || 'User'}</span>
                        <span className="text-gray-600">{member.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <h4 className="font-semibold mb-2">Team Stats</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Sessions</span>
                      <span>{analyticsData.sessionsCreated}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Messages Sent</span>
                      <span>{analyticsData.messagesSent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Members</span>
                      <span>{analyticsData.activeMembers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Engagement Rate</span>
                      <span>{analyticsData.engagementRate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Invite Modal */}
        {isInviteModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Invite Member</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="member@example.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={inviteMember}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Invite
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}