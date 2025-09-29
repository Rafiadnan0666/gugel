'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IResearchSession, ITab, IDraft } from '@/types/main.db';
import ActivityChart from '@/components/dashboard/ActivityChart';

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

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export default function Dashboard() {
  const [sessions, setSessions] = useState<IResearchSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<IResearchSession[]>([]);
  const [drafts, setDrafts] = useState<IDraft[]>([]);
  const [stats, setStats] = useState({ totalSessions: 0, totalTabs: 0, totalDrafts: 0, lastActive: '' });
  const [loading, setLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();
  const { aiStatus, promptAI } = useAIService();

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    filterSessions();
  }, [searchQuery, sessions]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/sign-in');
        return;
      }

      const { data: sessionsData, error: sessionsError } = await supabase
        .from('research_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      const sessionIds = sessionsData ? sessionsData.map(s => s.id) : [];

      const [tabsResult, draftsResult, recentDraftsResult] = await Promise.all([
        sessionIds.length > 0 ? supabase.from('tabs').select('*').in('session_id', sessionIds) : Promise.resolve({ data: [] }),
        sessionIds.length > 0 ? supabase.from('drafts').select('*').in('research_session_id', sessionIds) : Promise.resolve({ data: [] }),
        sessionIds.length > 0 ? supabase.from('drafts').select('*').in('research_session_id', sessionIds).order('created_at', { ascending: false }).limit(3) : Promise.resolve({ data: [] })
      ]);

      setSessions(sessionsData || []);
      setFilteredSessions(sessionsData || []);
      setDrafts(recentDraftsResult.data || []);

      setStats({
        totalSessions: sessionsData?.length || 0,
        totalTabs: tabsResult.data?.length || 0,
        totalDrafts: draftsResult.data?.length || 0,
        lastActive: sessionsData?.[0]?.created_at || ''
      });

      const processActivityData = () => {
        const activityByDate = new Map<string, { sessions: number, tabs: number, drafts: number }>();

        sessionsData?.forEach(session => {
          const date = new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (!activityByDate.has(date)) {
            activityByDate.set(date, { sessions: 0, tabs: 0, drafts: 0 });
          }
          activityByDate.get(date)!.sessions++;
        });

        tabsResult.data?.forEach(tab => {
          const date = new Date(tab.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (activityByDate.has(date)) {
            activityByDate.get(date)!.tabs++;
          }
        });

        draftsResult.data?.forEach(draft => {
          const date = new Date(draft.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (activityByDate.has(date)) {
            activityByDate.get(date)!.drafts++;
          }
        });

        const chartData = Array.from(activityByDate.entries()).map(([name, data]) => ({ name, ...data }));
        setActivityData(chartData);
      };

      processActivityData();

      if (aiStatus === 'ready' && sessionsData?.length) {
        generateAISuggestions(sessionsData);
      }

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSessions = () => {
    if (!searchQuery.trim()) {
      setFilteredSessions(sessions);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = sessions.filter(session => session.title.toLowerCase().includes(query));
    setFilteredSessions(filtered);
  };

  const generateAISuggestions = async (sessions: IResearchSession[]) => {
    const prompt = `You are a world-class research assistant. Based on the following research sessions, provide 3 actionable insights or suggestions for the user. The suggestions should be specific, concise, and helpful.\n\nResearch Sessions:\n${sessions.map(s => `- "${s.title}"`).join('\n')}`;
    const result = await promptAI(prompt);
    const suggestions = result.split('\n').filter(line => line.trim().length > 0 && (line.trim().startsWith('*') || line.trim().startsWith('-') || line.trim().match(/^\d+\./))).map(line => line.trim().substring(line.indexOf(' ') + 1));
    setAiSuggestions(suggestions.slice(0, 3));
  };

  const createNewSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: newSession } = await supabase.from('research_sessions').insert([{ user_id: user.id, title: `New Research ${new Date().toLocaleDateString()}` }]).select().single();
    if (newSession) router.push(`/session/${newSession.id}`);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = { id: Date.now().toString(), content: chatInput, sender: 'user', timestamp: new Date() };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');

    const aiResponse = await promptAI(chatInput);
    const aiMessage: ChatMessage = { id: (Date.now() + 1).toString(), content: aiResponse, sender: 'ai', timestamp: new Date() };
    setChatMessages(prev => [...prev, aiMessage]);
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) {
    return <Layout><div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div></Layout>;
  }

  const [activityData, setActivityData] = useState<any[]>([]);

  useEffect(() => {
    const processActivityData = () => {
      const data = sessions.map(session => ({
        name: new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sessions: 1,
        tabs: 0,
        drafts: 0,
      }));
      setActivityData(data);
    };
    processActivityData();
  }, [sessions]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, here's a summary of your research.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={createNewSession} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 flex items-center gap-2" title="Create a new research session"><FiPlus /> New Session</button>
            <button onClick={() => setShowChat(true)} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/90 flex items-center gap-2" title="Open the AI assistant"><FiMessageSquare /> AI Assistant</button>
          </div>
        </div>

        <div className="mb-8">
          <ActivityChart data={activityData} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[{ label: 'Total Sessions', value: stats.totalSessions, icon: FiBook }, { label: 'Tabs Collected', value: stats.totalTabs, icon: FiBarChart2 }, { label: 'Total Drafts', value: stats.totalDrafts, icon: FiEdit2 }, { label: 'Last Active', value: stats.lastActive ? formatDate(stats.lastActive) : 'N/A', icon: FiClock }].map(stat => (
            <div key={stat.label} className="bg-card p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-border/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className="w-8 h-8 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-card p-6 rounded-2xl shadow-lg border border-border/10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Research Sessions</h2>
              <input type="text" placeholder="Search sessions..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="border bg-background px-3 py-2 rounded-lg text-sm w-64" />
            </div>
            <div className="space-y-4">
              {filteredSessions.map(session => (
                <div key={session.id} onClick={() => router.push(`/session/${session.id}`)} className="p-4 border border-border/20 rounded-lg hover:bg-accent cursor-pointer flex justify-between items-center transition-colors">
                  <div>
                    <h3 className="font-medium text-lg">{session.title}</h3>
                    <p className="text-sm text-muted-foreground">Created: {formatDate(session.created_at)}</p>
                  </div>
                  <FiChevronRight className="text-muted-foreground"/>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-card p-6 rounded-2xl shadow-lg border border-border/10">
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2"><FiZap className="text-primary"/> AI Suggestions</h2>
              <div className="space-y-3">
                {aiSuggestions.map((s, i) => <div key={i} className="bg-primary/10 text-primary-foreground p-3 rounded-lg text-sm">{s}</div>)}
              </div>
            </div>
            <div className="bg-card p-6 rounded-2xl shadow-lg border border-border/10">
              <h2 className="text-2xl font-semibold mb-4">Recent Drafts</h2>
              <div className="space-y-3">
                {drafts.map(draft => (
                  <div key={draft.id} onClick={() => router.push(`/drafts/${draft.id}`)} className="p-4 border border-border/20 rounded-lg hover:bg-accent cursor-pointer">
                    <p className="line-clamp-2 text-sm">{draft.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">v{draft.version} - {formatDate(draft.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showChat && (
        <div className="fixed bottom-4 right-4 w-[450px] bg-card rounded-2xl shadow-2xl border border-border/20 z-50 flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-border/20">
            <h3 className="font-semibold">AI Assistant</h3>
            <button onClick={() => setShowChat(false)} className="p-1 rounded-full hover:bg-accent"><FiX /></button>
          </div>
          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {chatMessages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-lg max-w-sm ${msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{msg.content}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleChatSubmit} className="p-4 border-t border-border/20">
            <div className="flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} className="flex-1 bg-background border border-border px-3 py-2 rounded-lg text-sm" placeholder="Ask AI..." />
              <button type="submit" className="bg-primary text-primary-foreground px-3 py-2 rounded-lg"><FiSend /></button>
            </div>
          </form>
        </div>
      )}
    </Layout>
  );
}