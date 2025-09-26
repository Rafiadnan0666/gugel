'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import {
  FiPlus,
  FiEdit3,
  FiTrash2,
  FiCopy,
  FiFileText,
  FiChevronDown,
  FiChevronRight,
  FiZap,
  FiType,
  FiGlobe,
  FiFeather,
  FiRefreshCw,
} from 'react-icons/fi';
import {
  IResearchSession,
  IDraft,
} from '@/types/main.db';

// AI Service Types
interface AIRequest {
  type: 'prompt' | 'proofreader' | 'summarizer' | 'translator' | 'writer' | 'rewriter';
  input: string;
  options?: any;
}

interface AIResponse {
  result: string;
  error?: string;
}

// AI Service Mock (Replace with actual API calls)
class AIService {
  static async processRequest(request: AIRequest): Promise<AIResponse> {
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      switch (request.type) {
        case 'prompt':
          return { result: `AI Response: ${request.input}` };
        case 'proofreader':
          return { result: this.proofreadText(request.input) };
        case 'summarizer':
          return { result: this.summarizeText(request.input) };
        case 'translator':
          return { result: this.translateText(request.input, request.options?.targetLanguage || 'es') };
        case 'writer':
          return { result: this.generateText(request.input) };
        case 'rewriter':
          return { result: this.rewriteText(request.input) };
        default:
          return { result: request.input };
      }
    } catch (error) {
      return { result: request.input, error: 'AI service unavailable' };
    }
  }

  private static proofreadText(text: string): string {
    // Simple proofreading simulation
    return text.replace(/\bi\b/g, 'I').replace(/\bteh\b/g, 'the');
  }

  private static summarizeText(text: string): string {
    const sentences = text.split('.');
    return sentences.slice(0, 2).join('.') + (sentences.length > 2 ? '...' : '');
  }

  private static translateText(text: string, targetLanguage: string): string {
    // Simple translation simulation
    const translations: Record<string, string> = {
      es: `[ES] ${text}`,
      fr: `[FR] ${text}`,
      de: `[DE] ${text}`,
    };
    return translations[targetLanguage] || text;
  }

  private static generateText(prompt: string): string {
    return `Generated content based on: ${promify}`;
  }

  private static rewriteText(text: string): string {
    return `Rewritten version: ${text.split('').reverse().join('')}`;
  }
}

