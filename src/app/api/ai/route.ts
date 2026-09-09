import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { WebScraper } from '@/lib/web-scraper';
import { aiService } from '@/lib/ai-service';
import { usageTracking } from '@/lib/usage-tracking';
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse, sanitizeInput } from '@/lib/rate-limiter';

const webScraper = new WebScraper();

// Attach which provider answered (and, for offline drafts, WHY the clouds
// failed) so every UI can show it instead of a silent scaffold.
function providerInfo(aiResult: {
  provider: string;
  model: string;
  fallbackErrors?: string[];
}): Record<string, unknown> {
  if (aiResult.provider === 'local') {
    return {
      provider: aiResult.provider,
      model: aiResult.model,
      note: 'Offline draft — cloud providers temporarily unreachable. Wait a minute and retry.',
      reasons: aiResult.fallbackErrors || [],
    };
  }
  return { provider: aiResult.provider, model: aiResult.model };
}

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { prompt: rawPrompt, task } = body;
  const prompt = typeof rawPrompt === 'string' ? sanitizeInput(rawPrompt) : '';

  if (!prompt || !task) {
    return NextResponse.json({ error: 'prompt and task are required' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = checkRateLimit(`ai-generate:${user.id}`, RATE_LIMITS['ai-generate']);
  if (!rl.allowed) return createRateLimitResponse(rl.resetAt, RATE_LIMITS['ai-generate'].message || 'Rate limit exceeded');

  try {
    // Check quota before processing
    const quotaCheck = await usageTracking.checkQuota(user.id, 1000);
    if (!quotaCheck.allowed) {
      return NextResponse.json({
        error: quotaCheck.warningMessage || 'Quota exceeded',
        remainingTokens: quotaCheck.remainingTokens,
      }, { status: 429 });
    }

    let result;

    if (task === 'summarize-url') {
      const scrapingReport = await webScraper.scrapeWebsite(prompt);
      if (!scrapingReport.success || !scrapingReport.content) {
        return NextResponse.json({
          error: 'Failed to fetch content from URL',
          details: scrapingReport.errors,
        }, { status: 500 });
      }

      const aiResult = await aiService.generate(
        `Provide a comprehensive summary of the following content. Highlight key points, main arguments, and important details:\n\n${scrapingReport.content.content.substring(0, 8000)}`,
        { maxTokens: 800, userId: user.id }
      );

      return NextResponse.json({
        result: aiResult.text,
        title: scrapingReport.content.title,
        metadata: scrapingReport.content.metadata,
        summary: scrapingReport.summary,
        url: scrapingReport.content.url,
        usage: aiResult.usage,
        ...providerInfo(aiResult),
      });

    } else if (task === 'analyze-url') {
      const scrapingReport = await webScraper.scrapeWebsite(prompt);
      if (!scrapingReport.success) {
        return NextResponse.json({
          error: 'Failed to analyze URL',
          details: scrapingReport.errors,
        }, { status: 500 });
      }

      const enhancedAnalysis = await webScraper.analyzeURLWithAI(prompt, scrapingReport.content!);

      return NextResponse.json({
        report: scrapingReport,
        analysis: enhancedAnalysis,
      });

    } else if (task === 'chat') {
      const aiResult = await aiService.generate(
        prompt,
        { maxTokens: 1000, userId: user.id }
      );

      return NextResponse.json({
        result: aiResult.text,
        usage: aiResult.usage,
        ...providerInfo(aiResult),
      });

    } else if (task === 'enhance-content') {
      const aiResult = await aiService.generate(
        prompt,
        { maxTokens: 1500, userId: user.id }
      );

      return NextResponse.json({
        result: aiResult.text,
        usage: aiResult.usage,
        ...providerInfo(aiResult),
      });

    } else {
      // Generic AI task
      const aiResult = await aiService.generate(
        prompt,
        { maxTokens: 1000, userId: user.id }
      );

      return NextResponse.json({
        result: aiResult.text,
        usage: aiResult.usage,
        ...providerInfo(aiResult),
      });
    }

  } catch (error) {
    console.error('Error processing AI request:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to process AI request',
    }, { status: 500 });
  }
}
