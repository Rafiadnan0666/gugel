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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function retryAfterMs(body: string): number {
  try {
    const parsed = JSON.parse(body);
    const secs = parsed?.error?.metadata?.retry_after_seconds
      ?? parsed?.error?.retry_after_seconds;
    if (typeof secs === 'number' && secs > 0) return Math.min(secs * 1000, 6000);
  } catch { /* ignore */ }
  return 2000;
}

export async function openRouterGenerate(
  config: OpenRouterConfig,
  messages: OpenRouterMessage[],
  options: { model?: string; maxTokens?: number; temperature?: number } = {}
): Promise<{ text: string; usage: { inputTokens: number; outputTokens: number } }> {
  const model = options.model || 'google/gemma-4-26b-a4b-it:free';
  const maxTokens = options.maxTokens || 4096;
  const temperature = options.temperature ?? 0.7;

  let res: Response | null = null;
  let lastErr = '';
  // Free shared pools throttle under load — retry briefly before giving up
  // so transient 429s don't immediately fail the whole cascade.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Eyaya Research Platform',
        },
        body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
        signal: AbortSignal.timeout(30000),
      });
    } catch (e: any) {
      throw new Error(`OpenRouter network error: ${e.message}.`);
    }

    if (res.ok) break;

    lastErr = await res.text();
    if (res.status === 401) throw new Error('OpenRouter auth error (401): invalid API key. Get a free key at https://openrouter.ai/keys');
    if (res.status === 429 && attempt === 0) {
      await sleep(retryAfterMs(lastErr));
      res = null;
      continue;
    }
    if (res.status === 429) throw new Error(`OpenRouter rate limit exceeded (free shared pool busy). ${summarizeUpstream(lastErr)} Try another provider or wait a minute.`);
    throw new Error(`OpenRouter API error (${res.status}): ${lastErr}`);
  }

  if (!res) throw new Error('OpenRouter request failed unexpectedly.');
  const data: OpenRouterResponse = await res.json();
  const text = data.choices[0]?.message?.content || '';
  return { text, usage: { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens } };
}

function summarizeUpstream(body: string): string {
  try {
    const parsed = JSON.parse(body);
    const raw = parsed?.error?.metadata?.raw;
    if (typeof raw === 'string' && raw) return raw.substring(0, 160);
  } catch { /* ignore */ }
  return '';
}

export async function openRouterIsAvailable(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${OPENROUTER_BASE}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    return res.ok;
  } catch { return false; }
}
