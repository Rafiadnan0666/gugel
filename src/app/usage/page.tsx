'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { usageTracking } from '@/lib/usage-tracking';
import type { UsageStats, CreditLedger, AiUsageLog } from '@/lib/usage-tracking';
import {
  FiTrendingUp, FiTrendingDown, FiDollarSign, FiZap, FiActivity,
  FiAlertTriangle, FiCheckCircle, FiClock, FiRefreshCw, FiDownload,
  FiFilter, FiCalendar, FiInfo, FiBarChart2, FiCpu, FiDatabase
} from 'react-icons/fi';

interface UsageData {
  usageStats: UsageStats | null;
  usageLogs: AiUsageLog[];
  creditHistory: CreditLedger[];
}

export default function UsagePage() {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year'>('month');
  const supabase = createClient();

  const loadUsageData = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/usage');
      if (response.ok) {
        const data = await response.json();
        setUsageData(data);
      }
    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsageData();
  }, []);

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatTokens = (tokens: number) => {
    return new Intl.NumberFormat('en-US').format(tokens);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading usage data...</p>
        </div>
      </div>
    );
  }

  if (!usageData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Failed to load usage data</p>
        </div>
      </div>
    );
  }

  const { usageStats, usageLogs, creditHistory } = usageData;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usage & Limits</h1>
          <p className="text-gray-600 mt-2">Monitor your AI usage and credit consumption</p>
        </div>
        <button
          onClick={loadUsageData}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Usage Stats Grid */}
      {usageStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FiZap className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500">Today</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatTokens(usageStats.todayTokens)}</p>
              <p className="text-sm text-gray-600">Tokens Used</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <FiActivity className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm text-gray-500">This Month</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatTokens(usageStats.monthTokens)}</p>
              <p className="text-sm text-gray-600">Tokens Used</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FiDollarSign className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-sm text-gray-500">Balance</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(usageStats.creditBalance)}</p>
              <p className="text-sm text-gray-600">Credits Available</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${
                usageStats.isAtLimit ? 'bg-red-100' : 
                usageStats.isNearLimit ? 'bg-yellow-100' : 'bg-green-100'
              }`}>
                {usageStats.isAtLimit ? (
                  <FiAlertTriangle className="w-6 h-6 text-red-600" />
                ) : usageStats.isNearLimit ? (
                  <FiAlertTriangle className="w-6 h-6 text-yellow-600" />
                ) : (
                  <FiCheckCircle className="w-6 h-6 text-green-600" />
                )}
              </div>
              <span className="text-sm text-gray-500">Usage</span>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{usageStats.usagePercentage.toFixed(1)}%</p>
              <p className="text-sm text-gray-600">of Monthly Limit</p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {usageStats && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Token Usage</h3>
            <span className="text-sm text-gray-600">
              {formatTokens(usageStats.monthTokens)} / {formatTokens(usageStats.monthlyLimit)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all duration-300 ${
                usageStats.isAtLimit ? 'bg-red-500' : 
                usageStats.isNearLimit ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(usageStats.usagePercentage, 100)}%` }}
            ></div>
          </div>
          {usageStats.isNearLimit && (
            <div className="mt-3 flex items-center text-sm text-yellow-600">
              <FiAlertTriangle className="w-4 h-4 mr-2" />
              You&apos;re approaching your monthly token limit
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button className="px-6 py-3 text-blue-600 border-b-2 border-blue-600 font-medium">
              Usage Logs
            </button>
            <button className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium">
              Credit History
            </button>
          </nav>
        </div>

        {/* Usage Logs Table */}
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Provider</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Tokens</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Cost</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Session</th>
                </tr>
              </thead>
              <tbody>
                {usageLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-500">
                      No usage logs found
                    </td>
                  </tr>
                ) : (
                  usageLogs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        <div className="flex items-center">
                          <FiCpu className="w-4 h-4 mr-2 text-gray-500" />
                          {log.provider_id || 'Unknown'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {formatTokens(log.total_tokens || 0)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {formatCurrency(log.cost || 0)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {log.session_id ? `Session ${log.session_id.slice(0, 8)}...` : 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}