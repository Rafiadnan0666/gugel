'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IResearchSession, ITab, IDraft, ITeam, IProfile, ISessionMessage, IAITrace } from '@/types/main.db';
import ActivityChart from '@/components/dashboard/ActivityChart';
import { 
  FiPlus, 
  FiMessageSquare, 
  FiBook, 
  FiBarChart2, 
  FiEdit2, 
  FiChevronRight, 
  FiZap, 
  FiX, 
  FiSend,
  FiSearch,
  FiUsers,
  FiTrendingUp,
  FiActivity,
  FiFolder,
  FiFileText,
  FiDownload,
  FiSettings,
  FiRefreshCw,
  FiTarget,
  FiAward,
  FiGlobe,
  FiClock,
  FiAlertCircle
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';

// LanguageModel types based on your example
interface LanguageModelOpts {
  expectedOutputs: Array<{ type: string; languages: string[] }>;
}

interface LanguageModelSession {
  prompt: (message: string) => Promise<string>;
  close?: () => void;
}

interface LanguageModelMonitor {
  addEventListener: (event: string, callback: (e: any) => void) => void;
}

interface LanguageModel {
  availability: (opts: LanguageModelOpts) => Promise<string>;
  create: (opts: {
    expectedOutputs: Array<{ type: string; languages: string[] }>;
    monitor?: (m: LanguageModelMonitor) => void;
  }) => Promise<LanguageModelSession>;
}

// Declare LanguageModel in global scope
declare global {
  interface Window {
    LanguageModel?: LanguageModel;
  }
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type: 'suggestion' | 'analysis' | 'general' | 'error';
  metadata?: {
    sessionId?: string;
    tabId?: string;
    draftId?: string;
    action?: string;
  };
}

interface DashboardStats {
  totalSessions: number;
  totalTabs: number;
  totalDrafts: number;
  teamsCount: number;
  lastActive: string;
  weeklyGrowth: number;
  completionRate: number;
  aiInteractions: number;
  researchEfficiency: number;
}

interface QuickAction {
  icon: any;
  label: string;
  description: string;
  action: () => void;
  color: string;
  disabled?: boolean;
}

interface AIContext {
  sessions: IResearchSession[];
  tabs: ITab[];
  drafts: IDraft[];
  teams: ITeam[];
  currentStats: DashboardStats;
  userProfile: IProfile | null;
}

export default function Dashboard() {
  const [sessions, setSessions] = useState<IResearchSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<IResearchSession[]>([]);
  const [drafts, setDrafts] = useState<IDraft[]>([]);
  const [tabs, setTabs] = useState<ITab[]>([]);
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [userProfile, setUserProfile] = useState<IProfile | null>(null);
  const [aiTraces, setAiTraces] = useState<IAITrace[]>([]);
  
  const [stats, setStats] = useState<DashboardStats>({ 
    totalSessions: 0, 
    totalTabs: 0, 
    totalDrafts: 0, 
    teamsCount: 0,
    lastActive: '', 
    weeklyGrowth: 0,
    completionRate: 0,
    aiInteractions: 0,
    researchEfficiency: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [activeView, setActiveView] = useState<'sessions' | 'drafts' | 'teams'>('sessions');
  const [activityData, setActivityData] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Enhanced AI State Management
  const [aiState, setAiState] = useState<{
    status: 'idle' | 'checking' | 'downloading' | 'ready' | 'error';
    progress: number;
    session: LanguageModelSession | null;
  }>({
    status: 'idle',
    progress: 0,
    session: null
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // LanguageModel Availability Check
  const checkAIAvailability = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !window.LanguageModel) {
      console.error('LanguageModel not available in window');
      return false;
    }

    try {
      setAiState(prev => ({ ...prev, status: 'checking' }));
      
      const opts: LanguageModelOpts = {
        expectedOutputs: [{ type: "text", languages: ["en"] }]
      };

      const availability = await window.LanguageModel.availability(opts);
      console.log("AI Availability:", availability);

      if (availability === "unavailable") {
        setAiState(prev => ({ ...prev, status: 'error' }));
        console.error("❌ LanguageModel unavailable");
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error checking AI availability:", error);
      setAiState(prev => ({ ...prev, status: 'error' }));
      return false;
    }
  }, []);

  // Initialize LanguageModel Session
  const initializeAISession = useCallback(async (): Promise<LanguageModelSession | null> => {
    if (typeof window === 'undefined' || !window.LanguageModel) {
      return null;
    }

    try {
      setAiState(prev => ({ ...prev, status: 'downloading', progress: 0 }));

      const session = await window.LanguageModel.create({
        expectedOutputs: [{ type: "text", languages: ["en"] }],
        monitor(m: LanguageModelMonitor) {
          m.addEventListener("downloadprogress", (e: any) => {
            const progress = (e.loaded * 100).toFixed(1);
            console.log(`📥 AI Model Download: ${progress}%`);
            setAiState(prev => ({ ...prev, progress: parseFloat(progress) }));
          });
          
          m.addEventListener("statechange", (e: any) => {
            console.log("⚡ AI State change:", e.target?.state);
          });
        }
      });

      console.log("✅ AI Session ready:", session);
      setAiState(prev => ({ ...prev, status: 'ready', session, progress: 100 }));
      return session;
    } catch (error) {
      console.error("Error initializing AI session:", error);
      setAiState(prev => ({ ...prev, status: 'error', progress: 0 }));
      return null;
    }
  }, []);

  // Enhanced AI Service using LanguageModel
  const chatWithAI = useCallback(async (prompt: string, context: AIContext): Promise<string> => {
    // Store AI trace for analytics
    const { data: { user } } = await supabase.auth.getUser();
    let traceId: string | null = null;

    if (user) {
      const { data: trace } = await supabase
        .from('ai_traces')
        .insert([{
          user_id: user.id,
          type: 'dashboard_chat',
          prompt,
          response: '',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (trace) traceId = trace.id;
    }

    try {
      // Check and initialize AI session if needed
      let session = aiState.session;
      if (!session) {
        const isAvailable = await checkAIAvailability();
        if (!isAvailable) {
          throw new Error('AI service unavailable');
        }
        session = await initializeAISession();
        if (!session) {
          throw new Error('Failed to initialize AI session');
        }
      }

      // Enhance prompt with context
      const enhancedPrompt = enhancePromptWithContext(prompt, context);
      
      // Use LanguageModel session to generate response
      const response = await session.prompt(enhancedPrompt);
      
      // Update AI trace with response
      if (traceId && user) {
        await supabase
          .from('ai_traces')
          .update({ response })
          .eq('id', traceId);
      }

      return response;
    } catch (error) {
      console.error('AI Service Error:', error);
      
      // Update trace with error
      if (traceId && user) {
        await supabase
          .from('ai_traces')
          .update({ response: 'AI service error: ' + (error as Error).message })
          .eq('id', traceId);
      }

      // Fallback responses based on context
      return generateFallbackResponse(prompt, context);
    }
  }, [aiState.session, checkAIAvailability, initializeAISession, supabase]);

  // Enhance prompt with research context
  const enhancePromptWithContext = (prompt: string, context: AIContext): string => {
    const { sessions, tabs, drafts, teams, currentStats, userProfile } = context;
    
    const contextSummary = `
Research Context:
- User: ${userProfile?.full_name || 'Researcher'}
- Sessions: ${sessions.length} total (${currentStats.completionRate}% completion rate)
- Tabs: ${tabs.length} collected websites
- Drafts: ${drafts.length} research documents
- Teams: ${teams.length} collaborative groups
- Recent Growth: ${currentStats.weeklyGrowth}% weekly
- Efficiency: ${currentStats.researchEfficiency}% overall

Recent Sessions: ${sessions.slice(0, 3).map(s => s.title).join(', ')}

User Question: ${prompt}

Please provide a helpful, specific response based on this research context. Focus on actionable advice and research insights.
`;

    return contextSummary;
  };

  // Fallback responses when AI is unavailable
  const generateFallbackResponse = (prompt: string, context: AIContext): string => {
    const lowerPrompt = prompt.toLowerCase();
    const { sessions, tabs, drafts, teams, currentStats } = context;

    if (lowerPrompt.includes('session') || lowerPrompt.includes('research')) {
      return `You have ${sessions.length} research sessions with a ${currentStats.completionRate}% completion rate. ${sessions.length > 0 ? `Your most recent session is "${sessions[0].title}".` : 'Start your first session to begin researching!'}`;
    }

    if (lowerPrompt.includes('tab') || lowerPrompt.includes('website')) {
      return `You've collected ${tabs.length} research tabs. ${tabs.length > 10 ? 'Consider organizing them into categories for better research management.' : 'Keep saving relevant sources as you research!'}`;
    }

    if (lowerPrompt.includes('draft') || lowerPrompt.includes('write')) {
      return `You have ${drafts.length} research drafts. ${drafts.length > 0 ? `Your latest draft contains ${drafts[0].content.length} characters.` : 'Start drafting to develop your research ideas!'}`;
    }

    if (lowerPrompt.includes('team') || lowerPrompt.includes('collaborat')) {
      return `You're part of ${teams.length} teams. ${teams.length > 0 ? 'Collaboration can enhance your research with diverse perspectives.' : 'Consider joining a team to collaborate with other researchers!'}`;
    }

    if (lowerPrompt.includes('progress') || lowerPrompt.includes('stat')) {
      return `Your research progress: ${currentStats.completionRate}% sessions completed, ${currentStats.weeklyGrowth}% weekly growth. Overall efficiency: ${currentStats.researchEfficiency}%.`;
    }

    return "I understand you're asking about your research. Currently, I can help you analyze your sessions, tabs, drafts, and progress. What specific aspect would you like to know more about?";
  };

  // Initialize AI on component mount
  useEffect(() => {
    const initializeAI = async () => {
      const isAvailable = await checkAIAvailability();
      if (isAvailable) {
        await initializeAISession();
      }
    };

    initializeAI();
  }, [checkAIAvailability, initializeAISession]);

  // Enhanced dashboard data loading
  const loadDashboardData = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/sign-in');
        return;
      }

      // Fetch user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setUserProfile(profile);

      // Fetch all data in parallel
      const [
        sessionsResponse,
        teamsResponse,
        tabsResponse,
        draftsResponse,
        aiTracesResponse
      ] = await Promise.all([
        supabase
          .from('research_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('team_members')
          .select('teams(*)')
          .eq('user_id', user.id),
        supabase
          .from('tabs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('drafts')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(10),
        supabase
          .from('ai_traces')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      const sessionsData = sessionsResponse.data || [];
      const teamsData = teamsResponse.data?.flatMap(t => t.teams).filter(Boolean) as ITeam[] || [];
      const tabsData = tabsResponse.data || [];
      const draftsData = draftsResponse.data || [];
      const aiTracesData = aiTracesResponse.data || [];

      setSessions(sessionsData);
      setFilteredSessions(sessionsData);
      setTeams(teamsData);
      setTabs(tabsData);
      setDrafts(draftsData);
      setAiTraces(aiTracesData);

      // Calculate stats
      const lastSession = sessionsData[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentSessions = sessionsData.filter(s => new Date(s.created_at) > weekAgo).length;
      const previousWeekSessions = sessionsData.filter(s => {
        const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        return new Date(s.created_at) > twoWeeksAgo && new Date(s.created_at) <= weekAgo;
      }).length;
      
      const weeklyGrowth = previousWeekSessions > 0 
        ? Math.round(((recentSessions - previousWeekSessions) / previousWeekSessions) * 100)
        : recentSessions > 0 ? 100 : 0;

      const sessionsWithDrafts = sessionsData.filter(session => 
        draftsData.some(draft => draft.research_session_id === session.id)
      ).length;
      const completionRate = sessionsData.length > 0 
        ? Math.round((sessionsWithDrafts / sessionsData.length) * 100)
        : 0;

      const recentAiInteractions = aiTracesData.filter(trace => 
        new Date(trace.created_at) > weekAgo
      ).length;

      const efficiency = Math.min(100, Math.round(
        (completionRate * 0.4) + 
        (Math.max(weeklyGrowth, 0) * 0.3) + 
        (Math.min(draftsData.length / Math.max(sessionsData.length, 1) * 20, 30))
      ));

      setStats({
        totalSessions: sessionsData.length,
        totalTabs: tabsData.length,
        totalDrafts: draftsData.length,
        teamsCount: teamsData.length,
        lastActive: lastSession?.created_at || '',
        weeklyGrowth,
        completionRate,
        aiInteractions: aiTracesData.length,
        researchEfficiency: efficiency
      });

      // Process activity data
      processActivityData(sessionsData, tabsData, draftsData);

      // Generate AI suggestions if AI is ready
      if (sessionsData.length > 0 && aiState.status === 'ready') {
        generateEnhancedAISuggestions(sessionsData, tabsData, draftsData, teamsData);
      }

      // Initialize welcome chat message
      if (chatMessages.length === 0) {
        setChatMessages([{
          id: '1',
          content: `Welcome back${profile?.full_name ? ' ' + profile.full_name : ''}! I'm your AI Research Assistant. ${aiState.status === 'ready' ? 'I\'m ready to help analyze your research.' : 'I\'m getting ready to assist you.'}`,
          sender: 'ai',
          timestamp: new Date(),
          type: 'general'
        }]);
      }

    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase, router, chatMessages.length, aiState.status]);

  // Enhanced AI suggestions generator
  const generateEnhancedAISuggestions = useCallback(async (
    sessionsData: IResearchSession[], 
    tabsData: ITab[], 
    draftsData: IDraft[], 
    teamsData: ITeam[]
  ) => {
    const context: AIContext = {
      sessions: sessionsData,
      tabs: tabsData,
      drafts: draftsData,
      teams: teamsData,
      currentStats: stats,
      userProfile
    };

    const prompt = `Based on the user's research context, generate 3 very specific, actionable suggestions to improve their research productivity. Focus on concrete next steps. Return only the 3 suggestions as a bullet list.`;
    
    try {
      const result = await chatWithAI(prompt, context);
      const suggestions = result.split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => line.replace(/^[-•*]\s*/, '').trim())
        .filter(line => line.length > 0 && line.length < 120)
        .slice(0, 3);
      
      setAiSuggestions(suggestions.length > 0 ? suggestions : [
        "Start a new research session to organize your current interests",
        "Review and categorize your collected tabs for better organization",
        "Create a draft to synthesize findings from your recent research"
      ]);
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      setAiSuggestions([
        "Begin a new research session to capture your current ideas",
        "Organize your collected tabs into thematic groups",
        "Start writing a draft to develop your research findings"
      ]);
    }
  }, [chatWithAI, stats, userProfile]);

  // Process activity data for the chart
  const processActivityData = (sessionsData: IResearchSession[], tabsData: ITab[], draftsData: IDraft[]) => {
    const activityByDate = new Map<string, { sessions: number, tabs: number, drafts: number }>();

    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      activityByDate.set(dateKey, { sessions: 0, tabs: 0, drafts: 0 });
    }

    sessionsData.forEach(session => {
      const date = new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (activityByDate.has(date)) {
        activityByDate.get(date)!.sessions++;
      }
    });

    tabsData.forEach(tab => {
      const date = new Date(tab.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (activityByDate.has(date)) {
        activityByDate.get(date)!.tabs++;
      }
    });

    draftsData.forEach(draft => {
      const date = new Date(draft.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (activityByDate.has(date)) {
        activityByDate.get(date)!.drafts++;
      }
    });

    const chartData = Array.from(activityByDate.entries()).map(([name, data]) => ({ name, ...data }));
    setActivityData(chartData);
  };

  // Filter sessions based on search
  const filterSessions = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredSessions(sessions);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = sessions.filter(session => 
      session.title.toLowerCase().includes(query)
    );
    setFilteredSessions(filtered);
  }, [searchQuery, sessions]);

  // Quick actions configuration
  const quickActions: QuickAction[] = [
    {
      icon: FiPlus,
      label: 'New Session',
      description: 'Start a new research session',
      action: () => createNewSession(),
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      icon: FiUsers,
      label: 'Join Team',
      description: 'Collaborate with others',
      action: () => router.push('/teams'),
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      icon: FiDownload,
      label: 'Export Data',
      description: 'Download your research',
      action: () => exportData(),
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      icon: FiSettings,
      label: 'AI Settings',
      description: 'Configure AI assistant',
      action: () => router.push('/settings'),
      color: 'bg-gray-500 hover:bg-gray-600'
    }
  ];

  // Create new research session
  const createNewSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: newSession, error } = await supabase
        .from('research_sessions')
        .insert([{ 
          user_id: user.id, 
          title: `Research Session ${new Date().toLocaleDateString()}`,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('New research session created');
      router.push(`/session/${newSession.id}`);
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Failed to create session');
    }
  };

  // Export data function
  const exportData = async () => {
    try {
      const exportData = {
        sessions,
        drafts,
        tabs,
        teams,
        aiTraces,
        stats,
        exportedAt: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Research data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  // Enhanced chat submission
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || aiState.status === 'downloading') return;

    const userMessage: ChatMessage = { 
      id: Date.now().toString(), 
      content: chatInput, 
      type:"analysis",
      sender: 'user', 
      timestamp: new Date() 
    };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');

    const context: AIContext = {
      sessions,
      tabs,
      drafts,
      teams,
      currentStats: stats,
      userProfile
    };

    try {
      const aiResponse = await chatWithAI(chatInput, context);
      const aiMessage: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        content: aiResponse, 
        sender: 'ai', 
        timestamp: new Date(),
        type: 'analysis'
      };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        content: "I'm having trouble connecting to the AI service right now. Please try again in a moment.", 
        sender: 'ai', 
        timestamp: new Date(),
        type: 'error'
      };
      setChatMessages(prev => [...prev, errorMessage]);
    }
  };

  // Format date helper
  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Format relative time
  const formatRelativeTime = (dateString: string | Date) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return formatDate(dateString);
  };

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Filter sessions when search query changes
  useEffect(() => {
    filterSessions();
  }, [filterSessions]);

  // Generate AI suggestions when data is loaded and AI is ready
  useEffect(() => {
    if (sessions.length > 0 && aiState.status === 'ready') {
      generateEnhancedAISuggestions(sessions, tabs, drafts, teams);
    }
  }, [sessions.length, aiState.status, generateEnhancedAISuggestions]);

  // Cleanup AI session on unmount
  useEffect(() => {
    return () => {
      if (aiState.session?.close) {
        aiState.session.close();
      }
    };
  }, [aiState.session]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your research dashboard...</p>
            {aiState.status === 'downloading' && (
              <p className="text-sm text-gray-500 mt-2">Downloading AI model... {aiState.progress}%</p>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center space-x-4 mb-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Research Dashboard
              </h1>
              <div className="flex items-center space-x-2 text-sm">
                <div className={`flex items-center ${
                  aiState.status === 'ready' ? 'text-green-600' : 
                  aiState.status === 'downloading' ? 'text-yellow-600' : 
                  aiState.status === 'error' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    aiState.status === 'ready' ? 'bg-green-500' : 
                    aiState.status === 'downloading' ? 'bg-yellow-500 animate-pulse' : 
                    aiState.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
                  }`}></div>
                  AI {aiState.status === 'ready' ? 'Ready' : 
                      aiState.status === 'downloading' ? `Downloading ${aiState.progress}%` : 
                      aiState.status === 'error' ? 'Offline' : 'Checking...'}
                </div>
              </div>
            </div>
            <p className="text-gray-600 text-lg">
              Welcome back{userProfile?.full_name ? `, ${userProfile.full_name}` : ''}! Your research overview is ready.
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => loadDashboardData()}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button 
              onClick={createNewSession}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiPlus className="w-4 h-4" />
              New Session
            </button>
            <button 
              onClick={() => setShowChat(true)}
              disabled={aiState.status === 'error'}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors disabled:opacity-50"
            >
              <FiMessageSquare className="w-4 h-4" />
              AI Assistant
            </button>
          </div>
        </div>

        {/* AI Status Banner */}
        {aiState.status === 'downloading' && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FiAlertCircle className="text-yellow-600 w-5 h-5" />
                <div>
                  <p className="text-yellow-800 font-medium">Downloading AI Model</p>
                  <p className="text-yellow-700 text-sm">This may take a few moments... {aiState.progress}% complete</p>
                </div>
              </div>
              <div className="w-32 bg-yellow-200 rounded-full h-2">
                <div 
                  className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${aiState.progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { 
              label: 'Research Sessions', 
              value: stats.totalSessions, 
              icon: FiBook, 
              change: stats.weeklyGrowth,
              description: `${stats.completionRate}% completed`,
              color: 'text-blue-600',
              bgColor: 'bg-blue-100'
            },
            { 
              label: 'Tabs Collected', 
              value: stats.totalTabs, 
              icon: FiBarChart2, 
              change: null,
              description: 'Web pages saved',
              color: 'text-green-600',
              bgColor: 'bg-green-100'
            },
            { 
              label: 'Drafts Created', 
              value: stats.totalDrafts, 
              icon: FiEdit2, 
              change: null,
              description: 'Research in progress',
              color: 'text-purple-600',
              bgColor: 'bg-purple-100'
            },
            { 
              label: 'AI Interactions', 
              value: stats.aiInteractions, 
              icon: FiZap, 
              change: null,
              description: 'Assistant usage',
              color: 'text-orange-600',
              bgColor: 'bg-orange-100'
            }
          ].map((stat) => (
            <div key={stat.label} className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                {stat.change !== null && (
                  <div className={`flex items-center text-sm ${stat.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <FiTrendingUp className="mr-1 w-4 h-4" />
                    {Math.abs(stat.change)}%
                  </div>
                )}
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm font-medium text-gray-600 mt-1">{stat.label}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Activity Chart */}
        <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <FiActivity className="text-blue-500 w-5 h-5" />
              Research Activity (14 Days)
            </h2>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                Sessions
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                Tabs
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                Drafts
              </span>
            </div>
          </div>
          <ActivityChart data={activityData} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={action.action}
              disabled={action.disabled}
              className={`${action.color} text-white p-4 rounded-2xl text-left hover:shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
            >
              <action.icon className="w-5 h-5 mb-2" />
              <div className="font-semibold text-sm">{action.label}</div>
              <div className="text-xs opacity-90 mt-1">{action.description}</div>
            </button>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sessions & Content Section */}
          <div className="lg:col-span-2 space-y-8">
            {/* Sessions/Drafts/Teams Toggle */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                  {(['sessions', 'drafts', 'teams'] as const).map(view => (
                    <button
                      key={view}
                      onClick={() => setActiveView(view)}
                      className={`px-4 py-2 rounded-md font-medium transition-colors text-sm ${
                        activeView === view
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {view.charAt(0).toUpperCase() + view.slice(1)}
                    </button>
                  ))}
                </div>
                {activeView === 'sessions' && (
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search sessions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64"
                    />
                  </div>
                )}
              </div>

              {/* Sessions View */}
              {activeView === 'sessions' && (
                <div className="space-y-3">
                  {filteredSessions.length === 0 ? (
                    <div className="text-center py-8">
                      <FiFolder className="mx-auto text-4xl text-gray-400 mb-4" />
                      <p className="text-gray-600 mb-2">No research sessions found</p>
                      <button
                        onClick={createNewSession}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Create Your First Session
                      </button>
                    </div>
                  ) : (
                    filteredSessions.map(session => (
                      <div
                        key={session.id}
                        onClick={() => router.push(`/session/${session.id}`)}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer flex justify-between items-center transition-all hover:shadow-md group"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                            {session.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Created {formatDate(session.created_at.toString())}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center">
                              <FiFileText className="mr-1 w-3 h-3" />
                              {tabs.filter(tab => tab.session_id === session.id).length} tabs
                            </span>
                            <span className="flex items-center">
                              <FiEdit2 className="mr-1 w-3 h-3" />
                              {drafts.filter(draft => draft.research_session_id === session.id).length} drafts
                            </span>
                          </div>
                        </div>
                        <FiChevronRight className="text-gray-400 text-xl group-hover:text-blue-600 transition-colors" />
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Drafts View */}
              {activeView === 'drafts' && (
                <div className="space-y-3">
                  {drafts.length === 0 ? (
                    <div className="text-center py-8">
                      <FiEdit2 className="mx-auto text-4xl text-gray-400 mb-4" />
                      <p className="text-gray-600">No drafts yet</p>
                    </div>
                  ) : (
                    drafts.map(draft => (
                      <div
                        key={draft.id}
                        onClick={() => router.push(`/session/${draft.research_session_id}`)}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-all hover:shadow-md"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900 line-clamp-2 text-sm">
                            {draft.content.substring(0, 120)}...
                          </h4>
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            v{draft.version}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          Updated {formatRelativeTime(draft.updated_at.toString())}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Teams View */}
              {activeView === 'teams' && (
                <div className="space-y-3">
                  {teams.length === 0 ? (
                    <div className="text-center py-8">
                      <FiUsers className="mx-auto text-4xl text-gray-400 mb-4" />
                      <p className="text-gray-600">Not part of any teams yet</p>
                      <button
                        onClick={() => router.push('/teams')}
                        className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        Explore Teams
                      </button>
                    </div>
                  ) : (
                    teams.map(team => (
                      <div
                        key={team.id}
                        onClick={() => router.push(`/team/${team.id}`)}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <h4 className="font-semibold text-gray-900">{team.name}</h4>
                          <p className="text-sm text-gray-600">{team.description}</p>
                        </div>
                        <FiChevronRight className="text-gray-400" />
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* AI Suggestions */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <FiZap className="text-yellow-500 w-5 h-5" />
                  AI Suggestions
                </h2>
                <button 
                  onClick={() => generateEnhancedAISuggestions(sessions, tabs, drafts, teams)}
                  disabled={aiState.status !== 'ready'}
                  className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>
              <div className="space-y-3">
                {aiSuggestions.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500 mx-auto mb-2"></div>
                    <p className="text-gray-600 text-sm">Analyzing your research patterns...</p>
                  </div>
                ) : (
                  aiSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 p-4 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <p className="text-sm text-gray-800 leading-relaxed">{suggestion}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Research Efficiency */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FiTarget className="text-purple-500 w-5 h-5" />
                Research Efficiency
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Overall Efficiency</span>
                    <span>{stats.researchEfficiency}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        stats.researchEfficiency >= 80 ? 'bg-green-500' :
                        stats.researchEfficiency >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${stats.researchEfficiency}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.completionRate}%</div>
                    <div className="text-xs text-gray-600">Completion</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${stats.weeklyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {stats.weeklyGrowth >= 0 ? '+' : ''}{stats.weeklyGrowth}%
                    </div>
                    <div className="text-xs text-gray-600">Growth</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent AI Interactions */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FiAward className="text-green-500 w-5 h-5" />
                AI Usage
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Total Interactions</span>
                  <span className="font-semibold">{stats.aiInteractions}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">This Week</span>
                  <span className="font-semibold">
                    {aiTraces.filter(trace => 
                      new Date(trace.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    ).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced AI Chat Assistant */}
      {showChat && (
        <div className="fixed bottom-4 right-4 w-96 bg-white rounded-2xl shadow-2xl border border-gray-300 z-50 flex flex-col max-h-[600px] animate-in slide-in-from-bottom-4">
          <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                aiState.status === 'ready' ? 'bg-green-400' : 
                aiState.status === 'downloading' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400'
              }`}></div>
              <h3 className="font-semibold">AI Research Assistant</h3>
            </div>
            <button 
              onClick={() => setShowChat(false)}
              className="p-1 rounded-full hover:bg-white/20 transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
            {chatMessages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-2xl max-w-[80%] ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : msg.type === 'error'
                    ? 'bg-red-100 text-red-800 rounded-bl-none border border-red-200'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {aiState.status === 'downloading' && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-none border border-gray-200 p-3 max-w-[80%]">
                  <div className="flex items-center space-x-2 text-sm">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                    <span>Downloading AI model... {aiState.progress}%</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleChatSubmit} className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask about your research, progress, or get suggestions..."
                disabled={aiState.status !== 'ready'}
                className="flex-1 border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
              />
              <button 
                type="submit" 
                disabled={!chatInput.trim() || aiState.status !== 'ready'}
                className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiSend className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {aiState.status === 'ready' 
                ? "Ask about sessions, drafts, progress, or get research suggestions"
                : "AI assistant is initializing..."}
            </p>
          </form>
        </div>
      )}
    </Layout>
  );
}