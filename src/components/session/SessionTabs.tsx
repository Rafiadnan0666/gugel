'use client';

import { FiBook, FiEdit2, FiMessageSquare, FiUsers } from 'react-icons/fi';

interface SessionTabsProps {
  activeTab: string;
  onlineUsersCount: number;
  onTabChange: (tab: 'content' | 'drafts' | 'chat' | 'collaborate') => void;
}

export default function SessionTabs({ activeTab, onlineUsersCount, onTabChange }: SessionTabsProps) {
  const tabs = [
    { id: 'content', label: 'Research Content', icon: FiBook },
    { id: 'drafts', label: 'Drafts', icon: FiEdit2 },
    { id: 'chat', label: 'AI Chat', icon: FiMessageSquare },
    { id: 'collaborate', label: `Collaborate ${onlineUsersCount > 0 ? `(${onlineUsersCount})` : ''}`, icon: FiUsers }
  ];

  return (
    <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id as any)}
          className={`flex items-center space-x-2 px-6 py-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
            activeTab === id
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
