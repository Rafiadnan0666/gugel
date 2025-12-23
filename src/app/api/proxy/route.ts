import { NextResponse } from 'next/server';
import { WebScraper } from '@/lib/web-scraper';

const webScraper = new WebScraper();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const format = searchParams.get('format') || 'html';
  const validate = searchParams.get('validate') === 'true';

  if (!url) {
    return NextResponse.json({ 
      error: 'URL parameter is required',
      usage: {
        example: '/api/proxy?url=https://example.com&format=html&validate=true',
        formats: ['html', 'json', 'text'],
        options: {
          validate: 'boolean - validate URL before fetching'
        }
      }
    }, { status: 400 });
  }

  try {
    // Validate URL first if requested
    if (validate) {
      const validation = webScraper.validateURL(url);
      if (!validation.isValid) {
        return NextResponse.json({ 
          error: 'Invalid URL',
          validation 
        }, { status: 400 });
      }
      if (validation.warnings.length > 0) {
        console.warn('URL validation warnings:', validation.warnings);
      }
    }

    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': format === 'json' ? 'application/json, text/*' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: AbortSignal.timeout(30000),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return NextResponse.json({ 
        error: `Failed to fetch: ${response.status} ${response.statusText}`,
        status: response.status,
        statusText: response.statusText,
        responseTime: `${responseTime}ms`
      }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    const contentLength = response.headers.get('content-length');
    
    // Handle different response formats
    if (format === 'json') {
      const data = await response.json();
      return NextResponse.json({ 
        data,
        metadata: {
          url,
          contentType,
          contentLength,
          responseTime: `${responseTime}ms`,
          timestamp: new Date().toISOString()
        }
      });
    } else if (format === 'text') {
      const text = await response.text();
      return new NextResponse(text, { 
        headers: { 
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Response-Time': `${responseTime}ms`,
          'X-Content-Length': contentLength || '0'
        }
      });
    } else {
      // Default to HTML
      const html = await response.text();
      return new NextResponse(html, { 
        headers: { 
          'Content-Type': contentType || 'text/html; charset=utf-8',
          'X-Response-Time': `${responseTime}ms`,
          'X-Content-Length': contentLength || '0'
        }
      });
    }

  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ 
      error: 'An error occurred while fetching the URL.',
      details: error instanceof Error ? error.message : 'Unknown error',
      url,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
