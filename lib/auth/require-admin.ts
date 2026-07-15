/**
 * requireAdmin — Server-side helper cho Server Components và Route Handlers.
 *
 * Dùng trong:
 *   - Server Component: `const { user, profile, adminClient } = await requireAdmin();`
 *   - Route Handler:    `const { user, profile, adminClient } = await requireAdmin();`
 *
 * Hành vi:
 *   - Tạo server client từ `lib/supabase/server.ts` (cookie-bound, RLS theo user).
 *   - Gọi `supabase.auth.getUser()` để validate JWT thật.
 *   - Đọc `profiles.role` theo user.id.
 *   - Nếu !user → throw error 401.
 *   - Nếu role !== 'admin' → throw error 403.
 *   - Trả về `{ user, profile, adminClient }` với `adminClient` là service-role client
 *     (bypass RLS) để handler xử lý business logic không bị RLS cản.
 *
 * Vì sao trả adminClient: sau khi đã verify user là admin, ta có thể cần thao tác DB
 * rộng hơn (bulk import, update orders...). Tái sử dụng admin client tiết kiệm 1 lần
 * tạo client và đảm bảo mọi write đều đi qua service-role có kiểm soát.
 *
 * Lưu ý: chỉ dùng trong server context. TUYỆT ĐỐI KHÔNG import trong Client Component.
 */
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database, ProfileRow } from '@/lib/supabase/types';

export class AuthError extends Error {
  status: number;
  code: 'UNAUTHENTICATED' | 'FORBIDDEN';
  constructor(status: number, code: 'UNAUTHENTICATED' | 'FORBIDDEN', message: string) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.code = code;
  }
}

export interface RequireAdminResult {
  user: User;
  profile: ProfileRow;
  supabase: SupabaseClient<Database>;
  adminClient: SupabaseClient<Database>;
}

/**
 * Xác thực user hiện tại là admin. Throw AuthError nếu fail.
 * Caller (route handler) bắt AuthError và trả Response với status tương ứng.
 */
export async function requireAdmin(): Promise<RequireAdminResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AuthError(401, 'UNAUTHENTICATED', 'Yêu cầu đăng nhập');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<ProfileRow>();

  if (error || !profile) {
    throw new AuthError(403, 'FORBIDDEN', 'Không tìm thấy profile');
  }

  if (profile.role !== 'admin') {
    throw new AuthError(403, 'FORBIDDEN', 'Tài khoản không có quyền admin');
  }

  return {
    user,
    profile,
    supabase,
    adminClient: createAdminClient(),
  };
}
