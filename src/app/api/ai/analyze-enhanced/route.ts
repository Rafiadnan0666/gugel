import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { WebScraper } from '@/lib/web-scraper';

const webScraper = new WebScraper();

export async function POST(request: Request) {
  const { url, task, options = {} } = await request.json();

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

  try {
    let result;

    switch (task) {
      case 'analyze-link':
        result = await analyzeLink(url);
        break;
        
      case 'summarize-content':
        const { content } = options;
        if (!content) {
          return NextResponse.json({ error: 'content is required for summarization' }, { status: 400 });
        }
        result = await summarizeWithAI(url, content);
        break;
        
      case 'extract-insights':
        const { content: insightContent } = options;
        if (!insightContent) {
          return NextResponse.json({ error: 'content is required for insight extraction' }, { status: 400 });
        }
        result = await extractInsights(url, insightContent);
        break;
        
      case 'enhance-content':
        const { content: enhanceContent, style = 'academic' } = options;
        if (!enhanceContent) {
          return NextResponse.json({ error: 'content is required for enhancement' }, { status: 400 });
        }
        result = await enhanceContentWithAI(enhanceContent, style);
        break;
        
      case 'comprehensive-analysis':
        result = await comprehensiveAnalysis(url);
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

async function analyzeLink(url: string) {
  try {
    // First scrape the URL to get content
    const scrapingReport = await webScraper.scrapeWebsite(url);
    
    if (!scrapingReport.success || !scrapingReport.content) {
      throw new Error('Failed to scrape URL content');
    }

    const content = scrapingReport.content;
    
    // Use our AI service to analyze the content
    const { languageModelService } = await import('@/lib/language-model');
    
    // Check if AI is available
    const isAvailable = await languageModelService.isAvailable();
    
    if (isAvailable) {
      try {
        const analysis = await languageModelService.analyzeUrl(url, content.content);
        return {
          title: analysis.title,
          summary: analysis.summary,
          keyPoints: analysis.keyPoints,
          url: content.url,
          metadata: content.metadata,
          scrapedAt: new Date().toISOString(),
          aiEnhanced: true
        };
      } catch (aiError) {
        console.warn('AI analysis failed, using fallback:', aiError);
      }
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

async function summarizeWithAI(url: string, content: string) {
  try {
    const { languageModelService } = await import('@/lib/language-model');
    
    // Check if AI is available
    const isAvailable = await languageModelService.isAvailable();
    
    if (isAvailable) {
      try {
        const summary = await languageModelService.summarizeContent(content);
        return {
          summary,
          url,
          source: 'language-model',
          createdAt: new Date().toISOString()
        };
      } catch (aiError) {
        console.warn('AI summarization failed, using fallback:', aiError);
      }
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

async function extractInsights(url: string, content: string) {
  try {
    const { languageModelService } = await import('@/lib/language-model');
    
    // Check if AI is available
    const isAvailable = await languageModelService.isAvailable();
    
    if (isAvailable) {
      try {
        const insights = await languageModelService.extractInsights(content);
        return {
          insights,
          url,
          source: 'language-model',
          createdAt: new Date().toISOString()
        };
      } catch (aiError) {
        console.warn('AI insight extraction failed, using fallback:', aiError);
      }
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

async function enhanceContentWithAI(content: string, style: string) {
  try {
    const { languageModelService } = await import('@/lib/language-model');
    
    // Check if AI is available
    const isAvailable = await languageModelService.isAvailable();
    
    if (isAvailable) {
      try {
        const enhanced = await languageModelService.enhanceContent(content, style as any);
        return {
          enhanced,
          original: content,
          style,
          source: 'language-model',
          createdAt: new Date().toISOString()
        };
      } catch (aiError) {
        console.warn('AI content enhancement failed, using fallback:', aiError);
      }
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

async function comprehensiveAnalysis(url: string) {
  try {
    // First scrape the URL
    const scrapingReport = await webScraper.scrapeWebsite(url);
    
    if (!scrapingReport.success || !scrapingReport.content) {
      throw new Error('Failed to scrape URL content');
    }

    const content = scrapingReport.content;
    const { languageModelService } = await import('@/lib/language-model');
    
    // Check if AI is available
    const isAvailable = await languageModelService.isAvailable();
    
    let aiAnalysis = null;
    
    if (isAvailable) {
      try {
        // Get summary, insights, and enhanced content
        const [summary, insights, enhanced] = await Promise.all([
          languageModelService.summarizeContent(content.content),
          languageModelService.extractInsights(content.content),
          languageModelService.enhanceContent(content.content, 'academic')
        ]);

        const urlAnalysis = await languageModelService.analyzeUrl(url, content.content);

        aiAnalysis = {
          summary,
          insights,
          enhanced,
          urlAnalysis,
          available: true
        };
      } catch (aiError) {
        console.warn('AI analysis failed:', aiError);
        aiAnalysis = { available: false, error: aiError instanceof Error ? aiError.message : 'Unknown AI error' };
      }
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