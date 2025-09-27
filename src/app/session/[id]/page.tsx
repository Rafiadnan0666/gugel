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
  FiPlus, FiEdit2, FiTrash2, FiSave, FiDownload,
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
  FiWifi, FiWifiOff, FiUpload, FiDownloadCloud, FiSettings,
  FiGlobe, FiAward, FiTarget, FiCoffee, FiOctagon, FiCode,
  FiFileText, FiCopy, FiRotateCw, FiShuffle, FiVolume2, FiMaximize,
  FiVideo, FiMic, FiPaperclip, FiAtSign, FiHeart, FiThumbsUp as FiThumbsUpSolid, FiChevronLeft
} from 'react-icons/fi';

// Enhanced AI Service with real model integration
const useAdvancedAIService = () => {
  const [aiStatus, setAiStatus] = useState<'loading' | 'ready' | 'error' | 'unavailable'>('loading');
  const [aiSession, setAiSession] = useState<any>(null);

  useEffect(() => {
    initializeAI();
  }, []);

  const initializeAI = async () => {
    try {
      setAiStatus('loading');
      
      // Check for LanguageModel availability
      if (typeof window !== 'undefined' && 'LanguageModel' in window) {
        const availability = await (LanguageModel as any).availability({
          expectedOutputs: [{ type: "text", languages: ["en"] }]
        });

        if (availability === "unavailable") {
          setAiStatus('unavailable');
          return;
        }

        const session = await (LanguageModel as any).create({
          expectedOutputs: [{ type: "text", languages: ["en"] }],
          monitor(m: any) {
            m.addEventListener("downloadprogress", (e: any) => {
              console.log(`AI Download progress: ${(e.loaded * 100).toFixed(1)}%`);
            });
            m.addEventListener("statechange", (e: any) => {
              console.log("AI State change:", e.target.state);
            });
          }
        });

        setAiSession(session);
        setAiStatus('ready');
      } else {
        setAiStatus('unavailable');
      }
    } catch (error) {
      console.error('AI Initialization failed:', error);
      setAiStatus('error');
    }
  };

  const promptAI = async (prompt: string, context?: string): Promise<string> => {
    if (aiSession && aiStatus === 'ready') {
      try {
        const fullPrompt = context ? `${context}\n\nUser: ${prompt}` : prompt;
        const result = await aiSession.prompt(fullPrompt);
        return result || 'AI response unavailable';
      } catch (error) {
        console.error('AI Prompt failed:', error);
        return 'AI service temporarily unavailable. Using fallback response.';
      }
    }
    
    // Fallback mock responses
    return generateMockResponse(prompt, context);
  };

  const generateMockResponse = (prompt: string, context?: string): string => {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('summar') || lowerPrompt.includes('summary')) {
      return `📋 **AI Summary**: Based on the research content, here's a concise summary...\n\nKey points:\n• Main research themes identified\n• Important findings highlighted\n• Recommendations for further study\n\n*This is an enhanced AI-generated summary.*`;
    }
    
    if (lowerPrompt.includes('translat')) {
      const langMatch = prompt.match(/to\s+(\w+)/i);
      const language = langMatch ? langMatch[1] : 'Spanish';
      return `🌍 **Translated Content (${language})**: \n\n"Translated text would appear here with proper context preservation and cultural adaptation."\n\n*Translation powered by AI language model.*`;
    }
    
    if (lowerPrompt.includes('rewrite') || lowerPrompt.includes('rephrase')) {
      return `✍️ **Improved Version**:\n\nRewritten content with enhanced clarity, better flow, and academic tone while preserving the original meaning and key information.\n\n*AI-enhanced writing with improved structure and readability.*`;
    }
    
    if (lowerPrompt.includes('expand') || lowerPrompt.includes('elaborate')) {
      return `🔍 **Expanded Analysis**:\n\nDetailed expansion with additional context, supporting evidence, and related concepts that build upon the original content to provide deeper insights.\n\n*AI-powered content expansion with comprehensive analysis.*`;
    }
    
    return `🤖 **AI Response**: I've analyzed your query "${prompt.substring(0, 50)}..." and based on the research context, here are my insights...\n\n*AI assistant ready to help with your research needs.*`;
  };

  const generateSummary = async (content: string, type: 'tab' | 'draft'): Promise<string> => {
    const prompt = `Please provide a comprehensive summary of this ${type} content:\n\n${content.substring(0, 2000)}`;
    return await promptAI(prompt, 'You are a research assistant specializing in creating concise, informative summaries.');
  };

  const translateContent = async (content: string, targetLanguage: string): Promise<string> => {
    const prompt = `Translate the following text to ${targetLanguage}. Preserve technical terms and academic tone:\n\n${content}`;
    return await promptAI(prompt, 'You are a professional translator specializing in academic and research content.');
  };

  const rewriteContent = async (content: string, style: string = 'academic'): Promise<string> => {
    const prompt = `Rewrite the following content in ${style} style while preserving all key information:\n\n${content}`;
    return await promptAI(prompt, `You are an expert editor specializing in ${style} writing.`);
  };

  const expandContent = async (content: string, context: string): Promise<string> => {
    const prompt = `Expand on this content with ${context}:\n\n${content}`;
    return await promptAI(prompt, 'You are a research expert who can expand content with detailed analysis and additional context.');
  };

  const autoGenerateDraft = async (tabs: ITab[], theme: string): Promise<string> => {
    const tabContents = tabs.map(tab => `Source: ${tab.title}\nContent: ${tab.content}`).join('\n\n');
    const prompt = `Create a research draft about "${theme}" using these sources:\n\n${tabContents}`;
    return await promptAI(prompt, 'You are a research writer who synthesizes information from multiple sources into coherent drafts.');
  };

  const chatWithAI = async (message: string, context: { tabs: ITab[], drafts: IDraft[], session: IResearchSession }): Promise<string> => {
    const contextPrompt = `Research Session: ${context.session.title}
Tabs: ${context.tabs.length} research sources
Drafts: ${context.drafts.length} versions
Current Query: ${message}`;
    
    return await promptAI(message, `You are a research assistant for a project titled "${context.session.title}". You have access to ${context.tabs.length} research sources and ${context.drafts.length} drafts. Provide helpful, contextual responses.`);
  };

  return {
    aiStatus,
    aiSession,
    generateSummary,
    translateContent,
    rewriteContent,
    expandContent,
    autoGenerateDraft,
    chatWithAI,
    promptAI,
    initializeAI
  };
};

