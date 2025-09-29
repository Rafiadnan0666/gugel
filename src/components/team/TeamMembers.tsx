'use client';

import { FiUser, FiUsers } from 'react-icons/fi';
import type { ITeamMember, PresenceUser, IProfile } from '@/types/main.db';

interface TeamMembersProps {
  teamMembers: ITeamMember[];
  presenceUsers: PresenceUser[];
  userProfile: IProfile | null;
  userRole: 'owner' | 'admin' | 'member' | null;
  onInvite: () => void;
  onRemove: (memberId: string) => void;
}

export default function TeamMembers({
  teamMembers,
  presenceUsers,
  userProfile,
  userRole,
  onInvite,
  onRemove,
}: TeamMembersProps) {
  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Team Members</h3>
            <p className="text-gray-600">{teamMembers.length} members</p>
          </div>
          {(userRole === 'owner' || userRole === 'admin') && (
            <button 
              onClick={onInvite}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Invite Member
            </button>
          )}
        </div>
      </div>
      
      <div className="divide-y">
        {teamMembers.map(member => (
          <div key={member.id} className="p-6 hover:bg-gray-50 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <FiUser className="text-gray-600" />
                </div>
                {presenceUsers.some(u => u.user_id === member.user_id) && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div>
                <h4 className="font-semibold">
                  {member.profiles?.full_name || member.profiles?.email}
                  {member.user_id === userProfile?.id && (
                    <span className="ml-2 text-blue-600 text-sm">(You)</span>
                  )}
                </h4>
                <p className="text-sm text-gray-600 capitalize">{member.role}</p>
              </div>
            </div>
            
            {(userRole === 'owner' || userRole === 'admin') && member.user_id !== userProfile?.id && (
              <button 
                onClick={() => onRemove(member.id)}
                className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
