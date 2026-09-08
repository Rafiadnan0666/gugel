"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { AiUsageLog, Profile, AiProvider, AiModel, ResearchSession } from '@/types/main.db';
import { FiSearch, FiCalendar, FiFilter, FiDownload, FiTrendingUp, FiUser } from 'react-icons/fi';

export default function AIUsageLogsPage() {
  const [logs, setLogs] = useState<AiUsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [showStats, setShowStats] = useState(false);

  const supabase = createClient();

  const fetchData = async () => {
    const [logsResult, providersResult] = await Promise.all([
      supabase
        .from('ai_usage_logs')
        .select(`
          *,
          profiles!inner(*),
          ai_providers!inner(*),
          ai_models!inner(*),
          research_sessions(id, title)
        `)
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('ai_providers')
        .select('*')
        .order('display_name')
    ]);

    if (logsResult.error) {
      console.error('Error fetching logs:', logsResult.error);
    } else {
      setLogs(logsResult.data || []);
    }

    if (providersResult.error) {
      console.error('Error fetching providers:', providersResult.error);
    } else {
      setProviders(providersResult.data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredLogs = logs.filter((log: any) => {
    const matchesSearch = 
      (log.profiles?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.profiles?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.ai_providers?.display_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.ai_models?.model_key || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.research_sessions?.title || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDate = !dateFilter || 
      (log.created_at && new Date(log.created_at).toDateString() === new Date(dateFilter).toDateString());

    const matchesProvider = !providerFilter || log.provider_id === providerFilter;

    return matchesSearch && matchesDate && matchesProvider;
  });

  const calculateStats = () => {
    const totalTokens = logs.reduce((sum: number, log: any) => sum + (log.total_tokens || 0), 0);
    const totalCost = logs.reduce((sum: number, log: any) => sum + (log.cost || 0), 0);
    const totalRequests = logs.length;
    const avgLatency = logs.length > 0 
      ? logs.reduce((sum: number, log: any) => sum + (log.latency_ms || 0), 0) / logs.length 
      : 0;

    return { totalTokens, totalCost, totalRequests, avgLatency };
  };

  const stats = calculateStats();
  const exportCSV = () => {
    const headers = ['User', 'Provider', 'Model', 'Session', 'Input Tokens', 'Output Tokens', 'Total Tokens', 'Cost', 'Date'];
    const csvData = filteredLogs.map((log: any) => [
      log.profiles?.full_name || 'Unknown',
      log.ai_providers?.display_name || 'Unknown',
      log.ai_models?.model_key || 'Unknown',
      log.research_sessions?.title || 'N/A',
      log.input_tokens || 0,
      log.output_tokens || 0,
      log.total_tokens || 0,
      log.cost || 0,
      log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-usage-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-6">Loading AI usage logs...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Usage Logs</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            <FiTrendingUp className="mr-2" /> {showStats ? 'Hide' : 'Show'} Stats
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <FiDownload className="mr-2" /> Export CSV
          </button>
        </div>
      </div>

      {showStats && (
        <div className="mb-6 grid grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Requests</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalRequests.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Tokens</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalTokens.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Cost</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">${stats.totalCost.toFixed(4)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Latency</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{Math.round(stats.avgLatency)}ms</p>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-64">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search logs..."
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

        <div className="relative">
          <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 appearance-none"
          >
            <option value="">All Providers</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.display_name}
              </option>
            ))}
          </select>
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
                Session
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Tokens
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Cost
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredLogs.map((log: any) => (
              <tr key={log.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FiUser className="mr-2 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {log.profiles?.full_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {log.profiles?.email || log.user_id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {log.ai_models?.model_key || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {log.ai_providers?.display_name}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {log.research_sessions?.title || 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    ID: {log.session_id ? log.session_id.slice(0, 8) + '...' : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {log.total_tokens?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    In: {log.input_tokens?.toLocaleString() || 0} / Out: {log.output_tokens?.toLocaleString() || 0}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  ${log.cost?.toFixed(6) || '0.000000'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    <FiCalendar className="mr-2" />
                    {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredLogs.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No usage logs found matching the current filters.
        </div>
      )}
    </div>
  );
}