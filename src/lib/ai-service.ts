import { mistralGenerate, mistralIsAvailable, type MistralConfig } from './ai-providers/mistral-provider';
import { googleAIGenerate, googleAIIsAvailable, type GoogleAIConfig } from './ai-providers/google-ai-studio';
import { deepSeekGenerate, deepSeekIsAvailable, type DeepSeekConfig } from './ai-providers/deepseek-provider';
import { openRouterGenerate, openRouterIsAvailable, type OpenRouterConfig } from './ai-providers/openrouter-provider';
import { usageTracking } from './usage-tracking';

export type ProviderId = 'gemini' | 'google-ai-studio' | 'mistral' | 'deepseek' | 'openrouter' | 'local';

export interface AIProvider {
  readonly id: ProviderId;
  readonly name: string;
  readonly priority: number;
  readonly freeTier: boolean;
  readonly costPer1k: { input: number; output: number };
  generate(prompt: string, opts?: GenerateOpts): Promise<GenerateResult>;
  isAvailable(): Promise<boolean>;
  estimateTokens(text: string): number;
}

export interface GenerateOpts {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  preferredProvider?: ProviderId;
  userId?: string;
  sessionId?: string;
}

export interface GenerateResult {
  text: string;
  provider: ProviderId;
  model: string;
  usage: { inputTokens: number; outputTokens: number; cost: number };
}

interface ProviderEntry {
  provider: AIProvider;
  lastError?: string;
  errorCount: number;
  lastSuccessAt?: number;
}

