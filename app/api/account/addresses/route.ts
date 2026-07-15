/**
 * /api/account/addresses
 *
 *   GET  — Liệt kê địa chỉ giao hàng của customer hiện tại (is_default DESC, created_at DESC).
 *   POST — Tạo địa chỉ mới. Nếu is_default=true hoặc là địa chỉ đầu tiên → unset các default khác.
 *
 * Auth: requireCustomer. Mọi write qua admin client.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireCustomer } from '@/lib/auth/require-customer';
import type { Address } from '@/lib/types/account';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const addressInsertSchema = z
  .object({
    label: z.string().max(40).optional(),
    recipient_name: z.string().min(1).max(120),
    recipient_phone: z
      .string()
      .min(8)
      .max(20)
      .regex(/^[0-9+\s-]+$/, 'Số điện thoại không hợp lệ'),
    address_line: z.string().min(1).max(500),
    province: z.string().min(1).max(80),
    district: z.string().min(1).max(80),
    ward: z.string().max(80).optional(),
    is_default: z.boolean().optional(),
  })
  .strict();

export async function GET() {
  try {
    const { user, adminClient } = await requireCustomer();

    const { data, error } = await adminClient
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
      .returns<Address[]>();

    if (error) {
      console.error('[GET /api/account/addresses] error:', error);
      return NextResponse.json(
        { error: 'FETCH_FAILED', message: 'Không thể lấy danh sách địa chỉ' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    return authErrorResponse(err, 'GET /api/account/addresses');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, adminClient } = await requireCustomer();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'INVALID_JSON', message: 'Body không phải JSON hợp lệ' },
        { status: 400 }
      );
    }

    const parsed = addressInsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Dữ liệu không hợp lệ',
          issues: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const isDefault = input.is_default === true;

    const { count, error: countErr } = await adminClient
      .from('addresses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countErr) {
      console.error('[POST /api/account/addresses] count error:', countErr);
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Lỗi máy chủ' },
        { status: 500 }
      );
    }

    const willBeDefault = isDefault || (count ?? 0) === 0;

    if (willBeDefault) {
      const { error: unsetErr } = await adminClient
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true);

      if (unsetErr) {
        console.error(
          '[POST /api/account/addresses] unset default error:',
          unsetErr
        );
        return NextResponse.json(
          { error: 'INTERNAL_ERROR', message: 'Lỗi máy chủ' },
          { status: 500 }
        );
      }
    }

    const { data: created, error: insertErr } = await adminClient
      .from('addresses')
      .insert({
        user_id: user.id,
        label: input.label ?? null,
        recipient_name: input.recipient_name,
        recipient_phone: input.recipient_phone,
        address_line: input.address_line,
        province: input.province,
        district: input.district,
        ward: input.ward ?? null,
        is_default: willBeDefault,
      })
      .select('*')
      .single<Address>();

    if (insertErr || !created) {
      console.error('[POST /api/account/addresses] insert error:', insertErr);
      return NextResponse.json(
        { error: 'INSERT_FAILED', message: 'Không thể tạo địa chỉ' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    return authErrorResponse(err, 'POST /api/account/addresses');
  }
}
