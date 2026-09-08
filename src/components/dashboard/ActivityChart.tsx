'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DataPoint {
  readonly name: string;
  readonly sessions: number;
  readonly tabs: number;
  readonly drafts: number;
}

interface ActivityChartProps {
  readonly data: DataPoint[];
}

const colors = {
  sessions: '#8884d8',
  tabs: '#82ca9d',
  drafts: '#ffc658',
} as const;

const ActivityChart: React.FC<ActivityChartProps> = ({ data }) => {
  const renderChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="sessions" fill={colors.sessions} />
        <Bar dataKey="tabs" fill={colors.tabs} />
        <Bar dataKey="drafts" fill={colors.drafts} />
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <div className="w-full h-full">
      {data.length > 0 ? renderChart() : (
        <div className="flex items-center justify-center h-[300px] text-gray-500">
          No activity data available
        </div>
      )}
    </div>
  );
};

export default React.memo(ActivityChart);