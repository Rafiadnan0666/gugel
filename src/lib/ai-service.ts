import { mistralGenerate, mistralIsAvailable } from './ai-providers/mistral-provider';
import { googleAIGenerate, googleAIIsAvailable } from './ai-providers/google-ai-studio';
import { deepSeekGenerate, deepSeekIsAvailable } from './ai-providers/deepseek-provider';
import { openRouterGenerate, openRouterIsAvailable } from './ai-providers/openrouter-provider';
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
  /** When the offline local provider won, WHY the cloud providers failed. */
  fallbackErrors?: string[];
}

export interface ProviderStatus {
  id: ProviderId;
  name: string;
  freeTier: boolean;
  configured: boolean;
  available: boolean | null;
  model: string;
  detail?: string;
}

export interface DiscussAnswer {
  provider: ProviderId;
  model: string;
  text: string;
}

export interface DiscussResult {
  answers: DiscussAnswer[];
  /** True when only one provider answered (the other failed). */
  partial: boolean;
  errors: string[];
}

interface ProviderEntry {
  provider: AIProvider;
  lastError?: string;
  errorCount: number;
  lastSuccessAt?: number;
}

// Free-tier default models (all zero-cost). Overridable via env.
// NOTE (verified Sep 2026): Gemini 2.x/2.5 models are retired for new keys —
// Google's replacement is gemini-3.5-flash-lite. Old OpenRouter :free slugs
// (llama-3.1-8b, mistral-7b, gemma-2-9b) are retired; gemma-4 :free works.
export const FREE_MODELS = {
  gemini: process.env.GEMINI_MODEL_FLASH || 'gemini-3.5-flash-lite',
  googleAiStudio: process.env.GEMINI_MODEL_FLASH || 'gemini-3.5-flash-lite',
  mistral: process.env.MISTRAL_MODEL_SMALL || 'mistral-small-latest',
  deepseek: process.env.DEEPSEEK_MODEL_CHAT || 'deepseek-chat',
  openrouter: process.env.OPENROUTER_MODEL_LLAMA || 'google/gemma-4-26b-a4b-it:free',
} as const;

// Free OpenRouter fallbacks tried in order when the primary fails.
// Spread across different upstream pools (Google, Liquid, NVIDIA, Cohere,
// Thinking Machines) so one busy shared pool doesn't block generation.
const OPENROUTER_FALLBACK_MODELS = [
  process.env.OPENROUTER_MODEL_LLAMA || 'google/gemma-4-26b-a4b-it:free',
  process.env.OPENROUTER_MODEL_MISTRAL || 'google/gemma-4-31b-it:free',
  process.env.OPENROUTER_MODEL_GEMMA || 'liquid/lfm-2.5-2.6b:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'cohere/north-mini-code:free',
  'thinkingmachines/inkling-small:free',
];

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

function looksLikePlaceholder(key: string | undefined): boolean {
  if (!key) return true;
  const v = key.trim();
  return v.length < 8 || /your_.*_here|changeme|example|placeholder/i.test(v);
}

/**
 * Local fallback provider (Gemini Nano concept: on-device / offline).
 * Always available, zero cost, zero network. Produces a clearly-labelled
 * structured draft so the app NEVER returns empty output even when every
 * remote key is missing or invalid. Content is a starting scaffold — the
 * UI marks it as "local draft" so users know to regenerate with a cloud
 * provider once keys are configured.
 */
const localProvider: AIProvider = {
  id: 'local',
  name: 'Local Draft (Gemini Nano-style offline)',
  priority: 99,
  freeTier: true,
  costPer1k: { input: 0, output: 0 },
  generate: async (prompt, opts) => {
    const text = buildLocalDraft(prompt, opts);
    const tokens = Math.ceil((prompt.length + text.length) / 4);
    return {
      text,
      provider: 'local',
      model: 'local-draft-v1',
      usage: { inputTokens: Math.ceil(prompt.length / 4), outputTokens: Math.ceil(text.length / 4), cost: 0 },
    };
  },
  isAvailable: async () => true,
  estimateTokens: (t) => Math.ceil(t.length / 4),
};

