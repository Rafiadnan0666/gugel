'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import { FiArrowLeft, FiSave, FiPlus } from 'react-icons/fi';

interface ResearchSession {
  id: string;
  title: string;
}

export default function NewDraftPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNewSession, setShowNewSession] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      // get draft based on id from research_sessions and base the user_id from there
      const draftId = router.pathname.split('/').pop();
      if (!draftId) {
        setLoading(false);
        return;
      }
      
      const { data: draftData, error: draftError } = await supabase
        .from('research_sessions')
        .select('*')
        .eq('id', draftId)
        .single();

      if (draftError) throw draftError;

      const { data, error } = await supabase
        .from('research_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };
  const loadDraft = async (draftId: string) => {
  try {
    const { data, error } = await supabase
      .from('drafts')
      .select(`
        id, content, version, created_at,
        research_sessions (
          id, title,
          profiles (id, full_name, email)
        )
      `)
      .eq('id', draftId)
      .single();

    if (error) throw error;

    setDraft(data);
    setEditedContent(data.content);
  } catch (error) {
    console.error('Error loading draft:', error);
    router.push('/drafts');
  } finally {
    setLoading(false);
  }
};


  const createNewSession = async () => {
    if (!newSessionTitle.trim()) return;

    try {
      const { data, error } = await supabase
        .from('research_sessions')
        .insert({
          title: newSessionTitle.trim(),
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      setSessions([data, ...sessions]);
      setSelectedSession(data.id);
      setShowNewSession(false);
      setNewSessionTitle('');
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Error creating session');
    }
  };

const saveDraft = async () => {
  if (!draft) return;

  try {
    setSaving(true);
    const { data, error } = await supabase
      .from('drafts')
      .update({
        content: editedContent.trim(),
        version: draft.version + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', draft.id)
      .select()
      .single();

    if (error) throw error;

    setDraft(data);
    setEditing(false);
  } catch (error) {
    console.error('Error saving draft:', error);
    alert('Error saving draft');
  } finally {
    setSaving(false);
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/drafts')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <FiArrowLeft className="w-4 h-4" />
            Back to Drafts
          </button>
          
          <button
            onClick={saveDraft}
            disabled={saving}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <FiSave className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
        </div>

        {/* Session Selection */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Research Session
          </label>
          
          <div className="space-y-3">
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">Create new session</option>
              {sessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.title}
                </option>
              ))}
            </select>

            {(!selectedSession || showNewSession) && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  placeholder="Enter session title..."
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
                />
                <button
                  onClick={createNewSession}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <FiPlus className="w-4 h-4" />
                  Create
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Editor */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Draft Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing your research draft... You can add notes, insights, summaries, or any other content related to your research session."
            className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none"
          />
        </div>

        {/* Tips */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Tips for effective drafts:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Start with a clear research question or objective</li>
            <li>• Include key findings and insights</li>
            <li>• Note any sources or references</li>
            <li>• Organize your thoughts with headings and bullet points</li>
            <li>• Save regularly to avoid losing work</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}