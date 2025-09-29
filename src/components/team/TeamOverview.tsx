'use client';

import { FiFileText, FiUsers, FiMessageSquare, FiActivity, FiPlus } from 'react-icons/fi';
import type { IResearchSession, ITeamMember, ITeamMessage, PresenceUser, AnalyticsData } from '@/types/main.db';
import { useRouter } from 'next/navigation';

interface TeamOverviewProps {
  sessions: IResearchSession[];
  teamMembers: ITeamMember[];
  teamMessages: ITeamMessage[];
  presenceUsers: PresenceUser[];
  analyticsData: AnalyticsData | null;
  createNewSession: () => void;
}

export default function TeamOverview({
  sessions,
  teamMembers,
  teamMessages,
  presenceUsers,
  analyticsData,
  createNewSession,
}: TeamOverviewProps) {
  const router = useRouter();

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Sessions</p>
              <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
            </div>
            <FiFileText className="text-blue-500 text-xl" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Members</p>
              <p className="text-2xl font-bold text-gray-900">{teamMembers.length}</p>
            </div>
            <FiUsers className="text-green-500 text-xl" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Messages</p>
              <p className="text-2xl font-bold text-gray-900">{teamMessages.length}</p>
            </div>
            <FiMessageSquare className="text-purple-500 text-xl" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Engagement</p>
              <p className="text-2xl font-bold text-gray-900">
                {analyticsData ? `${analyticsData.engagementRate}%` : '0%'}
              </p>
            </div>
            <FiActivity className="text-orange-500 text-xl" />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Recent Sessions</h3>
          <div className="space-y-4">
            {sessions.slice(0, 5).map(session => (
              <div key={session.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded">
                <div>
                  <h4 className="font-medium">{session.title}</h4>
                  <p className="text-sm text-gray-600">
                    Created {new Date(session.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button 
                  onClick={() => router.push(`/session/${session.id}`)}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                >
                  Open
                </button>
              </div>
            ))}
            <button 
              onClick={createNewSession}
              className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 text-gray-600 hover:text-blue-600 flex items-center justify-center"
            >
              <FiPlus className="mr-2" /> Create New Session
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Online Members</h3>
          <div className="space-y-3">
            {presenceUsers.map(user => (
              <div key={user.user_id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <FiUsers className="text-gray-600" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div>
                    <p className="font-medium">{user.profile.full_name || user.profile.email}</p>
                    <p className="text-sm text-gray-600">Online</p>
                  </div>
                </div>
              </div>
            ))}
            {presenceUsers.length === 0 && (
              <p className="text-gray-500 text-center py-4">No members online</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
