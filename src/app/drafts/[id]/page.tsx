'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IDraft, IProfile } from '@/types/main.db';
import { exportToPDF } from '@/lib/pdf';

interface IDraftWithResearchSession extends IDraft {
  research_sessions: {
    title: string;
    user_id: string;
  };
  profiles?: IProfile;
}

interface IComment {
  id: string;
  content: string;
  profiles: {
    avatar_url: string;
    full_name: string;
  };
}

import {
  FiArrowLeft, FiSave, FiDownload, FiCpu, FiX,
  FiUsers, FiClock, FiMessageSquare, FiShare2,
  FiMoreVertical, FiEye, FiEdit3, FiZap, FiGlobe, FiUser
} from 'react-icons/fi';
import { useAIService } from '@/hooks/useAIService';
import { useDraftCollaboration } from '@/hooks/useDraftCollaboration';
import AdvancedEditor from '@/components/editor/AdvancedEditor';

interface EditorState {
  content: string;
  wordCount: number;
  characterCount: number;
  readingTime: number;
  lastSaved: Date | null;
}

export default function DraftEditPage() {
  const params = useParams();
  const router = useRouter();
  const draftId = params.id as string;
  const supabase = createClient();
  
  const [draft, setDraft] = useState<IDraftWithResearchSession | null>(null);
  const [editorState, setEditorState] = useState<EditorState>({
    content: '',
    wordCount: 0,
    characterCount: 0,
    readingTime: 0,
    lastSaved: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [comments, setComments] = useState<IComment[]>([]);
  const [user, setUser] = useState<any>(null);
  const [sidebarTab, setSidebarTab] = useState<'comments' | 'history' | 'collaborators' | 'ai'>('comments');
  const [history, setHistory] = useState<IDraft[]>([]);
  const [collaborators, setCollaborators] = useState<IProfile[]>([]);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResults, setAiResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { aiStatus, generateSummary, rewriteContent, translateContent } = useAIService();
  const { onlineUsers, cursorPositions, broadcastCursorPosition } = useDraftCollaboration(draftId, user?.id);

  // Calculate editor statistics
  const calculateStats = useCallback((content: string) => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const characters = content.length;
    const readingTime = Math.ceil(words / 200);
    
    setEditorState(prev => ({
      ...prev,
      wordCount: words,
      characterCount: characters,
      readingTime
    }));
  }, []);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Error getting user:', error);
          return;
        }
        setUser(data.user);
      } catch (error) {
        console.error('Error in getUser:', error);
      }
    };
    getUser();
  }, [supabase]);

  const loadDraftData = useCallback(async () => {
    if (!draftId) {
      setError('No draft ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await loadDraft();
      await Promise.all([
        loadComments(),
        loadHistory(),
        loadCollaborators()
      ]);
    } catch (error) {
      console.error('Error loading draft data:', error);
      setError('Failed to load draft data');
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  useEffect(() => {
    loadDraftData();
  }, [loadDraftData]);

  const loadCollaborators = async () => {
    if (!draft) return;
    
    try {
      const { data, error } = await supabase
        .from('session_collaborators')
        .select(`
          user_id,
          role,
          profiles (*)
        `)
        .eq('session_id', draft.research_session_id);

      if (error) {
        console.error('Error loading collaborators:', error);
        return;
      }
      
      if (data) {
        const collaboratorProfiles = data
          .map(item => item.profiles)
          .filter(Boolean);
        setCollaborators(collaboratorProfiles.flat() as IProfile[]);
      }
    } catch (error) {
      console.error('Error in loadCollaborators:', error);
    }
  };

  const loadHistory = async () => {
    if (!draft) return;
    try {
      const { data, error } = await supabase
        .from('drafts')
        .select('*')
        .eq('research_session_id', draft.research_session_id)
        .order('version', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading history:', error);
        return;
      }
      setHistory(data || []);
    } catch (error) {
      console.error('Error in loadHistory:', error);
    }
  };

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles(full_name, avatar_url)')
        .eq('draft_id', draftId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading comments:', error);
        return;
      }
      setComments(data || []);
    } catch (error) {
      console.error('Error in loadComments:', error);
    }
  };

  const loadDraft = async () => {
    try {
      console.log('Loading draft with ID:', draftId);
      
      // First, let's check if the draft exists with a simple query
      const { data: draftData, error: draftError } = await supabase
        .from('drafts')
        .select('*')
        .eq('id', draftId)
        .single();

      if (draftError) {
        console.error('Error loading basic draft:', draftError);
        throw draftError;
      }

      if (!draftData) {
        throw new Error('Draft not found');
      }

      console.log('Basic draft loaded:', draftData);

      // Now load the related research session
      const { data: sessionData, error: sessionError } = await supabase
        .from('research_sessions')
        .select('title, user_id')
        .eq('id', draftData.research_session_id)
        .single();

      if (sessionError) {
        console.error('Error loading research session:', sessionError);
        // Continue without session data
      }

      // Load user profile if user_id exists
      let profileData = null;
      if (draftData.user_id) {
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', draftData.user_id)
          .single();

        if (!userError) {
          profileData = userData;
        }
      }

      // Combine all data
      const combinedData = {
        ...draftData,
        research_sessions: sessionData || { title: 'Untitled Session', user_id: '' },
        profiles: profileData
      };

      console.log('Combined draft data:', combinedData);
      
      setDraft(combinedData);
      setEditorState(prev => ({
        ...prev,
        content: draftData.content || '',
        lastSaved: new Date(draftData.updated_at || draftData.created_at || new Date())
      }));
      calculateStats(draftData.content || '');
      
    } catch (error: any) {
      console.error('Error loading draft:', error);
      setError(error.message || 'Failed to load draft');
    }
  };

  const saveDraft = async (showNotification = true) => {
    if (!draft || !user) {
      setError('Cannot save: Draft or user not loaded');
      return;
    }
    
    setSaving(true);
    try {
      const { data: newDraft, error } = await supabase
        .from('drafts')
        .insert({
          research_session_id: draft.research_session_id,
          content: editorState.content,
          version: (draft.version || 0) + 1,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      setEditorState(prev => ({ ...prev, lastSaved: new Date() }));
      
      if (showNotification) {
        console.log('Draft saved successfully');
      }

      // Update the current draft with the new one
      if (newDraft) {
        setDraft(prev => prev ? { ...prev, ...newDraft } : null);
      }

    } catch (error: any) {
      console.error('Error saving draft:', error);
      setError(error.message || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleContentChange = (content: string) => {
    setEditorState(prev => ({ ...prev, content }));
    calculateStats(content);
  };

  const handleAIAction = async (action: string, content: string, options?: any) => {
    try {
      let result: string;
      
      switch (action) {
        case 'summarize':
          result = await generateSummary(content, 'draft');
          break;
        case 'rewrite':
          result = await rewriteContent(content, options?.tone || 'academic');
          break;
        case 'translate':
          result = await translateContent(content, options?.targetLanguage || 'en');
          break;
        case 'expand':
          result = await rewriteContent(content, 'expanded');
          break;
        case 'simplify':
          result = await rewriteContent(content, 'simple');
          break;
        case 'formalize':
          result = await rewriteContent(content, 'formal');
          break;
        case 'casual':
          result = await rewriteContent(content, 'casual');
          break;
        case 'friendly':
          result = await rewriteContent(content, 'friendly');
          break;
        case 'professional':
          result = await rewriteContent(content, 'professional');
          break;
        default:
          result = content;
      }

      // Clean AI response
      result = result.replace(/\*\*(.*?)\*\*/g, '$1');
      result = result.replace(/\*(.*?)\*/g, '$1');
      result = result.replace(/#+\s?(.*?)(?=\n|$)/g, '$1');
      result = result.replace(/`(.*?)`/g, '$1');

      return result;
    } catch (error) {
      console.error('AI Action failed:', error);
      return content;
    }
  };

  const handleCustomAIPrompt = async () => {
    if (!aiPrompt.trim()) return;

    try {
      const result = await handleAIAction('custom', editorState.content, { prompt: aiPrompt });
      setAiResults(prev => [result, ...prev.slice(0, 4)]);
      setAiPrompt('');
    } catch (error) {
      console.error('Custom AI prompt failed:', error);
    }
  };

  const handleExport = async (template: string) => {
    if (!draft) return;

    setShowPDFModal(false);

    let tabs: any[] = [];
    if (template === 'academic' || template === 'research') {
      const { data, error } = await supabase
        .from('tabs')
        .select('*')
        .eq('session_id', draft.research_session_id);

      if (error) {
        console.error('Error fetching tabs:', error);
      } else {
        tabs = data || [];
      }
    }

    const draftWithContent = { ...draft, content: editorState.content };
    exportToPDF(template, draftWithContent, tabs);
  };

  const generateShareLink = async () => {
    if (!draft) return;
    
    const shareToken = btoa(JSON.stringify({
      draftId: draft.id,
      sessionId: draft.research_session_id,
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000
    }));
    
    setShareLink(`${window.location.origin}/shared/${shareToken}`);
    setShowShareModal(true);
  };

  const addComment = async (content: string) => {
    if (!draft || !user) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          draft_id: draft.id,
          user_id: user.id,
          content,
        })
        .select('*, profiles(full_name, avatar_url)')
        .single();

      if (error) throw error;
      setComments(prev => [...prev, data]);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  // Debug: Check what data we have
  useEffect(() => {
    if (draft) {
      console.log('Current draft state:', draft);
    }
  }, [draft]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="ml-4 text-gray-600">Loading draft...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Draft</h1>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2 mb-4">
              <p className="text-sm text-gray-500">Draft ID: {draftId}</p>
              <p className="text-sm text-gray-500">Check if the draft exists in your database.</p>
            </div>
            <button 
              onClick={() => router.push('/drafts')}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <FiArrowLeft /> Back to Drafts
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!draft) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-600 mb-4">Draft Not Found</h1>
            <p className="text-gray-500 mb-4">The draft you're looking for doesn't exist.</p>
            <button 
              onClick={() => router.push('/drafts')}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <FiArrowLeft /> Back to Drafts
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="border-b bg-white sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/drafts')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold text-gray-900">
                {draft?.research_sessions?.title || 'Untitled Draft'}
              </h1>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Version {draft?.version || 1}</span>
                <span>•</span>
                <span>{editorState.lastSaved ? `Last saved ${editorState.lastSaved.toLocaleTimeString()}` : 'Not saved'}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <FiEye className="w-3 h-3" />
                  <span>{(user?.id === draft?.research_sessions?.user_id) ? 'Owner' : 'Editor'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Editor Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{editorState.wordCount} words</span>
              <span>{editorState.characterCount} chars</span>
              <span>{editorState.readingTime} min read</span>
            </div>

            <div className="w-px h-6 bg-gray-300"></div>

            {/* AI Status */}
            <div className={`flex items-center gap-2 text-sm ${
              aiStatus === 'ready' ? 'text-green-600' : 
              aiStatus === 'loading' ? 'text-yellow-600' : 'text-gray-600'
            }`}>
              <FiCpu className="w-4 h-4" />
              <span className="capitalize">{aiStatus}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button 
                onClick={generateShareLink}
                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                <FiShare2 className="w-4 h-4" />
                Share
              </button>
              
              <button 
                onClick={() => setShowPDFModal(true)}
                className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                <FiDownload className="w-4 h-4" />
                Export
              </button>
              
              <button 
                onClick={() => saveDraft(true)}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <FiSave className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save'}
              </button>
              
              <button className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100">
                <FiMoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Main Editor */}
        <div className="flex-1 max-w-4xl mx-auto px-8 py-8">
          <AdvancedEditor
            value={editorState.content}
            onChange={handleContentChange}
            onAIAction={handleAIAction}
            onAddComment={addComment}
            placeholder="Start writing your draft... Use / for commands"
            onlineUsers={onlineUsers}
            currentUser={user}
            onCursorPositionChange={broadcastCursorPosition}
            cursorPositions={cursorPositions}
          />
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l bg-gray-50">
          <div className="flex border-b bg-white">
            <button 
              className={`flex-1 p-3 flex items-center justify-center gap-2 ${sidebarTab === 'comments' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
              onClick={() => setSidebarTab('comments')}
            >
              <FiMessageSquare className="w-4 h-4" />
              Comments
            </button>
            <button 
              className={`flex-1 p-3 flex items-center justify-center gap-2 ${sidebarTab === 'collaborators' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
              onClick={() => setSidebarTab('collaborators')}
            >
              <FiUsers className="w-4 h-4" />
              People
            </button>
            <button 
              className={`flex-1 p-3 flex items-center justify-center gap-2 ${sidebarTab === 'history' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
              onClick={() => setSidebarTab('history')}
            >
              <FiClock className="w-4 h-4" />
              History
            </button>
            <button 
              className={`flex-1 p-3 flex items-center justify-center gap-2 ${sidebarTab === 'ai' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
              onClick={() => setSidebarTab('ai')}
            >
              <FiZap className="w-4 h-4" />
              AI
            </button>
          </div>

          <div className="p-4 h-[calc(100vh-140px)] overflow-y-auto">
            {sidebarTab === 'comments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Comments ({comments.length})</h3>
                </div>
                {comments.map(comment => (
                  <div key={comment.id} className="bg-white p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <img 
                        src={comment.profiles?.avatar_url || ''} 
                        alt={comment.profiles?.full_name || 'User'}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="font-medium text-sm">{comment.profiles?.full_name || 'Anonymous'}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}

            {sidebarTab === 'collaborators' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Collaborators</h3>
                  <span className="text-sm text-gray-500">{onlineUsers.length} online</span>
                </div>
                
                <div className="space-y-3">
                  {collaborators.map(collaborator => (
                    <div key={collaborator.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white">
                      <div className="relative">
                        <img 
                          src={collaborator.avatar_url || ''} 
                          alt={collaborator.full_name || 'User'}
                          className="w-8 h-8 rounded-full"
                        />
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                          onlineUsers.some(u => u.user_id === collaborator.id) ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{collaborator.full_name || collaborator.email}</p>
                        <p className="text-xs text-gray-500">{collaborator.email}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Online Users */}
                <div className="mt-6">
                  <h4 className="font-medium text-sm mb-3">Currently Online</h4>
                  <div className="space-y-2">
                    {onlineUsers.map(onlineUser => (
                      <div key={onlineUser.user_id} className="flex items-center gap-2">
                        <FiUser className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-gray-700">
                          {onlineUser.profile?.full_name || 'Anonymous User'}
                        </span>
                      </div>
                    ))}
                    {onlineUsers.length === 0 && (
                      <p className="text-sm text-gray-500">No one else is currently viewing this draft</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {sidebarTab === 'history' && (
              <div className="space-y-3">
                <h3 className="font-semibold">Version History</h3>
                {history.map(version => (
                  <div 
                    key={version.id}
                    onClick={() => router.push(`/drafts/${version.id}`)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      version.id === draft?.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">Version {version.version}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(version.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {sidebarTab === 'ai' && (
              <div className="space-y-4">
                <h3 className="font-semibold">AI Assistant</h3>
                
                <div className="space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    {['Summarize', 'Rewrite', 'Translate', 'Expand', 'Simplify'].map(action => (
                      <button
                        key={action}
                        onClick={() => handleAIAction(action.toLowerCase(), editorState.content)}
                        className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                      >
                        {action}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Custom Prompt</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Ask AI to help with..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        onKeyPress={(e) => e.key === 'Enter' && handleCustomAIPrompt()}
                      />
                      <button
                        onClick={handleCustomAIPrompt}
                        disabled={!aiPrompt.trim()}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                      >
                        <FiZap className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {aiResults.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Recent Results</h4>
                      {aiResults.map((result, index) => (
                        <div key={index} className="p-3 bg-white border rounded-lg">
                          <p className="text-sm text-gray-700">{result}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PDF Export Modal */}
      {showPDFModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Export Document</h3>
              <button 
                onClick={() => setShowPDFModal(false)}
                className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {[
                { id: 'simple', name: 'Simple', desc: 'Clean and professional layout' },
                { id: 'academic', name: 'Academic', desc: 'Formal academic paper format' },
                { id: 'research', name: 'Research Paper', desc: 'Includes sources and references' }
              ].map(template => (
                <div
                  key={template.id}
                  onClick={() => handleExport(template.id)}
                  className="p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-blue-500 hover:bg-blue-50 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full border-2 border-gray-300 group-hover:border-blue-500"></div>
                    <div>
                      <h4 className="font-semibold">{template.name}</h4>
                      <p className="text-sm text-gray-600">{template.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Share Document</h3>
              <button 
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded-full hover:bg-gray-200"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Shareable Link</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(shareLink)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Copy
                  </button>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <FiEdit3 className="w-4 h-4 inline mr-2" />
                  Can edit
                </button>
                <button className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <FiGlobe className="w-4 h-4 inline mr-2" />
                  Anyone
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}