function detectSectionKind(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes('abstract')) return 'abstract';
  if (p.includes('introduction')) return 'introduction';
  if (p.includes('literature')) return 'literature review';
  if (p.includes('method')) return 'methodology';
  if (p.includes('result') || p.includes('finding')) return 'results';
  if (p.includes('discussion')) return 'discussion';
  if (p.includes('conclusion')) return 'conclusion';
  if (p.includes('cover page')) return 'cover page';
  if (p.includes('translat')) return 'translation';
  if (p.includes('polish') || p.includes('rewrite')) return 'rewrite';
  if (p.includes('verif') || p.includes('fact-check')) return 'verification';
  if (p.includes('citation') || p.includes('reference')) return 'references';
  if (p.includes('simulation')) return 'simulation';
  if (p.includes('figure') || p.includes('chart') || p.includes('graph')) return 'figure';
  if (p.includes('table')) return 'table';
  return 'section';
}

function extractTopic(prompt: string): string {
  const m = prompt.match(/topic\s*:\s*([^\n]{5,200})/i);
  if (m) return m[1].trim();
  const lines = prompt.split('\n').map((l) => l.trim()).filter(Boolean);
  const cand = lines.find((l) => l.length > 10 && l.length < 200);
  return cand ? cand.slice(0, 200) : 'the research topic';
}

function buildLocalDraft(prompt: string, opts?: GenerateOpts): string {
  const kind = detectSectionKind(prompt);
  const topic = extractTopic(prompt);
  const maxWords = Math.max(120, Math.min(1200, Math.floor((opts?.maxTokens || 1500) / 2)));
  return [
    `[Local offline draft — ${kind}. Both cloud providers are temporarily unreachable (throttled or out of quota). Check live status on the /test-ai page, wait a minute, then regenerate for full AI content.]`,
    '',
    `Topic: ${topic}`,
    '',
    `This is a structured scaffold for the ${kind} section on "${topic}", produced offline without any API call so your workflow is never blocked.`,
    '',
    '1. Background: state the problem, why it matters, and the scope of this study.',
    '2. Evidence: consult peer-reviewed sources (CrossRef, OpenAlex, Semantic Scholar, PubMed, ScienceDirect) and cite them properly — every factual claim needs a verifiable reference with a DOI.',
    '3. Method: describe the research design, data collection, sampling, analysis procedure, validity measures, and ethics approval.',
    '4. Results: report findings objectively with tables/figures, effect sizes, and significance levels before interpreting them.',
    '5. Discussion: interpret results against the literature, acknowledge limitations, and state theoretical and practical implications.',
    `6. Next step: retry generation shortly (the app automatically uses Mistral or OpenRouter when reachable), then run reference verification to confirm every citation exists.`,
    '',
    `(Scaffold length budget: ~${maxWords} words. No references were fabricated in this draft.)`,
  ].join('\n');
}

