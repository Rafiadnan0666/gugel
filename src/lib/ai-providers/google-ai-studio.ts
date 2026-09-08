export interface GoogleAIConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface GoogleAIMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface GoogleAIResponse {
  candidates: { content: { parts: { text: string }[]; role: string }; finishReason: string }[];
  usageMetadata: { promptTokenCount: number; candidatesTokenCount: number; totalTokenCount: number };
}

const GOOGLE_AI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export async function googleAIGenerate(
  config: GoogleAIConfig,
  prompt: string,
  options: { model?: string; maxTokens?: number; temperature?: number } = {}
): Promise<{ text: string; usage: { inputTokens: number; outputTokens: number } }> {
  const model = options.model || 'gemini-1.5-flash';
  const maxTokens = options.maxTokens || 4096;
  const temperature = options.temperature ?? 0.7;

  const res = await fetch(
    `${GOOGLE_AI_BASE}/models/${model}:generateContent?key=${config.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google AI Studio error (${res.status}): ${err}`);
  }

  const data: GoogleAIResponse = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return {
    text,
    usage: {
      inputTokens: data.usageMetadata?.promptTokenCount || 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
    },
  };
}

export async function googleAIIsAvailable(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${GOOGLE_AI_BASE}/models?key=${apiKey}`);
    return res.ok;
  } catch { return false; }
}
