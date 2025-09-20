import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieOptions = {
  path: string;
  maxAge?: number;
  domain?: string;
  sameSite?: 'lax' | 'strict' | 'none';
  secure?: boolean;
};

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: { path: string; domain?: string }) {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    },
  );
}
