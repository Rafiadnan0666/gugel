import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { AIService } from '@/utils/aiService';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let response;
    try {
      response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    } catch (fetchError: any) {
      console.error(`Fetch error for ${url}:`, fetchError.message);
      return NextResponse.json({ error: `Failed to fetch the URL. Please check if it is correct and accessible.` }, { status: 500 });
    }

    if (!response.ok) {
      return NextResponse.json({ error: `The URL returned a ${response.status} status.` }, { status: 500 });
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $('title').first().text() || $('h1').first().text();
    
    $('script, style, noscript, iframe, img, svg, footer, header, nav').remove();
    
    const content = $('body').text().replace(/\s\s+/g, ' ').trim();

    if (!content) {
      return NextResponse.json({ title, summary: 'Could not extract meaningful content from the page.' });
    }

    const summary = await AIService.generateSuggestion(content.substring(0, 4000), 'summarize');

    return NextResponse.json({ title, summary });
  } catch (error: any) {
    console.error('Error in summarize-url route:', error);
    return NextResponse.json({ error: 'An unexpected error occurred while summarizing the URL.' }, { status: 500 });
  }
}
