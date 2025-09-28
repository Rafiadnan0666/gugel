import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { AIService } from '@/utils/aiService';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $('title').first().text() || $('h1').first().text();
    
    $('script, style, noscript, iframe, img, svg').remove();
    
    const content = $('body').text().replace(/\s\s+/g, ' ').trim();

    if (!content) {
      return NextResponse.json({ title, summary: 'Could not extract content from the page.' });
    }

    const summary = await AIService.generateSuggestion(content.substring(0, 4000), 'summarize');

    return NextResponse.json({ title, summary });
  } catch (error: any) {
    console.error('Error in summarize-url route:', error);
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}