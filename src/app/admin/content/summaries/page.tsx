"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Summary, Tab, Profile } from '@/types/main.db';
import { FiSearch, FiEye, FiTrash2, FiCalendar, FiUser, FiFileText, FiGlobe } from 'react-icons/fi';

export default function SummariesPage() {
  const [summaries, setSummaries] = useState<(Summary & { 
    tabs: Tab | null,
    profiles: Profile | null
  })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedSummary, setSelectedSummary] = useState<(Summary & { 
    tabs: Tab | null,
    profiles: Profile | null
  }) | null>(null);
  const [showModal, setShowModal] = useState(false);

  const supabase = createClient();

  const fetchSummaries = async () => {
    const { data, error } = await supabase
      .from('summaries')
      .select(`
        *,
        tabs(left_join: tab_id, tabs(id, title, url)),
        profiles(left_join: tabs.user_id, profiles(id, full_name, email))
      `)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error fetching summaries:', error);
    } else {
      // Transform the data to match expected format
      const transformedData = (data || []).map((summary: any) => ({
        ...summary,
        tabs: summary.tabs?.[0] || null,
        profiles: summary.profiles?.[0] || null
      }));
      setSummaries(transformedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSummaries();
  }, []);

  const filteredSummaries = summaries.filter((summary) => {
    const matchesSearch = 
      summary.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (summary.translator || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (summary.proofread || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (summary.tabs?.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (summary.tabs?.url || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (summary.profiles?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDate = !dateFilter || 
      (summary.created_at && new Date(summary.created_at).toDateString() === new Date(dateFilter).toDateString());

    return matchesSearch && matchesDate;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this summary?')) return;
    
    const { error } = await supabase
      .from('summaries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting summary:', error);
      alert('Error deleting summary');
    } else {
      await fetchSummaries();
    }
  };

  const exportCSV = () => {
    const headers = ['Summary Preview', 'Tab', 'User', 'Translator', 'Proofread', 'Created'];
    const csvData = filteredSummaries.map((summary) => [
      summary.summary.slice(0, 100).replace(/"/g, '""'), // Escape quotes and truncate
      summary.tabs?.title || 'No tab',
      summary.profiles?.full_name || 'Unknown',
      summary.translator || 'N/A',
      summary.proofread || 'N/A',
      summary.created_at ? new Date(summary.created_at).toLocaleDateString() : 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `summaries-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-6">Loading summaries...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Summaries Management</h1>
        <div className="flex items-center space-x-4">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Total Summaries: {filteredSummaries.length}
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
            placeholder="Search summaries..."
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
                Summary
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Tab
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Processing
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
            {filteredSummaries.map((summary) => (
              <tr key={summary.id}>
                <td className="px-6 py-4">
                  <div className="max-w-md">
                    <div className="flex items-start">
                      <FiFileText className="mr-2 text-gray-400 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white line-clamp-3">
                          {summary.summary}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({summary.summary.length} characters)
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {summary.tabs ? (
                    <div className="flex items-center">
                      <FiGlobe className="mr-2 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {summary.tabs.title || 'No title'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-32">
                          {summary.tabs.url}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">No tab</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-3">
                      {summary.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {summary.profiles?.full_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {summary.profiles?.email || 'N/A'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    {summary.translator && (
                      <div className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 px-2 py-1 rounded">
                        🌐 {summary.translator}
                      </div>
                    )}
                    {summary.proofread && (
                      <div className="text-xs bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 px-2 py-1 rounded">
                        ✓ {summary.proofread}
                      </div>
                    )}
                    {!summary.translator && !summary.proofread && (
                      <span className="text-xs text-gray-400">None</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    <FiCalendar className="mr-2" />
                    {summary.created_at ? new Date(summary.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedSummary(summary);
                      setShowModal(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                  >
                    <FiEye />
                  </button>
                  <button
                    onClick={() => handleDelete(summary.id)}
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

      {showModal && selectedSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Summary Details
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              {selectedSummary.tabs && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Source Tab
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedSummary.tabs.title || 'No title'}
                    </div>
                    <a 
                      href={selectedSummary.tabs.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {selectedSummary.tabs.url}
                    </a>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Summary Content
                </label>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md max-h-64 overflow-y-auto">
                  <div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {selectedSummary.summary}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Translator
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {selectedSummary.translator || 'None'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Proofread
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {selectedSummary.proofread || 'None'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Created
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {selectedSummary.created_at 
                      ? new Date(selectedSummary.created_at).toLocaleString()
                      : 'N/A'
                    }
                  </div>
                </div>
              </div>

              {selectedSummary.profiles && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    User
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {selectedSummary.profiles.full_name || 'Unknown'}
                    <span className="text-gray-500 dark:text-gray-400 ml-2">
                      ({selectedSummary.profiles.email})
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Summary ID
                </label>
                <div className="text-sm text-gray-900 dark:text-white font-mono text-xs">
                  {selectedSummary.id}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => handleDelete(selectedSummary.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete Summary
              </button>
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