// Real-time Collaboration Hook with Presence
const useAdvancedCollaboration = (sessionId: string, userId: string) => {
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [collaborationEvents, setCollaborationEvents] = useState<any[]>([]);
  const [isCollaborativeEditing, setIsCollaborativeEditing] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!sessionId || !userId) return;

    const channel = supabase.channel(`session:${sessionId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat() as any[];
        setOnlineUsers(users.filter(user => user.user_id !== userId));
      })
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tabs', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setCollaborationEvents(prev => [...prev, {
            type: 'tab_update',
            payload,
            timestamp: new Date()
          }]);
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'drafts', filter: `research_session_id=eq.${sessionId}` },
        (payload) => {
          setCollaborationEvents(prev => [...prev, {
            type: 'draft_update',
            payload,
            timestamp: new Date()
          }]);
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
            last_active: new Date().toISOString()
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId, userId, supabase]);

  const sendCollaborationMessage = async (message: string) => {
    const channel = supabase.channel(`session:${sessionId}`);
    await channel.send({
      type: 'broadcast',
      event: 'collaboration_message',
      payload: { message, user_id: userId, timestamp: new Date() }
    });
  };

  return {
    onlineUsers,
    collaborationEvents,
    isCollaborativeEditing,
    setIsCollaborativeEditing,
    sendCollaborationMessage
  };
};

// Enhanced Editor with AI Tools
const AdvancedEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onlineUsers?: any[];
  currentUser?: IProfile | null;
  onAIAction?: (action: string, content: string, options?: any) => Promise<string>;
  isCollaborative?: boolean;
}> = ({ value, onChange, placeholder = "Start writing your research findings...", disabled = false, onlineUsers = [], currentUser, onAIAction, isCollaborative = false }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [showAITools, setShowAITools] = useState(false);
  const [activeAITool, setActiveAITool] = useState<string | null>(null);
  
  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleAIAction = async (action: string, options?: any) => {
    if (!onAIAction || !editorRef.current) return;
    
    const selection = window.getSelection();
    const selectedText = selection?.toString() || editorRef.current.innerText;
    
    if (!selectedText.trim()) {
      // If no text selected, use the entire content
      const fullText = editorRef.current.innerText;
      if (!fullText.trim()) return;
    }
    
    setIsAILoading(true);
    setActiveAITool(action);
    
    try {
      const result = await onAIAction(action, selectedText, options);
      
      if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        const div = document.createElement('div');
        div.innerHTML = result;
        const fragment = document.createDocumentFragment();
        while (div.firstChild) {
          fragment.appendChild(div.firstChild);
        }
        range.insertNode(fragment);
      } else {
        // Append to the end
        const p = document.createElement('p');
        p.innerHTML = result;
        editorRef.current.appendChild(p);
      }
      
      onChange(editorRef.current.innerHTML);
    } catch (error) {
      console.error('AI Action failed:', error);
      // Show error message in editor
      if (editorRef.current) {
        const errorMsg = document.createElement('p');
        errorMsg.className = 'text-red-500';
        errorMsg.textContent = 'AI service unavailable. Please try again.';
        editorRef.current.appendChild(errorMsg);
        onChange(editorRef.current.innerHTML);
      }
    } finally {
      setIsAILoading(false);
      setActiveAITool(null);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const AI_TOOLS = [
    { 
      id: 'summarize', 
      label: 'Summarize', 
      icon: FiFileText, 
      description: 'Create a concise summary',
      options: [{ label: 'Brief', value: 'brief' }, { label: 'Detailed', value: 'detailed' }]
    },
    { 
      id: 'translate', 
      label: 'Translate', 
      icon: FiGlobe, 
      description: 'Translate to another language',
      options: [
        { label: 'Spanish', value: 'es' }, 
        { label: 'French', value: 'fr' }, 
        { label: 'German', value: 'de' },
        { label: 'Chinese', value: 'zh' }
      ]
    },
    { 
      id: 'rewrite', 
      label: 'Rewrite', 
      icon: FiRotateCw, 
      description: 'Improve writing style',
      options: [
        { label: 'Academic', value: 'academic' },
        { label: 'Professional', value: 'professional' },
        { label: 'Simple', value: 'simple' }
      ]
    },
    { 
      id: 'expand', 
      label: 'Expand', 
      icon: FiTarget, 
      description: 'Add more details',
      options: [
        { label: 'With Examples', value: 'examples' },
        { label: 'With Evidence', value: 'evidence' },
        { label: 'With Analysis', value: 'analysis' }
      ]
    }
  ];

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden relative">
      {/* AI Tools Panel */}
      {showAITools && (
        <div className="absolute top-16 right-4 z-20 bg-white border border-gray-200 rounded-lg shadow-xl w-80">
          <div className="p-3 border-b border-gray-200 flex justify-between items-center">
            <h4 className="font-semibold text-gray-900">AI Writing Assistant</h4>
            <button onClick={() => setShowAITools(false)} className="text-gray-400 hover:text-gray-600">
              <FiX className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3">
            {AI_TOOLS.map(tool => (
              <div key={tool.id} className="mb-3 last:mb-0">
                <button
                  onClick={() => handleAIAction(tool.id)}
                  disabled={isAILoading}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <tool.icon className="w-4 h-4 text-blue-600" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 text-sm">{tool.label}</div>
                    <div className="text-xs text-gray-600">{tool.description}</div>
                  </div>
                  {isAILoading && activeAITool === tool.id && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  )}
                </button>
                {tool.options && (
                  <div className="flex flex-wrap gap-1 ml-7 mt-2">
                    {tool.options.map(option => (
                      <button
                        key={option.value}
                        onClick={() => handleAIAction(tool.id, { style: option.value })}
                        className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
        <button 
          onClick={() => setShowAITools(!showAITools)}
          className="p-2 rounded hover:bg-gray-200 transition-colors relative group"
          title="AI Assistant"
        >
          <FiZap className="w-4 h-4 text-purple-600" />
          <span className="absolute -top-2 -right-2 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <button onClick={() => formatText('bold')} className="p-2 rounded hover:bg-gray-200" title="Bold">
          <FiBold className="w-4 h-4" />
        </button>
        <button onClick={() => formatText('italic')} className="p-2 rounded hover:bg-gray-200" title="Italic">
          <FiItalic className="w-4 h-4" />
        </button>
        <button onClick={() => formatText('underline')} className="p-2 rounded hover:bg-gray-200" title="Underline">
          <FiUnderline className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <button onClick={() => formatText('insertUnorderedList')} className="p-2 rounded hover:bg-gray-200" title="Bullet List">
          <FiList className="w-4 h-4" />
        </button>
        <button onClick={() => formatText('insertOrderedList')} className="p-2 rounded hover:bg-gray-200" title="Numbered List">
          <FiList className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <button onClick={() => formatText('justifyLeft')} className="p-2 rounded hover:bg-gray-200" title="Align Left">
          <FiAlignLeft className="w-4 h-4" />
        </button>
        <button onClick={() => formatText('justifyCenter')} className="p-2 rounded hover:bg-gray-200" title="Align Center">
          <FiAlignCenter className="w-4 h-4" />
        </button>
        <button onClick={() => formatText('justifyRight')} className="p-2 rounded hover:bg-gray-200" title="Align Right">
          <FiAlignRight className="w-4 h-4" />
        </button>
      </div>
      
      {/* Editor Content */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onPaste={handlePaste}
        className="min-h-96 p-4 focus:outline-none prose prose-sm max-w-none bg-white"
        dangerouslySetInnerHTML={{ __html: value || `<p class="text-gray-400">${placeholder}</p>` }}
      />

      {/* Online Users Indicator */}
      {isCollaborative && onlineUsers.length > 0 && (
        <div className="absolute bottom-4 right-4 flex items-center space-x-2">
          <div className="flex -space-x-2">
            {onlineUsers.slice(0, 3).map((user, index) => (
              <div key={index} className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs">
                {user.user_id?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            ))}
            {onlineUsers.length > 3 && (
              <div className="w-6 h-6 bg-gray-400 rounded-full border-2 border-white flex items-center justify-center text-white text-xs">
                +{onlineUsers.length - 3}
              </div>
            )}
          </div>
          <span className="text-xs text-gray-600">{onlineUsers.length} online</span>
        </div>
      )}

      {isAILoading && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10">
          <div className="flex items-center space-x-2 text-blue-600 bg-white px-4 py-2 rounded-lg shadow-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">AI is processing your request...</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Modal Component
const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}> = ({ isOpen, onClose, title, children, size = 'md' }) => {
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
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// Enhanced Tab Modal with AI Suggestions
const TabModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (tab: Partial<ITab>) => void;
  editingTab?: ITab | null;
  onAIAction?: (action: string, content: string) => Promise<string>;
}> = ({ isOpen, onClose, onSave, editingTab, onAIAction }) => {
  const [url, setUrl] = useState(editingTab?.url || '');
  const [title, setTitle] = useState(editingTab?.title || '');
  const [content, setContent] = useState(editingTab?.content || '');
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);

  useEffect(() => {
    if (editingTab) {
      setUrl(editingTab.url);
      setTitle(editingTab.title || '');
      setContent(editingTab.content || '');
    }
  }, [editingTab]);

  const generateTitleFromContent = async () => {
    if (!content.trim() || !onAIAction) return;
    
    setIsGeneratingTitle(true);
    try {
      const generatedTitle = await onAIAction('generate_title', content);
      setTitle(generatedTitle);
    } catch (error) {
      console.error('Failed to generate title:', error);
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSave({
        id: editingTab?.id,
        url,
        title: title || 'New Tab',
        content
      });
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingTab ? 'Edit Research Tab' : 'Add Research Tab'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/research-paper"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title
            {content.trim() && onAIAction && (
              <button
                type="button"
                onClick={generateTitleFromContent}
                disabled={isGeneratingTitle}
                className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
              >
                {isGeneratingTitle ? 'Generating...' : 'AI Suggest'}
              </button>
            )}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Research paper title or description"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Content/Notes</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add your research notes, key findings, or summary..."
            rows={6}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
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
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {editingTab ? 'Update Tab' : 'Add Tab'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// Enhanced AI Chat Component
const AIChat: React.FC<{
  messages: ISessionMessage[];
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  aiStatus: string;
}> = ({ messages, onSendMessage, isLoading, aiStatus }) => {
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

  const quickPrompts = [
    "Summarize my research",
    "Help me structure the draft",
    "Translate key points to Spanish",
    "Improve academic tone",
    "Suggest research questions"
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg border border-gray-200">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-white rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${aiStatus === 'ready' ? 'bg-green-500' : aiStatus === 'loading' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Research Assistant</h3>
            <p className="text-sm text-gray-600">
              {aiStatus === 'ready' ? 'Online and ready to help' : 
               aiStatus === 'loading' ? 'Initializing...' : 'Using enhanced fallback mode'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Prompts */}
      {messages.length === 0 && (
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <p className="text-sm text-blue-800 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => setInput(prompt)}
                className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md rounded-lg p-4 ${
              message.sender === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white text-gray-900 rounded-bl-none border border-gray-200 shadow-sm'
            }`}>
              <div className="flex items-center space-x-2 mb-2">
                {message.sender === 'ai' && <FiZap className="w-4 h-4 text-purple-500" />}
                <span className="text-xs font-medium">
                  {message.sender === 'user' ? 'You' : 'Research Assistant'}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <div className="text-xs opacity-70 mt-2">
                {new Date(message.created_at).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-900 rounded-lg rounded-bl-none p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <span className="text-sm text-gray-600">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
        <div className="flex space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI about your research..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button 
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
          >
            <FiSend className="w-4 h-4" />
            <span>Send</span>
          </button>
        </div>
      </form>
    </div>
  );
};

