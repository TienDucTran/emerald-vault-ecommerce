/**
 * requireCustomer — Server-side helper cho Server Components và Route Handlers
 * dành cho customer (user đã đăng nhập, role = 'customer').
 *
 * Dùng trong:
 *   - Server Component: `const { user, profile, adminClient } = await requireCustomer();`
 *   - Route Handler:    `const { user, profile, adminClient } = await requireCustomer();`
 *
 * Hành vi:
 *   - Tạo server client từ `lib/supabase/server.ts` (cookie-bound, RLS theo user).
 *   - Gọi `supabase.auth.getUser()` để validate JWT thật.
 *   - Đọc `profiles.role` theo user.id.
 *   - Nếu !user → throw error 401.
 *   - Nếu !profile hoặc role !== 'customer' → throw error 403.
 *   - Trả về `{ user, profile, supabase, adminClient }` với `adminClient` là service-role
 *     client (bypass RLS) để handler xử lý business logic không bị RLS cản.
 *
 * Vì sao trả adminClient: sau khi đã verify user là customer, một số flow cần đọc/ghi
 * rộng hơn (vd. đọc orders của customer khi RLS chưa được áp dụng đầy đủ, update
 * profile qua service-role). Tái sử dụng admin client tiết kiệm 1 lần tạo client.
 *
 * Lưu ý: chỉ dùng trong server context. TUYỆT ĐỐI KHÔNG import trong Client Component.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database, ProfileRow } from '@/lib/supabase/types';

export class AuthError extends Error {
  status: number;
  code: 'NOT_AUTHENTICATED' | 'NOT_CUSTOMER';
  constructor(
    status: number,
    code: 'NOT_AUTHENTICATED' | 'NOT_CUSTOMER',
    message: string
  ) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.code = code;
  }
}

export interface RequireCustomerResult {
  user: User;
  profile: ProfileRow;
  supabase: SupabaseClient<Database>;
  adminClient: SupabaseClient<Database>;
}

/**
 * Xác thực user hiện tại là customer. Throw AuthError nếu fail.
 * Caller (route handler / server component) bắt AuthError và trả Response với status tương ứng.
 */
export async function requireCustomer(): Promise<RequireCustomerResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AuthError(401, 'NOT_AUTHENTICATED', 'Yêu cầu đăng nhập');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single<ProfileRow>();

  if (error || !profile) {
    throw new AuthError(403, 'NOT_CUSTOMER', 'Không tìm thấy profile');
  }

  if (profile.role !== 'customer') {
    throw new AuthError(403, 'NOT_CUSTOMER', 'Tài khoản không phải customer');
  }

  return {
    user,
    profile,
    supabase,
    adminClient: createAdminClient(),
  };
}

/**
 * Helper cho route handler: bắt error trong try/catch và map sang NextResponse.
 * - AuthError → trả status + code/message của error.
 * - Lỗi khác → log + trả 500.
 */
export function authErrorResponse(
  err: unknown,
  context?: string
): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json(
      { error: err.code, message: err.message },
      { status: err.status }
    );
  }
  console.error(
    `[${context ?? 'account/api'}] unexpected error:`,
    err
  );
  return NextResponse.json(
    { error: 'INTERNAL_ERROR', message: 'Lỗi máy chủ' },
    { status: 500 }
  );
}

/**
 * Phiên bản optional — không throw, trả null nếu không có user / profile.
 * Dùng cho các flow cho phép khách vãng lai (vd. landing page có gợi ý cá nhân hoá).
 *
 *   - Không có user → trả null.
 *   - Có user nhưng không có profile → trả null.
 *   - Có profile nhưng role !== 'customer' → trả null + log warning (bất thường).
 */
export async function getOptionalCustomer(): Promise<RequireCustomerResult | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle<ProfileRow>();

    if (error || !profile) return null;

    if (profile.role !== 'customer') {
      console.warn(
        `[getOptionalCustomer] User ${user.id} has role "${profile.role}", skipping customer context.`
      );
      return null;
    }

    return {
      user,
      profile,
      supabase,
      adminClient: createAdminClient(),
    };
  } catch (err) {
    console.warn('[getOptionalCustomer] Unexpected error:', err);
    return null;
  }
}
