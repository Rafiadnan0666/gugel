'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FiCopy, FiCheck } from 'react-icons/fi';

interface CodeBlockWrapperProps {
  children: React.ReactNode;
}

const CodeBlockWrapper: React.FC<CodeBlockWrapperProps> = ({ children }) => {
  const [isCopied, setIsCopied] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  const handleCopy = () => {
    if (preRef.current) {
      navigator.clipboard.writeText(preRef.current.innerText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="relative">
      <pre ref={preRef}>{children}</pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1 bg-gray-700 rounded-md text-white hover:bg-gray-600"
      >
        {isCopied ? <FiCheck /> : <FiCopy />}
      </button>
    </div>
  );
};

export default CodeBlockWrapper;