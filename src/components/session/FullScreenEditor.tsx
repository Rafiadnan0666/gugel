'use client';

import React from 'react';
import { FiX, FiSave } from 'react-icons/fi';
import { ProEditor } from '@/components/editor/ProEditor';

// Full Screen Editor Modal
const FullScreenEditor: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onAIAction: (action: string, content: string) => Promise<string>;
  title?: string;
}> = ({ isOpen, onClose, value, onChange, onSave, onAIAction, title = "Advanced Editor" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={onSave}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center transition-colors"
          >
            <FiSave className="w-4 h-4 mr-2" />
            Save Draft
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <ProEditor
          content={value}
          onChange={onChange}


        />
      </div>
    </div>
  );
};

export default FullScreenEditor;
