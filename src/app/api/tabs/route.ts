import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { session_id, url, title, content } = await request.json();

  if (!session_id || !url) {
    return NextResponse.json({ error: 'session_id and url are required' }, { status: 400 });
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

  // Verify that the user is a collaborator on the session
  const { data: collaborator, error: collaboratorError } = await supabase
    .from('session_collaborators')
    .select('id')
    .eq('session_id', session_id)
    .eq('user_id', user.id)
    .single();

  // if not a collaborator, check if they are the owner of the session
  if (!collaborator) {
    const { data: session, error: sessionError } = await supabase
      .from('research_sessions')
      .select('id')
      .eq('id', session_id)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
        return NextResponse.json({ error: 'You do not have permission to add tabs to this session' }, { status: 403 });
    }
  }


  const { data, error } = await supabase
    .from('tabs')
    .insert([{ session_id, url, title, content, user_id: user.id }])
    .select();

  if (error) {
    console.error('Error inserting tab:', error);
    return NextResponse.json({ error: 'Failed to save tab' }, { status: 500 });
  }

  return NextResponse.json(data, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
