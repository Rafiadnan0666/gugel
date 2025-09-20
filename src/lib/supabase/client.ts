// Example: lib/supabase/client.js
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // Ensure NEXT_PUBLIC_ variables are set in .env.local
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
