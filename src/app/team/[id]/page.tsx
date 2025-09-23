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
  FiZap, FiFilter, FiMoreVertical, FiAnchor
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';

interface TeamPageProps {
  params: { id: string };
}

interface RealTimeEvent {
  type: 'session_created' | 'session_updated' | 'member_joined' | 'member_left' | 'message_sent' | 'ai_response';
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
  type?: 'text' | 'suggestion' | 'analysis';
  metadata?: any;
}

interface AISuggestion {
  type: 'research_topic' | 'collaboration_idea' | 'resource_recommendation' | 'analysis_insight';
  title: string;
  content: string;
  confidence: number;
  action?: string;
}

interface InviteModalState {
  isOpen: boolean;
  email: string;
  role: 'admin' | 'member';
  isLoading: boolean;
}

interface AnalyticsData {
  sessionsCreated: number;
  messagesSent: number;
  activeMembers: number;
  productivityScore: number;
  weeklyActivity: { day: string; count: number }[];
  memberActivity: { name: string; sessions: number; messages: number }[];
}

interface TeamMessageWithProfile extends ITeamMessage {
  profiles: IProfile;
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
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [realTimeEvents, setRealTimeEvents] = useState<RealTimeEvent[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [aiInput, setAiInput] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [inviteModal, setInviteModal] = useState<InviteModalState>({
    isOpen: false,
    email: '',
    role: 'member',
    isLoading: false
  });
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const aiChatContainerRef = useRef<HTMLDivElement>(null);

  // Enhanced AI Functions
  const checkAIAvailability = async (): Promise<boolean> => {
    try {
      if (typeof window !== 'undefined') {
        if (typeof window.LanguageModel !== "undefined") {
          const opts = { expectedOutputs: [{ type: "text", languages: ["en"] }] };
          const availability = await window.LanguageModel.availability(opts);
          return availability === "available" || availability === "downloadable" || availability === "readily";
        } else if (typeof window.ai !== "undefined") {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.warn("AI not available:", error);
      return false;
    }
  };

  const createAISession = async () => {
    try {
      if (typeof window !== 'undefined') {
        if (typeof window.LanguageModel !== 'undefined') {
          const opts = {
            expectedOutputs: [{ type: "text", languages: ["en"] }],
            monitor(m: any) {
              m.addEventListener("downloadprogress", (e: any) => {
                console.log(`Download progress: ${(e.loaded * 100).toFixed(1)}%`);
              });
            }
          };
          return await window.LanguageModel.create(opts);
        } else if (typeof window.ai !== 'undefined') {
          return {
            prompt: async (text: string) => {
              return window.ai!.prompt(text, { signal: AbortSignal.timeout(30000) });
            }
          };
        }
      }
      throw new Error("No AI API available");
    } catch (error) {
      console.error('Error creating AI session:', error);
      throw error;
    }
  };

  // Real-time polling for analytics
  const startAnalyticsPolling = useCallback(() => {
    const interval = setInterval(async () => {
      if (activeTab === 'analytics' && teamId) {
        await fetchAnalyticsData();
      }
    }, 30000);

    return interval;
  }, [activeTab, teamId]);

  const fetchAnalyticsData = useCallback(async () => {
    if (!teamId) return;

    try {
      // Fetch recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [sessionsResponse, messagesResponse] = await Promise.all([
        supabase
          .from('research_sessions')
          .select('*')
          .eq('team_id', teamId)
          .gte('created_at', sevenDaysAgo.toISOString()),
        supabase
          .from('team_messages')
          .select('*')
          .eq('team_id', teamId)
          .gte('created_at', sevenDaysAgo.toISOString())
      ]);

      const recentSessions = sessionsResponse.data || [];
      const recentMessages = messagesResponse.data || [];

      // Calculate weekly activity
      const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        return { day: dayName, count: 0 };
      }).reverse();

      recentSessions.forEach(session => {
        const dayIndex = new Date(session.created_at).getDay();
        weeklyActivity[dayIndex].count += 1;
      });

      // Calculate member activity
      const memberActivity = teamMembers.map(member => ({
        name: member.profiles?.full_name || member.profiles?.email || 'Unknown',
        sessions: recentSessions.filter(s => s.user_id === member.user_id).length,
        messages: recentMessages.filter(m => m.user_id === member.user_id).length
      }));

      const analytics: AnalyticsData = {
        sessionsCreated: sessions.length,
        messagesSent: teamMessages.length,
        activeMembers: onlineUsers.size,
        productivityScore: calculateProductivityScore(memberActivity),
        weeklyActivity,
        memberActivity
      };

      setAnalyticsData(analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  }, [teamId, sessions.length, teamMessages.length, teamMembers, onlineUsers.size, supabase]);

  const calculateProductivityScore = (memberActivity: any[]): number => {
    if (memberActivity.length === 0) return 0;
    
    const totalSessions = memberActivity.reduce((sum, member) => sum + member.sessions, 0);
    const totalMessages = memberActivity.reduce((sum, member) => sum + member.messages, 0);
    
    const avgSessions = totalSessions / memberActivity.length;
    const avgMessages = totalMessages / memberActivity.length;
    
    // Simple scoring algorithm (0-100)
    const sessionScore = Math.min((avgSessions / 5) * 50, 50);
    const messageScore = Math.min((avgMessages / 10) * 50, 50);
    
    return Math.round(sessionScore + messageScore);
  };

  // Enhanced real-time chat functions
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      aiChatContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Enhanced AI suggestion generation
  const generateAISuggestions = useCallback(async (teamSessions: IResearchSession[], teamMembersData: any[]) => {
    try {
      const isAIAvailable = await checkAIAvailability();
      if (!isAIAvailable) {
        // Fallback mock suggestions
        setAiSuggestions([
          {
            type: 'research_topic',
            title: 'User Behavior Analysis',
            content: 'Analyze how users interact with your product to identify pain points and opportunities.',
            confidence: 0.85,
            action: 'Create Session'
          },
          {
            type: 'collaboration_idea',
            title: 'Cross-functional Workshop',
            content: 'Organize a workshop with design and engineering teams to align on research findings.',
            confidence: 0.78,
            action: 'Schedule Meeting'
          }
        ]);
        return;
      }

      const sessionTitles = teamSessions.map(s => s.title).join(', ');
      const memberNames = teamMembersData.map(m => m.profiles?.full_name).filter(Boolean).join(', ');

      const prompt = `
        Analyze this research team and provide collaborative suggestions:

        Team Context:
        - ${teamMembersData.length} members: ${memberNames}
        - ${teamSessions.length} research sessions: ${sessionTitles}
        - Team focus: ${team?.description || 'General research'}

        Provide 3-5 suggestions in this format:
        TYPE|TITLE|CONTENT|CONFIDENCE|ACTION

        Types: research_topic, collaboration_idea, resource_recommendation, analysis_insight
      `;

      const session = await createAISession();
      let result;
      if (typeof window.LanguageModel !== 'undefined') {
        result = await session.prompt(prompt);
      } else {
        const response = await session.prompt(prompt);
        result = await response.text();
      }

      parseAISuggestions(result);
    } catch (error) {
      console.warn('AI suggestion generation failed:', error);
      // Fallback to mock data
      setAiSuggestions([
        {
          type: 'resource_recommendation',
          title: 'Research Repository Setup',
          content: 'Set up a centralized repository for all research findings and insights.',
          confidence: 0.92,
          action: 'View Resources'
        }
      ]);
    }
  }, [team?.description]);

  const parseAISuggestions = (result: string) => {
    try {
      const suggestions: AISuggestion[] = [];
      const lines = result.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const parts = line.split('|');
        if (parts.length >= 4) {
          const type = parts[0].trim();
          const title = parts[1].trim();
          const content = parts[2].trim();
          const confidence = parseFloat(parts[3].trim());
          const action = parts[4]?.trim();

          if (['research_topic', 'collaboration_idea', 'resource_recommendation', 'analysis_insight'].includes(type) && !isNaN(confidence)) {
            suggestions.push({
              type: type as AISuggestion['type'],
              title,
              content,
              confidence,
              action
            });
          }
        }
      }
      
      setAiSuggestions(suggestions.slice(0, 5));
    } catch (error) {
      console.error('Error parsing AI suggestions:', error);
    }
  };

