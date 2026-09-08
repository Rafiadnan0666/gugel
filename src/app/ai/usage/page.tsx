"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FiBarChart2, FiCpu, FiDollarSign, FiCalendar } from 'react-icons/fi';

interface UsageLog {
  id: string;
  user_id: string;
  prompt_id: string;
  response_id: string;
  provider_id: string;
  model_id: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  response_time_ms: number;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
  ai_models?: {
    model_key: string;
  };
}

export default function AIUsagePage() {
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTokens, setTotalTokens] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const supabase = createClient();

  const loadUsage = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ai_usage_logs')
        .select(`
          *,
          profiles!inner(full_name, email),
          ai_models!inner(model_key)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching usage logs:', error);
      } else {
        setUsageLogs(data || []);
        
        // Calculate totals
        const tokens = data?.reduce((sum, log) => sum + (log.input_tokens + log.output_tokens), 0) || 0;
        const cost = data?.reduce((sum, log) => sum + (log.cost || 0), 0) || 0;
        
        setTotalTokens(tokens);
        setTotalCost(cost);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error in loadUsage:', error);
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 border-t-transparent"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">
          Loading AI usage data...
        </span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Usage Analytics</h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {usageLogs.length} usage records
        </div>
      </div>

      {/* Usage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <FiBarChart2 className="text-3xl text-blue-600" />
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalTokens.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Total Tokens
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <FiDollarSign className="text-3xl text-green-600" />
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                ${totalCost.toFixed(4)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Total Cost
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <FiCpu className="text-3xl text-purple-600" />
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {usageLogs.length > 0 ? Math.round(totalTokens / usageLogs.length) : 0}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Avg Tokens/Request
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="overflow-x-auto">
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
                  Tokens (In/Out)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Response Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {usageLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {log.profiles?.full_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {log.profiles?.email || 'No email'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {log.ai_models?.model_key || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      <div>In: {log.input_tokens.toLocaleString()}</div>
                      <div>Out: {log.output_tokens.toLocaleString()}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      ${log.cost?.toFixed(4) || '0.0000'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatResponseTime(log.response_time_ms || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(log.created_at).toLocaleDateString()}
                    <div className="text-xs">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </div>
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