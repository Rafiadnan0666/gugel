
"use client";

import React, { useState, useEffect } from 'react';
import { FiSave, FiX } from 'react-icons/fi';
import { ITab } from '@/types/main.db';
import { Modal } from '@/components/session/Modal';
import { web_fetch } from 'default_api';

// Enhanced Tab Modal with AI Integration
export const TabModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (tab: Partial<ITab>) => void;
  editingTab?: ITab | null;
  onAIAction?: (action: string, content: string) => Promise<string>;
}> = ({ isOpen, onClose, onSave, editingTab, onAIAction }) => {
  const [url, setUrl] = useState(editingTab?.url || '');
  const [title, setTitle] = useState(editingTab?.title || '');
  const [content, setContent] = useState(editingTab?.content || '');
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
  }, [editingTab, isOpen]);

  const generateTitleFromContent = async () => {
    if (!content.trim() || !onAIAction) return;
    
    setIsGeneratingTitle(true);
    try {
      const generatedTitle = await onAIAction('Generate a concise and informative title for the following content:', content);
      setTitle(generatedTitle.replace(/^#+\s*/, '').trim()); // Remove markdown headers
    } catch (error) {
      console.error('Failed to generate title:', error);
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const extractContentFromUrl = async () => {
    if (!url.trim()) return;
    
    try {
      setIsLoading(true);
      const response = await web_fetch({
        prompt: `Extract the main content from the URL: ${url}`,
      });
      setContent(response.output);
    } catch (error) {
      console.error('Content extraction failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    onSave({
      id: editingTab?.id,
      url: url.trim(),
      title: title.trim() || 'New Research Tab',
      content: content.trim()
    });
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={editingTab ? 'Edit Research Tab' : 'Add Research Tab'} 
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Research URL *
          </label>
          <div className="flex space-x-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={extractContentFromUrl}
              placeholder="https://arxiv.org/abs/1234.5678"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              required
              disabled={isLoading}
            />
            {isLoading && (
              <div className="flex items-center px-3 bg-gray-100 rounded-lg">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title
            {content.trim() && onAIAction && (
              <button
                type="button"
                onClick={generateTitleFromContent}
                disabled={isGeneratingTitle}
                className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
              >
                {isGeneratingTitle ? (
                  <span className="flex items-center">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                    Generating...
                  </span>
                ) : (
                  '✨ AI Suggest Title'
                )}
              </button>
            )}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Research paper title or description"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Research Notes & Key Findings
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add your research notes, key findings, summary, or important quotes..."
            rows={6}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-vertical"
          />
          <p className="text-xs text-gray-500 mt-1">
            AI will automatically generate a summary when you save this tab.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2"
          >
            <FiSave className="w-4 h-4" />
            <span>{editingTab ? 'Update Tab' : 'Add Research Tab'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
