"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FiMessageSquare, FiThumbsUp, FiThumbsDown, FiCalendar, FiUser } from 'react-icons/fi';

interface Feedback {
  id: string;
  prompt_id: string;
  user_id: string;
  response_id: string;
  rating: number;
  feedback_text?: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
  ai_prompts?: {
    prompt_text: string;
  };
}

export default function AIFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [showModal, setShowModal] = useState(false);
  const supabase = createClient();

  const loadFeedbacks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ai_feedback')
        .select(`
          *,
          profiles!inner(full_name, email),
          ai_prompts!inner(prompt_text)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching feedback:', error);
      } else {
        setFeedbacks(data || []);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error in loadFeedbacks:', error);
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadFeedbacks();
  }, [loadFeedbacks]);

  const getRatingIcon = (rating: number) => {
    if (rating >= 4) return <FiThumbsUp className="text-green-600" />;
    if (rating <= 2) return <FiThumbsDown className="text-red-600" />;
    return null;
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
    if (rating <= 2) return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 border-t-transparent"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">
          Loading AI feedback...
        </span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Feedback</h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {feedbacks.length} total feedback entries
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Prompt Preview
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Feedback
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {feedbacks.map((feedback) => (
                <tr key={feedback.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FiUser className="mr-2 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {feedback.profiles?.full_name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {feedback.profiles?.email || 'No email'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getRatingIcon(feedback.rating)}
                      <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRatingColor(feedback.rating)}`}>
                        {feedback.rating}/5
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs truncate text-sm text-gray-900 dark:text-white">
                      {feedback.ai_prompts?.prompt_text || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs">
                      {feedback.feedback_text ? (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {feedback.feedback_text}
                        </p>
                      ) : (
                        <span className="text-sm text-gray-400 italic">No feedback text</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(feedback.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedFeedback(feedback);
                        setShowModal(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      <FiMessageSquare />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
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
                    {selectedFeedback.profiles?.full_name || 'Unknown'}
                    <span className="text-gray-500 dark:text-gray-400 ml-2">
                      ({selectedFeedback.profiles?.email})
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rating
                  </label>
                  <div className="flex items-center">
                    {getRatingIcon(selectedFeedback.rating)}
                    <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRatingColor(selectedFeedback.rating)}`}>
                      {selectedFeedback.rating}/5
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Original Prompt
                </label>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                  <p className="text-sm text-gray-900 dark:text-white">
                    {selectedFeedback.ai_prompts?.prompt_text || 'N/A'}
                  </p>
                </div>
              </div>

              {selectedFeedback.feedback_text && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Feedback Text
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {selectedFeedback.feedback_text}
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Feedback ID
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white font-mono">
                    {selectedFeedback.id}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Created
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {new Date(selectedFeedback.created_at).toLocaleString()}
                  </div>
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