'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { ISessionMessage, ITab, IDraft } from '@/types/main.db';
import AIResponse from '@/components/AIResponse';
import { FiSend } from 'react-icons/fi';
import useChromeAI from '@/hooks/useChromeAI';

// Enhanced AI Chat Component
const AIChat: React.FC<{
  messages: ISessionMessage[];
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  researchContext: { tabs: ITab[]; drafts: IDraft[] };
}> = ({ messages, onSendMessage, isLoading, researchContext }) => {
  const [input, setInput] = useState('');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { session, error, prompt } = useChromeAI();

  useEffect(() => {
    // Generate suggested questions based on research context
    const suggestions = [
      "Summarize my research findings",
      "Suggest a structure for my draft",
      "What are the key themes in my sources?",
      "Help me write an introduction",
      "Find connections between my tabs"
    ];
    setSuggestedQuestions(suggestions);
  }, [researchContext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
      if (prompt) {
        const aiResponse = await prompt(input);
        if (aiResponse) {
          onSendMessage(aiResponse);
        }
      }
    }
  };

  const handleSuggestionClick = (question: string) => {
    setInput(question);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg">
      {error && (
        <div className="p-4 bg-red-100 text-red-700 border-b border-red-200">
          <p>{error}</p>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md rounded-lg p-4 ${
              message.sender === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white text-gray-900 rounded-bl-none border border-gray-200 shadow-sm'
            }`}>
              {message.sender === 'user' ? (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              ) : (
                <AIResponse content={message.content} />
              )}
              <span className={`text-xs block mt-2 ${
                message.sender === 'user' ? 'text-blue-200' : 'text-gray-500'
              }`}>
                {new Date(message.created_at).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-900 rounded-lg rounded-bl-none p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                <span className="text-sm text-gray-600">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {suggestedQuestions.length > 0 && input.length === 0 && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(question)}
                className="text-xs bg-white border border-gray-200 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-50 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex space-x-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI about your research..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button 
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center"
          >
            <FiSend className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIChat;
