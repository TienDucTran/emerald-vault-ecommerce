// Admin client — bypass RLS, CHỈ dùng trong API routes server-side
// TUYỆT ĐỐI KHÔNG import trong Client Components
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
