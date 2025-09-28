'use client';

import { FiUsers, FiUser, FiShare2, FiDownload } from 'react-icons/fi';
import type { IProfile } from '@/types/main.db';

interface CollaborateTabProps {
  isCollaborativeEditing: boolean;
  onlineUsers: any[];
  userProfile: IProfile | null;
  onSetCollaborativeEditing: (isCollaborating: boolean) => void;
  onInvite: () => void;
  onShare: () => void;
  onExport: () => void;
}

export default function CollaborateTab({
  isCollaborativeEditing, onlineUsers, userProfile, onSetCollaborativeEditing, 
  onInvite, onShare, onExport
}: CollaborateTabProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <FiUsers className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Collaboration Hub</h2>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isCollaborativeEditing ? 'bg-green-500' : 'bg-gray-300'}`}></div>
          <span className="text-sm text-gray-600">
            {isCollaborativeEditing ? 'Live Collaboration Active' : 'Collaboration Paused'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Online Collaborators */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Team Members</h3>
          <div className="space-y-3">
            {/* Current User */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-blue-50">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {userProfile?.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="font-medium">{userProfile?.full_name || 'You'}</div>
                  <div className="text-sm text-gray-600">{userProfile?.email}</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">You</span>
                <span className="text-sm text-green-600">Online</span>
              </div>
            </div>
            
            {/* Other Online Users */}
            {onlineUsers.map((user) => (
              <div key={user.user_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {user.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-gray-600">Collaborator</div>
                  </div>
                </div>
                <span className="text-sm text-green-600">Online</span>
              </div>
            ))}
            
            {onlineUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <FiUsers className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No other collaborators online</p>
                <p className="text-sm mt-2">Invite team members to collaborate in real-time</p>
              </div>
            )}
          </div>
        </div>

        {/* Collaboration Tools */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Collaboration Tools</h3>
          <div className="space-y-4">
            <div className={`p-4 border rounded-lg transition-colors ${
              isCollaborativeEditing
                ? 'border-green-300 bg-green-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium">Live Collaborative Editing</h4>
                <button
                  onClick={() => onSetCollaborativeEditing(!isCollaborativeEditing)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isCollaborativeEditing ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isCollaborativeEditing ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              <p className="text-sm text-gray-600">
                {isCollaborativeEditing 
                  ? 'Enabled - Team members can see your cursor and edits in real-time'
                  : 'Enable to allow real-time collaboration with team members'
                }
              </p>
            </div>

            <button 
              onClick={onInvite}
              className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <FiUser className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="font-medium">Invite Collaborators</h4>
                  <p className="text-sm text-gray-600">Add team members or external collaborators</p>
                </div>
              </div>
            </button>

            <button 
              onClick={onShare}
              className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <FiShare2 className="w-5 h-5 text-green-600" />
                <div>
                  <h4 className="font-medium">Share Session</h4>
                  <p className="text-sm text-gray-600">Generate shareable link for this session</p>
                </div>
              </div>
            </button>

            <button 
              onClick={onExport}
              className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center space-x-3">
                <FiDownload className="w-5 h-5 text-purple-600" />
                <div>
                  <h4 className="font-medium">Export Research</h4>
                  <p className="text-sm text-gray-600">Export as PDF, Word, or Markdown</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
