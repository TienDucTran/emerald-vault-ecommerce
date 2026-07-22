// Supabase client cho Client Components (browser)
// Dùng trong: hooks, useState, onClick handler, form submit...
import { createBrowserClient } from '@supabase/ssr';

export function createClient(): any {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
