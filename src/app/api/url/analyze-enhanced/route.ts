import { NextRequest, NextResponse } from 'next/server';
import { WebScraper } from '@/lib/web-scraper';

export async function POST(request: NextRequest) {
  try {
    const { url, options = {} } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const scraper = new WebScraper();

    // First, scrape the website
    const scrapingReport = await scraper.scrapeWebsite(url);

    if (!scrapingReport.success || !scrapingReport.content) {
      return NextResponse.json({
        error: 'Failed to scrape website',
        details: scrapingReport.errors,
        success: false
      }, { status: 400 });
    }

    // Perform enhanced AI analysis
    const enhancedAnalysis = await scraper.analyzeURLWithAI(url, scrapingReport.content);

    return NextResponse.json({
      success: true,
      data: {
        scrapedContent: scrapingReport.content,
        enhancedAnalysis: enhancedAnalysis,
        scrapingReport: {
          success: scrapingReport.success,
          summary: scrapingReport.summary,
          errors: scrapingReport.errors,
          warnings: scrapingReport.warnings
        }
      }
    });

  } catch (error) {
    console.error('Enhanced URL analysis error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}