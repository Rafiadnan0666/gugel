import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { cookies } from 'next/headers';
// import { createSupabaseServerClient } from '@/utils/supabase/server'

const intlMiddleware = createIntlMiddleware({
  locales: ['en', 'ur'], // Your supported locales
  defaultLocale: 'en',
});

export async function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(
          name: string,
          value: string,
          options: {
            path: string;
            maxAge?: number;
            domain?: string;
            sameSite?: 'lax' | 'strict' | 'none';
            secure?: boolean;
          },
        ) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: { path: string; domain?: string }) {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    },
  );
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const url = request.nextUrl;
  const path = url.pathname;

  if (path === '/') {
    if (session) {
      // If logged in, rewrite to the authenticated homepage without changing URL
      return NextResponse.rewrite(new URL('/', request.url));
    }else {
      return NextResponse.rewrite(new URL('/', request.url));
    }
    // If not logged in, continue to show the default homepage (no action needed)
  }

  // If user is already authenticated and tries to access auth pages, redirect to dashboard
  if (
    session &&
    (path.startsWith('/sign-in') ||
      path.startsWith('/sign-up') ||
      path.startsWith('/reset-password'))
  ) {
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Protect dashboard and admin routes
  if (!session && (path.startsWith('/dashboard') || path.startsWith('/admin'))) {
    url.pathname = '/sign-in';
    return NextResponse.redirect(url);
  }

  // Check admin access here if needed (you'll need to implement a way to identify admin users)
  // This could be through a database lookup or checking user metadata

  return response;
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth/callback|assets|.*\\..).*)'],
};
