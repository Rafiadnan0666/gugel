'use client';

import { FiBook, FiPlus, FiFileText, FiExternalLink, FiEdit2, FiTrash2, FiCheck } from 'react-icons/fi';
import type { ITab, ISummary } from '@/types/main.db';

interface ContentTabProps {
  tabs: ITab[];
  summaries: ISummary[];
  sessionPermissions: 'owner' | 'editor' | 'viewer';
  onGenerateAIDraft: () => void;
  onAddTab: () => void;
  onEditTab: (tab: ITab) => void;
  onDeleteTab: (tabId: string) => void;
}

export default function ContentTab({
  tabs, summaries, sessionPermissions, onGenerateAIDraft, onAddTab, onEditTab, onDeleteTab
}: ContentTabProps) {
  return (
    <div className="space-y-8">
      {/* AI Quick Actions */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-purple-900 mb-2">AI Research Assistant</h3>
            <p className="text-purple-700">Let AI help you analyze and organize your research</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={onGenerateAIDraft}
              disabled={tabs.length === 0}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center transition-colors"
            >
              <FiFileText className="w-4 h-4 mr-2" />
              Generate Draft
            </button>
            <button 
              onClick={onAddTab}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center transition-colors"
            >
              <FiPlus className="w-4 h-4 mr-2" />
              Add Tab with AI
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900">Research Tabs</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">{tabs.length} tabs collected</span>
              {(sessionPermissions === 'owner' || sessionPermissions === 'editor') && (
                <button 
                  onClick={onAddTab}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center transition-colors"
                >
                  <FiPlus className="w-4 h-4 mr-2" />
                  Add Tab
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {tabs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tabs.map((tab) => (
                <div key={tab.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900 truncate flex-1">{tab.title || 'Untitled'}</h3>
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a 
                        href={tab.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Open in new tab"
                      >
                        <FiExternalLink className="w-4 h-4" />
                      </a>
                      {(sessionPermissions === 'owner' || sessionPermissions === 'editor') && (
                        <>
                          <button 
                            onClick={() => onEditTab(tab)}
                            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                            title="Edit tab"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onDeleteTab(tab.id)} 
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete tab"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 truncate mb-2">{tab.url}</p>
                  
                  {tab.content && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-700 line-clamp-3">{tab.content}</p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Added {new Date(tab.created_at).toLocaleDateString()}</span>
                    {summaries.find(s => s.tab_id === tab.id) && (
                      <span className="text-green-600 flex items-center">
                        <FiCheck className="w-3 h-3 mr-1" />
                        AI Summarized
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FiBook className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No research tabs yet</h3>
              <p className="text-gray-600 mb-6">Start by adding research sources to your session.</p>
              <button 
                onClick={onAddTab}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Your First Tab with AI
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
