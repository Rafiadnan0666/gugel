// lib/supabase/actions.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Note: Often the server.ts client can be reused if middleware handles cookie refresh,
// but creating a dedicated one or ensuring the server one handles set/remove is safer.
// This example uses the same structure as server.ts but is intended for Actions.
export function createActionClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const resolvedCookies = await cookieStore;
          return resolvedCookies.get(name)?.value;
        },
        // Crucial for actions that might modify auth state/refresh tokens
        async set(name: string, value: string, options: CookieOptions) {
          try {
            (await cookieStore).set({ name, value, ...options });
          } catch (error) {
            console.error('Error setting cookie in action:', error);
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            (await cookieStore).set({ name, value: '', ...options, maxAge: 0 });
          } catch (error) {
            console.error('Error removing cookie in action:', error);
          }
        },
      },
    },
  );
}














