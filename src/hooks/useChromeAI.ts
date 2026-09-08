import { useState, useEffect, useCallback } from 'react';

interface LanguageModelOptions {
  expectedOutputs: Array<{ type: string; languages: string[] }>;
}

interface LanguageModelSession {
  prompt: (text: string) => Promise<string>;
  destroy?: () => void;
}

declare global {
  var LanguageModel: {
    availability: (opts: LanguageModelOptions) => Promise<string>;
    create: (opts: LanguageModelOptions & { monitor?: (m: any) => void }) => Promise<LanguageModelSession>;
  } | undefined;
}

interface UseChromeAIResult {
  session: LanguageModelSession | null;
  error: string | null;
  isLoading: boolean;
  isAvailable: boolean;
  prompt: (text: string) => Promise<string | undefined>;
}

const useChromeAI = (): UseChromeAIResult => {
  const [session, setSession] = useState<LanguageModelSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        if (typeof LanguageModel === 'undefined') {
          setError('LanguageModel API is not available in this browser.');
          setIsLoading(false);
          return;
        }

        const opts: LanguageModelOptions = {
          expectedOutputs: [{ type: 'text', languages: ['en'] }]
        };

        const availability = await LanguageModel.availability(opts);
        if (availability === 'unavailable') {
          setError('LanguageModel is unavailable.');
          setIsLoading(false);
          return;
        }

        const newSession = await LanguageModel.create({
          ...opts,
          monitor(m: any) {
            m.addEventListener('downloadprogress', (e: any) => {
              console.log(`Download progress: ${(e.loaded * 100).toFixed(1)}%`);
            });
            m.addEventListener('statechange', (e: any) => {
              console.log('State change:', e.target.state);
            });
          }
        });

        setSession(newSession);
        setIsAvailable(true);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to initialize LanguageModel');
      } finally {
        setIsLoading(false);
      }
    };

    initialize();

    return () => {
      if (session && session.destroy) {
        session.destroy();
      }
    };
  }, []);

  const prompt = useCallback(async (text: string): Promise<string | undefined> => {
    if (!session) {
      setError('Session is not initialized.');
      return undefined;
    }

    try {
      const result = await session.prompt(text);
      return result;
    } catch (err: any) {
      setError(err.message || 'Prompt failed');
      return undefined;
    }
  }, [session]);

  return { session, error, isLoading, isAvailable, prompt };
};

export default useChromeAI;
