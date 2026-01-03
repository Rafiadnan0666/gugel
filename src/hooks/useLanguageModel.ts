import { useState, useEffect, useCallback } from 'react';

interface LanguageModelOptions {
  expectedOutputs: Array<{ type: string; languages: string[] }>;
}

interface LanguageModelSession {
  prompt: (text: string) => Promise<string>;
  destroy?: () => void;
}

interface LanguageModelStatic {
  availability: (opts: LanguageModelOptions) => Promise<string>;
  create: (opts: LanguageModelOptions & { monitor?: (m: any) => void }) => Promise<LanguageModelSession>;
}

declare global {
  interface Window {
    LanguageModelAPI?: LanguageModelStatic;
  }
}

interface UseLanguageModelResult {
  session: LanguageModelSession | null;
  error: string | null;
  isLoading: boolean;
  isAvailable: boolean;
  prompt: (text: string) => Promise<string>;
  reset: () => void;
}

const useLanguageModel = (): UseLanguageModelResult => {
  const [session, setSession] = useState<LanguageModelSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  const initialize = useCallback(async () => {
    if (session) return;
    
    setIsLoading(true);
    setError(null);

    try {
if (!window.LanguageModelAPI) {
        setError('LanguageModel API is not available');
        return;
      }

      const opts = {
        expectedOutputs: [{ type: 'text', languages: ['en'] }]
      };

      const availability = await window.LanguageModelAPI.availability(opts);
      console.log('LanguageModel availability:', availability);

      if (availability === 'unavailable') {
        setError('LanguageModel is unavailable');
        setIsAvailable(false);
        return;
      }

      const newSession = await window.LanguageModelAPI.create({
        ...opts,
        monitor(m: any) {
          m.addEventListener('downloadprogress', (e: any) => {
            console.log(`LanguageModel download progress: ${(e.loaded * 100).toFixed(1)}%`);
          });
          m.addEventListener('statechange', (e: any) => {
            console.log('LanguageModel state change:', e.target.state);
          });
        }
      });

      console.log('LanguageModel session ready:', newSession);
      setSession(newSession);
      setIsAvailable(true);
      setError(null);

    } catch (err: any) {
      const errorMessage = err.message || 'Failed to initialize LanguageModel';
      setError(errorMessage);
      setIsAvailable(false);
      console.error('LanguageModel initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    initialize();

    return () => {
      if (session && session.destroy) {
        session.destroy();
      }
    };
  }, []);

  const prompt = useCallback(async (text: string): Promise<string> => {
    if (!session) {
      throw new Error('Session is not initialized');
    }

    try {
      const result = await session.prompt(text);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Prompt failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [session]);

  const reset = useCallback(() => {
    if (session && session.destroy) {
      session.destroy();
    }
    setSession(null);
    setError(null);
    setIsAvailable(false);
  }, [session]);

  return {
    session,
    error,
    isLoading,
    isAvailable,
    prompt,
    reset
  };
};

export default useLanguageModel;