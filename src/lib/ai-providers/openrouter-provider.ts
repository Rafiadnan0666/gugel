export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterResponse {
  id: string;
  choices: { index: number; message: { role: string; content: string }; finish_reason: string }[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

export async function openRouterGenerate(
  config: OpenRouterConfig,
  messages: OpenRouterMessage[],
  options: { model?: string; maxTokens?: number; temperature?: number } = {}
): Promise<{ text: string; usage: { inputTokens: number; outputTokens: number } }> {
  const model = options.model || 'meta-llama/llama-3.1-8b-instruct:free';
  const maxTokens = options.maxTokens || 4096;
  const temperature = options.temperature ?? 0.7;

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Eyaya Research Platform',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter API error (${res.status}): ${err}`);
  }

  const data: OpenRouterResponse = await res.json();
  const text = data.choices[0]?.message?.content || '';
  return { text, usage: { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens } };
}

export async function openRouterIsAvailable(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${OPENROUTER_BASE}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    return res.ok;
  } catch { return false; }
}
