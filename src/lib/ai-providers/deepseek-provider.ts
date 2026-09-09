export interface DeepSeekConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekResponse {
  id: string;
  choices: { index: number; message: { role: string; content: string }; finish_reason: string }[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';

export async function deepSeekGenerate(
  config: DeepSeekConfig,
  messages: DeepSeekMessage[],
  options: { model?: string; maxTokens?: number; temperature?: number } = {}
): Promise<{ text: string; usage: { inputTokens: number; outputTokens: number } }> {
  const model = options.model || 'deepseek-chat';
  const maxTokens = options.maxTokens || 4096;
  const temperature = options.temperature ?? 0.7;

  let res: Response;
  try {
    res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
      signal: AbortSignal.timeout(25000),
    });
  } catch (e: any) {
    throw new Error(`DeepSeek network error: ${e.message}.`);
  }

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 401) throw new Error('DeepSeek auth error (401): invalid API key. Get one at https://platform.deepseek.com/');
    if (res.status === 429) throw new Error('DeepSeek rate limit exceeded. Try another provider.');
    throw new Error(`DeepSeek API error (${res.status}): ${err}`);
  }

  const data: DeepSeekResponse = await res.json();
  const text = data.choices[0]?.message?.content || '';
  return { text, usage: { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens } };
}

export async function deepSeekIsAvailable(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${DEEPSEEK_BASE}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    return res.ok;
  } catch { return false; }
}
