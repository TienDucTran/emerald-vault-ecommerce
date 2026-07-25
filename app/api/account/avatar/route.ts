/**
 * POST /api/account/avatar
 *
 * Upload ảnh đại diện cho customer đang đăng nhập.
 *   Content-Type: multipart/form-data
 *   Fields:
 *     - avatar (File, required) — ảnh đại diện, max 5MB, jpeg/png/webp
 *
 * Response 201: { ok: true, avatar_url }
 * Response 4xx: { ok: false, error, message }
 *
 * Auth: requireCustomer (cookie-bound server client).
 */
import { NextResponse } from 'next/server';
import { authErrorResponse, requireCustomer } from '@/lib/auth/require-customer';
import { uploadImage } from '@/lib/supabase/storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function POST(req: Request) {
  try {
    const { user, adminClient } = await requireCustomer();

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json(
        { ok: false, error: 'INVALID_FORM', message: 'Body không phải multipart/form-data hợp lệ' },
        { status: 400 }
      );
    }

    const file = form.get('avatar');
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_FILE', message: 'Thiếu field "avatar" hoặc không phải File' },
        { status: 400 }
      );
    }

    if (file.size <= 0) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_FILE', message: 'File rỗng' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: 'FILE_TOO_LARGE', message: `File quá lớn (${file.size} bytes). Tối đa 5MB` },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: 'INVALID_TYPE', message: `Chỉ chấp nhận jpeg/png/webp, nhận được "${file.type}"` },
        { status: 400 }
      );
    }

    try {
      // Upload vào folder `avatars`, giữ tên gốc của file (server sẽ slugify + .webp)
      const originalName = file.name || `avatar-${user.id}`;
      const { publicUrl, path } = await uploadImage(file, {
        folder: 'avatars',
        filename: originalName,
      });

      // Cập nhật avatar_url trong profile
      const { error: updateError } = await adminClient
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('[account/avatar] update profile error:', updateError.message);
        return NextResponse.json(
          { ok: false, error: 'UPDATE_FAILED', message: 'Không thể cập nhật avatar' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { ok: true, avatar_url: publicUrl, path },
        { status: 201 }
      );
    } catch (uploadErr) {
      console.error('[account/avatar] upload failed:', uploadErr);
      return NextResponse.json(
        { ok: false, error: 'UPLOAD_FAILED', message: (uploadErr as Error)?.message ?? 'Upload thất bại' },
        { status: 500 }
      );
    }
  } catch (err) {
    return authErrorResponse(err, 'POST /api/account/avatar');
  }
}