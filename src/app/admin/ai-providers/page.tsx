"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { AiProvider } from '@/types/main.db';
import { FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiExternalLink } from 'react-icons/fi';

export default function AIProvidersPage() {
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AiProvider | null>(null);
  const [formData, setFormData] = useState({
    key: '',
    display_name: '',
    is_paid: true,
    active: true
  });

  const supabase = createClient();

  const fetchProviders = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('ai_providers')
      .select('*')
      .order('display_name');

    if (fetchError) {
      console.error('Error fetching providers:', fetchError);
    } else {
      setProviders(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let error;
    if (editingProvider) {
      const result = await supabase
        .from('ai_providers')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingProvider.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('ai_providers')
        .insert(formData);
      error = result.error;
    }

    if (error) {
      console.error('Error saving provider:', error);
      alert('Error saving provider');
    } else {
      await fetchProviders();
      setShowForm(false);
      setEditingProvider(null);
      setFormData({
        key: '',
        display_name: '',
        is_paid: true,
        active: true
      });
    }
  };

  const handleEdit = (provider: AiProvider) => {
    setEditingProvider(provider);
    setFormData({
      key: provider.key,
      display_name: provider.display_name,
      is_paid: provider.is_paid || false,
      active: provider.active || false
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this provider?')) return;
    
    const { error } = await supabase
      .from('ai_providers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting provider:', error);
      alert('Error deleting provider');
    } else {
      await fetchProviders();
    }
  };

  const toggleActive = async (provider: AiProvider) => {
    const { error } = await supabase
      .from('ai_providers')
      .update({ 
        active: !provider.active,
        updated_at: new Date().toISOString()
      })
      .eq('id', provider.id);

    if (error) {
      console.error('Error toggling provider:', error);
    } else {
      await fetchProviders();
    }
  };

  if (loading) {
    return <div className="p-6">Loading AI providers...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Providers</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <FiPlus className="mr-2" /> Add Provider
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">
            {editingProvider ? 'Edit Provider' : 'Add New Provider'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Provider Key</label>
              <input
                type="text"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Display Name</label>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_paid}
                  onChange={(e) => setFormData({ ...formData, is_paid: e.target.checked })}
                  className="mr-2"
                />
                Paid Provider
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="mr-2"
                />
                Active
              </label>
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingProvider ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingProvider(null);
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
                Provider
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
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
            {providers.map((provider) => (
              <tr key={provider.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {provider.display_name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {provider.key}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    provider.is_paid ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100'
                  }`}>
                    {provider.is_paid ? 'Paid' : 'Free'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => toggleActive(provider)}
                    className="flex items-center text-gray-600 dark:text-gray-300"
                  >
                    {provider.active ? (
                      <FiToggleRight className="text-green-600 text-xl" />
                    ) : (
                      <FiToggleLeft className="text-gray-400 text-xl" />
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {provider.created_at ? new Date(provider.created_at).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(provider)}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    onClick={() => handleDelete(provider.id)}
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
    </div>
  );
}