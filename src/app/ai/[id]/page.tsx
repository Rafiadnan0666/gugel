"use client"
import Layout from '@/components/Layout'
import React, { useState, useEffect, useRef } from 'react'
import { IChat_Session, ISessionMessage, IDraft } from '@/types/main.db'
import { createClient } from '@supabase/supabase-js'
import { useParams, useRouter } from 'next/navigation'
import { FiSend, FiDownload, FiTrash2, FiEdit, FiArrowLeft } from 'react-icons/fi'
import useAuth from '@/hooks/useAuth'
import AIResponse from '@/components/AIResponse'
import { useAdvancedAIService } from '@/hooks/useAdvancedAIService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  created_at: Date;
}

const ChatPage = () => {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  const aiService = useAdvancedAIService();
  
  const [session, setSession] = useState<IChat_Session | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in');
    } else if (user && sessionId) {
      fetchSessionData();
      subscribeToMessages();
    }
  }, [user, authLoading, sessionId, router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchSessionData = async () => {
    if (!user) return;
    try {
      // Fetch session
      const { data: sessionData, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('session_messages')
        .select('*')
        .eq('chat_session_id', sessionId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);
    } catch (error) {
      console.error('Error fetching session data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToMessages = () => {
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'session_messages',
          filter: `chat_session_id=eq.${sessionId}`
        }, 
        (payload) => {
          setMessages(prev => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending || !user) return;

    const messageContent = newMessage;
    setNewMessage('');
    setIsSending(true);

    try {
      // Add user message
      const { data: userMessage, error: userError } = await supabase
        .from('session_messages')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          content: messageContent,
          sender: 'user',
          chat_session_id: sessionId
        })
        .select()
        .single();

      if (userError) throw userError;

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'ai_chat_message',
          message: `You have a new message in the chat "${session?.title}" `,
          read: false,
        });

      if (notificationError) {
        throw notificationError;
      }

      const aiResponse = await aiService.promptAI(messageContent);
      
      const { data: aiMessage, error: aiError } = await supabase
        .from('session_messages')
        .insert({
          session_id: sessionId,
          content: aiResponse,
          sender: 'ai',
          chat_session_id: sessionId
        })
        .select()
        .single();

      if (aiError) throw aiError;

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const exportToDraft = async () => {
    if (!user) return;
    try {
      const conversation = messages.map(msg => 
        `${msg.sender === 'user' ? 'User' : 'AI'}: ${msg.content}`
      ).join('\n\n');

      const { data: draft, error } = await supabase
        .from('drafts')
        .insert({
          research_session_id: sessionId,
          content: conversation,
          version: 1,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      alert('Chat exported to draft successfully!');
    } catch (error) {
      console.error('Error exporting to draft:', error);
      alert('Error exporting chat to draft');
    }
  };

  const deleteSession = async () => {
    if (!confirm('Are you sure you want to delete this chat session?')) return;

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      router.push('/ai');
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const updateSessionTitle = async (newTitle: string) => {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({ title: newTitle })
        .eq('id', sessionId);

      if (error) throw error;
      setSession(prev => prev ? { ...prev, title: newTitle } : null);
    } catch (error) {
      console.error('Error updating session title:', error);
    }
  };

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <div className="text-lg">Loading chat session...</div>
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <div className="flex h-screen items-center justify-center">
          <div className="text-lg">Chat session not found</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        {/* Sidebar */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => router.push('/ai')}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back to Sessions
            </button>
            <div className="flex items-center justify-between">
              <input
                value={session.title}
                onChange={(e) => updateSessionTitle(e.target.value)}
                onBlur={(e) => updateSessionTitle(e.target.value)}
                className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1"
              />
              <FiEdit className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {new Date(session.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="p-4 space-y-2">
            <button
              onClick={exportToDraft}
              className="w-full flex items-center gap-2 p-3 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <FiDownload className="w-4 h-4" />
              Export to Draft
            </button>
            <button
              onClick={deleteSession}
              className="w-full flex items-center gap-2 p-3 text-left text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <FiTrash2 className="w-4 h-4" />
              Delete Session
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                Start a conversation by sending a message below.
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${ 
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                                    <div
                                      className={`max-w-2xl w-full ${
                                        message.sender === 'user' ? 'ml-auto' : ''
                                      }`}
                                    >
                                      {message.sender === 'user' ? (
                                        <div className="bg-blue-500 text-white rounded-lg px-4 py-3">
                                          <div className="whitespace-pre-wrap">{message.content}</div>
                                          <div className="text-xs mt-2 text-blue-100">
                                            {new Date(message.created_at).toLocaleTimeString()}
                                          </div>
                                        </div>
                                      ) : (
                                        <AIResponse content={message.content} />
                                      )}
                                    </div>                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  disabled={isSending}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                />
                <button
                  onClick={sendMessage}
                  disabled={isSending || !newMessage.trim()}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSending ? 'Sending...' : <FiSend className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ChatPage;
