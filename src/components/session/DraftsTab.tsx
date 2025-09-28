
"use client";

import { FiSave, FiEdit2, FiCheck } from 'react-icons/fi';
import { AdvancedEditor } from '@/components/session/AdvancedEditor';
import { IDraft, IProfile } from '@/types/main.db';

interface DraftsTabProps {
  saveDraft: () => void;
  sessionPermissions: 'owner' | 'editor' | 'viewer';
  currentDraft: string;
  setCurrentDraft: (draft: string) => void;
  onlineUsers: any[];
  userProfile: IProfile | null;
  handleAIAction: (action: string, content: string, options?: any) => Promise<string>;
  isCollaborativeEditing: boolean;
  drafts: IDraft[];
}

export default function DraftsTab({ 
  saveDraft, 
  sessionPermissions, 
  currentDraft, 
  setCurrentDraft, 
  onlineUsers, 
  userProfile, 
  handleAIAction, 
  isCollaborativeEditing, 
  drafts 
}: DraftsTabProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Research Draft</h2>
            <p className="text-gray-600 text-sm">Write and refine your research content</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={saveDraft}
              disabled={sessionPermissions === 'viewer' || !currentDraft.trim()}
              className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 transition-all flex items-center space-x-2 shadow-sm"
            >
              <FiSave className="w-4 h-4" />
              <span>Save Draft</span>
            </button>
          </div>
        </div>
        
        <AdvancedEditor
          value={currentDraft}
          onChange={setCurrentDraft}
          placeholder="Start writing your research findings. Use the AI tools (⚡) to enhance your writing, summarize content, or translate sections..."
          disabled={sessionPermissions === 'viewer'}
          onlineUsers={onlineUsers}
          currentUser={userProfile}
          onAIAction={handleAIAction}
          isCollaborative={isCollaborativeEditing}
        />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Draft Versions</h3>
            <p className="text-gray-600 text-sm">Previous versions and auto-saves</p>
          </div>
          <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
            {drafts.length} version{drafts.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {drafts.map((draft, index) => (
            <div 
              key={draft.id} 
              className={`border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-all group ${
                currentDraft === draft.content ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200'
              }`}
              onClick={() => setCurrentDraft(draft.content)}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-900">Version {draft.version}</span>
                <span className="text-xs text-gray-500">
                  {new Date(draft.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                {draft.content.replace(/<[^>]*>/g, ' ').substring(0, 150)}...
              </p>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{draft.content.replace(/<[^>]*>/g, '').length} characters</span>
                {currentDraft === draft.content && (
                  <span className="text-blue-600 font-medium flex items-center space-x-1">
                    <FiCheck className="w-3 h-3" />
                    <span>Current</span>
                  </span>
                )}
              </div>
            </div>
          ))}
          {drafts.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <FiEdit2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No saved drafts yet</p>
              <p className="text-sm mt-1">Start writing to save your first version</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
