"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { SessionMessage, ResearchSession, Profile } from '@/types/main.db';
import { FiSearch, FiEye, FiTrash2, FiCalendar, FiUser, FiMessageSquare, FiArchive } from 'react-icons/fi';

export default function SessionMessagesPage() {
  const [messages, setMessages] = useState<(SessionMessage & { 
    research_sessions: ResearchSession,
    profiles: Profile | null
  })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<(SessionMessage & { 
    research_sessions: ResearchSession,
    profiles: Profile | null
  }) | null>(null);
  const [showModal, setShowModal] = useState(false);

  const supabase = createClient();

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('session_messages')
      .select(`
        *,
        research_sessions!inner(*),
        profiles(left_join: user_id, profiles(id, full_name, email))
      `)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error fetching session messages:', error);
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const filteredMessages = messages.filter((message) => {
    const matchesSearch = 
      message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.research_sessions.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (message.profiles?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.sender.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDate = !dateFilter || 
      (message.created_at && new Date(message.created_at).toDateString() === new Date(dateFilter).toDateString());

    return matchesSearch && matchesDate;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    const { error } = await supabase
      .from('session_messages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting message:', error);
      alert('Error deleting message');
    } else {
      await fetchMessages();
    }
  };

  const getSenderColor = (sender: string) => {
    switch (sender) {
      case 'user':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
      case 'ai':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getSenderIcon = (sender: string) => {
    switch (sender) {
      case 'user':
        return <FiUser className="text-blue-600" />;
      case 'ai':
        return <FiArchive className="text-green-600" />;
      default:
        return <FiMessageSquare className="text-gray-600" />;
    }
  };

  const exportCSV = () => {
    const headers = ['Session', 'Sender', 'User', 'Message Preview', 'Created'];
    const csvData = filteredMessages.map((message) => [
      message.research_sessions.title,
      message.sender || 'unknown',
      message.profiles?.full_name || 'N/A',
      message.content.slice(0, 100).replace(/"/g, '""'), // Escape quotes and truncate
      message.created_at ? new Date(message.created_at).toLocaleString() : 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-messages-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-6">Loading session messages...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Session Messages</h1>
        <div className="flex items-center space-x-4">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Total Messages: {filteredMessages.length}
          </div>
          <button
            onClick={exportCSV}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-64">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 w-full"
          />
        </div>
        
        <div className="relative">
          <FiCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Session
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Sender
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Message
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredMessages.map((message) => (
              <tr key={message.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FiArchive className="mr-2 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {message.research_sessions.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ID: {message.research_sessions.id.slice(0, 8)}...
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getSenderIcon(message.sender || 'unknown')}
                    <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getSenderColor(message.sender || 'unknown')}`}>
                      {message.sender || 'unknown'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {message.profiles ? (
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-3">
                        {message.profiles.full_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {message.profiles.full_name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {message.profiles.email}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">No user</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-md">
                    <div className="flex items-start">
                      <FiMessageSquare className="mr-2 text-gray-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                          {message.content}
                        </p>
                        {message.content.length > 100 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({message.content.length} characters)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    <FiCalendar className="mr-2" />
                    {message.created_at ? new Date(message.created_at).toLocaleString() : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedMessage(message);
                      setShowModal(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                  >
                    <FiEye />
                  </button>
                  <button
                    onClick={() => handleDelete(message.id)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <FiTrash2 />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-3xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Message Details
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Session
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {selectedMessage.research_sessions.title}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    ID: {selectedMessage.research_sessions.id}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sender
                  </label>
                  <div className="flex items-center">
                    {getSenderIcon(selectedMessage.sender || 'unknown')}
                    <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getSenderColor(selectedMessage.sender || 'unknown')}`}>
                      {selectedMessage.sender || 'unknown'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Message Content
                </label>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md max-h-64 overflow-y-auto">
                  <div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {selectedMessage.content}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    User
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {selectedMessage.profiles?.full_name || 'No user'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedMessage.profiles?.email || 'N/A'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Created
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {selectedMessage.created_at 
                      ? new Date(selectedMessage.created_at).toLocaleString()
                      : 'N/A'
                    }
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Message ID
                </label>
                <div className="text-sm text-gray-900 dark:text-white font-mono text-xs">
                  {selectedMessage.id}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => handleDelete(selectedMessage.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete Message
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}