"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { RoleAiQuota, UserRole, AiProvider } from '@/types/main.db';
import { FiPlus, FiEdit2, FiTrash2, FiZap, FiDollarSign, FiActivity, FiToggleLeft, FiToggleRight } from 'react-icons/fi';

export default function RoleAiQuotasPage() {
  const [quotas, setQuotas] = useState<(RoleAiQuota & { 
    user_roles: UserRole,
    ai_providers: AiProvider
  })[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingQuota, setEditingQuota] = useState<RoleAiQuota | null>(null);
  const [formData, setFormData] = useState({
    role_id: '',
    provider_id: '',
    monthly_token_limit: 0,
    hard_stop: true,
    price_per_1k: 0
  });

  const supabase = createClient();

  const fetchData = async () => {
    const [quotasResult, rolesResult, providersResult] = await Promise.all([
      supabase
        .from('role_ai_quotas')
        .select(`
          *,
          user_roles!inner(*),
          ai_providers!inner(*)
        `)
        .order('created_at', { ascending: false }),
      supabase
        .from('user_roles')
        .select('*')
        .order('name'),
      supabase
        .from('ai_providers')
        .select('*')
        .eq('active', true)
        .order('display_name')
    ]);

    if (quotasResult.error) {
      console.error('Error fetching quotas:', quotasResult.error);
    } else {
      setQuotas(quotasResult.data || []);
    }

    if (rolesResult.error) {
      console.error('Error fetching roles:', rolesResult.error);
    } else {
      setRoles(rolesResult.data || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let error;
    if (editingQuota) {
      const result = await supabase
        .from('role_ai_quotas')
        .update(formData)
        .eq('id', editingQuota.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('role_ai_quotas')
        .insert(formData);
      error = result.error;
    }

    if (error) {
      console.error('Error saving quota:', error);
      alert('Error saving quota');
    } else {
      await fetchData();
      setShowForm(false);
      setEditingQuota(null);
      setFormData({
        role_id: '',
        provider_id: '',
        monthly_token_limit: 0,
        hard_stop: true,
        price_per_1k: 0
      });
    }
  };

  const handleEdit = (quota: RoleAiQuota & { 
    user_roles: UserRole,
    ai_providers: AiProvider
  }) => {
    setEditingQuota(quota);
    setFormData({
      role_id: quota.role_id,
      provider_id: quota.provider_id,
      monthly_token_limit: quota.monthly_token_limit || 0,
      hard_stop: quota.hard_stop || false,
      price_per_1k: quota.price_per_1k || 0
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this AI quota?')) return;
    
    const { error } = await supabase
      .from('role_ai_quotas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting quota:', error);
      alert('Error deleting quota');
    } else {
      await fetchData();
    }
  };

  const toggleHardStop = async (quota: RoleAiQuota) => {
    const { error } = await supabase
      .from('role_ai_quotas')
      .update({ hard_stop: !quota.hard_stop })
      .eq('id', quota.id);

    if (error) {
      console.error('Error toggling hard stop:', error);
    } else {
      await fetchData();
    }
  };

  const exportCSV = () => {
    const headers = ['Role', 'Provider', 'Monthly Token Limit', 'Hard Stop', 'Price per 1K', 'Created'];
    const csvData = quotas.map((quota) => [
      quota.user_roles.name,
      quota.ai_providers.display_name,
      quota.monthly_token_limit || 0,
      quota.hard_stop ? 'Yes' : 'No',
      quota.price_per_1k || 0,
      quota.created_at ? new Date(quota.created_at).toLocaleDateString() : 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-quotas-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-6">Loading AI quotas...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Role AI Quotas</h1>
        <div className="flex items-center space-x-4">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Total Quotas: {quotas.length}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <FiPlus className="mr-2" /> Add Quota
          </button>
          <button
            onClick={exportCSV}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">
            {editingQuota ? 'Edit AI Quota' : 'Add New AI Quota'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  required
                >
                  <option value="">Select a role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">AI Provider</label>
                <select
                  value={formData.provider_id}
                  onChange={(e) => setFormData({ ...formData, provider_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  required
                >
                  <option value="">Select a provider</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.display_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Monthly Token Limit</label>
                <input
                  type="number"
                  value={formData.monthly_token_limit}
                  onChange={(e) => setFormData({ ...formData, monthly_token_limit: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  min="0"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Set to 0 for unlimited
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Price per 1K tokens</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.price_per_1k}
                  onChange={(e) => setFormData({ ...formData, price_per_1k: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  min="0"
                  required
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.hard_stop}
                onChange={(e) => setFormData({ ...formData, hard_stop: e.target.checked })}
                className="mr-2"
              />
              <label className="text-sm font-medium">Hard Stop</label>
              <p className="text-xs text-gray-500 dark:text-gray-400 ml-4">
                When enabled, AI usage will stop when limit is reached. When disabled, users can exceed limits with billing.
              </p>
            </div>

            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingQuota ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingQuota(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Provider
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Token Limit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Price/1K
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Hard Stop
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
            {quotas.map((quota) => (
              <tr key={quota.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {quota.user_roles.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {quota.user_roles.description}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {quota.ai_providers.display_name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {quota.ai_providers.key}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FiZap className="mr-2 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {quota.monthly_token_limit ? quota.monthly_token_limit.toLocaleString() : 'Unlimited'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        tokens/month
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FiDollarSign className="mr-2 text-gray-400" />
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      ${quota.price_per_1k?.toFixed(4) || '0.0000'}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => toggleHardStop(quota)}
                    className="flex items-center text-gray-600 dark:text-gray-300"
                  >
                    {quota.hard_stop ? (
                      <FiToggleRight className="text-green-600 text-xl" />
                    ) : (
                      <FiToggleLeft className="text-gray-400 text-xl" />
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {quota.created_at ? new Date(quota.created_at).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(quota)}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    onClick={() => handleDelete(quota.id)}
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

      {quotas.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No AI quotas found. Click "Add Quota" to create the first one.
        </div>
      )}
    </div>
  );
}