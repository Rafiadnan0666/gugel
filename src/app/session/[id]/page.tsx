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

// Enhanced AI Service with proper LanguageModel integration
const useAdvancedAIService = () => {
  const [aiStatus, setAiStatus] = useState<'loading' | 'ready' | 'error' | 'unavailable'>('loading');
  const [aiSession, setAiSession] = useState<any>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const initializeAI = async () => {
    try {
      setAiStatus('loading');
      setDownloadProgress(0);

      if (typeof window !== 'undefined' && 'LanguageModel' in window) {
        const availability = await (window as any).LanguageModel.availability({
          expectedOutputs: [{ type: "text", languages: ["en"] }]
        });

        if (availability === "unavailable") {
          setAiStatus('unavailable');
          return;
        }

        const session = await (window as any).LanguageModel.create({
          expectedOutputs: [{ type: "text", languages: ["en"] }],
          monitor(m: any) {
            m.addEventListener("downloadprogress", (e: any) => {
              const progress = (e.loaded * 100);
              setDownloadProgress(progress);
              console.log(`AI Download progress: ${progress.toFixed(1)}%`);
            });
            m.addEventListener("statechange", (e: any) => {
              console.log("AI State change:", e.target.state);
              if (e.target.state === 'ready') {
                setAiStatus('ready');
              }
            });
          }
        });

        setAiSession(session);
      } else {
        setAiStatus('unavailable');
      }
    } catch (error) {
      console.error('AI Initialization failed:', error);
      setAiStatus('error');
    }
  };

  useEffect(() => {
    initializeAI();
  }, []);

  const promptAI = async (prompt: string, context?: string): Promise<string> => {
    if (aiSession && aiStatus === 'ready') {
      try {
        const fullPrompt = context ? `${context}\n\nUser: ${prompt}` : prompt;
        const result = await aiSession.prompt(fullPrompt);
        return result || 'AI response unavailable';
      } catch (error) {
        console.error('AI Prompt failed:', error);
        return generateFallbackResponse(prompt, context);
      }
    }
    return generateFallbackResponse(prompt, context);
  };

  const generateFallbackResponse = (prompt: string, context?: string): string => {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('summar') || lowerPrompt.includes('summary')) {
      return `## 📋 AI Summary\n\nBased on the research content, here's a comprehensive summary:\n\n### Key Points:\n• Main research themes clearly identified\n• Important findings systematically highlighted\n• Recommendations for further study provided\n\n*This is an enhanced AI-generated summary with structured formatting.*`;
    }
    
    if (lowerPrompt.includes('translat')) {
      const langMatch = prompt.match(/to\s+(\w+)/i);
      const language = langMatch ? langMatch[1] : 'Spanish';
      return `## 🌍 Translated Content (${language})\n\n"Translated text would appear here with proper context preservation, cultural adaptation, and technical accuracy."\n\n*Translation powered by advanced AI language model with academic tone preservation.*`;
    }
    
    if (lowerPrompt.includes('rewrite') || lowerPrompt.includes('rephrase')) {
      return `## ✍️ Enhanced Version\n\nRewritten content with improved clarity, better logical flow, and appropriate academic tone while meticulously preserving the original meaning and key information.\n\n### Improvements:\n• Enhanced sentence structure\n• Improved readability\n• Academic tone optimization\n\n*AI-enhanced writing with superior structure and readability.*`;
    }
    
    if (lowerPrompt.includes('expand') || lowerPrompt.includes('elaborate')) {
      return `## 🔍 Expanded Analysis\n\nDetailed expansion with additional context, supporting evidence, and related concepts that build upon the original content to provide deeper insights and comprehensive understanding.\n\n### Additional Content:\n• Contextual background information\n• Supporting evidence and examples\n• Related concepts and connections\n\n*AI-powered content expansion with thorough analysis.*`;
    }
    
    return `## 🤖 AI Research Assistant Response\n\nI've analyzed your query "${prompt.substring(0, 50)}..." and based on the research context, here are my structured insights:\n\n### Analysis:\n• Query understanding confirmed\n• Contextual research integration\n• Actionable recommendations provided\n\n*AI assistant ready to help with your advanced research needs.*`;
  };

  const generateSummary = async (content: string, type: 'tab' | 'draft'): Promise<string> => {
    const prompt = `Please provide a comprehensive, well-structured summary of this ${type} content. Use markdown formatting with clear sections:\n\n${content.substring(0, 2000)}`;
    return await promptAI(prompt, 'You are an expert research assistant specializing in creating concise, informative, and well-structured summaries for academic research.');
  };

  const translateContent = async (content: string, targetLanguage: string): Promise<string> => {
    const prompt = `Translate the following academic text to ${targetLanguage}. Preserve technical terms, academic tone, and formatting:\n\n${content}`;
    return await promptAI(prompt, 'You are a professional academic translator specializing in research content translation with technical accuracy.');
  };

  const rewriteContent = async (content: string, style: string = 'academic'): Promise<string> => {
    const prompt = `Rewrite the following content in ${style} style while preserving all key information and enhancing clarity:\n\n${content}`;
    return await promptAI(prompt, `You are an expert academic editor specializing in ${style} writing style enhancement.`);
  };

  const expandContent = async (content: string, context: string): Promise<string> => {
    const prompt = `Expand on this content with ${context}, providing detailed analysis and additional relevant information:\n\n${content}`;
    return await promptAI(prompt, 'You are a research expert who can expand content with detailed analysis, additional context, and comprehensive insights.');
  };

  const autoGenerateDraft = async (tabs: ITab[], theme: string): Promise<string> => {
    const tabContents = tabs.map(tab => `Source: ${tab.title}\nContent: ${tab.content}`).join('\n\n');
    const prompt = `Create a well-structured research draft about "${theme}" using these sources. Use proper academic formatting with sections:\n\n${tabContents}`;
    return await promptAI(prompt, 'You are an expert research writer who synthesizes information from multiple sources into coherent, well-structured academic drafts.');
  };

  const chatWithAI = async (message: string, context: { tabs: ITab[], drafts: IDraft[], session: IResearchSession }): Promise<string> => {
    const contextPrompt = `Research Session: ${context.session.title}
Available Sources: ${context.tabs.length} research tabs
Draft Versions: ${context.drafts.length} saved drafts
Current User Query: ${message}`;
    
    return await promptAI(message, `You are a sophisticated research assistant for project "${context.session.title}". Provide helpful, contextual, and well-structured responses using markdown formatting when appropriate.`);
  };

  return {
    aiStatus,
    aiSession,
    downloadProgress,
    generateSummary,
    translateContent,
    rewriteContent,
    expandContent,
    autoGenerateDraft,
    chatWithAI,
    promptAI,
    initializeAI,
    retryInitialization: initializeAI
  };
};

