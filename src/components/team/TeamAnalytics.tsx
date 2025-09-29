'use client';

import type { AnalyticsData, ITeamMember } from '@/types/main.db';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TeamAnalyticsProps {
  analyticsData: AnalyticsData | null;
  teamMembers: ITeamMember[];
  teamMessages: ITeamMessage[];
}

export default function TeamAnalytics({ analyticsData, teamMembers, teamMessages }: TeamAnalyticsProps) {
  if (!analyticsData) {
    return <div>Loading analytics...</div>;
  }

  const memberActivity = teamMembers.map(member => ({
    name: member.profiles?.full_name || member.profiles?.email || 'User',
    messages: teamMessages.filter(message => message.user_id === member.user_id).length,
  })).sort((a, b) => b.messages - a.messages).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border shadow-sm lg:col-span-2">
          <h4 className="font-semibold mb-2">Weekly Activity</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sessions" fill="#8884d8" name="Sessions" />
              <Bar dataKey="messages" fill="#82ca9d" name="Messages" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h4 className="font-semibold mb-2">Team Stats</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Total Sessions</span>
              <span>{analyticsData.sessionsCreated}</span>
            </div>
            <div className="flex justify-between">
              <span>Messages Sent</span>
              <span>{analyticsData.messagesSent}</span>
            </div>
            <div className="flex justify-between">
              <span>Active Members</span>
              <span>{analyticsData.activeMembers}</span>
            </div>
            <div className="flex justify-between">
              <span>Engagement Rate</span>
              <span>{analyticsData.engagementRate}%</span>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <h4 className="font-semibold mb-2">Most Active Members</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={memberActivity} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={100} />
              <Tooltip />
              <Legend />
              <Bar dataKey="messages" fill="#8884d8" name="Messages" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
