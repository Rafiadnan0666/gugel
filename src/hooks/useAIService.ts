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

  const analyzeUrlWithAI = async (url: string) => {
    try {
      const response = await fetch('/api/url/analyze-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'URL analysis failed');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Enhanced URL analysis error:', error);
      throw error;
    }
  };

  const rewriteContentWithContext = async (
    content: string, 
    style: string,
    context?: {
      researchTopic?: string;
      targetAudience?: string;
      existingSources?: any[];
      writingGoals?: string[];
      preserveCitations?: boolean;
      improveStructure?: boolean;
    }
  ) => {
    const prompt = `Rewrite the following content in a ${style} style while preserving the core meaning and structure.

${context?.researchTopic ? `Research Topic: ${context.researchTopic}` : ''}
${context?.targetAudience ? `Target Audience: ${context.targetAudience}` : ''}
${context?.writingGoals?.length ? `Writing Goals: ${context.writingGoals.join(', ')}` : ''}

Requirements:
- ${context?.preserveCitations !== false ? 'Preserve all citations and references' : 'Citations can be modified for clarity'}
- ${context?.improveStructure !== false ? 'Improve sentence structure and flow' : 'Maintain original structure'}
- Maintain academic integrity and avoid plagiarism
- Keep the same approximate length
- Ensure all key points are retained

Content to rewrite:
"""${content}"""

Please provide:
1. The rewritten content
2. A summary of improvements made
3. Quality metrics (clarity, coherence, academic tone)
4. Any recommendations for further improvement`;

    return await promptAI(prompt, 'rewrite-contextual', { context });
  };

  const assessContentQuality = async (content: string) => {
    const prompt = `Analyze the following content for quality and provide detailed metrics:

Content:
"""${content}"""

Please assess and provide:
1. Overall quality score (0-100)
2. Clarity score (0-100)
3. Coherence score (0-100)
4. Academic tone score (0-100)
5. Grammar and syntax issues
6. Structural improvements needed
7. Suggestions for enhancement
8. Reading difficulty level
9. Factual accuracy indicators

Provide the analysis in a structured JSON format.`;

    return await promptAI(prompt, 'assess-quality');
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
    rewriteContentWithContext,
    assessContentQuality,
    translateContent,
    expandContent,
    summarizeUrl,
    summarizeUrlWithLocalAI,
    analyzeUrlWithAI,
    chatWithAI,
  };
};