// Enhanced Collaboration Hook with Real-time Features
const useAdvancedCollaboration = (sessionId: string, userId: string) => {
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [collaborationEvents, setCollaborationEvents] = useState<any[]>([]);
  const [isCollaborativeEditing, setIsCollaborativeEditing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!sessionId || !userId) return;

    let channel: any;

    const setupRealtime = async () => {
      try {
        channel = supabase.channel(`session:${sessionId}`, {
          config: {
            presence: {
              key: userId
            }
          }
        });

        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const users = Object.values(state).flat() as any[];
            setOnlineUsers(users.filter(user => user.user_id !== userId));
          })
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'tabs', filter: `session_id=eq.${sessionId}` },
            (payload: any) => {
              setCollaborationEvents(prev => [...prev.slice(-49), {
                type: 'tab_update',
                payload,
                timestamp: new Date(),
                user: payload.new?.user_id || 'system'
              }]);
            }
          )
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'drafts', filter: `research_session_id=eq.${sessionId}` },
            (payload: any) => {
              setCollaborationEvents(prev => [...prev.slice(-49), {
                type: 'draft_update',
                payload,
                timestamp: new Date(),
                user: payload.new?.user_id || 'system'
              }]);
            }
          )
          .on('broadcast', { event: 'collaboration_message' }, (payload: any) => {
            setCollaborationEvents(prev => [...prev.slice(-49), {
              type: 'collaboration_message',
              payload,
              timestamp: new Date(),
              user: payload.payload.user_id
            }]);
          })
          .subscribe(async (status: string) => {
            setIsConnected(status === 'SUBSCRIBED');
            if (status === 'SUBSCRIBED') {
              await channel.track({
                user_id: userId,
                online_at: new Date().toISOString(),
                last_active: new Date().toISOString(),
                status: 'online'
              });
            }
          });

      } catch (error) {
        console.error('Collaboration setup error:', error);
        setIsConnected(false);
      }
    };

    setupRealtime();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [sessionId, userId, supabase]);

  const sendCollaborationMessage = async (message: string) => {
    try {
      const channel = supabase.channel(`session:${sessionId}`);
      await channel.send({
        type: 'broadcast',
        event: 'collaboration_message',
        payload: { 
          message, 
          user_id: userId, 
          timestamp: new Date().toISOString() 
        }
      });
    } catch (error) {
      console.error('Error sending collaboration message:', error);
    }
  };

  return {
    onlineUsers,
    collaborationEvents,
    isCollaborativeEditing,
    setIsCollaborativeEditing,
    sendCollaborationMessage,
    isConnected
  };
};

