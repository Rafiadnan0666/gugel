import { useState, useEffect } from 'react';

declare global {
  interface Window {
    ai: any;
  }
}

const useChromeAI = () => {
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        if (!window.ai) {
          setError("Chrome AI API is not available.");
          return;
        }

        const availability = await window.ai.canCreateTextSession();
        if (availability !== "readily") {
          setError("Chrome AI is not readily available.");
          return;
        }

        const newSession = await window.ai.createTextSession();
        setSession(newSession);
      } catch (err) {
        setError(err.message);
      }
    };

    initialize();

    return () => {
      if (session) {
        session.destroy();
      }
    };
  }, []);

  const prompt = async (text: string) => {
    if (!session) {
      setError("Session is not initialized.");
      return;
    }

    try {
      const result = await session.prompt(text);
      return result;
    } catch (err) {
      setError(err.message);
    }
  };

  return { session, error, prompt };
};

export default useChromeAI;
