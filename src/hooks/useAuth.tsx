'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AuthState {
  readonly user: any;
  readonly loading: boolean;
  readonly isAuthenticated: boolean;
}

const createInitialState = (): AuthState => ({
  user: null,
  loading: true,
  isAuthenticated: false
});

const updateAuthState = (user: any, loading: boolean): AuthState => ({
  user,
  loading,
  isAuthenticated: !!user
});

export default function useAuth(): AuthState & { readonly signOut: () => Promise<void> } {
  const [state, setState] = useState<AuthState>(createInitialState);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const getUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    setState(updateAuthState(user, false));
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/sign-in');
  }, [supabase, router]);

  useEffect(() => {
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(updateAuthState(session?.user || null, false));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, getUser]);

  return {
    ...state,
    signOut,
  };
}