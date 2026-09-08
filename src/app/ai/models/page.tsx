"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FiCpu, FiSettings, FiToggleLeft, FiToggleRight } from 'react-icons/fi';

interface AIModel {
  id: string;
  provider_id: string;
  model_key: string;
  context_limit: number;
  input_cost_per_1k: number;
  output_cost_per_1k: number;
  active: boolean;
  created_at: string;
  ai_providers?: {
    display_name: string;
    key: string;
  };
}

export default function AIModelsPage() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const supabase = createClient();

  const loadModels = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ai_models')
        .select(`
          *,
          ai_providers!inner(display_name, key)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching models:', error);
      } else {
        setModels(data || []);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error in loadModels:', error);
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const filteredModels = models.filter(model => 
    model.model_key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.ai_providers?.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleModel = async (model: AIModel) => {
    try {
      const { error } = await supabase
        .from('ai_models')
        .update({ active: !model.active })
        .eq('id', model.id);

      if (error) {
        console.error('Error toggling model:', error);
      } else {
        await loadModels();
      }
    } catch (error) {
      console.error('Error in toggleModel:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 border-t-transparent"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">
          Loading AI models...
        </span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Models</h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {filteredModels.length} models available
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <FiSettings className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search models..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 w-full md:w-96"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Context Limit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Cost/1k (In/Out)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredModels.map((model) => (
                <tr key={model.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FiCpu className="mr-2 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {model.model_key}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {model.id.slice(0, 8)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {model.ai_providers?.display_name || 'Unknown'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {model.ai_providers?.key}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {model.context_limit.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      <div>Input: ${model.input_cost_per_1k || 0}</div>
                      <div>Output: ${model.output_cost_per_1k || 0}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      model.active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                        : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                    }`}>
                      {model.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => toggleModel(model)}
                      className={`text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 ${
                        model.active ? 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300' : ''
                      }`}
                    >
                      {model.active ? <FiToggleLeft /> : <FiToggleRight />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}