export default function DraftListPage() {
  const supabase = createClient();
  const [sessions, setSessions] = useState<IResearchSession[]>([]);
  const [drafts, setDrafts] = useState<Record<string, IDraft[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  // Enhanced Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'session' | 'draft' | null>(null);
  const [editingItem, setEditingItem] = useState<IResearchSession | IDraft | null>(null);
  const [content, setContent] = useState('');
  const [isAIProcessing, setIsAIProcessing] = useState(false);

  // AI Tools state
  const [showAITools, setShowAITools] = useState(false);
  const [selectedAITool, setSelectedAITool] = useState<string>('');

  // Confirmation modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'session' | 'draft'; id: string; sessionId?: string } | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: sessionsData, error } = await supabase
        .from('research_sessions')
        .select('id, title, user_id, created_at')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(sessionsData || []);
    } catch (err) {
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDrafts = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('drafts')
        .select('id, content, version, created_at, research_session_id')
        .eq('research_session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDrafts((prev) => ({ ...prev, [sessionId]: data || [] }));
    } catch (err) {
      console.error('Error loading drafts:', err);
    }
  };

  const toggleSession = (id: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
      if (!drafts[id]) loadDrafts(id);
    }
    setExpandedSessions(newExpanded);
  };

  // Enhanced Modal with AI Integration
  const openModal = (type: 'session' | 'draft', item?: IResearchSession | IDraft) => {
    setModalType(type);
    setEditingItem(item || null);
    setContent(
      type === 'draft' && item ? (item as IDraft).content :
      type === 'session' && item ? (item as IResearchSession).title :
      ''
    );
    setShowAITools(type === 'draft');
    setSelectedAITool('');
    setShowModal(true);
  };

  const applyAITool = async (toolType: AIRequest['type'], options?: any) => {
    if (!content.trim()) return;
    
    setIsAIProcessing(true);
    try {
      const response = await AIService.processRequest({
        type: toolType,
        input: content,
        options
      });
      
      if (response.error) {
        alert(`AI Error: ${response.error}`);
      } else {
        setContent(response.result);
      }
    } catch (error) {
      console.error('AI processing failed:', error);
      alert('AI service is currently unavailable. Please try again later.');
    } finally {
      setIsAIProcessing(false);
    }
  };

  const saveModal = async () => {
    try {
      if (modalType === 'session') {
        if (editingItem) {
          await supabase
            .from('research_sessions')
            .update({ title: content })
            .eq('id', (editingItem as IResearchSession).id);
        } else {
          const { data: userData } = await supabase.auth.getUser();
          await supabase
            .from('research_sessions')
            .insert({ title: content, user_id: userData.user?.id });
        }
        await loadSessions();
      } else if (modalType === 'draft') {
        const sessionId = editingItem ? 
          (editingItem as IDraft).research_session_id || (editingItem as any).session_id : 
          (editingItem as any)?.session_id;

        if (editingItem?.id) {
          await supabase
            .from('drafts')
            .update({ 
              content, 
              version: ((editingItem as IDraft).version || 0) + 1 
            })
            .eq('id', (editingItem as IDraft).id);
        } else {
          await supabase
            .from('drafts')
            .insert({
              research_session_id: sessionId,
              content,
              version: 1,
            });
        }
        if (sessionId) await loadDrafts(sessionId);
      }
    } catch (err) {
      console.error('Error saving modal:', err);
      alert('Failed to save. Check console for details.');
    } finally {
      setShowModal(false);
    }
  };

  // Delete functionality
  const confirmDelete = (type: 'session' | 'draft', id: string, sessionId?: string) => {
    setDeleteTarget({ type, id, sessionId });
    setConfirmOpen(true);
  };

  const performDelete = async () => {
    if (!deleteTarget) return;
    try {
      await supabase
        .from(deleteTarget.type === 'session' ? 'research_sessions' : 'drafts')
        .delete()
        .eq('id', deleteTarget.id);
      
      if (deleteTarget.type === 'session') {
        await loadSessions();
      } else if (deleteTarget.sessionId) {
        await loadDrafts(deleteTarget.sessionId);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setConfirmOpen(false);
    }
  };

  // Duplicate Draft
  const duplicateDraft = async (draft: IDraft) => {
    try {
      await supabase.from('drafts').insert({
        research_session_id: draft.research_session_id,
        content: draft.content,
        version: 1,
      });
      await loadDrafts(draft.research_session_id);
    } catch (err) {
      console.error('Failed to duplicate draft:', err);
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

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Research Sessions</h1>
          <button 
            onClick={() => openModal('session')} 
            className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition flex items-center"
          >
            <FiPlus className="inline-block mr-2" /> New Session
          </button>
        </div>

        {sessions.length === 0 ? (
          <p className="text-gray-600">No sessions yet.</p>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <div key={session.id} className="border rounded-lg shadow-sm overflow-hidden">
                <div className="flex justify-between items-center p-4 bg-gray-50">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSession(session.id)}>
                    {expandedSessions.has(session.id) ? <FiChevronDown /> : <FiChevronRight />}
                    <span className="font-semibold">{session.title}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openModal('session', session)} className="p-2 rounded hover:bg-gray-200">
                      <FiEdit3 />
                    </button>
                    <button onClick={() => confirmDelete('session', session.id)} className="p-2 rounded hover:bg-red-100 text-red-600">
                      <FiTrash2 />
                    </button>
                  </div>
                </div>

                {expandedSessions.has(session.id) && (
                  <div className="p-4 bg-white">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium text-lg">Drafts</h3>
                      <button
                        onClick={() => openModal('draft', { 
                          id: '', 
                          research_session_id: session.id, 
                          content: '', 
                          version: 1, 
                          created_at: new Date() 
                        } as IDraft)}
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center"
                      >
                        <FiPlus className="inline-block mr-1" /> New Draft
                      </button>
                    </div>
                    {drafts[session.id]?.length ? (
                      <ul className="divide-y">
                        {drafts[session.id].map((draft) => (
                          <li key={draft.id} className="flex justify-between items-center py-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <FiFileText className="text-gray-500 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium">
                                  {draft.content.slice(0, 100) || 'Empty draft'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  v{draft.version} • {new Date(draft.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <button onClick={() => openModal('draft', draft)} className="p-2 hover:bg-gray-200 rounded">
                                <FiEdit3 />
                              </button>
                              <button onClick={() => duplicateDraft(draft)} className="p-2 hover:bg-gray-200 rounded">
                                <FiCopy />
                              </button>
                              <button onClick={() => confirmDelete('draft', draft.id, draft.research_session_id)} className="p-2 hover:bg-red-100 rounded text-red-600">
                                <FiTrash2 />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No drafts yet.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Modal with AI Tools */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <h2 className="text-xl font-semibold mb-4">
              {editingItem ? `Edit ${modalType}` : `New ${modalType}`}
            </h2>
            
            {/* AI Tools Bar */}
            {modalType === 'draft' && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => applyAITool('proofreader')}
                    disabled={isAIProcessing}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                  >
                    <FiType /> Proofread
                  </button>
                  <button
                    onClick={() => applyAITool('summarizer')}
                    disabled={isAIProcessing}
                    className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                  >
                    <FiZap /> Summarize
                  </button>
                  <button
                    onClick={() => applyAITool('translator', { targetLanguage: 'es' })}
                    disabled={isAIProcessing}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 disabled:opacity-50"
                  >
                    <FiGlobe /> Translate
                  </button>
                  <button
                    onClick={() => applyAITool('writer')}
                    disabled={isAIProcessing}
                    className="flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50"
                  >
                    <FiFeather /> Write
                  </button>
                  <button
                    onClick={() => applyAITool('rewriter')}
                    disabled={isAIProcessing}
                    className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                  >
                    <FiRefreshCw /> Rewrite
                  </button>
                </div>
                {isAIProcessing && (
                  <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Processing with AI...
                  </div>
                )}
              </div>
            )}

            {/* Content Editor */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={modalType === 'draft' ? 12 : 4}
              className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-black outline-none flex-1 resize-none"
              placeholder={
                modalType === 'draft' 
                  ? 'Write your draft content... (Use AI tools above to enhance your writing)' 
                  : 'Session title...'
              }
            />
            
            <div className="mt-4 flex justify-end gap-2">
              <button 
                onClick={() => setShowModal(false)} 
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button 
                onClick={saveModal} 
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 flex items-center gap-2"
              >
                Save {modalType === 'draft' && <FiFileText />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm text-center">
            <p className="text-lg font-semibold mb-4">Are you sure you want to delete this?</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setConfirmOpen(false)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                Cancel
              </button>
              <button onClick={performDelete} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}