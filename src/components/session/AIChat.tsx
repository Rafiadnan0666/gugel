"use client";

import React, { useState, useEffect, useRef } from 'react';
import { FiMessageSquare, FiSend, FiZap } from 'react-icons/fi';
import { ISessionMessage } from '@/types/main.db';

// Enhanced AI Chat Component
export const AIChat: React.FC<{ 
  messages: ISessionMessage[];
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  aiStatus: string;
  aiProgress?: number;
}> = ({ messages, onSendMessage, isLoading, aiStatus, aiProgress = 0 }) => {
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const quickPrompts = [
    "Summarize my research findings",
    "Help me structure the research paper",
    "Translate key points to Spanish",
    "Improve academic tone of my draft",
    "Suggest research questions and hypotheses",
    "Analyze the methodology of my sources",
    "Generate an abstract from my content"
  ];

  const getAIStatusColor = () => {
    switch (aiStatus) {
      case 'ready': return 'bg-green-500';
      case 'loading': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getAIStatusText = () => {
    switch (aiStatus) {
      case 'ready': return 'AI Assistant Ready';
      case 'loading': return aiProgress > 0 ? `Downloading AI Model... ${aiProgress.toFixed(1)}%` : 'Initializing AI...';
      case 'error': return 'AI Service Temporarily Unavailable';
      default: return 'AI Assistant Loading...';
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border border-gray-200 overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${getAIStatusColor()} animate-pulse`}></div>
            <div className={`absolute inset-0 rounded-full ${getAIStatusColor()} animate-ping`}></div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">AI Research Assistant</h3>
            <p className="text-sm text-gray-600">{getAIStatusText()}</p>
          </div>
          {aiStatus === 'loading' && aiProgress > 0 && (
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${aiProgress}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Prompts */}
      {messages.length === 0 && (
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <p className="text-sm text-blue-800 mb-3 font-medium">Quick Start Prompts:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => setInput(prompt)}
                className="text-left text-xs bg-blue-100 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-200 transition-colors border border-blue-200"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-2xl rounded-2xl p-4 shadow-sm ${ 
              message.sender === 'user' 
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-none' 
                : 'bg-white text-gray-900 rounded-bl-none border border-gray-100 shadow-sm'
            }`}>
              <div className="flex items-center space-x-2 mb-3">
                {message.sender === 'ai' && (
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <FiZap className="w-3 h-3 text-white" />
                  </div>
                )}
                <span className="text-sm font-medium">
                  {message.sender === 'user' ? 'You' : 'Research Assistant'}
                </span>
                <span className="text-xs opacity-70">
                  {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className={`prose prose-sm max-w-none ${ 
                message.sender === 'user' ? 'text-blue-100' : 'text-gray-800'
              }`}>
                <div dangerouslySetInnerHTML={{ 
                  __html: message.content.replace(/\n/g, '<br>') 
                }} />
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-900 rounded-2xl rounded-bl-none p-4 border border-gray-100 shadow-sm max-w-md">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">AI is thinking</div>
                  <div className="text-xs text-gray-500">Analyzing your research context...</div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex space-x-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              placeholder="Ask AI about your research, request analysis, or seek writing help..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors resize-none"
              rows={1}
              disabled={isLoading}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <div className="absolute right-3 top-3 text-gray-400">
              <FiMessageSquare className="w-4 h-4" />
            </div>
          </div>
          <button 
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 transition-all flex items-center space-x-2 shadow-sm"
          >
            <FiSend className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
        <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>{input.length}/1000</span>
        </div>
      </form>
    </div>
  );
};
