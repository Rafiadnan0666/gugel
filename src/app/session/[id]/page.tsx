'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IResearchSession, ITab, IDraft, ISummary, ISessionMessage } from '@/types/main.db';
import {
  FiPlus, FiEdit2, FiTrash2, FiSave, FiCopy, FiDownload,
  FiExternalLink, FiZap, FiCpu, FiBook, FiLink, FiClock,
  FiUser, FiMessageSquare, FiRefreshCw, FiChevronDown,
  FiChevronUp, FiSearch, FiFilter, FiShare2, FiBookmark,
  FiSend, FiX, FiCheck, FiEdit3, FiMoreVertical, FiAlertCircle,
  FiThumbsUp, FiThumbsDown, FiStar, FiInfo
} from 'react-icons/fi';

interface AISuggestion {
  type: 'summary' | 'analysis' | 'connection' | 'suggestion' | 'outline';
  content: string;
  confidence: number;
}

interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  id?: string;
  profile?: { full_name?: string; avatar_url?: string; };
}

interface UserInterest {
  topic: string;
  priority: 'high' | 'medium' | 'low';
}

interface TabSuggestion {
  url: string;
  title: string;
  reason: string;
  relevance: number;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actionButton?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, actionButton }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
        {actionButton && (
          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            {actionButton}
          </div>
        )}
      </div>
    </div>
  );
};

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const supabase = createClient();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [session, setSession] = useState<IResearchSession | null>(null);
  const [tabs, setTabs] = useState<ITab[]>([]);
  const [drafts, setDrafts] = useState<IDraft[]>([]);
  const [summaries, setSummaries] = useState<ISummary[]>([]);
  const [sessionMessages, setSessionMessages] = useState<ISessionMessage[]>([]);
  const [currentDraft, setCurrentDraft] = useState('');
  const [draftVersion, setDraftVersion] = useState(1);
  const [loading, setLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'ai' | 'drafts' | 'chat'>('content');
  const [expandedTabs, setExpandedTabs] = useState<Set<string>>(new Set());
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [currentChromeTabs, setCurrentChromeTabs] = useState<any[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [modal, setModal] = useState<{ type: string; data?: any }>({ type: '' });
  const [selectedTabsToImport, setSelectedTabsToImport] = useState<Set<number>>(new Set());
  const [userInterests, setUserInterests] = useState<UserInterest[]>([]);
  const [tabSuggestions, setTabSuggestions] = useState<TabSuggestion[]>([]);
  const [isEditingInterests, setIsEditingInterests] = useState(false);
  const [newInterest, setNewInterest] = useState('');
  const [newInterestPriority, setNewInterestPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

  useEffect(() => {
    loadSessionData();
    detectChromeTabs();
  }, [sessionId]);

  useEffect(() => {
    if (chatEndRef.current && activeTab === 'chat') {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`session-chat:${sessionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'session_messages', filter: `session_id=eq.${sessionId}` }, 
        async (payload) => {
          const newMessageId = payload.new.id;
          const { data: newMessage } = await supabase
            .from('session_messages')
            .select('*, profile:profiles(full_name, avatar_url)')
            .eq('id', newMessageId)
            .single();

          if (newMessage) {
            setChatMessages(prev => [...prev, {
                role: newMessage.sender as 'user' | 'assistant',
                content: newMessage.content,
                timestamp: new Date(newMessage.created_at),
                id: newMessage.id,
                profile: newMessage.profile
            }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || !userProfile) return;

    const channel = supabase.channel(`session-presence:${sessionId}`, {
      config: {
        presence: {
          key: userProfile.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const users = Object.values(newState).map((p: any) => p[0]);
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userProfile.id, name: userProfile.full_name || userProfile.email });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, userProfile]);

  const detectChromeTabs = () => {
    // Simulate Chrome tabs detection for web environment
    // In a real extension, this would use chrome.tabs API
    const mockTabs = [
      { id: 1, title: "Research Paper on AI", url: "https://example.com/ai-research" },
      { id: 2, title: "Machine Learning Tutorial", url: "https://example.com/ml-tutorial" },
      { id: 3, title: "Data Analysis Techniques", url: "https://example.com/data-analysis" }
    ];
    setCurrentChromeTabs(mockTabs);
  };

  const loadSessionData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/sign-in');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setUserProfile(profile);

      const { data: collaboratorsData } = await supabase
        .from('session_collaborators')
        .select('*, profile:profiles(full_name, avatar_url)')
        .eq('session_id', sessionId);
      if (collaboratorsData) setCollaborators(collaboratorsData);

      const { data: sessionData } = await supabase
        .from('research_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!sessionData) {
        router.push('/dashboard');
        return;
      }

      if (sessionData.user_id !== user.id) {
        // Check for collaboration
        const { data: collaborator } = await supabase
          .from('session_collaborators')
          .select('id')
          .eq('session_id', sessionId)
          .eq('user_id', user.id)
          .single();

        if (!collaborator) {
          // Check for team membership if session belongs to a team
          if (sessionData.team_id) {
            const { data: teamMember } = await supabase
              .from('team_members')
              .select('id')
              .eq('team_id', sessionData.team_id)
              .eq('user_id', user.id)
              .single();

            if (!teamMember) {
              router.push('/dashboard');
              return;
            }
          } else {
            router.push('/dashboard');
            return;
          }
        }
      }

      const { data: tabsData } = await supabase
        .from('tabs')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      const { data: draftsData } = await supabase
        .from('drafts')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      const { data: summariesData } = await supabase
        .from('summaries')
        .select('*')
        .in('tab_id', tabsData?.map(tab => tab.id) || []);

      const { data: messagesData } = await supabase
        .from('session_messages')
        .select('*, profile:profiles(full_name, avatar_url)')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      // Load user interests from localStorage or settings
      const savedInterests = localStorage.getItem(`userInterests-${user.id}`);
      if (savedInterests) {
        setUserInterests(JSON.parse(savedInterests));
      } else {
        // Default interests based on session title or content
        const defaultInterests = sessionData?.title 
          ? [{ topic: sessionData.title.split(' ')[0], priority: 'high' as const }]
          : [{ topic: 'research', priority: 'medium' as const }];
        setUserInterests(defaultInterests);
      }

      if (sessionData) {
        setSession(sessionData);
        setEditedTitle(sessionData.title);
      }
      if (tabsData) setTabs(tabsData);
      if (draftsData) {
        setDrafts(draftsData);
        if (draftsData.length > 0) {
          setCurrentDraft(draftsData[0].content);
          setDraftVersion(draftsData[0].version + 1);
        }
      }
      if (summariesData) setSummaries(summariesData);
      if (messagesData) {
        setSessionMessages(messagesData);
        // Load today's chat messages
        const allMessages = messagesData
          .map(msg => ({
            role: msg.sender as 'user' | 'assistant',
            content: msg.content,
            timestamp: new Date(msg.created_at),
            id: msg.id,
            profile: msg.profile
          }));
        setChatMessages(allMessages);
      }

      if (tabsData && tabsData.length > 0) {
        generateInitialAISuggestions(tabsData, summariesData || []);
        generateTabSuggestions(tabsData, userInterests);
      }

    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTabSuggestions = async (tabs: ITab[], interests: UserInterest[]) => {
    try {
      const isAIAvailable = await checkAIAvailability();
      if (!isAIAvailable) return;

      const highPriorityInterests = interests
        .filter(i => i.priority === 'high')
        .map(i => i.topic);
      
      const prompt = `
        Based on these research tabs and user interests, suggest 3-5 additional resources or topics to explore.
        
        CURRENT TABS:
        ${tabs.map(t => `- ${t.title}: ${t.url}`).join('\n')}
        
        USER INTERESTS (high priority):
        ${highPriorityInterests.join(', ')}
        
        Provide suggestions in this format:
        URL: https://example.com/relevant-resource
        TITLE: Relevant Resource Title
        REASON: Why this is relevant to the user's research
        RELEVANCE: 0.85 (score between 0-1)
        
        Focus on academic resources, recent publications, and complementary perspectives.
      `;

      const session = await createAISession();
      let result;
      if (typeof window.LanguageModel !== 'undefined') {
        result = await session.prompt(prompt);
      } else if (typeof window.ai !== 'undefined') {
        const response = await session.prompt(prompt);
        result = await response.text();
      } else {
        return;
      }

      const suggestions: TabSuggestion[] = [];
      const lines = result.split('\n');
      let currentSuggestion: Partial<TabSuggestion> = {};

      for (const line of lines) {
        if (line.startsWith('URL:')) {
          if (currentSuggestion.url) suggestions.push(currentSuggestion as TabSuggestion);
          currentSuggestion = { url: line.replace('URL:', '').trim() };
        } else if (line.startsWith('TITLE:')) {
          currentSuggestion.title = line.replace('TITLE:', '').trim();
        } else if (line.startsWith('REASON:')) {
          currentSuggestion.reason = line.replace('REASON:', '').trim();
        } else if (line.startsWith('RELEVANCE:')) {
          currentSuggestion.relevance = parseFloat(line.replace('RELEVANCE:', '').trim());
        }
      }

      if (currentSuggestion.url) {
        suggestions.push(currentSuggestion as TabSuggestion);
      }

      setTabSuggestions(suggestions.slice(0, 5));
    } catch (error) {
      console.warn('Failed to generate tab suggestions:', error);
    }
  };

  const checkAIAvailability = async () => {
    try {
      if (typeof window.LanguageModel !== "undefined") {
        const opts = { expectedOutputs: [{ type: "text", languages: ["en"] }] };
        const availability = await window.LanguageModel.availability(opts);
        return availability === "available" || availability === "downloadable" || availability === "readily";
      } else if (typeof window.ai !== "undefined") {
        return true;
      }
      return false;
    } catch (error) {
      console.warn("AI not available:", error);
      return false;
    }
  };

  const createAISession = async () => {
    try {
      if (typeof window.LanguageModel !== 'undefined') {
        const opts = {
          expectedOutputs: [{ type: "text", languages: ["en"] }],
          monitor(m: any) {
            m.addEventListener("downloadprogress", (e: any) => {
              console.log(`Download progress: ${(e.loaded * 100).toFixed(1)}%`);
            });
            m.addEventListener("statechange", (e: any) => {
              console.log("State change:", e.target.state);
            });
          }
        };

        const availability = await window.LanguageModel.availability(opts);
        if (availability === "unavailable") {
          throw new Error("Model is unavailable");
        }

        return await window.LanguageModel.create(opts);
      } else if (typeof window.ai !== 'undefined') {
        return {
          prompt: async (text: string) => {
            return window.ai!.prompt(text, { signal: AbortSignal.timeout(30000) });
          }
        };
      }
      throw new Error("No AI API available");
    } catch (error) {
      console.error('Error creating AI session:', error);
      throw error;
    }
  };

  const generateInitialAISuggestions = async (tabs: ITab[], summaries: ISummary[]) => {
    setIsGeneratingAI(true);
    try {
      const isAIAvailable = await checkAIAvailability();
      if (!isAIAvailable) {
        setModal({
          type: 'ai-unavailable',
          data: { message: 'AI features are not available in your browser.' }
        });
        return;
      }

      const tabContents = tabs.map(tab => `TITLE: ${tab.title}\nURL: ${tab.url}\nCONTENT: ${tab.content || ''}`).join('\n\n');
      const summaryContents = summaries.map(s => s.summary).join('\n\n');

      const prompt = `
        Analyze this research session content and provide insights:

        RESEARCH TABS:
        ${tabContents.substring(0, 4000)}

        EXISTING SUMMARIES:
        ${summaryContents.substring(0, 2000)}

        Provide 3-5 insights in this format:
        TYPE: SUMMARY|ANALYSIS|CONNECTION|SUGGESTION|OUTLINE
        CONFIDENCE: 0.8
        CONTENT: Your insight here

        Focus on:
        - Key themes and patterns across the research
        - Research gaps and unanswered questions
        - Potential connections between different sources
        - Next steps for the research
        - Content organization and structure suggestions
        - Outline for a research paper based on this content
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
      setModal({
        type: 'error',
        data: { message: 'Failed to generate AI suggestions. Please try again.' }
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const parseAISuggestions = (text: string) => {
    const suggestions: AISuggestion[] = [];
    const lines = text.split('\n');
    
    let currentSuggestion: Partial<AISuggestion> = {};
    
    for (const line of lines) {
      if (line.startsWith('TYPE:')) {
        if (currentSuggestion.content) {
          suggestions.push(currentSuggestion as AISuggestion);
        }
        currentSuggestion = {
          type: line.replace('TYPE:', '').trim().toLowerCase() as AISuggestion['type'],
        };
      } else if (line.startsWith('CONFIDENCE:')) {
        currentSuggestion.confidence = parseFloat(line.replace('CONFIDENCE:', '').trim());
      } else if (line.startsWith('CONTENT:')) {
        currentSuggestion.content = line.replace('CONTENT:', '').trim();
      } else if (currentSuggestion.content && line.trim()) {
        currentSuggestion.content += ' ' + line.trim();
      }
    }
    
    if (currentSuggestion.content) {
      suggestions.push(currentSuggestion as AISuggestion);
    }
    
    // Fallback suggestions if parsing failed
    if (suggestions.length === 0) {
      suggestions.push(
        {
          type: 'summary',
          content: 'Your research shows a focus on emerging technologies and their applications. Consider organizing your findings by theme.',
          confidence: 0.8
        },
        {
          type: 'connection',
          content: 'Multiple sources discuss the impact of AI on research methodologies. This could be a central theme for your paper.',
          confidence: 0.7
        },
        {
          type: 'suggestion',
          content: 'Consider creating a comparative analysis table to highlight differences between traditional and AI-assisted research methods.',
          confidence: 0.9
        }
      );
    }
    
    setAiSuggestions(suggestions.slice(0, 5));
  };

  const generateAISummary = async (tabId: string, content: string, title: string, url: string) => {
    try {
      const isAIAvailable = await checkAIAvailability();
      if (!isAIAvailable) {
        setModal({
          type: 'ai-unavailable',
          data: { message: 'AI features are not available in your browser.' }
        });
        return;
      }

      const prompt = `
        Summarize this research content for academic purposes. Focus on key points, arguments, and evidence:
        
        TITLE: ${title}
        URL: ${url}
        CONTENT: ${content.substring(0, 3000)}
        
        Provide a clear, structured summary with these sections:
        1. Main thesis or purpose
        2. Key findings or arguments
        3. Methodology (if apparent)
        4. Conclusions or implications
        5. Relevance to broader research
      `;

      const session = await createAISession();
      
      let summary;
      if (typeof window.LanguageModel !== 'undefined') {
        summary = await session.prompt(prompt);
      } else {
        const response = await session.prompt(prompt);
        summary = await response.text();
      }
      
      const { data } = await supabase
        .from('summaries')
        .insert([{
          tab_id: tabId,
          summary: summary,
          translator: 'AI',
          proofread: 'pending'
        }])
        .select()
        .single();

      if (data) {
        setSummaries(prev => [...prev, data]);
        setModal({
          type: 'success',
          data: { message: 'Summary generated successfully!' }
        });
      }

      return summary;
    } catch (error) {
      console.error('AI summarization failed:', error);
      setModal({
        type: 'error',
        data: { message: 'Failed to generate summary. Please try again.' }
      });
    }
  };

  const generateResearchDraft = async (type: 'full' | 'outline' | 'introduction' | 'conclusion' = 'full') => {
    if (tabs.length === 0) return;

    setIsGeneratingAI(true);
    try {
      const isAIAvailable = await checkAIAvailability();
      if (!isAIAvailable) {
        setModal({
          type: 'ai-unavailable',
          data: { message: 'AI features are not available in your browser.' }
        });
        return;
      }

      const allContent = tabs.map(tab => `TITLE: ${tab.title}\nURL: ${tab.url}\nCONTENT: ${tab.content || ''}`).join('\n\n');
      const allSummaries = summaries.map(s => s.summary).join('\n\n');

      let prompt = '';
      
      if (type === 'outline') {
        prompt = `
          Create a detailed research paper outline based on this content:

          RESEARCH CONTENT:
          ${allContent.substring(0, 4000)}

          SUMMARIES:
          ${allSummaries.substring(0, 2000)}

          Create a comprehensive outline with:
          1. Title suggestion
          2. Abstract structure
          3. Introduction section
          4. Literature review (if applicable)
          5. Methodology section
          6. Results/findings sections
          7. Discussion/analysis sections
          8. Conclusion section
          9. References

          Use proper academic formatting with headings and subheadings.
        `;
      } else if (type === 'introduction') {
        prompt = `
          Write a compelling introduction for a research paper based on this content:

          RESEARCH CONTENT:
          ${allContent.substring(0, 4000)}

          SUMMARIES:
          ${allSummaries.substring(0, 2000)}

          The introduction should:
          1. Start with a hook/background context
          2. State the research problem/question
          3. Explain the significance of the research
          4. Provide a brief literature context
          5. State the paper's thesis and objectives
          6. Outline the paper's structure
        `;
      } else if (type === 'conclusion') {
        prompt = `
          Write a strong conclusion for a research paper based on this content:

          RESEARCH CONTENT:
          ${allContent.substring(0, 4000)}

          SUMMARIES:
          ${allSummaries.substring(0, 2000)}

          The conclusion should:
          1. Restate the thesis and main findings
          2. Summarize the key arguments/evidence
          3. Discuss the implications of the research
          4. Acknowledge limitations
          5. Suggest directions for future research
          6. End with a strong concluding statement
        `;
      } else {
        prompt = `
          Create a comprehensive research draft based on this content:

          RESEARCH CONTENT:
          ${allContent.substring(0, 4000)}

          SUMMARIES:
          ${allSummaries.substring(0, 2000)}

          Create a well-structured research draft with:
          1. Title
          2. Abstract
          3. Introduction with thesis statement
          4. Literature review (if applicable)
          5. Methodology section
          6. Results/findings with evidence
          7. Discussion/analysis of results
          8. Conclusion with implications
          9. References (include any URLs from the research)

          Format it professionally for academic research with clear section headings.
        `;
      }

      const session = await createAISession();
      
      let draft;
      if (typeof window.LanguageModel !== 'undefined') {
        draft = await session.prompt(prompt);
      } else {
        const response = await session.prompt(prompt);
        draft = await response.text();
      }
      
      setCurrentDraft(draft);
      
      await saveDraft(draft);
      setModal({
        type: 'success',
        data: { message: `${type.charAt(0).toUpperCase() + type.slice(1)} generated successfully!` }
      });

    } catch (error) {
      console.error('AI draft generation failed:', error);
      setModal({
        type: 'error',
        data: { message: 'Failed to generate draft. Please try again.' }
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const saveDraft = async (content: string) => {
    const { data } = await supabase
      .from('drafts')
      .insert([{
        session_id: sessionId,
        content: content,
        version: draftVersion
      }])
      .select()
      .single();

    if (data) {
      setDrafts(prev => [data, ...prev]);
      setDraftVersion(prev => prev + 1);
    }
  };

  const updateSessionTitle = async () => {
    if (!session || !editedTitle.trim()) return;

    try {
      const { data } = await supabase
        .from('research_sessions')
        .update({ title: editedTitle })
        .eq('id', session.id)
        .select()
        .single();

      if (data) {
        setSession(data);
        setIsEditingTitle(false);
      }
    } catch (error) {
      console.error('Error updating session title:', error);
    }
  };

  const deleteSession = async () => {
    if (!session) return;

    try {
      await supabase
        .from('research_sessions')
        .delete()
        .eq('id', session.id);

      router.push('/dashboard');
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const exportSessionData = async () => {
    const exportData = {
      session,
      tabs,
      summaries,
      drafts,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `research-session-${session?.title || 'export'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const duplicateSession = async () => {
    if (!session) return;

    try {
      const { data: newSession } = await supabase
        .from('research_sessions')
        .insert([{ 
          title: `${session.title} (Copy)`,
          user_id: session.user_id
        }])
        .select()
        .single();

      if (newSession) {
        for (const tab of tabs) {
          await supabase
            .from('tabs')
            .insert([{
              session_id: newSession.id,
              url: tab.url,
              title: tab.title,
              content: tab.content
            }]);
        }

        router.push(`/session/${newSession.id}`);
      }
    } catch (error) {
      console.error('Error duplicating session:', error);
    }
  };

  const shareSession = async () => {
    const sessionUrl = `${window.location.origin}/session/${sessionId}`;
    
    try {
      await navigator.clipboard.writeText(sessionUrl);
      setModal({
        type: 'success',
        data: { message: 'Session link copied to clipboard!' }
      });
    } catch (error) {
      console.error('Failed to copy link:', error);
      setModal({
        type: 'error',
        data: { message: 'Failed to copy link. Please try again.' }
      });
    }
  };

  const toggleTabExpansion = (tabId: string) => {
    const newExpanded = new Set(expandedTabs);
    if (newExpanded.has(tabId)) {
      newExpanded.delete(tabId);
    } else {
      newExpanded.add(tabId);
    }
    setExpandedTabs(newExpanded);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage: AIChatMessage = {
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const isAIAvailable = await checkAIAvailability();
      if (!isAIAvailable) {
        const aiMessage: AIChatMessage = {
          role: 'assistant',
          content: "I'm sorry, but the AI features are currently unavailable. Please make sure you're using a compatible browser with AI capabilities enabled.",
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, aiMessage]);
        return;
      }

      const tabContext = tabs.map(tab => `TITLE: ${tab.title}\nURL: ${tab.url}\nCONTENT: ${tab.content || ''}`).join('\n\n');
      const summaryContext = summaries.map(s => s.summary).join('\n\n');
      const draftContext = drafts.length > 0 ? drafts[0].content.substring(0, 1000) : '';
      const interestsContext = userInterests.map(i => `${i.topic} (${i.priority})`).join(', ');

      const collaboratorsNames = collaborators.map(c => c.profile.full_name).join(', ');
      const userName = userProfile?.full_name || 'the user';

      const prompt = `
        You are a research assistant helping with a research session. 
        The current user is ${userName}.
        The other collaborators in this session are: ${collaboratorsNames}.
        
        RESEARCH CONTEXT:
        ${tabContext.substring(0, 3000)}
        
        SUMMARIES:
        ${summaryContext.substring(0, 1500)}
        
        CURRENT DRAFT:
        ${draftContext}
        
        USER INTERESTS:
        ${interestsContext}
        
        USER QUESTION: ${chatInput}
        
        Provide a helpful, focused response based on the research content. Be specific and reference the available research materials when possible.
        Address the user by their name, ${userName}.
        Consider the user's interests and the collaborative nature of the session when formulating your response.
      `;

      const session = await createAISession();
      
      let text;
      if (typeof window.LanguageModel !== 'undefined') {
        text = await session.prompt(prompt);
      } else {
        const response = await session.prompt(prompt);
        text = await response.text();
      }
      
      const aiMessage: AIChatMessage = {
        role: 'assistant',
        content: text,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, aiMessage]);
      
      // Save message to database
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase
          .from('session_messages')
          .insert([
            {
              session_id: sessionId,
              user_id: userData.user.id,
              content: chatInput,
              sender: 'user'
            },
            {
              session_id: sessionId,
              content: text,
              sender: 'ai'
            }
          ]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      const errorMessage: AIChatMessage = {
        role: 'assistant',
        content: "I encountered an error while processing your request. Please try again later.",
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const importChromeTabs = async (tabsToImport: any[]) => {
    try {
      const newTabs: ITab[] = [];
      
      for (const tab of tabsToImport) {
        const { data, error } = await supabase
          .from('tabs')
          .insert([{
            session_id: sessionId,
            url: tab.url,
            title: tab.title,
            content: `Content from ${tab.title} - ${tab.url}`
          }])
          .select()
          .single();
          
        if (data && !error) {
          newTabs.push(data);
        }
      }
      
      if (newTabs.length > 0) {
        setTabs(prev => [...newTabs, ...prev]);
        generateInitialAISuggestions([...newTabs, ...tabs], summaries);
        generateTabSuggestions([...newTabs, ...tabs], userInterests);
      }
      
      setShowImportDialog(false);
      setSelectedTabsToImport(new Set());
      setModal({
        type: 'success',
        data: { message: `Successfully imported ${newTabs.length} tabs!` }
      });
    } catch (error) {
      console.error('Error importing tabs:', error);
      setModal({
        type: 'error',
        data: { message: 'Failed to import tabs. Please try again.' }
      });
    }
  };

  const toggleTabSelection = (tabId: number) => {
    const newSelection = new Set(selectedTabsToImport);
    if (newSelection.has(tabId)) {
      newSelection.delete(tabId);
    } else {
      newSelection.add(tabId);
    }
    setSelectedTabsToImport(newSelection);
  };

  const selectAllTabs = () => {
    if (selectedTabsToImport.size === currentChromeTabs.length) {
      setSelectedTabsToImport(new Set());
    } else {
      setSelectedTabsToImport(new Set(currentChromeTabs.map(tab => tab.id)));
    }
  };

  const addInterest = async () => {
    if (newInterest.trim()) {
      const newInterests = [...userInterests, { topic: newInterest.trim(), priority: newInterestPriority }];
      setUserInterests(newInterests);
      
      // Save to localStorage
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        localStorage.setItem(`userInterests-${user.id}`, JSON.stringify(newInterests));
      }
      
      setNewInterest('');
      setNewInterestPriority('medium');
      generateTabSuggestions(tabs, newInterests);
    }
  };

  const removeInterest = async (index: number) => {
    const newInterests = userInterests.filter((_, i) => i !== index);
    setUserInterests(newInterests);
    
    // Save to localStorage
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      localStorage.setItem(`userInterests-${user.id}`, JSON.stringify(newInterests));
    }
    
    generateTabSuggestions(tabs, newInterests);
  };

  const updateInterestPriority = async (index: number, priority: 'high' | 'medium' | 'low') => {
    const newInterests = [...userInterests];
    newInterests[index].priority = priority;
    setUserInterests(newInterests);
    
    // Save to localStorage
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      localStorage.setItem(`userInterests-${user.id}`, JSON.stringify(newInterests));
    }
    
    generateTabSuggestions(tabs, newInterests);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const addManualTab = async () => {
    const url = prompt("Enter the URL for the research tab:");
    if (!url) return;

    const title = prompt("Enter a title for the tab:", "Research Tab");
    const content = prompt("Enter content or notes for this tab:", "");

    try {
      const { data } = await supabase
        .from('tabs')
        .insert([{
          session_id: sessionId,
          url: url,
          title: title || "Research Tab",
          content: content || ""
        }])
        .select()
        .single();

      if (data) {
        setTabs(prev => [data, ...prev]);
        generateTabSuggestions([data, ...tabs], userInterests);
        setModal({
          type: 'success',
          data: { message: 'Tab added successfully!' }
        });
      }
    } catch (error) {
      console.error('Error adding manual tab:', error);
      setModal({
        type: 'error',
        data: { message: 'Failed to add tab. Please try again.' }
      });
    }
  };

  const addSuggestedTab = async (suggestion: TabSuggestion) => {
    try {
      const { data } = await supabase
        .from('tabs')
        .insert([{
          session_id: sessionId,
          url: suggestion.url,
          title: suggestion.title,
          content: `Suggested based on your interests: ${suggestion.reason}`
        }])
        .select()
        .single();

      if (data) {
        setTabs(prev => [data, ...prev]);
        generateTabSuggestions([data, ...tabs], userInterests);
        setModal({
          type: 'success',
          data: { message: 'Suggested tab added successfully!' }
        });
        
        // Remove this suggestion from the list
        setTabSuggestions(prev => prev.filter(s => s.url !== suggestion.url));
      }
    } catch (error) {
      console.error('Error adding suggested tab:', error);
      setModal({
        type: 'error',
        data: { message: 'Failed to add suggested tab. Please try again.' }
      });
    }
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

  if (!session) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Session not found</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-black hover:underline mt-4"
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex-1">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-black mb-4 flex items-center"
            >
              ← Back to Dashboard
            </button>
            
            <div className="flex items-center gap-3 mb-2">
              {isEditingTitle ? (
                <>
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-3xl font-bold text-gray-900 bg-transparent border-b border-gray-300 focus:border-black focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={updateSessionTitle}
                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                  >
                    <FiCheck className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingTitle(false);
                      setEditedTitle(session.title);
                    }}
                    className="p-1 text-red-600 hover:bg-red-100 rounded"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-bold text-gray-900">{session.title}</h1>
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                  >
                    <FiEdit3 className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
            
            <p className="text-gray-600">
              Created {formatDate(session.created_at)} • {tabs.length} tabs • {drafts.length} drafts
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex -space-x-2 overflow-hidden">
              {onlineUsers.map((user) => (
                <div key={user.user_id} title={user.name} className="w-8 h-8 rounded-full ring-2 ring-white bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                  {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                </div>
              ))}
            </div>
            <button 
              onClick={shareSession}
              className="bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
            >
              <FiShare2 className="w-5 h-5 mr-2" />
              Share
            </button>
            <button className="bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
              <FiBookmark className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-6 py-3 border-b-2 font-medium whitespace-nowrap ${
              activeTab === 'content'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Research Content
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-6 py-3 border-b-2 font-medium whitespace-nowrap ${
              activeTab === 'ai'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            AI Insights
          </button>
          <button
            onClick={() => setActiveTab('drafts')}
            className={`px-6 py-3 border-b-2 font-medium whitespace-nowrap ${
              activeTab === 'drafts'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Drafts
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-6 py-3 border-b-2 font-medium whitespace-nowrap ${
              activeTab === 'chat'
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            AI Chat
          </button>
        </div>

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Tabs List */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Research Tabs</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{tabs.length} tabs</span>
                  <button
                    onClick={addManualTab}
                    className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm hover:bg-gray-200"
                  >
                    <FiPlus className="w-4 h-4" />
                    <span>Add Manually</span>
                  </button>
                  {currentChromeTabs.length > 0 && (
                    <button
                      onClick={() => setShowImportDialog(true)}
                      className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
                    >
                      <FiPlus className="w-4 h-4" />
                      <span>Import Tabs</span>
                    </button>
                  )}
                </div>
              </div>

              {tabs.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <FiLink className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No research tabs yet</p>
                  <p className="text-sm text-gray-500 mt-1">Add tabs manually or import from browser</p>
                </div>
              ) : (
                tabs.map((tab) => {
                  const tabSummary = summaries.find(s => s.tab_id === tab.id);
                  const isExpanded = expandedTabs.has(tab.id);

                  return (
                    <div key={tab.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div
                        className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer"
                        onClick={() => toggleTabExpansion(tab.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {isExpanded ? (
                              <FiChevronUp className="w-4 h-4 text-gray-600" />
                            ) : (
                              <FiChevronDown className="w-4 h-4 text-gray-600" />
                            )}
                            <h3 className="font-medium text-gray-900 line-clamp-1">
                              {tab.title || 'Untitled Tab'}
                            </h3>
                          </div>
                          <a
                            href={tab.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <FiExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                        {tabSummary && (
                          <div className="mt-2 flex items-center space-x-2">
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Summarized
                            </span>
                          </div>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="p-4 bg-white">
                          {tab.content ? (
                            <div className="prose prose-sm max-w-none">
                              <p className="text-gray-700">{tab.content.substring(0, 500)}...</p>
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">No content available</p>
                          )}

                          <div className="mt-4 flex space-x-2">
                            {!tabSummary && (
                              <button
                                onClick={() => generateAISummary(tab.id, tab.content || '', tab.title || '', tab.url)}
                                className="flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
                              >
                                <FiZap className="w-4 h-4" />
                                <span>AI Summary</span>
                              </button>
                            )}
                            {tabSummary && (
                              <div className="bg-gray-50 p-3 rounded">
                                <h4 className="font-medium text-sm text-gray-900 mb-2">Summary</h4>
                                <p className="text-sm text-gray-700">{tabSummary.summary}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Tab Suggestions */}
              {tabSuggestions.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Suggested Resources</h3>
                    <FiInfo className="w-4 h-4 text-gray-500" title="Based on your interests and current research" />
                  </div>
                  <div className="space-y-3">
                    {tabSuggestions.map((suggestion, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{suggestion.url}</p>
                            <p className="text-sm text-gray-700 mt-2">{suggestion.reason}</p>
                            <div className="flex items-center mt-2">
                              <span className="text-xs text-gray-500">Relevance: {(suggestion.relevance * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                          <button
                            onClick={() => addSuggestedTab(suggestion)}
                            className="ml-4 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions & AI */}
            <div className="space-y-6">
              {/* User Interests */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Research Interests</h3>
                  <button
                    onClick={() => setIsEditingInterests(!isEditingInterests)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    {isEditingInterests ? 'Done' : 'Edit'}
                  </button>
                </div>
                
                {isEditingInterests ? (
                  <div className="space-y-4">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newInterest}
                        onChange={(e) => setNewInterest(e.target.value)}
                        placeholder="Add a research interest"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:border-black focus:outline-none"
                      />
                      <select
                        value={newInterestPriority}
                        onChange={(e) => setNewInterestPriority(e.target.value as 'high' | 'medium' | 'low')}
                        className="border border-gray-300 rounded-lg px-3 py-2 focus:border-black focus:outline-none"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                      <button
                        onClick={addInterest}
                        disabled={!newInterest.trim()}
                        className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {userInterests.map((interest, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="font-medium">{interest.topic}</span>
                          <div className="flex items-center space-x-2">
                            <select
                              value={interest.priority}
                              onChange={(e) => updateInterestPriority(index, e.target.value as 'high' | 'medium' | 'low')}
                              className="text-xs border border-gray-300 rounded px-2 py-1"
                            >
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                            <button
                              onClick={() => removeInterest(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <FiX className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {userInterests.length === 0 ? (
                      <p className="text-gray-500 text-sm">No interests added yet</p>
                    ) : (
                      userInterests.map((interest, index) => (
                        <span
                          key={index}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            interest.priority === 'high'
                              ? 'bg-red-100 text-red-800'
                              : interest.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {interest.topic}
                        </span>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* AI Draft Generator */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <FiCpu className="w-6 h-6 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">AI Research Assistant</h3>
                </div>
                
                <div className="space-y-4">
                  <p className="text-blue-800 text-sm">
                    Generate comprehensive research drafts using AI analysis of your collected content
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => generateResearchDraft('outline')}
                      disabled={isGeneratingAI || tabs.length === 0}
                      className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
                    >
                      {isGeneratingAI ? (
                        <FiRefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <FiBook className="w-4 h-4" />
                      )}
                      <span>Outline</span>
                    </button>
                    
                    <button
                      onClick={() => generateResearchDraft('full')}
                      disabled={isGeneratingAI || tabs.length === 0}
                      className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
                    >
                      {isGeneratingAI ? (
                        <FiRefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <FiZap className="w-4 h-4" />
                      )}
                      <span>Full Draft</span>
                    </button>
                    
                    <button
                      onClick={() => generateResearchDraft('introduction')}
                      disabled={isGeneratingAI || tabs.length === 0}
                      className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
                    >
                      {isGeneratingAI ? (
                        <FiRefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <FiEdit2 className="w-4 h-4" />
                      )}
                      <span>Introduction</span>
                    </button>
                    
                    <button
                      onClick={() => generateResearchDraft('conclusion')}
                      disabled={isGeneratingAI || tabs.length === 0}
                      className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm"
                    >
                      {isGeneratingAI ? (
                        <FiRefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <FiCheck className="w-4 h-4" />
                      )}
                      <span>Conclusion</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Session Stats */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Session Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tabs Collected</span>
                    <span className="font-medium">{tabs.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">AI Summaries</span>
                    <span className="font-medium">{summaries.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Drafts Created</span>
                    <span className="font-medium">{drafts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Chat Messages</span>
                    <span className="font-medium">{sessionMessages.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated</span>
                    <span className="font-medium">{formatDate(session.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button 
                    onClick={exportSessionData}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-3"
                  >
                    <FiDownload className="w-5 h-5 text-gray-600" />
                    <span>Export Session Data</span>
                  </button>
                  <button 
                    onClick={duplicateSession}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-3"
                  >
                    <FiCopy className="w-5 h-5 text-gray-600" />
                    <span>Duplicate Session</span>
                  </button>
                  <button 
                    onClick={() => setModal({ type: 'delete-session' })}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-3 text-red-600"
                  >
                    <FiTrash2 className="w-5 h-5" />
                    <span>Delete Session</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Insights Tab */}
        {activeTab === 'ai' && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-6">
              <FiCpu className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-900">AI-Powered Insights</h2>
              <button
                onClick={() => generateInitialAISuggestions(tabs, summaries)}
                disabled={isGeneratingAI || tabs.length === 0}
                className="ml-auto flex items-center space-x-2 px-3 py-1 bg-purple-100 text-purple-800 rounded text-sm hover:bg-purple-200 disabled:opacity-50"
              >
                <FiRefreshCw className={`w-4 h-4 ${isGeneratingAI ? 'animate-spin' : ''}`} />
                <span>Regenerate</span>
              </button>
            </div>

            {aiSuggestions.length === 0 ? (
              <div className="text-center py-12">
                <FiSearch className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Insights Yet</h3>
                <p className="text-gray-600">
                  {tabs.length === 0 
                    ? 'Add some research tabs to generate AI insights'
                    : 'AI insights will appear here after analyzing your research content'
                  }
                </p>
                {tabs.length > 0 && (
                  <button
                    onClick={() => generateInitialAISuggestions(tabs, summaries)}
                    className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
                  >
                    Generate Insights
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {aiSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      suggestion.type === 'summary'
                        ? 'bg-blue-50 border-blue-200'
                        : suggestion.type === 'analysis'
                        ? 'bg-green-50 border-green-200'
                        : suggestion.type === 'connection'
                        ? 'bg-purple-50 border-purple-200'
                        : suggestion.type === 'outline'
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        suggestion.type === 'summary'
                          ? 'bg-blue-100 text-blue-800'
                          : suggestion.type === 'analysis'
                          ? 'bg-green-100 text-green-800'
                          : suggestion.type === 'connection'
                          ? 'bg-purple-100 text-purple-800'
                          : suggestion.type === 'outline'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {suggestion.type.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        Confidence: {(suggestion.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-gray-900 whitespace-pre-wrap">{suggestion.content}</p>
                    
                    {suggestion.type === 'outline' && (
                      <button
                        onClick={() => {
                          setCurrentDraft(suggestion.content);
                          setActiveTab('drafts');
                        }}
                        className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <FiEdit2 className="w-4 h-4 mr-1" />
                        Use this outline
                      </button>
                    )}
                    
                    <div className="mt-3 flex space-x-2">
                      <button className="text-gray-500 hover:text-blue-600 flex items-center text-sm">
                        <FiThumbsUp className="w-4 h-4 mr-1" />
                        Helpful
                      </button>
                      <button className="text-gray-500 hover:text-blue-600 flex items-center text-sm">
                        <FiThumbsDown className="w-4 h-4 mr-1" />
                        Not helpful
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Drafts Tab */}
        {activeTab === 'drafts' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Draft Editor */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Research Draft</h2>
                <span className="text-sm text-gray-600">v{draftVersion}</span>
              </div>

              <textarea
                value={currentDraft}
                onChange={(e) => setCurrentDraft(e.target.value)}
                placeholder="Start writing your research draft here, or generate one with AI..."
                className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:border-black focus:outline-none focus:ring-1 focus:ring-black resize-none"
              />

              <div className="flex space-x-3">
                <button
                  onClick={() => saveDraft(currentDraft)}
                  disabled={!currentDraft.trim()}
                  className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <FiSave className="w-4 h-4" />
                  <span>Save Draft</span>
                </button>
                <button 
                  onClick={exportSessionData}
                  className="border border-gray-300 px-6 py-2 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
                >
                  <FiDownload className="w-4 h-4" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Draft History */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Draft History</h3>
              
              {drafts.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <FiEdit2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No drafts yet</p>
                  <p className="text-sm text-gray-500 mt-1">Create your first draft to start writing</p>
                </div>
              ): (
                <div className="space-y-3">
                  {drafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setCurrentDraft(draft.content);
                        setDraftVersion(draft.version + 1);
                      }}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-900">Version {draft.version}</span>
                        <span className="text-sm text-gray-500">{formatDate(draft.created_at)}</span>
                      </div>
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {draft.content.substring(0, 200)}...
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Chat Tab */}
        {activeTab === 'chat' && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <FiMessageSquare className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">AI Research Assistant</h2>
              </div>
              <p className="text-gray-600 mt-2">Ask questions about your research and get AI-powered insights.</p>
              
              <div className="mt-4 flex items-center text-sm text-gray-500">
                <FiInfo className="w-4 h-4 mr-1" />
                <span>Only todays messages are shown here. All messages are saved to your session.</span>
              </div>
            </div>

            <div className="h-96 overflow-y-auto p-6 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="text-center py-12">
                  <FiMessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
                  <p className="text-gray-600">Ask about your research, request analysis, or get writing suggestions.</p>
                  
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={() => setChatInput("What are the main themes in my research?")}
                      className="p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <span className="font-medium">Key themes</span>
                      <p className="text-sm text-gray-600 mt-1">What are the main themes in my research?</p>
                    </button>
                    
                    <button
                      onClick={() => setChatInput("Suggest improvements for my draft")}
                      className="p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <span className="font-medium">Draft feedback</span>
                      <p className="text-sm text-gray-600 mt-1">Suggest improvements for my draft</p>
                    </button>
                    
                    <button
                      onClick={() => setChatInput("What connections exist between my sources?")}
                      className="p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <span className="font-medium">Find connections</span>
                      <p className="text-sm text-gray-600 mt-1">What connections exist between my sources?</p>
                    </button>
                    
                    <button
                      onClick={() => setChatInput("Help me structure my research paper")}
                      className="p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <span className="font-medium">Structure help</span>
                      <p className="text-sm text-gray-600 mt-1">Help me structure my research paper</p>
                    </button>
                  </div>
                </div>
              ) : (
                chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role !== 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center font-bold text-white">
                        {message.profile ? message.profile.full_name?.charAt(0) : 'A'}
                      </div>
                    )}
                    <div
                      className={`max-w-3/4 rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {message.profile && message.role !== 'user' && (
                        <p className="font-bold text-sm mb-1">{message.profile.full_name || 'User'}</p>
                      )}
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs mt-2 opacity-70">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 rounded-lg p-4 max-w-3/4">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="border-t border-gray-200 p-4">
              <form onSubmit={handleChatSubmit} className="flex space-x-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about your research..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
                  disabled={isChatLoading}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isChatLoading}
                  className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiSend className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Import Tabs Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Import Chrome Tabs</h3>
              <p className="text-gray-600 mt-1">Select tabs to import into your research session</p>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {currentChromeTabs.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-gray-600">No Chrome tabs detected</p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  <label className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                    <input 
                      type="checkbox" 
                      checked={selectedTabsToImport.size === currentChromeTabs.length}
                      onChange={selectAllTabs}
                      className="mt-1" 
                    />
                    <span className="font-medium">Select All</span>
                  </label>
                  {currentChromeTabs.map((tab) => (
                    <label key={tab.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                      <input 
                        type="checkbox" 
                        checked={selectedTabsToImport.has(tab.id)}
                        onChange={() => toggleTabSelection(tab.id)}
                        className="mt-1" 
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{tab.title}</p>
                        <p className="text-sm text-gray-600 truncate">{tab.url}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  setSelectedTabsToImport(new Set());
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => importChromeTabs(currentChromeTabs.filter(tab => selectedTabsToImport.has(tab.id)))}
                disabled={selectedTabsToImport.size === 0}
                className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
              >
                Import Selected Tabs ({selectedTabsToImport.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={modal.type === 'delete-session'}
        onClose={() => setModal({ type: '' })}
        title="Delete Session"
        actionButton={
          <button
            onClick={() => {
              deleteSession();
              setModal({ type: '' });
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Delete
          </button>
        }
      >
        <p className="text-gray-600">Are you sure you want to delete this research session? This action cannot be undone.</p>
      </Modal>

      <Modal
        isOpen={modal.type === 'ai-unavailable'}
        onClose={() => setModal({ type: '' })}
        title="AI Not Available"
        actionButton={
          <button
            onClick={() => setModal({ type: '' })}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            OK
          </button>
        }
      >
        <div className="flex items-start space-x-3">
          <FiAlertCircle className="w-6 h-6 text-yellow-500 mt-0.5" />
          <div>
            <p className="text-gray-600">{modal.data?.message}</p>
            <p className="text-sm text-gray-500 mt-2">
              Make sure youre using Chrome Canary with the Prompt API for Gemini Nano enabled.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modal.type === 'error'}
        onClose={() => setModal({ type: '' })}
        title="Error"
        actionButton={
          <button
            onClick={() => setModal({ type: '' })}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            OK
          </button>
        }
      >
        <div className="flex items-start space-x-3">
          <FiAlertCircle className="w-6 h-6 text-red-500 mt-0.5" />
          <p className="text-gray-600">{modal.data?.message}</p>
        </div>
      </Modal>

      <Modal
        isOpen={modal.type === 'success'}
        onClose={() => setModal({ type: '' })}
        title="Success"
        actionButton={
          <button
            onClick={() => setModal({ type: '' })}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            OK
          </button>
        }
      >
        <div className="flex items-start space-x-3">
          <FiCheck className="w-6 h-6 text-green-500 mt-0.5" />
          <p className="text-gray-600">{modal.data?.message}</p>
        </div>
      </Modal>
    </Layout>
  );
}