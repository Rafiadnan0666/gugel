'use client';

import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createClient } from './client';
import { useState } from 'react';
import type { Session } from '@supabase/auth-helpers-nextjs';

export function SupabaseProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession: Session | null;
}) {
  const [supabaseClient] = useState(() => createClient());

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={initialSession}>
      {children}
    </SessionContextProvider>
  );
}
