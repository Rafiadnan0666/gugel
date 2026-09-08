"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { CreditLedger, Profile, CreditLedgerSource } from '@/types/main.db';
import { FiSearch, FiEye, FiCalendar, FiTrendingUp, FiTrendingDown, FiUser, FiFilter } from 'react-icons/fi';

export default function CreditLedgerPage() {
  const [ledger, setLedger] = useState<CreditLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<CreditLedgerSource | ''>('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<CreditLedger | null>(null);
  const [showModal, setShowModal] = useState(false);

  const supabase = createClient();

  const fetchLedger = async () => {
    const { data, error } = await supabase
      .from('credit_ledger')
      .select(`
        *,
        profiles!inner(*)
      `)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error fetching credit ledger:', error);
    } else {
      setLedger(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const filteredLedger = ledger.filter((entry: any) => {
    const matchesSearch = 
      (entry.profiles?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.profiles?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.reference_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSource = !sourceFilter || entry.source === sourceFilter;

    const matchesDate = !dateFilter || 
      (entry.created_at && new Date(entry.created_at).toDateString() === new Date(dateFilter).toDateString());

    return matchesSearch && matchesSource && matchesDate;
  });

  const getSourceColor = (source: CreditLedgerSource) => {
    switch (source) {
      case 'payment':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      case 'ai_usage':
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
      case 'admin_adjustment':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
      case 'refund':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getSourceIcon = (source: CreditLedgerSource) => {
    switch (source) {
      case 'payment':
        return <FiTrendingUp className="text-green-600" />;
      case 'ai_usage':
        return <FiTrendingDown className="text-red-600" />;
      case 'admin_adjustment':
        return <FiCalendar className="text-blue-600" />;
      case 'refund':
        return <FiCalendar className="text-yellow-600" />;
      default:
        return <FiCalendar className="text-gray-600" />;
    }
  };

  const calculateTotal = () => {
    return filteredLedger.reduce((sum: number, entry: any) => sum + entry.amount, 0);
  };

  const exportCSV = () => {
    const headers = ['User', 'Source', 'Amount', 'Balance After', 'Reference ID', 'Date'];
    const csvData = filteredLedger.map((entry: any) => [
      entry.profiles?.full_name || 'Unknown',
      entry.source,
      entry.amount.toFixed(2),
      entry.balance_after.toFixed(2),
      entry.reference_id || '',
      entry.created_at ? new Date(entry.created_at).toLocaleString() : 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `credit-ledger-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-6">Loading credit ledger...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Credit Ledger</h1>
        <div className="flex items-center space-x-4">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Total: ${calculateTotal().toFixed(2)}
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
            placeholder="Search entries..."
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
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as CreditLedgerSource | '')}
            className="pl-10 pr-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 appearance-none"
          >
            <option value="">All Sources</option>
            <option value="payment">Payment</option>
            <option value="ai_usage">AI Usage</option>
            <option value="admin_adjustment">Admin Adjustment</option>
            <option value="refund">Refund</option>
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
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Balance After
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Reference
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
            {filteredLedger.map((entry: any) => (
              <tr key={entry.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FiUser className="mr-2 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {entry.profiles?.full_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {entry.profiles?.email || entry.user_id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getSourceIcon(entry.source)}
                    <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getSourceColor(entry.source)}`}>
                      {entry.source.replace('_', ' ')}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`text-sm font-medium ${
                    entry.amount >= 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {entry.amount >= 0 ? '+' : ''}${entry.amount.toFixed(2)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    ${entry.balance_after.toFixed(2)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {entry.reference_id ? (
                    <div className="max-w-32 truncate">
                      {entry.reference_id.slice(0, 8)}...
                    </div>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    <FiCalendar className="mr-2" />
                    {entry.created_at ? new Date(entry.created_at).toLocaleString() : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedEntry(entry);
                      setShowModal(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    <FiEye />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Credit Entry Details
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
                  {(selectedEntry as any).profiles?.full_name || 'Unknown'}
                  <span className="text-gray-500 dark:text-gray-400 ml-2">
                    ({(selectedEntry as any).profiles?.email})
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Transaction Type
                </label>
                <div className="flex items-center">
                  {getSourceIcon(selectedEntry.source)}
                  <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getSourceColor(selectedEntry.source)}`}>
                    {selectedEntry.source.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount
                  </label>
                  <div className={`text-lg font-bold ${
                    selectedEntry.amount >= 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {selectedEntry.amount >= 0 ? '+' : ''}${selectedEntry.amount.toFixed(2)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Balance After
                  </label>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    ${selectedEntry.balance_after.toFixed(2)}
                  </div>
                </div>
              </div>

              {selectedEntry.reference_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reference ID
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white font-mono">
                    {selectedEntry.reference_id}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Created
                </label>
                <div className="text-sm text-gray-900 dark:text-white">
                  {selectedEntry.created_at 
                    ? new Date(selectedEntry.created_at).toLocaleString()
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