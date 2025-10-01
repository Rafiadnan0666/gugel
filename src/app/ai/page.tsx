"use client"
import Layout from '@/components/Layout'
import React, { useState, useEffect } from 'react'
import { IChatSession, IResearchSession, IDraft } from '@/types/main.db'
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation'
import { FiPlus, FiMessageSquare, FiEdit, FiDownload, FiTrash2 } from 'react-icons/fi'
import useAuth from '@/hooks/useAuth'

const supabase = createClient();

const AiPage = () => {
  const [chatSessions, setChatSessions] = useState<IChatSession[]>([]);
  const [researchSessions, setResearchSessions] = useState<IResearchSession[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'research'>('chat');
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in');
    } else if (user) {
      fetchSessions();
    }
  }, [user, loading, router]);

  const fetchSessions = async () => {
    if (!user) return;
    try {
   
      const { data: chatSessionsData, error: chatError } = await supabase
        .from('chat_session')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (chatError) throw chatError;

     
      const { data: researchSessionsData, error: researchError } = await supabase
        .from('research_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (researchError) throw researchError;

      setChatSessions(chatSessionsData || []);
      setResearchSessions(researchSessionsData || []);
    } catch (error) {
      console.error('Error fetching session data:', error);
  }

     finally {
    }
  };

  const createNewChat = async () => {
    if (!user) return;
    try {
    
const { data: newSession, error } = await supabase
  .from('chat_session')
  .insert({
    title: 'New Chat',
    user_id: user.id,
    description: 'AI Assistant Session'
  })
  .select()
  .single();

      if (error) throw error;
      if (newSession) {
        await supabase.from('ai_traces').insert({ 
          user_id: user.id, 
          session_id: newSession.id, 
          type: 'info',
          prompt: 'New chat started',
          response: ''
        });
        router.push(`/ai/${newSession.id}`);
      }
    } catch (error) {
      console.error('Error creating new chat session:', error);
    }
  };

  const createNewResearch = async () => {
    if (!user) return;
    try {
      const { data: newSession, error } = await supabase
        .from('research_sessions')
        .insert({
          title: 'New Research',
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      if (newSession) {
        await supabase.from('ai_traces').insert({ 
          user_id: user.id, 
          session_id: newSession.id, 
          type: 'info',
          prompt: 'New research started',
          response: ''
        });
        router.push(`/ai/research/${newSession.id}`);
      }
    } catch (error) {
      console.error('Error creating new research session:', error);
    }
  };

  const deleteSession = async (sessionId: string, type: 'chat' | 'research') => {
    if (!user) return;
    try {
      const table = type === 'chat' ? 'chat_session' : 'research_sessions';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      await supabase.from('ai_traces').insert({ 
        user_id: user.id, 
        session_id: sessionId, 
        type: 'info',
        prompt: `Deleted ${type} session: ${sessionId}`,
        response: ''
      });
      
      if (type === 'chat') {
        setChatSessions(chatSessions.filter(session => String(session.id) !== sessionId));
      } else {
        setResearchSessions(researchSessions.filter(session => session.id !== sessionId));
      }

} catch (error) {
  console.error('Error deleting session:', error);
}

  };

  const exportToDraft = async (sessionId: string, type: 'chat' | 'research') => {
    if (!user) return;
    try {
      let contentToExport = '';
      if (type === 'chat') {
        const { data: messages, error } = await supabase
          .from('session_messages')
          .select('content, sender')
          .eq('chat_session_id', sessionId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        contentToExport = messages.map(msg => `${msg.sender}: ${msg.content}`).join('\n\n');
      } else {
        const { data: draft, error } = await supabase
          .from('drafts')
          .select('content')
          .eq('research_session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        if (error) throw error;
        contentToExport = draft?.content || '';
      }

      const { data: draft, error } = await supabase
        .from('drafts')
        .insert({
          research_session_id: type === 'research' ? sessionId : null,
          content: contentToExport,
          version: 1,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      alert(`Session exported to draft successfully!`);
    } catch (error) {
      console.error('Error exporting to draft:', error);
      alert('Error exporting session to draft');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <div className="text-lg">Loading sessions...</div>
        </div>
      </Layout>
    );
  }

  const sessions = activeTab === 'chat' ? chatSessions : researchSessions;

  return (
    <Layout>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        {/* Sidebar */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4">
            <button
              onClick={activeTab === 'chat' ? createNewChat : createNewResearch}
              className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <FiPlus className="w-5 h-5" />
              New {activeTab === 'chat' ? 'Chat' : 'Research'}
            </button>
          </div>

          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-center font-medium ${
                activeTab === 'chat'
                  ? 'text-blue-500 border-b-2 border-blue-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <FiMessageSquare className="w-4 h-4 inline-block mr-2" />
              Chats
            </button>
            <button
              onClick={() => setActiveTab('research')}
              className={`flex-1 py-3 text-center font-medium ${
                activeTab === 'research'
                  ? 'text-blue-500 border-b-2 border-blue-500'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <FiEdit className="w-4 h-4 inline-block mr-2" />
              Research
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No {activeTab} sessions found.
              </div>
            ) : (
              <div className="p-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="group relative p-3 mb-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => router.push(
                      activeTab === 'chat' 
                        ? `/ai/${session.id}`
                        : `/ai/research/${session.id}`
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">
                          {session.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {new Date(session.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportToDraft(session.id, activeTab);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-500"
                          title="Export to Draft"
                        >
                          <FiDownload className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id, activeTab);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500"
                          title="Delete Session"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiMessageSquare className="w-8 h-8 text-blue-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              How can I help you today?
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start a new chat or research session to begin collaborating with AI.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={createNewChat}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
              >
                <FiMessageSquare className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <span className="font-medium">New Chat</span>
              </button>
              <button
                onClick={createNewResearch}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
              >
                <FiEdit className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <span className="font-medium">New Research</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AiPage;
