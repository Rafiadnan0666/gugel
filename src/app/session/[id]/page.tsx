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
  FiAlignCenter, FiAlignRight, FiLink2, FiImage
} from 'react-icons/fi';

// Rich Text Editor Component
const RichTextEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}> = ({ value, onChange, placeholder = "Start writing your research findings...", disabled = false }) => {
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
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
        <button 
          type="button" 
          onClick={() => formatText('bold')}
          className="p-2 rounded hover:bg-gray-200"
          title="Bold"
        >
          <FiBold className="w-4 h-4" />
        </button>
        <button 
          type="button" 
          onClick={() => formatText('italic')}
          className="p-2 rounded hover:bg-gray-200"
          title="Italic"
        >
          <FiItalic className="w-4 h-4" />
        </button>
        <button 
          type="button" 
          onClick={() => formatText('underline')}
          className="p-2 rounded hover:bg-gray-200"
          title="Underline"
        >
          <FiUnderline className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button 
          type="button" 
          onClick={() => formatText('justifyLeft')}
          className="p-2 rounded hover:bg-gray-200"
          title="Align Left"
        >
          <FiAlignLeft className="w-4 h-4" />
        </button>
        <button 
          type="button" 
          onClick={() => formatText('justifyCenter')}
          className="p-2 rounded hover:bg-gray-200"
          title="Align Center"
        >
          <FiAlignCenter className="w-4 h-4" />
        </button>
        <button 
          type="button" 
          onClick={() => formatText('justifyRight')}
          className="p-2 rounded hover:bg-gray-200"
          title="Align Right"
        >
          <FiAlignRight className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button 
          type="button" 
          onClick={() => formatText('insertUnorderedList')}
          className="p-2 rounded hover:bg-gray-200"
          title="Bullet List"
        >
          <FiList className="w-4 h-4" />
        </button>
        <button 
          type="button" 
          onClick={() => formatText('createLink', prompt('Enter URL:'))}
          className="p-2 rounded hover:bg-gray-200"
          title="Insert Link"
        >
          <FiLink2 className="w-4 h-4" />
        </button>
      </div>
      
      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onPaste={handlePaste}
        className="min-h-96 p-4 focus:outline-none prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: value || placeholder }}
        style={{ 
          fontFamily: "'Inter', sans-serif",
          lineHeight: '1.6'
        }}
      />
    </div>
  );
};

// Modern Modal Component
const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actionButton?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}> = ({ isOpen, onClose, title, children, actionButton, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`bg-white rounded-xl shadow-2xl ${sizeClasses[size]} w-full max-h-[90vh] overflow-y-auto`}>
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
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
          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
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

// Add Tab Modal Component
const AddTabModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (url: string, title: string) => void;
}> = ({ isOpen, onClose, onAdd }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  const fetchPageInfo = async (url: string) => {
    if (!url) return;
    
    try {
      setIsFetching(true);
      // Simple URL validation
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      
      // Try to get title from the URL
      const domain = new URL(url).hostname;
      setTitle(domain);
      
      // In a real app, you might want to use a backend API to fetch page title
      // const response = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
      // const data = await response.json();
      // setTitle(data.title || domain);
      
    } catch (error) {
      setTitle(new URL(url).hostname);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onAdd(url, title || new URL(url).hostname);
      setUrl('');
      setTitle('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Research Tab" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            URL
          </label>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Page title will be fetched automatically"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {isFetching && (
            <p className="text-sm text-gray-500 mt-1">Fetching page info...</p>
          )}
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-start space-x-3">
            <FiInfo className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">Pro Tip</p>
              <p>Add research papers, articles, or any relevant web pages to your session.</p>
            </div>
          </div>
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
            Add Tab
          </button>
        </div>
      </form>
    </Modal>
  );
};

