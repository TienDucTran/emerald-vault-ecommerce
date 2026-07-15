/**
 * /api/account/addresses/[id]
 *
 *   PATCH  — Cập nhật địa chỉ (ownership-check). Nếu is_default=true → unset các default khác.
 *   DELETE — Xoá địa chỉ (ownership-check).
 *
 * Auth: requireCustomer. Mọi write qua admin client.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireCustomer } from '@/lib/auth/require-customer';
import type { Address } from '@/lib/types/account';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const addressUpdateSchema = z
  .object({
    label: z.string().max(40).optional(),
    recipient_name: z.string().min(1).max(120).optional(),
    recipient_phone: z
      .string()
      .min(8)
      .max(20)
      .regex(/^[0-9+\s-]+$/, 'Số điện thoại không hợp lệ')
      .optional(),
    address_line: z.string().min(1).max(500).optional(),
    province: z.string().min(1).max(80).optional(),
    district: z.string().min(1).max(80).optional(),
    ward: z.string().max(80).optional(),
    is_default: z.boolean().optional(),
  })
  .strict();

interface RouteContext {
  params: { id: string };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { user, adminClient } = await requireCustomer();
    const { id } = context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Thiếu id địa chỉ' },
        { status: 400 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'INVALID_JSON', message: 'Body không phải JSON hợp lệ' },
        { status: 400 }
      );
    }

    const parsed = addressUpdateSchema.safeParse(body);
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

    const { data: existing, error: findErr } = await adminClient
      .from('addresses')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle<Address>();

    if (findErr) {
      console.error('[PATCH /api/account/addresses/[id]] find error:', findErr);
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Lỗi máy chủ' },
        { status: 500 }
      );
    }
    if (!existing) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Không tìm thấy địa chỉ' },
        { status: 404 }
      );
    }

    if (parsed.data.is_default === true) {
      const { error: unsetErr } = await adminClient
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true)
        .neq('id', id);

      if (unsetErr) {
        console.error(
          '[PATCH /api/account/addresses/[id]] unset default error:',
          unsetErr
        );
        return NextResponse.json(
          { error: 'INTERNAL_ERROR', message: 'Lỗi máy chủ' },
          { status: 500 }
        );
      }
    }

    const { data: updated, error: updateErr } = await adminClient
      .from('addresses')
      .update(parsed.data)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single<Address>();

    if (updateErr || !updated) {
      console.error(
        '[PATCH /api/account/addresses/[id]] update error:',
        updateErr
      );
      return NextResponse.json(
        { error: 'UPDATE_FAILED', message: 'Không thể cập nhật địa chỉ' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updated });
  } catch (err) {
    return authErrorResponse(err, 'PATCH /api/account/addresses/[id]');
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { user, adminClient } = await requireCustomer();
    const { id } = context.params;

    if (!id) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Thiếu id địa chỉ' },
        { status: 400 }
      );
    }

    const { data: existing, error: findErr } = await adminClient
      .from('addresses')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (findErr) {
      console.error(
        '[DELETE /api/account/addresses/[id]] find error:',
        findErr
      );
      return NextResponse.json(
        { error: 'INTERNAL_ERROR', message: 'Lỗi máy chủ' },
        { status: 500 }
      );
    }
    if (!existing) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Không tìm thấy địa chỉ' },
        { status: 404 }
      );
    }

    const { error: delErr } = await adminClient
      .from('addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (delErr) {
      console.error(
        '[DELETE /api/account/addresses/[id]] delete error:',
        delErr
      );
      return NextResponse.json(
        { error: 'DELETE_FAILED', message: 'Không thể xoá địa chỉ' },
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return authErrorResponse(err, 'DELETE /api/account/addresses/[id]');
  }
}