  // Initialize team data with enhanced real-time features
  const initializeTeamData = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!user || userError) {
        router.push('/login');
        return;
      }

      const [profileResponse, teamResponse] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single(),
        supabase
          .from('teams')
          .select('*')
          .eq('id', teamId)
          .single()
      ]);
      
      setUserProfile(profileResponse.data);
      setTeam(teamResponse.data);

      if (!teamResponse.data) {
        setIsLoading(false);
        return;
      }

      const { data: memberData } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single();
      
      if (memberData) {
        setIsMember(true);
        setUserRole(memberData.role);
        
        // Load all team data in parallel
        const [membersResponse, sessionsResponse, messagesResponse] = await Promise.all([
          supabase
            .from('team_members')
            .select(`
              *,
              profiles (*)
            `)
            .eq('team_id', teamId)
            .order('created_at', { ascending: true }),
          
          supabase
            .from('research_sessions')
            .select('*')
            .eq('team_id', teamId)
            .order('created_at', { ascending: false }),
          
          supabase
            .from('team_messages')
            .select(`
              *,
              profiles (*)
            `)
            .eq('team_id', teamId)
            .order('created_at', { ascending: true })
        ]);

        setTeamMembers(membersResponse.data || []);
        setSessions(sessionsResponse.data || []);
        setTeamMessages(messagesResponse.data || []);

        // Generate initial AI suggestions
        generateAISuggestions(sessionsResponse.data || [], membersResponse.data || []);
        
      } else {
        setIsMember(false);
      }
    } catch (error) {
      console.error('Error initializing team data:', error);
      toast.error('Failed to load team data');
    } finally {
      setIsLoading(false);
    }
  }, [teamId, router, supabase, generateAISuggestions]);

  // Enhanced real-time subscriptions with presence tracking
  useEffect(() => {
    if (!teamId || !isMember || !userProfile) return;

    let presenceChannel: any = null;
    const channels: any[] = [];

    // Presence channel for online users
    try {
      presenceChannel = supabase.channel(`team-presence:${teamId}`, {
        config: {
          presence: {
            key: userProfile.id,
          },
        },
      });

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const onlineUserIds = new Set(Object.keys(state));
          setOnlineUsers(onlineUserIds);
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              user_id: userProfile.id,
              online_at: new Date().toISOString(),
              profile: userProfile
            });
          }
        });
    } catch (error) {
      console.error('Error setting up presence channel:', error);
    }

    // Team members channel
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
            .select(`
              *,
              profiles (*)
            `)
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

    // Messages channel
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
            .select(`
              *,
              profiles (*)
            `)
            .eq('id', payload.new.id)
            .single() as { data: TeamMessageWithProfile | null };

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
      toast.success('Back online');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Connection lost - working offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (presenceChannel) {
        presenceChannel.unsubscribe();
      }
      channels.forEach(channel => {
        supabase.removeChannel(channel);
      });
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [teamId, isMember, supabase, activeTab, userProfile]);

  // Enhanced chat functions
  const sendMessage = async () => {
    if (!newMessage.trim() || !userProfile) return;

    const { error } = await supabase
      .from('team_messages')
      .insert({
        team_id: teamId as string,
        user_id: userProfile.id,
        content: newMessage.trim(),
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } else {
      setNewMessage('');
    }
  };

  // Enhanced AI chat function
  const sendAIMessage = async () => {
    if (!aiInput.trim() || !userProfile || isAiThinking) return;

    const userMessage: AIChatMessage = {
      id: Date.now().toString(),
      content: aiInput.trim(),
      role: 'user',
      timestamp: new Date(),
      user_id: userProfile.id,
      profile: userProfile
    };

    setAiMessages(prev => [...prev, userMessage]);
    setAiInput('');
    setIsAiThinking(true);

    try {
      const isAIAvailable = await checkAIAvailability();
      if (!isAIAvailable) {
        const errorMessage: AIChatMessage = {
          id: (Date.now() + 1).toString(),
          content: "AI features are currently unavailable. Please try again later.",
          role: 'assistant',
          timestamp: new Date(),
          type: 'text'
        };
        setAiMessages(prev => [...prev, errorMessage]);
        return;
      }

      const context = `
        Team: ${team?.name}
        Members: ${teamMembers.length}
        Sessions: ${sessions.length}
        User Role: ${userRole}
        
        Previous context: ${aiMessages.slice(-3).map(m => m.content).join('\n')}
        
        Current question: ${aiInput}
        
        Provide helpful, collaborative advice for research teams.
      `;

      const session = await createAISession();
      let response;
      if (typeof window.LanguageModel !== 'undefined') {
        response = await session.prompt(context);
      } else {
        const aiResponse = await session.prompt(context);
        response = await aiResponse.text();
      }

      const aiMessage: AIChatMessage = {
        id: (Date.now() + 2).toString(),
        content: response,
        role: 'assistant',
        timestamp: new Date(),
        type: 'analysis',
        metadata: {
          suggestions: extractSuggestions(response),
          confidence: 0.85
        }
      };

      setAiMessages(prev => [...prev, aiMessage]);
      setRealTimeEvents(prev => [{
        type: 'ai_response',
        data: aiMessage,
        timestamp: new Date(),
        user: userProfile
      }, ...prev.slice(0, 49)]);

    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage: AIChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "I apologize, but I&apos;m having trouble processing your request right now. Please try again.",
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
    const suggestions = content.match(/(?:\d+\.\s|[-•]\s)(.+?)(?=\n|$)/g);
    return suggestions ? suggestions.map(s => s.replace(/^(\d+\.\s|[-•]\s)/, '').trim()) : [];
  };

  const handleKeyPress = (e: React.KeyboardEvent, type: 'chat' | 'ai') => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (type === 'chat') sendMessage();
      else sendAIMessage();
    }
  };

  // Enhanced member management with modal
  const openInviteModal = () => {
    setInviteModal({
      isOpen: true,
      email: '',
      role: 'member',
      isLoading: false
    });
  };

  const closeInviteModal = () => {
    setInviteModal({
      isOpen: false,
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

      toast.success(`Invited ${userData.full_name || userData.email} to the team`);
      closeInviteModal();
    } catch (error) {
      console.error('Error inviting member:', error);
      toast.error('Failed to invite member');
    } finally {
      setInviteModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const removeMember = async (memberId: string, memberName: string) => {
    if (!userRole || (userRole !== 'owner' && userRole !== 'admin')) {
      toast.error('Insufficient permissions');
      return;
    }

    if (!confirm(`Are you sure you want to remove ${memberName} from the team?`)) {
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

  // Enhanced session creation
  const createNewSession = async (suggestion?: AISuggestion) => {
    if (!userProfile) return;

    try {
      const title = suggestion?.title || `New Session ${new Date().toLocaleDateString()}`;
      const description = suggestion?.content || 'Collaborative research session';

      const { data: session, error } = await supabase
        .from('research_sessions')
        .insert({
          team_id: teamId as string,
          user_id: userProfile.id,
          title,
          description,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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

  // Initialize data and analytics polling
  useEffect(() => {
    initializeTeamData();
  }, [initializeTeamData]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalyticsData();
      const interval = startAnalyticsPolling();
      return () => {
        clearInterval(interval);
      };
    }
  }, [activeTab, startAnalyticsPolling, fetchAnalyticsData]);

  // Scroll to bottom when messages change
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
          <p className="text-gray-600 mt-2">The team you&apos;re looking for doesn&apos;t exist.</p>
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
      <div className="flex flex-col h-full bg-gray-50">
        {/* Connection Status */}
        {!isOnline && (
          <div className="bg-yellow-100 border-b border-yellow-400 p-2 text-center text-sm text-yellow-800">
            <FiRefreshCw className="inline mr-2 animate-spin" />
            Working offline - reconnecting...
          </div>
        )}

        {/* Enhanced Team Header */}
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
                  <span className="flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    <FiActivity className="mr-1" /> {onlineUsers.size} online
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
                onClick={() => generateAISuggestions(sessions, teamMembers)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center"
              >
                AI Insights
              </button>
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
          
          {/* Enhanced Navigation Tabs */}
          <div className="mt-6 flex space-x-8 border-b border-gray-200 overflow-x-auto">
            {(['overview', 'sessions', 'members', 'chat', 'ai', 'analytics', 'settings'] as const).map(tab => (
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
                {tab === 'ai' ? (
                  <>
                    <FiAnchor className="mr-2" /> AI Assistant
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
            <div className="space-y-6">
              {/* AI Suggestions Grid */}
              {aiSuggestions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {aiSuggestions.map((suggestion, index) => (
                    <div key={index} className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-100 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          suggestion.type === 'research_topic' ? 'bg-blue-100 text-blue-800' :
                          suggestion.type === 'collaboration_idea' ? 'bg-green-100 text-green-800' :
                          suggestion.type === 'resource_recommendation' ? 'bg-purple-100 text-purple-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {suggestion.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-500">{Math.round(suggestion.confidence * 100)}%</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-2">{suggestion.title}</h4>
                      <p className="text-sm text-gray-700 mb-4">{suggestion.content}</p>
                      <button 
                        onClick={() => {
                          if (suggestion.type === 'research_topic') {
                            createNewSession(suggestion);
                          } else {
                            toast.success('Exploring: ' + suggestion.title);
                          }
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <FiTarget className="mr-1" /> {suggestion.action || 'Explore'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Research Sessions</h3>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">{sessions.length}</p>
                      <p className="text-xs text-gray-500 mt-1">+{sessions.filter(s => new Date(s.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length} this week</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <FiFileText className="text-blue-600 text-xl" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Team Members</h3>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">{teamMembers.length}</p>
                      <p className="text-xs text-gray-500 mt-1">Active now: {onlineUsers.size}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <FiUsers className="text-green-600 text-xl" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Messages</h3>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">{teamMessages.length}</p>
                      <p className="text-xs text-gray-500 mt-1">+{teamMessages.filter(m => new Date(m.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length} today</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <FiMessageSquare className="text-purple-600 text-xl" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Productivity</h3>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">
                        {analyticsData ? `${analyticsData.productivityScore}%` : 'Loading...'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Based on team activity</p>
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
                          event.type === 'message_sent' ? 'bg-purple-500' : 
                          event.type === 'ai_response' ? 'bg-orange-500' : 'bg-gray-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 truncate">
                            {event.type === 'session_created' && 'New session created'}
                            {event.type === 'member_joined' && `${event.user?.full_name || event.user?.email} joined the team`}
                            {event.type === 'message_sent' && `${event.user?.full_name || event.user?.email} sent a message`}
                            {event.type === 'ai_response' && 'AI provided insights'}
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
                      onClick={() => createNewSession()}
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
                          Open <FiExternalLink className="ml-1" />
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
                    onClick={() => createNewSession()}
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
                        <button 
                          onClick={() => removeMember(session.user_id, session.title)}
                          className="p-2 text-gray-400 hover:text-red-500 rounded-md"
                        >
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
                      onClick={() => createNewSession()}
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
                    onClick={openInviteModal}
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
                          {onlineUsers.has(member.user_id) && (
                            <span className="ml-2 w-2 h-2 bg-green-500 rounded-full inline-block" title="Online"></span>
                          )}
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
                          onClick={() => removeMember(member.id, member.profiles?.full_name || 'this member')}
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
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Team Chat</h3>
                    <p className="text-sm text-gray-500">
                      {teamMessages.length} messages • {onlineUsers.size} members online
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {Array.from(onlineUsers).slice(0, 3).map(userId => {
                      const member = teamMembers.find(m => m.user_id === userId);
                      return member ? (
                        <div key={userId} className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-800" title={member.profiles?.full_name}>
                          {member.profiles?.full_name?.charAt(0) || 'U'}
                        </div>
                      ) : null;
                    })}
                    {onlineUsers.size > 3 && (
                      <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs text-gray-600">
                        +{onlineUsers.size - 3}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {teamMessages.map((message) => (
                  <div key={message.id} className="flex space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex-shrink-0 flex items-center justify-center">
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
                        {onlineUsers.has(message.user_id) && (
                          <span className="w-2 h-2 bg-green-500 rounded-full" title="Online"></span>
                        )}
                      </div>
                      <p className="text-gray-800 bg-gray-50 rounded-lg p-3">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <div className="flex-1 border border-gray-300 rounded-lg overflow-hidden">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, 'chat')}
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

          {activeTab === 'ai' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[600px] flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FiAnchor className="text-blue-600 text-xl" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">AI Research Assistant</h3>
                    <p className="text-sm text-gray-600">Get intelligent suggestions for your team&apos;s research</p>
                  </div>
                </div>
              </div>

              <div ref={aiChatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {aiMessages.length === 0 && (
                  <div className="text-center py-12">
                    <FiZap className="mx-auto text-4xl text-gray-300 mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Start a conversation with AI</h4>
                    <p className="text-gray-600">Ask about research strategies, collaboration ideas, or team analytics</p>
                  </div>
                )}

                {aiMessages.map((message) => (
                  <div key={message.id} className={`flex space-x-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex-shrink-0 flex items-center justify-center">
                        <FiAnchor className="text-white text-sm" />
                      </div>
                    )}
                    <div className={`max-w-md ${message.role === 'user' ? 'order-1' : 'order-2'}`}>
                      {message.role === 'user' && (
                        <div className="flex items-center space-x-2 mb-1 justify-end">
                          <span className="text-xs text-gray-500">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                          <span className="font-medium text-sm text-gray-900">
                            {message.profile?.full_name || 'You'}
                          </span>
                        </div>
                      )}
                      <div className={`rounded-lg p-3 ${
                        message.role === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        {message.metadata?.suggestions && message.metadata.suggestions.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.metadata.suggestions.map((suggestion: string, idx: number) => (
                              <div key={idx} className="text-xs bg-white bg-opacity-20 rounded px-2 py-1">
                                💡 {suggestion}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {message.role === 'assistant' && (
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center order-3">
                        <FiUser className="text-gray-600 text-sm" />
                      </div>
                    )}
                  </div>
                ))}
                {isAiThinking && (
                  <div className="flex space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex-shrink-0 flex items-center justify-center">
                      <FiAnchor className="text-white text-sm" />
                    </div>
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <div className="flex-1 border border-gray-300 rounded-lg overflow-hidden">
                    <textarea
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, 'ai')}
                      placeholder="Ask the AI assistant about research, collaboration, or team strategy..."
                      className="w-full px-3 py-2 border-0 focus:ring-0 focus:outline-none resize-none"
                      rows={2}
                      disabled={isAiThinking}
                    />
                  </div>
                  <button
                    onClick={sendAIMessage}
                    disabled={!aiInput.trim() || isAiThinking}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center"
                  >
                    <FiSend className="mr-2" /> Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {analyticsData ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Sessions Created</h3>
                          <p className="text-2xl font-semibold text-gray-900 mt-1">{analyticsData.sessionsCreated}</p>
                          <p className="text-xs text-gray-500 mt-1">Total research sessions</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <FiFileText className="text-blue-600 text-xl" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Messages Sent</h3>
                          <p className="text-2xl font-semibold text-gray-900 mt-1">{analyticsData.messagesSent}</p>
                          <p className="text-xs text-gray-500 mt-1">Team communication</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                          <FiMessageSquare className="text-green-600 text-xl" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Active Members</h3>
                          <p className="text-2xl font-semibold text-gray-900 mt-1">{analyticsData.activeMembers}</p>
                          <p className="text-xs text-gray-500 mt-1">Currently online</p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                          <FiUsers className="text-purple-600 text-xl" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-500">Productivity Score</h3>
                          <p className="text-2xl font-semibold text-gray-900 mt-1">{analyticsData.productivityScore}%</p>
                          <p className="text-xs text-gray-500 mt-1">Team performance</p>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-lg">
                          <FiTrendingUp className="text-orange-600 text-xl" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Activity</h3>
                      <div className="space-y-3">
                        {analyticsData.weeklyActivity.map((day, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">{day.day}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full" 
                                  style={{ width: `${(day.count / Math.max(...analyticsData.weeklyActivity.map(d => d.count)) * 100) || 0}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium w-8 text-right">{day.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Member Activity</h3>
                      <div className="space-y-4">
                        {analyticsData.memberActivity.map((member, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium">
                                  {member.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-sm font-medium">{member.name}</span>
                            </div>
                            <div className="flex space-x-4">
                              <span className="text-sm text-gray-600">{member.sessions} sessions</span>
                              <span className="text-sm text-gray-600">{member.messages} messages</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              )}
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
                      placeholder="Describe your team&apos;s purpose..."
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

        {/* Invite Member Modal */}
        {inviteModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Invite Team Member</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={inviteModal.email}
                      onChange={(e) => setInviteModal(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter email address"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      value={inviteModal.role}
                      onChange={(e) => setInviteModal(prev => ({ ...prev, role: e.target.value as 'admin' | 'member' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={closeInviteModal}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={inviteMember}
                    disabled={inviteModal.isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {inviteModal.isLoading ? 'Inviting...' : 'Invite Member'}
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