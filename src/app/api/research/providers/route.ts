import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { aiService } from '@/lib/ai-service';

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Cached (60s), parallel checks — the old sequential live ping per
    // provider made this endpoint slow and heavy.
    const status = await aiService.getProviderStatus();
    const providers = status
      .filter((s) => s.available)
      .map((s) => ({ id: s.id, name: s.name, freeTier: s.freeTier, model: s.model }));
    return NextResponse.json({ providers });
  } catch (error: any) {
    return NextResponse.json({ providers: [], error: error.message });
  }
}
