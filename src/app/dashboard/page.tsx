'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IResearchSession, ITab, IDraft } from '@/types/main.db';
import { 
  FiPlus, FiUsers, FiUser, FiEdit2, FiTrash2, FiMail, FiBell, 
  FiMessageSquare, FiSearch, FiX, FiExternalLink, FiImage,
  FiBarChart2, FiClock, FiBook, FiStar, FiZap, FiCpu
} from 'react-icons/fi';

declare global {
  interface Window {
    ai?: {
      prompt: (prompt: string, options?: { signal?: AbortSignal }) => Promise<{ text: () => Promise<string> }>;
      // Add other AI methods that might be available
      summarize?: (text: string) => Promise<string>;
      rewrite?: (text: string, style?: string) => Promise<string>;
    };
  }
}

export default function Dashboard() {
  const [sessions, setSessions] = useState<IResearchSession[]>([]);
  const [drafts, setDrafts] = useState<IDraft[]>([]);
  const [tabs, setTabs] = useState<ITab[]>([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalTabs: 0,
    totalDrafts: 0,
    lastActive: ''
  });
  const [loading, setLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadDashboardData();
    // Check if AI is available
    setAiAvailable(typeof window.ai !== 'undefined');
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/sign-in');
        return;
      }

      // Load all data in parallel for better performance
      const [sessionsResult, tabsResult, draftsResult] = await Promise.all([
        supabase.from('research_sessions').select('*').order('created_at', { ascending: false }),
        supabase.from('tabs').select('*'),
        supabase.from('drafts').select('*').order('created_at', { ascending: false }).limit(3)
      ]);

      if (sessionsResult.data) setSessions(sessionsResult.data);
      if (tabsResult.data) setTabs(tabsResult.data);
      if (draftsResult.data) setDrafts(draftsResult.data);

      setStats({
        totalSessions: sessionsResult.data?.length || 0,
        totalTabs: tabsResult.data?.length || 0,
        totalDrafts: draftsResult.data?.length || 0,
        lastActive: sessionsResult.data?.[0]?.created_at || ''
      });

      // Generate AI suggestions if available and there's data
      if (aiAvailable && sessionsResult.data?.length && tabsResult.data?.length) {
        generateAISuggestions(sessionsResult.data, tabsResult.data);
      }

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAISuggestions = async (sessions: IResearchSession[], tabs: ITab[]) => {
    if (!sessions.length || !tabs.length) return;
    
    setIsGeneratingAI(true);
    try {
      const recentTabs = tabs.slice(0, 10); // Limit to recent tabs for context
      
      const prompt = `As a research assistant, analyze these research sessions and provide actionable insights:

Research Sessions (${sessions.length}):
${sessions.map(s => `- "${s.title}" (created: ${new Date(s.created_at).toLocaleDateString()})`).join('\n')}

Recent Tabs Content:
${recentTabs.map(t => `URL: ${t.url}\nContent: ${t.content?.substring(0, 200)}...`).join('\n\n')}

Please provide 3-5 concise, practical suggestions in bullet points format:
1. Research patterns and connections you notice
2. Potential next steps or directions
3. Organization and synthesis ideas
4. Content gaps or areas for deeper exploration

Focus on actionable insights that would help the researcher move forward.`;

      const response = await window.ai!.prompt(prompt, { signal: AbortSignal.timeout(30000) });
      const text = await response.text();
      
      // Parse the response into individual suggestions
      const suggestions = text.split('\n')
        .filter(line => line.trim().match(/^[•\-]\s+|^\d+\.\s+/))
        .map(line => line.replace(/^[•\-]\s+|^\d+\.\s+/, '').trim())
        .slice(0, 5);
      
      setAiSuggestions(suggestions);
    } catch (error) {
      console.warn('AI suggestion generation failed:', error);
      setAiSuggestions([
        "Analyze connections between your recent research topics",
        "Consider creating a synthesis document from your collected tabs",
        "Look for patterns in your research sessions over time"
      ]);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const createNewSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: newSession } = await supabase
      .from('research_sessions')
      .insert([{ 
        user_id: user.id, 
        title: `Research Session - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
      }])
      .select()
      .single();

    if (newSession) {
      router.push(`/session/${newSession.id}`);
    }
  };

  const importCurrentTabs = async () => {
    // This would typically use chrome.tabs API in an extension
    // For web app, you might need a different approach
    alert('Tab import functionality would require a browser extension');
  };

  const summarizeWithAI = async (content: string) => {
    if (!aiAvailable) {
      alert('AI features require Chrome with Gemini Nano enabled');
      return;
    }

    try {
      const response = await window.ai!.prompt(
        `Create a concise summary of this research content:\n\n${content.substring(0, 1500)}`,
        { signal: AbortSignal.timeout(15000) }
      );
      return await response.text();
    } catch (error) {
      console.error('AI summarization failed:', error);
      return 'Unable to generate summary at this time';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Research Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your research sessions and drafts</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={createNewSession}
              className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
            >
              <FiPlus className="w-5 h-5" />
              <span>New Session</span>
            </button>
            <button 
              onClick={importCurrentTabs}
              className="border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <FiExternalLink className="w-5 h-5" />
              <span>Import Tabs</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Sessions', value: stats.totalSessions, icon: FiBook, color: 'blue' },
            { label: 'Tabs Collected', value: stats.totalTabs, icon: FiBarChart2, color: 'green' },
            { label: 'Drafts', value: stats.totalDrafts, icon: FiEdit2, color: 'purple' },
            { label: 'Last Active', value: stats.lastActive ? formatDate(stats.lastActive) : 'Never', icon: FiClock, color: 'orange' }
          ].map((stat, index) => (
            <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <stat.icon className={`w-6 h-6 text-${stat.color}-500`} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Research Sessions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Research Sessions</h2>
                <FiSearch className="w-5 h-5 text-gray-400" />
              </div>

              <div className="space-y-3">
                {sessions.length === 0 ? (
                  <div className="text-center py-8">
                    <FiBook className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No research sessions yet</p>
                    <button
                      onClick={createNewSession}
                      className="text-black hover:underline mt-2"
                    >
                      Create your first session
                    </button>
                  </div>
                ) : (
                  sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                      onClick={() => router.push(`/session/${session.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{session.title}</h3>
                        <p className="text-sm text-gray-600">
                          Created {formatDate(session.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <FiEdit2 className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <FiTrash2 className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Drafts */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Drafts</h2>
              <div className="space-y-3">
                {drafts.length === 0 ? (
                  <p className="text-gray-600 text-center py-6">No drafts yet</p>
                ) : (
                  drafts.map((draft) => (
                    <div key={draft.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">
                          Version {draft.version}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(draft.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-900 line-clamp-2 text-sm">
                        {draft.content.substring(0, 150)}...
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* AI Suggestions Sidebar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <FiCpu className="w-5 h-5 text-blue-500" />
                <span>AI Research Assistant</span>
              </h2>
              <FiZap className="w-5 h-5 text-yellow-500" />
            </div>

            {!aiAvailable ? (
              <div className="text-center py-6">
                <FiCpu className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 mb-2 text-sm">AI features require Chrome with Gemini Nano</p>
                <p className="text-xs text-gray-500">
                  Enable Prompt API for Gemini Nano in chrome://flags
                </p>
              </div>
            ) : isGeneratingAI ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-3"></div>
                <p className="text-gray-600 text-sm">Analyzing your research...</p>
              </div>
            ) : aiSuggestions.length > 0 ? (
              <div className="space-y-2">
                <h3 className="font-medium text-gray-900 text-sm mb-2">Suggestions:</h3>
                {aiSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                  >
                    <p className="text-sm text-blue-900">{suggestion}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <FiStar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 text-sm">No AI suggestions yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  Create research sessions to get insights
                </p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h3 className="font-medium text-gray-900 text-sm mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-left p-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Export Research Data
                </button>
                <button className="w-full text-left p-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Generate Summary Report
                </button>
                <button className="w-full text-left p-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Analyze Research Patterns
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}