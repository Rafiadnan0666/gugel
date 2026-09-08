import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { generatePDFHTML, type PDFOptions } from '@/lib/pdf-generator';
import type { GeneratedPaper } from '@/lib/research-paper-engine';
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limiter';

export async function POST(request: Request) {
  const rl = checkRateLimit('export', RATE_LIMITS['export']);
  if (!rl.allowed) return createRateLimitResponse(rl.resetAt, RATE_LIMITS['export'].message || 'Rate limit exceeded');

  const body = await request.json();
  const { paper, options } = body;

  if (!paper || !paper.sections) {
    return NextResponse.json({ error: 'Paper data is required' }, { status: 400 });
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
    const pdfOptions: Partial<PDFOptions> = {
      pageSize: options?.pageSize || 'a4',
      fontSize: options?.fontSize || 12,
      lineSpacing: options?.lineSpacing || 1.5,
      includeCoverPage: options?.includeCoverPage !== false,
      includeTableOfContents: options?.includeTableOfContents !== false,
      includePageNumbers: options?.includePageNumbers !== false,
      includeHeader: options?.includeHeader !== false,
      watermark: options?.watermark || undefined,
      font: options?.font || 'Times New Roman',
    };

    const html = generatePDFHTML(paper as GeneratedPaper, pdfOptions);

    // Log export
    try {
      await supabase.from('paper_exports').insert({
        user_id: user.id,
        paper_id: paper.id,
        format: 'pdf',
        options: pdfOptions,
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to log export:', e);
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${(paper.coverPage?.title || 'research-paper').replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50)}.html"`,
      },
    });
  } catch (error: any) {
    console.error('PDF export error:', error);
    return NextResponse.json({
      error: error.message || 'Export failed',
    }, { status: 500 });
  }
}
