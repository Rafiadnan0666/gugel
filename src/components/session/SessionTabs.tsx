
"use client";

import { FiBook, FiEdit2, FiMessageSquare, FiUsers } from 'react-icons/fi';

interface SessionTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabs: any[];
  drafts: any[];
  aiService: any;
  collaborators: any[];
}

export default function SessionTabs({ activeTab, setActiveTab, tabs, drafts, aiService, collaborators }: SessionTabsProps) {
  return (
    <div className="flex border-b border-gray-200 mb-8 overflow-x-auto bg-white rounded-lg shadow-sm">
      {[
        { id: 'content', label: 'Research Content', icon: FiBook, count: tabs.length },
        { id: 'drafts', label: 'Drafts', icon: FiEdit2, count: drafts.length },
        { id: 'chat', label: 'AI Assistant', icon: FiMessageSquare, badge: aiService.aiStatus },
        { id: 'collaborate', label: 'Collaborate', icon: FiUsers, count: collaborators.length + 1 }
      ].map(({ id, label, icon: Icon, count, badge }) => (
        <button
          key={id}
          onClick={() => setActiveTab(id as any)}
          className={`flex items-center space-x-2 px-6 py-4 border-b-2 font-medium whitespace-nowrap transition-all flex-1 justify-center min-w-0 ${
            activeTab === id
              ? 'border-blue-500 text-blue-600 bg-blue-50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Icon className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{label}</span>
          {count !== undefined && (
            <span className={`px-2 py-1 rounded-full text-xs min-w-[2rem] text-center ${
              activeTab === id ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {count}
            </span>
          )}
          {badge && (
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              badge === 'ready' ? 'bg-green-500' : 
              badge === 'loading' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></span>
          )}
        </button>
      ))}
    </div>
  )
}
