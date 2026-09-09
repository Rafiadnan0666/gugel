import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse, sanitizeInput } from '@/lib/rate-limiter';

const VALID_STYLES = ['academic', 'formal', 'simple', 'technical', 'concise'] as const;

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    content,
    style,
    context = {},
    preserveCitations = true,
    improveStructure = true,
  } = body;

  if (!content || typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }
  if (!style || typeof style !== 'string') {
    return NextResponse.json({ error: 'Style is required' }, { status: 400 });
  }
  if (content.length > 20000) {
    return NextResponse.json({ error: 'Content too long (max 20,000 characters)' }, { status: 400 });
  }

  // Auth first so rate limiting is per-user.
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

  const cleanContent = sanitizeInput(content);
  const cleanStyle = (VALID_STYLES as readonly string[]).includes(style) ? style : 'academic';

  const prompt = `You are an expert academic and professional writer. Rewrite the following content in a ${cleanStyle} style while following specific requirements:

CONTEXT:
${context.researchTopic ? `Research Topic: ${sanitizeInput(String(context.researchTopic)).substring(0, 500)}` : ''}
${context.targetAudience ? `Target Audience: ${sanitizeInput(String(context.targetAudience)).substring(0, 200)}` : ''}
${Array.isArray(context.writingGoals) && context.writingGoals.length ? `Writing Goals: ${context.writingGoals.map((g: unknown) => sanitizeInput(String(g)).substring(0, 100)).join(', ')}` : ''}

REQUIREMENTS:
- ${preserveCitations ? 'Preserve all citations, references, and source attribution exactly as written' : 'Citations may be modified for clarity'}
- ${improveStructure ? 'Improve sentence structure, flow, and organization while maintaining original meaning' : 'Maintain original structure exactly'}
- Maintain academic integrity - no plagiarism
- Keep approximately the same length (+/- 20%)
- Ensure all key information, arguments, and evidence are retained
- Use appropriate terminology for the ${cleanStyle} style
- Maintain consistent tone throughout

ORIGINAL CONTENT:
"""${cleanContent}"""

Rewrite the content now. Return ONLY the rewritten text, no commentary.`;

  try {
    // Use the multi-provider free-tier service (Gemini / Mistral / DeepSeek /
    // OpenRouter with local offline fallback) instead of paid-only APIs.
    const { aiService } = await import('@/lib/ai-service');
    const result = await aiService.generate(prompt, {
      preferredProvider: 'mistral',
      maxTokens: 4000,
      temperature: 0.7,
      userId: user.id,
    });

    const rewrittenContent = result.text.trim();
    const words = rewrittenContent.split(/\s+/).filter(Boolean);
    const sentences = rewrittenContent.split(/[.!?]+/).filter(s => s.trim());

    return NextResponse.json({
      success: true,
      data: {
        rewrittenContent,
        provider: result.provider,
        model: result.model,
        qualityMetrics: {
          readingLevel: 'medium',
          wordCount: words.length,
          sentenceCount: sentences.length,
          avgSentenceLength: sentences.length > 0 ? Math.round(words.length / sentences.length) : 0,
        },
      },
    });
  } catch (error) {
    console.error('Contextual rewriting error:', error);
    return NextResponse.json({
      error: 'Rewriting failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
