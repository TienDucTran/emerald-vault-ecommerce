// GET /api/admin/collections
//   Response 200: { ok: true, data: Array<{ id: string; name: string; slug: string }> }
//   Response 4xx: { ok: false, error }
//
// Lưu ý:
//   - Chỉ trả về collection đã published (is_published = true).
//   - Sắp xếp theo display_order ASC, sau đó created_at DESC.
//   - Dùng cho ProductForm select "Bộ sưu tập" (New + Edit).

import { NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth/require-admin';

// requireAdmin() gọi cookies() → bắt buộc dynamic.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const { adminClient } = await requireAdmin();

    const { data, error } = await adminClient
      .from('collections')
      .select('id, name, slug')
      .eq('is_published', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { ok: false, error: 'LIST_FAILED', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { ok: false, error: e.message, code: e.code },
        { status: e.status }
      );
    }
    return NextResponse.json(
      { ok: false, error: 'INTERNAL', message: (e as Error)?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
