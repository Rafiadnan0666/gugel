"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { AdminAction, Profile } from '@/types/main.db';
import { FiSearch, FiEye, FiCalendar, FiUser, FiShield, FiDatabase, FiActivity } from 'react-icons/fi';

export default function AdminActionsPage() {
  const [actions, setActions] = useState<(AdminAction & { 
    profiles: Profile
  })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedAction, setSelectedAction] = useState<(AdminAction & { 
    profiles: Profile
  }) | null>(null);
  const [showModal, setShowModal] = useState(false);

  const supabase = createClient();

  const fetchActions = useCallback(async () => {
    const { data, error } = await supabase
      .from('admin_actions')
      .select(`
        *,
        profiles!inner(*)
      `)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error fetching admin actions:', error);
    } else {
      setActions(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const filteredActions = actions.filter((action) => {
    const matchesSearch = 
      action.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (action.target_table || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.profiles.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDate = !dateFilter || 
      (action.created_at && new Date(action.created_at).toDateString() === new Date(dateFilter).toDateString());

    return matchesSearch && matchesDate;
  });

  const getActionIcon = (action: string) => {
    if (action.toLowerCase().includes('delete')) return <FiDatabase className="text-red-600" />;
    if (action.toLowerCase().includes('update') || action.toLowerCase().includes('edit')) return <FiActivity className="text-blue-600" />;
    if (action.toLowerCase().includes('create') || action.toLowerCase().includes('add')) return <FiShield className="text-green-600" />;
    return <FiActivity className="text-gray-600" />;
  };

  const exportCSV = () => {
    const headers = ['Admin', 'Action', 'Target Table', 'Target ID', 'Metadata', 'Created'];
    const csvData = filteredActions.map((action) => [
      action.profiles.full_name || 'Unknown',
      action.action,
      action.target_table || 'N/A',
      action.target_id || 'N/A',
      action.metadata ? JSON.stringify(action.metadata) : 'N/A',
      action.created_at ? new Date(action.created_at).toLocaleString() : 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-actions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-6">Loading admin actions...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Actions</h1>
        <div className="flex items-center space-x-4">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Total Actions: {filteredActions.length}
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
            placeholder="Search admin actions..."
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
                Admin
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Target
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Metadata
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
            {filteredActions.map((action) => (
              <tr key={action.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-3">
                      {action.profiles.full_name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {action.profiles.full_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {action.profiles.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getActionIcon(action.action)}
                    <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                      {action.action}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {action.target_table || 'N/A'}
                  </div>
                  {action.target_id && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      ID: {action.target_id.slice(0, 8)}...
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-xs">
                    {action.metadata ? (
                      <div className="text-xs text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded font-mono truncate">
                        {JSON.stringify(action.metadata)}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No metadata</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    <FiCalendar className="mr-2" />
                    {action.created_at ? new Date(action.created_at).toLocaleString() : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedAction(action);
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

      {showModal && selectedAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Admin Action Details
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
                    Admin
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {selectedAction.profiles.full_name || 'Unknown'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedAction.profiles.email}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Action
                  </label>
                  <div className="flex items-center">
                    {getActionIcon(selectedAction.action)}
                    <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                      {selectedAction.action}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Target Table
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {selectedAction.target_table || 'N/A'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Target ID
                  </label>
                  <div className="text-xs text-gray-900 dark:text-white font-mono">
                    {selectedAction.target_id || 'N/A'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Metadata
                </label>
                {selectedAction.metadata ? (
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md max-h-48 overflow-y-auto">
                    <pre className="text-xs text-gray-900 dark:text-white font-mono">
                      {JSON.stringify(selectedAction.metadata, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">No metadata</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Action ID
                  </label>
                  <div className="text-xs text-gray-900 dark:text-white font-mono">
                    {selectedAction.id}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Created
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {selectedAction.created_at 
                      ? new Date(selectedAction.created_at).toLocaleString()
                      : 'N/A'
                    }
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