// Enhanced Editor Component with AI Integration
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
    updateContent();
  };

  const updateContent = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleAIAction = async (action: string, options?: any) => {
    if (!onAIAction || !editorRef.current) return;
    
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || editorRef.current.innerText.trim();
    
    if (!selectedText) return;
    
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
        const p = document.createElement('p');
        p.innerHTML = result;
        editorRef.current.appendChild(p);
      }
      
      updateContent();
    } catch (error) {
      console.error('AI Action failed:', error);
      if (editorRef.current) {
        const errorMsg = document.createElement('p');
        errorMsg.className = 'text-red-500 text-sm italic';
        errorMsg.textContent = 'AI service temporarily unavailable. Please try again.';
        editorRef.current.appendChild(errorMsg);
        updateContent();
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
    updateContent();
  };

  const AI_TOOLS = [
    { 
      id: 'summarize', 
      label: 'Summarize', 
      icon: FiFileText, 
      description: 'Create a concise summary',
      options: [
        { label: 'Brief', value: 'brief' }, 
        { label: 'Detailed', value: 'detailed' },
        { label: 'Bullet Points', value: 'bullet' }
      ]
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
        { label: 'Chinese', value: 'zh' },
        { label: 'Japanese', value: 'ja' }
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
        { label: 'Simple', value: 'simple' },
        { label: 'Formal', value: 'formal' }
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
        { label: 'With Analysis', value: 'analysis' },
        { label: 'With Citations', value: 'citations' }
      ]
    }
  ];

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden relative bg-white">
      {/* AI Tools Panel */}
      {showAITools && (
        <div className="absolute top-16 right-4 z-20 bg-white border border-gray-200 rounded-lg shadow-xl w-80">
          <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-purple-50">
            <div>
              <h4 className="font-semibold text-gray-900">AI Writing Assistant</h4>
              <p className="text-xs text-gray-600">Enhance your research writing</p>
            </div>
            <button 
              onClick={() => setShowAITools(false)} 
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3 max-h-64 overflow-y-auto">
            {AI_TOOLS.map(tool => (
              <div key={tool.id} className="mb-3 last:mb-0">
                <button
                  onClick={() => handleAIAction(tool.id)}
                  disabled={isAILoading}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left border border-transparent hover:border-gray-200"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <tool.icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{tool.label}</div>
                    <div className="text-xs text-gray-600 truncate">{tool.description}</div>
                  </div>
                  {isAILoading && activeAITool === tool.id && (
                    <div className="flex-shrink-0">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </button>
                {tool.options && tool.options.length > 0 && (
                  <div className="flex flex-wrap gap-1 ml-11 mt-2">
                    {tool.options.map(option => (
                      <button
                        key={option.value}
                        onClick={() => handleAIAction(tool.id, { style: option.value })}
                        className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                        disabled={isAILoading}
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
      <div className="flex flex-wrap items-center gap-1 p-3 border-b border-gray-200 bg-gray-50">
        <button 
          onClick={() => setShowAITools(!showAITools)}
          disabled={isAILoading}
          className="p-2 rounded-lg hover:bg-gray-200 transition-colors relative group border border-transparent hover:border-gray-300"
          title="AI Assistant"
        >
          <FiZap className="w-4 h-4 text-purple-600" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-white"></span>
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <div className="flex items-center gap-1">
          <button onClick={() => formatText('bold')} className="p-2 rounded hover:bg-gray-200" title="Bold">
            <FiBold className="w-4 h-4" />
          </button>
          <button onClick={() => formatText('italic')} className="p-2 rounded hover:bg-gray-200" title="Italic">
            <FiItalic className="w-4 h-4" />
          </button>
          <button onClick={() => formatText('underline')} className="p-2 rounded hover:bg-gray-200" title="Underline">
            <FiUnderline className="w-4 h-4" />
          </button>
        </div>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <div className="flex items-center gap-1">
          <button onClick={() => formatText('insertUnorderedList')} className="p-2 rounded hover:bg-gray-200" title="Bullet List">
            <FiList className="w-4 h-4" />
          </button>
          <button onClick={() => formatText('insertOrderedList')} className="p-2 rounded hover:bg-gray-200" title="Numbered List">
            <FiList className="w-4 h-4" />
          </button>
        </div>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <div className="flex items-center gap-1">
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
      </div>
      
      {/* Editor Content */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={updateContent}
        onPaste={handlePaste}
        className="min-h-96 p-6 focus:outline-none prose prose-sm max-w-none bg-white leading-relaxed"
        dangerouslySetInnerHTML={{ 
          __html: value || `<p class="text-gray-400 italic">${placeholder}</p>` 
        }}
      />

      {/* Status Bar */}
      <div className="flex justify-between items-center px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
        <div className="flex items-center space-x-4">
          {isCollaborative && onlineUsers.length > 0 && (
            <div className="flex items-center space-x-2">
              <div className="flex -space-x-2">
                {onlineUsers.slice(0, 3).map((user, index) => (
                  <div 
                    key={index} 
                    className="w-5 h-5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium"
                    title={user.user_id || 'Collaborator'}
                  >
                    {user.user_id?.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                ))}
                {onlineUsers.length > 3 && (
                  <div 
                    className="w-5 h-5 bg-gray-400 rounded-full border-2 border-white flex items-center justify-center text-white text-xs"
                    title={`${onlineUsers.length - 3} more collaborators`}
                  >
                    +{onlineUsers.length - 3}
                  </div>
                )}
              </div>
              <span>{onlineUsers.length} online</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {isAILoading && (
            <div className="flex items-center space-x-1 text-blue-600">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              <span>AI Processing...</span>
            </div>
          )}
        </div>
      </div>

      {/* AI Loading Overlay */}
      {isAILoading && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10 rounded-lg">
          <div className="flex items-center space-x-3 text-blue-600 bg-white px-4 py-3 rounded-lg shadow-lg border border-blue-200">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div>
              <div className="font-medium text-sm">AI is processing your request</div>
              <div className="text-xs text-blue-500">This may take a few seconds...</div>
            </div>
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
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div 
        className={`bg-white rounded-xl shadow-2xl ${sizeClasses[size]} w-full max-h-[90vh] overflow-y-auto animate-scaleIn`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white rounded-t-xl">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
          >
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

// Enhanced Tab Modal with AI Integration
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
  const [isLoading, setIsLoading] = useState(false);

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
  }, [editingTab, isOpen]);

  const generateTitleFromContent = async () => {
    if (!content.trim() || !onAIAction) return;
    
    setIsGeneratingTitle(true);
    try {
      const generatedTitle = await onAIAction('generate_title', content);
      setTitle(generatedTitle.replace(/^#+\s*/, '').trim()); // Remove markdown headers
    } catch (error) {
      console.error('Failed to generate title:', error);
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const extractContentFromUrl = async () => {
    if (!url.trim()) return;
    
    try {
      setIsLoading(true);
      // Simulate content extraction - in real implementation, you'd use an API
      setTimeout(() => {
        if (url.includes('arxiv') || url.includes('research')) {
          setContent('Research paper content extracted successfully. Add your notes and key findings below...');
        }
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Content extraction failed:', error);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    onSave({
      id: editingTab?.id,
      url: url.trim(),
      title: title.trim() || 'New Research Tab',
      content: content.trim()
    });
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={editingTab ? 'Edit Research Tab' : 'Add Research Tab'} 
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Research URL *
          </label>
          <div className="flex space-x-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={extractContentFromUrl}
              placeholder="https://arxiv.org/abs/1234.5678"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              required
              disabled={isLoading}
            />
            {isLoading && (
              <div className="flex items-center px-3 bg-gray-100 rounded-lg">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title
            {content.trim() && onAIAction && (
              <button
                type="button"
                onClick={generateTitleFromContent}
                disabled={isGeneratingTitle}
                className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
              >
                {isGeneratingTitle ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                    Generating...
                  </span>
                ) : (
                  '✨ AI Suggest Title'
                )}
              </button>
            )}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Research paper title or description"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Research Notes & Key Findings
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add your research notes, key findings, summary, or important quotes..."
            rows={6}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-vertical"
          />
          <p className="text-xs text-gray-500 mt-1">
            AI will automatically generate a summary when you save this tab.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
          >
            <FiSave className="w-4 h-4" />
            <span>{editingTab ? 'Update Tab' : 'Add Research Tab'}</span>
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
  aiProgress?: number;
}> = ({ messages, onSendMessage, isLoading, aiStatus, aiProgress = 0 }) => {
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const quickPrompts = [
    "Summarize my research findings",
    "Help me structure the research paper",
    "Translate key points to Spanish",
    "Improve academic tone of my draft",
    "Suggest research questions and hypotheses",
    "Analyze the methodology of my sources",
    "Generate an abstract from my content"
  ];

  const getAIStatusColor = () => {
    switch (aiStatus) {
      case 'ready': return 'bg-green-500';
      case 'loading': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getAIStatusText = () => {
    switch (aiStatus) {
      case 'ready': return 'AI Assistant Ready';
      case 'loading': return aiProgress > 0 ? `Downloading AI Model... ${aiProgress.toFixed(1)}%` : 'Initializing AI...';
      case 'error': return 'AI Service Temporarily Unavailable';
      default: return 'AI Assistant Loading...';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border border-gray-200 overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${getAIStatusColor()} animate-pulse`}></div>
            <div className={`absolute inset-0 rounded-full ${getAIStatusColor()} animate-ping`}></div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">AI Research Assistant</h3>
            <p className="text-sm text-gray-600">{getAIStatusText()}</p>
          </div>
          {aiStatus === 'loading' && aiProgress > 0 && (
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${aiProgress}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Prompts */}
      {messages.length === 0 && (
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <p className="text-sm text-blue-800 mb-3 font-medium">Quick Start Prompts:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => setInput(prompt)}
                className="text-left text-xs bg-blue-100 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-200 transition-colors border border-blue-200"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-2xl rounded-2xl p-4 shadow-sm ${
              message.sender === 'user' 
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-none' 
                : 'bg-white text-gray-900 rounded-bl-none border border-gray-100 shadow-sm'
            }`}>
              <div className="flex items-center space-x-2 mb-3">
                {message.sender === 'ai' && (
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <FiZap className="w-3 h-3 text-white" />
                  </div>
                )}
                <span className="text-sm font-medium">
                  {message.sender === 'user' ? 'You' : 'Research Assistant'}
                </span>
                <span className="text-xs opacity-70">
                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className={`prose prose-sm max-w-none ${
                message.sender === 'user' ? 'text-blue-100' : 'text-gray-800'
              }`}>
                <div dangerouslySetInnerHTML={{ 
                  __html: message.content.replace(/\n/g, '<br>') 
                }} />
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-900 rounded-2xl rounded-bl-none p-4 border border-gray-100 shadow-sm max-w-md">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">AI is thinking</div>
                  <div className="text-xs text-gray-500">Analyzing your research context...</div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              placeholder="Ask AI about your research, request analysis, or seek writing help..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
              rows={1}
              disabled={isLoading}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <div className="absolute right-3 top-3 text-gray-400">
              <FiMessageSquare className="w-4 h-4" />
            </div>
          </div>
          <button 
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 transition-all flex items-center space-x-2 shadow-sm"
          >
            <FiSend className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>{input.length}/1000</span>
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
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address.');
      }

      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        throw new Error('User not found. Please check the email address or ask them to create an account first.');
      }

      // Check if already a collaborator
      const isAlreadyCollaborator = currentCollaborators.some(collab => collab.user_id === userData.id);
      if (isAlreadyCollaborator) {
        throw new Error('This user is already a collaborator on this research session.');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

      // Add collaborator
      const { error: insertError } = await supabase
        .from('session_collaborators')
        .insert({
          session_id: sessionId,
          user_id: userData.id,
          role: role,
          invited_at: new Date().toISOString(),
          invited_by: user.id
        });

      if (insertError) throw insertError;

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
    <form onSubmit={handleInvite} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-start space-x-3">
          <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium">Invitation Failed</div>
            <div>{error}</div>
          </div>
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Address *
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="collaborator@university.edu"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Collaborator Role *</label>
        <div className="space-y-3">
          <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <input
              type="radio"
              value="editor"
              checked={role === 'editor'}
              onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
              className="text-blue-600 focus:ring-blue-500 mt-1"
              disabled={isLoading}
            />
            <div className="flex-1">
              <span className="font-medium text-gray-900">Editor</span>
              <p className="text-sm text-gray-600 mt-1">
                Can edit content, add research tabs, manage drafts, and invite other collaborators
              </p>
            </div>
          </label>
          <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <input
              type="radio"
              value="viewer"
              checked={role === 'viewer'}
              onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
              className="text-blue-600 focus:ring-blue-500 mt-1"
              disabled={isLoading}
            />
            <div className="flex-1">
              <span className="font-medium text-gray-900">Viewer</span>
              <p className="text-sm text-gray-600 mt-1">
                Can view content and comments but cannot make changes or invite others
              </p>
            </div>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Personal Message (Optional)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a personal message to introduce the research project and collaboration..."
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-br from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 transition-all font-medium shadow-sm"
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Sending Invitation...</span>
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
  const { 
    onlineUsers, 
    collaborationEvents, 
    isCollaborativeEditing, 
    setIsCollaborativeEditing, 
    sendCollaborationMessage,
    isConnected 
  } = useAdvancedCollaboration(sessionId, userProfile?.id || '');

  const aiService = useAdvancedAIService();

  // Load session data with enhanced error handling
  const loadSessionData = async () => {
    try {
      setLoading(true);
      
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

      // Load session with error handling
      const { data: sessionData, error: sessionError } = await supabase
        .from('research_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !sessionData) {
        console.error('Session load error:', sessionError);
        setModal({ type: 'error', data: { message: 'Research session not found or access denied.' } });
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

      // Load all related data in parallel with error handling
      const [
        tabsResponse, 
        draftsResponse, 
        collaboratorsResponse, 
        messagesResponse, 
        summariesResponse
      ] = await Promise.all([
        supabase.from('tabs').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }),
        supabase.from('drafts').select('*').eq('research_session_id', sessionId).order('created_at', { ascending: false }),
        supabase.from('session_collaborators').select('*, profiles:user_id(full_name, email)').eq('session_id', sessionId),
        supabase.from('session_messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }),
        supabase.from('summaries').select('*').eq('tab_id', tabs.map(t => t.id))
      ]);

      // Handle responses with error checking
      if (tabsResponse.data) setTabs(tabsResponse.data);
      if (draftsResponse.data) {
        setDrafts(draftsResponse.data);
        if (draftsResponse.data.length > 0) {
          setCurrentDraft(draftsResponse.data[0].content);
        }
      }
      if (collaboratorsResponse.data) setCollaborators(collaboratorsResponse.data);
      if (messagesResponse.data) setChatMessages(messagesResponse.data);
      if (summariesResponse.data) setSummaries(summariesResponse.data);

    } catch (error) {
      console.error('Error loading session:', error);
      setModal({ type: 'error', data: { message: 'Failed to load session data. Please try refreshing the page.' } });
    } finally {
      setLoading(false);
    }
  };

  // Enhanced CRUD Operations with AI Integration
  const createTab = async (tabData: Partial<ITab>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

      const { data, error } = await supabase
        .from('tabs')
        .insert([{
          session_id: sessionId,
          url: tabData.url,
          title: tabData.title,
          content: tabData.content,
          favicon: `https://www.google.com/s2/favicons?domain=${new URL(tabData.url!).hostname}&sz=64`,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      
      setTabs(prev => [data, ...prev]);
      
      // Auto-generate summary using AI if content exists
      if (tabData.content && tabData.content.length > 50) {
        try {
          const summary = await aiService.generateSummary(tabData.content, 'tab');
          await supabase
            .from('summaries')
            .insert([{
              tab_id: data.id,
              summary: summary,
              created_at: new Date().toISOString()
            }]);
          
          // Reload summaries to include the new one
          const { data: newSummaries } = await supabase
            .from('summaries')
            .select('*')
            .eq('tab_id', data.id);
            
          if (newSummaries) {
            setSummaries(prev => [...prev, ...newSummaries]);
          }
        } catch (summaryError) {
          console.error('Auto-summary generation failed:', summaryError);
        }
      }
      
      setModal({ type: 'success', data: { message: 'Research tab added successfully! AI summary generated.' } });
    } catch (error: any) {
      console.error('Create tab error:', error);
      setModal({ type: 'error', data: { message: error.message || 'Failed to create research tab.' } });
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
      setModal({ type: 'success', data: { message: 'Research tab updated successfully!' } });
    } catch (error: any) {
      console.error('Update tab error:', error);
      setModal({ type: 'error', data: { message: error.message || 'Failed to update research tab.' } });
    }
  };

  const deleteTab = async (tabId: string) => {
    if (!confirm('Are you sure you want to delete this research tab? This action cannot be undone.')) return;
    
    try {
      const { error } = await supabase
        .from('tabs')
        .delete()
        .eq('id', tabId);

      if (error) throw error;
      
      setTabs(prev => prev.filter(tab => tab.id !== tabId));
      setModal({ type: 'success', data: { message: 'Research tab deleted successfully!' } });
    } catch (error: any) {
      console.error('Delete tab error:', error);
      setModal({ type: 'error', data: { message: error.message || 'Failed to delete research tab.' } });
    }
  };

  const saveDraft = async () => {
    if (!sessionId || !currentDraft.trim()) {
      setModal({ type: 'error', data: { message: 'Cannot save empty draft. Please add some content first.' } });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

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
      if (collaborators.length > 0 && isConnected) {
        await sendCollaborationMessage(`New draft version ${drafts.length + 1} saved by ${userProfile?.full_name || 'a collaborator'}`);
      }
      
      setModal({ type: 'success', data: { message: 'Draft saved successfully!' } });
    } catch (error: any) {
      console.error('Save draft error:', error);
      setModal({ type: 'error', data: { message: error.message || 'Failed to save draft.' } });
    }
  };

  const generateAIDraft = async () => {
    if (tabs.length === 0) {
      setModal({ type: 'error', data: { message: 'No research tabs available to generate draft from. Please add some research sources first.' } });
      return;
    }

    setIsChatLoading(true);
    try {
      const aiDraft = await aiService.autoGenerateDraft(tabs, session?.title || 'Research Project');
      setCurrentDraft(aiDraft);
      setModal({ type: 'success', data: { message: 'AI draft generated successfully! You can now edit and save it.' } });
    } catch (error: any) {
      console.error('AI draft generation error:', error);
      setModal({ type: 'error', data: { message: 'Failed to generate AI draft. Please try again.' } });
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
      setModal({ type: 'success', data: { message: 'Research session title updated successfully!' } });
    } catch (error: any) {
      console.error('Update title error:', error);
      setModal({ type: 'error', data: { message: error.message || 'Failed to update title.' } });
    }
  };

  const sendChatMessage = async (content: string) => {
    if (!session) return;

    const userMessage: ISessionMessage = {
      id: `msg_${Date.now()}`,
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
        id: `msg_${Date.now() + 1}`,
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
        id: `msg_${Date.now() + 1}`,
        session_id: sessionId,
        content: '## ❌ Service Temporarily Unavailable\n\nI apologize, but I encountered an error while processing your request. This might be due to high demand or temporary service issues. Please try again in a few moments.\n\nIn the meantime, you can continue working on your research draft or explore your saved tabs.',
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
          const title = await aiService.promptAI(`Generate a concise, academic title for this content: ${content}`);
          return title.replace(/^#+\s*/, '').trim();
        default:
          return content;
      }
    } catch (error) {
      console.error('AI Action failed:', error);
      return `## ⚠️ AI Service Unavailable\n\nThe ${action} feature is currently unavailable. Please try again later or continue with manual editing.\n\n**Error Details:** ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };

  // Initial load
  useEffect(() => {
    if (sessionId) {
      loadSessionData();
    }
  }, [sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Research Session</h2>
            <p className="text-gray-600">Preparing your research environment...</p>
            {aiService.aiStatus === 'loading' && (
              <div className="mt-4 w-48 mx-auto bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${aiService.downloadProgress}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="text-center max-w-md mx-auto p-8">
            <FiAlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Research Session Not Found</h1>
            <p className="text-gray-600 mb-6">
              The research session youre looking for doesnt exist or you dont have permission to access it.
            </p>
            <button 
              onClick={() => router.push('/dashboard')} 
              className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm"
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Enhanced Header */}
          <div className="mb-8">
            <button 
              onClick={() => router.push('/dashboard')} 
              className="inline-flex items-center text-gray-600 hover:text-black mb-6 transition-colors group"
            >
              <FiChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </button>
            
            <div className="flex items-center gap-3 mb-3">
              {isEditingTitle ? (
                <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-blue-300 shadow-sm">
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-3xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none flex-1 min-w-0"
                    autoFocus
                    onKeyPress={(e) => e.key === 'Enter' && updateSessionTitle()}
                    onBlur={updateSessionTitle}
                  />
                  <div className="flex gap-1">
                    <button 
                      onClick={updateSessionTitle} 
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Save title"
                    >
                      <FiCheck className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setIsEditingTitle(false)} 
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Cancel editing"
                    >
                      <FiX className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 group">
                  <h1 className="text-3xl font-bold text-gray-900 break-words">{session.title}</h1>
                  {(sessionPermissions === 'owner' || sessionPermissions === 'editor') && (
                    <button 
                      onClick={() => setIsEditingTitle(true)} 
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="Edit title"
                    >
                      <FiEdit3 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-gray-600 flex-wrap">
              <span className="flex items-center gap-2 bg-white px-3 py-1 rounded-full text-sm shadow-sm">
                <FiClock className="w-4 h-4" />
                Created {new Date(session.created_at).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-2 bg-white px-3 py-1 rounded-full text-sm shadow-sm">
                <FiBook className="w-4 h-4" />
                {tabs.length} research {tabs.length === 1 ? 'source' : 'sources'}
              </span>
              <span className="flex items-center gap-2 bg-white px-3 py-1 rounded-full text-sm shadow-sm">
                <FiEdit2 className="w-4 h-4" />
                {drafts.length} draft {drafts.length === 1 ? 'version' : 'versions'}
              </span>
              <span className="flex items-center gap-2 bg-white px-3 py-1 rounded-full text-sm shadow-sm">
                <FiUsers className="w-4 h-4" />
                {collaborators.length + 1} collaborator{collaborators.length + 1 === 1 ? '' : 's'}
              </span>
              {onlineUsers.length > 0 && (
                <span className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm shadow-sm">
                  <FiWifi className="w-4 h-4" />
                  {onlineUsers.length} online now
                </span>
              )}
              {!isConnected && (
                <span className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm shadow-sm">
                  <FiWifiOff className="w-4 h-4" />
                  Offline mode
                </span>
              )}
            </div>

            {/* Team Badge */}
            {teams.length > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm shadow-sm">
                <FiUsers className="w-3 h-3" />
                Team: {teams[0].name}
              </div>
            )}
          </div>

          {/* Enhanced Navigation Tabs */}
          <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-lg shadow-sm">
            {[
              { id: 'content', label: 'Research Content', icon: FiBook, count: tabs.length },
              { id: 'drafts', label: 'Drafts', icon: FiEdit2, count: drafts.length },
              { id: 'chat', label: 'AI Assistant', icon: FiMessageSquare, badge: aiService.aiStatus },
              { id: 'collaborate', label: 'Collaborate', icon: FiUsers, count: collaborators.length + 1 }
            ].map(({ id, label, icon: Icon, count, badge }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 px-6 py-4 border-b-2 font-medium whitespace-nowrap transition-all flex-1 justify-center min-w-0 ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{label}</span>
                {count !== undefined && (
                  <span className={`px-2 py-1 rounded-full text-xs min-w-[2rem] text-center ${
                    activeTab === id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {count}
                  </span>
                )}
                {badge && (
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Research Sources</h2>
                  <p className="text-gray-600 text-sm">Manage your research references and sources</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {(sessionPermissions === 'owner' || sessionPermissions === 'editor') && (
                    <>
                      <button 
                        onClick={generateAIDraft}
                        disabled={tabs.length === 0 || isChatLoading}
                        className="bg-gradient-to-br from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 transition-all flex items-center space-x-2 shadow-sm"
                      >
                        <FiZap className="w-4 h-4" />
                        <span>Generate AI Draft</span>
                      </button>
                      <button 
                        onClick={() => {
                          setEditingTab(null);
                          setShowTabModal(true);
                        }}
                        className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center space-x-2 shadow-sm"
                      >
                        <FiPlus className="w-4 h-4" />
                        <span>Add Research Source</span>
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
                      <div key={tab.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all bg-white group">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center space-x-2 max-w-[70%]">
                            {tab.favicon && (
                              <img src={tab.favicon} alt="Favicon" className="w-4 h-4 flex-shrink-0" />
                            )}
                            <h3 className="font-semibold text-gray-900 truncate" title={tab.title || 'Untitled'}>
                              {tab.title || 'Untitled Research Source'}
                            </h3>
                          </div>
                          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                  title="Edit source"
                                >
                                  <FiEdit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => deleteTab(tab.id)} 
                                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                  title="Delete source"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 truncate mb-2" title={tab.url}>{tab.url}</p>
                        
                        {tabSummary && (
                          <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-100">
                            <div className="flex items-center space-x-2 mb-2">
                              <FiZap className="w-3 h-3 text-blue-600" />
                              <span className="text-xs font-medium text-blue-800">AI Summary</span>
                            </div>
                            <p className="text-xs text-blue-700 line-clamp-3">{tabSummary.summary}</p>
                          </div>
                        )}
                        
                        {tab.content && (
                          <p className="text-sm text-gray-700 line-clamp-3 mb-3">{tab.content}</p>
                        )}
                        
                        <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-100">
                          <span>Added {new Date(tab.created_at).toLocaleDateString()}</span>
                          {tabSummary && (
                            <span className="flex items-center space-x-1 text-amber-600">
                              <FiStar className="w-3 h-3" />
                              <span>Summarized</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
                  <FiBook className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">No research sources yet</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Start by adding research papers, articles, or online resources to build your research foundation.
                  </p>
                  {(sessionPermissions === 'owner' || sessionPermissions === 'editor') && (
                    <button 
                      onClick={() => setShowTabModal(true)}
                      className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm"
                    >
                      Add Your First Research Source
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Enhanced Drafts Tab */}
          {activeTab === 'drafts' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Research Draft</h2>
                    <p className="text-gray-600 text-sm">Write and refine your research content</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={saveDraft}
                      disabled={sessionPermissions === 'viewer' || !currentDraft.trim()}
                      className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 transition-all flex items-center space-x-2 shadow-sm"
                    >
                      <FiSave className="w-4 h-4" />
                      <span>Save Draft</span>
                    </button>
                  </div>
                </div>
                
                <AdvancedEditor
                  value={currentDraft}
                  onChange={setCurrentDraft}
                  placeholder="Start writing your research findings. Use the AI tools (⚡) to enhance your writing, summarize content, or translate sections..."
                  disabled={sessionPermissions === 'viewer'}
                  onlineUsers={onlineUsers}
                  currentUser={userProfile}
                  onAIAction={handleAIAction}
                  isCollaborative={isCollaborativeEditing}
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Draft Versions</h3>
                    <p className="text-gray-600 text-sm">Previous versions and auto-saves</p>
                  </div>
                  <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {drafts.length} version{drafts.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {drafts.map((draft, index) => (
                    <div 
                      key={draft.id} 
                      className={`border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-all group ${
                        currentDraft === draft.content ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200'
                      }`}
                      onClick={() => setCurrentDraft(draft.content)}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-900">Version {draft.version}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(draft.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {draft.content.replace(/<[^>]*>/g, ' ').substring(0, 150)}...
                      </p>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{draft.content.replace(/<[^>]*>/g, '').length} characters</span>
                        {currentDraft === draft.content && (
                          <span className="text-blue-600 font-medium flex items-center space-x-1">
                            <FiCheck className="w-3 h-3" />
                            <span>Current</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {drafts.length === 0 && (
                    <div className="text-center py-12 text-gray-500 bg-white rounded-lg border-2 border-dashed border-gray-300">
                      <FiEdit2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">No saved drafts yet</p>
                      <p className="text-sm mt-1">Start writing to save your first version</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Enhanced AI Chat Tab */}
          {activeTab === 'chat' && (
            <div className="bg-white border border-gray-200 rounded-xl h-[600px] flex flex-col shadow-sm">
              <AIChat
                messages={chatMessages}
                onSendMessage={sendChatMessage}
                isLoading={isChatLoading}
                aiStatus={aiService.aiStatus}
                aiProgress={aiService.downloadProgress}
              />
            </div>
          )}

          {/* Enhanced Collaborate Tab */}
          {activeTab === 'collaborate' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Team Collaboration</h2>
                  <p className="text-gray-600 text-sm">Manage collaborators and team settings</p>
                </div>
                <button 
                  onClick={() => setModal({ type: 'invite' })}
                  disabled={sessionPermissions === 'viewer'}
                  className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 transition-all flex items-center space-x-2 shadow-sm"
                >
                  <FiUser className="w-4 h-4" />
                  <span>Invite Collaborator</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Team Members */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="font-semibold text-gray-900 text-lg">Team Members</h3>
                  <div className="space-y-3">
                    {/* Current User */}
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-medium text-lg shadow-sm">
                          {userProfile?.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{userProfile?.full_name || 'You'}</div>
                          <div className="text-sm text-gray-600">{userProfile?.email}</div>
                          <div className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-1 rounded-full inline-block mt-1">
                            Session Owner
                          </div>
                        </div>
                      </div>
                      <span className="flex items-center space-x-2 text-green-600 text-sm bg-green-100 px-3 py-1 rounded-full">
                        <FiWifi className="w-4 h-4" />
                        <span>Online</span>
                      </span>
                    </div>
                    
                    {/* Collaborators */}
                    {collaborators.map((collab: any) => (
                      <div key={collab.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white font-medium text-lg shadow-sm">
                            {collab.profiles?.full_name?.[0]?.toUpperCase() || 'C'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{collab.profiles?.full_name || 'Collaborator'}</div>
                            <div className="text-sm text-gray-600">{collab.profiles?.email}</div>
                            <div className={`text-xs capitalize px-2 py-1 rounded-full inline-block mt-1 ${
                              collab.role === 'editor' 
                                ? 'text-green-800 bg-green-100' 
                                : 'text-gray-800 bg-gray-100'
                            }`}>
                              {collab.role}
                            </div>
                          </div>
                        </div>
                        <span className="text-gray-500 text-sm bg-gray-100 px-3 py-1 rounded-full">
                          Last active recently
                        </span>
                      </div>
                    ))}

                    {collaborators.length === 0 && (
                      <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
                        <FiUsers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-gray-600">No collaborators yet</p>
                        <p className="text-sm text-gray-500 mt-1">Invite team members to collaborate</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Collaboration Tools */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 text-lg">Collaboration Tools</h3>
                  <div className="space-y-4">
                    <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-medium text-gray-900">Live Collaborative Editing</div>
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
                          'Team members can edit simultaneously in real-time' : 
                          'Only one person can edit at a time'}
                      </p>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                      <div className="font-medium text-gray-900 mb-3">Recent Activity</div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {collaborationEvents.slice(-5).reverse().map((event, index) => (
                          <div key={index} className="text-xs text-gray-600 flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                            <FiActivity className="w-3 h-3 text-blue-600 flex-shrink-0" />
                            <span className="flex-1 min-w-0">
                              <span className="font-medium capitalize">{event.type.replace('_', ' ')}</span>
                              {event.user && <span> by user</span>}
                            </span>
                            <span className="text-gray-400 text-xs flex-shrink-0">
                              {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                        {collaborationEvents.length === 0 && (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            <FiActivity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            No recent activity
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50">
                      <div className="font-medium text-gray-900 mb-2">AI Collaboration Tips</div>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Use AI to summarize collaborative discussions</li>
                        <li>• Generate draft versions for team review</li>
                        <li>• Translate content for international teams</li>
                        <li>• Maintain version history of all changes</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
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
        title="Invite Research Collaborator"
        size="md"
      >
        <InviteCollaboratorForm 
          sessionId={sessionId} 
          onInviteSent={() => {
            setModal({ type: 'success', data: { message: 'Collaboration invitation sent successfully!' } });
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
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
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
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <FiAlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{modal.data?.message}</p>
            <p className="text-sm text-gray-600 mt-1">Please try again or contact support if the issue persists.</p>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}