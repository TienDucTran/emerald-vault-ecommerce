// Admin client — bypass RLS, CHỈ dùng trong API routes server-side
// TUYỆT ĐỐI KHÔNG import trong Client Components
//
// Tạm thời return `any` để bypass generic narrowing của Supabase v6 (khi chưa
// generate types qua `npx supabase gen types typescript --linked`). Khi đã có
// generated types, đổi lại thành `createSupabaseClient<Database>`.
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createAdminClient(): any {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
