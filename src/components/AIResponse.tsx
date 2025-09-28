'use client';

import React from 'react';
import { marked } from 'marked';
import { FiCpu } from 'react-icons/fi';
import CodeBlockWrapper from './session/CodeBlockWrapper';

interface AIResponseProps {
  content: string;
}

const AIResponse: React.FC<AIResponseProps> = ({ content }) => {
  const parsedContent = marked.parse(content);

  const parts = parsedContent.split(/(<pre>[\s\S]*?<\/pre>)/g);

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <FiCpu className="w-6 h-6 text-blue-500" />
        </div>
        <div className="ml-3 flex-1">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {parts.map((part, index) => {
              if (part.startsWith('<pre>')) {
                return (
                  <CodeBlockWrapper key={index}>
                    <div dangerouslySetInnerHTML={{ __html: part }} />
                  </CodeBlockWrapper>
                );
              }
              return <div key={index} dangerouslySetInnerHTML={{ __html: part }} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIResponse;
