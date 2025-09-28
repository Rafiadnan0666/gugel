'use client';

import AIChat from './AIChat'; // Assuming AIChat is refactored
import type { ISessionMessage, ITab, IDraft } from '@/types/main.db';

interface AIChatTabProps {
  messages: ISessionMessage[];
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  researchContext: { tabs: ITab[]; drafts: IDraft[] };
  aiStatus: string;
}

export default function AIChatTab({ messages, onSendMessage, isLoading, researchContext, aiStatus }: AIChatTabProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl h-[600px] flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Research Assistant</h2>
            <p className="text-sm text-gray-600">Ask questions about your research content</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            aiStatus === 'ready' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {aiStatus === 'ready' ? 'AI Ready' : 'AI Loading...'}
          </div>
        </div>
      </div>
      
      <AIChat
        messages={messages}
        onSendMessage={onSendMessage}
        isLoading={isLoading}
        researchContext={researchContext}
      />
    </div>
  );
}
