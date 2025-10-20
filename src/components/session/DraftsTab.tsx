'use client';

import { FiZap, FiSave, FiMaximize, FiEye, FiEdit2 } from 'react-icons/fi';
import type { IDraft, IProfile } from '@/types/main.db';
import { ProEditor } from '@/components/editor/ProEditor';

interface DraftsTabProps {
  tabs: any[]; // Simplified for now
  drafts: IDraft[];
  currentDraft: string;
  aiGeneratedDrafts: string[];
  sessionPermissions: 'owner' | 'editor' | 'viewer';
  userProfile: IProfile | null;
  onlineUsers: any[];
  onGenerateAIDraft: () => void;
  onSaveDraft: () => void;
  onShowFullEditor: () => void;
  onSetCurrentDraft: (draft: string) => void;
  onSetDraftVersion: (version: number) => void;
  onAIAction: (action: string, content: string) => Promise<string>;
}

export default function DraftsTab({
  tabs, drafts, currentDraft, aiGeneratedDrafts, sessionPermissions, userProfile, onlineUsers,
  onGenerateAIDraft, onSaveDraft, onShowFullEditor, onSetCurrentDraft, onSetDraftVersion, onAIAction
}: DraftsTabProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">Research Draft</h2>
          <div className="flex items-center space-x-2">
            <button 
              onClick={onGenerateAIDraft}
              disabled={tabs.length === 0}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center transition-colors"
            >
              <FiZap className="w-4 h-4 mr-2" />
              AI Generate
            </button>
            <button 
              onClick={onSaveDraft}
              disabled={sessionPermissions === 'viewer' || !currentDraft.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center transition-colors"
            >
              <FiSave className="w-4 h-4 mr-2" />
              Save Draft
            </button>
            <button 
              onClick={onShowFullEditor}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center transition-colors"
            >
              <FiMaximize className="w-4 h-4 mr-2" />
              Fullscreen
            </button>
          </div>
        </div>
        
        <ProEditor
          content={currentDraft}
          onChange={onSetCurrentDraft}





        />
        
        {sessionPermissions === 'viewer' && (
          <p className="text-sm text-gray-500 mt-2 flex items-center">
            <FiEye className="w-4 h-4 mr-1" />
            Viewer permissions: You cannot edit this draft.
          </p>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Draft Versions & AI Suggestions</h3>
        
        {aiGeneratedDrafts.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <FiZap className="w-4 h-4 mr-2 text-purple-600" />
              AI Generated Drafts
            </h4>
            <div className="space-y-2">
              {aiGeneratedDrafts.map((draft, index) => (
                <div 
                  key={index}
                  className="border border-purple-200 bg-purple-50 rounded-lg p-3 cursor-pointer hover:bg-purple-100 transition-colors"
                  onClick={() => onSetCurrentDraft(draft)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-purple-900">AI Draft {index + 1}</span>
                    <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded">AI</span>
                  </div>
                  <p className="text-sm text-purple-700 line-clamp-2">
                    {draft.substring(0, 100)}...
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {drafts.map((draft) => (
            <div 
              key={draft.id} 
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => {
                onSetCurrentDraft(draft.content);
                onSetDraftVersion(draft.version + 1);
              }}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-900">Version {draft.version}</span>
                <span className="text-xs text-gray-500">
                  {new Date(draft.created_at).toLocaleDateString()}
                </span>
              </div>
              <div 
                className="text-sm text-gray-600 line-clamp-3 prose prose-sm"
                dangerouslySetInnerHTML={{ __html: draft.content.substring(0, 200) + '...' }}
              />
            </div>
          ))}
          {drafts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FiEdit2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No saved drafts yet. Start writing to save your first draft.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
