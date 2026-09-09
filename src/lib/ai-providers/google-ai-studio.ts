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
  const model = options.model || 'gemini-2.0-flash';
  const maxTokens = options.maxTokens || 4096;
  const temperature = options.temperature ?? 0.7;

  let res: Response;
  try {
    res = await fetch(
      `${GOOGLE_AI_BASE}/models/${model}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature },
        }),
        signal: AbortSignal.timeout(25000),
      }
    );
  } catch (e: any) {
    throw new Error(`Google AI Studio network error: ${e.message}. Check connectivity and that "${model}" is a valid free model.`);
  }

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 400) throw new Error(`Google AI Studio error (400): ${err}. Common causes: invalid key (must start with "AIza", get one free at https://aistudio.google.com/apikey) or unknown model "${model}".`);
    if (res.status === 403 || res.status === 401) throw new Error(`Google AI Studio auth error (${res.status}): invalid or restricted key.`);
    if (res.status === 429) throw new Error('Google AI Studio quota exceeded (free tier limit). Try another provider.');
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
