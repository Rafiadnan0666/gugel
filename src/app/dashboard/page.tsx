'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IResearchSession, ITab, IDraft, ITeam, IProfile } from '@/types/main.db';
import ActivityChart from '@/components/dashboard/ActivityChart';
import { 
  FiPlus, 
  FiMessageSquare, 
  FiBook, 
  FiBarChart2, 
  FiEdit2, 
  FiClock, 
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
  FiShare2,
  FiSettings,
  FiRefreshCw,
  FiBell,
  FiUser,
  FiGlobe,
  FiTarget,
  FiAward
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useAIService } from '@/hooks/useAIService';
import { useOfflineCache } from '@/hooks/useOfflineCache';



interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'suggestion' | 'analysis' | 'general';
}

interface DashboardStats {
  totalSessions: number;
  totalTabs: number;
  totalDrafts: number;
  teamsCount: number;
  lastActive: string;
  weeklyGrowth: number;
  completionRate: number;
}

interface QuickAction {
  icon: any;
  label: string;
  description: string;
  action: () => void;
  color: string;
}

export default function Dashboard() {
  const [sessions, setSessions] = useState<IResearchSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<IResearchSession[]>([]);
  const [drafts, setDrafts] = useState<IDraft[]>([]);
  const [tabs, setTabs] = useState<ITab[]>([]);
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [userProfile, setUserProfile] = useState<IProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({ 
    totalSessions: 0, 
    totalTabs: 0, 
    totalDrafts: 0, 
    teamsCount: 0,
    lastActive: '', 
    weeklyGrowth: 0,
    completionRate: 0
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

  const chatEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();
  const { aiStatus, chatWithAI } = useAIService();
  const { isOnline, lastUpdate, saveData, loadData } = useOfflineCache();

  // Load dashboard data
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
        recentDraftsResponse
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
          .eq('user_id', user.id),
        supabase
          .from('drafts')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('drafts')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(5)
      ]);

      const sessionsData = sessionsResponse.data || [];
      const teamsData = teamsResponse.data?.flatMap(t => t.teams).filter(Boolean) as ITeam[] || [];
      const tabsData = tabsResponse.data || [];
      const draftsData = draftsResponse.data || [];
      const recentDraftsData = recentDraftsResponse.data || [];

      setSessions(sessionsData);
      setFilteredSessions(sessionsData);
      setTeams(teamsData);
      setTabs(tabsData);
      setDrafts(recentDraftsData);

      // Calculate advanced stats
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

      setStats({
        totalSessions: sessionsData.length,
        totalTabs: tabsData.length,
        totalDrafts: draftsData.length,
        teamsCount: teamsData.length,
        lastActive: lastSession?.created_at || '',
        weeklyGrowth,
        completionRate
      });

      // Process activity data for chart
      processActivityData(sessionsData, tabsData, draftsData);

      // Generate AI suggestions if available
      if (sessionsData.length > 0) {
        generateAISuggestions(sessionsData, tabsData, draftsData);
      }

      // Initialize welcome chat message
      if (chatMessages.length === 0) {
        setChatMessages([{
          id: '1',
          content: `Hello${profile?.full_name ? ' ' + profile.full_name : ''}! I'm your research assistant. I can help you analyze your ${sessionsData.length} research sessions, ${tabsData.length} collected tabs, and ${draftsData.length} drafts. What would you like to know?`,
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
  }, [supabase, router, chatMessages.length]);

  // Process activity data for the chart
  const processActivityData = (sessionsData: IResearchSession[], tabsData: ITab[], draftsData: IDraft[]) => {
    const activityByDate = new Map<string, { sessions: number, tabs: number, drafts: number }>();

    // Process last 14 days
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      activityByDate.set(dateKey, { sessions: 0, tabs: 0, drafts: 0 });
    }

    // Count activities by date
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

  // Generate AI suggestions
  const generateAISuggestions = async (sessionsData: IResearchSession[], tabsData: ITab[], draftsData: IDraft[]) => {
    const prompt = `As a research assistant, provide 3 concise, actionable suggestions based on: ${sessionsData.length} research sessions, ${tabsData.length} collected tabs, and ${draftsData.length} drafts. Focus on productivity and research improvement.`;
    const result = await chatWithAI(prompt, { tabs: tabsData, drafts: draftsData });
    const suggestions = result.split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^\d+\.\s*|\*\*|[-•]\s*/g, '').trim())
      .filter(line => line.length > 0 && line.length < 150);
    setAiSuggestions(suggestions.slice(0, 3));
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
      label: 'Settings',
      description: 'Customize your workspace',
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

      toast.success('New session created');
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

      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  // Handle chat submission
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = { 
      id: Date.now().toString(), 
      content: chatInput, 
      sender: 'user', 
      timestamp: new Date() 
    };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');

    const aiResponse = await chatWithAI(chatInput, { tabs, drafts });
    const aiMessage: ChatMessage = { 
      id: (Date.now() + 1).toString(), 
      content: aiResponse, 
      sender: 'ai', 
      timestamp: new Date() 
    };
    setChatMessages(prev => [...prev, aiMessage]);
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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your research dashboard...</p>
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
                {isOnline ? (
                  <div className="flex items-center text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Online
                  </div>
                ) : (
                  <div className="flex items-center text-red-600">
                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                    Offline
                  </div>
                )}
                <span className="text-gray-500">
                  Updated {formatRelativeTime(lastUpdate.toISOString())}
                </span>
              </div>
            </div>
            <p className="text-gray-600 text-lg">
              Welcome back{userProfile?.full_name ? `, ${userProfile.full_name}` : ''}! Here&apos;s your research overview.
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => loadDashboardData()}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <FiRefreshCw className={`${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button 
              onClick={createNewSession}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <FiPlus />
              New Session
            </button>
            <button 
              onClick={() => setShowChat(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700"
            >
              <FiMessageSquare />
              AI Assistant
            </button>
          </div>
        </div>

        {/* Activity Chart */}
        <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <FiActivity className="text-blue-500" />
              Research Activity
            </h2>
            <div className="flex gap-2 text-sm">
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { 
              label: 'Research Sessions', 
              value: stats.totalSessions, 
              icon: FiBook, 
              change: stats.weeklyGrowth,
              description: 'Total research sessions'
            },
            { 
              label: 'Tabs Collected', 
              value: stats.totalTabs, 
              icon: FiBarChart2, 
              change: null,
              description: 'Web pages saved'
            },
            { 
              label: 'Drafts Created', 
              value: stats.totalDrafts, 
              icon: FiEdit2, 
              change: null,
              description: 'Research drafts'
            },
            { 
              label: 'Teams', 
              value: stats.teamsCount, 
              icon: FiUsers, 
              change: null,
              description: 'Collaborative teams'
            }
          ].map((stat, index) => (
            <div key={stat.label} className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${index === 0 ? 'bg-blue-100' : index === 1 ? 'bg-green-100' : index === 2 ? 'bg-purple-100' : 'bg-orange-100'}`}>
                  <stat.icon className={`w-6 h-6 ${index === 0 ? 'text-blue-600' : index === 1 ? 'text-green-600' : index === 2 ? 'text-purple-600' : 'text-orange-600'}`} />
                </div>
                {stat.change !== null && (
                  <div className={`flex items-center text-sm ${stat.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <FiTrendingUp className="mr-1" />
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

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action, index) => (
            <button
              key={action.label}
              onClick={action.action}
              className={`${action.color} text-white p-4 rounded-2xl text-left hover:shadow-lg transition-all transform hover:scale-105`}
            >
              <action.icon className="w-6 h-6 mb-2" />
              <div className="font-semibold">{action.label}</div>
              <div className="text-sm opacity-90 mt-1">{action.description}</div>
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
                <div className="flex space-x-4">
                  {(['sessions', 'drafts', 'teams'] as const).map(view => (
                    <button
                      key={view}
                      onClick={() => setActiveView(view)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        activeView === view
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {view.charAt(0).toUpperCase() + view.slice(1)}
                    </button>
                  ))}
                </div>
                {activeView === 'sessions' && (
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search sessions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              {/* Sessions View */}
              {activeView === 'sessions' && (
                <div className="space-y-4">
                  {filteredSessions.length === 0 ? (
                    <div className="text-center py-8">
                      <FiFolder className="mx-auto text-4xl text-gray-400 mb-4" />
                      <p className="text-gray-600">No research sessions found</p>
                      <button
                        onClick={createNewSession}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Create Your First Session
                      </button>
                    </div>
                  ) : (
                    filteredSessions.map(session => (
                      <div
                        key={session.id}
                        onClick={() => router.push(`/session/${session.id}`)}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer flex justify-between items-center transition-all hover:shadow-md"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-gray-900 mb-1">{session.title}</h3>
                          <p className="text-sm text-gray-600">
                            Created {formatDate(session.created_at.toString())}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span className="flex items-center">
                              <FiFileText className="mr-1" />
                              {tabs.filter(tab => tab.session_id === session.id).length} tabs
                            </span>
                            <span className="flex items-center">
                              <FiEdit2 className="mr-1" />
                              {drafts.filter(draft => draft.research_session_id === session.id).length} drafts
                            </span>
                          </div>
                        </div>
                        <FiChevronRight className="text-gray-400 text-xl" />
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Drafts View */}
              {activeView === 'drafts' && (
                <div className="space-y-4">
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
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900 line-clamp-2">
                            {draft.content.substring(0, 100)}...
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
                <div className="space-y-4">
                  {teams.length === 0 ? (
                    <div className="text-center py-8">
                      <FiUsers className="mx-auto text-4xl text-gray-400 mb-4" />
                      <p className="text-gray-600">Not part of any teams yet</p>
                      <button
                        onClick={() => router.push('/teams')}
                        className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
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
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FiZap className="text-yellow-500" />
                AI Suggestions
              </h2>
              <div className="space-y-3">
                {aiSuggestions.length === 0 ? (
                  <p className="text-gray-600 text-sm">Analyzing your research patterns...</p>
                ) : (
                  aiSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 p-4 rounded-lg"
                    >
                      <p className="text-sm text-gray-800">{suggestion}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FiActivity className="text-green-500" />
                Recent Activity
              </h2>
              <div className="space-y-3">
                {sessions.slice(0, 3).map(session => (
                  <div key={session.id} className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Session updated</p>
                      <p className="text-gray-600 text-xs">{session.title}</p>
                    </div>
                    <span className="text-gray-500 text-xs ml-auto">
                      {formatRelativeTime(session.created_at.toString())}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress Stats */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FiTarget className="text-purple-500" />
                Progress
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Session Completion</span>
                    <span>{stats.completionRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.completionRate}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Weekly Growth</span>
                    <span className={stats.weeklyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {stats.weeklyGrowth >= 0 ? '+' : ''}{stats.weeklyGrowth}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        stats.weeklyGrowth >= 0 ? 'bg-green-600' : 'bg-red-600'
                      }`}
                      style={{ width: `${Math.min(Math.abs(stats.weeklyGrowth), 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Chat Assistant */}
      {showChat && (
        <div className="fixed bottom-4 right-4 w-96 bg-white rounded-2xl shadow-2xl border border-gray-300 z-50 flex flex-col max-h-[600px]">
          <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <h3 className="font-semibold">AI Research Assistant</h3>
            </div>
            <button 
              onClick={() => setShowChat(false)}
              className="p-1 rounded-full hover:bg-white/20 transition-colors"
            >
              <FiX />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
            {chatMessages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-2xl max-w-[80%] ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}>
                  <p className="text-sm">{msg.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleChatSubmit} className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask about your research..."
                className="flex-1 border border-gray-300 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button 
                type="submit" 
                disabled={!chatInput.trim()}
                className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSend />
              </button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
}