'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IDraft, IResearchSession } from '@/types/main.db';
import {
  FiPlus, FiEdit3, FiTrash2, FiCopy, FiFileText, FiChevronDown,
  FiChevronRight, FiZap, FiCpu, FiBold, FiItalic, FiUnderline,
  FiList, FiOctagon, FiRotateCw, FiTarget, FiCoffee, FiAward, FiGlobe
} from 'react-icons/fi';

// AI Service Hook
const useAIService = () => {
  const [aiSession, setAiSession] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<'loading' | 'ready' | 'error' | 'unavailable'>('loading');

  useEffect(() => {
    const initializeAI = async () => {
      try {
        const opts = { expectedOutputs: [{ type: "text", languages: ["en"] }] };
        const availability = await (window as any).LanguageModel.availability(opts);
        if (availability === "unavailable") {
          setAiStatus('unavailable');
          return;
        }
        const session = await (window as any).LanguageModel.create(opts);
        setAiSession(session);
        setAiStatus('ready');
      } catch (err) {
        setAiStatus('error');
      }
    };
    if ((window as any).LanguageModel) initializeAI();
    else setAiStatus('error');
  }, []);

  const cleanAIResponse = (text: string) => text.replace(/##/g, '').replace(/\*\*/g, '').trim();

  const promptAI = async (prompt: string) => {
    if (!aiSession) return "AI not available";
    try {
      const result = await aiSession.prompt(prompt);
      return cleanAIResponse(result);
    } catch (error) {
      return "Error from AI";
    }
  };

  const rewriteContent = async (content: string, style: string) => {
    return await promptAI(`Rewrite in ${style} style: ${content.substring(0, 2000)}`);
  };
  
  const generateSummary = async (content: string) => {
    return await promptAI(`Summarize this content: ${content.substring(0, 2000)}`);
  };

  return { aiStatus, rewriteContent, generateSummary };
};

// Advanced Editor
const AdvancedEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onAIAction: (action: string, content: string) => Promise<string>;
}> = ({ value, onChange, onAIAction }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [showAITools, setShowAITools] = useState(false);

  const formatText = (command: string) => {
    document.execCommand(command, false);
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const handleAIAction = async (action: string) => {
    if (!editorRef.current) return;
    const selectedText = window.getSelection()?.toString() || editorRef.current.innerText;
    if (!selectedText.trim()) return;
    
    setIsAILoading(true);
    try {
      const result = await onAIAction(action, selectedText);
      const range = window.getSelection()?.getRangeAt(0);
      if (range) {
        range.deleteContents();
        range.insertNode(document.createTextNode(result));
      }
      if (editorRef.current) onChange(editorRef.current.innerHTML);
    } finally {
      setIsAILoading(false);
    }
  };

  const AI_TOOLS = [
    { id: 'summarize', label: 'Summarize', icon: FiZap },
    { id: 'rewrite', label: 'Rewrite', icon: FiRotateCw },
    { id: 'simplify', label: 'Simplify', icon: FiCoffee },
    { id: 'formalize', label: 'Formalize', icon: FiAward },
  ];

  return (
    <div className="border rounded-lg relative">
      <div className="flex items-center gap-1 p-2 border-b bg-gray-50">
        <button type="button" onClick={() => setShowAITools(!showAITools)} className="p-2 rounded hover:bg-gray-200 relative" title="AI Tools">
          <FiOctagon className="w-4 h-4 text-purple-600" />
        </button>
        <div className="w-px h-5 bg-gray-300"></div>
        <button type="button" onClick={() => formatText('bold')} className="p-2 rounded hover:bg-gray-200" title="Bold"><FiBold className="w-4 h-4" /></button>
        <button type="button" onClick={() => formatText('italic')} className="p-2 rounded hover:bg-gray-200" title="Italic"><FiItalic className="w-4 h-4" /></button>
        <button type="button" onClick={() => formatText('underline')} className="p-2 rounded hover:bg-gray-200" title="Underline"><FiUnderline className="w-4 h-4" /></button>
        <button type="button" onClick={() => formatText('insertUnorderedList')} className="p-2 rounded hover:bg-gray-200" title="Bullet List"><FiList className="w-4 h-4" /></button>
      </div>
      {showAITools && (
        <div className="absolute top-12 left-2 z-10 bg-white border rounded-lg shadow-xl w-52 p-2">
          {AI_TOOLS.map(tool => (
            <button key={tool.id} onClick={() => handleAIAction(tool.id)} disabled={isAILoading} className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 text-left disabled:opacity-50">
              <tool.icon className="w-4 h-4 text-blue-600" />
              <span>{tool.label}</span>
            </button>
          ))}
        </div>
      )}
      <div ref={editorRef} contentEditable onInput={e => onChange(e.currentTarget.innerHTML)} className="min-h-[300px] p-4 focus:outline-none prose max-w-none" dangerouslySetInnerHTML={{ __html: value }} />
      {isAILoading && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
          <div className="flex items-center gap-2 text-blue-600">
            <FiCpu className="animate-spin h-5 w-5" />
            <span>AI is thinking...</span>
          </div>
        </div>
      )}
    </div>
  );
};

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
  const { aiStatus, rewriteContent, generateSummary } = useAIService();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('research_sessions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setSessions(data || []);
    setLoading(false);
  };

  const loadDrafts = async (sessionId: string) => {
    const { data } = await supabase.from('drafts').select('*').eq('research_session_id', sessionId).order('created_at', { ascending: false });
    setDrafts(prev => ({ ...prev, [sessionId]: data || [] }));
  };

  const toggleSession = (id: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else {
      newExpanded.add(id);
      if (!drafts[id]) loadDrafts(id);
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
      loadSessions();
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
    if (action === 'summarize') return await generateSummary(text);
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
    if (type === 'session') loadSessions();
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
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {modal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] flex flex-col">
            <h2 className="text-2xl font-bold mb-4">{modal.item ? 'Edit' : 'New'} {modal.type}</h2>
            {modal.type === 'session' ? (
              <input value={content} onChange={e => setContent(e.target.value)} placeholder="Session title" className="w-full p-3 border rounded-lg" />
            ) : (
              <AdvancedEditor value={content} onChange={setContent} onAIAction={handleAIAction} />
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
