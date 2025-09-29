'use client';

import { FiUsers, FiWifi, FiWifiOff, FiRefreshCw, FiUserPlus } from 'react-icons/fi';
import type { ITeam, ITeamMember, PresenceUser } from '@/types/main.db';

interface TeamHeaderProps {
  team: ITeam;
  teamMembers: ITeamMember[];
  presenceUsers: PresenceUser[];
  isOnline: boolean;
  lastSync: Date;
  userRole: 'owner' | 'admin' | 'member' | null;
  onRefresh: () => void;
  onInvite: () => void;
}

export default function TeamHeader({
  team,
  teamMembers,
  presenceUsers,
  isOnline,
  lastSync,
  userRole,
  onRefresh,
  onInvite,
}: TeamHeaderProps) {
  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <FiUsers className="text-2xl text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
                <div className="flex items-center space-x-2">
                  {isOnline ? (
                    <FiWifi className="text-green-500" title="Online" />
                  ) : (
                    <FiWifiOff className="text-red-500" title="Offline" />
                  )}
                  <span className="text-xs text-gray-500">
                    Last sync: {lastSync.toLocaleTimeString()}
                  </span>
                </div>
              </div>
              <p className="text-gray-600 flex items-center space-x-2 mt-1">
                <span>{teamMembers.length} members</span>
                <span>•</span>
                <span>{presenceUsers.length} online</span>
                <span>•</span>
                <span className="capitalize">{team.visibility || 'private'} team</span>
                {userRole && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {userRole}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={onRefresh}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
            >
              <FiRefreshCw className="mr-2" /> Refresh
            </button>
            
            {(userRole === 'owner' || userRole === 'admin') && (
              <button 
                onClick={onInvite}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
              >
                <FiUserPlus className="mr-2" /> Invite
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