function createProviders(): AIProvider[] {
  const providers: AIProvider[] = [];

  // Gemini (Google AI Studio direct) — free tier.
  // NOTE: keys come in several valid formats ("AIza..." and others) — never
  // gate on prefix; a live ping decides availability.
  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_STUDIO_API_KEY || '').trim();
  if (!looksLikePlaceholder(geminiKey)) {
    providers.push({
      id: 'gemini',
      name: 'Google Gemini',
      priority: 1,
      freeTier: true,
      costPer1k: { input: 0, output: 0 },
      generate: async (prompt, opts) => {
        const model = opts?.model || FREE_MODELS.gemini;
        const fullPrompt = opts?.systemPrompt ? `${opts.systemPrompt}\n\n${prompt}` : prompt;
        const result = await googleAIGenerate(
          { apiKey: geminiKey },
          fullPrompt,
          { model, maxTokens: opts?.maxTokens, temperature: opts?.temperature }
        );
        if (!result.text?.trim()) throw new Error('Gemini returned empty response');
        return { text: result.text, provider: 'gemini', model, usage: { ...result.usage, cost: 0 } };
      },
      isAvailable: async () => googleAIIsAvailable(geminiKey),
      estimateTokens: (t) => Math.ceil(t.length / 4),
    });
  }

  // Google AI Studio (explicit separate key)
  const googleKey = (process.env.GOOGLE_AI_STUDIO_API_KEY || '').trim();
  if (!looksLikePlaceholder(googleKey) && googleKey !== geminiKey) {
    providers.push({
      id: 'google-ai-studio',
      name: 'Google AI Studio',
      priority: 2,
      freeTier: true,
      costPer1k: { input: 0, output: 0 },
      generate: async (prompt, opts) => {
        const model = opts?.model || FREE_MODELS.googleAiStudio;
        const fullPrompt = opts?.systemPrompt ? `${opts.systemPrompt}\n\n${prompt}` : prompt;
        const result = await googleAIGenerate(
          { apiKey: googleKey },
          fullPrompt,
          { model, maxTokens: opts?.maxTokens, temperature: opts?.temperature }
        );
        if (!result.text?.trim()) throw new Error('Google AI Studio returned empty response');
        return { text: result.text, provider: 'google-ai-studio', model, usage: { ...result.usage, cost: 0 } };
      },
      isAvailable: async () => googleAIIsAvailable(googleKey),
      estimateTokens: (t) => Math.ceil(t.length / 4),
    });
  }

  // Mistral — free tier
  const mistralKey = (process.env.MISTRAL_API_KEY || '').trim();
  if (!looksLikePlaceholder(mistralKey)) {
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
        const model = opts?.model || FREE_MODELS.mistral;
        const result = await mistralGenerate(
          { apiKey: mistralKey },
          messages,
          { model, maxTokens: opts?.maxTokens, temperature: opts?.temperature }
        );
        if (!result.text?.trim()) throw new Error('Mistral returned empty response');
        return { text: result.text, provider: 'mistral', model, usage: { ...result.usage, cost: 0 } };
      },
      isAvailable: async () => mistralIsAvailable(mistralKey),
      estimateTokens: (t) => Math.ceil(t.length / 4),
    });
  }

  // DeepSeek — free tier
  const deepseekKey = (process.env.DEEPSEEK_API_KEY || '').trim();
  if (!looksLikePlaceholder(deepseekKey)) {
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
        const model = opts?.model || FREE_MODELS.deepseek;
        const result = await deepSeekGenerate(
          { apiKey: deepseekKey },
          messages,
          { model, maxTokens: opts?.maxTokens, temperature: opts?.temperature }
        );
        if (!result.text?.trim()) throw new Error('DeepSeek returned empty response');
        return { text: result.text, provider: 'deepseek', model, usage: { ...result.usage, cost: 0 } };
      },
      isAvailable: async () => deepSeekIsAvailable(deepseekKey),
      estimateTokens: (t) => Math.ceil(t.length / 4),
    });
  }

  // OpenRouter — free models only, tries several :free models in order
  const openrouterKey = (process.env.OPENROUTER_API_KEY || '').trim();
  if (!looksLikePlaceholder(openrouterKey)) {
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
        const candidates = opts?.model ? [opts.model] : OPENROUTER_FALLBACK_MODELS;
        const errors: string[] = [];
        for (const model of candidates) {
          try {
            const result = await openRouterGenerate(
              { apiKey: openrouterKey },
              messages,
              { model, maxTokens: opts?.maxTokens, temperature: opts?.temperature }
            );
            if (!result.text?.trim()) throw new Error('empty response');
            return { text: result.text, provider: 'openrouter', model, usage: { ...result.usage, cost: 0 } };
          } catch (e: any) {
            errors.push(`${model}: ${e.message}`);
          }
        }
        throw new Error(`OpenRouter all free models failed: ${errors.join(' | ')}`);
      },
      isAvailable: async () => openRouterIsAvailable(openrouterKey),
      estimateTokens: (t) => Math.ceil(t.length / 4),
    });
  }

  // Local offline fallback is ALWAYS registered so generation never hard-fails.
  providers.push(localProvider);

  return providers.sort((a, b) => a.priority - b.priority);
}

