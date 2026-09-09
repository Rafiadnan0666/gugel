import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { WebScraper } from '@/lib/web-scraper';
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse, sanitizeInput } from '@/lib/rate-limiter';

const webScraper = new WebScraper();

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { url, task, options = {} } = body;

  if (!url || !task) {
    return NextResponse.json({ error: 'url and task are required' }, { status: 400 });
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
    let result;

    switch (task) {
      case 'analyze-link':
        result = await analyzeLink(url, user.id);
        break;

      case 'summarize-content':
        const { content } = options;
        if (!content) {
          return NextResponse.json({ error: 'content is required for summarization' }, { status: 400 });
        }
        result = await summarizeWithAI(url, sanitizeInput(String(content)).substring(0, 8000), user.id);
        break;

      case 'extract-insights':
        const { content: insightContent } = options;
        if (!insightContent) {
          return NextResponse.json({ error: 'content is required for insight extraction' }, { status: 400 });
        }
        result = await extractInsights(url, sanitizeInput(String(insightContent)).substring(0, 8000), user.id);
        break;

      case 'enhance-content':
        const { content: enhanceContent, style = 'academic' } = options;
        if (!enhanceContent) {
          return NextResponse.json({ error: 'content is required for enhancement' }, { status: 400 });
        }
        result = await enhanceContentWithAI(sanitizeInput(String(enhanceContent)).substring(0, 8000), sanitizeInput(String(style)).substring(0, 50), user.id);
        break;

      case 'comprehensive-analysis':
        result = await comprehensiveAnalysis(url, user.id);
        break;
        
      default:
        return NextResponse.json({ error: 'Invalid task specified' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    console.error('Error in AI analysis:', error);
    return NextResponse.json({ 
      error: 'Failed to process AI analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function analyzeLink(url: string, userId?: string) {
  try {
    // First scrape the URL to get content
    const scrapingReport = await webScraper.scrapeWebsite(url);

    if (!scrapingReport.success || !scrapingReport.content) {
      throw new Error('Failed to scrape URL content');
    }

    const content = scrapingReport.content;

    // Cloud AI cascade (Mistral/OpenRouter/local) — the browser-only
    // Nano service can never run on the server, so always use aiService.
    try {
      const { aiService } = await import('@/lib/ai-service');
      const aiResult = await aiService.generate(
        `Analyze this web content and provide a structured analysis:\n\nURL: ${url}\nContent: ${content.content.substring(0, 8000)}\n\nProvide:\n1. A concise title (if not clear from content)\n2. A brief summary (2-3 sentences)\n3. 3-5 key points or insights\n\nFormat:\nTitle: [title]\nSummary: [summary]\nKey Points:\n- [point 1]\n- [point 2]\n- [point 3]`,
        { maxTokens: 1000, temperature: 0.5, userId }
      );
      const parsed = parseStructuredAnalysis(aiResult.text);
      return {
        title: parsed.title || content.title,
        summary: parsed.summary,
        keyPoints: parsed.keyPoints,
        url: content.url,
        metadata: content.metadata,
        scrapedAt: new Date().toISOString(),
        aiEnhanced: true,
        provider: aiResult.provider,
      };
    } catch (aiError) {
      console.warn('AI analysis failed, using fallback:', aiError);
    }

    // Fallback to basic analysis
    return {
      title: content.title,
      summary: content.content.substring(0, 500) + '...',
      keyPoints: [
        `Content length: ${content.metadata.wordCount || 'Unknown'} words`,
        `Source: ${new URL(url).hostname}`,
        'AI analysis not available'
      ],
      url: content.url,
      metadata: content.metadata,
      scrapedAt: new Date().toISOString(),
      aiEnhanced: false
    };

  } catch (error) {
    console.error('Link analysis failed:', error);
    throw new Error(`Failed to analyze link: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function parseStructuredAnalysis(response: string): { title: string; summary: string; keyPoints: string[] } {
  const lines = response.split('\n');
  let title = '';
  let summary = '';
  const keyPoints: string[] = [];

  let currentSection = '';
  for (const line of lines) {
    if (line.startsWith('Title:')) {
      title = line.replace('Title:', '').trim();
    } else if (line.startsWith('Summary:')) {
      summary = line.replace('Summary:', '').trim();
    } else if (line.startsWith('Key Points:')) {
      currentSection = 'keyPoints';
    } else if (line.startsWith('-') && currentSection === 'keyPoints') {
      keyPoints.push(line.replace('-', '').trim());
    }
  }

  return {
    title: title || 'Content Analysis',
    summary: summary || 'No summary available',
    keyPoints: keyPoints.length > 0 ? keyPoints : ['Content analyzed successfully']
  };
}

async function summarizeWithAI(url: string, content: string, userId?: string) {
  try {
    try {
      const { aiService } = await import('@/lib/ai-service');
      const aiResult = await aiService.generate(
        `Provide a concise summary of the following content. Focus on key points:\n\n${content.substring(0, 8000)}\n\nSummary:`,
        { maxTokens: 500, temperature: 0.5, userId }
      );
      return {
        summary: aiResult.text.trim(),
        url,
        source: `cloud:${aiResult.provider}`,
        createdAt: new Date().toISOString()
      };
    } catch (aiError) {
      console.warn('AI summarization failed, using fallback:', aiError);
    }

    // Fallback summary
    const fallbackSummary = content.length > 300 
      ? content.substring(0, 300) + '...'
      : content;

    return {
      summary: fallbackSummary,
      url,
      source: 'fallback',
      createdAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Summarization failed:', error);
    throw new Error(`Failed to summarize content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function extractInsights(url: string, content: string, userId?: string) {
  try {
    try {
      const { aiService } = await import('@/lib/ai-service');
      const aiResult = await aiService.generate(
        `Extract the most important insights, key findings, or notable points from this content. List them as bullet points:\n\n${content.substring(0, 8000)}\n\nKey Insights:`,
        { maxTokens: 800, temperature: 0.5, userId }
      );
      const insights = aiResult.text.split('\n')
        .map(l => l.trim())
        .filter(l => l.startsWith('-') || l.startsWith('•') || /^\d+\./.test(l))
        .map(l => l.replace(/^[-\u2022\d.]\s*/, '').trim())
        .filter(Boolean);
      return {
        insights: insights.length > 0 ? insights : [aiResult.text.trim()],
        url,
        source: `cloud:${aiResult.provider}`,
        createdAt: new Date().toISOString()
      };
    } catch (aiError) {
      console.warn('AI insight extraction failed, using fallback:', aiError);
    }

    // Fallback insights
    const fallbackInsights = [
      `Content length: ${content.length} characters`,
      `Source: ${new URL(url).hostname}`,
      'AI insight extraction not available'
    ];

    return {
      insights: fallbackInsights,
      url,
      source: 'fallback',
      createdAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Insight extraction failed:', error);
    throw new Error(`Failed to extract insights: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function enhanceContentWithAI(content: string, style: string, userId?: string) {
  try {
    try {
      const { aiService } = await import('@/lib/ai-service');
      const aiResult = await aiService.generate(
        `Rewrite this content in a more ${style} style:\n\nContent: ${content.substring(0, 8000)}\n\nEnhanced version:`,
        { maxTokens: 2000, temperature: 0.7, userId }
      );
      return {
        enhanced: aiResult.text.trim(),
        original: content,
        style,
        source: `cloud:${aiResult.provider}`,
        createdAt: new Date().toISOString()
      };
    } catch (aiError) {
      console.warn('AI content enhancement failed, using fallback:', aiError);
    }

    // Fallback - return original content
    return {
      enhanced: content,
      original: content,
      style,
      source: 'fallback',
      createdAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Content enhancement failed:', error);
    throw new Error(`Failed to enhance content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function comprehensiveAnalysis(url: string, userId?: string) {
  try {
    // First scrape the URL
    const scrapingReport = await webScraper.scrapeWebsite(url);

    if (!scrapingReport.success || !scrapingReport.content) {
      throw new Error('Failed to scrape URL content');
    }

    const content = scrapingReport.content;
    const { aiService } = await import('@/lib/ai-service');

    let aiAnalysis: any = null;

    try {
      // Summary + insights via the cloud cascade (cheap, parallel)
      const [summaryRes, insightsRes] = await Promise.all([
        aiService.generate(
          `Provide a concise summary of the following content. Focus on key points:\n\n${content.content.substring(0, 8000)}\n\nSummary:`,
          { maxTokens: 500, temperature: 0.5, userId }
        ),
        aiService.generate(
          `Extract the most important insights from this content as bullet points:\n\n${content.content.substring(0, 8000)}\n\nKey Insights:`,
          { maxTokens: 800, temperature: 0.5, userId }
        ),
      ]);

      aiAnalysis = {
        summary: summaryRes.text.trim(),
        insights: insightsRes.text.split('\n').map(l => l.trim()).filter(l => l.startsWith('-') || /^\d+\./.test(l)),
        provider: summaryRes.provider,
        available: true
      };
    } catch (aiError) {
      console.warn('AI analysis failed:', aiError);
      aiAnalysis = { available: false, error: aiError instanceof Error ? aiError.message : 'Unknown AI error' };
    }

    return {
      scrapedData: {
        title: content.title,
        content: content.content,
        url: content.url,
        metadata: content.metadata,
        summary: scrapingReport.summary
      },
      aiAnalysis,
      analyzedAt: new Date().toISOString(),
      url
    };

  } catch (error) {
    console.error('Comprehensive analysis failed:', error);
    throw new Error(`Failed to perform comprehensive analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}