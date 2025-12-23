import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { WebScraper } from '@/lib/web-scraper';

const webScraper = new WebScraper();

export async function POST(request: Request) {
  const { urls, task } = await request.json();

  if (!urls) {
    return NextResponse.json({ error: 'URLs are required' }, { status: 400 });
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

    if (task === 'scrape-single') {
      // Single URL scraping
      const report = await webScraper.scrapeWebsite(urls);
      result = report;
    } else if (task === 'scrape-multiple') {
      // Multiple URLs scraping
      const urlArray = Array.isArray(urls) ? urls : [urls];
      const reports = await webScraper.scrapeMultipleWebsites(urlArray);
      const summary = webScraper.generateReportSummary(reports);
      result = {
        reports,
        summary,
        timestamp: new Date().toISOString()
      };
    } else if (task === 'validate-urls') {
      // URL validation only
      const urlArray = Array.isArray(urls) ? urls : [urls];
      const validations = urlArray.map(url => ({
        url,
        validation: webScraper.validateURL(url)
      }));
      result = {
        validations,
        timestamp: new Date().toISOString()
      };
    } else {
      // Default to single scrape
      const report = await webScraper.scrapeWebsite(urls);
      result = report;
    }

    return NextResponse.json({ result });

  } catch (error) {
    console.error('Error processing web scraping request:', error);
    return NextResponse.json({ 
      error: 'Failed to process scraping request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const task = searchParams.get('task') || 'validate';

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
  }

  try {
    if (task === 'validate') {
      const validation = webScraper.validateURL(url);
      return NextResponse.json({ validation });
    } else {
      return NextResponse.json({ error: 'Invalid task parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in GET request:', error);
    return NextResponse.json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}