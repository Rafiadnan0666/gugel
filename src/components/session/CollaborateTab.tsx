
"use client";

import { FiUser, FiWifi, FiCheck, FiX, FiEdit3, FiPlus, FiMessageSquare, FiAlertCircle, FiUsers, FiActivity } from 'react-icons/fi';
import { IProfile, ISessionCollaborator, ITeam, ITeamMember } from '@/types/main.db';

interface CollaborateTabProps {
  sessionPermissions: 'owner' | 'editor' | 'viewer';
  setModal: (modal: { type: string; data?: any }) => void;
  sessionId: string;
  loadSessionData: () => void;
  collaborators: ISessionCollaborator[];
  userProfile: IProfile | null;
  onlineUsers: any[];
  isCollaborativeEditing: boolean;
  setIsCollaborativeEditing: (value: boolean) => void;
  collaborationEvents: any[];
}

export default function CollaborateTab({ 
  sessionPermissions, 
  setModal, 
  sessionId, 
  loadSessionData, 
  collaborators, 
  userProfile, 
  onlineUsers, 
  isCollaborativeEditing, 
  setIsCollaborativeEditing, 
  collaborationEvents 
}: CollaborateTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Team Collaboration</h2>
          <p className="text-gray-600 text-sm">Manage collaborators and team settings</p>
        </div>
        <button 
          onClick={() => setModal({ type: 'invite' })}
          disabled={sessionPermissions === 'viewer'}
          className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 transition-all flex items-center space-x-2 shadow-sm"
        >
          <FiUser className="w-4 h-4" />
          <span>Invite Collaborator</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Members */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold text-gray-900 text-lg">Team Members</h3>
          <div className="space-y-3">
            {/* Current User */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-medium text-lg shadow-sm">
                  {userProfile?.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{userProfile?.full_name || 'You'}</div>
                  <div className="text-sm text-gray-600">{userProfile?.email}</div>
                  <div className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-1 rounded-full inline-block mt-1">
                    Session Owner
                  </div>
                </div>
              </div>
              <span className="flex items-center space-x-2 text-green-600 text-sm bg-green-100 px-3 py-1 rounded-full">
                <FiWifi className="w-4 h-4" />
                <span>Online</span>
              </span>
            </div>
            
            {/* Collaborators */}
            {collaborators.map((collab: any) => (
              <div key={collab.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white font-medium text-lg shadow-sm">
                    {collab.profiles?.full_name?.[0]?.toUpperCase() || 'C'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{collab.profiles?.full_name || 'Collaborator'}</div>
                    <div className="text-sm text-gray-600">{collab.profiles?.email}</div>
                    <div className={`text-xs capitalize px-2 py-1 rounded-full inline-block mt-1 ${
                      collab.role === 'editor' 
                        ? 'text-green-800 bg-green-100' 
                        : 'text-gray-800 bg-gray-100'
                    }`}>
                      {collab.role}
                    </div>
                  </div>
                </div>
                <span className="text-gray-500 text-sm bg-gray-100 px-3 py-1 rounded-full">
                  Last active recently
                </span>
              </div>
            ))}

            {collaborators.length === 0 && (
              <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
                <FiUsers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-600">No collaborators yet</p>
                <p className="text-sm text-gray-500 mt-1">Invite team members to collaborate</p>
              </div>
            )}
          </div>
        </div>

        {/* Collaboration Tools */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 text-lg">Collaboration Tools</h3>
          <div className="space-y-4">
            <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-medium text-gray-900">Live Collaborative Editing</div>
                  <div className="text-sm text-gray-600">Real-time editing with team members</div>
                </div>
                <button
                  onClick={() => setIsCollaborativeEditing(!isCollaborativeEditing)}
                  disabled={sessionPermissions === 'viewer'}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isCollaborativeEditing ? 'bg-green-600' : 'bg-gray-200'
                  } ${sessionPermissions === 'viewer' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    isCollaborativeEditing ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              <p className="text-sm text-gray-600">
                {isCollaborativeEditing ? 
                  'Team members can edit simultaneously in real-time' : 
                  'Only one person can edit at a time'}
              </p>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
              <div className="font-medium text-gray-900 mb-3">Recent Activity</div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {collaborationEvents.slice(-5).reverse().map((event, index) => (
                  <div key={index} className="text-xs text-gray-600 flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                    <FiActivity className="w-3 h-3 text-blue-600 flex-shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="font-medium capitalize">{event.type.replace('_', ' ')}</span>
                      {event.user && <span> by user</span>}
                    </span>
                    <span className="text-gray-400 text-xs flex-shrink-0">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
                {collaborationEvents.length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    <FiActivity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No recent activity
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50">
              <div className="font-medium text-gray-900 mb-2">AI Collaboration Tips</div>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Use AI to summarize collaborative discussions</li>
                <li>• Generate draft versions for team review</li>
                <li>• Translate content for international teams</li>
                <li>• Maintain version history of all changes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
