/**
 * /api/admin/profile
 *
 *   GET — Trả profile của admin đang đăng nhập.
 *
 * Auth: requireAdmin (cookie-bound server client). Endpoint này tồn tại song song
 * với /api/account/profile (dành cho customer) vì requireCustomer sẽ từ chối
 * admin — cần một endpoint riêng để header lấy full_name mà không bị 403.
 */
import { NextResponse } from 'next/server';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';
import type { ProfileRow } from '@/lib/supabase/types';

export async function GET() {
  try {
    const { profile } = await requireAdmin();
    return NextResponse.json({ profile: profile as ProfileRow });
  } catch (err) {
    return authErrorResponse(err);
  }
}
