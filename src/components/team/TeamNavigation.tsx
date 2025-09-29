'use client';

interface TeamNavigationProps {
  activeTab: 'overview' | 'sessions' | 'members' | 'chat' | 'analytics';
  setActiveTab: (tab: 'overview' | 'sessions' | 'members' | 'chat' | 'analytics') => void;
  unreadMessages: number;
}

export default function TeamNavigation({
  activeTab,
  setActiveTab,
  unreadMessages,
}: TeamNavigationProps) {
  return (
    <div className="flex space-x-8 border-b">
      {(['overview', 'sessions', 'members', 'chat', 'analytics'] as const).map(tab => (
        <button
          key={tab}
          className={`pb-3 px-1 font-medium border-b-2 transition-colors relative ${
            activeTab === tab
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab(tab)}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
          {tab === 'chat' && unreadMessages > 0 && (
            <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadMessages}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
