const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  maxTokens?: number;
  message?: string;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'ai-generate': { windowMs: 60_000, maxRequests: 20, maxTokens: 100_000, message: 'AI generation rate limit exceeded' },
  'ai-paper': { windowMs: 300_000, maxRequests: 5, message: 'Paper generation rate limit exceeded' },
  'export': { windowMs: 60_000, maxRequests: 10, message: 'Export rate limit exceeded' },
  'api-general': { windowMs: 60_000, maxRequests: 100, message: 'API rate limit exceeded' },
  'auth': { windowMs: 900_000, maxRequests: 20, message: 'Too many auth attempts' },
  'scrape': { windowMs: 60_000, maxRequests: 15, message: 'Scraping rate limit exceeded' },
};

export function checkRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const storeKey = key;
  const entry = rateLimitStore.get(storeKey);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(storeKey, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

export function createRateLimitResponse(resetAt: number, message: string) {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({ error: message, retryAfter }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': String(resetAt),
      },
    }
  );
}

// Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .substring(0, 50_000);
}

// CSRF token generation
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// Validate email
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validate paper config
export function validatePaperConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.topic || typeof config.topic !== 'string' || config.topic.trim().length < 5) {
    errors.push('Topic must be at least 5 characters');
  }
  if (config.topic && config.topic.length > 500) {
    errors.push('Topic must be under 500 characters');
  }
  if (!config.discipline || typeof config.discipline !== 'string') {
    errors.push('Discipline is required');
  }
  if (!['APA', 'MLA', 'IEEE', 'Chicago', 'Harvard', 'Vancouver'].includes(config.citationStyle)) {
    errors.push('Invalid citation style');
  }
  if (!['en', 'es', 'fr', 'de', 'zh', 'ja', 'pt', 'ar', 'hi', 'id'].includes(config.language)) {
    errors.push('Invalid language');
  }
  if (config.pageCount && (config.pageCount < 1 || config.pageCount > 100)) {
    errors.push('Page count must be between 1 and 100');
  }

  return { valid: errors.length === 0, errors };
}
