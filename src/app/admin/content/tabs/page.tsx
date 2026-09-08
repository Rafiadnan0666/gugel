"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Tab, ResearchSession, Profile } from '@/types/main.db';
import { FiSearch, FiEye, FiTrash2, FiCalendar, FiUser, FiGlobe, FiArchive } from 'react-icons/fi';

export default function TabsPage() {
  const [tabs, setTabs] = useState<(Tab & { 
    research_sessions: ResearchSession | null,
    profiles: Profile | null
  })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedTab, setSelectedTab] = useState<(Tab & { 
    research_sessions: ResearchSession | null,
    profiles: Profile | null
  }) | null>(null);
  const [showModal, setShowModal] = useState(false);

  const supabase = createClient();

  const fetchTabs = async () => {
    const { data, error } = await supabase
      .from('tabs')
      .select(`
        *,
        research_sessions(left_join: session_id, research_sessions(id, title)),
        profiles(left_join: user_id, profiles(id, full_name, email))
      `)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error fetching tabs:', error);
    } else {
      // Transform data to match expected format
      const transformedData = (data || []).map((tab: any) => ({
        ...tab,
        research_sessions: tab.research_sessions?.[0] || null,
        profiles: tab.profiles?.[0] || null
      }));
      setTabs(transformedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTabs();
  }, []);

  const filteredTabs = tabs.filter((tab) => {
    const matchesSearch = 
      tab.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tab.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tab.research_sessions?.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tab.profiles?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tab.profiles?.email || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDate = !dateFilter || 
      (tab.created_at && new Date(tab.created_at).toDateString() === new Date(dateFilter).toDateString());

    return matchesSearch && matchesDate;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tab?')) return;
    
    const { error } = await supabase
      .from('tabs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting tab:', error);
      alert('Error deleting tab');
    } else {
      await fetchTabs();
    }
  };

  const exportCSV = () => {
    const headers = ['Title', 'URL', 'User', 'Session', 'Created'];
    const csvData = filteredTabs.map((tab) => [
      tab.title || 'No title',
      tab.url,
      tab.profiles?.full_name || 'Unknown',
      tab.research_sessions?.title || 'No session',
      tab.created_at ? new Date(tab.created_at).toLocaleDateString() : 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tabs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-6">Loading tabs...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tabs Management</h1>
        <div className="flex items-center space-x-4">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Total Tabs: {filteredTabs.length}
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
            placeholder="Search tabs..."
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
                Tab Info
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                URL
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Session
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
            {filteredTabs.map((tab) => (
              <tr key={tab.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FiGlobe className="mr-2 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {tab.title || 'No title'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        ID: {tab.id.slice(0, 8)}...
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-xs">
                    <div className="text-sm text-gray-900 dark:text-white truncate">
                      {tab.url}
                    </div>
                    <a 
                      href={tab.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Visit →
                    </a>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-3">
                      {tab.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {tab.profiles?.full_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {tab.profiles?.email || tab.user_id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {tab.research_sessions ? (
                    <div className="flex items-center">
                      <FiArchive className="mr-2 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {tab.research_sessions.title}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {tab.research_sessions.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">No session</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    <FiCalendar className="mr-2" />
                    {tab.created_at ? new Date(tab.created_at).toLocaleString() : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedTab(tab);
                      setShowModal(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                  >
                    <FiEye />
                  </button>
                  <button
                    onClick={() => handleDelete(tab.id)}
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

      {showModal && selectedTab && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-3xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Tab Details
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
                  Title
                </label>
                <div className="text-sm text-gray-900 dark:text-white">
                  {selectedTab.title || 'No title'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL
                </label>
                <div className="text-sm text-blue-600 dark:text-blue-400 break-all">
                  <a href={selectedTab.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {selectedTab.url}
                  </a>
                </div>
              </div>

              {selectedTab.content && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Content Preview
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md max-h-48 overflow-y-auto">
                    <div className="text-sm text-gray-900 dark:text-white line-clamp-3">
                      {selectedTab.content.slice(0, 500)}
                      {selectedTab.content.length > 500 && '...'}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    User
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {selectedTab.profiles?.full_name || 'Unknown'}
                    <span className="text-gray-500 dark:text-gray-400 ml-2">
                      ({selectedTab.profiles?.email || selectedTab.user_id})
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Session
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {selectedTab.research_sessions?.title || 'No session'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tab ID
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white font-mono text-xs">
                    {selectedTab.id}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Created
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    {selectedTab.created_at 
                      ? new Date(selectedTab.created_at).toLocaleString()
                      : 'N/A'
                    }
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <a
                href={selectedTab.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Visit URL
              </a>
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