// Rate limiter per provider
const rateLimiter = new Map<ProviderId, { tokens: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_TOKENS = 50_000;

function checkRateLimit(id: ProviderId): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(id);
  if (!entry || now > entry.resetAt) {
    rateLimiter.set(id, { tokens: 0, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.tokens >= RATE_LIMIT_TOKENS) return false;
  return true;
}

function consumeTokens(id: ProviderId, tokens: number) {
  const entry = rateLimiter.get(id);
  if (entry) entry.tokens += tokens;
}

function createProviders(): AIProvider[] {
  const providers: AIProvider[] = [];

  // Gemini (Google AI Studio direct)
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY;
  if (geminiKey) {
    providers.push({
      id: 'gemini',
      name: 'Google Gemini',
      priority: 1,
      freeTier: true,
      costPer1k: { input: 0, output: 0 },
      generate: async (prompt, opts) => {
        const result = await googleAIGenerate(
          { apiKey: geminiKey },
          prompt,
          { model: opts?.model || 'gemini-1.5-flash', maxTokens: opts?.maxTokens, temperature: opts?.temperature }
        );
        return {
          text: result.text,
          provider: 'gemini',
          model: opts?.model || 'gemini-1.5-flash',
          usage: { ...result.usage, cost: 0 },
        };
      },
      isAvailable: async () => googleAIIsAvailable(geminiKey),
      estimateTokens: (t) => Math.ceil(t.length / 4),
    });
  }

  // Google AI Studio (explicit key)
  const googleKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
  if (googleKey && googleKey !== geminiKey) {
    providers.push({
      id: 'google-ai-studio',
      name: 'Google AI Studio',
      priority: 2,
      freeTier: true,
      costPer1k: { input: 0, output: 0 },
      generate: async (prompt, opts) => {
        const result = await googleAIGenerate(
          { apiKey: googleKey },
          prompt,
          { model: opts?.model || 'gemini-1.5-flash', maxTokens: opts?.maxTokens, temperature: opts?.temperature }
        );
        return {
          text: result.text,
          provider: 'google-ai-studio',
          model: opts?.model || 'gemini-1.5-flash',
          usage: { ...result.usage, cost: 0 },
        };
      },
      isAvailable: async () => googleAIIsAvailable(googleKey),
      estimateTokens: (t) => Math.ceil(t.length / 4),
    });
  }

  // Mistral
  const mistralKey = process.env.MISTRAL_API_KEY;
  if (mistralKey) {
    providers.push({
      id: 'mistral',
      name: 'Mistral AI',
      priority: 3,
      freeTier: true,
      costPer1k: { input: 0, output: 0 },
      generate: async (prompt, opts) => {
        const messages: { role: 'system' | 'user'; content: string }[] = [];
        if (opts?.systemPrompt) messages.push({ role: 'system', content: opts.systemPrompt });
        messages.push({ role: 'user', content: prompt });
        const result = await mistralGenerate(
          { apiKey: mistralKey },
          messages,
          { model: opts?.model || 'mistral-small-latest', maxTokens: opts?.maxTokens, temperature: opts?.temperature }
        );
        return {
          text: result.text,
          provider: 'mistral',
          model: opts?.model || 'mistral-small-latest',
          usage: { ...result.usage, cost: 0 },
        };
      },
      isAvailable: async () => mistralIsAvailable(mistralKey),
      estimateTokens: (t) => Math.ceil(t.length / 4),
    });
  }

  // DeepSeek
  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  if (deepseekKey) {
    providers.push({
      id: 'deepseek',
      name: 'DeepSeek',
      priority: 4,
      freeTier: true,
      costPer1k: { input: 0, output: 0 },
      generate: async (prompt, opts) => {
        const messages: { role: 'system' | 'user'; content: string }[] = [];
        if (opts?.systemPrompt) messages.push({ role: 'system', content: opts.systemPrompt });
        messages.push({ role: 'user', content: prompt });
        const result = await deepSeekGenerate(
          { apiKey: deepseekKey },
          messages,
          { model: opts?.model || 'deepseek-chat', maxTokens: opts?.maxTokens, temperature: opts?.temperature }
        );
        return {
          text: result.text,
          provider: 'deepseek',
          model: opts?.model || 'deepseek-chat',
          usage: { ...result.usage, cost: 0 },
        };
      },
      isAvailable: async () => deepSeekIsAvailable(deepseekKey),
      estimateTokens: (t) => Math.ceil(t.length / 4),
    });
  }

  // OpenRouter (fallback, accesses many free models)
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey) {
    providers.push({
      id: 'openrouter',
      name: 'OpenRouter',
      priority: 5,
      freeTier: true,
      costPer1k: { input: 0, output: 0 },
      generate: async (prompt, opts) => {
        const messages: { role: 'system' | 'user'; content: string }[] = [];
        if (opts?.systemPrompt) messages.push({ role: 'system', content: opts.systemPrompt });
        messages.push({ role: 'user', content: prompt });
        const result = await openRouterGenerate(
          { apiKey: openrouterKey },
          messages,
          { model: opts?.model || 'meta-llama/llama-3.1-8b-instruct:free', maxTokens: opts?.maxTokens, temperature: opts?.temperature }
        );
        return {
          text: result.text,
          provider: 'openrouter',
          model: opts?.model || 'meta-llama/llama-3.1-8b-instruct:free',
          usage: { ...result.usage, cost: 0 },
        };
      },
      isAvailable: async () => openRouterIsAvailable(openrouterKey),
      estimateTokens: (t) => Math.ceil(t.length / 4),
    });
  }

  return providers.sort((a, b) => a.priority - b.priority);
}

class MultiProviderAIService {
  private providers: AIProvider[] = [];
  private providerMap = new Map<ProviderId, ProviderEntry>();

  private async ensureProviders() {
    if (this.providers.length === 0) {
      this.providers = createProviders();
      for (const p of this.providers) {
        this.providerMap.set(p.id, { provider: p, errorCount: 0 });
      }
    }
  }

  async getAvailableProviders(): Promise<{ id: ProviderId; name: string; freeTier: boolean }[]> {
    await this.ensureProviders();
    const available: { id: ProviderId; name: string; freeTier: boolean }[] = [];
    for (const p of this.providers) {
      try {
        if (await p.isAvailable()) {
          available.push({ id: p.id, name: p.name, freeTier: p.freeTier });
        }
      } catch { /* skip */ }
    }
    return available;
  }

  async generate(
    prompt: string,
    opts: GenerateOpts = {}
  ): Promise<GenerateResult> {
    await this.ensureProviders();
    if (this.providers.length === 0) {
      throw new Error('No AI providers configured. Please add API keys in .env.local');
    }

    // If preferred provider specified and available, use it first
    if (opts.preferredProvider) {
      const preferred = this.providerMap.get(opts.preferredProvider);
      if (preferred) {
        try {
          const result = await this.tryProvider(preferred.provider, prompt, opts);
          return result;
        } catch { /* fall through to cascade */ }
      }
    }

    // Cascade through providers
    const errors: string[] = [];
    for (const entry of this.providerMap.values()) {
      if (!checkRateLimit(entry.provider.id)) continue;
      try {
        const result = await this.tryProvider(entry.provider, prompt, opts);
        return result;
      } catch (e: any) {
        errors.push(`${entry.provider.id}: ${e.message}`);
        entry.errorCount++;
        entry.lastError = e.message;
      }
    }

    throw new Error(`All AI providers failed:\n${errors.join('\n')}`);
  }

  private async tryProvider(provider: AIProvider, prompt: string, opts: GenerateOpts): Promise<GenerateResult> {
    const result = await provider.generate(prompt, {
      model: opts.model,
      maxTokens: opts.maxTokens,
      temperature: opts.temperature,
      systemPrompt: opts.systemPrompt,
    });

    consumeTokens(provider.id, result.usage.inputTokens + result.usage.outputTokens);

    // Log usage if userId provided
    if (opts.userId) {
      try {
        await usageTracking.logUsage(
          opts.userId,
          provider.id,
          result.model,
          opts.sessionId || null,
          result.usage.inputTokens,
          result.usage.outputTokens,
          result.usage.cost
        );
      } catch { /* non-critical */ }
    }

    const entry = this.providerMap.get(provider.id);
    if (entry) {
      entry.errorCount = 0;
      entry.lastSuccessAt = Date.now();
    }

    return result;
  }

  async generateWithFallback(
    prompt: string,
    opts: GenerateOpts & { userId?: string; sessionId?: string } = {}
  ): Promise<GenerateResult> {
    return this.generate(prompt, opts);
  }
}

export const aiService = new MultiProviderAIService();
export default aiService;
