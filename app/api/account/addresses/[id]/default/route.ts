/**
 * /api/account/addresses/[id]/default
 *
 *   POST — Set địa chỉ này làm default. Unset các default khác của user.
 *
 * Auth: requireCustomer. Write qua admin client.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { authErrorResponse, requireCustomer } from '@/lib/auth/require-customer';
import type { Address } from '@/lib/types/account';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface RouteContext {
  params: { id: string };
}

export async function POST(_request: NextRequest, context: RouteContext) {
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
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle<Address>();

    if (findErr) {
      console.error(
        '[POST /api/account/addresses/[id]/default] find error:',
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

    if (!existing.is_default) {
      const { error: unsetErr } = await adminClient
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true)
        .neq('id', id);

      if (unsetErr) {
        console.error(
          '[POST /api/account/addresses/[id]/default] unset error:',
          unsetErr
        );
        return NextResponse.json(
          { error: 'INTERNAL_ERROR', message: 'Lỗi máy chủ' },
          { status: 500 }
        );
      }

      const { data: updated, error: updateErr } = await adminClient
        .from('addresses')
        .update({ is_default: true })
        .eq('id', id)
        .eq('user_id', user.id)
        .select('*')
        .single<Address>();

      if (updateErr || !updated) {
        console.error(
          '[POST /api/account/addresses/[id]/default] update error:',
          updateErr
        );
        return NextResponse.json(
          { error: 'UPDATE_FAILED', message: 'Không thể đặt địa chỉ mặc định' },
          { status: 500 }
        );
      }

      return NextResponse.json({ data: updated });
    }

    return NextResponse.json({ data: existing });
  } catch (err) {
    return authErrorResponse(err, 'POST /api/account/addresses/[id]/default');
  }
}
