'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IResearchSession, ITeam, IProfile, ITeamMember, ITeamMessage } from '@/types/main.db';
import { 
  FiPlus, FiUsers, FiUser, FiTrash2, FiMessageSquare, 
  FiSearch, FiExternalLink, FiBarChart2, FiClock, 
  FiDownload, FiSend, FiGlobe, FiSettings, FiActivity, 
  FiFileText, FiCopy, FiCheck, FiTrendingUp, FiEye,
  FiRefreshCw, FiUserPlus, FiSliders, FiDatabase,
  FiTarget, FiLock, FiAward, FiThumbsUp, FiThumbsDown, 
  FiZap, FiFilter, FiMoreVertical, FiAnchor, FiEdit3,
  FiX, FiShare2, FiBell, FiStar, FiGitBranch, FiGitPullRequest,
  FiCalendar, FiPieChart, FiBarChart, FiUsers as FiUsersIcon,
  FiVolume2, FiVideo, FiMail, FiLink, FiShield, FiAlertCircle,
  FiWifi, FiWifiOff, FiRadio
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';

// Enhanced Real-time Service Hook
const useRealtimeService = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  useEffect(() => {
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

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, lastSync, setLastSync };
};

// Enhanced AI Service with real-time capabilities
const useAIService = () => {
  const [aiStatus, setAiStatus] = useState<'loading' | 'ready' | 'error' | 'unavailable'>('loading');

  const promptAI = async (prompt: string, context?: any) => {
    try {
      // Simulate AI processing with context-aware responses
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
      
      if (prompt.toLowerCase().includes('research')) {
        return `Based on ${context?.sessions?.length || 0} research sessions, I recommend focusing on user-centered design methodologies. Consider conducting usability tests with 5-8 participants to gather qualitative insights.`;
      } else if (prompt.toLowerCase().includes('collaboration')) {
        return `With ${context?.members?.length || 0} team members, establish clear communication protocols and regular sync meetings. Use shared documentation to enhance teamwork.`;
      } else if (prompt.toLowerCase().includes('analytics')) {
        return `Analytics show engagement patterns. Consider A/B testing different research approaches based on ${context?.messages?.length || 0} messages exchanged.`;
      } else {
        return `I've analyzed your query and suggest focusing on iterative testing cycles. Regular feedback loops will ensure alignment and improve outcomes.`;
      }
    } catch (error) {
      return "I apologize, but I'm experiencing technical difficulties. Please try again.";
    }
  };

  return { aiStatus, promptAI };
};

interface TeamPageProps {
  params: { id: string };
}

interface RealTimeEvent {
  type: 'member_joined' | 'member_left' | 'message_sent' | 'session_created' | 'session_updated';
  data: any;
  timestamp: Date;
  user?: IProfile;
}

interface AIChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  user_id?: string;
}

interface PresenceUser {
  user_id: string;
  profile: IProfile;
  last_seen: Date;
  status: 'online' | 'idle' | 'offline';
}

interface AnalyticsData {
  sessionsCreated: number;
  messagesSent: number;
  activeMembers: number;
  engagementRate: number;
  weeklyActivity: { day: string; sessions: number; messages: number }[];
}