class MultiProviderAIService {
  private providers: AIProvider[] = [];
  private providerMap = new Map<ProviderId, ProviderEntry>();
  private statusCache: { at: number; value: ProviderStatus[] } | null = null;

  private async ensureProviders() {
    if (this.providers.length === 0) {
      this.providers = createProviders();
      for (const p of this.providers) {
        this.providerMap.set(p.id, { provider: p, errorCount: 0 });
      }
    }
  }

  /** For tests: force re-reading env vars. */
  resetForTests() {
    this.providers = [];
    this.providerMap.clear();
    this.statusCache = null;
    rateLimiter.clear();
  }

  /** True when at least one remote (non-local) provider has a real key. */
  async isRemoteConfigured(): Promise<boolean> {
    await this.ensureProviders();
    return this.providers.some((p) => p.id !== 'local');
  }

  /** Fast status for UI/diagnostics. Live pings are cached 60s and parallel. */
  async getProviderStatus(): Promise<ProviderStatus[]> {
    await this.ensureProviders();
    const now = Date.now();
    if (this.statusCache && now - this.statusCache.at < 60_000) return this.statusCache.value;

    const modelFor = (id: ProviderId): string => {
      switch (id) {
        case 'gemini': return FREE_MODELS.gemini;
        case 'google-ai-studio': return FREE_MODELS.googleAiStudio;
        case 'mistral': return FREE_MODELS.mistral;
        case 'deepseek': return FREE_MODELS.deepseek;
        case 'openrouter': return FREE_MODELS.openrouter;
        case 'local': return 'local-draft-v1';
      }
    };

    const checks = this.providers.map(async (p): Promise<ProviderStatus> => {
      const configured = p.id === 'local' ? true : true; // present in list => key present
      let available: boolean | null = null;
      let detail: string | undefined;
      try {
        const withTimeout = Promise.race([
          p.isAvailable(),
          new Promise<boolean>((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000)),
        ]);
        available = await withTimeout;
        if (!available && p.id !== 'local') detail = 'Key present but provider unreachable — check key, quota, or network.';
      } catch (e: any) {
        available = p.id === 'local' ? true : false;
        detail = e.message;
      }
      return { id: p.id, name: p.name, freeTier: p.freeTier, configured, available, model: modelFor(p.id), detail };
    });

    const value = await Promise.all(checks);
    this.statusCache = { at: now, value };
    return value;
  }

  async getAvailableProviders(): Promise<{ id: ProviderId; name: string; freeTier: boolean }[]> {
    const status = await this.getProviderStatus();
    return status.filter((s) => s.available).map((s) => ({ id: s.id, name: s.name, freeTier: s.freeTier }));
  }

