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
  FiArchive, FiActivity, FiBarChart2, FiTrendingUp, FiType,
  FiBold, FiItalic, FiUnderline, FiList, FiAlignLeft,
  FiAlignCenter, FiAlignRight, FiLink2, FiImage, FiTag,
  FiFolder, FiGrid, FiSidebar, FiDatabase, FiCloud,
  FiWifi, FiWifiOff, FiUpload, FiDownloadCloud, FiSettings
} from 'react-icons/fi';

// Real-time Collaboration Hook
const useCollaboration = (sessionId: string, userId: string) => {
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [isCollaborativeEditing, setIsCollaborativeEditing] = useState(false);
  const [cursorPositions, setCursorPositions] = useState<Record<string, any>>({});
  const supabase = createClient();

  useEffect(() => {
    if (!sessionId) return;

    // Subscribe to presence channel
    const channel = supabase.channel(`session:${sessionId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat() as any[];
        setOnlineUsers(users.filter(user => user.user_id !== userId));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
            cursor_position: null
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId, userId]);

  return {
    onlineUsers,
    isCollaborativeEditing,
    setIsCollaborativeEditing,
    cursorPositions
  };
};

// AI Service Hook
const useAIService = () => {
  const generateSummary = async (content: string, type: 'tab' | 'draft') => {
    // Simulate AI summary generation
    return new Promise<string>((resolve) => {
      setTimeout(() => {
        const summaries = {
          tab: `Summary: This content discusses ${content.split(' ').slice(0, 5).join(' ')}... Key points include relevant information about the topic.`,
          draft: `Draft Analysis: Your research shows focus on ${content.split(' ').slice(0, 10).join(' ')}. Consider structuring around these main themes.`
        };
        resolve(summaries[type]);
      }, 1000);
    });
  };

  const chatWithAI = async (message: string, context: { tabs: ITab[], drafts: IDraft[] }) => {
    // Simulate AI chat response
    return new Promise<string>((resolve) => {
      setTimeout(() => {
        const responses = [
          "Based on your research, I notice you're focusing on several key areas. Would you like me to help organize these findings?",
          "I've analyzed your content and found some interesting connections between your sources. Would you like me to elaborate?",
          "Your research shows strong thematic consistency. Consider creating sections for each major topic you've covered.",
          "I can help you synthesize these findings into a cohesive research paper. Would you like me to generate an outline?"
        ];
        resolve(responses[Math.floor(Math.random() * responses.length)]);
      }, 1500);
    });
  };

  return { generateSummary, chatWithAI };
};

// Enhanced Rich Text Editor with Collaboration
const CollaborativeEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onlineUsers?: any[];
  currentUser?: IProfile | null;
}> = ({ value, onChange, placeholder = "Start writing your research findings...", disabled = false, onlineUsers = [], currentUser }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  
  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden relative">
      {/* Collaboration Status Bar */}
      {onlineUsers.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center space-x-2">
            <div className="flex -space-x-2">
              {onlineUsers.slice(0, 3).map((user, index) => (
                <div key={user.user_id} className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </div>
              ))}
              {onlineUsers.length > 3 && (
                <div className="w-6 h-6 bg-blue-300 rounded-full flex items-center justify-center text-blue-700 text-xs">
                  +{onlineUsers.length - 3}
                </div>
              )}
            </div>
            <span className="text-sm text-blue-700">{onlineUsers.length} collaborator(s) online</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-blue-700">Live</span>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
        <button 
          type="button" 
          onClick={() => formatText('bold')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Bold"
        >
          <FiBold className="w-4 h-4" />
        </button>
        <button 
          type="button" 
          onClick={() => formatText('italic')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Italic"
        >
          <FiItalic className="w-4 h-4" />
        </button>
        <button 
          type="button" 
          onClick={() => formatText('underline')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Underline"
        >
          <FiUnderline className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button 
          type="button" 
          onClick={() => formatText('justifyLeft')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Align Left"
        >
          <FiAlignLeft className="w-4 h-4" />
        </button>
        <button 
          type="button" 
          onClick={() => formatText('justifyCenter')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Align Center"
        >
          <FiAlignCenter className="w-4 h-4" />
        </button>
        <button 
          type="button" 
          onClick={() => formatText('justifyRight')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Align Right"
        >
          <FiAlignRight className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button 
          type="button" 
          onClick={() => formatText('insertUnorderedList')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Bullet List"
        >
          <FiList className="w-4 h-4" />
        </button>
        <button 
          type="button" 
          onClick={() => formatText('createLink', prompt('Enter URL:'))}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Insert Link"
        >
          <FiLink2 className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button 
          type="button" 
          onClick={() => formatText('formatBlock', '<h1>')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Heading 1"
        >
          <FiType className="w-4 h-4" />
        </button>
        <button 
          type="button" 
          onClick={() => formatText('formatBlock', '<h2>')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Heading 2"
        >
          <span className="text-sm font-bold">H2</span>
        </button>
        <button 
          type="button" 
          onClick={() => formatText('formatBlock', '<blockquote>')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Quote"
        >
          <FiAlignLeft className="w-4 h-4 transform rotate-180" />
        </button>
      </div>
      
      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onPaste={handlePaste}
        className="min-h-96 p-4 focus:outline-none prose prose-sm max-w-none bg-white"
        dangerouslySetInnerHTML={{ __html: value || placeholder }}
        style={{ 
          fontFamily: "'Inter', sans-serif",
          lineHeight: '1.6',
          minHeight: '400px'
        }}
      />
    </div>
  );
};

// Enhanced Modal Component
const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actionButton?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}> = ({ isOpen, onClose, title, children, actionButton, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`bg-white rounded-xl shadow-2xl ${sizeClasses[size]} w-full max-h-[90vh] overflow-y-auto`}>
        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
        {actionButton && (
          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3 sticky bottom-0 bg-white">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
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

// Add/Edit Tab Modal
const TabModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (tab: Partial<ITab>) => void;
  editingTab?: ITab | null;
}> = ({ isOpen, onClose, onSave, editingTab }) => {
  const [url, setUrl] = useState(editingTab?.url || '');
  const [title, setTitle] = useState(editingTab?.title || '');
  const [content, setContent] = useState(editingTab?.content || '');
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (editingTab) {
      setUrl(editingTab.url);
      setTitle(editingTab.title || '');
      setContent(editingTab.content || '');
    } else {
      setUrl('');
      setTitle('');
      setContent('');
    }
  }, [editingTab]);

  const fetchPageInfo = async (url: string) => {
    if (!url) return;
    
    try {
      setIsFetching(true);
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      
      const domain = new URL(url).hostname;
      if (!title) {
        setTitle(domain);
      }
      
      // Simulate content fetching
      setTimeout(() => {
        setContent(`Content preview from ${domain}. This would be the actual content fetched from the URL in a real implementation.`);
        setIsFetching(false);
      }, 1000);
      
    } catch (error) {
      setTitle(new URL(url).hostname);
      setIsFetching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSave({
        id: editingTab?.id,
        url,
        title: title || new URL(url).hostname,
        content,
        favicon: editingTab?.favicon || `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`
      });
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingTab ? 'Edit Tab' : 'Add Research Tab'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (e.target.value.length > 10) {
                fetchPageInfo(e.target.value);
              }
            }}
            placeholder="https://example.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Page title"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Content/Notes</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add your notes or let the system fetch content automatically..."
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {isFetching && (
            <p className="text-sm text-gray-500 mt-1">Fetching content...</p>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!url.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {editingTab ? 'Update Tab' : 'Add Tab'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// AI Chat Component
const AIChat: React.FC<{
  messages: ISessionMessage[];
  onSendMessage: (content: string) => void;
  isLoading: boolean;
}> = ({ messages, onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md rounded-lg p-4 ${
              message.sender === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-gray-100 text-gray-900 rounded-bl-none'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <span className={`text-xs block mt-2 ${
                message.sender === 'user' ? 'text-blue-200' : 'text-gray-500'
              }`}>
                {new Date(message.created_at).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 rounded-lg rounded-bl-none p-4">
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

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI about your research..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button 
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center"
          >
            <FiSend className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default function AdvancedSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const supabase = createClient();
  
  // State declarations
  const [session, setSession] = useState<IResearchSession | null>(null);
  const [tabs, setTabs] = useState<ITab[]>([]);
  const [drafts, setDrafts] = useState<IDraft[]>([]);
  const [summaries, setSummaries] = useState<ISummary[]>([]);
  const [currentDraft, setCurrentDraft] = useState('');
  const [draftVersion, setDraftVersion] = useState(1);
  const [loading, setLoading] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'ai' | 'drafts' | 'chat' | 'collaborate'>('content');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [chatMessages, setChatMessages] = useState<ISessionMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [modal, setModal] = useState<{ type: string; data?: any }>({ type: '' });
  const [userProfile, setUserProfile] = useState<IProfile | null>(null);
  const [sessionPermissions, setSessionPermissions] = useState<'owner' | 'editor' | 'viewer'>('viewer');
  const [showTabModal, setShowTabModal] = useState(false);
  const [editingTab, setEditingTab] = useState<ITab | null>(null);
  const [collaborators, setCollaborators] = useState<ISessionCollaborator[]>([]);

  // Hooks
  const { onlineUsers, isCollaborativeEditing, setIsCollaborativeEditing } = useCollaboration(sessionId, userProfile?.id || '');
  const { generateSummary, chatWithAI } = useAIService();

  // CRUD Operations
  // Create Tab
  const createTab = async (tabData: Partial<ITab>) => {
    try {
      const { data, error } = await supabase
        .from('tabs')
        .insert([{
          session_id: sessionId,
          url: tabData.url,
          title: tabData.title,
          content: tabData.content,
          favicon: tabData.favicon
        }])
        .select()
        .single();

      if (error) throw error;
      
      setTabs(prev => [data, ...prev]);
      setModal({ type: 'success', data: { message: 'Tab created successfully!' } });
      
      // Auto-generate summary
      if (data.content) {
        const summary = await generateSummary(data.content, 'tab');
        await createSummary(data.id, summary);
      }
    } catch (error: any) {
      setModal({ type: 'error', data: { message: error.message || 'Failed to create tab.' } });
    }
  };

  // Update Tab
  const updateTab = async (tabData: Partial<ITab>) => {
    try {
      const { data, error } = await supabase
        .from('tabs')
        .update({
          url: tabData.url,
          title: tabData.title,
          content: tabData.content
        })
        .eq('id', tabData.id)
        .select()
        .single();

      if (error) throw error;
      
      setTabs(prev => prev.map(tab => tab.id === tabData.id ? data : tab));
      setModal({ type: 'success', data: { message: 'Tab updated successfully!' } });
    } catch (error: any) {
      setModal({ type: 'error', data: { message: error.message || 'Failed to update tab.' } });
    }
  };

  // Delete Tab
  const deleteTab = async (tabId: string) => {
    if (!confirm('Are you sure you want to delete this tab?')) return;
    
    try {
      const { error } = await supabase
        .from('tabs')
        .delete()
        .eq('id', tabId);

      if (error) throw error;
      
      setTabs(prev => prev.filter(tab => tab.id !== tabId));
      setModal({ type: 'success', data: { message: 'Tab deleted successfully!' } });
    } catch (error: any) {
      setModal({ type: 'error', data: { message: error.message || 'Failed to delete tab.' } });
    }
  };

  // Create Summary
  const createSummary = async (tabId: string, summaryText: string) => {
    try {
      const { data, error } = await supabase
        .from('summaries')
        .insert([{
          tab_id: tabId,
          summary: summaryText
        }])
        .select()
        .single();

      if (error) throw error;
      
      setSummaries(prev => [data, ...prev]);
    } catch (error) {
      console.error('Error creating summary:', error);
    }
  };

  // Save Draft
  const saveDraft = async () => {
    if (!sessionId || !currentDraft.trim()) {
      setModal({ type: 'error', data: { message: 'Cannot save empty draft.' } });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('drafts')
        .insert([{
          session_id: sessionId,
          content: currentDraft,
          version: draftVersion
        }])
        .select()
        .single();

      if (error) throw error;
      
      setDrafts(prev => [data, ...prev]);
      setDraftVersion(prev => prev + 1);
      setModal({ type: 'success', data: { message: 'Draft saved successfully!' } });
    } catch (error: any) {
      setModal({ type: 'error', data: { message: error.message || 'Failed to save draft.' } });
    }
  };

  // Update Session Title
  const updateSessionTitle = async () => {
    if (!sessionId || !editedTitle.trim()) return;

    try {
      const { data, error } = await supabase
        .from('research_sessions')
        .update({ title: editedTitle })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      
      setSession(data);
      setIsEditingTitle(false);
      setModal({ type: 'success', data: { message: 'Title updated successfully!' } });
    } catch (error: any) {
      setModal({ type: 'error', data: { message: error.message || 'Failed to update title.' } });
    }
  };

  // AI Chat
  const sendChatMessage = async (content: string) => {
    const userMessage: ISessionMessage = {
      id: Date.now().toString(),
      session_id: sessionId,
      user_id: userProfile?.id,
      content,
      sender: 'user',
      created_at: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setIsChatLoading(true);

    try {
      const aiResponse = await chatWithAI(content, { tabs, drafts });
      const aiMessage: ISessionMessage = {
        id: (Date.now() + 1).toString(),
        session_id: sessionId,
        content: aiResponse,
        sender: 'ai',
        created_at: new Date()
      };

      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
    } finally {
      setIsChatLoading(false);
    }
  };

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

      // Load session
      const { data: sessionData } = await supabase
        .from('research_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!sessionData) {
        router.push('/dashboard');
        return;
      }

      setSession(sessionData);
      setEditedTitle(sessionData.title);

      // Check permissions
      if (sessionData.user_id === user.id) {
        setSessionPermissions('owner');
      } else {
        const { data: collaborator } = await supabase
          .from('session_collaborators')
          .select('role')
          .eq('session_id', sessionId)
          .eq('user_id', user.id)
          .single();
        
        setSessionPermissions(collaborator?.role || 'viewer');
      }

      // Load all data
      const [tabsResponse, draftsResponse, summariesResponse, collaboratorsResponse, messagesResponse] = await Promise.all([
        supabase.from('tabs').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }),
        supabase.from('drafts').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }),
        supabase.from('summaries').select('*').eq('session_id', sessionId),
        supabase.from('session_collaborators').select('*').eq('session_id', sessionId),
        supabase.from('session_messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true })
      ]);

      if (tabsResponse.data) setTabs(tabsResponse.data);
      if (draftsResponse.data) {
        setDrafts(draftsResponse.data);
        if (draftsResponse.data.length > 0) {
          setCurrentDraft(draftsResponse.data[0].content);
          setDraftVersion(Math.max(...draftsResponse.data.map(d => d.version)) + 1);
        }
      }
      if (summariesResponse.data) setSummaries(summariesResponse.data);
      if (collaboratorsResponse.data) setCollaborators(collaboratorsResponse.data);
      if (messagesResponse.data) setChatMessages(messagesResponse.data);

    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (sessionId) {
      loadSessionData();
    }
  }, [sessionId]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Session not found</h1>
            <button 
              onClick={() => router.push('/dashboard')} 
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div className="flex-1">
            <button 
              onClick={() => router.push('/dashboard')} 
              className="text-gray-600 hover:text-black mb-4 flex items-center transition-colors"
            >
              ← Back to Dashboard
            </button>
            
            <div className="flex items-center gap-3 mb-2">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-3xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none"
                    autoFocus
                    onKeyPress={(e) => e.key === 'Enter' && updateSessionTitle()}
                  />
                  <button onClick={updateSessionTitle} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                    <FiCheck className="w-5 h-5" />
                  </button>
                  <button onClick={() => setIsEditingTitle(false)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <FiX className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold text-gray-900">{session.title}</h1>
                  {(sessionPermissions === 'owner' || sessionPermissions === 'editor') && (
                    <button 
                      onClick={() => setIsEditingTitle(true)} 
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <FiEdit3 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-4 text-gray-600">
              <span className="flex items-center">
                <FiClock className="w-4 h-4 mr-1" />
                Created {new Date(session.created_at).toLocaleDateString()}
              </span>
              <span>•</span>
              <span className="flex items-center">
                <FiBook className="w-4 h-4 mr-1" />
                {tabs.length} research tabs
              </span>
              <span>•</span>
              <span className="flex items-center">
                <FiEdit2 className="w-4 h-4 mr-1" />
                {drafts.length} drafts
              </span>
              <span>•</span>
              <span className="flex items-center">
                <FiUsers className="w-4 h-4 mr-1" />
                {collaborators.length + 1} collaborators
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => setIsCollaborativeEditing(!isCollaborativeEditing)}
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
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center transition-colors"
            >
              <FiUser className="w-5 h-5 mr-2" />
              Invite
            </button>

            <button 
              onClick={() => {/* Export functionality */}}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 flex items-center transition-colors"
            >
              <FiDownload className="w-5 h-5 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
          {[
            { id: 'content', label: 'Research Content', icon: FiBook },
            { id: 'ai', label: 'AI Insights', icon: FiZap },
            { id: 'drafts', label: 'Drafts', icon: FiEdit2 },
            { id: 'chat', label: 'AI Chat', icon: FiMessageSquare },
            { id: 'collaborate', label: `Collaborate ${onlineUsers.length > 0 ? `(${onlineUsers.length})` : ''}`, icon: FiUsers }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 px-6 py-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Research Tabs</p>
                    <p className="text-2xl font-bold text-gray-900">{tabs.length}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FiBook className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Drafts</p>
                    <p className="text-2xl font-bold text-gray-900">{drafts.length}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <FiEdit2 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">AI Insights</p>
                    <p className="text-2xl font-bold text-gray-900">{aiSuggestions.length}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <FiZap className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Collaborators</p>
                    <p className="text-2xl font-bold text-gray-900">{onlineUsers.length}</p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <FiUsers className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h2 className="text-xl font-semibold text-gray-900">Research Tabs</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">{tabs.length} tabs collected</span>
                    {(sessionPermissions === 'owner' || sessionPermissions === 'editor') && (
                      <button 
                        onClick={() => {
                          setEditingTab(null);
                          setShowTabModal(true);
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center transition-colors"
                      >
                        <FiPlus className="w-4 h-4 mr-2" />
                        Add Tab
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6">
                {tabs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tabs.map((tab) => (
                      <div key={tab.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors group">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1 min-w-0">
                            <img 
                              src={tab.favicon} 
                              alt="" 
                              className="w-6 h-6 mt-1 flex-shrink-0" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/images/default-favicon.png';
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">{tab.title || 'Untitled'}</h3>
                              <p className="text-sm text-gray-600 truncate">{tab.url}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Added {new Date(tab.created_at).toLocaleDateString()}
                              </p>
                              {tab.content && (
                                <p className="text-sm text-gray-700 mt-2 line-clamp-2">{tab.content}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a 
                              href={tab.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Open in new tab"
                            >
                              <FiExternalLink className="w-4 h-4" />
                            </a>
                            {(sessionPermissions === 'owner' || sessionPermissions === 'editor') && (
                              <>
                                <button 
                                  onClick={() => {
                                    setEditingTab(tab);
                                    setShowTabModal(true);
                                  }}
                                  className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                                  title="Edit tab"
                                >
                                  <FiEdit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => deleteTab(tab.id)} 
                                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                  title="Delete tab"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FiBook className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No research tabs yet</h3>
                    <p className="text-gray-600 mb-6">Start by adding research sources to your session.</p>
                    <button 
                      onClick={() => {
                        setEditingTab(null);
                        setShowTabModal(true);
                      }}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add Your First Tab
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Drafts Tab */}
        {activeTab === 'drafts' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Research Draft</h2>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={saveDraft}
                    disabled={sessionPermissions === 'viewer' || !currentDraft.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center transition-colors"
                  >
                    <FiSave className="w-4 h-4 mr-2" />
                    Save Draft
                  </button>
                </div>
              </div>
              
              <CollaborativeEditor
                value={currentDraft}
                onChange={setCurrentDraft}
                placeholder="Start writing your research findings..."
                disabled={sessionPermissions === 'viewer'}
                onlineUsers={onlineUsers}
                currentUser={userProfile}
              />
              
              {sessionPermissions === 'viewer' && (
                <p className="text-sm text-gray-500 mt-2 flex items-center">
                  <FiEye className="w-4 h-4 mr-1" />
                  Viewer permissions: You cannot edit this draft.
                </p>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Draft Versions</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {drafts.map((draft) => (
                  <div 
                    key={draft.id} 
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => {
                      setCurrentDraft(draft.content);
                      setDraftVersion(draft.version + 1);
                    }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900">Version {draft.version}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(draft.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div 
                      className="text-sm text-gray-600 line-clamp-3 prose prose-sm"
                      dangerouslySetInnerHTML={{ __html: draft.content.substring(0, 200) + '...' }}
                    />
                  </div>
                ))}
                {drafts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FiEdit2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No saved drafts yet. Start writing to save your first draft.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* AI Chat Tab */}
        {activeTab === 'chat' && (
          <div className="bg-white border border-gray-200 rounded-xl h-[600px] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">AI Research Assistant</h2>
              <p className="text-sm text-gray-600">Ask questions about your research content</p>
            </div>
            
            <AIChat
              messages={chatMessages}
              onSendMessage={sendChatMessage}
              isLoading={isChatLoading}
            />
          </div>
        )}

        {/* Collaborate Tab */}
        {activeTab === 'collaborate' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-6">
              <FiUsers className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Collaboration Hub</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Online Collaborators */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Online Now</h3>
                <div className="space-y-3">
                  {/* Current User */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-blue-50">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="font-medium">{userProfile?.full_name || 'You'}</span>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">You</span>
                    </div>
                    <span className="text-sm text-green-600">Online</span>
                  </div>
                  
                  {/* Other Online Users */}
                  {onlineUsers.map((user) => (
                    <div key={user.user_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="font-medium">{user.name}</span>
                      </div>
                      <span className="text-sm text-green-600">Online</span>
                    </div>
                  ))}
                  
                  {onlineUsers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FiUsers className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No other collaborators online</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Collaboration Tools */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Collaboration Tools</h3>
                <div className="space-y-4">
                  <button
                    onClick={() => setIsCollaborativeEditing(!isCollaborativeEditing)}
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

                  <button 
                    onClick={() => setModal({ type: 'invite-collaborator' })}
                    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <h4 className="font-medium">Invite Collaborators</h4>
                    <p className="text-sm text-gray-600 mt-1">Add team members or external collaborators</p>
                  </button>

                  <button className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <h4 className="font-medium">Share Session</h4>
                    <p className="text-sm text-gray-600 mt-1">Generate shareable link for this session</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Modal */}
      <TabModal
        isOpen={showTabModal}
        onClose={() => {
          setShowTabModal(false);
          setEditingTab(null);
        }}
        onSave={editingTab ? updateTab : createTab}
        editingTab={editingTab}
      />

      {/* Success/Error Modals */}
      <Modal
        isOpen={modal.type === 'success'}
        onClose={() => setModal({ type: '' })}
        title="Success"
      >
        <div className="flex items-center space-x-3">
          <FiCheck className="w-6 h-6 text-green-600" />
          <p className="text-gray-700">{modal.data?.message}</p>
        </div>
      </Modal>

      <Modal
        isOpen={modal.type === 'error'}
        onClose={() => setModal({ type: '' })}
        title="Error"
      >
        <div className="flex items-center space-x-3">
          <FiAlertCircle className="w-6 h-6 text-red-600" />
          <p className="text-gray-700">{modal.data?.message}</p>
        </div>
      </Modal>
    </Layout>
  );
}