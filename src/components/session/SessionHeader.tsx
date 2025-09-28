'use client';

import { FiClock, FiBook, FiEdit2, FiUsers, FiCpu, FiGitBranch, FiGitPullRequest, FiUser, FiMaximize, FiCheck, FiX, FiEdit3 } from 'react-icons/fi';
import type { IResearchSession, ITab, IDraft, ISessionCollaborator } from '@/types/main.db';

interface SessionHeaderProps {
  session: IResearchSession;
  tabs: ITab[];
  drafts: IDraft[];
  collaborators: ISessionCollaborator[];
  aiStatus: string;
  isEditingTitle: boolean;
  editedTitle: string;
  sessionPermissions: 'owner' | 'editor' | 'viewer';
  isCollaborativeEditing: boolean;
  onBack: () => void;
  onEditTitle: (isEditing: boolean) => void;
  onUpdateTitle: () => void;
  onSetEditedTitle: (title: string) => void;
  onSetCollaborativeEditing: (isCollaborating: boolean) => void;
  onInvite: () => void;
  onShowFullEditor: () => void;
}

export default function SessionHeader({
  session, tabs, drafts, collaborators, aiStatus, isEditingTitle, editedTitle, 
  sessionPermissions, isCollaborativeEditing, onBack, onEditTitle, onUpdateTitle, 
  onSetEditedTitle, onSetCollaborativeEditing, onInvite, onShowFullEditor
}: SessionHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
      <div className="flex-1">
        <button 
          onClick={onBack} 
          className="text-gray-600 hover:text-black mb-4 flex items-center transition-colors"
        >
          ← Back to Dashboard
        </button>
        
        <div className="flex items-center gap-3 mb-2">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => onSetEditedTitle(e.target.value)}
                className="text-3xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none"
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && onUpdateTitle()}
              />
              <button onClick={onUpdateTitle} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                <FiCheck className="w-5 h-5" />
              </button>
              <button onClick={() => onEditTitle(false)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <FiX className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-gray-900">{session.title}</h1>
              {(sessionPermissions === 'owner' || sessionPermissions === 'editor') && (
                <button 
                  onClick={() => onEditTitle(true)} 
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiEdit3 className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-4 text-gray-600">
          <span className="flex items-center">
            <FiClock className="w-4 h-4 mr-1" />
            Created {new Date(session.created_at).toLocaleDateString()}
          </span>
          <span>•</span>
          <span className="flex items-center">
            <FiBook className="w-4 h-4 mr-1" />
            {tabs.length} research tabs
          </span>
          <span>•</span>
          <span className="flex items-center">
            <FiEdit2 className="w-4 h-4 mr-1" />
            {drafts.length} drafts
          </span>
          <span>•</span>
          <span className="flex items-center">
            <FiUsers className="w-4 h-4 mr-1" />
            {collaborators.length + 1} collaborators
          </span>
          <span>•</span>
          <span className={`flex items-center ${aiStatus === 'ready' ? 'text-green-600' : 'text-yellow-600'}`}>
            <FiCpu className="w-4 h-4 mr-1" />
            AI: {aiStatus}
          </span>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        <button 
          onClick={() => onSetCollaborativeEditing(!isCollaborativeEditing)}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
            isCollaborativeEditing 
              ? 'bg-green-100 text-green-800 border border-green-300' 
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          {isCollaborativeEditing ? <FiGitBranch className="w-5 h-5 mr-2" /> : <FiGitPullRequest className="w-5 h-5 mr-2" />}
          {isCollaborativeEditing ? 'Collaborating' : 'Collaborate'}
        </button>
        
        <button 
          onClick={onInvite}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center transition-colors"
        >
          <FiUser className="w-5 h-5 mr-2" />
          Invite
        </button>

        <button 
          onClick={onShowFullEditor}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center transition-colors"
        >
          <FiMaximize className="w-5 h-5 mr-2" />
          Full Editor
        </button>
      </div>
    </div>
  );
}
