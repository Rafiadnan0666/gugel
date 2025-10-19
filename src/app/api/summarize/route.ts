import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
<<<<<<< HEAD
// import { google_web_search } from '@google/generative-ai'; // This is a placeholder for the actual tool call
=======
import * as cheerio from 'cheerio';
>>>>>>> 62894e5feb2d5b345c83a06860f12b138cf119f0

async function fetchPageContent(url: string): Promise<{ title: string, body: string }> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.statusText}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    const title = $('title').text();
    const body = $('body').text().replace(/\s\s+/g, ' ').trim();
    return { title, body };
  } catch (error) {
    console.error('Error fetching page content:', error);
    // Return a generic error message or handle as needed
    return { title: 'Error', body: 'Could not fetch content from the URL.' };
  }
}

export async function POST(request: Request) {
  const { url } = await request.json();

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

<<<<<<< HEAD
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
=======
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
>>>>>>> 62894e5feb2d5b345c83a06860f12b138cf119f0

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, body } = await fetchPageContent(url);
    const summary = body.slice(0, 500) + (body.length > 500 ? '...' : '');

    return NextResponse.json({ summary, title });
  } catch (error) {
    console.error('Error summarizing URL:', error);
    return NextResponse.json({ error: 'Failed to summarize URL' }, { status: 500 });
  }
}
