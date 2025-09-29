'use client';

import { FiActivity, FiMessageSquare, FiUserPlus, FiFileText } from 'react-icons/fi';
import type { RealTimeEvent } from '@/types/main.db';

interface TeamActivityProps {
  events: RealTimeEvent[];
}

export default function TeamActivity({ events }: TeamActivityProps) {
  return (
    <div className="fixed right-4 top-20 w-80 bg-white rounded-lg border shadow-lg z-40 max-h-96 overflow-y-auto">
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center">
          <FiActivity className="mr-2" /> Live Activity
        </h3>
      </div>
      <div className="p-2">
        {events.slice(0, 5).map((event, index) => (
          <div key={index} className="p-2 text-sm border-b last:border-b-0">
            <div className="flex items-center space-x-2">
              <span className="text-blue-500">
                {event.type === 'message_sent' && <FiMessageSquare />}
                {event.type === 'member_joined' && <FiUserPlus />}
                {event.type === 'session_created' && <FiFileText />}
              </span>
              <span className="font-medium">{event.user?.full_name}</span>
              <span className="text-gray-500 text-xs">
                {event.timestamp.toLocaleTimeString()}
              </span>
            </div>
            <p className="text-gray-600 truncate">
              {event.type === 'message_sent' && 'sent a message'}
              {event.type === 'member_joined' && 'joined the team'}
              {event.type === 'session_created' && 'created a session'}
            </p>
          </div>
        ))}
        {events.length === 0 && (
          <p className="p-4 text-gray-500 text-center">No recent activity</p>
        )}
      </div>
    </div>
  );
}
