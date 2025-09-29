'use client';

import { FiFileText } from 'react-icons/fi';
import type { IResearchSession } from '@/types/main.db';
import { useRouter } from 'next/navigation';

interface TeamSessionsProps {
  sessions: IResearchSession[];
  createNewSession: () => void;
}

export default function TeamSessions({ sessions, createNewSession }: TeamSessionsProps) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-6 border-b">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Research Sessions</h3>
            <p className="text-gray-600">{sessions.length} sessions</p>
          </div>
          <button 
            onClick={createNewSession}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            New Session
          </button>
        </div>
      </div>
      
      <div className="divide-y">
        {sessions.map(session => (
          <div key={session.id} className="p-6 hover:bg-gray-50 flex justify-between items-center">
            <div>
              <h4 className="font-semibold">{session.title}</h4>
              <p className="text-sm text-gray-600">
                Created {new Date(session.created_at).toLocaleDateString()}
              </p>
            </div>
            <button 
              onClick={() => router.push(`/session/${session.id}`)}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Open Session
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
