"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { UserCredit, Profile } from '@/types/main.db';
import { FiSearch, FiDollarSign, FiPlus, FiMinus, FiCalendar, FiUser, FiTrendingUp } from 'react-icons/fi';

export default function UserCreditsPage() {
  const [credits, setCredits] = useState<UserCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [adjustmentForm, setAdjustmentForm] = useState({
    amount: 0,
    reason: ''
  });

  const supabase = createClient();

  const fetchCredits = async () => {
    const { data, error } = await supabase
      .from('user_credits')
      .select(`
        *,
        profiles!inner(*)
      `)
      .order('balance', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error fetching credits:', error);
    } else {
      setCredits(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  const filteredCredits = credits.filter((credit: any) => {
    const matchesSearch = 
      (credit.profiles?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (credit.profiles?.email || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const calculateTotalCredits = () => {
    return credits.reduce((sum: number, credit: any) => sum + credit.balance, 0);
  };

  const calculateAverageBalance = () => {
    if (credits.length === 0) return 0;
    return credits.reduce((sum: number, credit: any) => sum + credit.balance, 0) / credits.length;
  };

  const handleAdjustment = async () => {
    if (!selectedUser || !adjustmentForm.reason) {
      alert('Please provide a reason for the adjustment');
      return;
    }

    const { error } = await supabase.rpc('adjust_user_credits', {
      user_id: selectedUser.id,
      amount: adjustmentForm.amount,
      reason: adjustmentForm.reason
    });

    if (error) {
      console.error('Error adjusting credits:', error);
      alert('Error adjusting credits');
    } else {
      await fetchCredits();
      setShowAdjustmentModal(false);
      setSelectedUser(null);
      setAdjustmentForm({ amount: 0, reason: '' });
    }
  };

  const openAdjustmentModal = (user: Profile) => {
    setSelectedUser(user);
    setShowAdjustmentModal(true);
  };

  const exportCSV = () => {
    const headers = ['User', 'Email', 'Current Balance', 'Last Updated'];
    const csvData = filteredCredits.map((credit: any) => [
      credit.profiles?.full_name || 'Unknown',
      credit.profiles?.email || 'N/A',
      credit.balance.toFixed(2),
      credit.updated_at ? new Date(credit.updated_at).toLocaleString() : 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-credits-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-6">Loading user credits...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Credits</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={exportCSV}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Users</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{credits.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Credits</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">${calculateTotalCredits().toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Balance</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">${calculateAverageBalance().toFixed(2)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Zero Balance</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {credits.filter((c: any) => c.balance === 0).length}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-64">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 w-full"
          />
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
                Current Balance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredCredits.map((credit: any) => (
              <tr key={credit.user_id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FiUser className="mr-2 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {credit.profiles?.full_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {credit.profiles?.email || credit.user_id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FiDollarSign className="mr-1" />
                    <span className={`text-lg font-medium ${
                      credit.balance > 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : credit.balance < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {credit.balance.toFixed(2)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {credit.balance > 0 ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                      Positive
                    </span>
                  ) : credit.balance < 0 ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                      Negative
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                      Zero
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-900 dark:text-white">
                    <FiCalendar className="mr-2" />
                    {credit.updated_at ? new Date(credit.updated_at).toLocaleString() : 'Never'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => openAdjustmentModal(credit.profiles)}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    <FiTrendingUp />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdjustmentModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Adjust User Credits
              </h3>
              <button
                onClick={() => setShowAdjustmentModal(false)}
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
                  {selectedUser.full_name || 'Unknown'}
                  <span className="text-gray-500 dark:text-gray-400 ml-2">
                    ({selectedUser.email})
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Adjustment Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                    {adjustmentForm.amount >= 0 ? '+' : '-'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    value={Math.abs(adjustmentForm.amount)}
                    onChange={(e) => setAdjustmentForm({ 
                      ...adjustmentForm, 
                      amount: parseFloat(e.target.value) * (adjustmentForm.amount < 0 ? -1 : 1)
                    })}
                    className="pl-8 pr-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 w-full"
                    required
                  />
                </div>
                <div className="mt-2 flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentForm({ ...adjustmentForm, amount: Math.abs(adjustmentForm.amount) })}
                    className="flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs rounded"
                  >
                    <FiPlus className="mr-1" /> Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentForm({ ...adjustmentForm, amount: -Math.abs(adjustmentForm.amount) })}
                    className="flex items-center px-2 py-1 bg-red-100 text-red-700 text-xs rounded"
                  >
                    <FiMinus className="mr-1" /> Subtract
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason
                </label>
                <textarea
                  value={adjustmentForm.reason}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  rows={3}
                  placeholder="Reason for credit adjustment..."
                  required
                />
              </div>
            </div>

            <div className="mt-6 flex space-x-2">
              <button
                onClick={handleAdjustment}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Confirm Adjustment
              </button>
              <button
                onClick={() => {
                  setShowAdjustmentModal(false);
                  setSelectedUser(null);
                  setAdjustmentForm({ amount: 0, reason: '' });
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}