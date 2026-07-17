import { NextResponse } from 'next/server';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/admin/orders/[id]/bank-transfer
 * Lấy thông tin bank_transfer (1:1) theo order_id.
 *
 * Auth: requireAdmin.
 * Response: { bankTransfer: {...} | null }
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const orderId = params.id;
    if (!orderId) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Thiếu id' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const db = admin as any;

    const { data, error } = await db
      .from('bank_transfers')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (error) {
      console.error('[admin/orders/:id/bank-transfer] error:', error);
      return NextResponse.json(
        { error: 'DB_ERROR', message: 'Không thể tải thông tin CK' },
        { status: 500 }
      );
    }

    return NextResponse.json({ bankTransfer: data ?? null });
  } catch (err) {
    return authErrorResponse(err, 'admin/orders/:id/bank-transfer');
  }
}
