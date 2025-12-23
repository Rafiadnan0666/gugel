import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { WebScraper } from '@/lib/web-scraper';

const webScraper = new WebScraper();

export async function POST(request: Request) {
  const { url } = await request.json();

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
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
    const scrapingReport = await webScraper.scrapeWebsite(url);
    if (!scrapingReport.success || !scrapingReport.content) {
      return NextResponse.json({ 
        error: 'Failed to fetch content from URL',
        details: scrapingReport.errors 
      }, { status: 500 });
    }

    // Create intelligent summary based on content
    const { content, title, metadata } = scrapingReport.content;
    let summary: string;

    if (metadata.readingTime <= 2) {
      // Short content - use first paragraph
      summary = content.split('\n')[0]?.substring(0, 500) || '';
    } else {
      // Longer content - create a more comprehensive summary
      const sentences = content.split('.').filter(s => s.trim().length > 10);
      summary = sentences.slice(0, 3).join('. ').substring(0, 500);
    }

    if (content.length > 500) {
      summary += '...';
    }

    return NextResponse.json({ 
      summary: summary.trim(), 
      title,
      metadata: {
        wordCount: metadata.wordCount,
        readingTime: metadata.readingTime,
        author: metadata.author,
        publishDate: metadata.publishDate
      }
    });
  } catch (error) {
    console.error('Error summarizing URL:', error);
    return NextResponse.json({ error: 'Failed to summarize URL' }, { status: 500 });
  }
}