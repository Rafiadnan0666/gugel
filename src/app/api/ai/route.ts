import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// This is a placeholder for a real generative AI model call.
// In a real application, you would use an SDK from a provider like Google AI, OpenAI, etc.
async function runGenerativeAI(prompt: string): Promise<string> {
  console.log(`Running generative AI with prompt: ${prompt.substring(0, 100)}...`);
  // Simulate a delay to mimic a real API call
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // In a real implementation, this would be a call to a generative model.
  // For demonstration, we'll return a canned response based on the prompt.
  if (prompt.startsWith('Summarize the following content:')) {
    return 'This is a server-generated summary of the provided content. It is more robust than the previous on-device model.';
  }
  if (prompt.includes('User\'s question:')) {
    return 'This is a server-generated response to your question. The AI chat is now powered by a server-side model.';
  }
  return 'This is a generic response from the server-side AI model.';
}

async function fetchPageContent(url: string): Promise<{ title: string, body: string } | null> {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) {
      return null;
    }
    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $('script, style, noscript, iframe, footer, header, nav').remove();
    $('[aria-hidden="true"]').remove();
    $('[class*="ad"], [id*="ad"], [class*="banner"], [id*="banner"]').remove();

    const title = $('title').first().text() || $('h1').first().text();
    
    // Try to get content from common main content selectors
    let body = $('article').text() || $('main').text() || $('.post').text() || $('#content').text();

    if (!body) {
      body = $('body').text();
    }

    // Clean up whitespace
    body = body.replace(/\s\s+/g, ' ').trim();

    return { title, body };
  } catch (error) {
    console.error('Error fetching page content:', error);
    return null;
  }
}

export async function POST(request: Request) {
  const { prompt, task, context } = await request.json();

  if (!prompt || !task) {
    return NextResponse.json({ error: 'prompt and task are required' }, { status: 400 });
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
    if (task === 'summarize-url') {
      const pageData = await fetchPageContent(prompt);
      if (!pageData || !pageData.body) {
        return NextResponse.json({ error: 'Failed to fetch content from URL' }, { status: 500 });
      }
      const summarizationPrompt = `Summarize the following content: ${pageData.body.substring(0, 8000)}`;
      result = await runGenerativeAI(summarizationPrompt);
      // Include title in the response
      return NextResponse.json({ result, title: pageData.title });
    } else {
      result = await runGenerativeAI(prompt);
      return NextResponse.json({ result });
    }

  } catch (error) {
    console.error('Error processing AI request:', error);
    return NextResponse.json({ error: 'Failed to process AI request' }, { status: 500 });
  }
}
