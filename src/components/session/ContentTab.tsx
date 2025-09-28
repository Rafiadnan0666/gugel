
"use client";

import { FiZap, FiPlus, FiBook, FiExternalLink, FiEdit2, FiTrash2, FiStar } from 'react-icons/fi';
import { ITab, ISummary } from '@/types/main.db';

interface ContentTabProps {
  sessionPermissions: 'owner' | 'editor' | 'viewer';
  generateAIDraft: () => void;
  tabs: ITab[];
  isChatLoading: boolean;
  setEditingTab: (tab: ITab | null) => void;
  setShowTabModal: (show: boolean) => void;
  summaries: ISummary[];
  deleteTab: (tabId: string) => void;
}

export default function ContentTab({ 
  sessionPermissions, 
  generateAIDraft, 
  tabs, 
  isChatLoading, 
  setEditingTab, 
  setShowTabModal, 
  summaries, 
  deleteTab 
}: ContentTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Research Sources</h2>
          <p className="text-gray-600 text-sm">Manage your research references and sources</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {(sessionPermissions === 'owner' || sessionPermissions === 'editor') && (
            <>
              <button 
                onClick={generateAIDraft}
                disabled={tabs.length === 0 || isChatLoading}
                className="bg-gradient-to-br from-purple-600 to-purple-700 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:from-gray-400 disabled:to-gray-500 transition-all flex items-center space-x-2 shadow-sm"
              >
                <FiZap className="w-4 h-4" />
                <span>Generate AI Draft</span>
              </button>
              <button 
                onClick={() => {
                  setEditingTab(null);
                  setShowTabModal(true);
                }}
                className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center space-x-2 shadow-sm"
              >
                <FiPlus className="w-4 h-4" />
                <span>Add Research Source</span>
              </button>
            </>
          )}
        </div>
      </div>

      {tabs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tabs.map((tab) => {
            const tabSummary = summaries.find(s => s.tab_id === tab.id);
            return (
              <div key={tab.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all bg-white group">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2 max-w-[70%]">
                    {/* {tab.favicon && ( */}
                    {/*   <img src={tab.favicon} alt="Favicon" className="w-4 h-4 flex-shrink-0" /> */}
                    {/* )} */}
                    <h3 className="font-semibold text-gray-900 truncate" title={tab.title || 'Untitled'}>
                      {tab.title || 'Untitled Research Source'}
                    </h3>
                  </div>
                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                          onClick={() => {
                            setEditingTab(tab);
                            setShowTabModal(true);
                          }}
                          className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                          title="Edit source"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteTab(tab.id)} 
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete source"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 truncate mb-2" title={tab.url}>{tab.url}</p>
                
                {tabSummary && (
                  <div className="mb-3 p-3 bg-blue-50 rounded border border-blue-100">
                    <div className="flex items-center space-x-2 mb-2">
                      <FiZap className="w-3 h-3 text-blue-600" />
                      <span className="text-xs font-medium text-blue-800">AI Summary</span>
                    </div>
                    <p className="text-xs text-blue-700 line-clamp-3">{tabSummary.summary}</p>
                  </div>
                )}
                
                {tab.content && (
                  <p className="text-sm text-gray-700 line-clamp-3 mb-3">{tab.content}</p>
                )}
                
                <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <span>Added {new Date(tab.created_at).toLocaleDateString()}</span>
                  {tabSummary && (
                    <span className="flex items-center space-x-1 text-amber-600">
                      <FiStar className="w-3 h-3" />
                      <span>Summarized</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <FiBook className="w-20 h-20 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No research sources yet</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Start by adding research papers, articles, or online resources to build your research foundation.
          </p>
          {(sessionPermissions === 'owner' || sessionPermissions === 'editor') && (
            <button 
              onClick={() => setShowTabModal(true)}
              className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm"
            >
              Add Your First Research Source
            </button>
          )}
        </div>
      )}
    </div>
  )
}
