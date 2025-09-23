'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { 
  IResearchSession, 
  ITab, 
  IDraft, 
  ISummary, 
  ISessionMessage, 
  ISessionCollaborator,
  IProfile,
  ITeam,
  ITeamMember 
} from '@/types/main.db';
import {
  FiPlus, FiEdit2, FiTrash2, FiSave, FiCopy, FiDownload,
  FiExternalLink, FiZap, FiCpu, FiBook, FiLink, FiClock,
  FiUser, FiMessageSquare, FiRefreshCw, FiChevronDown,
  FiChevronUp, FiSearch, FiFilter, FiShare2, FiBookmark,
  FiSend, FiX, FiCheck, FiEdit3, FiMoreVertical, FiAlertCircle,
  FiThumbsUp, FiThumbsDown, FiStar, FiInfo, FiUsers,
  FiEye, FiEyeOff, FiLock, FiUnlock, FiGitBranch, FiGitPullRequest,
  FiArchive, FiActivity, FiBarChart2, FiTrendingUp
} from 'react-icons/fi';

interface AISuggestion {
  type: 'summary' | 'analysis' | 'connection' | 'suggestion' | 'outline';
  content: string;
  confidence: number;
}

interface AIChatMessage {
  role: 'user' | 'assistant' | 'collaborator';
  content: string;
  timestamp: Date;
  id?: string;
  profile?: { full_name?: string; avatar_url?: string; };
  user_id?: string;
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

interface CollaborationEvent {
  type: 'cursor_move' | 'text_edit' | 'selection' | 'presence';
  user_id: string;
  data: any;
  timestamp: Date;
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

// Collaborative Cursor Component
const CollaborativeCursor: React.FC<{ user: any; position: { x: number; y: number } }> = ({ user, position }) => {
  return (
    <div
      className="fixed pointer-events-none z-40 transition-all duration-100"
      style={{ left: position.x, top: position.y }}
    >
      <div className="flex items-center space-x-1 bg-black text-white px-2 py-1 rounded-full text-xs">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: user.color || '#3B82F6' }}
        ></div>
        <span>{user.name}</span>
      </div>
      <div
        className="w-4 h-4 border-2 border-white rounded-full transform -translate-x-1 -translate-y-1"
        style={{ borderColor: user.color || '#3B82F6' }}
      ></div>
    </div>
  );
};

