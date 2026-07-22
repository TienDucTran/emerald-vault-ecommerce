import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { OrderRow, OrderItemRow } from '@/lib/supabase/types';
import type { OrderStatus, PaymentStatus } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const querySchema = z.object({
  status: z
    .enum(['NEW', 'CONFIRMED', 'SHIPPING', 'DONE', 'CANCELLED'])
    .optional(),
  paymentStatus: z
    .enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED'])
    .optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export interface OrderListItem {
  id: string;
  code: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  payment_method: OrderRow['payment_method'];
  payment_status: PaymentStatus;
  status: OrderStatus;
  created_at: string;
  items_count: number;
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      status: searchParams.get('status') ?? undefined,
      paymentStatus: searchParams.get('paymentStatus') ?? undefined,
      q: searchParams.get('q') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Tham số không hợp lệ' },
        { status: 400 }
      );
    }
    const { status, paymentStatus, q, page, limit } = parsed.data;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const admin = createAdminClient();

    let query = admin
      .from('orders')
      .select(
        'id, code, customer_name, customer_phone, total_amount, payment_method, payment_status, status, created_at',
        { count: 'exact' }
      );

    if (status) query = query.eq('status', status);
    if (paymentStatus) query = query.eq('payment_status', paymentStatus);
    if (q) {
      const safe = q.replace(/[%_]/g, (m) => `\\${m}`);
      query = query.or(
        `code.ilike.%${safe}%,customer_name.ilike.%${safe}%,customer_phone.ilike.%${safe}%`
      );
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('[admin/orders] list error:', error);
      return NextResponse.json(
        { error: 'DB_ERROR', message: 'Không thể tải danh sách đơn' },
        { status: 500 }
      );
    }

    const orderIds = ((data ?? []) as Array<{ id: string }>).map((o) => o.id);
    let itemsCountMap = new Map<string, number>();
    if (orderIds.length > 0) {
      const { data: items, error: itemsErr } = await admin
        .from('order_items')
        .select('order_id')
        .in('order_id', orderIds);
      if (itemsErr) {
        console.error('[admin/orders] items count error:', itemsErr);
      } else {
        for (const it of (items ?? []) as Pick<OrderItemRow, 'order_id'>[]) {
          itemsCountMap.set(
            it.order_id,
            (itemsCountMap.get(it.order_id) ?? 0) + 1
          );
        }
      }
    }

    const orders: OrderListItem[] = ((data ?? []) as any).map((o: any) => ({
      id: o.id,
      code: o.code,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      total_amount: o.total_amount,
      payment_method: o.payment_method,
      payment_status: o.payment_status,
      status: o.status,
      created_at: o.created_at,
      items_count: itemsCountMap.get(o.id) ?? 0,
    }));

    return NextResponse.json({
      orders,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    return authErrorResponse(err, 'admin/orders');
  }
}
