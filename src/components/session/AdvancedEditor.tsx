
"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  FiZap, FiX, FiBold, FiItalic, FiUnderline, FiList, FiAlignLeft,
  FiAlignCenter, FiAlignRight, FiFileText, FiGlobe, FiRotateCw, FiTarget,
  FiMinus, FiCode, FiMessageSquare
} from 'react-icons/fi';
import { IProfile } from '@/types/main.db';

// Enhanced Editor Component with AI Integration
export const AdvancedEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onlineUsers?: any[];
  currentUser?: IProfile | null;
  onAIAction?: (action: string, content: string, options?: any) => Promise<string>;
  isCollaborative?: boolean;
}> = ({ value, onChange, placeholder = "Start writing your research findings...", disabled = false, onlineUsers = [], currentUser, onAIAction, isCollaborative = false }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [showAITools, setShowAITools] = useState(false);
  const [activeAITool, setActiveAITool] = useState<string | null>(null);
  
  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    updateContent();
  };

  const updateContent = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleAIAction = async (action: string, options?: any) => {
    if (!onAIAction || !editorRef.current) return;
    
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || editorRef.current.innerText.trim();
    
    if (!selectedText) return;
    
    setIsAILoading(true);
    setActiveAITool(action);
    
    try {
      const result = await onAIAction(action, selectedText, options);
      
      if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        
        const div = document.createElement('div');
        div.innerHTML = result;
        const fragment = document.createDocumentFragment();
        while (div.firstChild) {
          fragment.appendChild(div.firstChild);
        }
        range.insertNode(fragment);
      } else {
        const p = document.createElement('p');
        p.innerHTML = result;
        editorRef.current.appendChild(p);
      }
      
      updateContent();
    } catch (error) {
      console.error('AI Action failed:', error);
      if (editorRef.current) {
        const errorMsg = document.createElement('p');
        errorMsg.className = 'text-red-500 text-sm italic';
        errorMsg.textContent = 'AI service temporarily unavailable. Please try again.';
        editorRef.current.appendChild(errorMsg);
        updateContent();
      }
    } finally {
      setIsAILoading(false);
      setActiveAITool(null);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    updateContent();
  };

  const AI_TOOLS = [
    { 
      id: 'summarize', 
      label: 'Summarize', 
      icon: FiFileText, 
      description: 'Create a concise summary',
      options: [
        { label: 'Brief', value: 'brief' }, 
        { label: 'Detailed', value: 'detailed' },
        { label: 'Bullet Points', value: 'bullet' }
      ]
    },
    { 
      id: 'translate', 
      label: 'Translate', 
      icon: FiGlobe, 
      description: 'Translate to another language',
      options: [
        { label: 'Spanish', value: 'es' }, 
        { label: 'French', value: 'fr' }, 
        { label: 'German', value: 'de' },
        { label: 'Chinese', value: 'zh' },
        { label: 'Japanese', value: 'ja' }
      ]
    },
    { 
      id: 'rewrite', 
      label: 'Rewrite', 
      icon: FiRotateCw, 
      description: 'Improve writing style',
      options: [
        { label: 'Academic', value: 'academic' },
        { label: 'Professional', value: 'professional' },
        { label: 'Simple', value: 'simple' },
        { label: 'Formal', value: 'formal' }
      ]
    },
    { 
      id: 'expand', 
      label: 'Expand', 
      icon: FiTarget, 
      description: 'Add more details',
      options: [
        { label: 'With Examples', value: 'examples' },
        { label: 'With Evidence', value: 'evidence' },
        { label: 'With Analysis', value: 'analysis' },
        { label: 'With Citations', value: 'citations' }
      ]
    }
  ];

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden relative bg-white">
      {/* AI Tools Dropdown */}
      {showAITools && (
        <div className="absolute top-12 left-4 z-20 bg-white border border-gray-200 rounded-lg shadow-xl w-80">
          <div className="p-2 max-h-64 overflow-y-auto">
            {AI_TOOLS.map(tool => (
              <div key={tool.id} className="mb-1 last:mb-0">
                <button
                  onClick={() => handleAIAction(tool.id)}
                  disabled={isAILoading}
                  className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <tool.icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{tool.label}</div>
                  </div>
                  {isAILoading && activeAITool === tool.id && (
                    <div className="flex-shrink-0">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-3 border-b border-gray-200 bg-gray-50">
        <button 
          onClick={() => setShowAITools(!showAITools)}
          disabled={isAILoading}
          className="p-2 rounded-lg hover:bg-gray-200 transition-colors relative group border border-transparent hover:border-gray-300"
          title="AI Assistant"
        >
          <FiZap className="w-4 h-4 text-purple-600" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-white"></span>
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <div className="flex items-center gap-1">
          <button onClick={() => formatText('bold')} className="p-2 rounded hover:bg-gray-200" title="Bold">
            <FiBold className="w-4 h-4" />
          </button>
          <button onClick={() => formatText('italic')} className="p-2 rounded hover:bg-gray-200" title="Italic">
            <FiItalic className="w-4 h-4" />
          </button>
          <button onClick={() => formatText('underline')} className="p-2 rounded hover:bg-gray-200" title="Underline">
            <FiUnderline className="w-4 h-4" />
          </button>
          <button onClick={() => formatText('strikeThrough')} className="p-2 rounded hover:bg-gray-200" title="Strikethrough">
            <FiMinus className="w-4 h-4" />
          </button>
          <button onClick={() => formatText('insertHTML', '<code>&nbsp;</code>')} className="p-2 rounded hover:bg-gray-200" title="Code">
            <FiCode className="w-4 h-4" />
          </button>
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <div className="flex items-center gap-1">
          <button onClick={() => formatText('formatBlock', '<h1>')} className="p-2 rounded hover:bg-gray-200" title="Heading 1">
            <FiType className="w-4 h-4" />
          </button>
          <button onClick={() => formatText('formatBlock', '<h2>')} className="p-2 rounded hover:bg-gray-200" title="Heading 2">
            <FiType className="w-4 h-4" />
          </button>
          <button onClick={() => formatText('formatBlock', '<h3>')} className="p-2 rounded hover:bg-gray-200" title="Heading 3">
            <FiType className="w-4 h-4" />
          </button>
        </div>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <div className="flex items-center gap-1">
          <button onClick={() => formatText('insertUnorderedList')} className="p-2 rounded hover:bg-gray-200" title="Bullet List">
            <FiList className="w-4 h-4" />
          </button>
          <button onClick={() => formatText('insertOrderedList')} className="p-2 rounded hover:bg-gray-200" title="Numbered List">
            <FiList className="w-4 h-4" />
          </button>
          <button onClick={() => formatText('formatBlock', '<blockquote>')} className="p-2 rounded hover:bg-gray-200" title="Blockquote">
            <FiMessageSquare className="w-4 h-4" />
          </button>
        </div>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <div className="flex items-center gap-1">
          <button onClick={() => formatText('justifyLeft')} className="p-2 rounded hover:bg-gray-200" title="Align Left">
            <FiAlignLeft className="w-4 h-4" />
          </button>
          <button onClick={() => formatText('justifyCenter')} className="p-2 rounded hover:bg-gray-200" title="Align Center">
            <FiAlignCenter className="w-4 h-4" />
          </button>
          <button onClick={() => formatText('justifyRight')} className="p-2 rounded hover:bg-gray-200" title="Align Right">
            <FiAlignRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Editor Content */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={updateContent}
        onPaste={handlePaste}
        className="min-h-96 p-6 focus:outline-none prose prose-sm max-w-none bg-white leading-relaxed"
        dangerouslySetInnerHTML={{ 
          __html: value || `<p class="text-gray-400 italic">${placeholder}</p>` 
        }}
      />

      {/* Status Bar */}
      <div className="flex justify-between items-center px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
        <div className="flex items-center space-x-4">
          {isCollaborative && onlineUsers.length > 0 && (
            <div className="flex items-center space-x-2">
              <div className="flex -space-x-2">
                {onlineUsers.slice(0, 3).map((user, index) => (
                  <div 
                    key={index} 
                    className="w-5 h-5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium"
                    title={user.user_id || 'Collaborator'}
                  >
                    {user.user_id?.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                ))}
                {onlineUsers.length > 3 && (
                  <div 
                    className="w-5 h-5 bg-gray-400 rounded-full border-2 border-white flex items-center justify-center text-white text-xs"
                    title={`${onlineUsers.length - 3} more collaborators`}
                  >
                    +{onlineUsers.length - 3}
                  </div>
                )}
              </div>
              <span>{onlineUsers.length} online</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {isAILoading && (
            <div className="flex items-center space-x-1 text-blue-600">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              <span>AI Processing...</span>
            </div>
          )}
        </div>
      </div>

      {/* AI Loading Overlay */}
      {isAILoading && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-10 rounded-lg">
          <div className="flex items-center space-x-3 text-blue-600 bg-white px-4 py-3 rounded-lg shadow-lg border border-blue-200">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <div>
              <div className="font-medium text-sm">AI is processing your request</div>
              <div className="text-xs text-blue-500">This may take a few seconds...</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
