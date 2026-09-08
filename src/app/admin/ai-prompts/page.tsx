"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { AiPrompt, Profile } from '@/types/main.db';
import { FiSearch, FiEye, FiTrash2, FiCalendar, FiUser } from 'react-icons/fi';

export default function AIPromptsPage() {
  const [prompts, setPrompts] = useState<AiPrompt[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<AiPrompt | null>(null);
  const [showModal, setShowModal] = useState(false);

  const supabase = createClient();

  const fetchData = async () => {
    const [promptsResult, usersResult] = await Promise.all([
      supabase
        .from('ai_prompts')
        .select('*, profiles(*)')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('profiles')
        .select('*')
    ]);

    if (promptsResult.error) {
      console.error('Error fetching prompts:', promptsResult.error);
    } else {
      setPrompts(promptsResult.data || []);
    }

    if (usersResult.error) {
      console.error('Error fetching users:', usersResult.error);
    } else {
      setUsers(usersResult.data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    
    const { error } = await supabase
      .from('ai_prompts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting prompt:', error);
      alert('Error deleting prompt');
    } else {
      await fetchData();
    }
  };

  const filteredPrompts = prompts.filter((prompt: any) =>
    prompt.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.domain?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserInfo = (userId: string) => {
    return users.find(user => user.id === userId);
  };

  if (loading) {
    return <div className="p-6">Loading AI prompts...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Prompts</h1>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Prompt
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Domain
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                User
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
            {filteredPrompts.map((prompt: any) => (
              <tr key={prompt.id}>
                <td className="px-6 py-4">
                  <div className="max-w-md">
                    <p className="text-sm text-gray-900 dark:text-white truncate">
                      {prompt.prompt}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {prompt.domain ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                      {prompt.domain}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">No domain</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FiUser className="mr-2 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {prompt.profiles?.full_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {prompt.profiles?.email || prompt.user_id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    <FiCalendar className="mr-2" />
                    {prompt.created_at ? new Date(prompt.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedPrompt(prompt);
                      setShowModal(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                  >
                    <FiEye />
                  </button>
                  <button
                    onClick={() => handleDelete(prompt.id)}
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

      {showModal && selectedPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Prompt Details
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  User
                </label>
                <div className="text-sm text-gray-900 dark:text-white">
                  {(selectedPrompt as any).profiles?.full_name || 'Unknown'}
                  <span className="text-gray-500 dark:text-gray-400 ml-2">
                    ({(selectedPrompt as any).profiles?.email || selectedPrompt.user_id})
                  </span>
                </div>
              </div>

              {(selectedPrompt as any).domain && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Domain
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {selectedPrompt.domain}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prompt Text
                </label>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                  {selectedPrompt.prompt}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Created
                </label>
                <div className="text-sm text-gray-900 dark:text-white">
                  {selectedPrompt.created_at 
                    ? new Date(selectedPrompt.created_at).toLocaleString()
                    : 'N/A'
                  }
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
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