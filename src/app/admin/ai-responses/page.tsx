"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { AiPromptResponse, Profile, AiProvider, AiModel } from '@/types/main.db';
import { FiSearch, FiEye, FiTrash2, FiCalendar, FiClock, FiUser } from 'react-icons/fi';

export default function AIResponsesPage() {
  const [responses, setResponses] = useState<AiPromptResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResponse, setSelectedResponse] = useState<AiPromptResponse | null>(null);
  const [showModal, setShowModal] = useState(false);

  const supabase = createClient();

  const fetchResponses = async () => {
    const { data, error } = await supabase
      .from('ai_prompt_responses')
      .select(`
        *,
        ai_prompts!inner(
          *,
          profiles!inner(*)
        ),
        ai_providers!inner(*),
        ai_models!inner(*)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching responses:', error);
    } else {
      setResponses(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchResponses();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this response?')) return;
    
    const { error } = await supabase
      .from('ai_prompt_responses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting response:', error);
      alert('Error deleting response');
    } else {
      await fetchResponses();
    }
  };

  const filteredResponses = responses.filter((response: any) =>
    response.response.toLowerCase().includes(searchTerm.toLowerCase()) ||
    response.ai_prompts?.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    response.ai_providers?.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    response.ai_models?.model_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    response.ai_prompts?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-6">Loading AI responses...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Responses</h1>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search responses..."
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
                Response
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Model
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Latency
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
            {filteredResponses.map((response: any) => (
              <tr key={response.id}>
                <td className="px-6 py-4">
                  <div className="max-w-md">
                    <p className="text-sm text-gray-900 dark:text-white truncate">
                      {response.response}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {response.ai_models?.model_key || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {response.ai_providers?.display_name}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FiUser className="mr-2 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {response.ai_prompts?.profiles?.full_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {response.ai_prompts?.profiles?.email || 'Unknown'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {response.latency_ms ? (
                    <div className="flex items-center text-sm text-gray-900 dark:text-white">
                      <FiClock className="mr-1" />
                      {response.latency_ms}ms
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">N/A</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    <FiCalendar className="mr-2" />
                    {response.created_at ? new Date(response.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedResponse(response);
                      setShowModal(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                  >
                    <FiEye />
                  </button>
                  <button
                    onClick={() => handleDelete(response.id)}
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

      {showModal && selectedResponse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Response Details
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
                    User
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {(selectedResponse as any).ai_prompts?.profiles?.full_name || 'Unknown'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Provider & Model
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {(selectedResponse as any).ai_providers?.display_name} / {(selectedResponse as any).ai_models?.model_key}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Latency
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {selectedResponse.latency_ms ? `${selectedResponse.latency_ms}ms` : 'N/A'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Created
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {selectedResponse.created_at 
                      ? new Date(selectedResponse.created_at).toLocaleString()
                      : 'N/A'
                    }
                  </div>
                </div>
              </div>

              {(selectedResponse as any).ai_prompts && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Original Prompt
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {(selectedResponse as any).ai_prompts.prompt}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  AI Response
                </label>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                  {selectedResponse.response}
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