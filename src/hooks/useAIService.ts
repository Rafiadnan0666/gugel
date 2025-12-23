import { useState, useEffect } from 'react';
import type { ITab, IDraft } from '@/types/main.db';
import { tabSummarizer } from '@/lib/tab-summarizer';

export const useAIService = () => {
  const [aiStatus, setAiStatus] = useState<'loading' | 'ready' | 'error' | 'unavailable'>('loading');
  const [isLocalAIReady, setIsLocalAIReady] = useState(false);

  useEffect(() => {
    const initializeAI = async () => {
      try {
        const isAvailable = await tabSummarizer.checkAvailability();
        if (isAvailable) {
          setIsLocalAIReady(true);
          setAiStatus('ready');
        } else {
          setAiStatus('unavailable');
        }
      } catch (error) {
        console.error('Failed to initialize AI service:', error);
        setAiStatus('error');
      }
    };

    initializeAI();
  }, []);

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
      setAiStatus(isLocalAIReady ? 'ready' : 'unavailable');
      return data.result;
    } catch (error) {
      console.error(`Error in AI task '${task}':`, error);
      setAiStatus('error');
      return "An error occurred while processing your request.";
    }
  };

  const generateSummary = async (content: string, type: 'tab' | 'draft') => {
    if (isLocalAIReady) {
      try {
        setAiStatus('loading');
        const summary = await tabSummarizer.summarizeContent(content, type);
        setAiStatus('ready');
        return summary;
      } catch (error) {
        console.error('Local AI summarization failed, falling back to server:', error);
        // Fallback to server-side AI
        const prompt = `Provide a concise summary of the following ${type} content:\n\n"""${content.substring(0, 8000)}"""`;
        return await promptAI(prompt, 'summarize');
      }
    } else {
      // Use server-side AI
      const prompt = `Provide a concise summary of the following ${type} content:\n\n"""${content.substring(0, 8000)}"""`;
      return await promptAI(prompt, 'summarize');
    }
  };

  const processTabsSummary = async (tabs: Array<{ id: string; title: string; content?: string; url?: string }>) => {
    if (isLocalAIReady) {
      try {
        setAiStatus('loading');
        const results = await tabSummarizer.processTabsContent(tabs);
        setAiStatus('ready');
        return results;
      } catch (error) {
        console.error('Local AI tab processing failed:', error);
        throw error;
      }
    } else {
      throw new Error('Local AI not available');
    }
  };

  const rewriteContent = async (content: string, style: string) => {
    if (isLocalAIReady) {
      try {
        setAiStatus('loading');
        const result = await tabSummarizer.rewriteContent(content, style);
        setAiStatus('ready');
        return result;
      } catch (error) {
        console.error('Local AI rewrite failed, falling back to server:', error);
        const prompt = `Rewrite the following content in a ${style} style:\n\n"""${content.substring(0, 8000)}"""`;
        return await promptAI(prompt, 'rewrite');
      }
    } else {
      const prompt = `Rewrite the following content in a ${style} style:\n\n"""${content.substring(0, 8000)}"""`;
      return await promptAI(prompt, 'rewrite');
    }
  };

  const translateContent = async (content: string, language: string) => {
    // Always use server-side for translation as it's more specialized
    const prompt = `Translate the following content to ${language}:\n\n"""${content.substring(0, 8000)}"""`;
    return await promptAI(prompt, 'translate');
  };

  const expandContent = async (content: string) => {
    if (isLocalAIReady) {
      try {
        setAiStatus('loading');
        const result = await tabSummarizer.expandContent(content);
        setAiStatus('ready');
        return result;
      } catch (error) {
        console.error('Local AI expand failed, falling back to server:', error);
        const prompt = `Expand the following content:\n\n"""${content.substring(0, 8000)}"""`;
        return await promptAI(prompt, 'expand');
      }
    } else {
      const prompt = `Expand the following content:\n\n"""${content.substring(0, 8000)}"""`;
      return await promptAI(prompt, 'expand');
    }
  };

  const summarizeUrl = async (url: string) => {
    return await promptAI(url, 'summarize-url');
  };

  const summarizeUrlWithLocalAI = async (url: string, scrapedContent: string) => {
    if (isLocalAIReady) {
      try {
        setAiStatus('loading');
        const summary = await tabSummarizer.summarizeUrlContent(url, scrapedContent);
        setAiStatus('ready');
        return summary;
      } catch (error) {
        console.error('Local AI URL summarization failed:', error);
        throw error;
      }
    } else {
      throw new Error('Local AI not available');
    }
  };

  const chatWithAI = async (message: string, context: { tabs: ITab[], drafts: IDraft[] }) => {
    const contextSummary = `The user has ${context.tabs.length} research tabs and ${context.drafts.length} drafts.`;
    const prompt = `${contextSummary}\n\nUser's question: ${message}`;
    return await promptAI(prompt, 'chat', context);
  };

  return {
    aiStatus,
    isLocalAIReady,
    generateSummary,
    processTabsSummary,
    rewriteContent,
    translateContent,
    expandContent,
    summarizeUrl,
    summarizeUrlWithLocalAI,
    chatWithAI,
  };
};

