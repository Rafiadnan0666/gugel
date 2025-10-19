'use client';

import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import { FiCpu } from 'react-icons/fi';

interface AIResponseProps {
  content: string;
}

function isPromise<T>(p: any): p is Promise<T> {
  return p !== null && typeof p === 'object' && typeof p.then === 'function';
}

const AIResponse: React.FC<AIResponseProps> = ({ content }) => {
  const [parsedContent, setParsedContent] = useState<string>('');

  useEffect(() => {
    const result = marked.parse(content);

    if (isPromise<string>(result)) {
      result
        .then(res => setParsedContent(res))
        .catch(err => {
          console.error('Failed to parse markdown:', err);
          setParsedContent('');
        });
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setParsedContent(result as string);
    }
  }, [content]);

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <FiCpu className="w-6 h-6 text-blue-500" />
        </div>
        <div className="ml-3 flex-1">
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: parsedContent }}
          />
        </div>
      </div>
    </div>
  );
};

export default AIResponse;