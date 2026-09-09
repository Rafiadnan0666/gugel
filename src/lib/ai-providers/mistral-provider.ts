export interface MistralConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface MistralMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MistralResponse {
  id: string;
  object: string;
  choices: { index: number; message: { role: string; content: string }; finish_reason: string }[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

const MISTRAL_BASE = 'https://api.mistral.ai/v1';

export async function mistralGenerate(
  config: MistralConfig,
  messages: MistralMessage[],
  options: { model?: string; maxTokens?: number; temperature?: number } = {}
): Promise<{ text: string; usage: { inputTokens: number; outputTokens: number } }> {
  const model = options.model || 'mistral-small-latest';
  const maxTokens = options.maxTokens || 4096;
  const temperature = options.temperature ?? 0.7;

  let res: Response | null = null;
  let lastErr = '';
  // Single retry on 429: trial accounts are often per-minute throttled.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await fetch(`${MISTRAL_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
        signal: AbortSignal.timeout(25000),
      });
    } catch (e: any) {
      throw new Error(`Mistral network error: ${e.message}.`);
    }

    if (res.ok) break;

    lastErr = await res.text();
    if (res.status === 401) throw new Error('Mistral auth error (401): invalid API key. Get a free key at https://console.mistral.ai/');
    if (res.status === 429 && attempt === 0) {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      res = null;
      continue;
    }
    if (res.status === 429) throw new Error('Mistral rate limit exceeded (trial quota may be spent — check https://console.mistral.ai/). Try another provider.');
    throw new Error(`Mistral API error (${res.status}): ${lastErr}`);
  }

  if (!res) throw new Error('Mistral request failed unexpectedly.');
  const data: MistralResponse = await res.json();
  const text = data.choices[0]?.message?.content || '';
  return { text, usage: { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens } };
}

export async function mistralIsAvailable(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${MISTRAL_BASE}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    return res.ok;
  } catch { return false; }
}
