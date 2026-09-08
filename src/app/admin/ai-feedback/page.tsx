"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { AiResponseFeedback, Profile } from '@/types/main.db';
import { FiSearch, FiEye, FiTrash2, FiCalendar, FiStar, FiUser } from 'react-icons/fi';

export default function AIFeedbackPage() {
  const [feedback, setFeedback] = useState<AiResponseFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<AiResponseFeedback | null>(null);
  const [showModal, setShowModal] = useState(false);

  const supabase = createClient();

  const fetchFeedback = async () => {
    const { data, error } = await supabase
      .from('ai_response_feedback')
      .select(`
        *,
        ai_prompt_responses!inner(
          *,
          ai_prompts!inner(
            *,
            profiles!inner(*)
          ),
          ai_providers!inner(*),
          ai_models!inner(*)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching feedback:', error);
    } else {
      setFeedback(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;
    
    const { error } = await supabase
      .from('ai_response_feedback')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting feedback:', error);
      alert('Error deleting feedback');
    } else {
      await fetchFeedback();
    }
  };

  const filteredFeedback = feedback.filter((item: any) =>
    (item.is_winner?.toString() || '').includes(searchTerm.toLowerCase()) ||
    item.clarity?.toString().includes(searchTerm) ||
    item.accuracy?.toString().includes(searchTerm) ||
    item.simplicity?.toString().includes(searchTerm) ||
    item.usefulness?.toString().includes(searchTerm) ||
    (item.ai_prompt_responses?.ai_prompts?.profiles?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderStars = (rating: number | null) => {
    if (!rating) return <span className="text-gray-400">N/A</span>;
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <FiStar
            key={star}
            className={`text-sm ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  const getAverageRating = (item: any) => {
    const ratings = [item.clarity, item.accuracy, item.simplicity, item.usefulness].filter(r => r !== null);
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc: number, rating: number) => acc + rating, 0);
    return (sum / ratings.length).toFixed(1);
  };

  if (loading) {
    return <div className="p-6">Loading AI feedback...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Response Feedback</h1>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search feedback..."
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
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Model
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Average Rating
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Winner
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
            {filteredFeedback.map((item: any) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FiUser className="mr-2 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.profiles?.full_name || 'Anonymous'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {item.profiles?.email || 'Anonymous feedback'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.ai_prompt_responses?.ai_models?.model_key || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {item.ai_prompt_responses?.ai_providers?.display_name}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {getAverageRating(item)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {[item.clarity, item.accuracy, item.simplicity, item.usefulness].filter(r => r !== null).length} ratings
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {item.is_winner ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                      Winner
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">No</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    <FiCalendar className="mr-2" />
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedFeedback(item);
                      setShowModal(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                  >
                    <FiEye />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
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

      {showModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-3xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Feedback Details
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
                    {(selectedFeedback as any).profiles?.full_name || 'Anonymous'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Model
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {(selectedFeedback as any).ai_prompt_responses?.ai_models?.model_key || 'Unknown'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Rating Breakdown
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Clarity:</span>
                    {renderStars(selectedFeedback.clarity)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Accuracy:</span>
                    {renderStars(selectedFeedback.accuracy)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Simplicity:</span>
                    {renderStars(selectedFeedback.simplicity)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Usefulness:</span>
                    {renderStars(selectedFeedback.usefulness)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Average Rating
                </label>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getAverageRating(selectedFeedback)} / 5.0
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Winner Status
                </label>
                <div>
                  {selectedFeedback.is_winner ? (
                    <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                      This response was marked as the winner
                    </span>
                  ) : (
                    <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                      Not marked as winner
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Created
                </label>
                <div className="text-sm text-gray-900 dark:text-white">
                  {selectedFeedback.created_at 
                    ? new Date(selectedFeedback.created_at).toLocaleString()
                    : 'N/A'
                  }
                </div>
              </div>

              {(selectedFeedback as any).ai_prompt_responses && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Related Response Preview
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md text-sm text-gray-900 dark:text-white truncate">
                    {(selectedFeedback as any).ai_prompt_responses.response}
                  </div>
                </div>
              )}
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