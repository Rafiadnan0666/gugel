'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IDraft, IResearchSession } from '@/types/main.db';
import {
  FiPlus, FiEdit3, FiTrash2, FiCopy, FiChevronDown,
  FiChevronRight
} from 'react-icons/fi';
import { useAIService } from '@/hooks/useAIService';
import dynamic from 'next/dynamic';

const ProEditor = dynamic(() => import('@/components/editor/ProEditor').then(mod => mod.ProEditor), { ssr: false });

// Main Page Component
export default function DraftListPage() {
  const supabase = createClient();
  const router = useRouter();
  const [sessions, setSessions] = useState<IResearchSession[]>([]);
  const [drafts, setDrafts] = useState<Record<string, IDraft[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<{ isOpen: boolean; type: 'session' | 'draft'; item?: any }>({ isOpen: false, type: 'session' });
  const [content, setContent] = useState('');
  const { aiStatus, generateSummary, rewriteContent } = useAIService();
  const [sessionPage, setSessionPage] = useState(1);
  const [hasMoreSessions, setHasMoreSessions] = useState(true);
  const [draftsPage, setDraftsPage] = useState<Record<string, number>>({});
  const [hasMoreDrafts, setHasMoreDrafts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadSessions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('research_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range((sessionPage - 1) * 10, sessionPage * 10 - 1);

      if (data) {
        setSessions(prev => (sessionPage === 1 ? data : [...prev, ...data]));
        setHasMoreSessions(data.length === 10);
      }
      setLoading(false);
    }
    loadSessions();
  }, [sessionPage, supabase]);

  const loadDrafts = async (sessionId: string, page = 1) => {
    const { data } = await supabase
      .from('drafts')
      .select('*')
      .eq('research_session_id', sessionId)
      .order('created_at', { ascending: false })
      .range((page - 1) * 10, page * 10 - 1);

    if (data) {
      setDrafts(prev => ({ ...prev, [sessionId]: page === 1 ? data : [...(prev[sessionId] || []), ...data] }));
      setHasMoreDrafts(prev => ({ ...prev, [sessionId]: data.length === 10 }));
    }
  };

  const toggleSession = (id: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
      if (!drafts[id]) {
        setDraftsPage(prev => ({ ...prev, [id]: 1 }));
        loadDrafts(id, 1);
      }
    }
    setExpandedSessions(newExpanded);
  };

  const openModal = (type: 'session' | 'draft', item?: any) => {
    setModal({ isOpen: true, type, item });
    setContent(item ? (type === 'draft' ? item.content : item.title) : '');
  };

  const saveModal = async () => {
    const { type, item } = modal;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (type === 'session') {
      if (item?.id) {
        await supabase.from('research_sessions').update({ title: content }).eq('id', item.id);
      } else {
        await supabase.from('research_sessions').insert({ title: content, user_id: user.id });
      }
      setSessionPage(1);
    } else if (type === 'draft') {
      if (item?.id) {
        await supabase.from('drafts').update({ content, version: (item.version || 0) + 1 }).eq('id', item.id);
      } else {
        await supabase.from('drafts').insert({ research_session_id: item.sessionId, content, version: 1 });
      }
      loadDrafts(item.sessionId);
    }
    setModal({ isOpen: false, type: 'session' });
  };

  const handleAIAction = async (action: string, text: string) => {
    if (action === 'summarize') return await generateSummary(text, 'draft');
    if (action === 'rewrite') return await rewriteContent(text, 'academic');
    if (action === 'simplify') return await rewriteContent(text, 'simple');
    if (action === 'formalize') return await rewriteContent(text, 'formal');
    return text;
  };

  const duplicateDraft = async (draft: IDraft) => {
    await supabase.from('drafts').insert({ research_session_id: draft.research_session_id, content: draft.content, version: 1 });
    loadDrafts(draft.research_session_id);
  };

  const deleteItem = async (type: 'session' | 'draft', id: string, sessionId?: string) => {
    if (!confirm('Are you sure?')) return;
    await supabase.from(type === 'session' ? 'research_sessions' : 'drafts').delete().eq('id', id);
    if (type === 'session') setSessionPage(1);
    else if (sessionId) loadDrafts(sessionId);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">My Drafts</h1>
          <button onClick={() => openModal('session')} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <FiPlus /> New Session
          </button>
        </div>

        <div className="space-y-6">
          {sessions.map(session => (
            <div key={session.id} className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="flex justify-between items-center p-4 cursor-pointer" onClick={() => toggleSession(session.id)}>
                <div className="flex items-center gap-3">
                  {expandedSessions.has(session.id) ? <FiChevronDown /> : <FiChevronRight />}
                  <h2 className="text-xl font-semibold text-gray-700">{session.title}</h2>
                </div>
                <div className="flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); openModal('session', session); }} className="p-2 rounded-md hover:bg-gray-100"><FiEdit3 /></button>
                  <button onClick={(e) => { e.stopPropagation(); deleteItem('session', session.id); }} className="p-2 rounded-md hover:bg-red-100 text-red-600"><FiTrash2 /></button>
                </div>
              </div>

              {expandedSessions.has(session.id) && (
                <div className="p-4 border-t">
                  <div className="flex justify-end mb-4">
                    <button onClick={() => openModal('draft', { sessionId: session.id })} className="flex items-center gap-2 text-sm bg-gray-800 text-white px-3 py-2 rounded-md hover:bg-gray-700">
                      <FiPlus /> New Draft
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(drafts[session.id] || []).map(draft => (
                      <div key={draft.id} className="border rounded-lg p-4 bg-gray-50 hover:shadow-md transition-shadow">
                        <div className="prose prose-sm line-clamp-4 mb-3" dangerouslySetInnerHTML={{ __html: draft.content || 'Empty draft' }} />
                        <div className="text-xs text-gray-500 mb-3">v{draft.version}</div>
                        <div className="flex justify-end gap-2">
                          <button onClick={() => router.push(`/drafts/${draft.id}`)} className="p-2 rounded-md hover:bg-gray-200"><FiEdit3 /></button>
                          <button onClick={() => duplicateDraft(draft)} className="p-2 rounded-md hover:bg-gray-200"><FiCopy /></button>
                          <button onClick={() => deleteItem('draft', draft.id, session.id)} className="p-2 rounded-md hover:bg-red-100 text-red-600"><FiTrash2 /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {drafts[session.id] && drafts[session.id].length === 0 && <p className="text-center text-gray-500 py-4">No drafts in this session yet.</p>}
                  {hasMoreDrafts[session.id] && (
                    <div className="flex justify-center mt-4">
                      <button
                        onClick={() => {
                          const nextPage = (draftsPage[session.id] || 1) + 1;
                          setDraftsPage(prev => ({ ...prev, [session.id]: nextPage }));
                          loadDrafts(session.id, nextPage);
                        }}
                        className="text-sm bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                      >
                        Load More
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {hasMoreSessions && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => setSessionPage(prev => prev + 1)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Load More Sessions
              </button>
            </div>
          )}
        </div>
      </div>

      {modal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] flex flex-col">
            <h2 className="text-2xl font-bold mb-4">{modal.item ? 'Edit' : 'New'} {modal.type}</h2>
            {modal.type === 'session' ? (
              <input value={content} onChange={e => setContent(e.target.value)} placeholder="Session title" className="w-full p-3 border rounded-lg" />
            ) : (
              <ProEditor content={content} onChange={setContent} />
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModal({ isOpen: false, type: 'session' })} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">Cancel</button>
              <button onClick={saveModal} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}