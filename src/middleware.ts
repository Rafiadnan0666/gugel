import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const url = request.nextUrl;
  const path = url.pathname;

  // Redirect authenticated users away from auth pages
  if (
    session &&
    (path === '/sign-in' ||
      path === '/sign-up' ||
      path === '/reset-password' ||
      path === '/update-password')
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect unauthenticated users from protected pages
  if (!session && (path.startsWith('/dashboard') || path.startsWith('/admin') || path.startsWith('/research'))) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  // Admin route protection
  if (path.startsWith('/admin')) {
    if (!session?.user) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    const { data: userRoles } = await supabase
      .from('user_role_assignments')
      .select('user_roles!inner(name)')
      .eq('user_id', session.user.id);

    const isAdmin = userRoles?.some((assignment: any) =>
      assignment.user_roles.name === 'admin'
    );

    if (!isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|assets|.*\\..).*)'],
};
