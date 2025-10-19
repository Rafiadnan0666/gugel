'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IResearchSession, IDraft, ISessionMessage } from '@/types/main.db';
import { useAIService } from '@/hooks/useAIService';
import dynamic from 'next/dynamic';

const ProEditor = dynamic(() => import('@/components/editor/ProEditor').then(mod => mod.ProEditor), { ssr: false });
import AIChat from '@/components/session/AIChat';
import { FiArrowLeft, FiSave } from 'react-icons/fi';

const supabase = createClient();

export default function ResearchPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<IResearchSession | null>(null);
  const [draft, setDraft] = useState<IDraft | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [messages, setMessages] = useState<ISessionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { aiStatus, chatWithAI, generateSummary, rewriteContent } = useAIService();

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('research_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      const { data: draftData, error: draftError } = await supabase
        .from('drafts')
        .select('*')
        .eq('research_session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (draftData) {
        setDraft(draftData);
        setDraftContent(draftData.content);
      }

    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = async () => {
    if (!sessionId) return;
    setSaving(true);
    try {
      if (draft) {
        const { data, error } = await supabase
          .from('drafts')
          .update({ content: draftContent, version: draft.version + 1 })
          .eq('id', draft.id)
          .select()
          .single();
        if (error) throw error;
        setDraft(data);
      } else {
        const { data, error } = await supabase
          .from('drafts')
          .insert({ research_session_id: sessionId, content: draftContent, version: 1 })
          .select()
          .single();
        if (error) throw error;
        setDraft(data);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setSaving(false);
    }
  };

  const sendChatMessage = async (content: string) => {
    if (!session) return;

    const tempId = crypto.randomUUID();
    const userMessage: ISessionMessage = {
      id: tempId,
      session_id: sessionId,
      user_id: session.user_id,
      content,
      sender: 'user',
      created_at: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const { data: userMsg, error: userErr } = await supabase.from('session_messages').insert(userMessage).select().single();
      if (userErr) throw userErr;

      setMessages(prev => prev.map(m => m.id === tempId ? userMsg : m));

      const aiResponse = await chatWithAI(content, { tabs: [], drafts: draft ? [draft] : [] });

      const aiMessage: Omit<ISessionMessage, 'id' | 'created_at'> = {
        session_id: sessionId,
        content: aiResponse,
        sender: 'ai',
      };

      const { data: aiMsg, error: aiErr } = await supabase.from('session_messages').insert(aiMessage).select().single();
      if (aiErr) throw aiErr;

      setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleAIAction = async (action: string, content: string) => {
    switch (action) {
      case 'summarize':
        return await generateSummary(content, 'draft');
      case 'rewrite':
        return await rewriteContent(content, 'academic');
      case 'simplify':
        return await rewriteContent(content, 'simple');
      case 'formalize':
        return await rewriteContent(content, 'formal');
      default:
        return content;
    }
  };

  if (loading) {
    return <Layout><div>Loading...</div></Layout>;
  }

  return (
    <Layout>
      <div className="flex h-screen">
        <div className="w-1/2 flex flex-col p-4">
          <div className="flex-1">
            <AIChat 
              messages={messages} 
              onSendMessage={sendChatMessage} 
              isLoading={false} 
              researchContext={{ tabs: [], drafts: draft ? [draft] : [] }} 
            />
          </div>
        </div>
        <div className="w-1/2 flex flex-col p-4">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => router.push('/ai')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <FiArrowLeft /> Back
            </button>
            <h1 className="text-xl font-bold">{session?.title}</h1>
            <button onClick={saveDraft} disabled={saving} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              <FiSave /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          <div className="flex-1">
            <ProEditor 
              content={draftContent} 
              onChange={setDraftContent} 
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
