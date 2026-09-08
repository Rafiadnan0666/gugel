import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ResearchPaperEngine, type PaperConfig } from '@/lib/research-paper-engine';
import { validatePaperConfig, sanitizeInput, checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limiter';

export async function POST(request: Request) {
  // Rate limit
  const rl = checkRateLimit('ai-paper', RATE_LIMITS['ai-paper']);
  if (!rl.allowed) return createRateLimitResponse(rl.resetAt, RATE_LIMITS['ai-paper'].message || 'Rate limit exceeded');

  const body = await request.json();
  const config: PaperConfig = {
    topic: sanitizeInput(body.topic || ''),
    discipline: sanitizeInput(body.discipline || ''),
    citationStyle: body.citationStyle || 'APA',
    language: body.language || 'en',
    pageCount: Math.min(100, Math.max(1, body.pageCount || 10)),
    includeGraphs: body.includeGraphs !== false,
    includeSimulations: body.includeSimulations === true,
    customInstructions: body.customInstructions ? sanitizeInput(body.customInstructions) : undefined,
  };

  const validation = validatePaperConfig(config);
  if (!validation.valid) {
    return NextResponse.json({ error: 'Invalid configuration', errors: validation.errors }, { status: 400 });
  }

  // Auth
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

  try {
    const engine = new ResearchPaperEngine(user.id);

    // Set up progress tracking
    let lastProgress = '';
    engine.setProgressCallback((section, progress, status) => {
      lastProgress = JSON.stringify({ section, progress, status });
    });

    const paper = await engine.generatePaper(config);
    const stats = engine.getStats();

    // Save paper to database
    try {
      await supabase.from('generated_papers').insert({
        user_id: user.id,
        paper_id: paper.id,
        topic: config.topic,
        discipline: config.discipline,
        config: config,
        status: paper.status,
        total_word_count: paper.totalWordCount,
        sections_count: paper.sections.filter(s => s.content).length,
        references_count: paper.references.length,
        tokens_used: stats.totalTokens,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to save paper to DB:', e);
    }

    return NextResponse.json({
      success: true,
      paper,
      stats: {
        totalTokens: stats.totalTokens,
        completedTasks: stats.completedTasks,
        totalWordCount: paper.totalWordCount,
        sectionsGenerated: paper.sections.filter(s => s.content).length,
        referencesFound: paper.references.length,
      },
    });
  } catch (error: any) {
    console.error('Paper generation error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to generate paper',
    }, { status: 500 });
  }
}
