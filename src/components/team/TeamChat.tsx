'use client';

import { FiSend, FiUsers } from 'react-icons/fi';
import type { ITeamMessage, PresenceUser, IProfile } from '@/types/main.db';
import { useRef, useEffect } from 'react';

interface TeamChatProps {
  teamMessages: ITeamMessage[];
  presenceUsers: PresenceUser[];
  userProfile: IProfile | null;
  newMessage: string;
  setNewMessage: (message: string) => void;
  sendMessage: () => void;
}

export default function TeamChat({
  teamMessages,
  presenceUsers,
  userProfile,
  newMessage,
  setNewMessage,
  sendMessage,
}: TeamChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [teamMessages]);

  return (
    <div className="bg-white rounded-lg border shadow-sm h-[600px] flex flex-col">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Team Chat</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <FiUsers className="text-green-500" />
            <span>{presenceUsers.length} online</span>
          </div>
        </div>
      </div>
      
      <div ref={messagesEndRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {teamMessages.map(message => (
          <div key={message.id} className="flex space-x-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0 flex items-center justify-center">
              <img className="w-8 h-8 rounded-full" src={message.profiles?.avatar_url || '/default-avatar.png'} alt="" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-sm">
                  {message.profiles?.full_name || message.profiles?.email}
                  {message.user_id === userProfile?.id && (
                    <span className="text-blue-600 ml-1">(You)</span>
                  )}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(message.created_at).toLocaleTimeString()}
                </span>
              </div>
              <div className="bg-gray-100 rounded-lg p-3">
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t">
        <div className="flex space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            <FiSend className="text-lg" />
          </button>
        </div>
      </div>
    </div>
  );
}
