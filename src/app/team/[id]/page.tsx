'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IResearchSession, ITab, IDraft, ITeam, IProfile, ITeamMember, ITeamMessage } from '@/types/main.db';
import { 
  FiPlus, FiUsers, FiUser, FiEdit2, FiTrash2, FiMail, FiBell, 
  FiMessageSquare, FiSearch, FiX, FiExternalLink, FiImage,
  FiBarChart2, FiClock, FiBook, FiStar, FiZap, FiCpu, FiChevronRight,
  FiDownload, FiSend, FiPaperclip, FiMoreVertical, FiFilter, FiLock,
  FiGlobe, FiSettings, FiActivity, FiCalendar, FiFileText, FiShare2,
  FiCopy, FiCheck, FiVideo, FiMic, FiAward, FiTrendingUp, FiEye,
  FiEdit3, FiArchive, FiRefreshCw, FiUserPlus, FiSliders, FiDatabase
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';

interface TeamPageProps {
  params: { id: string };
}

interface RealTimeEvent {
  type: 'session_created' | 'session_updated' | 'member_joined' | 'member_left' | 'message_sent';
  data: any;
  timestamp: Date;
  user?: IProfile;
}

export default function TeamPage({ params }: TeamPageProps) {
  const router = useRouter();
  const { id: teamId } = useParams();
  const supabase = createClient();
  
  const [team, setTeam] = useState<ITeam | null>(null);
  const [userProfile, setUserProfile] = useState<IProfile | null>(null);
  const [teamMembers, setTeamMembers] = useState<(ITeamMember & { profiles: IProfile })[]>([]);
  const [sessions, setSessions] = useState<IResearchSession[]>([]);
  const [teamMessages, setTeamMessages] = useState<ITeamMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'members' | 'chat' | 'analytics' | 'settings'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [realTimeEvents, setRealTimeEvents] = useState<RealTimeEvent[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [lastReadMessage, setLastReadMessage] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Check user authentication and team membership
  const initializeTeamData = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!user || userError) {
        router.push('/login');
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setUserProfile(profile);

      // Get team data
      const { data: teamData } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();
      
      setTeam(teamData);

      if (!teamData) {
        setIsLoading(false);
        return;
      }

      // Check if user is a member
      const { data: memberData } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single();
      
      if (memberData) {
        setIsMember(true);
        setUserRole(memberData.role);
        
        // Load team members with profiles
        const { data: members } = await supabase
          .from('team_members')
          .select(`
            *,
            profiles (*)
          `)
          .eq('team_id', teamId)
          .order('created_at', { ascending: true });
        
        setTeamMembers(members || []);

        // Load team sessions
        const { data: sessionData } = await supabase
          .from('research_sessions')
          .select('*')
          .eq('team_id', teamId)
          .order('created_at', { ascending: false });
        
        setSessions(sessionData || []);

        // Load team messages
        const { data: messages } = await supabase
          .from('team_messages')
          .select(`
            *,
            profiles (*)
          `)
          .eq('team_id', teamId)
          .order('created_at', { ascending: true });
        
        setTeamMessages(messages || []);
        setLastReadMessage(messages?.[messages.length - 1]?.id || null);
        
      } else {
        setIsMember(false);
      }
    } catch (error) {
      console.error('Error initializing team data:', error);
      toast.error('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  }, [teamId, router, supabase]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!teamId || !isMember) return;

    const channels = {
      members: supabase.channel('team-members')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'team_members',
            filter: `team_id=eq.${teamId}`
          }, 
          async (payload) => {
            console.log('Member change:', payload);
            
            // Refresh members
            const { data: members } = await supabase
              .from('team_members')
              .select(`
                *,
                profiles (*)
              `)
              .eq('team_id', teamId);
            
            setTeamMembers(members || []);

            // Add to real-time events
            if (payload.eventType === 'INSERT') {
              const newMember = payload.new;
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', newMember.user_id)
                .single();
              
              setRealTimeEvents(prev => [{
                type: 'member_joined',
                data: newMember,
                timestamp: new Date(),
                user: profile
              }, ...prev.slice(0, 49)]);
              
              toast.success(`${profile?.full_name || profile?.email} joined the team`);
            } else if (payload.eventType === 'DELETE') {
              setRealTimeEvents(prev => [{
                type: 'member_left',
                data: payload.old,
                timestamp: new Date()
              }, ...prev.slice(0, 49)]);
            }
          }
        ),

      sessions: supabase.channel('team-sessions')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'research_sessions',
            filter: `team_id=eq.${teamId}`
          }, 
          async (payload) => {
            // Refresh sessions
            const { data: sessionData } = await supabase
              .from('research_sessions')
              .select('*')
              .eq('team_id', teamId)
              .order('created_at', { ascending: false });
            
            setSessions(sessionData || []);

            // Add to real-time events
            if (payload.eventType === 'INSERT') {
              setRealTimeEvents(prev => [{
                type: 'session_created',
                data: payload.new,
                timestamp: new Date()
              }, ...prev.slice(0, 49)]);
            }
          }
        ),

      messages: supabase.channel('team-messages')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'team_messages',
            filter: `team_id=eq.${teamId}`
          }, 
          async (payload) => {
            // Get the new message with profile
            const { data: newMessage } = await supabase
              .from('team_messages')
              .select(`
                *,
                profiles (*)
              `)
              .eq('id', payload.new.id)
              .single();

            if (newMessage) {
              setTeamMessages(prev => [...prev, newMessage]);
              setRealTimeEvents(prev => [{
                type: 'message_sent',
                data: newMessage,
                timestamp: new Date(),
                user: newMessage.profiles
              }, ...prev.slice(0, 49)]);

              // Update unread count if not on chat tab
              if (activeTab !== 'chat') {
                setUnreadMessages(prev => prev + 1);
              }

              scrollToBottom();
            }
          }
        )
    };

    // Subscribe to all channels
    Object.values(channels).forEach(channel => channel.subscribe());

    // Set up online/offline detection
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Connection lost - working offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      Object.values(channels).forEach(channel => supabase.removeChannel(channel));
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [teamId, isMember, supabase, activeTab]);

  // Initialize data
  useEffect(() => {
    initializeTeamData();
  }, [initializeTeamData]);

  // Scroll to bottom when messages change and on chat tab
  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
      setUnreadMessages(0);
    }
  }, [teamMessages, activeTab]);

  // Handle sending messages
  const sendMessage = async () => {
    if (!newMessage.trim() || !userProfile) return;

    const { error } = await supabase
      .from('team_messages')
      .insert({
        team_id: teamId as string,
        user_id: userProfile.id,
        content: newMessage.trim()
      });

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } else {
      setNewMessage('');
    }
  };

  // Handle key press for message input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Invite member function
  const inviteMember = async (email: string, role: 'admin' | 'member') => {
    if (!userRole || (userRole !== 'owner' && userRole !== 'admin')) {
      toast.error('Insufficient permissions');
      return;
    }

    try {
      // Check if user exists
      const { data: userData } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', email)
        .single();

      if (!userData) {
        toast.error('User not found');
        return;
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', userData.id)
        .single();

      if (existingMember) {
        toast.error('User is already a team member');
        return;
      }

      // Add to team members
      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId as string,
          user_id: userData.id,
          role: role
        });

      if (error) throw error;

      toast.success(`Invited ${userData.full_name || userData.email} to the team`);
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('Failed to invite member');
    }
  };

  // Remove member function
  const removeMember = async (memberId: string) => {
    if (!userRole || (userRole !== 'owner' && userRole !== 'admin')) {
      toast.error('Insufficient permissions');
      return;
    }

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Member removed successfully');
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  // Create new session
  const createNewSession = async () => {
    if (!userProfile) return;

    try {
      const { data: session, error } = await supabase
        .from('research_sessions')
        .insert({
          team_id: teamId as string,
          user_id: userProfile.id,
          title: `New Session ${new Date().toLocaleDateString()}`,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Session created successfully');
      router.push(`/session/${session.id}`);
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
    }
  };

  // Export team data
  const exportTeamData = async () => {
    try {
      const exportData = {
        team,
        members: teamMembers,
        sessions,
        messages: teamMessages,
        exported_at: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${team?.name.replace(/\s+/g, '_')}_export_${new Date().getTime()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Team data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
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

  if (!team) {
    return (
      <Layout>
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800">Team not found</h1>
          <p className="text-gray-600 mt-2">The team you're looking for doesn't exist.</p>
        </div>
      </Layout>
    );
  }

  if (!isMember) {
    if (team && team.visibility === 'public') {
      // For public teams, show a public view
      return (
        <Layout>
          <div className="flex flex-col h-full bg-gray-50">
            <div className="bg-white p-6 border-b border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <FiUsers className="text-2xl text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
                    <p className="text-gray-600 flex items-center flex-wrap gap-2">
                      <span className="flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        <FiGlobe className="mr-1" /> Public Team
                      </span>
                      <span className="flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        <FiUsers className="mr-1" /> {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
                      </span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => { /* TODO: Implement request to join */ toast.success('Request to join sent!'); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                >
                  <FiUserPlus className="mr-2" /> Request to Join
                </button>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-auto">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">About this team</h3>
                <p className="text-gray-600">{team.description || 'No description provided.'}</p>
              </div>
            </div>
          </div>
        </Layout>
      );
    }

    // For private teams, show restricted message
    return (
      <Layout>
        <div className="p-8 text-center">
          <FiLock className="mx-auto text-4xl text-gray-400 mb-4" />
          <h1 className="text-2xl font-bold text-gray-800">Private Team</h1>
          <p className="text-gray-600 mt-2">You must be a member to view this team.</p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-full bg-gray-50">
        {/* Connection Status */}
        {!isOnline && (
          <div className="bg-yellow-100 border-b border-yellow-400 p-2 text-center text-sm text-yellow-800">
            <FiRefreshCw className="inline mr-2 animate-spin" />
            Working offline - reconnecting...
          </div>
        )}

        {/* Team Header */}
        <div className="bg-white p-6 border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <FiUsers className="text-2xl text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
                <p className="text-gray-600 flex items-center flex-wrap gap-2">
                  {team.visibility === 'public' ? (
                    <span className="flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      <FiGlobe className="mr-1" /> Public Team
                    </span>
                  ) : (
                    <span className="flex items-center px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                      <FiLock className="mr-1" /> Private Team
                    </span>
                  )}
                  <span className="flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    <FiUsers className="mr-1" /> {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
                  </span>
                  {userRole && (
                    <span className="flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full capitalize">
                      <FiAward className="mr-1" /> {userRole}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={exportTeamData}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center"
              >
                <FiDownload className="mr-2" /> Export
              </button>
              {(userRole === 'owner' || userRole === 'admin') && (
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
                  <FiSettings className="mr-2" /> Manage
                </button>
              )}
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="mt-6 flex space-x-8 border-b border-gray-200 overflow-x-auto">
            {(['overview', 'sessions', 'members', 'chat', 'analytics', 'settings'] as const).map(tab => (
              <button
                key={tab}
                className={`pb-3 px-1 font-medium text-sm whitespace-nowrap flex items-center ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'chat' && unreadMessages > 0 && (
                  <span className="mr-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadMessages}
                  </span>
                )}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 overflow-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Research Sessions</h3>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">{sessions.length}</p>
                      <p className="text-xs text-gray-500 mt-1">+2 this week</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <FiFileText className="text-blue-600 text-xl" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Team Members</h3>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">{teamMembers.length}</p>
                      <p className="text-xs text-gray-500 mt-1">Active now: 3</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <FiUsers className="text-green-600 text-xl" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Messages</h3>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">{teamMessages.length}</p>
                      <p className="text-xs text-gray-500 mt-1">+12 today</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <FiMessageSquare className="text-purple-600 text-xl" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Productivity</h3>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">87%</p>
                      <p className="text-xs text-gray-500 mt-1">+5% this week</p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <FiTrendingUp className="text-orange-600 text-xl" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity & Sessions Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
                    <FiActivity className="text-gray-400" />
                  </div>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {realTimeEvents.slice(0, 10).map((event, index) => (
                      <div key={index} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md">
                        <div className={`w-2 h-2 rounded-full ${
                          event.type === 'session_created' ? 'bg-blue-500' :
                          event.type === 'member_joined' ? 'bg-green-500' :
                          event.type === 'message_sent' ? 'bg-purple-500' : 'bg-gray-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">
                            {event.type === 'session_created' && 'New session created'}
                            {event.type === 'member_joined' && `${event.user?.full_name || event.user?.email} joined the team`}
                            {event.type === 'message_sent' && `${event.user?.full_name || event.user?.email} sent a message`}
                            {event.type === 'member_left' && 'A member left the team'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {event.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                    {realTimeEvents.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
                    )}
                  </div>
                </div>

                {/* Recent Sessions */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Recent Sessions</h3>
                    <button 
                      onClick={createNewSession}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center"
                    >
                      <FiPlus className="mr-1" /> New
                    </button>
                  </div>
                  <div className="space-y-3">
                    {sessions.slice(0, 5).map(session => (
                      <div key={session.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md border border-gray-100">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-md">
                            <FiFileText className="text-blue-600" />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{session.title}</h4>
                            <p className="text-xs text-gray-500">
                              Created {new Date(session.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => router.push(`/session/${session.id}`)}
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          Open <FiChevronRight className="ml-1" />
                        </button>
                      </div>
                    ))}
                    {sessions.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No sessions yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Research Sessions</h3>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center">
                    <FiFilter className="mr-2" /> Filter
                  </button>
                  <button 
                    onClick={createNewSession}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                  >
                    <FiPlus className="mr-2" /> New Session
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {sessions.map(session => (
                  <div key={session.id} className="p-4 hover:bg-gray-50 flex justify-between items-center group">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg">
                        <FiFileText className="text-blue-600 text-xl" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{session.title}</h4>
                        <p className="text-sm text-gray-500 flex items-center space-x-2">
                          <span>Created {new Date(session.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span className="flex items-center">
                            <FiUser className="mr-1 text-xs" /> 
                            {teamMembers.find(m => m.user_id === session.user_id)?.profiles?.full_name || 'Unknown'}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => router.push(`/session/${session.id}`)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 flex items-center"
                      >
                        <FiEye className="mr-1" /> View
                      </button>
                      {(userRole === 'owner' || userRole === 'admin') && (
                        <button className="p-2 text-gray-400 hover:text-red-500 rounded-md">
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    <FiFileText className="mx-auto text-3xl mb-2" />
                    <p>No research sessions yet</p>
                    <button 
                      onClick={createNewSession}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Create your first session
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Team Members ({teamMembers.length})
                </h3>
                {(userRole === 'owner' || userRole === 'admin') && (
                  <button 
                    onClick={() => {
                      const email = prompt("Enter the email address to invite:");
                      const role = prompt("Choose role (admin/member):", "member");
                      if (email && role && (role === 'admin' || role === 'member')) {
                        inviteMember(email, role);
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                  >
                    <FiUserPlus className="mr-2" /> Invite Member
                  </button>
                )}
              </div>
              <div className="divide-y divide-gray-200">
                {teamMembers.map(member => (
                  <div key={member.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                        <FiUser className="text-gray-600 text-xl" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {member.profiles?.full_name || member.profiles?.email}
                        </h4>
                        <p className="text-sm text-gray-500 flex items-center space-x-2">
                          <span className="capitalize">{member.role}</span>
                          <span>•</span>
                          <span>Joined {new Date(member.created_at).toLocaleDateString()}</span>
                        </p>
                      </div>
                    </div>
                    <div>
                      {(userRole === 'owner' || userRole === 'admin') && member.role !== 'owner' && (
                        <button 
                          onClick={() => {
                            if (confirm('Are you sure you want to remove this member?')) {
                              removeMember(member.id);
                            }
                          }}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                        >
                          Remove
                        </button>
                      )}
                      {member.role === 'owner' && (
                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-md">
                          Owner
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[600px] flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Team Chat</h3>
                <p className="text-sm text-gray-500">
                  {teamMessages.length} messages • {teamMembers.filter(m => m.role !== 'owner').length} members online
                </p>
              </div>

              {/* Messages Container */}
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4"
              >
                {teamMessages.map((message) => (
                  <div key={message.id} className="flex space-x-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center">
                      <FiUser className="text-gray-600 text-sm" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">
                          {message.profiles?.full_name || message.profiles?.email}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-800 bg-gray-50 rounded-lg p-3">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <div className="flex-1 border border-gray-300 rounded-lg overflow-hidden">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      className="w-full px-3 py-2 border-0 focus:ring-0 focus:outline-none resize-none"
                      rows={2}
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                  >
                    <FiSend className="mr-2" /> Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Team Activity</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Sessions created</span>
                        <span>24</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Messages sent</span>
                        <span>156</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: '90%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Active members</span>
                        <span>8/12</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: '67%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Productivity Metrics</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Completion rate</span>
                      <span className="font-medium">87%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg. session time</span>
                      <span className="font-medium">2h 34m</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Collaboration score</span>
                      <span className="font-medium">92/100</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Team Settings</h3>
              
              {userRole === 'owner' ? (
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Team Name</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue={team.name}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue={team.description || ''}
                      rows={3}
                      placeholder="Describe your team's purpose..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue={team.visibility || 'private'}
                    >
                      <option value="private">Private - Only invited members can join</option>
                      <option value="public">Public - Anyone can request to join</option>
                    </select>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Danger Zone</h4>
                    <div className="space-y-4">
                      <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                        Delete Team
                      </button>
                      <p className="text-sm text-gray-500">
                        Once you delete a team, there is no going back. Please be certain.
                      </p>
                    </div>
                  </div>
                  
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Save Changes
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FiSliders className="mx-auto text-4xl text-gray-400 mb-4" />
                  <p className="text-gray-500">Only team owners can modify these settings.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}