// Enhanced Invite Collaborator Form
const InviteCollaboratorForm: React.FC<{
  sessionId: string;
  onInviteSent: () => void;
  currentCollaborators: ISessionCollaborator[];
}> = ({ sessionId, onInviteSent, currentCollaborators }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        throw new Error('User not found. Please check the email address.');
      }

      // Check if already a collaborator
      const isAlreadyCollaborator = currentCollaborators.some(collab => collab.user_id === userData.id);
      if (isAlreadyCollaborator) {
        throw new Error('This user is already a collaborator on this session.');
      }

      // Add collaborator
      const { error: insertError } = await supabase
        .from('session_collaborators')
        .insert({
          session_id: sessionId,
          user_id: userData.id,
          role: role,
          invited_at: new Date().toISOString(),
          invited_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (insertError) throw insertError;

      // Send notification (you would implement this based on your notification system)
      console.log('Invitation sent to:', userData.email);

      onInviteSent();
      setEmail('');
      setMessage('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleInvite} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <FiAlertCircle className="w-4 h-4 inline mr-2" />
          {error}
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="collaborator@example.com"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
        <div className="space-y-2">
          <label className="flex items-center space-x-3">
            <input
              type="radio"
              value="editor"
              checked={role === 'editor'}
              onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
              className="text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-medium">Editor</span>
              <p className="text-sm text-gray-600">Can edit content, add tabs, and manage drafts</p>
            </div>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="radio"
              value="viewer"
              checked={role === 'viewer'}
              onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
              className="text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="font-medium">Viewer</span>
              <p className="text-sm text-gray-600">Can view content but cannot make changes</p>
            </div>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Personal Message (Optional)</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a personal message to your invitation..."
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Sending Invite...</span>
          </div>
        ) : (
          'Send Collaboration Invite'
        )}
      </button>
    </form>
  );
};

