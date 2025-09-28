
"use client";

import { AIChat } from '@/components/session/AIChat';
import { ISessionMessage } from '@/types/main.db';

interface ChatTabProps {
  chatMessages: ISessionMessage[];
  sendChatMessage: (content: string) => void;
  isChatLoading: boolean;
  aiService: any;
}

export default function ChatTab({ chatMessages, sendChatMessage, isChatLoading, aiService }: ChatTabProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl h-[600px] flex flex-col shadow-sm">
      <AIChat
        messages={chatMessages}
        onSendMessage={sendChatMessage}
        isLoading={isChatLoading}
        aiStatus={aiService.aiStatus}
        aiProgress={aiService.downloadProgress}
      />
    </div>
  )
}
