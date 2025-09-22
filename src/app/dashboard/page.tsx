'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IResearchSession, ITab, IDraft } from '@/types/main.db';
import { 
  FiPlus, FiUsers, FiUser, FiEdit2, FiTrash2, FiMail, FiBell, 
  FiMessageSquare, FiSearch, FiX, FiExternalLink, FiImage,
  FiBarChart2, FiClock, FiBook, FiStar, FiZap, FiCpu, FiChevronRight,
  FiDownload, FiSend, FiPaperclip, FiMoreVertical, FiFilter
} from 'react-icons/fi';
import { jsPDF } from 'jspdf';

declare global {
  interface Window {
    ai?: {
      prompt: (prompt: string, options?: { signal?: AbortSignal }) => Promise<{ text: () => Promise<string> }>;
    };
    LanguageModel?: any;
  }
}


export default function Dashboard() {
  const [sessions, setSessions] = useState<IResearchSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<IResearchSession[]>([]);
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<React.ReactNode>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadDashboardData();
    checkAIAvailability();
  }, []);

  useEffect(() => {
    filterSessions();
  }, [searchQuery, sessions]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

const checkAIAvailability = async () => {
  try {
    if (typeof window.LanguageModel !== "undefined") {
      const opts = { expectedOutputs: [{ type: "text", languages: ["en"] }] };
      const availability = await window.LanguageModel.availability(opts);

      // ✅ handle actual statuses
      return availability === "available" || availability === "downloadable" || availability === "readily";
    } else if (typeof window.ai !== "undefined") {
      return true; // old API fallback
    }
    return false;
  } catch (error) {
    console.warn("AI not available:", error);
    return false;
  }
};

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

      if (sessionsResult.data) {
        setSessions(sessionsResult.data);
        setFilteredSessions(sessionsResult.data);
      }
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

  const filterSessions = () => {
    if (!searchQuery.trim()) {
      setFilteredSessions(sessions);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = sessions.filter(session => 
      session.title.toLowerCase().includes(query) ||
      session.description?.toLowerCase().includes(query) ||
      session.tags?.some(tag => tag.toLowerCase().includes(query))
    );
    
    setFilteredSessions(filtered);
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

      let suggestions: string[] = [];
      
      if (typeof window.LanguageModel !== 'undefined') {
        // Use the new LanguageModel API
        (async () => {
          try {
            const opts = {
              expectedOutputs: [{ type: "text", languages: ["en"] }]
            };

            const availability = await window.LanguageModel.availability(opts);
            console.log("availability:", availability);

            if (availability === "unavailable") {
              console.error("❌ Model unavailable.");
              return;
            }

            const session = await window.LanguageModel.create({
              ...opts,
              monitor(m: any) {
                m.addEventListener("downloadprogress", (e: any) => {
                  console.log(`📥 Download progress: ${(e.loaded * 100).toFixed(1)}%`);
                });
                m.addEventListener("statechange", (e: any) => {
                  console.log("⚡ State change:", e.target.state);
                });
              }
            });

            console.log("✅ Session ready:", session);

            const result = await session.prompt(prompt);
            console.log("☕ Model output:", result);
            
            // Parse the response into individual suggestions
            suggestions = result.split('\n')
              .filter(line => line.trim().match(/^[•\-]\s+|^\d+\.\s+/))
              .map(line => line.replace(/^[•\-]\s+|^\d+\.\s+/, '').trim())
              .slice(0, 5);
            
            setAiSuggestions(suggestions);
          } catch (err) {
            console.error("Error with LanguageModel:", err);
            setAiSuggestions(getFallbackSuggestions());
          }
        })();
      } else if (typeof window.ai !== 'undefined') {
        // Fallback to the older AI API
        const response = await window.ai!.prompt(prompt, { signal: AbortSignal.timeout(30000) });
        const text = await response.text();
        
        // Parse the response into individual suggestions
        suggestions = text.split('\n')
          .filter(line => line.trim().match(/^[•\-]\s+|^\d+\.\s+/))
          .map(line => line.replace(/^[•\-]\s+|^\d+\.\s+/, '').trim())
          .slice(0, 5);
        
        setAiSuggestions(suggestions);
      } else {
        setAiSuggestions(getFallbackSuggestions());
      }
    } catch (error) {
      console.warn('AI suggestion generation failed:', error);
      setAiSuggestions(getFallbackSuggestions());
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const getFallbackSuggestions = () => {
    return [
      "Analyze connections between your recent research topics",
      "Consider creating a synthesis document from your collected tabs",
      "Look for patterns in your research sessions over time",
      "Identify key themes across your research materials",
      "Create an outline for a research paper based on your findings"
    ];
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
    showModalWithContent(
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Import Browser Tabs</h2>
        <p className="text-gray-600 mb-6">
          To import your current browser tabs, youll need to install our browser extension.
          This allows us to securely access your open tabs and add them to your research session.
        </p>
        <div className="flex justify-end space-x-3">
          <button 
            onClick={() => setShowModal(false)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => window.open('https://chrome.google.com/webstore', '_blank')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Extension
          </button>
        </div>
      </div>
    );
  };

  const showModalWithContent = (content: React.ReactNode) => {
    setModalContent(content);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalContent(null);
  };

  const summarizeWithAI = async (content: string) => {
    if (!aiAvailable) {
      showModalWithContent(
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">AI Not Available</h2>
          <p className="text-gray-600 mb-6">
            AI features require Chrome with Gemini Nano enabled. Please enable the Prompt API for Gemini Nano in chrome://flags.
          </p>
          <div className="flex justify-end">
            <button 
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      );
      return;
    }

    try {
      if (typeof window.LanguageModel !== 'undefined') {
        const opts = {
          expectedOutputs: [{ type: "text", languages: ["en"] }]
        };

        const availability = await window.LanguageModel.availability(opts);
        if (availability === "unavailable") {
          return 'Unable to generate summary at this time';
        }

        const session = await window.LanguageModel.create(opts);
        const result = await session.prompt(
          `Create a concise summary of this research content:\n\n${content.substring(0, 1500)}`
        );
        return result;
      } else if (typeof window.ai !== 'undefined') {
        const response = await window.ai!.prompt(
          `Create a concise summary of this research content:\n\n${content.substring(0, 1500)}`,
          { signal: AbortSignal.timeout(15000) }
        );
        return await response.text();
      }
    } catch (error) {
      console.error('AI summarization failed:', error);
      return 'Unable to generate summary at this time';
    }
  };

  const exportToPDF = async (session: IResearchSession) => {
    try {
      // Get session details with tabs
      const { data: sessionData } = await supabase
        .from('research_sessions')
        .select(`
          *,
          tabs (*)
        `)
        .eq('id', session.id)
        .single();

      if (!sessionData) return;

      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text(sessionData.title, 20, 20);
      
      // Add creation date
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`Created: ${formatDate(sessionData.created_at)}`, 20, 30);
      
      // Add description if exists
      if (sessionData.description) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        const splitDescription = doc.splitTextToSize(sessionData.description, 170);
        doc.text(splitDescription, 20, 40);
      }
      
      // Add tabs content
      let yPosition = 60;
      if (sessionData.tabs && sessionData.tabs.length > 0) {
        doc.setFontSize(16);
        doc.text('Research Sources', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(12);
        sessionData.tabs.forEach((tab: ITab, index: number) => {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.setTextColor(0, 0, 0);
          doc.text(`${index + 1}. ${tab.url}`, 20, yPosition);
          yPosition += 7;
          
          if (tab.content) {
            doc.setTextColor(100, 100, 100);
            const splitContent = doc.splitTextToSize(tab.content.substring(0, 150) + '...', 170);
            doc.text(splitContent, 25, yPosition);
            yPosition += splitContent.length * 5 + 5;
          } else {
            yPosition += 5;
          }
        });
      }
      
      // Save the PDF
      doc.save(`${sessionData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
      
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: chatInput,
      sender: 'user',
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    
    // Simulate AI response (in a real app, this would call an API)
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "I've analyzed your research patterns and noticed you're focusing on AI implementation strategies. Would you like me to help you organize these findings into a structured report?",
        sender: 'ai',
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, aiResponse]);
    }, 1000);
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
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors flex items-center space-x-2 shadow-md"
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
            <button 
              onClick={() => setShowChat(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <FiMessageSquare className="w-5 h-5" />
              <span>AI Assistant</span>
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
            <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
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
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <FiSearch className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input 
                      type="text" 
                      placeholder="Search sessions..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    <FiFilter className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {filteredSessions.length === 0 ? (
                  <div className="text-center py-8">
                    <FiBook className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {searchQuery ? 'No sessions match your search' : 'No research sessions yet'}
                    </p>
                    <button
                      onClick={createNewSession}
                      className="text-blue-600 hover:underline mt-2 font-medium"
                    >
                      Create your first session
                    </button>
                  </div>
                ) : (
                  filteredSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => router.push(`/session/${session.id}`)}
                      >
                        <h3 className="font-medium text-gray-900 truncate">{session.title}</h3>
                        <p className="text-sm text-gray-600">
                          Created {formatDate(session.created_at)}
                          {session.tags && session.tags.length > 0 && (
                            <span className="ml-2">
                              {session.tags.map(tag => (
                                <span key={tag} className="inline-block bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs mr-1">
                                  {tag}
                                </span>
                              ))}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => exportToPDF(session)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Export to PDF"
                        >
                          <FiDownload className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => router.push(`/session/${session.id}`)}
                          className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit session"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            showModalWithContent(
                              <div className="p-6">
                                <h2 className="text-xl font-semibold mb-4">Delete Session</h2>
                                <p className="text-gray-600 mb-6">
                                  Are you sure you want to delete {session.title}? This action cannot be undone.
                                </p>
                                <div className="flex justify-end space-x-3">
                                  <button 
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      await supabase.from('research_sessions').delete().eq('id', session.id);
                                      setSessions(sessions.filter(s => s.id !== session.id));
                                      setShowModal(false);
                                    }}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            );
                          }}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete session"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => router.push(`/session/${session.id}`)}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                        >
                          <FiChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Drafts */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Recent Drafts</h2>
                <button 
                  onClick={() => router.push('/drafts')}
                  className="text-blue-600 text-sm font-medium hover:underline"
                >
                  View all
                </button>
              </div>
              <div className="space-y-3">
                {drafts.length === 0 ? (
                  <div className="text-center py-6">
                    <FiEdit2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600">No drafts yet</p>
                  </div>
                ) : (
                  drafts.map((draft) => (
                    <div 
                      key={draft.id} 
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/draft/${draft.id}`)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          Version {draft.version}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(draft.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-900 line-clamp-2 text-sm">
                        {draft.content.substring(0, 150)}...
                      </p>
                      <div className="mt-2 flex justify-end">
                        <button className="text-blue-600 text-xs font-medium hover:underline">Continue editing</button>
                      </div>
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
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900 text-sm mb-2">Suggestions:</h3>
                {aiSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-3 hover:bg-blue-100 transition-colors cursor-pointer"
                    onClick={() => {
                      setShowChat(true);
                      setChatInput(suggestion);
                    }}
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
                <button 
                  onClick={() => {
                    // Export all sessions to PDF
                    if (sessions.length > 0) {
                      exportToPDF(sessions[0]); // This would need to be enhanced to export all
                    }
                  }}
                  className="w-full text-left p-3 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <span>Export Research Data</span>
                  <FiDownload className="w-4 h-4 text-gray-400" />
                </button>
                <button 
                  onClick={() => {
                    if (aiAvailable) {
                      // Generate summary report using AI
                      showModalWithContent(
                        <div className="p-6">
                          <h2 className="text-xl font-semibold mb-4">Generate Summary Report</h2>
                          <p className="text-gray-600 mb-6">
                            This will analyze all your research sessions and generate a comprehensive summary report.
                          </p>
                          <div className="flex justify-end space-x-3">
                            <button 
                              onClick={() => setShowModal(false)}
                              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={async () => {
                                // This would call the AI to generate a report
                                setShowModal(false);
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Generate
                            </button>
                          </div>
                        </div>
                      );
                    } else {
                      showModalWithContent(
                        <div className="p-6">
                          <h2 className="text-xl font-semibold mb-4">AI Not Available</h2>
                          <p className="text-gray-600 mb-6">
                            AI features are required to generate summary reports. Please enable Gemini Nano in your browser settings.
                          </p>
                          <div className="flex justify-end">
                            <button 
                              onClick={() => setShowModal(false)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              OK
                            </button>
                          </div>
                        </div>
                      );
                    }
                  }}
                  className="w-full text-left p-3 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <span>Generate Summary Report</span>
                  <FiBarChart2 className="w-4 h-4 text-gray-400" />
                </button>
                <button 
                  onClick={() => setShowChat(true)}
                  className="w-full text-left p-3 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between"
                >
                  <span>Analyze Research Patterns</span>
                  <FiSearch className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Modal */}
      {showChat && (
        <div className="fixed bottom-4 right-4 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">AI Research Assistant</h3>
            <button 
              onClick={() => setShowChat(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
          <div className="h-80 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="text-center py-10">
                <FiMessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">Ask me anything about your research</p>
              </div>
            ) : (
              chatMessages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs p-3 rounded-lg ${
                      message.sender === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${message.sender === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleChatSubmit} className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about your research..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiSend className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            {modalContent}
          </div>
        </div>
      )}
    </Layout>
  );
}