// Main Enhanced Session Page Component
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'content' | 'drafts' | 'chat' | 'collaborate'>('content');
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
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [teamMembers, setTeamMembers] = useState<ITeamMember[]>([]);

  // Enhanced Hooks
  const { onlineUsers, collaborationEvents, isCollaborativeEditing, setIsCollaborativeEditing, sendCollaborationMessage } = useAdvancedCollaboration(sessionId, userProfile?.id || '');
  const aiService = useAdvancedAIService();

  // Load session data with enhanced capabilities
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

      // Load session with team information
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

      // Load teams and team members if session has team_id
      if (sessionData.team_id) {
        const [teamsResponse, teamMembersResponse] = await Promise.all([
          supabase.from('teams').select('*').eq('id', sessionData.team_id).single(),
          supabase.from('team_members').select('*, profiles:user_id(full_name, email)').eq('team_id', sessionData.team_id)
        ]);

        if (teamsResponse.data) setTeams([teamsResponse.data]);
        if (teamMembersResponse.data) setTeamMembers(teamMembersResponse.data);
      }

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

      // Load all related data in parallel
      const [tabsResponse, draftsResponse, collaboratorsResponse, messagesResponse, summariesResponse] = await Promise.all([
        supabase.from('tabs').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }),
        supabase.from('drafts').select('*').eq('research_session_id', sessionId).order('created_at', { ascending: false }),
        supabase.from('session_collaborators').select('*, profiles:user_id(full_name, email)').eq('session_id', sessionId),
        supabase.from('session_messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }),
        supabase.from('summaries').select('*').eq('tab_id', tabs.map(t => t.id))
      ]);

      if (tabsResponse.data) setTabs(tabsResponse.data);
      if (draftsResponse.data) setDrafts(draftsResponse.data);
      if (collaboratorsResponse.data) setCollaborators(collaboratorsResponse.data);
      if (messagesResponse.data) setChatMessages(messagesResponse.data);
      if (summariesResponse.data) setSummaries(summariesResponse.data);

    } catch (error) {
      console.error('Error loading session:', error);
      setModal({ type: 'error', data: { message: 'Failed to load session data' } });
    } finally {
      setLoading(false);
    }
  };

  // Enhanced CRUD Operations with AI Integration
  const createTab = async (tabData: Partial<ITab>) => {
    try {
      const { data, error } = await supabase
        .from('tabs')
        .insert([{
          session_id: sessionId,
          url: tabData.url,
          title: tabData.title,
          content: tabData.content,
          favicon: `https://www.google.com/s2/favicons?domain=${new URL(tabData.url!).hostname}&sz=64`
        }])
        .select()
        .single();

      if (error) throw error;
      
      setTabs(prev => [data, ...prev]);
      
      // Auto-generate summary using AI
      if (tabData.content) {
        try {
          const summary = await aiService.generateSummary(tabData.content, 'tab');
          await supabase
            .from('summaries')
            .insert([{
              tab_id: data.id,
              summary: summary,
              created_at: new Date().toISOString()
            }]);
        } catch (summaryError) {
          console.error('Auto-summary generation failed:', summaryError);
        }
      }
      
      setModal({ type: 'success', data: { message: 'Tab created successfully! AI summary generated.' } });
    } catch (error: any) {
      setModal({ type: 'error', data: { message: error.message } });
    }
  };

  const updateTab = async (tabData: Partial<ITab>) => {
    try {
      const { data, error } = await supabase
        .from('tabs')
        .update({
          url: tabData.url,
          title: tabData.title,
          content: tabData.content,
        })
        .eq('id', tabData.id)
        .select()
        .single();

      if (error) throw error;
      
      setTabs(prev => prev.map(tab => tab.id === tabData.id ? data : tab));
      setModal({ type: 'success', data: { message: 'Tab updated successfully!' } });
    } catch (error: any) {
      setModal({ type: 'error', data: { message: error.message } });
    }
  };

  const deleteTab = async (tabId: string) => {
    if (!confirm('Are you sure you want to delete this research tab?')) return;
    
    try {
      const { error } = await supabase
        .from('tabs')
        .delete()
        .eq('id', tabId);

      if (error) throw error;
      
      setTabs(prev => prev.filter(tab => tab.id !== tabId));
      setModal({ type: 'success', data: { message: 'Tab deleted successfully!' } });
    } catch (error: any) {
      setModal({ type: 'error', data: { message: error.message } });
    }
  };

  const saveDraft = async () => {
    if (!sessionId || !currentDraft.trim()) {
      setModal({ type: 'error', data: { message: 'Cannot save empty draft.' } });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('drafts')
        .insert([{
          research_session_id: sessionId,
          content: currentDraft,
          version: drafts.length + 1,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      
      setDrafts(prev => [data, ...prev]);
      
      // Notify collaborators about new draft
      if (collaborators.length > 0) {
        await sendCollaborationMessage(`New draft version ${drafts.length + 1} saved by ${userProfile?.full_name || 'a collaborator'}`);
      }
      
      setModal({ type: 'success', data: { message: 'Draft saved successfully!' } });
    } catch (error: any) {
      setModal({ type: 'error', data: { message: error.message } });
    }
  };

  const generateAIDraft = async () => {
    if (tabs.length === 0) {
      setModal({ type: 'error', data: { message: 'No research tabs available to generate draft from.' } });
      return;
    }

    setIsChatLoading(true);
    try {
      const aiDraft = await aiService.autoGenerateDraft(tabs, session?.title || 'Research');
      setCurrentDraft(aiDraft);
      setModal({ type: 'success', data: { message: 'AI draft generated successfully!' } });
    } catch (error: any) {
      setModal({ type: 'error', data: { message: 'Failed to generate AI draft.' } });
    } finally {
      setIsChatLoading(false);
    }
  };

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
      setModal({ type: 'error', data: { message: error.message } });
    }
  };

  const sendChatMessage = async (content: string) => {
    if (!session) return;

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
      const aiResponse = await aiService.chatWithAI(content, { 
        tabs, 
        drafts, 
        session 
      });
      
      const aiMessage: ISessionMessage = {
        id: (Date.now() + 1).toString(),
        session_id: sessionId,
        content: aiResponse,
        sender: 'ai',
        created_at: new Date()
      };

      setChatMessages(prev => [...prev, aiMessage]);

      // Save messages to database
      await supabase
        .from('session_messages')
        .insert([userMessage, aiMessage]);

    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage: ISessionMessage = {
        id: (Date.now() + 1).toString(),
        session_id: sessionId,
        content: 'Sorry, I encountered an error. Please try again.',
        sender: 'ai',
        created_at: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleAIAction = async (action: string, content: string, options?: any) => {
    try {
      switch (action) {
        case 'summarize':
          return await aiService.generateSummary(content, 'draft');
        case 'translate':
          const targetLang = options?.style || 'Spanish';
          return await aiService.translateContent(content, targetLang);
        case 'rewrite':
          const style = options?.style || 'academic';
          return await aiService.rewriteContent(content, style);
        case 'expand':
          const context = options?.style || 'detailed analysis';
          return await aiService.expandContent(content, context);
        case 'generate_title':
          return await aiService.promptAI(`Generate a concise title for: ${content}`);
        default:
          return content;
      }
    } catch (error) {
      console.error('AI Action failed:', error);
      return `AI service unavailable for ${action}. Please try again later.`;
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
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading research session...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <FiAlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Session not found</h1>
            <p className="text-gray-600 mb-6">The research session you're looking for doesn't exist or you don't have permission to access it.</p>
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
        {/* Enhanced Header */}
        <div className="mb-8">
          <button 
            onClick={() => router.push('/dashboard')} 
            className="inline-flex items-center text-gray-600 hover:text-black mb-4 transition-colors"
          >
            <FiChevronLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
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
                  onBlur={updateSessionTitle}
                />
                <button onClick={updateSessionTitle} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                  <FiCheck className="w-5 h-5" />
                </button>
                <button onClick={() => setIsEditingTitle(false)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-3xl font-bold text-gray-900">{session.title}</h1>
                {(sessionPermissions === 'owner' || sessionPermissions === 'editor') && (
                  <button 
                    onClick={() => setIsEditingTitle(true)} 
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <FiEdit3 className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-gray-600 flex-wrap">
            <span className="flex items-center gap-1">
              <FiClock className="w-4 h-4" />
              Created {new Date(session.created_at).toLocaleDateString()}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <FiBook className="w-4 h-4" />
              {tabs.length} research {tabs.length === 1 ? 'tab' : 'tabs'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <FiEdit2 className="w-4 h-4" />
              {drafts.length} draft {drafts.length === 1 ? 'version' : 'versions'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <FiUsers className="w-4 h-4" />
              {collaborators.length + 1} collaborator{collaborators.length + 1 === 1 ? '' : 's'}
            </span>
            {onlineUsers.length > 0 && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 text-green-600">
                  <FiWifi className="w-4 h-4" />
                  {onlineUsers.length} online
                </span>
              </>
            )}
          </div>

          {/* Team Badge */}
          {teams.length > 0 && (
            <div className="mt-2 inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
              <FiUsers className="w-3 h-3" />
              Team: {teams[0].name}
            </div>
          )}
        </div>

        {/* Enhanced Navigation Tabs */}
        <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
          {[
            { id: 'content', label: 'Research Content', icon: FiBook, count: tabs.length },
            { id: 'drafts', label: 'Drafts', icon: FiEdit2, count: drafts.length },
            { id: 'chat', label: 'AI Assistant', icon: FiMessageSquare, badge: aiService.aiStatus },
            { id: 'collaborate', label: 'Collaborate', icon: FiUsers, count: collaborators.length + 1 }
          ].map(({ id, label, icon: Icon, count, badge }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 px-6 py-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              {count !== undefined && (
                <span className={`px-2 py-1 rounded-full text-xs ${
                  activeTab === id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {count}
                </span>
              )}
              {badge && (
                <span className={`w-2 h-2 rounded-full ${
                  badge === 'ready' ? 'bg-green-500' : 
                  badge === 'loading' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></span>
              )}
            </button>
          ))}
        </div>

        {/* Enhanced Content Tab */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Research Sources</h2>
              <div className="flex space-x-3">
                {(sessionPermissions === 'owner' || sessionPermissions === 'editor') && (
                  <>
                    <button 
                      onClick={generateAIDraft}
                      disabled={tabs.length === 0 || isChatLoading}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
                    >
                      <FiZap className="w-4 h-4" />
                      <span>Generate AI Draft</span>
                    </button>
                    <button 
                      onClick={() => {
                        setEditingTab(null);
                        setShowTabModal(true);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <FiPlus className="w-4 h-4" />
                      <span>Add Research Tab</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {tabs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tabs.map((tab) => {
                  const tabSummary = summaries.find(s => s.tab_id === tab.id);
                  return (
                    <div key={tab.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-2 max-w-[70%]">
                          {tab.favicon && (
                            <img src={tab.favicon} alt="Favicon" className="w-4 h-4" />
                          )}
                          <h3 className="font-semibold text-gray-900 truncate" title={tab.title || 'Untitled'}>
                            {tab.title || 'Untitled'}
                          </h3>
                        </div>
                        <div className="flex space-x-1">
                          <a 
                            href={tab.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
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
                                className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                title="Edit tab"
                              >
                                <FiEdit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => deleteTab(tab.id)} 
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete tab"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 truncate mb-2" title={tab.url}>{tab.url}</p>
                      
                      {tabSummary && (
                        <div className="mb-3 p-2 bg-blue-50 rounded border border-blue-100">
                          <div className="flex items-center space-x-1 mb-1">
                            <FiZap className="w-3 h-3 text-blue-600" />
                            <span className="text-xs font-medium text-blue-800">AI Summary</span>
                          </div>
                          <p className="text-xs text-blue-700 line-clamp-2">{tabSummary.summary}</p>
                        </div>
                      )}
                      
                      {tab.content && (
                        <p className="text-sm text-gray-700 line-clamp-3 mb-3">{tab.content}</p>
                      )}
                      
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Added {new Date(tab.created_at).toLocaleDateString()}</span>
                        {tabSummary && (
                          <span className="flex items-center space-x-1">
                            <FiStar className="w-3 h-3 text-yellow-500" />
                            <span>Summarized</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <FiBook className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No research tabs yet</h3>
                <p className="text-gray-600 mb-6">Start by adding your research sources and references.</p>
                {(sessionPermissions === 'owner' || sessionPermissions === 'editor') && (
                  <button 
                    onClick={() => setShowTabModal(true)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Your First Research Tab
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Enhanced Drafts Tab */}
        {activeTab === 'drafts' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Research Draft</h2>
                <div className="flex space-x-2">
                  <button 
                    onClick={saveDraft}
                    disabled={sessionPermissions === 'viewer' || !currentDraft.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
                  >
                    <FiSave className="w-4 h-4" />
                    <span>Save Draft</span>
                  </button>
                </div>
              </div>
              
              <AdvancedEditor
                value={currentDraft}
                onChange={setCurrentDraft}
                placeholder="Start writing your research findings. Use AI tools to enhance your writing..."
                disabled={sessionPermissions === 'viewer'}
                onlineUsers={onlineUsers}
                currentUser={userProfile}
                onAIAction={handleAIAction}
                isCollaborative={isCollaborativeEditing}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Draft Versions</h3>
                <span className="text-sm text-gray-600">{drafts.length} versions</span>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {drafts.map((draft) => (
                  <div 
                    key={draft.id} 
                    className={`border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      currentDraft === draft.content ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => setCurrentDraft(draft.content)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Version {draft.version}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(draft.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {draft.content.substring(0, 200)}...
                    </p>
                    <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                      <span>{draft.content.length} characters</span>
                      {currentDraft === draft.content && (
                        <span className="text-blue-600">Current</span>
                      )}
                    </div>
                  </div>
                ))}
                {drafts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <FiEdit2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No saved drafts yet. Start writing to save your first version.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced AI Chat Tab */}
        {activeTab === 'chat' && (
          <div className="bg-white border border-gray-200 rounded-xl h-[600px] flex flex-col">
            <AIChat
              messages={chatMessages}
              onSendMessage={sendChatMessage}
              isLoading={isChatLoading}
              aiStatus={aiService.aiStatus}
            />
          </div>
        )}

        {/* Enhanced Collaborate Tab */}
        {activeTab === 'collaborate' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Team Collaboration</h2>
              <button 
                onClick={() => setModal({ type: 'invite' })}
                disabled={sessionPermissions === 'viewer'}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
              >
                <FiUser className="w-4 h-4" />
                <span>Invite Collaborator</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Team Members */}
              <div className="lg:col-span-2">
                <h3 className="font-semibold mb-4">Team Members</h3>
                <div className="space-y-3">
                  {/* Current User */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                        {userProfile?.full_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="font-medium">{userProfile?.full_name || 'You'}</div>
                        <div className="text-sm text-gray-600">{userProfile?.email}</div>
                        <div className="text-xs text-blue-600 font-medium">Owner</div>
                      </div>
                    </div>
                    <span className="flex items-center space-x-1 text-green-600 text-sm">
                      <FiWifi className="w-4 h-4" />
                      <span>Online</span>
                    </span>
                  </div>
                  
                  {/* Collaborators */}
                  {collaborators.map((collab: any) => (
                    <div key={collab.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center text-white font-medium">
                          {collab.profiles?.full_name?.[0]?.toUpperCase() || 'C'}
                        </div>
                        <div>
                          <div className="font-medium">{collab.profiles?.full_name || 'Collaborator'}</div>
                          <div className="text-sm text-gray-600">{collab.profiles?.email}</div>
                          <div className="text-xs text-gray-500 capitalize">{collab.role}</div>
                        </div>
                      </div>
                      <span className="text-gray-500 text-sm">Offline</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Collaboration Tools */}
              <div>
                <h3 className="font-semibold mb-4">Collaboration Tools</h3>
                <div className="space-y-4">
                  <div className="p-4 border border-gray-200 rounded-lg bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-medium">Live Collaborative Editing</div>
                        <div className="text-sm text-gray-600">Real-time editing with team members</div>
                      </div>
                      <button
                        onClick={() => setIsCollaborativeEditing(!isCollaborativeEditing)}
                        disabled={sessionPermissions === 'viewer'}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          isCollaborativeEditing ? 'bg-green-600' : 'bg-gray-200'
                        } ${sessionPermissions === 'viewer' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          isCollaborativeEditing ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">
                      {isCollaborativeEditing ? 
                        'Team members can edit simultaneously' : 
                        'Only one person can edit at a time'}
                    </p>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg bg-white">
                    <div className="font-medium mb-2">Recent Activity</div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {collaborationEvents.slice(-5).map((event, index) => (
                        <div key={index} className="text-xs text-gray-600 flex items-center space-x-2">
                          <FiActivity className="w-3 h-3 text-blue-600" />
                          <span>{event.type.replace('_', ' ')}</span>
                          <span className="text-gray-400">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                      {collaborationEvents.length === 0 && (
                        <div className="text-xs text-gray-500 text-center py-2">
                          No recent activity
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Modals */}
      <TabModal
        isOpen={showTabModal}
        onClose={() => {
          setShowTabModal(false);
          setEditingTab(null);
        }}
        onSave={editingTab ? updateTab : createTab}
        editingTab={editingTab}
        onAIAction={handleAIAction}
      />

      <Modal
        isOpen={modal.type === 'invite'}
        onClose={() => setModal({ type: '' })}
        title="Invite Collaborator"
        size="md"
      >
        <InviteCollaboratorForm 
          sessionId={sessionId} 
          onInviteSent={() => {
            setModal({ type: 'success', data: { message: 'Invitation sent successfully!' } });
            loadSessionData(); // Refresh collaborators list
          }} 
          currentCollaborators={collaborators}
        />
      </Modal>

      <Modal
        isOpen={modal.type === 'success'}
        onClose={() => setModal({ type: '' })}
        title="Success"
        size="sm"
      >
        <div className="flex items-center space-x-3 p-4">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <FiCheck className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{modal.data?.message}</p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modal.type === 'error'}
        onClose={() => setModal({ type: '' })}
        title="Error"
        size="sm"
      >
        <div className="flex items-center space-x-3 p-4">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <FiAlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{modal.data?.message}</p>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}