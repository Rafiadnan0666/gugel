'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IDraft, IResearchSession } from '@/types/main.db';

export default function DraftPage() {
  const params = useParams();
  const router = useRouter();
  const draftId = params.id as string;
  const supabase = createClient();

  const [draft, setDraft] = useState<IDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDraft = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/sign-in');
          return;
        }

        const { data: draftData, error: draftError } = await supabase
          .from('drafts')
          .select('*')
          .eq('id', draftId)
          .single();

        if (draftError || !draftData) {
          setError('Draft not found.');
          return;
        }

        const { data: sessionData, error: sessionError } = await supabase
          .from('research_sessions')
          .select('user_id')
          .eq('id', draftData.session_id)
          .single();

        if (sessionError || !sessionData) {
          setError('Could not verify draft ownership.');
          return;
        }

        if (sessionData.user_id !== user.id) {
          const { data: collaborator } = await supabase
            .from('session_collaborators')
            .select('id')
            .eq('session_id', draftData.session_id)
            .eq('user_id', user.id)
            .single();

          if (!collaborator) {
            setError('You do not have permission to view this draft.');
            router.push('/dashboard');
            return;
          }
        }

        setDraft(draftData);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    if (draftId) {
      fetchDraft();
    }
  }, [draftId]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Error</h1>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-black hover:underline mt-4"
            >
              Back to Dashboard
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
            <h1 className="text-2xl font-bold text-gray-900">Draft not found</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-black hover:underline mt-4"
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900">Draft</h1>
        <div className="mt-4 p-4 border border-gray-200 rounded-lg">
          <pre className="whitespace-pre-wrap font-sans">{draft.content}</pre>
        </div>
      </div>
    </Layout>
  );
}