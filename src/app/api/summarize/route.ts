import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { WebScraper } from '@/lib/web-scraper';

const webScraper = new WebScraper();

// Server-side AI fallback function
async function generateServerSummary(content: string): Promise<string> {
  // Simulate AI processing for now
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const sentences = content.split('.').filter(s => s.trim().length > 10);
  let summary = sentences.slice(0, 3).join('. ').substring(0, 500);
  
  if (content.length > 500) {
    summary += '...';
  }
  
  return summary.trim();
}

export async function POST(request: Request) {
  const { url, content: providedContent, useLocalAI } = await request.json();

  if (!url && !providedContent) {
    return NextResponse.json({ error: 'URL or content is required' }, { status: 400 });
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
    let scrapingReport;
    let content: string;
    let title: string;
    let metadata: any;

    if (providedContent) {
      // Use provided content directly (for local AI processing)
      content = providedContent;
      title = 'Provided Content';
      metadata = {
        wordCount: content.split(/\s+/).length,
        readingTime: Math.ceil(content.split(/\s+/).length / 200),
        author: undefined,
        publishDate: undefined
      };
    } else {
      // Scrape the URL
      scrapingReport = await webScraper.scrapeWebsite(url);
      if (!scrapingReport.success || !scrapingReport.content) {
        return NextResponse.json({ 
          error: 'Failed to fetch content from URL',
          details: scrapingReport.errors 
        }, { status: 500 });
      }

      content = scrapingReport.content.content;
      title = scrapingReport.content.title;
      metadata = scrapingReport.content.metadata;
    }

    // If useLocalAI is true, return the scraped content for client-side processing
    if (useLocalAI) {
      return NextResponse.json({
        success: true,
        content: content.substring(0, 8000), // Limit for AI processing
        title,
        metadata: {
          wordCount: metadata.wordCount,
          readingTime: metadata.readingTime,
          author: metadata.author,
          publishDate: metadata.publishDate
        },
        requiresLocalAI: true,
        url: url || ''
      });
    }

    // Generate summary on server side
    let summary: string;

    if (metadata.readingTime <= 2) {
      // Short content - use first paragraph
      summary = content.split('\n')[0]?.substring(0, 500) || '';
    } else {
      // Use server-side AI for longer content
      summary = await generateServerSummary(content);
    }

    if (content.length > 500 && !summary.endsWith('...')) {
      summary += '...';
    }

    return NextResponse.json({ 
      success: true,
      summary: summary.trim(), 
      title,
      metadata: {
        wordCount: metadata.wordCount,
        readingTime: metadata.readingTime,
        author: metadata.author,
        publishDate: metadata.publishDate
      },
      url: url || ''
    });
  } catch (error) {
    console.error('Error summarizing URL:', error);
    return NextResponse.json({ error: 'Failed to summarize URL' }, { status: 500 });
  }
}