// AI Suggestion Component
const AISuggestionCard: React.FC<{
  suggestion: {
    type: 'summary' | 'analysis' | 'connection' | 'suggestion' | 'outline';
    content: string;
    confidence: number;
  };
  onApply?: () => void;
}> = ({ suggestion, onApply }) => {
  const typeConfig = {
    summary: { color: 'blue', icon: FiBook },
    analysis: { color: 'green', icon: FiBarChart2 },
    connection: { color: 'purple', icon: FiLink },
    suggestion: { color: 'yellow', icon: FiZap },
    outline: { color: 'indigo', icon: FiList }
  };

  const config = typeConfig[suggestion.type];
  const Icon = config.icon;

  return (
    <div className="border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors bg-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-lg bg-${config.color}-100`}>
            <Icon className={`w-4 h-4 text-${config.color}-600`} />
          </div>
          <span className={`text-sm font-medium text-${config.color}-800 bg-${config.color}-100 px-2 py-1 rounded-full`}>
            {suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-500">{Math.round(suggestion.confidence * 100)}% confidence</span>
        </div>
      </div>
      
      <p className="text-gray-700 leading-relaxed">{suggestion.content}</p>
      
      {onApply && (
        <div className="flex justify-end mt-4">
          <button
            onClick={onApply}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            Apply to Draft →
          </button>
        </div>
      )}
    </div>
  );
};

export default function SessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const supabase = createClient();
  const chatEndRef = useRef<HTMLDivElement>(null);

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
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [modal, setModal] = useState<{ type: string; data?: any }>({ type: '' });
  const [userInterests, setUserInterests] = useState<{topic: string; priority: 'high' | 'medium' | 'low'}[]>([]);
  const [userProfile, setUserProfile] = useState<IProfile | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [isCollaborativeEditing, setIsCollaborativeEditing] = useState(false);
  const [sessionPermissions, setSessionPermissions] = useState<'owner' | 'editor' | 'viewer'>('viewer');
  const [showAddTabModal, setShowAddTabModal] = useState(false);

  // Fixed: Save draft function
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
          session_id: sessionId,
          content: currentDraft,
          version: draftVersion
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      if (data) {
        setDrafts(prev => [data, ...prev]);
        setDraftVersion(prev => prev + 1);
        setModal({ type: 'success', data: { message: 'Draft saved successfully!' } });
      }
    } catch (error: any) {
      console.error('Error saving draft:', error);
      setModal({ type: 'error', data: { message: error.message || 'Failed to save draft.' } });
    }
  };

  // Fixed: Generate AI Insights
  const generateAISuggestions = async () => {
    setIsGeneratingAI(true);
    try {
      // Simulate AI processing - replace with actual AI service
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockSuggestions = [
        {
          type: 'summary' as const,
          content: 'Based on your research tabs, the main themes emerging are web development and AI integration. Consider structuring your draft around these core topics.',
          confidence: 0.87
        },
        {
          type: 'analysis' as const,
          content: 'Your research shows strong focus on modern frameworks. You might want to compare React with other popular frameworks like Vue or Angular.',
          confidence: 0.92
        },
        {
          type: 'connection' as const,
          content: 'The tabs about AI and web development could be connected through the topic of AI-powered development tools and their impact on productivity.',
          confidence: 0.78
        }
      ];
      
      setAiSuggestions(mockSuggestions);
      
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
      setAiSuggestions([{
        type: 'summary',
        content: 'Unable to generate insights at the moment. Please try again later.',
        confidence: 0.5
      }]);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Fixed: Export to PDF function
  const exportToPDF = () => {
    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${session?.title || 'Research Session'}</title>
          <style>
            body { 
              font-family: 'Inter', sans-serif; 
              margin: 40px; 
              line-height: 1.6;
              color: #333;
            }
            .header { 
              border-bottom: 2px solid #000; 
              padding-bottom: 20px; 
              margin-bottom: 30px;
            }
            h1 { 
              color: #000; 
              font-size: 28px;
              margin: 0;
            }
            .metadata {
              color: #666;
              font-size: 14px;
              margin-top: 10px;
            }
            .section {
              margin: 30px 0;
            }
            .section h2 {
              color: #000;
              border-bottom: 1px solid #ddd;
              padding-bottom: 10px;
              font-size: 20px;
            }
            .tab {
              margin: 20px 0;
              padding: 15px;
              border-left: 4px solid #007acc;
              background: #f8f9fa;
            }
            .draft {
              background: #fff;
              border: 1px solid #ddd;
              padding: 20px;
              margin: 15px 0;
              border-radius: 4px;
            }
            .ai-suggestion {
              background: #fff3cd;
              border: 1px solid #ffeaa7;
              padding: 15px;
              margin: 10px 0;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${session?.title || 'Research Session'}</h1>
            <div class="metadata">
              <p>Generated on: ${new Date().toLocaleDateString()}</p>
              <p>Total Tabs: ${tabs.length} | Drafts: ${drafts.length} | AI Suggestions: ${aiSuggestions.length}</p>
            </div>
          </div>

          <div class="section">
            <h2>Research Tabs (${tabs.length})</h2>
            ${tabs.map(tab => `
              <div class="tab">
                <h3>${tab.title || 'Untitled'}</h3>
                <p><strong>URL:</strong> ${tab.url}</p>
                <p><strong>Added:</strong> ${new Date(tab.created_at).toLocaleDateString()}</p>
                ${tab.content ? `<p><strong>Content:</strong> ${tab.content.substring(0, 200)}...</p>` : ''}
              </div>
            `).join('')}
          </div>

          <div class="section">
            <h2>Research Drafts (${drafts.length})</h2>
            ${drafts.map(draft => `
              <div class="draft">
                <h3>Draft Version ${draft.version}</h3>
                <p><strong>Created:</strong> ${new Date(draft.created_at).toLocaleDateString()}</p>
                <div>${draft.content}</div>
              </div>
            `).join('')}
          </div>

          ${aiSuggestions.length > 0 ? `
          <div class="section">
            <h2>AI Insights (${aiSuggestions.length})</h2>
            ${aiSuggestions.map(suggestion => `
              <div class="ai-suggestion">
                <h4>${suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)} 
                  (${Math.round(suggestion.confidence * 100)}% confidence)</h4>
                <p>${suggestion.content}</p>
              </div>
            `).join('')}
          </div>
          ` : ''}

          <div class="section">
            <h2>Session Summary</h2>
            <p>This research session contains ${tabs.length} source tabs and ${drafts.length} draft versions. 
            ${aiSuggestions.length > 0 ? `AI analysis has provided ${aiSuggestions.length} insights to guide your research.` : ''}</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Fixed: Add tab function
  const addTab = async (url: string, title: string) => {
    try {
      let favicon = '';
      try {
        favicon = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;
      } catch {
        favicon = '/images/default-favicon.png';
      }

      const { data, error } = await supabase
        .from('tabs')
        .insert([{
          session_id: sessionId,
          url,
          title: title || new URL(url).hostname,
          favicon
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

      // Load content
      const [tabsResponse, draftsResponse, summariesResponse] = await Promise.all([
        supabase.from('tabs').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }),
        supabase.from('drafts').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }),
        supabase.from('summaries').select('*').eq('session_id', sessionId)
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

      // Load user interests from localStorage
      const savedInterests = localStorage.getItem(`userInterests-${user.id}`);
      if (savedInterests) {
        setUserInterests(JSON.parse(savedInterests));
      }

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

  function updateSessionTitle(): void {
    throw new Error('Function not implemented.');
  }

  function deleteTab(id: string): void {
    throw new Error('Function not implemented.');
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
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={isCollaborativeEditing}
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
              onClick={exportToPDF}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 flex items-center transition-colors"
            >
              <FiDownload className="w-5 h-5 mr-2" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
          {[
            { id: 'content', label: 'Research Content', icon: FiBook },
            { id: 'ai', label: 'AI Insights', icon: FiZap },
            { id: 'drafts', label: 'Drafts', icon: FiEdit2 },
            { id: 'chat', label: 'Chat', icon: FiMessageSquare },
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
                    <button 
                      onClick={() => setShowAddTabModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center transition-colors"
                    >
                      <FiPlus className="w-4 h-4 mr-2" />
                      Add Tab
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {tabs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tabs.map((tab) => (
                      <div key={tab.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors group">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1 min-w-0">
                            <img 
                              src={tab.favicon || '/images/default-favicon.png'} 
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
                              <button 
                                onClick={() => deleteTab(tab.id)} 
                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete tab"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
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
                      onClick={() => setShowAddTabModal(true)}
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

        {/* AI Insights Tab */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">AI Research Insights</h2>
                <p className="text-gray-600 mt-1">AI-powered analysis of your research content</p>
              </div>
              <button 
                onClick={generateAISuggestions}
                disabled={isGeneratingAI}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center transition-colors"
              >
                <FiRefreshCw className={`w-4 h-4 mr-2 ${isGeneratingAI ? 'animate-spin' : ''}`} />
                {isGeneratingAI ? 'Generating...' : 'Generate Insights'}
              </button>
            </div>

            {isGeneratingAI ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">AI is analyzing your research content...</p>
                </div>
              </div>
            ) : aiSuggestions.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {aiSuggestions.map((suggestion, index) => (
                  <AISuggestionCard 
                    key={index} 
                    suggestion={suggestion}
                    onApply={() => {
                      setCurrentDraft(prev => prev + '\n\n' + suggestion.content);
                      setActiveTab('drafts');
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <FiZap className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No AI Insights Yet</h3>
                <p className="text-gray-600 mb-6">Generate AI insights to get research suggestions and analysis based on your content.</p>
                <button 
                  onClick={generateAISuggestions}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Generate Insights
                </button>
              </div>
            )}
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
              
              <RichTextEditor
                value={currentDraft}
                onChange={setCurrentDraft}
                placeholder="Start writing your research findings..."
                disabled={sessionPermissions === 'viewer'}
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

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="bg-white border border-gray-200 rounded-xl h-[600px] flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Research Assistant</h2>
              <p className="text-sm text-gray-600">Ask questions about your research</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatMessages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md rounded-lg p-4 ${
                    message.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-gray-100 text-gray-900 rounded-bl-none'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <span className={`text-xs block mt-2 ${
                      message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="p-6 border-t border-gray-200">
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about your research..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={isChatLoading}
                />
                <button 
                  type="button"
                  disabled={isChatLoading || !chatInput.trim()}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  <FiSend className="w-4 h-4" />
                </button>
              </div>
            </form>
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
                  {onlineUsers.length > 0 ? (
                    onlineUsers.map((user) => (
                      <div key={user.user_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="font-medium">{user.name}</span>
                          {user.user_id === userProfile?.id && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">You</span>
                          )}
                        </div>
                        <span className="text-sm text-green-600">Online</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FiUsers className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No collaborators online</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Collaboration Tools */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4">Collaboration Tools</h3>
                <div className="space-y-4">
                  <button
                    onClick={isCollaborativeEditing}
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

      {/* Add Tab Modal */}
      <AddTabModal
        isOpen={showAddTabModal}
        onClose={() => setShowAddTabModal(false)}
        onAdd={addTab}
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