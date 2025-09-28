
"use client";

import { FiChevronLeft, FiCheck, FiX, FiEdit3, FiClock, FiBook, FiEdit2, FiUsers, FiWifi, FiWifiOff } from 'react-icons/fi';
import { IResearchSession, ITab, IDraft, ISessionCollaborator, ITeam } from '@/types/main.db';

interface SessionHeaderProps {
  router: any;
  isEditingTitle: boolean;
  editedTitle: string;
  setEditedTitle: (title: string) => void;
  updateSessionTitle: () => void;
  setIsEditingTitle: (isEditing: boolean) => void;
  session: IResearchSession | null;
  sessionPermissions: 'owner' | 'editor' | 'viewer';
  tabs: ITab[];
  drafts: IDraft[];
  collaborators: ISessionCollaborator[];
  onlineUsers: any[];
  isConnected: boolean;
  teams: ITeam[];
}

export default function SessionHeader({ 
  router, 
  isEditingTitle, 
  editedTitle, 
  setEditedTitle, 
  updateSessionTitle, 
  setIsEditingTitle, 
  session, 
  sessionPermissions, 
  tabs, 
  drafts, 
  collaborators, 
  onlineUsers, 
  isConnected, 
  teams 
}: SessionHeaderProps) {
  return (
    <div className="mb-8">
      <button 
        onClick={() => router.push('/dashboard')} 
        className="inline-flex items-center text-gray-600 hover:text-black mb-6 transition-colors group"
      >
        <FiChevronLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to Dashboard
      </button>
      
      <div className="flex items-center gap-3 mb-3">
        {isEditingTitle ? (
          <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-blue-300 shadow-sm">
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="text-3xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none flex-1 min-w-0"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && updateSessionTitle()}
              onBlur={updateSessionTitle}
            />
            <div className="flex gap-1">
              <button 
                onClick={updateSessionTitle} 
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Save title"
              >
                <FiCheck className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsEditingTitle(false)} 
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Cancel editing"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 group">
            <h1 className="text-3xl font-bold text-gray-900 break-words">{session?.title}</h1>
            {(sessionPermissions === 'owner' || sessionPermissions === 'editor') && (
              <button 
                onClick={() => setIsEditingTitle(true)} 
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                title="Edit title"
              >
                <FiEdit3 className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-4 text-gray-600 flex-wrap">
        <span className="flex items-center gap-2 bg-white px-3 py-1 rounded-full text-sm shadow-sm">
          <FiClock className="w-4 h-4" />
          Created {new Date(session?.created_at!).toLocaleDateString()}
        </span>
        <span className="flex items-center gap-2 bg-white px-3 py-1 rounded-full text-sm shadow-sm">
          <FiBook className="w-4 h-4" />
          {tabs.length} research {tabs.length === 1 ? 'source' : 'sources'}
        </span>
        <span className="flex items-center gap-2 bg-white px-3 py-1 rounded-full text-sm shadow-sm">
          <FiEdit2 className="w-4 h-4" />
          {drafts.length} draft {drafts.length === 1 ? 'version' : 'versions'}
        </span>
        <span className="flex items-center gap-2 bg-white px-3 py-1 rounded-full text-sm shadow-sm">
          <FiUsers className="w-4 h-4" />
          {collaborators.length + 1} collaborator{collaborators.length + 1 === 1 ? '' : 's'}
        </span>
        {onlineUsers.length > 0 && (
          <span className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm shadow-sm">
            <FiWifi className="w-4 h-4" />
            {onlineUsers.length} online now
          </span>
        )}
        {!isConnected && (
          <span className="flex items-center gap-2 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm shadow-sm">
            <FiWifiOff className="w-4 h-4" />
            Offline mode
          </span>
        )}
      </div>

      {/* Team Badge */}
      {teams.length > 0 && (
        <div className="mt-3 inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm shadow-sm">
          <FiUsers className="w-3 h-3" />
          Team: {teams[0].name}
        </div>
      )}
    </div>
  )
}
