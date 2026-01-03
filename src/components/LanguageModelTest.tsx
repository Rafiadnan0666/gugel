'use client';

import React, { useState } from 'react';
import { FiZap, FiInfo, FiLoader, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import useLanguageModel from '@/hooks/useLanguageModel';

const LanguageModelTest: React.FC = () => {
  const { session, error, isLoading, isAvailable, prompt, reset } = useLanguageModel();
  const [testResult, setTestResult] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);

  const runTest = async () => {
    setIsTesting(true);
    setTestResult('');
    
    try {
      const result = await prompt('What is the capital of France? Give a brief answer.');
      setTestResult(result);
    } catch (err) {
      setTestResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">LanguageModel Test</h2>
        <div className="flex items-center space-x-2">
          {isLoading && (
            <div className="flex items-center text-blue-600 text-sm">
              <FiLoader className="w-4 h-4 mr-2 animate-spin" />
              Initializing...
            </div>
          )}
          {isAvailable && !isLoading && (
            <div className="flex items-center text-green-600 text-sm">
              <FiCheckCircle className="w-4 h-4 mr-2" />
              Available
            </div>
          )}
          {!isAvailable && !isLoading && (
            <div className="flex items-center text-red-600 text-sm">
              <FiXCircle className="w-4 h-4 mr-2" />
              Unavailable
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <div className="flex items-center">
            <FiXCircle className="w-5 h-5 mr-2" />
            <span className="font-medium">Error:</span>
            <span className="ml-2">{error}</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2 flex items-center">
            <FiInfo className="w-4 h-4 mr-2 text-blue-600" />
            LanguageModel API Status
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Session:</span>
              <span className={session ? 'text-green-600' : 'text-gray-500'}>
                {session ? 'Active' : 'Not Active'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Local AI:</span>
              <span className={isAvailable ? 'text-green-600' : 'text-red-600'}>
                {isAvailable ? 'Ready' : 'Not Available'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="text-gray-900">
                {isLoading ? 'Loading...' : isAvailable ? 'Ready' : error ? 'Error' : 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={runTest}
          disabled={!isAvailable || isTesting}
          className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center transition-colors"
        >
          {isTesting ? (
            <>
              <FiLoader className="w-4 h-4 mr-2 animate-spin" />
              Testing LanguageModel...
            </>
          ) : (
            <>
              <FiZap className="w-4 h-4 mr-2" />
              Run Test Prompt
            </>
          )}
        </button>

        {testResult && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Test Result:</h4>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{testResult}</p>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            This tests the LanguageModel API with a simple prompt.
          </div>
          <button
            onClick={reset}
            className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Reset Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default LanguageModelTest;