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
  FiVolume2, FiVideo, FiMail, FiLink, FiShield, FiAlertCircle
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';

// AI Service Hook
const useAIService = () => {
  const [aiSession, setAiSession] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<'loading' | 'ready' | 'error' | 'unavailable'>('loading');

  useEffect(() => {
    const initializeAI = async () => {
      try {
        const opts = { expectedOutputs: [{ type: "text", languages: ["en"] }] };
        const availability = await (window as any).LanguageModel.availability(opts);
        if (availability === "unavailable") {
          setAiStatus('unavailable');
          return;
        }
        const session = await (window as any).LanguageModel.create(opts);
        setAiSession(session);
        setAiStatus('ready');
      } catch (err) {
        setAiStatus('error');
      }
    };
    if ((window as any).LanguageModel) initializeAI();
    else setAiStatus('error');
  }, []);

  const cleanAIResponse = (text: string) => text.replace(/##/g, '').replace(/\*\*/g, '').trim();

  const promptAI = async (prompt: string) => {
    if (!aiSession) return "AI not available";
    try {
      const result = await aiSession.prompt(prompt);
      return cleanAIResponse(result);
    } catch (error) {
      return "Error from AI";
    }
  };

  return { aiStatus, promptAI };
};

interface TeamPageProps {
  params: { id: string };
}

interface RealTimeEvent {
  type: 'session_created' | 'session_updated' | 'member_joined' | 'member_left' | 'message_sent' | 'ai_response' | 'member_removed';
  data: any;
  timestamp: Date;
  user?: IProfile;
}

interface AIChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  user_id?: string;
  profile?: IProfile;
  type?: 'text' | 'suggestion' | 'analysis' | 'insight';
  metadata?: any;
}

interface AISuggestion {
  type: 'research_topic' | 'collaboration_idea' | 'resource_recommendation' | 'analysis_insight' | 'team_optimization';
  title: string;
  content: string;
  confidence: number;
  action?: string;
  priority: 'high' | 'medium' | 'low';
}

interface InviteModalState {
  isOpen: boolean;
  email: string;
  role: 'admin' | 'member' | 'moderator';
  isLoading: boolean;
}

interface AnalyticsData {
  sessionsCreated: number;
  messagesSent: number;
  activeMembers: number;
  productivityScore: number;
  engagementRate: number;
  weeklyActivity: { day: string; count: number; type: string }[];
  memberActivity: { name: string; sessions: number; messages: number; lastActive: Date }[];
  topSessions: { title: string; engagement: number; collaborators: number }[];
  aiUsage: { date: string; requests: number; type: string }[];
}

interface TeamMessageWithProfile extends ITeamMessage {
  profiles: IProfile;
}

interface PresenceUser {
  user_id: string;
  online_at: string;
  profile: IProfile;
  status?: 'active' | 'idle' | 'offline';
}

interface ManagementAction {
  type: 'kick' | 'promote' | 'demote' | 'transfer_ownership';
  memberId: string;
  memberName: string;
  data?: any;
}