export default function TeamPage({ params }: TeamPageProps) {
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
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [realTimeEvents, setRealTimeEvents] = useState<RealTimeEvent[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [editedTeam, setEditedTeam] = useState({ name: '', description: '' });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  const { isOnline, lastSync } = useRealtimeService();
  const { aiStatus, promptAI } = useAIService();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout>();

  // Real-time polling setup
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      if (!teamId || !isMember) return;

      try {
        // Poll for new messages
        const { data: newMessages } = await supabase
          .from('team_messages')
          .select('*, profiles(*)')
          .eq('team_id', teamId)
          .gt('created_at', lastSync.toISOString())
          .order('created_at', { ascending: true });

        if (newMessages && newMessages.length > 0) {
          setTeamMessages(prev => [...prev, ...newMessages]);
          if (activeTab !== 'chat') {
            setUnreadMessages(prev => prev + newMessages.length);
          }
        }

        // Poll for presence updates
        updatePresence();
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000); // Poll every 3 seconds
  }, [teamId, isMember, lastSync, activeTab, supabase]);

  // Presence management
  const updatePresence = useCallback(async () => {
    if (!teamId) return;

    try {
      const { data: recentMessages } = await supabase
        .from('team_messages')
        .select('user_id, created_at')
        .eq('team_id', teamId)
        .gt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
        .order('created_at', { ascending: false });

      const onlineUsers = new Set(recentMessages?.map(msg => msg.user_id) || []);
      
      const presenceData: PresenceUser[] = await Promise.all(
        Array.from(onlineUsers).map(async (userId) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          return {
            user_id: userId,
            profile: profile!,
            last_seen: new Date(),
            status: 'online' as const
          };
        })
      );

      setPresenceUsers(presenceData);
    } catch (error) {
      console.error('Presence update error:', error);
    }
  }, [teamId, supabase]);

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
        toast.error('Team not found');
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
          { data: analytics }
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
          fetchAnalyticsData(teamId)
        ]);

        setTeamMembers(members || []);
        setSessions(sessionsData || []);
        setTeamMessages(messages || []);
        setAnalyticsData(analytics);
        setEditedTeam({
          name: teamData.name,
          description: teamData.description || ''
        });

        // Initialize presence
        updatePresence();

        // Start real-time polling
        startPolling();
      } else {
        setIsMember(false);
      }
    } catch (error) {
      console.error('Error loading team data:', error);
      toast.error('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  }, [teamId, router, supabase, updatePresence, startPolling]);

  // Analytics data fetcher
  const fetchAnalyticsData = async (teamId: string): Promise<AnalyticsData> => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const [
      { data: weeklySessions },
      { data: weeklyMessages },
      { data: activeMembers }
    ] = await Promise.all([
      supabase
        .from('research_sessions')
        .select('created_at')
        .eq('team_id', teamId)
        .gt('created_at', oneWeekAgo.toISOString()),
      supabase
        .from('team_messages')
        .select('created_at, user_id')
        .eq('team_id', teamId)
        .gt('created_at', oneWeekAgo.toISOString()),
      supabase
        .from('team_messages')
        .select('user_id')
        .eq('team_id', teamId)
        .gt('created_at', oneWeekAgo.toISOString())
    ]);

    const uniqueActiveMembers = new Set(activeMembers?.map(msg => msg.user_id) || []).size;
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

  const generateWeeklyActivity = (sessions: any[], messages: any[]) => {
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
          handleNewMessage(payload.new);
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

  const handleNewMessage = async (message: any) => {
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

      // Add to real-time events
      setRealTimeEvents(prev => [{
        type: 'message_sent',
        data: newMessage,
        timestamp: new Date(),
        user: profile
      }, ...prev.slice(0, 9)]);
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

      setNewMessage('');
      setUnreadMessages(0);
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  // Member management
  const inviteMember = async () => {
    if (!userRole || !['owner', 'admin'].includes(userRole)) {
      toast.error('Insufficient permissions');
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
        toast.error('User not found');
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
        toast.error('User is already a team member');
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

      toast.success('Member invited successfully');
      setIsInviteModalOpen(false);
      setInviteEmail('');
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('Failed to invite member');
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

      toast.success('Member removed successfully');
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const updateTeamSettings = async () => {
    if (userRole !== 'owner') {
      toast.error('Only team owners can update settings');
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
      toast.success('Team settings updated');
    } catch (error) {
      console.error('Error updating team:', error);
      toast.error('Failed to update team settings');
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

      toast.success('Session created successfully');
      router.push(`/session/${session.id}`);
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
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
                    <div className="flex items-center space-x-2">
                      {isOnline ? (
                        <FiWifi className="text-green-500" title="Online" />
                      ) : (
                        <FiWifiOff className="text-red-500" title="Offline" />
                      )}
                      <span className="text-xs text-gray-500">
                        Last sync: {lastSync.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-600 flex items-center space-x-2 mt-1">
                    <span>{teamMembers.length} members</span>
                    <span>•</span>
                    <span>{presenceUsers.length} online</span>
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
                <button 
                  onClick={() => startPolling()}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
                >
                  <FiRefreshCw className="mr-2" /> Refresh
                </button>
                
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
              {(['overview', 'sessions', 'members', 'chat', 'analytics'] as const).map(tab => (
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

        {/* Real-time Events Sidebar */}
        <div className="fixed right-4 top-20 w-80 bg-white rounded-lg border shadow-lg z-40 max-h-96 overflow-y-auto">
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center">
              <FiActivity className="mr-2" /> Live Activity
            </h3>
          </div>
          <div className="p-2">
            {realTimeEvents.slice(0, 5).map((event, index) => (
              <div key={index} className="p-2 text-sm border-b last:border-b-0">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-500">
                    {event.type === 'message_sent' && <FiMessageSquare />}
                    {event.type === 'member_joined' && <FiUserPlus />}
                    {event.type === 'session_created' && <FiFileText />}
                  </span>
                  <span className="font-medium">{event.user?.full_name}</span>
                  <span className="text-gray-500 text-xs">
                    {event.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-gray-600 truncate">
                  {event.type === 'message_sent' && 'sent a message'}
                  {event.type === 'member_joined' && 'joined the team'}
                  {event.type === 'session_created' && 'created a session'}
                </p>
              </div>
            ))}
            {realTimeEvents.length === 0 && (
              <p className="p-4 text-gray-500 text-center">No recent activity</p>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Engagement</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analyticsData ? `${analyticsData.engagementRate}%` : '0%'}
                      </p>
                    </div>
                    <FiActivity className="text-orange-500 text-xl" />
                  </div>
                </div>
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

                <div className="bg-white p-6 rounded-lg border shadow-sm">
                  <h3 className="text-lg font-semibold mb-4">Online Members</h3>
                  <div className="space-y-3">
                    {presenceUsers.map(user => (
                      <div key={user.user_id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                              <FiUser className="text-gray-600" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                          </div>
                          <div>
                            <p className="font-medium">{user.profile.full_name || user.profile.email}</p>
                            <p className="text-sm text-gray-600">Online</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {presenceUsers.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No members online</p>
                    )}
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
                        {presenceUsers.some(u => u.user_id === member.user_id) && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                        )}
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
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <FiUsers className="text-green-500" />
                    <span>{presenceUsers.length} online</span>
                  </div>
                </div>
              </div>
              
              <div ref={messagesEndRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {teamMessages.map(message => (
                  <div key={message.id} className="flex space-x-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center">
                      <FiUser className="text-gray-600 text-sm" />
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