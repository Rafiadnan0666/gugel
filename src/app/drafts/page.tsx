'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import { FiPlus } from 'react-icons/fi';

interface Draft {
  id: string;
  content: string;
  version: number;
  created_at: string;
  research_sessions: {
    id: string;
    title: string;
  } | null;
}

export default function DraftListPage() {
  const router = useRouter();
  const supabase = createClient();
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    try {
      // get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const user = userData.user;
      if (!user) {
        setDrafts([]);
        setLoading(false);
        return;
      }

      // query drafts belonging to this user (via research_sessions.user_id)
      const { data, error } = await supabase
        .from('drafts')
        .select(`
          id, content, version, created_at,
          research_sessions (
            id, title, user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // filter drafts where session.user_id == current user
      const userDrafts = (data || []).filter(
        (draft) => draft.research_sessions?.user_id === user.id
      );

      setDrafts(userDrafts);
    } catch (error) {
      console.error('Error loading drafts:', error);
    } finally {
      setLoading(false);
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Drafts</h1>
          <button
            onClick={() => router.push('/drafts/new')}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
          >
            <FiPlus className="w-4 h-4" />
            New Draft
          </button>
        </div>

        {drafts.length === 0 ? (
          <p className="text-gray-600">No drafts yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {drafts.map((draft) => (
              <li
                key={draft.id}
                onClick={() => router.push(`/drafts/${draft.id}`)}
                className="p-4 hover:bg-gray-50 cursor-pointer"
              >
                <p className="font-medium">
                  {draft.research_sessions?.title || 'Untitled Session'}
                </p>
                <p className="text-sm text-gray-600 truncate">{draft.content}</p>
                <p className="text-xs text-gray-400">
                  Version {draft.version} •{' '}
                  {new Date(draft.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  );
}
