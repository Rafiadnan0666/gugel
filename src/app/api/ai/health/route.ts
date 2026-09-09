import { NextResponse } from 'next/server';
import { isCreditsEnabled } from '@/lib/usage-tracking';

/**
 * GET /api/ai/health — provider diagnostics.
 * Returns configured models and live reachability WITHOUT leaking keys.
 * Auth-optional: works logged-out so setup issues can be diagnosed.
 */
export async function GET() {
  try {
    const { aiService } = await import('@/lib/ai-service');
    const [status, remoteConfigured] = await Promise.all([
      aiService.getProviderStatus(),
      aiService.isRemoteConfigured(),
    ]);

    const reachable = status.filter((s) => s.available).map((s) => s.id);
    const healthy = reachable.length > 0; // local fallback always counts

    return NextResponse.json({
      healthy,
      remoteConfigured,
      creditsEnabled: isCreditsEnabled(),
      reachable,
      providers: status.map((s) => ({
        id: s.id,
        name: s.name,
        freeTier: s.freeTier,
        configured: s.configured,
        available: s.available,
        model: s.model,
        ...(s.detail ? { detail: s.detail } : {}),
      })),
      hint: remoteConfigured
        ? (reachable.some((r) => r !== 'local')
            ? 'At least one cloud provider is reachable.'
            : 'Keys are set but no cloud provider is reachable — check key validity, quota, and network. The offline local draft provider will be used as fallback.')
        : 'No cloud API keys configured. Add a free key to .env.local (GEMINI_API_KEY, MISTRAL_API_KEY, DEEPSEEK_API_KEY, or OPENROUTER_API_KEY). The offline local draft provider works without keys.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { healthy: false, error: error.message || 'Health check failed' },
      { status: 500 }
    );
  }
}
