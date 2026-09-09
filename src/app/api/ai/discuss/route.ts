import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse, sanitizeInput } from '@/lib/rate-limiter';

/**
 * POST /api/ai/discuss — multi-AI discussion.
 * Asks the top-2 configured cloud providers (Mistral + OpenRouter) the same
 * prompt in parallel and returns both labeled answers. Throws 502 only when
 * both fail; otherwise returns whatever answered with partial:true.
 */
export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawPrompt = typeof body.prompt === 'string' ? body.prompt : '';
  const prompt = sanitizeInput(rawPrompt);
  if (!prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }
  const maxTokens =
    typeof body.maxTokens === 'number'
      ? Math.max(100, Math.min(1500, Math.floor(body.maxTokens)))
      : 800;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = checkRateLimit(`ai-generate:${user.id}`, RATE_LIMITS['ai-generate']);
  if (!rl.allowed) return createRateLimitResponse(rl.resetAt, RATE_LIMITS['ai-generate'].message || 'Rate limit exceeded');

  try {
    const { aiService } = await import('@/lib/ai-service');
    const result = await aiService.discuss(prompt, { maxTokens, userId: user.id });
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('AI discuss error:', error);
    return NextResponse.json(
      { error: error.message || 'Both AI providers failed' },
      { status: 502 }
    );
  }
}
