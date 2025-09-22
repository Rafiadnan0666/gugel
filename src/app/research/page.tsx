'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Layout from '@/components/Layout';
import type { IResearchSession } from '@/types/main.db';
import { FiBook, FiPlus } from 'react-icons/fi';

export default function ResearchPage() {
  const router = useRouter();
  const supabase = createClient();

  const [sessions, setSessions] = useState<IResearchSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/sign-in');
          return;
        }

        const { data: sessionData, error } = await supabase
          .from('research_sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (sessionData) {
          setSessions(sessionData);
        }
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const createNewSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: newSession } = await supabase
      .from('research_sessions')
      .insert([{
        user_id: user.id, 
        title: `Research Session - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
      }])
      .select()
      .single();

    if (newSession) {
      router.push(`/session/${newSession.id}`);
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Research</h1>
            <p className="text-gray-600 mt-2">All your research sessions in one place.</p>
          </div>
          <button
            onClick={createNewSession}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors flex items-center space-x-2 shadow-md"
          >
            <FiPlus className="w-5 h-5" />
            <span>New Session</span>
          </button>
        </div>

        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <FiBook className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No research sessions yet.</p>
              <button
                onClick={createNewSession}
                className="text-blue-600 hover:underline mt-2 font-medium"
              >
                Create your first session
              </button>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer"
                onClick={() => router.push(`/session/${session.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{session.title}</h3>
                  <p className="text-sm text-gray-600">
                    Created {new Date(session.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}