// Real-time Presence Indicator
const PresenceIndicator: React.FC<{ users: any[] }> = ({ users }) => {
  return (
    <div className="flex items-center space-x-2">
      <div className="flex -space-x-2">
        {users.slice(0, 3).map((user, index) => (
          <div
            key={user.user_id}
            className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
            style={{ 
              backgroundColor: user.color || '#3B82F6',
              zIndex: 10 - index
            }}
            title={user.name}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
        ))}
        {users.length > 3 && (
          <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-gray-600 text-xs font-bold">
            +{users.length - 3}
          </div>
        )}
      </div>
      <span className="text-sm text-gray-600">
        {users.length} collaborator{users.length !== 1 ? 's' : ''} online
      </span>
    </div>
  );
};

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const supabase = createClient();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const draftEditorRef = useRef<HTMLTextAreaElement>(null);

  // State declarations
  const [session, setSession] = useState<IResearchSession | null>(null);
  const [tabs, setTabs] = useState<ITab[]>([]);
  const [drafts, setDrafts] = useState<IDraft[]>([]);
  const [summaries, setSummaries] = useState<ISummary[]>([]);
  const [sessionMessages, setSessionMessages] = useState<ISessionMessage[]>([]);
  const [collaborators, setCollaborators] = useState<ISessionCollaborator[]>([]);
  const [currentDraft, setCurrentDraft] = useState('');
  const [draftVersion, setDraftVersion] = useState(1);
  const [loading, setLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'ai' | 'drafts' | 'chat' | 'collaborate'>('content');
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
  const [userProfile, setUserProfile] = useState<IProfile | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [collaborationEvents, setCollaborationEvents] = useState<CollaborationEvent[]>([]);
  const [cursorPositions, setCursorPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [isCollaborativeEditing, setIsCollaborativeEditing] = useState(false);
  const [team, setTeam] = useState<ITeam | null>(null);
  const [teamMembers, setTeamMembers] = useState<ITeamMember[]>([]);
  const [sessionPermissions, setSessionPermissions] = useState<'owner' | 'editor' | 'viewer'>('viewer');

  // Missing function implementations
  const parseAISuggestions = (result: string) => {
    try {
      const suggestions: AISuggestion[] = [];
      const lines = result.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const parts = line.split('|');
        if (parts.length >= 3) {
          const type = parts[0].trim().toLowerCase();
          const confidence = parseFloat(parts[1].trim());
          const content = parts.slice(2).join('|').trim();
          
          if (['summary', 'analysis', 'connection', 'suggestion', 'outline'].includes(type) && !isNaN(confidence)) {
            suggestions.push({
              type: type as AISuggestion['type'],
              content,
              confidence
            });
          }
        }
      }
      
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('Error parsing AI suggestions:', error);
      // Fallback: create a simple summary suggestion
      setAiSuggestions([{
        type: 'summary',
        content: 'AI analysis completed. Review the research tabs for insights.',
        confidence: 0.8
      }]);
    }
  };

  const generateTabSuggestions = (tabs: ITab[], interests: UserInterest[]) => {
    const suggestions: TabSuggestion[] = [];
    
    // Generate suggestions based on existing tabs and user interests
    tabs.forEach(tab => {
      const domain = new URL(tab.url).hostname;
      const highPriorityInterests = interests.filter(i => i.priority === 'high').map(i => i.topic.toLowerCase());
      
      highPriorityInterests.forEach(interest => {
        if (tab.title.toLowerCase().includes(interest) || tab.url.toLowerCase().includes(interest)) {
          suggestions.push({
            url: `https://${domain}/search?q=${encodeURIComponent(interest)}`,
            title: `More about ${interest} on ${domain}`,
            reason: `Related to your high-priority interest in ${interest}`,
            relevance: 0.9
          });
        }
      });
    });

    // Add some general research suggestions
    if (tabs.length > 0) {
      const commonTopics = findCommonTopics(tabs);
      commonTopics.forEach(topic => {
        suggestions.push({
          url: `https://scholar.google.com/scholar?q=${encodeURIComponent(topic)}`,
          title: `Academic research on ${topic}`,
          reason: `Based on your research focus on ${topic}`,
          relevance: 0.7
        });
      });
    }

    setTabSuggestions(suggestions.slice(0, 5)); // Limit to 5 suggestions
  };

  const findCommonTopics = (tabs: ITab[]): string[] => {
    const wordFrequency = new Map<string, number>();
    
    tabs.forEach(tab => {
      const words = tab.title.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 4) { // Only consider words longer than 4 characters
          wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
        }
      });
    });

    return Array.from(wordFrequency.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);
  };

  const addManualTab = async () => {
    const url = prompt('Enter the URL:');
    const title = prompt('Enter the title:');
    
    if (!url || !title) return;

    try {
      const { data, error } = await supabase
        .from('tabs')
        .insert([{
          session_id: sessionId,
          url,
          title,
          favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`
        }])
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        setTabs(prev => [data, ...prev]);
        setModal({ type: 'success', data: { message: 'Tab added successfully!' } });
      }
    } catch (error) {
      setModal({ type: 'error', data: { message: 'Failed to add tab.' } });
    }
  };

  // Enhanced AI Functions
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
      throw new Error("No AI API available");
    } catch (error) {
      console.error('Error creating AI session:', error);
      throw error;
    }
  };

  // Enhanced AI suggestion generation with collaboration context
  const generateInitialAISuggestions = async (tabs: ITab[], summaries: ISummary[]) => {
    setIsGeneratingAI(true);
    try {
      const isAIAvailable = await checkAIAvailability();
      if (!isAIAvailable) {
        setModal({ type: 'ai-unavailable', data: { message: 'AI features are not available in your browser.' } });
        return;
      }

      const collaborationContext = onlineUsers.length > 0 
        ? `This session has ${onlineUsers.length} collaborator${onlineUsers.length !== 1 ? 's' : ''} online. `
        : '';

      const prompt = `
        Analyze this research session with collaboration context:

        ${collaborationContext}
        
        RESEARCH TABS (${tabs.length}):
        ${tabs.map(t => `- ${t.title}: ${t.url}`).join('\n')}

        Provide collaborative research insights focusing on:
        - Team coordination suggestions
        - Content organization for multiple contributors
        - Research gaps that different team members could address
        - Integration points between different research areas

        Format: TYPE|CONFIDENCE|CONTENT
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
      // Create fallback suggestions
      setAiSuggestions([{
        type: 'summary',
        content: 'Research session analysis ready. Focus on organizing findings and identifying collaboration opportunities.',
        confidence: 0.7
      }]);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Enhanced chat with collaboration awareness
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage: AIChatMessage = {
      role: 'user',
      content: chatInput,
      timestamp: new Date(),
      user_id: userProfile?.id
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const isAIAvailable = await checkAIAvailability();
      if (!isAIAvailable) {
        const aiMessage: AIChatMessage = {
          role: 'assistant',
          content: "AI features are currently unavailable in your browser.",
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, aiMessage]);
        return;
      }

      const collaborationContext = onlineUsers.length > 1 
        ? `There are ${onlineUsers.length - 1} other collaborator${onlineUsers.length - 1 !== 1 ? 's' : ''} currently online. `
        : '';

      const prompt = `
        You're assisting a research team. ${collaborationContext}
        
        Current collaborators: ${onlineUsers.map(u => u.name).join(', ')}
        User permissions: ${sessionPermissions}
        
        RESEARCH CONTENT: ${tabs.length} tabs, ${drafts.length} drafts
        USER QUESTION: ${chatInput}

        Provide collaborative, team-focused assistance.
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
      
      // Save to database
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
        content: "Error processing request. Please try again.",
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Collaborative features
  const inviteCollaborator = async (email: string, role: 'editor' | 'viewer') => {
    try {
      // Find user by email
      const { data: user } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (!user) {
        setModal({ type: 'error', data: { message: 'User not found.' } });
        return;
      }

      const { error } = await supabase
        .from('session_collaborators')
        .insert([{
          session_id: sessionId,
          user_id: user.id,
          role: role
        }]);

      if (error) throw error;

      setModal({ type: 'success', data: { message: 'Collaborator invited successfully!' } });
    } catch (error) {
      setModal({ type: 'error', data: { message: 'Failed to invite collaborator.' } });
    }
  };

  // Session management functions
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
      console.error('Error updating title:', error);
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

  // Collaborative editing handlers
  const handleDraftChange = (content: string) => {
    setCurrentDraft(content);
    
    if (isCollaborativeEditing && userProfile) {
      const collaborationChannel = supabase.channel(`session-collaboration:${sessionId}`);
      collaborationChannel.send({
        type: 'broadcast',
        event: 'text_edit',
        payload: {
          user_id: userProfile.id,
          data: { draftContent: content },
          timestamp: new Date()
        }
      });
    }
  };

  const toggleCollaborativeEditing = () => {
    if (sessionPermissions !== 'editor' && sessionPermissions !== 'owner') {
      setModal({
        type: 'error',
        data: { message: 'You need editor permissions to enable collaborative editing.' }
      });
      return;
    }
    setIsCollaborativeEditing(!isCollaborativeEditing);
  };

  // Generate user color for collaboration
  const generateUserColor = (userId: string) => {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];
    const index = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  // Real-time subscriptions
  useEffect(() => {
    if (!sessionId) return;

    // Presence channel for real-time collaboration
    const presenceChannel = supabase.channel(`session-presence:${sessionId}`, {
      config: {
        presence: {
          key: userProfile?.id || '',
        },
      },
    });

    // Collaboration events channel
    const collaborationChannel = supabase.channel(`session-collaboration:${sessionId}`);

    // Set up real-time subscriptions
    const setupRealtime = async () => {
      // Presence tracking
      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const presenceState = presenceChannel.presenceState();
          const users = Object.values(presenceState).flat().map((presence: any) => ({
            ...presence,
            color: generateUserColor(presence.user_id)
          }));
          setOnlineUsers(users);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED' && userProfile) {
            await presenceChannel.track({
              user_id: userProfile.id,
              name: userProfile.full_name || userProfile.email,
              avatar: userProfile.avatar_url,
              last_seen: new Date().toISOString(),
            });
          }
        });

      // Collaboration events
      collaborationChannel
        .on('broadcast', { event: 'cursor_move' }, (payload) => {
          const event = payload.payload;
          setCursorPositions(prev => new Map(prev.set(event.user_id, event.data.position)));
        })
        .on('broadcast', { event: 'text_edit' }, (payload) => {
          const event = payload.payload;
          // Handle collaborative text editing
          if (event.data.draftContent && sessionPermissions === 'editor') {
            setCurrentDraft(event.data.draftContent);
          }
        })
        .subscribe();

      // Database changes subscriptions
      const tabsSubscription = supabase
        .channel('tabs-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'tabs', filter: `session_id=eq.${sessionId}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setTabs(prev => [payload.new as ITab, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setTabs(prev => prev.map(tab => tab.id === payload.new.id ? payload.new as ITab : tab));
            } else if (payload.eventType === 'DELETE') {
              setTabs(prev => prev.filter(tab => tab.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      const draftsSubscription = supabase
        .channel('drafts-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'drafts', filter: `session_id=eq.${sessionId}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              setDrafts(prev => [payload.new as IDraft, ...prev]);
            }
          }
        )
        .subscribe();

      const messagesSubscription = supabase
        .channel('messages-changes')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'session_messages', filter: `session_id=eq.${sessionId}` },
          async (payload) => {
            const newMessage = payload.new as ISessionMessage;
            let profile = null;

            if (newMessage.user_id) {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', newMessage.user_id)
                .single();
              profile = profileData;
            }

            const chatMessage: AIChatMessage = {
              role: newMessage.sender as 'user' | 'assistant' | 'collaborator',
              content: newMessage.content,
              timestamp: new Date(newMessage.created_at),
              id: newMessage.id,
              profile: profile,
              user_id: newMessage.user_id
            };

            setChatMessages(prev => {
              if (prev.find(msg => msg.id === chatMessage.id)) return prev;
              return [...prev, chatMessage];
            });
          }
        )
        .subscribe();

      return () => {
        presenceChannel.unsubscribe();
        collaborationChannel.unsubscribe();
        tabsSubscription.unsubscribe();
        draftsSubscription.unsubscribe();
        messagesSubscription.unsubscribe();
      };
    };

    if (userProfile) {
      setupRealtime();
    }

    return () => {
      presenceChannel.unsubscribe();
      collaborationChannel.unsubscribe();
    };
  }, [sessionId, userProfile, supabase, sessionPermissions]);

  // Track cursor movement for collaboration
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!userProfile || !isCollaborativeEditing) return;

      const collaborationChannel = supabase.channel(`session-collaboration:${sessionId}`);
      collaborationChannel.send({
        type: 'broadcast',
        event: 'cursor_move',
        payload: {
          user_id: userProfile.id,
          data: { position: { x: e.clientX, y: e.clientY } },
          timestamp: new Date()
        }
      });
    };

    if (isCollaborativeEditing) {
      document.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isCollaborativeEditing, userProfile, sessionId, supabase]);

  // Load session data
  const loadSessionData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/sign-in');
        return;
      }

      // Load user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setUserProfile(profile);

      // Load session data
      const { data: sessionData } = await supabase
        .from('research_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!sessionData) {
        router.push('/dashboard');
        return;
      }

      // Check permissions and load team data if applicable
      let userRole: 'owner' | 'editor' | 'viewer' = 'viewer';
      
      if (sessionData.user_id === user.id) {
        userRole = 'owner';
      } else if (sessionData.team_id) {
        // Check team membership
        const { data: teamMember } = await supabase
          .from('team_members')
          .select('role')
          .eq('team_id', sessionData.team_id)
          .eq('user_id', user.id)
          .single();

        if (teamMember) {
          userRole = teamMember.role === 'owner' || teamMember.role === 'admin' ? 'editor' : 'viewer';
        }
      }

      // Check collaboration access
      const { data: collaborator } = await supabase
        .from('session_collaborators')
        .select('role')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (collaborator) {
        userRole = collaborator.role === 'editor' ? 'editor' : 'viewer';
      }

      setSessionPermissions(userRole);

      // Load team data if session belongs to a team
      if (sessionData.team_id) {
        const { data: teamData } = await supabase
          .from('teams')
          .select('*')
          .eq('id', sessionData.team_id)
          .single();
        setTeam(teamData);

        const { data: membersData } = await supabase
          .from('team_members')
          .select('*')
          .eq('team_id', sessionData.team_id);
        setTeamMembers(membersData || []);
      }

      // Load collaborators
      const { data: collaboratorsData } = await supabase
        .from('session_collaborators')
        .select('*, profiles(full_name, avatar_url)')
        .eq('session_id', sessionId);
      setCollaborators(collaboratorsData || []);

      // Load session content
      const [tabsResponse, draftsResponse, summariesResponse, messagesResponse] = await Promise.all([
        supabase.from('tabs').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }),
        supabase.from('drafts').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }),
        supabase.from('summaries').select('*'),
        supabase.from('session_messages')
          .select('*, profiles(full_name, avatar_url)')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true })
      ]);

      if (sessionData) {
        setSession(sessionData);
        setEditedTitle(sessionData.title);
      }
      if (tabsResponse.data) setTabs(tabsResponse.data);
      if (draftsResponse.data) {
        setDrafts(draftsResponse.data);
        if (draftsResponse.data.length > 0) {
          setCurrentDraft(draftsResponse.data[0].content);
          setDraftVersion(draftsResponse.data[0].version + 1);
        }
      }
      if (summariesResponse.data) setSummaries(summariesResponse.data);
      if (messagesResponse.data) {
        setSessionMessages(messagesResponse.data);
        const chatMsgs = messagesResponse.data.map(msg => ({
          role: msg.sender as 'user' | 'assistant' | 'collaborator',
          content: msg.content,
          timestamp: new Date(msg.created_at),
          id: msg.id,
          profile: msg.profiles,
          user_id: msg.user_id
        }));
        setChatMessages(chatMsgs);
      }

      // Load user interests
      const savedInterests = localStorage.getItem(`userInterests-${user.id}`);
      if (savedInterests) {
        setUserInterests(JSON.parse(savedInterests));
      }

      if (tabsResponse.data && tabsResponse.data.length > 0) {
        generateInitialAISuggestions(tabsResponse.data, summariesResponse.data || []);
        generateTabSuggestions(tabsResponse.data, userInterests);
      }

    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadSessionData();
  }, [sessionId]);

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
            <button onClick={() => router.push('/dashboard')} className="text-black hover:underline mt-4">
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
        {/* Enhanced Header with Collaboration Status */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex-1">
            <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-black mb-4 flex items-center">
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
                  <button onClick={updateSessionTitle} className="p-1 text-green-600 hover:bg-green-100 rounded">
                    <FiCheck className="w-5 h-5" />
                  </button>
                  <button onClick={() => setIsEditingTitle(false)} className="p-1 text-red-600 hover:bg-red-100 rounded">
                    <FiX className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <>
                  <h1 className="text-3xl font-bold text-gray-900">{session.title}</h1>
                  {(sessionPermissions === 'owner' || sessionPermissions === 'editor') && (
                    <button onClick={() => setIsEditingTitle(true)} className="p-1 text-gray-600 hover:bg-gray-100 rounded">
                      <FiEdit3 className="w-5 h-5" />
                    </button>
                  )}
                </>
              )}
            </div>
            
            <div className="flex items-center space-x-4 text-gray-600">
              <span>Created {new Date(session.created_at).toLocaleDateString()}</span>
              <span>•</span>
              <span>{tabs.length} tabs</span>
              <span>•</span>
              <span>{drafts.length} drafts</span>
              {team && (
                <>
                  <span>•</span>
                  <span className="flex items-center">
                    <FiUsers className="w-4 h-4 mr-1" />
                    Team: {team.name}
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <PresenceIndicator users={onlineUsers} />
            
            <div className="flex items-center space-x-2">
              <button 
                onClick={toggleCollaborativeEditing}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
                  isCollaborativeEditing 
                    ? 'bg-green-100 text-green-800 border border-green-300' 
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {isCollaborativeEditing ? <FiGitBranch className="w-5 h-5 mr-2" /> : <FiGitPullRequest className="w-5 h-5 mr-2" />}
                {isCollaborativeEditing ? 'Collaborating' : 'Collaborate'}
              </button>
              
              <button 
                onClick={() => setModal({ type: 'invite-collaborator' })}
                className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center"
                disabled={sessionPermissions === 'viewer'}
              >
                <FiUser className="w-5 h-5 mr-2" />
                Invite
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Navigation Tabs */}
        <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
          {['content', 'ai', 'drafts', 'chat', 'collaborate'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-3 border-b-2 font-medium whitespace-nowrap capitalize ${
                activeTab === tab
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'ai' ? 'AI Insights' : 
               tab === 'collaborate' ? `Collaborate ${onlineUsers.length > 0 ? `(${onlineUsers.length})` : ''}` :
               tab}
            </button>
          ))}
        </div>

        {/* Collaborative Cursors */}
        {isCollaborativeEditing && Array.from(cursorPositions.entries()).map(([userId, position]) => {
          const user = onlineUsers.find(u => u.user_id === userId);
          return user ? <CollaborativeCursor key={userId} user={user} position={position} /> : null;
        })}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Tabs List */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Research Tabs</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{tabs.length} tabs</span>
                  {(sessionPermissions === 'owner' || sessionPermissions === 'editor') && (
                    <>
                      <button onClick={addManualTab} className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm hover:bg-gray-200">
                        <FiPlus className="w-4 h-4" />
                        <span>Add</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {tabs.map((tab) => (
                  <div key={tab.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <img src={tab.favicon} alt="" className="w-5 h-5" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{tab.title}</h3>
                          <p className="text-sm text-gray-600 truncate">{tab.url}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <a href={tab.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-600">
                          <FiExternalLink className="w-4 h-4" />
                        </a>
                        {(sessionPermissions === 'owner' || sessionPermissions === 'editor') && (
                          <button className="text-gray-400 hover:text-red-600">
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {tabs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FiBook className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No research tabs yet. Start by adding some URLs.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions & Stats */}
            <div className="space-y-6">
              {/* Enhanced Stats with Collaboration */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Session Overview</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Collaborators</span>
                    <span className="font-medium">{onlineUsers.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Your Role</span>
                    <span className={`font-medium capitalize ${
                      sessionPermissions === 'owner' ? 'text-green-600' :
                      sessionPermissions === 'editor' ? 'text-blue-600' : 'text-gray-600'
                    }`}>
                      {sessionPermissions}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tabs Collected</span>
                    <span className="font-medium">{tabs.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">AI Summaries</span>
                    <span className="font-medium">{summaries.length}</span>
                  </div>
                </div>
              </div>

              {/* Real-time Activity Feed */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {onlineUsers.slice(0, 3).map((user) => (
                    <div key={user.user_id} className="flex items-center space-x-3">
                      <div 
                        className="w-3 h-3 rounded-full animate-pulse"
                        style={{ backgroundColor: user.color }}
                      ></div>
                      <span className="text-sm text-gray-600">{user.name} is online</span>
                    </div>
                  ))}
                  {onlineUsers.length === 0 && (
                    <p className="text-sm text-gray-500">No recent activity</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Collaborate Tab */}
        {activeTab === 'collaborate' && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-6">
              <FiUsers className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Collaboration Hub</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Online Collaborators */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Online Now</h3>
                {onlineUsers.length > 0 ? (
                  onlineUsers.map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: user.color }}
                        ></div>
                        <span className="font-medium">{user.name}</span>
                        {user.user_id === userProfile?.id && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">You</span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">Active</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">No collaborators online</p>
                )}
              </div>

              {/* Collaboration Tools */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Collaboration Tools</h3>
                
                <button
                  onClick={toggleCollaborativeEditing}
                  className={`w-full text-left p-4 border rounded-lg transition-colors ${
                    isCollaborativeEditing
                      ? 'border-green-300 bg-green-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Live Collaborative Editing</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {isCollaborativeEditing ? 'Enabled - others can see your cursor' : 'Enable real-time editing'}
                      </p>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${isCollaborativeEditing ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  </div>
                </button>

                <button className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <h4 className="font-medium">Assign Research Tasks</h4>
                  <p className="text-sm text-gray-600 mt-1">Delegate specific research areas to collaborators</p>
                </button>

                <button className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <h4 className="font-medium">Version History</h4>
                  <p className="text-sm text-gray-600 mt-1">Track changes and collaborate effectively</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Insights Tab */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">AI Research Insights</h2>
              <button 
                onClick={() => generateInitialAISuggestions(tabs, summaries)}
                disabled={isGeneratingAI}
                className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
              >
                <FiRefreshCw className={`w-4 h-4 ${isGeneratingAI ? 'animate-spin' : ''}`} />
                <span>{isGeneratingAI ? 'Generating...' : 'Refresh Insights'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {aiSuggestions.map((suggestion, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      suggestion.type === 'summary' ? 'bg-blue-100 text-blue-800' :
                      suggestion.type === 'analysis' ? 'bg-green-100 text-green-800' :
                      suggestion.type === 'connection' ? 'bg-purple-100 text-purple-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {suggestion.type}
                    </span>
                    <span className="text-sm text-gray-500">{Math.round(suggestion.confidence * 100)}% confidence</span>
                  </div>
                  <p className="text-gray-700">{suggestion.content}</p>
                </div>
              ))}
            </div>

            {aiSuggestions.length === 0 && (
              <div className="text-center py-12">
                <FiCpu className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No AI Insights Yet</h3>
                <p className="text-gray-600 mb-4">Generate AI insights to get research suggestions and analysis.</p>
                <button 
                  onClick={() => generateInitialAISuggestions(tabs, summaries)}
                  className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800"
                >
                  Generate Insights
                </button>
              </div>
            )}
          </div>
        )}

        {/* Drafts Tab */}
        {activeTab === 'drafts' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Research Draft</h2>
                <button 
                  onClick={() => saveDraft(currentDraft)}
                  className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
                >
                  <FiSave className="w-4 h-4" />
                  <span>Save Draft</span>
                </button>
              </div>
              
              <textarea
                ref={draftEditorRef}
                value={currentDraft}
                onChange={(e) => handleDraftChange(e.target.value)}
                placeholder="Start writing your research findings..."
                className="w-full h-96 border border-gray-300 rounded-lg p-4 focus:border-black focus:outline-none resize-none"
                disabled={sessionPermissions === 'viewer'}
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Draft Versions</h3>
              <div className="space-y-3">
                {drafts.map((draft) => (
                  <div key={draft.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Version {draft.version}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(draft.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{draft.content.substring(0, 100)}...</p>
                  </div>
                ))}
                {drafts.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No saved drafts yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="bg-white border border-gray-200 rounded-lg h-96 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Research Assistant</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md rounded-lg p-3 ${
                    message.role === 'user' ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <span className="text-xs opacity-70 block mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleChatSubmit} className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about your research..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:border-black focus:outline-none"
                  disabled={isChatLoading}
                />
                <button 
                  type="submit" 
                  disabled={isChatLoading}
                  className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
                >
                  <FiSend className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal
        isOpen={modal.type === 'invite-collaborator'}
        onClose={() => setModal({ type: '' })}
        title="Invite Collaborator"
        actionButton={
          <button
            onClick={() => {
              const email = (document.getElementById('collaborator-email') as HTMLInputElement)?.value;
              const role = (document.getElementById('collaborator-role') as HTMLSelectElement)?.value as 'editor' | 'viewer';
              if (email) inviteCollaborator(email, role);
            }}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
          >
            Send Invite
          </button>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              id="collaborator-email"
              type="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-black focus:outline-none"
              placeholder="collaborator@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              id="collaborator-role"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-black focus:outline-none"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modal.type === 'success'}
        onClose={() => setModal({ type: '' })}
        title="Success"
      >
        <p className="text-gray-700">{modal.data?.message}</p>
      </Modal>

      <Modal
        isOpen={modal.type === 'error'}
        onClose={() => setModal({ type: '' })}
        title="Error"
      >
        <p className="text-gray-700">{modal.data?.message}</p>
      </Modal>
    </Layout>
  );
}