"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { AiModel, AiProvider } from '@/types/main.db';
import { FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';

export default function AIModelsPage() {
  const [models, setModels] = useState<AiModel[]>([]);
  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingModel, setEditingModel] = useState<AiModel | null>(null);
  const [formData, setFormData] = useState({
    provider_id: '',
    model_key: '',
    context_limit: 4096,
    input_cost_per_1k: 0,
    output_cost_per_1k: 0,
    active: true
  });

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const [modelsResult, providersResult] = await Promise.all([
      supabase
        .from('ai_models')
        .select('*, ai_providers(*)')
        .order('created_at', { ascending: false }),
      supabase
        .from('ai_providers')
        .select('*')
        .eq('active', true)
        .order('display_name')
    ]);

    if (modelsResult.error) {
      console.error('Error fetching models:', modelsResult.error);
    } else {
      setModels(modelsResult.data || []);
    }

    if (providersResult.error) {
      console.error('Error fetching providers:', providersResult.error);
    } else {
      setProviders(providersResult.data || []);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let error;
    if (editingModel) {
      const result = await supabase
        .from('ai_models')
        .update(formData)
        .eq('id', editingModel.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('ai_models')
        .insert(formData);
      error = result.error;
    }

    if (error) {
      console.error('Error saving model:', error);
      alert('Error saving model');
    } else {
      await fetchData();
      setShowForm(false);
      setEditingModel(null);
      setFormData({
        provider_id: '',
        model_key: '',
        context_limit: 4096,
        input_cost_per_1k: 0,
        output_cost_per_1k: 0,
        active: true
      });
    }
  };

  const handleEdit = (model: AiModel) => {
    setEditingModel(model);
    setFormData({
      provider_id: model.provider_id,
      model_key: model.model_key,
      context_limit: model.context_limit,
      input_cost_per_1k: model.input_cost_per_1k || 0,
      output_cost_per_1k: model.output_cost_per_1k || 0,
      active: model.active || false
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;
    
    const { error } = await supabase
      .from('ai_models')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting model:', error);
      alert('Error deleting model');
    } else {
      await fetchData();
    }
  };

  const toggleActive = async (model: AiModel) => {
    const { error } = await supabase
      .from('ai_models')
      .update({ active: !model.active })
      .eq('id', model.id);

    if (error) {
      console.error('Error toggling model:', error);
    } else {
      await fetchData();
    }
  };

  if (loading) {
    return <div className="p-6">Loading AI models...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Models</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <FiPlus className="mr-2" /> Add Model
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">
            {editingModel ? 'Edit Model' : 'Add New Model'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Provider</label>
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
            <div>
              <label className="block text-sm font-medium mb-1">Model Key</label>
              <input
                type="text"
                value={formData.model_key}
                onChange={(e) => setFormData({ ...formData, model_key: e.target.value })}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Context Limit</label>
              <input
                type="number"
                value={formData.context_limit}
                onChange={(e) => setFormData({ ...formData, context_limit: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Input Cost per 1K tokens</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.input_cost_per_1k}
                  onChange={(e) => setFormData({ ...formData, input_cost_per_1k: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Output Cost per 1K tokens</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.output_cost_per_1k}
                  onChange={(e) => setFormData({ ...formData, output_cost_per_1k: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="mr-2"
              />
              <label className="text-sm font-medium">Active</label>
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingModel ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingModel(null);
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
                Model
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Provider
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Context
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Cost/1K
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {models.map((model: any) => (
              <tr key={model.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {model.model_key}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {model.ai_providers?.display_name || 'Unknown'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {model.context_limit.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  ${((model.input_cost_per_1k || 0) + (model.output_cost_per_1k || 0)).toFixed(4)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => toggleActive(model)}
                    className="flex items-center text-gray-600 dark:text-gray-300"
                  >
                    {model.active ? (
                      <FiToggleRight className="text-green-600 text-xl" />
                    ) : (
                      <FiToggleLeft className="text-gray-400 text-xl" />
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(model)}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    onClick={() => handleDelete(model.id)}
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