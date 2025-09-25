'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import {
  FiArrowLeft,
  FiSave,
  FiEdit3,
  FiTrash2,
  FiCopy,
  FiShare2,
  FiUser,
  FiCalendar,
  FiBook
} from 'react-icons/fi';

interface Draft {
  id: string;
  session_id: string | null;
  content: string;
  version: number;
  created_at: string;
  research_sessions: {
    id: string;
    title: string;
    user_id: string;
    created_at: string;
    profiles: {
      id: string;
      full_name: string | null;
      email: string | null;
    };
  } | null;
}

export default function DraftDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadDraft(params.id as string);
    }
  }, [params.id]);

  const loadDraft = async (draftId: string) => {
    try {
      const { data, error } = await supabase
        .from('drafts')
        .select(`
          *,
          research_sessions (
            *,
            profiles (*)
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

  const saveDraft = async () => {
    if (!draft) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('drafts')
        .update({
          content: editedContent,
          version: draft.version + 1
        })
        .eq('id', draft.id);

      if (error) throw error;

      setDraft({ ...draft, content: editedContent, version: draft.version + 1 });
      setEditing(false);
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Error saving draft');
    } finally {
      setSaving(false);
    }
  };

  const deleteDraft = async () => {
    if (!draft || !confirm('Are you sure you want to delete this draft?')) return;

    try {
      const { error } = await supabase
        .from('drafts')
        .delete()
        .eq('id', draft.id);

      if (error) throw error;

      router.push('/drafts');
    } catch (error) {
      console.error('Error deleting draft:', error);
      alert('Error deleting draft');
    }
  };

  const duplicateDraft = async () => {
    if (!draft) return;

    try {
      const { data, error } = await supabase
        .from('drafts')
        .insert({
          session_id: draft.session_id,
          content: draft.content,
          version: 1
        })
        .select()
        .single();

      if (error) throw error;

      router.push(`/drafts/${data.id}`);
    } catch (error) {
      console.error('Error duplicating draft:', error);
      alert('Error duplicating draft');
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

  if (!draft) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Draft not found</h1>
          <button
            onClick={() => router.push('/drafts')}
            className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Back to Drafts
          </button>
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
          
          <div className="flex gap-2">
            {editing ? (
              <>
                <button
                  onClick={() => {
                    setEditedContent(draft.content);
                    setEditing(false);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveDraft}
                  disabled={saving}
                  className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  <FiSave className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={duplicateDraft}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <FiCopy className="w-4 h-4" />
                  Duplicate
                </button>
                <button
                  onClick={deleteDraft}
                  className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <FiTrash2 className="w-4 h-4" />
                  Delete
                </button>
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <FiEdit3 className="w-4 h-4" />
                  Edit
                </button>
              </>
            )}
          </div>
        </div>

        {/* Draft Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <FiBook className="w-4 h-4 text-blue-600" />
              <span className="font-medium">Session:</span>
              <span>{draft.research_sessions?.title || 'No Session'}</span>
            </div>
            <div className="flex items-center gap-2">
              <FiUser className="w-4 h-4 text-green-600" />
              <span className="font-medium">Author:</span>
              <span>
                {draft.research_sessions?.profiles.full_name || 
                 draft.research_sessions?.profiles.email || 
                 'Unknown'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FiCalendar className="w-4 h-4 text-orange-600" />
              <span className="font-medium">Version:</span>
              <span>{draft.version} • {new Date(draft.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {editing ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black resize-none"
              placeholder="Start writing your draft..."
            />
          ) : (
            <div className="prose max-w-none">
              {draft.content.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4">
                  {paragraph}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}