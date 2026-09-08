import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { translateSection, translateFullPaper, rewriteInLanguage, type SupportedLanguage } from '@/lib/translation-service';
import { sanitizeInput, checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limiter';

export async function POST(request: Request) {
  const rl = checkRateLimit('ai-generate', RATE_LIMITS['ai-generate']);
  if (!rl.allowed) return createRateLimitResponse(rl.resetAt, RATE_LIMITS['ai-generate'].message || 'Rate limit exceeded');

  const body = await request.json();
  const { content, sections, targetLanguage, sourceLanguage, mode, style } = body;

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
    const srcLang = (sourceLanguage || 'en') as SupportedLanguage;
    const tgtLang = (targetLanguage || 'en') as SupportedLanguage;

    if (mode === 'full-paper' && sections) {
      const result = await translateFullPaper(
        { sections, references: body.references || [] },
        { sourceLanguage: srcLang, targetLanguage: tgtLang, preserveFormatting: true, academicTerminology: true }
      );
      return NextResponse.json({ success: true, ...result });
    }

    if (mode === 'rewrite' && content) {
      const result = await rewriteInLanguage(sanitizeInput(content), tgtLang, (style as any) || 'academic');
      return NextResponse.json({ success: true, content: result });
    }

    // Single section translation
    if (content) {
      const result = await translateSection(sanitizeInput(content), {
        sourceLanguage: srcLang,
        targetLanguage: tgtLang,
        preserveFormatting: true,
        academicTerminology: true,
      });
      return NextResponse.json({ success: true, content: result });
    }

    return NextResponse.json({ error: 'Content or sections required' }, { status: 400 });
  } catch (error: any) {
    console.error('Translation error:', error);
    return NextResponse.json({ error: error.message || 'Translation failed' }, { status: 500 });
  }
}
