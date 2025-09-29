'use client';

import React, { useRef, useState } from 'react';
import { FiBold, FiItalic, FiUnderline, FiList, FiAlignLeft, FiAlignCenter, FiAlignRight, FiLink2, FiOctagon, FiFileText, FiGlobe, FiRotateCw, FiTarget, FiCoffee, FiAward, FiMinus, FiMessageSquare, FiCode } from 'react-icons/fi';
import type { IProfile } from '@/types/main.db';

// Advanced Collaborative Editor Component
const AdvancedEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onlineUsers?: any[];
  currentUser?: IProfile | null;
  onAIAction?: (action: string, content: string) => Promise<string>;
}> = ({ value, onChange, placeholder = "Start writing your research findings...", disabled = false, onlineUsers = [], currentUser, onAIAction }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [showAITools, setShowAITools] = useState(false);
  
  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleAIAction = async (action: string) => {
    if (!onAIAction || !editorRef.current) return;
    
    const selection = window.getSelection();
    const selectedText = selection?.toString() || editorRef.current.innerText;
    
    if (!selectedText.trim()) return;
    
    setIsAILoading(true);
    try {
      const result = await onAIAction(action, selectedText);
      
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(result));
      } else {
        editorRef.current.innerHTML += `<p>${result}</p>`;
      }
      
      onChange(editorRef.current.innerHTML);
    } catch (error) {
      console.error('AI Action failed:', error);
    } finally {
      setIsAILoading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const AI_TOOLS = [
    { id: 'summarize', label: 'Summarize', icon: FiFileText, description: 'Create a concise summary' },
    { id: 'translate', label: 'Translate', icon: FiGlobe, description: 'Translate to another language' },
    { id: 'rewrite', label: 'Rewrite', icon: FiRotateCw, description: 'Improve writing style' },
    { id: 'expand', label: 'Expand', icon: FiTarget, description: 'Add more details' },
    { id: 'simplify', label: 'Simplify', icon: FiCoffee, description: 'Make text easier to understand' },
    { id: 'formalize', label: 'Formalize', icon: FiAward, description: 'Make more professional' }
  ];

  const [showSlashCommand, setShowSlashCommand] = useState(false);
  const [slashCommandQuery, setSlashCommandQuery] = useState('');

  const slashCommands = [
    { command: 'h1', label: 'Heading 1', action: () => formatText('formatBlock', '<h1>') },
    { command: 'h2', label: 'Heading 2', action: () => formatText('formatBlock', '<h2>') },
    { command: 'h3', label: 'Heading 3', action: () => formatText('formatBlock', '<h3>') },
    { command: 'p', label: 'Paragraph', action: () => formatText('formatBlock', '<p>') },
    { command: 'ul', label: 'Bulleted List', action: () => formatText('insertUnorderedList') },
    { command: 'ol', label: 'Numbered List', action: () => formatText('insertOrderedList') },
    { command: 'quote', label: 'Blockquote', action: () => formatText('formatBlock', '<blockquote>') },
    { command: 'code', label: 'Code Block', action: () => formatText('formatBlock', '<pre>') },
  ];

  const filteredSlashCommands = slashCommands.filter(item => item.command.toLowerCase().includes(slashCommandQuery.toLowerCase()));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === '/') {
      setShowSlashCommand(true);
    }
    if (e.key === 'Escape') {
      setShowSlashCommand(false);
    }
    if (showSlashCommand) {
      if (e.key === 'Enter' && filteredSlashCommands.length > 0) {
        e.preventDefault();
        filteredSlashCommands[0].action();
        setShowSlashCommand(false);
        setSlashCommandQuery('');
      } else if (e.key === 'Backspace') {
        setSlashCommandQuery(prev => prev.slice(0, -1));
      } else if (e.key.length === 1) {
        setSlashCommandQuery(prev => prev + e.key);
      }
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden relative">
      {showSlashCommand && (
        <div className="absolute top-16 left-4 z-20 bg-white border border-gray-200 rounded-lg shadow-xl w-64 animate-fade-in-down-fast">
          <div className="p-2 max-h-64 overflow-y-auto">
            {filteredSlashCommands.map(item => (
              <button
                key={item.command}
                onClick={() => {
                  item.action();
                  setShowSlashCommand(false);
                  setSlashCommandQuery('');
                }}
                className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="font-medium text-gray-900 text-sm">/{item.command}</div>
                <div className="text-xs text-gray-600">{item.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}
      {showAITools && (
        <div className="absolute top-16 right-4 z-20 bg-white border border-gray-200 rounded-lg shadow-xl w-64 animate-fade-in-down-fast">
          <div className="p-3 border-b border-gray-200">
            <h4 className="font-semibold text-gray-900">AI Writing Assistant</h4>
            <p className="text-sm text-gray-600">Select text to use AI tools</p>
          </div>
          <div className="p-2 max-h-64 overflow-y-auto">
            {AI_TOOLS.map(tool => (
              <button
                key={tool.id}
                onClick={() => handleAIAction(tool.id)}
                disabled={isAILoading}
                className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left disabled:opacity-50"
              >
                <tool.icon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm">{tool.label}</div>
                  <div className="text-xs text-gray-600">{tool.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {onlineUsers.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center space-x-2">
            <div className="flex -space-x-2">
              {onlineUsers.slice(0, 3).map((user, index) => (
                <div key={user.user_id} className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </div>
              ))}
              {onlineUsers.length > 3 && (
                <div className="w-6 h-6 bg-blue-300 rounded-full flex items-center justify-center text-blue-700 text-xs">
                  +{onlineUsers.length - 3}
                </div>
              )}
            </div>
            <span className="text-sm text-blue-700">{onlineUsers.length} collaborator(s) online</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-blue-700">Live</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
        <button 
          type="button" 
          onClick={() => setShowAITools(!showAITools)}
          className="p-2 rounded hover:bg-gray-200 transition-colors relative"
          title="AI Writing Tools"
        >
          <FiOctagon className="w-4 h-4 text-purple-600" />
          {showAITools && <div className="absolute top-0 right-0 w-2 h-2 bg-purple-500 rounded-full"></div>}
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button 
          type="button" 
          onClick={() => formatText('bold')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Bold"
        >
          <FiBold className="w-4 h-4" />
        </button>
        <button 
          type="button" 
          onClick={() => formatText('italic')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Italic"
        >
          <FiItalic className="w-4 h-4" />
        </button>
        <button 
          type="button" 
          onClick={() => formatText('underline')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
       
           
          title="Strikethrough"
        >
          <FiMinus className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button 
          type="button" 
          onClick={() => formatText('formatBlock', '<blockquote>')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Blockquote"
        >
          <FiMessageSquare className="w-4 h-4" />
        </button>
        
        <button 
          type="button" 
          onClick={() => formatText('formatBlock', '<pre>')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Code Block"
        >
          <FiCode className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button 
          type="button" 
          onClick={() => formatText('justifyLeft')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Align Left"
        >
          <FiAlignLeft className="w-4 h-4" />
        </button>
        <button 
          type="button" 
          onClick={() => formatText('justifyCenter')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Align Center"
        >
          <FiAlignCenter className="w-4 h-4" />
        </button>
        <button 
          type="button" 
          onClick={() => formatText('justifyRight')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Align Right"
        >
          <FiAlignRight className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button 
          type="button" 
          onClick={() => formatText('insertUnorderedList')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Bullet List"
        >
          <FiList className="w-4 h-4" />
        </button>
        
        <button 
          type="button" 
          onClick={() => formatText('createLink', prompt('Enter URL:'))}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Insert Link"
        >
          <FiLink2 className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button 
          type="button" 
          onClick={() => formatText('formatBlock', '<h1>')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Heading 1"
        >
          <span className="text-sm font-bold">H1</span>
        </button>
        <button 
          type="button" 
          onClick={() => formatText('formatBlock', '<h2>')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Heading 2"
        >
          <span className="text-sm font-bold">H2</span>
        </button>
        <button 
          type="button" 
          onClick={() => formatText('formatBlock', '<h3>')}
          className="p-2 rounded hover:bg-gray-200 transition-colors"
          title="Heading 3"
        >
          <span className="text-sm font-bold">H3</span>
        </button>
      </div>
      
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        className="min-h-96 p-4 focus:outline-none prose prose-sm max-w-none bg-white"
        dangerouslySetInnerHTML={{ __html: value || placeholder }}
        style={{ 
          fontFamily: "'Inter', sans-serif",
          lineHeight: '1.6',
          minHeight: '400px'
        }}
      />

      {isAILoading && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center">
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>AI is processing...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedEditor;
