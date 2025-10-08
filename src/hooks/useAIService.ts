import { useState } from 'react';
import type { ITab, IDraft } from '@/types/main.db';

export const useAIService = () => {
  const [aiStatus, setAiStatus] = useState<'loading' | 'ready' | 'error'>('ready');

  const promptAI = async (prompt: string, task: string, context?: any) => {
    setAiStatus('loading');
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, task, context }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'AI request failed');
      }

      const data = await response.json();
      setAiStatus('ready');
      return data.result;
    } catch (error) {
      console.error(`Error in AI task '${task}':`, error);
      setAiStatus('error');
      return "An error occurred while processing your request.";
    }
  };

  const generateSummary = async (content: string, type: 'tab' | 'draft') => {
    const prompt = `Provide a concise summary of the following ${type} content:\n\n"""${content.substring(0, 8000)}"""`;
    return await promptAI(prompt, 'summarize');
  };

  const rewriteContent = async (content: string, style: string) => {
    const prompt = `Rewrite the following content in a ${style} style:\n\n"""${content.substring(0, 8000)}"""`;
    return await promptAI(prompt, 'rewrite');
  };

  const translateContent = async (content: string, language: string) => {
    const prompt = `Translate the following content to ${language}:\n\n"""${content.substring(0, 8000)}"""`;
    return await promptAI(prompt, 'translate');
  };

  const expandContent = async (content: string) => {
    const prompt = `Expand the following content:\n\n"""${content.substring(0, 8000)}"""`;
    return await promptAI(prompt, 'expand');
  };

  const summarizeUrl = async (url: string) => {
    return await promptAI(url, 'summarize-url');
  };

  const chatWithAI = async (message: string, context: { tabs: ITab[], drafts: IDraft[] }) => {
    const contextSummary = `The user has ${context.tabs.length} research tabs and ${context.drafts.length} drafts.`;
    const prompt = `${contextSummary}\n\nUser's question: ${message}`;
    return await promptAI(prompt, 'chat', context);
  };

  return {
    aiStatus,
    generateSummary,
    rewriteContent,
    translateContent,
    expandContent,
    summarizeUrl,
    chatWithAI,
  };
};

