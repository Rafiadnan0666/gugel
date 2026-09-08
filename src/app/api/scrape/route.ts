import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { WebScraper } from '@/lib/web-scraper';

const webScraper = new WebScraper();

const MAX_URLS_PER_REQUEST = 20;
const MAX_URL_LENGTH = 2048;

function sanitizeUrl(url: string): string | null {
  if (typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_URL_LENGTH) return null;
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const { urls, task } = await request.json();

  if (!urls) {
    return NextResponse.json({ error: 'URLs are required' }, { status: 400 });
  }

  // Validate task parameter
  const validTasks = ['scrape-single', 'scrape-multiple', 'validate-urls'];
  const normalizedTask = validTasks.includes(task) ? task : 'scrape-single';

  // Sanitize and validate URLs
  const urlArray = Array.isArray(urls) ? urls : [urls];
  if (urlArray.length > MAX_URLS_PER_REQUEST) {
    return NextResponse.json({ error: `Maximum ${MAX_URLS_PER_REQUEST} URLs per request` }, { status: 400 });
  }

  const sanitizedUrls = urlArray.map(sanitizeUrl).filter(Boolean) as string[];
  if (sanitizedUrls.length === 0) {
    return NextResponse.json({ error: 'No valid URLs provided' }, { status: 400 });
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

    if (normalizedTask === 'scrape-single') {
      const report = await webScraper.scrapeWebsite(sanitizedUrls[0]);
      result = report;
    } else if (normalizedTask === 'scrape-multiple') {
      const reports = await webScraper.scrapeMultipleWebsites(sanitizedUrls);
      const summary = webScraper.generateReportSummary(reports);
      result = {
        reports,
        summary,
        timestamp: new Date().toISOString()
      };
    } else if (normalizedTask === 'validate-urls') {
      const validations = sanitizedUrls.map(url => ({
        url,
        validation: webScraper.validateURL(url)
      }));
      result = {
        validations,
        timestamp: new Date().toISOString()
      };
    } else {
      const report = await webScraper.scrapeWebsite(sanitizedUrls[0]);
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