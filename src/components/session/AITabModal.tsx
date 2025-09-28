'use client';

import React, { useState, useEffect } from 'react';
import type { ITab } from '@/types/main.db';
import { FiOctagon, FiInfo } from 'react-icons/fi';
import Modal from './Modal';

// AI-Powered Tab Modal
const AITabModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (tab: Partial<ITab>) => void;
  editingTab?: ITab | null;
  onAIAnalyze?: (url: string) => Promise<{ title: string; content: string }>;
}> = ({ isOpen, onClose, onSave, editingTab, onAIAnalyze }) => {
  const [url, setUrl] = useState(editingTab?.url || '');
  const [title, setTitle] = useState(editingTab?.title || '');
  const [content, setContent] = useState(editingTab?.content || '');
  const [isFetching, setIsFetching] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');

  useEffect(() => {
    if (editingTab) {
      setUrl(editingTab.url);
      setTitle(editingTab.title || '');
      setContent(editingTab.content || '');
    } else {
      setUrl('');
      setTitle('');
      setContent('');
    }
  }, [editingTab]);

  const fetchWithAI = async (url: string) => {
    if (!url || !onAIAnalyze) return;
    
    try {
      setIsFetching(true);
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      
      const result = await onAIAnalyze(url);
      setTitle(result.title);
      setContent(result.content);
      setAiAnalysis('AI has analyzed the content and extracted key information.');
      
    } catch (error) {
      console.error('AI Analysis failed:', error);
      setAiAnalysis('AI analysis failed. Please add content manually.');
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSave({
        id: editingTab?.id,
        url,
        title: title || new URL(url).hostname,
        content,
      });
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editingTab ? 'Edit Research Tab' : 'Add AI-Powered Research Tab'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
          <div className="flex space-x-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
            <button
              type="button"
              onClick={() => fetchWithAI(url)}
              disabled={!url.trim() || isFetching}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center transition-colors"
            >
              <FiOctagon className="w-4 h-4 mr-2" />
              AI Analyze
            </button>
          </div>
        </div>
        
        {aiAnalysis && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-sm text-purple-800 flex items-center">
              <FiInfo className="w-4 h-4 mr-2" />
              {aiAnalysis}
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Page title"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Content/Notes</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add your notes or let AI analyze the content..."
            rows={6}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {isFetching && (
            <div className="flex items-center space-x-2 text-gray-500 mt-1">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
              <span className="text-sm">AI is analyzing content...</span>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!url.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {editingTab ? 'Update Tab' : 'Add Tab'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AITabModal;