  async generate(
    prompt: string,
    opts: GenerateOpts = {}
  ): Promise<GenerateResult> {
    await this.ensureProviders();
    if (this.providers.length === 0) {
      throw new Error('No AI providers configured. Add a free API key (Mistral or OpenRouter) in .env.local');
    }

    const cleanPrompt = (prompt || '').trim();
    if (!cleanPrompt) throw new Error('Prompt is empty');

    const remoteErrors: string[] = [];

    // If preferred provider specified and available, use it first
    if (opts.preferredProvider) {
      const preferred = this.providerMap.get(opts.preferredProvider);
      if (preferred) {
        try {
          const result = await this.tryProvider(preferred.provider, cleanPrompt, opts);
          return result;
        } catch (e: any) {
          remoteErrors.push(`${preferred.provider.id}: ${e.message}`);
          /* fall through to cascade */
        }
      }
    }

    // Cascade through providers (remote first, local last)
    for (const entry of this.providerMap.values()) {
      if (entry.provider.id !== 'local' && !checkRateLimit(entry.provider.id)) continue;
      // Skip already-preferred (already tried)
      if (opts.preferredProvider && entry.provider.id === opts.preferredProvider) continue;
      try {
        const result = await this.tryProvider(entry.provider, cleanPrompt, opts);
        // Offline fallback won: attach WHY the clouds failed so the UI can
        // tell the user (throttled? quota? key?) instead of silent scaffold.
        if (result.provider === 'local' && remoteErrors.length > 0) {
          return { ...result, fallbackErrors: [...remoteErrors] };
        }
        return result;
      } catch (e: any) {
        const msg = `${entry.provider.id}: ${e.message}`;
        remoteErrors.push(msg);
        entry.errorCount++;
        entry.lastError = e.message;
      }
    }

    throw new Error(`All AI providers failed:\n${remoteErrors.join('\n')}`);
  }

  private async tryProvider(provider: AIProvider, prompt: string, opts: GenerateOpts): Promise<GenerateResult> {
    const result = await provider.generate(prompt, {
      model: opts.model,
      maxTokens: opts.maxTokens,
      temperature: opts.temperature,
      systemPrompt: opts.systemPrompt,
    });

    if (!result.text?.trim()) throw new Error(`${provider.id} returned empty response`);

    consumeTokens(provider.id, result.usage.inputTokens + result.usage.outputTokens);

    // Log usage if userId provided (non-critical, never blocks generation)
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

  /**
   * Multi-AI discussion: ask the top-2 configured cloud providers the same
   * prompt IN PARALLEL and return both labeled answers (Mistral + OpenRouter
   * today; automatically follows config if providers are added/removed).
   * Small per-provider budgets keep it cheap. Throws only when BOTH fail —
   * callers can then fall back to generate() (cascade + offline local).
   */
  async discuss(
    prompt: string,
    opts: Omit<GenerateOpts, 'preferredProvider'> & { maxTokens?: number } = {}
  ): Promise<DiscussResult> {
    await this.ensureProviders();
    const cleanPrompt = (prompt || '').trim();
    if (!cleanPrompt) throw new Error('Prompt is empty');

    const remotes = this.providers.filter((p) => p.id !== 'local').slice(0, 2);
    if (remotes.length === 0) throw new Error('No cloud AI providers configured');

    const maxTokens = Math.min(opts.maxTokens || 800, 1500);
    const settled = await Promise.allSettled(
      remotes.map((p) =>
        this.tryProvider(p, cleanPrompt, {
          model: undefined,
          maxTokens,
          temperature: opts.temperature ?? 0.7,
          systemPrompt: opts.systemPrompt,
          userId: opts.userId,
          sessionId: opts.sessionId,
        })
      )
    );

    const answers: DiscussAnswer[] = [];
    const errors: string[] = [];
    settled.forEach((s, i) => {
      if (s.status === 'fulfilled' && s.value.text?.trim()) {
        answers.push({ provider: remotes[i].id, model: s.value.model, text: s.value.text.trim() });
      } else {
        const reason = s.status === 'rejected' ? (s.reason?.message || String(s.reason)) : 'empty response';
        errors.push(`${remotes[i].id}: ${reason}`);
        const entry = this.providerMap.get(remotes[i].id);
        if (entry) {
          entry.errorCount++;
          entry.lastError = reason;
        }
      }
    });

    if (answers.length === 0) {
      throw new Error(`Both AI providers failed:\n${errors.join('\n')}`);
    }

    return { answers, partial: answers.length < remotes.length, errors };
  }
}

export const aiService = new MultiProviderAIService();
export default aiService;
