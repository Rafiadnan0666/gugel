import { useEffect, useState } from 'react';
import type { ITab, IDraft } from '@/types/main.db';

export const useAIService = () => {
  const [aiSession, setAiSession] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<'loading' | 'ready' | 'error' | 'unavailable'>('loading');

  useEffect(() => {
    const initializeAI = async () => {
      if (!(window as any).LanguageModel) {
        console.error("LanguageModel API not found. Please use a compatible browser and enable the required flags.");
        setAiStatus('unavailable');
        return;
      }

      try {
        const opts = {
          expectedOutputs: [{ type: "text", languages: ["en"] }]
        };

        const availability = await (window as any).LanguageModel.availability(opts);
        if (availability === "unavailable") {
          console.error("The on-device model is not available. Please check your browser settings.");
          setAiStatus('unavailable');
          return;
        }

        const session = await (window as any).LanguageModel.create(opts);
        setAiSession(session);
        setAiStatus('ready');
      } catch (err) {
        console.error("Error initializing AI session:", err);
        setAiStatus('error');
      }
    };

    initializeAI();
  }, []);

  const promptAI = async (prompt: string) => {
    if (aiStatus !== 'ready' || !aiSession) {
      console.log("AI session not ready");
      return "AI not available. Please use a compatible browser and enable the required flags.";
    }

    try {
      const result = await aiSession.prompt(prompt);
      return result;
    } catch (error) {
      console.error("Error prompting AI:", error);
      return "Error from AI";
    }
  };

  const generateSummary = async (content: string, type: 'tab' | 'draft') => {
    const prompt = `Provide a concise summary of the following ${type} content:

"""${content.substring(0, 4000)}"""`;
    return await promptAI(prompt);
  };

  const rewriteContent = async (content: string, style: string) => {
    const prompt = `Rewrite the following content in a ${style} style:

"""${content.substring(0, 4000)}"""`;
    return await promptAI(prompt);
  };

  const translateContent = async (content: string, language: string) => {
    const prompt = `Translate the following content to ${language}:

"""${content.substring(0, 4000)}"""`;
    return await promptAI(prompt);
  };

  const expandContent = async (content: string) => {
    const prompt = `Expand the following content:

"""${content.substring(0, 4000)}"""`;
    return await promptAI(prompt);
  };

  const summarizeUrl = async (url: string) => {
    const prompt = `Summarize the content of the following URL:

${url}`;
    return await promptAI(prompt);
  };

  const chatWithAI = async (message: string, context: { tabs: ITab[], drafts: IDraft[] }) => {
    const contextSummary = `The user has ${context.tabs.length} research tabs and ${context.drafts.length} drafts.`;
    const prompt = `${contextSummary}

User's question: ${message}`;
    return await promptAI(prompt);
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
