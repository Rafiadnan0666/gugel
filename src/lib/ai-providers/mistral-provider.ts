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

  let res: Response;
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

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 401) throw new Error('Mistral auth error (401): invalid API key. Get a free key at https://console.mistral.ai/');
    if (res.status === 429) throw new Error('Mistral rate limit exceeded. Try another provider.');
    throw new Error(`Mistral API error (${res.status}): ${err}`);
  }

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
