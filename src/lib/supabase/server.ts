import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';


export const createSupabaseServerClient = () => {
  const cookieStorePromise = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookieStorePromise;
          return cookieStore.get(name)?.value;
        },
      },
    },
  );
};