export default function TeamPage({ params }: TeamPageProps) {
  const router = useRouter();
  const { id: teamId } = useParams();
  const supabase = createClient();
  
  const [team, setTeam] = useState<ITeam | null>(null);
  const [userProfile, setUserProfile] = useState<IProfile | null>(null);
  const [teamMembers, setTeamMembers] = useState<(ITeamMember & { profiles: IProfile })[]>([]);
  const [sessions, setSessions] = useState<IResearchSession[]>([]);
  const [teamMessages, setTeamMessages] = useState<TeamMessageWithProfile[]>([]);
  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'members' | 'chat' | 'ai' | 'analytics' | 'settings'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'moderator' | 'member' | null>(null);
  const [realTimeEvents, setRealTimeEvents] = useState<RealTimeEvent[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [inviteModal, setInviteModal] = useState<InviteModalState>({
    isOpen: false,
    email: '',
    role: 'member',
    isLoading: false
  });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [managementAction, setManagementAction] = useState<ManagementAction | null>(null);
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [editedTeam, setEditedTeam] = useState({ name: '', description: '', visibility: 'private' as 'private' | 'public' });
  const { aiStatus, promptAI } = useAIService();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const aiChatContainerRef = useRef<HTMLDivElement>(null);




  // Real-time analytics with WebSocket-like updates
  const startAnalyticsPolling = useCallback(() => {
    const interval = setInterval(async () => {
      if (teamId) {
        await fetchRealTimeAnalytics();
      }
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [teamId]);

  const fetchRealTimeAnalytics = async () => {
    if (!teamId) return;

    try {
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        sessionsResponse, 
        messagesResponse, 
        aiRequestsResponse,
        recentActivityResponse
      ] = await Promise.all([
        supabase.from('research_sessions').select('*').eq('team_id', teamId),
        supabase.from('team_messages').select('*').eq('team_id', teamId),
        supabase.from('ai_requests').select('*').eq('team_id', teamId).gte('created_at', twentyFourHoursAgo.toISOString()),
        supabase.from('team_activity').select('*').eq('team_id', teamId).gte('timestamp', sevenDaysAgo.toISOString())
      ]);

      const allSessions = sessionsResponse.data || [];
      const allMessages = messagesResponse.data || [];
      const aiRequests = aiRequestsResponse.data || [];
      const recentActivity = recentActivityResponse.data || [];

      // Calculate real-time metrics
      const activeLastHour = presenceUsers.filter(user => 
        new Date(user.online_at) > new Date(now.getTime() - 60 * 60 * 1000)
      ).length;

      // Weekly activity with types
      const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - (6 - i));
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        return { 
          day: dayName, 
          count: recentActivity.filter(a => 
            new Date(a.timestamp).toDateString() === date.toDateString()
          ).length,
          type: 'activity'
        };
      });

      // Member activity with last active
      const memberActivity = teamMembers.map(member => {
        const memberSessions = allSessions.filter(s => s.user_id === member.user_id);
        const memberMessages = allMessages.filter(m => m.user_id === member.user_id);
        const lastActive = Math.max(
          ...memberSessions.map(s => new Date(s.created_at).getTime()),
          ...memberMessages.map(m => new Date(m.created_at).getTime())
        );

        return {
          name: member.profiles?.full_name || member.profiles?.email || 'Unknown',
          sessions: memberSessions.length,
          messages: memberMessages.length,
          lastActive: new Date(lastActive || member.created_at)
        };
      });

      // Top sessions by engagement (mock calculation)
      const topSessions = allSessions.slice(0, 5).map(session => ({
        title: session.title,
        engagement: Math.floor(Math.random() * 100), // Would be real data in production
        collaborators: Math.floor(Math.random() * 10) + 1
      }));

      // AI usage analytics
      const aiUsage = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - (6 - i));
        const dateStr = date.toISOString().split('T')[0];
        
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          requests: aiRequests.filter(req => 
            new Date(req.created_at).toDateString() === date.toDateString()
          ).length,
          type: 'ai_requests'
        };
      });

      const analytics: AnalyticsData = {
        sessionsCreated: allSessions.length,
        messagesSent: allMessages.length,
        activeMembers: activeLastHour,
        productivityScore: calculateProductivityScore(memberActivity),
        engagementRate: calculateEngagementRate(memberActivity, allSessions.length),
        weeklyActivity,
        memberActivity: memberActivity.sort((a, b) => b.sessions + b.messages - (a.sessions + a.messages)),
        topSessions,
        aiUsage
      };

      setAnalyticsData(analytics);
    } catch (error) {
      console.error('Error fetching real-time analytics:', error);
    }
  };

  const calculateProductivityScore = (memberActivity: any[]): number => {
    if (memberActivity.length === 0) return 0;
    
    const totalSessions = memberActivity.reduce((sum, member) => sum + member.sessions, 0);
    const totalMessages = memberActivity.reduce((sum, member) => sum + member.messages, 0);
    const activeMembers = memberActivity.filter(m => 
      new Date().getTime() - m.lastActive.getTime() < 7 * 24 * 60 * 60 * 1000
    ).length;
    
    const sessionScore = Math.min((totalSessions / (memberActivity.length * 2)) * 40, 40);
    const messageScore = Math.min((totalMessages / (memberActivity.length * 10)) * 30, 30);
    const activityScore = (activeMembers / memberActivity.length) * 30;
    
    return Math.round(sessionScore + messageScore + activityScore);
  };

  const calculateEngagementRate = (memberActivity: any[], totalSessions: number): number => {
    if (memberActivity.length === 0 || totalSessions === 0) return 0;
    
    const activeMembers = memberActivity.filter(m => m.sessions > 0 || m.messages > 0).length;
    return Math.round((activeMembers / memberActivity.length) * 100);
  };

  // Enhanced AI suggestion generation with team context
  const generateAISuggestions = useCallback(async () => {
    try {
      const context = `
        Team Analysis Request:
        
        Team: ${team?.name}
        Description: ${team?.description || 'No description'}
        Members: ${teamMembers.length}
        Active Members: ${presenceUsers.length}
        Research Sessions: ${sessions.length}
        Recent Messages: ${teamMessages.slice(-10).map(m => m.content).join(', ')}
        
        Team Members:
        ${teamMembers.map(m => `- ${m.profiles?.full_name}: ${m.role} (${onlineUsers.has(m.user_id) ? 'online' : 'offline'})`).join('\n')}
        
        Recent Sessions:
        ${sessions.slice(0, 5).map(s => `- ${s.title}`).join('\n')}
        
        Please provide 3-5 actionable suggestions to improve team collaboration and research effectiveness.
      `;

      if (aiStatus === 'ready') {
        const result = await promptAI(context);
        parseAISuggestions(result);
      } else {
        // Enhanced mock suggestions based on real data
        const mockSuggestions: AISuggestion[] = [
          {
            type: 'team_optimization',
            title: 'Weekly Research Sync',
            content: `Schedule a weekly meeting with ${teamMembers.length} members to align on research goals.`,
            confidence: 0.92,
            action: 'Schedule Meeting',
            priority: 'high'
          },
          {
            type: 'collaboration_idea',
            title: 'Cross-Functional Workshop',
            content: 'Organize a workshop to share findings with product and engineering teams.',
            confidence: 0.85,
            action: 'Plan Workshop',
            priority: 'medium'
          },
          {
            type: 'research_topic',
            title: 'User Behavior Analysis',
            content: 'Deep dive into user interaction patterns from recent sessions.',
            confidence: 0.78,
            action: 'Create Session',
            priority: 'high'
          }
        ];
        setAiSuggestions(mockSuggestions);
      }
    } catch (error) {
      console.error('AI suggestion generation failed:', error);
      toast.error('Failed to generate AI suggestions');
    }
  }, [team, teamMembers, sessions, teamMessages, presenceUsers, onlineUsers, aiStatus, promptAI]);

  const parseAISuggestions = (result: string) => {
    try {
      const suggestions: AISuggestion[] = [];
      const lines = result.split('\n').filter(line => line.trim());
      
      lines.forEach(line => {
        if (line.includes('|')) {
          const parts = line.split('|').map(part => part.trim());
          if (parts.length >= 4) {
            const [type, title, content, confidenceStr, action, priority] = parts;
            const confidence = parseFloat(confidenceStr);
            
            if (!isNaN(confidence) && confidence >= 0 && confidence <= 1) {
              suggestions.push({
                type: type as AISuggestion['type'],
                title,
                content,
                confidence,
                action: action || 'Learn More',
                priority: (priority as 'high' | 'medium' | 'low') || 'medium'
              });
            }
          }
        }
      });
      
      setAiSuggestions(suggestions.slice(0, 5));
    } catch (error) {
      console.error('Error parsing AI suggestions:', error);
    }
  };

  // Enhanced real-time presence tracking
  const setupPresenceTracking = useCallback(async () => {
    if (!teamId || !userProfile) return;

    try {
      const presenceChannel = supabase.channel(`team-presence:${teamId}`, {
        config: {
          presence: {
            key: userProfile.id,
          },
        },
      });

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const users: PresenceUser[] = Object.values(state).flat() as PresenceUser[];
          setPresenceUsers(users);
          setOnlineUsers(new Set(users.map(u => u.user_id)));
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              user_id: userProfile.id,
              online_at: new Date().toISOString(),
              profile: userProfile,
              status: 'active'
            });
          }
        });

      return () => {
        presenceChannel.unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up presence tracking:', error);
    }
  }, [teamId, userProfile, supabase]);

  // Initialize team data with enhanced error handling
  const initializeTeamData = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!user || userError) {
        router.push('/login');
        return;
      }

      const [profileResponse, teamResponse, membersResponse] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('teams').select('*').eq('id', teamId).single(),
        supabase.from('team_members').select('*').eq('team_id', teamId).eq('user_id', user.id).single()
      ]);

      setUserProfile(profileResponse.data);
      setTeam(teamResponse.data);

      if (!teamResponse.data) {
        toast.error('Team not found');
        router.push('/dashboard');
        return;
      }

      if (membersResponse.data) {
        setIsMember(true);
        setUserRole(membersResponse.data.role);
        
        // Load all team data in parallel with error handling
        const [allMembersResponse, sessionsResponse, messagesResponse] = await Promise.all([
          supabase
            .from('team_members')
            .select('*, profiles(*)')
            .eq('team_id', teamId)
            .order('created_at', { ascending: true }),
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
            .limit(100)
        ]);

        setTeamMembers(allMembersResponse.data || []);
        setSessions(sessionsResponse.data || []);
        setTeamMessages(messagesResponse.data || []);

        // Set edited team for form
        setEditedTeam({
          name: teamResponse.data.name,
          description: teamResponse.data.description || '',
          visibility: teamResponse.data.visibility || 'private'
        });

        // Generate initial AI suggestions
        setTimeout(() => generateAISuggestions(), 1000);
        
      } else {
        setIsMember(false);
        toast.error('You are not a member of this team');
      }
    } catch (error) {
      console.error('Error initializing team data:', error);
      toast.error('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  }, [teamId, router, supabase, generateAISuggestions]);

  // Enhanced real-time subscriptions
  useEffect(() => {
    if (!teamId || !isMember || !userProfile) return;

    const channels: any[] = [];

    // Team members channel with enhanced events
    const membersChannel = supabase.channel('team-members')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'team_members',
          filter: `team_id=eq.${teamId}`
        }, 
        async (payload) => {
          const { data: members } = await supabase
            .from('team_members')
            .select('*, profiles(*)')
            .eq('team_id', teamId);
          
          setTeamMembers(members || []);

          if (payload.eventType === 'INSERT') {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', payload.new.user_id)
              .single();
            
            setRealTimeEvents(prev => [{
              type: 'member_joined',
              data: payload.new,
              timestamp: new Date(),
              user: profile
            }, ...prev.slice(0, 49)]);
            
            toast.success(`${profile?.full_name || profile?.email} joined the team`);
          } else if (payload.eventType === 'DELETE') {
            setRealTimeEvents(prev => [{
              type: 'member_removed',
              data: payload.old,
              timestamp: new Date()
            }, ...prev.slice(0, 49)]);
          }
        }
      );
    channels.push(membersChannel);

    // Sessions channel
    const sessionsChannel = supabase.channel('team-sessions')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'research_sessions',
          filter: `team_id=eq.${teamId}`
        }, 
        async (payload) => {
          const { data: sessionData } = await supabase
            .from('research_sessions')
            .select('*')
            .eq('team_id', teamId)
            .order('created_at', { ascending: false });
          
          setSessions(sessionData || []);

          if (payload.eventType === 'INSERT') {
            setRealTimeEvents(prev => [{
              type: 'session_created',
              data: payload.new,
              timestamp: new Date()
            }, ...prev.slice(0, 49)]);
          }
        }
      );
    channels.push(sessionsChannel);

    // Messages channel with enhanced features
    const messagesChannel = supabase.channel('team-messages')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'team_messages',
          filter: `team_id=eq.${teamId}`
        }, 
        async (payload) => {
          const { data: newMessage } = await supabase
            .from('team_messages')
            .select('*, profiles(*)')
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

            if (activeTab !== 'chat') {
              setUnreadMessages(prev => prev + 1);
            }

            scrollToBottom();
          }
        }
      );
    channels.push(messagesChannel);

    // Subscribe to all channels
    channels.forEach(channel => channel.subscribe());

    // Set up online/offline detection
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online - syncing data...');
      initializeTeamData();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Connection lost - working offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [teamId, isMember, supabase, activeTab, userProfile, initializeTeamData]);

  // Enhanced chat functions with typing indicators
  const sendMessage = async () => {
    if (!newMessage.trim() || !userProfile) return;

    try {
      const { error } = await supabase
        .from('team_messages')
        .insert({
          team_id: teamId as string,
          user_id: userProfile.id,
          content: newMessage.trim(),
          created_at: new Date().toISOString(),
          type: 'text'
        });

      if (error) throw error;

      setNewMessage('');
      toast.success('Message sent');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  // Advanced AI chat with context awareness
  const sendAIMessage = async () => {
    if (!aiInput.trim() || !userProfile || isAiThinking) return;

    const userMessage: AIChatMessage = {
      id: Date.now().toString(),
      content: aiInput.trim(),
      role: 'user',
      timestamp: new Date(),
      user_id: userProfile.id,
      profile: userProfile,
      type: 'text'
    };

    setAiMessages(prev => [...prev, userMessage]);
    setAiInput('');
    setIsAiThinking(true);

    try {
      const context = `
        Team Context:
        - Team: ${team?.name}
        - Your Role: ${userRole}
        - Active Members: ${presenceUsers.length}/${teamMembers.length}
        - Recent Sessions: ${sessions.slice(0, 3).map(s => s.title).join(', ')}
        
        Conversation History:
        ${aiMessages.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}
        
        Current Query: ${aiInput}
        
        Please provide helpful, actionable advice considering the team's context and research focus.
      `;

      let responseText: string;
      
      if (aiStatus === 'ready') {
        responseText = await promptAI(context);
      } else {
        // Enhanced mock responses
        await new Promise(resolve => setTimeout(resolve, 2000));
        responseText = `
I've analyzed your query about "${aiInput.substring(0, 30)}..." in the context of ${team?.name}.

Based on the team's activity (${sessions.length} sessions, ${teamMembers.length} members), I recommend:

1. **Collaborative Analysis**: Schedule a session to review recent findings together
2. **Knowledge Sharing**: Create a shared repository for research insights
3. **Next Steps**: ${aiInput.includes('strategy') ? 'Develop a research roadmap' : 'Conduct user interviews'}

        `.trim();
      }

      const aiMessage: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        content: responseText,
        role: 'assistant',
        timestamp: new Date(),
        type: 'analysis',
        metadata: {
          suggestions: extractSuggestions(responseText),
          confidence: 0.89,
          relatedSessions: sessions.slice(0, 2).map(s => s.title)
        }
      };

      setAiMessages(prev => [...prev, aiMessage]);
      setRealTimeEvents(prev => [{
        type: 'ai_response',
        data: aiMessage,
        timestamp: new Date(),
        user: userProfile
      }, ...prev.slice(0, 49)]);

      // Log AI usage
      await supabase.from('ai_requests').insert({
        team_id: teamId,
        user_id: userProfile.id,
        query: aiInput,
        response_length: responseText.length,
        created_at: new Date().toISOString()
      });

    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.",
        role: 'assistant',
        timestamp: new Date(),
        type: 'text'
      };
      setAiMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const extractSuggestions = (content: string): string[] => {
    const suggestions = content.match(/\d+\.\s\*\*(.+?)\*\*/g);
    return suggestions ? suggestions.map(s => s.replace(/\d+\.\s\*\*|\*\*/g, '').trim()) : [];
  };

  const handleKeyPress = (e: React.KeyboardEvent, type: 'chat' | 'ai') => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (type === 'chat') sendMessage();
      else sendAIMessage();
    }
  };

  // Enhanced member management with role-based permissions
  const openInviteModal = () => {
    setInviteModal({
      isOpen: true,
      email: '',
      role: 'member',
      isLoading: false
    });
  };

  const inviteMember = async () => {
    if (!userRole || (userRole !== 'owner' && userRole !== 'admin')) {
      toast.error('Insufficient permissions');
      return;
    }

    if (!inviteModal.email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setInviteModal(prev => ({ ...prev, isLoading: true }));

    try {
      const { data: userData } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', inviteModal.email.trim())
        .single();

      if (!userData) {
        toast.error('User not found');
        return;
      }

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
          role: inviteModal.role,
          joined_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success(`Invited ${userData.full_name || userData.email} to the team as ${inviteModal.role}`);
      setInviteModal(prev => ({ ...prev, isOpen: false, email: '' }));
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('Failed to invite member');
    } finally {
      setInviteModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Advanced member management actions
  const removeMember = async (memberId: string, memberName: string) => {
    if (!userRole || (userRole !== 'owner' && userRole !== 'admin')) {
      toast.error('Insufficient permissions');
      return;
    }

    if (!confirm(`Are you sure you want to remove ${memberName} from the team? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)
        .eq('team_id', teamId);

      if (error) throw error;

      toast.success(`Successfully removed ${memberName} from the team`);
      setManagementAction(null);
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const promoteMember = async (memberId: string, memberName: string, newRole: 'admin' | 'moderator') => {
    if (userRole !== 'owner') {
      toast.error('Only team owners can promote members');
      return;
    }

    try {
      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('id', memberId)
        .eq('team_id', teamId);

      if (error) throw error;

      toast.success(`Promoted ${memberName} to ${newRole}`);
      setManagementAction(null);
    } catch (error) {
      console.error('Error promoting member:', error);
      toast.error('Failed to promote member');
    }
  };

  const transferOwnership = async (memberId: string, memberName: string) => {
    if (userRole !== 'owner') {
      toast.error('Only team owners can transfer ownership');
      return;
    }

    if (!confirm(`Are you sure you want to transfer ownership to ${memberName}? You will become an admin.`)) {
      return;
    }

    try {
      await supabase.rpc('transfer_team_ownership', {
        team_id: teamId,
        new_owner_id: memberId,
        current_owner_id: userProfile?.id
      });

      toast.success(`Transferred ownership to ${memberName}`);
      setManagementAction(null);
      // Refresh page to update roles
      window.location.reload();
    } catch (error) {
      console.error('Error transferring ownership:', error);
      toast.error('Failed to transfer ownership');
    }
  };

  // Enhanced session creation with AI suggestions
  const createNewSession = async (suggestion?: AISuggestion) => {
    if (!userProfile) return;

    try {
      const title = suggestion?.title || `Team Session ${new Date().toLocaleDateString()}`;
      const description = suggestion?.content || 'Collaborative research session';

      const { data: session, error } = await supabase
        .from('research_sessions')
        .insert({
          team_id: teamId as string,
          user_id: userProfile.id,
          title,
          description,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_team_session: true
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

  // Enhanced team settings management
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
          visibility: editedTeam.visibility,
          updated_at: new Date().toISOString()
        })
        .eq('id', teamId);

      if (error) throw error;

      setTeam(prev => prev ? { ...prev, ...editedTeam } : null);
      setIsEditingTeam(false);
      toast.success('Team settings updated successfully');
    } catch (error) {
      console.error('Error updating team settings:', error);
      toast.error('Failed to update team settings');
    }
  };

  // Export enhanced team data
  const exportTeamData = async () => {
    try {
      const exportData = {
        team: {
          ...team,
          analytics: analyticsData
        },
        members: teamMembers,
        sessions: sessions.map(s => ({
          ...s,
          member_count: teamMembers.filter(m => m.user_id === s.user_id).length
        })),
        messages: teamMessages.slice(-100), // Last 100 messages
        ai_interactions: aiMessages,
        analytics: analyticsData,
        exported_at: new Date().toISOString(),
        exported_by: userProfile?.email
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${team?.name.replace(/\s+/g, '_')}_export_${new Date().getTime()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Team data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  // Scroll management
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      aiChatContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Initialize everything
  useEffect(() => {
    initializeTeamData();
    const cleanupPresence = setupPresenceTracking();
    // const cleanupAnalytics = startAnalyticsPolling();

    return () => {
      // if (cleanupPresence) cleanupPresence();
      // if (cleanupAnalytics) cleanupAnalytics();
    };
  }, [initializeTeamData, setupPresenceTracking, startAnalyticsPolling]);

  // Scroll and unread messages management
  useEffect(() => {
    if (activeTab === 'chat' || activeTab === 'ai') {
      scrollToBottom();
      setUnreadMessages(0);
    }
  }, [teamMessages, aiMessages, activeTab]);

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

  if (!isMember) {
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
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Enhanced Connection Status */}
        {!isOnline && (
          <div className="bg-yellow-100 border-b border-yellow-400 p-3 text-center text-sm text-yellow-800 flex items-center justify-center">
            <FiRefreshCw className="inline mr-2 animate-spin" />
            Working offline - some features may be limited
          </div>
        )}

        {/* Advanced Team Header */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/60 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <FiUsers className="text-2xl text-white" />
                </div>
                {presenceUsers.length > 0 && (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-white">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center space-x-3">
                  {isEditingTeam ? (
                    <input
                      type="text"
                      value={editedTeam.name}
                      onChange={(e) => setEditedTeam(prev => ({ ...prev, name: e.target.value }))}
                      className="text-2xl font-bold bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
                  )}
                  {userRole === 'owner' && (
                    <button 
                      onClick={() => setIsEditingTeam(!isEditingTeam)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      {isEditingTeam ? <FiX className="w-4 h-4" /> : <FiEdit3 className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <p className="text-gray-600 flex items-center flex-wrap gap-2 mt-1">
                  {team.visibility === 'public' ? (
                    <span className="flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full border border-green-200">
                      <FiGlobe className="mr-1" /> Public Team
                    </span>
                  ) : (
                    <span className="flex items-center px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full border border-gray-200">
                      <FiLock className="mr-1" /> Private Team
                    </span>
                  )}
                  <span className="flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full border border-blue-200">
                    <FiUsers className="mr-1" /> {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full border border-green-200">
                    <FiActivity className="mr-1" /> {presenceUsers.length} online
                  </span>
                  {userRole && (
                    <span className={`flex items-center px-2 py-1 text-xs rounded-full border capitalize ${
                      userRole === 'owner' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                      userRole === 'admin' ? 'bg-red-100 text-red-800 border-red-200' :
                      userRole === 'moderator' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                      'bg-gray-100 text-gray-800 border-gray-200'
                    }`}>
                      <FiAward className="mr-1" /> {userRole}
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={generateAISuggestions}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 flex items-center shadow-md"
              >
                <FiZap className="mr-2" /> AI Insights
              </button>
              
              <div className="flex space-x-2">
                <button 
                  onClick={exportTeamData}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center shadow-sm"
                >
                  <FiDownload className="mr-2" /> Export
                </button>
                
                {(userRole === 'owner' || userRole === 'admin') && (
                  <button 
                    onClick={openInviteModal}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center shadow-md"
                  >
                    <FiUserPlus className="mr-2" /> Invite
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Enhanced Navigation Tabs */}
          <div className="mt-6 flex space-x-8 border-b border-gray-200/60 overflow-x-auto">
            {(['overview', 'sessions', 'members', 'chat', 'ai', 'analytics', 'settings'] as const).map(tab => (
              <button
                key={tab}
                className={`pb-3 px-1 font-medium text-sm whitespace-nowrap flex items-center transition-all ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'chat' && unreadMessages > 0 && (
                  <span className="mr-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {unreadMessages}
                  </span>
                )}
                {tab === 'ai' ? (
                  <>
                    <FiZap className="mr-2" /> AI Assistant
                  </>
                ) : tab === 'analytics' ? (
                  <>
                    <FiBarChart2 className="mr-2" /> Analytics
                  </>
                ) : (
                  tab.charAt(0).toUpperCase() + tab.slice(1)
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Enhanced Tab Content */}
        <div className="flex-1 p-6 overflow-auto">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* AI Suggestions Grid with Priority */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">AI-Powered Suggestions</h2>
                  <button 
                    onClick={generateAISuggestions}
                    className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <FiRefreshCw className="mr-1" /> Refresh
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {aiSuggestions.map((suggestion, index) => (
                    <div key={index} className={`bg-gradient-to-br rounded-xl p-6 border shadow-sm hover:shadow-md transition-all cursor-pointer ${
                      suggestion.priority === 'high' ? 'from-red-50 to-orange-50 border-red-100' :
                      suggestion.priority === 'medium' ? 'from-yellow-50 to-amber-50 border-yellow-100' :
                      'from-blue-50 to-cyan-50 border-blue-100'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          suggestion.type === 'research_topic' ? 'bg-blue-100 text-blue-800' :
                          suggestion.type === 'collaboration_idea' ? 'bg-green-100 text-green-800' :
                          suggestion.type === 'resource_recommendation' ? 'bg-purple-100 text-purple-800' :
                          suggestion.type === 'team_optimization' ? 'bg-red-100 text-red-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {suggestion.type.replace('_', ' ')}
                        </span>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-gray-500">{Math.round(suggestion.confidence * 100)}%</span>
                          {suggestion.priority === 'high' && <FiAlertCircle className="text-red-500 w-3 h-3" />}
                        </div>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">{suggestion.title}</h4>
                      <p className="text-sm text-gray-700 mb-4">{suggestion.content}</p>
                      <button 
                        onClick={() => {
                          if (suggestion.type === 'research_topic') {
                            createNewSession(suggestion);
                          } else {
                            toast.success(`Action: ${suggestion.action || 'Exploring'} ${suggestion.title}`);
                          }
                        }}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <FiTarget className="mr-1" /> {suggestion.action || 'Explore'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-time Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-gray-200/60 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Research Sessions</h3>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{sessions.length}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        +{sessions.filter(s => new Date(s.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length} this week
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100/50 rounded-lg">
                      <FiFileText className="text-blue-600 text-xl" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-gray-200/60 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Team Members</h3>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{teamMembers.length}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {presenceUsers.length} active now
                      </p>
                    </div>
                    <div className="p-3 bg-green-100/50 rounded-lg">
                      <FiUsers className="text-green-600 text-xl" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-gray-200/60 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Messages</h3>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{teamMessages.length}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        +{teamMessages.filter(m => new Date(m.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length} today
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100/50 rounded-lg">
                      <FiMessageSquare className="text-purple-600 text-xl" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-gray-200/60 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Engagement Rate</h3>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {analyticsData ? `${analyticsData.engagementRate}%` : '...'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Team participation</p>
                    </div>
                    <div className="p-3 bg-orange-100/50 rounded-lg">
                      <FiTrendingUp className="text-orange-600 text-xl" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Activity Feed */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-gray-200/60">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Real-time Activity</h3>
                    <FiActivity className="text-gray-400" />
                  </div>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {realTimeEvents.slice(0, 8).map((event, index) => (
                      <div key={index} className="flex items-center space-x-4 p-3 hover:bg-gray-50/50 rounded-lg transition-colors">
                        <div className={`w-3 h-3 rounded-full ${
                          event.type === 'session_created' ? 'bg-blue-500 animate-pulse' :
                          event.type === 'member_joined' ? 'bg-green-500' :
                          event.type === 'message_sent' ? 'bg-purple-500' : 
                          event.type === 'ai_response' ? 'bg-orange-500' : 'bg-gray-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {event.type === 'session_created' && 'New research session started'}
                            {event.type === 'member_joined' && `🎉 ${event.user?.full_name || event.user?.email} joined`}
                            {event.type === 'message_sent' && `💬 ${event.user?.full_name || event.user?.email} sent a message`}
                            {event.type === 'ai_response' && '🤖 AI provided insights'}
                            {event.type === 'member_removed' && '👋 Member left the team'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {event.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                    {realTimeEvents.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-8">No recent activity</p>
                    )}
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-gray-200/60">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Active Sessions</h3>
                    <button 
                      onClick={() => createNewSession()}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center"
                    >
                      <FiPlus className="mr-1" /> New
                    </button>
                  </div>
                  <div className="space-y-4">
                    {sessions.slice(0, 4).map(session => (
                      <div key={session.id} className="flex items-center justify-between p-4 hover:bg-gray-50/50 rounded-lg border border-gray-200/40 transition-colors group">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-blue-100/50 rounded-lg">
                            <FiFileText className="text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{session.title}</h4>
                            <p className="text-xs text-gray-500 flex items-center space-x-2 mt-1">
                              <span>Created {new Date(session.created_at).toLocaleDateString()}</span>
                              <span>•</span>
                              <span className="flex items-center">
                                <FiUser className="mr-1 text-xs" /> 
                                {teamMembers.find(m => m.user_id === session.user_id)?.profiles?.full_name || 'Team'}
                              </span>
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => router.push(`/session/${session.id}`)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 flex items-center"
                        >
                          Open <FiExternalLink className="ml-1" />
                        </button>
                      </div>
                    ))}
                    {sessions.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <FiFileText className="mx-auto text-3xl mb-2" />
                        <p>No sessions yet</p>
                        <button 
                          onClick={() => createNewSession()}
                          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          Create your first session
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Sessions Tab */}
          {activeTab === 'sessions' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/60">
              <div className="p-6 border-b border-gray-200/60 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Team Research Sessions</h3>
                  <p className="text-sm text-gray-600 mt-1">Collaborative research and analysis</p>
                </div>
                <div className="flex space-x-3">
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center shadow-sm">
                    <FiFilter className="mr-2" /> Filter
                  </button>
                  <button 
                    onClick={() => createNewSession()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center shadow-md"
                  >
                    <FiPlus className="mr-2" /> New Session
                  </button>
                </div>
              </div>
              <div className="divide-y divide-gray-200/60">
                {sessions.map(session => (
                  <div key={session.id} className="p-6 hover:bg-gray-50/50 flex justify-between items-center group transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl">
                        <FiFileText className="text-blue-600 text-xl" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{session.title}</h4>
                        <p className="text-sm text-gray-600 mt-1 flex items-center space-x-3">
                          <span>Created {new Date(session.created_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span className="flex items-center">
                            <FiUser className="mr-1" /> 
                            {teamMembers.find(m => m.user_id === session.user_id)?.profiles?.full_name || 'Unknown'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center text-green-600">
                            <FiUsers className="mr-1" /> 
                            {teamMembers.filter(m => m.user_id === session.user_id).length} collaborators
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => router.push(`/session/${session.id}`)}
                        className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center text-sm font-medium"
                      >
                        <FiEye className="mr-2" /> View
                      </button>
                      {(userRole === 'owner' || userRole === 'admin') && (
                        <button 
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this session?')) {
                              // Implement session deletion
                              toast.info('Session deletion would be implemented here');
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <div className="p-12 text-center text-gray-500">
                    <FiFileText className="mx-auto text-4xl mb-3 text-gray-300" />
                    <p className="text-lg font-medium mb-2">No research sessions yet</p>
                    <p className="text-sm mb-4">Start collaborating with your team on research projects</p>
                    <button 
                      onClick={() => createNewSession()}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Create your first session
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Enhanced Members Tab with Management */}
          {activeTab === 'members' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/60">
              <div className="p-6 border-b border-gray-200/60 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Team Members ({teamMembers.length})
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {presenceUsers.length} online • {teamMembers.length - presenceUsers.length} offline
                  </p>
                </div>
                {(userRole === 'owner' || userRole === 'admin') && (
                  <button 
                    onClick={openInviteModal}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center shadow-md"
                  >
                    <FiUserPlus className="mr-2" /> Invite Member
                  </button>
                )}
              </div>
              <div className="divide-y divide-gray-200/60">
                {teamMembers.map(member => {
                  const isOnline = presenceUsers.some(u => u.user_id === member.user_id);
                  const isCurrentUser = member.user_id === userProfile?.id;
                  
                  return (
                    <div key={member.id} className="p-6 hover:bg-gray-50/50 flex justify-between items-center group transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                            <FiUser className="text-gray-600 text-xl" />
                          </div>
                          {isOnline && (
                            <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-white">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-gray-900">
                              {member.profiles?.full_name || member.profiles?.email}
                              {isCurrentUser && <span className="ml-2 text-blue-600 text-sm">(You)</span>}
                            </h4>
                            {isOnline ? (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Online</span>
                            ) : (
                              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">Offline</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 flex items-center space-x-2 mt-1">
                            <span className={`capitalize px-2 py-1 rounded text-xs ${
                              member.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                              member.role === 'admin' ? 'bg-red-100 text-red-800' :
                              member.role === 'moderator' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {member.role}
                            </span>
                            <span>•</span>
                            <span>Joined {new Date(member.created_at).toLocaleDateString()}</span>
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isCurrentUser && (userRole === 'owner' || userRole === 'admin') && (
                          <div className="relative">
                            <button 
                              onClick={() => setManagementAction({
                                type: 'kick',
                                memberId: member.id,
                                memberName: member.profiles?.full_name || 'this member'
                              })}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm font-medium"
                            >
                              Remove
                            </button>
                            
                            {/* Management dropdown would go here */}
                          </div>
                        )}
                        {userRole === 'owner' && !isCurrentUser && member.role !== 'owner' && (
                          <div className="flex space-x-1">
                            <button 
                              onClick={() => setManagementAction({
                                type: 'promote',
                                memberId: member.id,
                                memberName: member.profiles?.full_name || 'this member',
                                data: { newRole: 'admin' }
                              })}
                              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm font-medium"
                            >
                              Promote
                            </button>
                            {member.role === 'admin' && (
                              <button 
                                onClick={() => setManagementAction({
                                  type: 'transfer_ownership',
                                  memberId: member.id,
                                  memberName: member.profiles?.full_name || 'this member'
                                })}
                                className="px-3 py-1 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 text-sm font-medium"
                              >
                                Transfer Ownership
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Enhanced Chat Tab */}
          {activeTab === 'chat' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/60 h-[600px] flex flex-col">
              <div className="p-4 border-b border-gray-200/60 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Team Chat</h3>
                    <p className="text-sm text-gray-600">
                      {teamMessages.length} messages • {presenceUsers.length} members online
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {presenceUsers.slice(0, 5).map(user => (
                      <div key={user.user_id} className="w-8 h-8 bg-gradient-to-br from-blue-200 to-blue-300 rounded-full flex items-center justify-center text-xs font-medium text-blue-800 border-2 border-white shadow-sm"
                           title={user.profile?.full_name}>
                        {user.profile?.full_name?.charAt(0) || 'U'}
                      </div>
                    ))}
                    {presenceUsers.length > 5 && (
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs text-gray-600 border-2 border-white">
                        +{presenceUsers.length - 5}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {teamMessages.map((message) => {
                  const isOwnMessage = message.user_id === userProfile?.id;
                  return (
                    <div key={message.id} className={`flex space-x-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      {!isOwnMessage && (
                        <div className="w-8 h-8 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex-shrink-0 flex items-center justify-center">
                          <FiUser className="text-gray-600 text-sm" />
                        </div>
                      )}
                      <div className={`max-w-md ${isOwnMessage ? 'order-2' : 'order-2'}`}>
                        {!isOwnMessage && (
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-sm text-gray-900">
                              {message.profiles?.full_name || message.profiles?.email}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(message.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                        <div className={`rounded-2xl p-3 ${
                          isOwnMessage 
                            ? 'bg-blue-600 text-white rounded-br-none' 
                            : 'bg-gray-100 text-gray-900 rounded-bl-none border border-gray-200'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                        {isOwnMessage && (
                          <span className="text-xs text-gray-500 block mt-1 text-right">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      {isOwnMessage && (
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex-shrink-0 flex items-center justify-center order-1">
                          <FiUser className="text-white text-sm" />
                        </div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-gray-200/60 bg-white/50">
                <div className="flex space-x-3">
                  <div className="flex-1 border border-gray-300 rounded-xl overflow-hidden bg-white">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, 'chat')}
                      placeholder="Type a message to your team..."
                      className="w-full px-4 py-3 border-0 focus:ring-0 focus:outline-none resize-none bg-transparent"
                      rows={2}
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center shadow-md transition-all"
                  >
                    <FiSend className="mr-2" /> Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced AI Assistant Tab */}
          {activeTab === 'ai' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/60 h-[600px] flex flex-col">
              <div className="p-4 border-b border-gray-200/60 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                    <FiZap className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">AI Research Assistant</h3>
                    <p className="text-sm text-gray-600">Get intelligent insights and recommendations for your team</p>
                  </div>
                </div>
              </div>

              <div ref={aiChatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6">
                {aiMessages.length === 0 && (
                  <div className="text-center py-16">
                    <FiZap className="mx-auto text-5xl text-gray-300 mb-4" />
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">Welcome to your AI Assistant!</h4>
                    <p className="text-gray-600 max-w-md mx-auto">
                      Ask me about research strategies, team collaboration, data analysis, or anything else to help your team succeed.
                    </p>
                    <div className="mt-6 grid grid-cols-2 gap-3 max-w-md mx-auto">
                      <button 
                        onClick={() => setAiInput("What are the best practices for collaborative research?")}
                        className="p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm text-left"
                      >
                        Best practices for collaboration
                      </button>
                      <button 
                        onClick={() => setAiInput("How can we improve our research workflow?")}
                        className="p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-sm text-left"
                      >
                        Improve research workflow
                      </button>
                      <button 
                        onClick={() => setAiInput("Analyze our team's recent activity")}
                        className="p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 text-sm text-left"
                      >
                        Analyze team activity
                      </button>
                      <button 
                        onClick={() => setAiInput("Suggest research topics for our team")}
                        className="p-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 text-sm text-left"
                      >
                        Research topic suggestions
                      </button>
                    </div>
                  </div>
                )}

                {aiMessages.map((message) => (
                  <div key={message.id} className={`flex space-x-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.role === 'assistant' && (
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex-shrink-0 flex items-center justify-center shadow-md">
                        <FiZap className="text-white text-lg" />
                      </div>
                    )}
                    <div className={`max-w-2xl ${message.role === 'user' ? 'order-2' : 'order-2'}`}>
                      {message.role === 'user' && (
                        <div className="flex items-center space-x-2 mb-2 justify-end">
                          <span className="text-xs text-gray-500">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                          <span className="font-medium text-sm text-gray-900">
                            {message.profile?.full_name || 'You'}
                          </span>
                        </div>
                      )}
                      <div className={`rounded-2xl p-4 shadow-sm ${
                        message.role === 'user' 
                          ? 'bg-blue-600 text-white rounded-br-none' 
                          : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        {message.metadata?.suggestions && message.metadata.suggestions.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs font-medium text-gray-700">Key suggestions:</p>
                            {message.metadata.suggestions.map((suggestion: string, idx: number) => (
                              <div key={idx} className="flex items-center space-x-2 text-xs bg-blue-50 rounded-lg p-2">
                                <FiTarget className="text-blue-500 flex-shrink-0" />
                                <span>{suggestion}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {message.role === 'assistant' && (
                        <div className="flex items-center space-x-2 mt-2">
                          <span className="text-xs text-gray-500">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                          {message.metadata?.confidence && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                              {Math.round(message.metadata.confidence * 100)}% confidence
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex-shrink-0 flex items-center justify-center shadow-md order-1">
                        <FiUser className="text-white text-lg" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isAiThinking && (
                  <div className="flex space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex-shrink-0 flex items-center justify-center shadow-md">
                      <FiZap className="text-white text-lg" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none p-4">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Analyzing your query...</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-gray-200/60 bg-white/50">
                <div className="flex space-x-3">
                  <div className="flex-1 border border-gray-300 rounded-xl overflow-hidden bg-white shadow-sm">
                    <textarea
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, 'ai')}
                      placeholder="Ask the AI assistant about research, collaboration, analytics..."
                      className="w-full px-4 py-3 border-0 focus:ring-0 focus:outline-none resize-none bg-transparent"
                      rows={2}
                      disabled={isAiThinking}
                    />
                  </div>
                  <button
                    onClick={sendAIMessage}
                    disabled={!aiInput.trim() || isAiThinking}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center shadow-md transition-all"
                  >
                    <FiSend className="mr-2" /> {isAiThinking ? 'Thinking...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-8">
              {analyticsData ? (
                <>
                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-gray-200/60">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Productivity Score</h3>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{analyticsData.productivityScore}%</p>
                          <p className="text-xs text-gray-500 mt-1">Team performance</p>
                        </div>
                        <div className="p-3 bg-blue-100/50 rounded-lg">
                          <FiTrendingUp className="text-blue-600 text-xl" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-gray-200/60">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Engagement Rate</h3>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{analyticsData.engagementRate}%</p>
                          <p className="text-xs text-gray-500 mt-1">Active participation</p>
                        </div>
                        <div className="p-3 bg-green-100/50 rounded-lg">
                          <FiUsers className="text-green-600 text-xl" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-gray-200/60">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Active Members</h3>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{analyticsData.activeMembers}</p>
                          <p className="text-xs text-gray-500 mt-1">Last 24 hours</p>
                        </div>
                        <div className="p-3 bg-purple-100/50 rounded-lg">
                          <FiActivity className="text-purple-600 text-xl" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-gray-200/60">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">AI Interactions</h3>
                          <p className="text-2xl font-bold text-gray-900 mt-1">
                            {analyticsData.aiUsage.reduce((sum, day) => sum + day.requests, 0)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">This week</p>
                        </div>
                        <div className="p-3 bg-orange-100/50 rounded-lg">
                          <FiZap className="text-orange-600 text-xl" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-gray-200/60">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6">Weekly Activity</h3>
                      <div className="space-y-4">
                        {analyticsData.weeklyActivity.map((day, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-600 w-10">{day.day}</span>
                            <div className="flex items-center space-x-3 flex-1 max-w-md">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500" 
                                  style={{ width: `${(day.count / Math.max(1, ...analyticsData.weeklyActivity.map(d => d.count)) * 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-semibold text-gray-900 w-8 text-right">{day.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-gray-200/60">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Contributors</h3>
                      <div className="space-y-4">
                        {analyticsData.memberActivity.slice(0, 5).map((member, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-white">
                                  {member.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <span className="text-sm font-medium text-gray-900">{member.name}</span>
                                <p className="text-xs text-gray-500">
                                  Last active: {member.lastActive.toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-semibold text-gray-900 block">{member.sessions + member.messages}</span>
                              <span className="text-xs text-gray-500">contributions</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Additional Analytics Sections */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-gray-200/60">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Sessions</h3>
                      <div className="space-y-3">
                        {analyticsData.topSessions.map((session, index) => (
                          <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50/50 rounded-lg">
                            <span className="text-sm font-medium text-gray-900 truncate flex-1">{session.title}</span>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>{session.engagement}% engagement</span>
                              <span>{session.collaborators} collaborators</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl shadow-sm border border-gray-200/60">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6">AI Usage Trend</h3>
                      <div className="space-y-3">
                        {analyticsData.aiUsage.map((day, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{day.date}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full" 
                                  style={{ width: `${(day.requests / Math.max(1, ...analyticsData.aiUsage.map(d => d.requests)) * 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium w-6 text-right">{day.requests}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading real-time analytics...</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Enhanced Settings Tab */}
          {activeTab === 'settings' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/60 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Team Settings</h3>
                {userRole === 'owner' && (
                  <button 
                    onClick={() => setIsEditingTeam(!isEditingTeam)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                  >
                    <FiEdit3 className="mr-2" /> {isEditingTeam ? 'Cancel' : 'Edit Settings'}
                  </button>
                )}
              </div>
              
              {userRole === 'owner' ? (
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Team Name</label>
                    {isEditingTeam ? (
                      <input 
                        type="text" 
                        value={editedTeam.name}
                        onChange={(e) => setEditedTeam(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{team.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    {isEditingTeam ? (
                      <textarea 
                        value={editedTeam.description}
                        onChange={(e) => setEditedTeam(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="Describe your team's purpose..."
                      />
                    ) : (
                      <p className="text-gray-900">{team.description || 'No description provided'}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
                    {isEditingTeam ? (
                      <select 
                        value={editedTeam.visibility}
                        onChange={(e) => setEditedTeam(prev => ({ ...prev, visibility: e.target.value as 'private' | 'public' }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="private">Private - Only invited members can join</option>
                        <option value="public">Public - Anyone can request to join</option>
                      </select>
                    ) : (
                      <p className="text-gray-900 capitalize">{team.visibility || 'private'}</p>
                    )}
                  </div>

                  {isEditingTeam && (
                    <div className="flex space-x-3">
                      <button 
                        onClick={updateTeamSettings}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                      <button 
                        onClick={() => {
                          setIsEditingTeam(false);
                          setEditedTeam({
                            name: team?.name || '',
                            description: team?.description || '',
                            visibility: team?.visibility || 'private'
                          });
                        }}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4">Danger Zone</h4>
                    <div className="space-y-4 p-4 bg-red-50 rounded-lg border border-red-200">
                      <button 
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
                            toast.info('Team deletion would be implemented here');
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Delete Team
                      </button>
                      <p className="text-sm text-red-700">
                        Once you delete a team, there is no going back. All data will be permanently lost.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FiSettings className="mx-auto text-4xl text-gray-400 mb-4" />
                  <p className="text-gray-500">Only team owners can modify these settings.</p>
                  <p className="text-sm text-gray-400 mt-1">Current owner: {teamMembers.find(m => m.role === 'owner')?.profiles?.full_name}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Management Action Confirmation Modal */}
        {managementAction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {managementAction.type === 'kick' && `Remove ${managementAction.memberName}`}
                  {managementAction.type === 'promote' && `Promote ${managementAction.memberName}`}
                  {managementAction.type === 'transfer_ownership' && `Transfer Ownership`}
                </h3>
                
                <p className="text-gray-600 mb-4">
                  {managementAction.type === 'kick' && `Are you sure you want to remove ${managementAction.memberName} from the team? They will lose access to all team content.`}
                  {managementAction.type === 'promote' && `Promote ${managementAction.memberName} to ${managementAction.data?.newRole}? They will gain additional permissions.`}
                  {managementAction.type === 'transfer_ownership' && `Transfer team ownership to ${managementAction.memberName}? You will become an admin. This action cannot be undone.`}
                </p>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setManagementAction(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (managementAction.type === 'kick') {
                        removeMember(managementAction.memberId, managementAction.memberName);
                      } else if (managementAction.type === 'promote') {
                        promoteMember(managementAction.memberId, managementAction.memberName, managementAction.data?.newRole);
                      } else if (managementAction.type === 'transfer_ownership') {
                        transferOwnership(managementAction.memberId, managementAction.memberName);
                      }
                    }}
                    className={`flex-1 px-4 py-2 text-white rounded-lg ${
                      managementAction.type === 'kick' ? 'bg-red-600 hover:bg-red-700' :
                      managementAction.type === 'transfer_ownership' ? 'bg-purple-600 hover:bg-purple-700' :
                      'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invite Member Modal */}
        {inviteModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite to Team</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={inviteModal.email}
                      onChange={(e) => setInviteModal(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="member@example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={inviteModal.role}
                      onChange={(e) => setInviteModal(prev => ({ ...prev, role: e.target.value as 'admin' | 'moderator' | 'member' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="member">Member</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {inviteModal.role === 'admin' && 'Admins can manage members and settings'}
                      {inviteModal.role === 'moderator' && 'Moderators can manage content and members'}
                      {inviteModal.role === 'member' && 'Members can participate in research and discussions'}
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={() => setInviteModal(prev => ({ ...prev, isOpen: false }))}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={inviteMember}
                    disabled={inviteModal.isLoading}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {inviteModal.isLoading ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}