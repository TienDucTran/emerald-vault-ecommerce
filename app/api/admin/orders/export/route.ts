import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type { OrderRow } from '@/lib/supabase/types';

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
});

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      status: searchParams.get('status') ?? undefined,
      paymentStatus: searchParams.get('paymentStatus') ?? undefined,
      q: searchParams.get('q') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Tham số không hợp lệ' },
        { status: 400 }
      );
    }
    const { status, paymentStatus, q } = parsed.data;

    const admin = createAdminClient();
    let query = admin
      .from('orders')
      .select(
        'id, code, customer_name, customer_phone, customer_address, total_amount, shipping_fee, payment_method, payment_status, status, created_at'
      );

    if (status) query = query.eq('status', status);
    if (paymentStatus) query = query.eq('payment_status', paymentStatus);
    if (q) {
      const safe = q.replace(/[%_]/g, (m) => `\\${m}`);
      query = query.or(
        `code.ilike.%${safe}%,customer_name.ilike.%${safe}%,customer_phone.ilike.%${safe}%`
      );
    }

    const { data: orders, error } = await query
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error) {
      console.error('[admin/orders/export] error:', error);
      return NextResponse.json(
        { error: 'DB_ERROR', message: 'Không thể xuất CSV' },
        { status: 500 }
      );
    }

    const orderIds = (orders ?? []).map((o) => o.id);
    const itemsMap = new Map<string, string[]>();
    if (orderIds.length > 0) {
      const { data: items, error: itemsErr } = await admin
        .from('order_items')
        .select('order_id, snapshot_title')
        .in('order_id', orderIds);
      if (itemsErr) {
        console.error('[admin/orders/export] items error:', itemsErr);
      } else {
        for (const it of items ?? []) {
          const list = itemsMap.get(it.order_id) ?? [];
          list.push(it.snapshot_title);
          itemsMap.set(it.order_id, list);
        }
      }
    }

    const header = [
      'code',
      'customer_name',
      'customer_phone',
      'customer_address',
      'total_amount',
      'shipping_fee',
      'payment_method',
      'payment_status',
      'status',
      'created_at',
      'items_summary',
    ];
    const lines: string[] = [header.join(',')];
    for (const o of (orders ?? []) as OrderRow[]) {
      const titles = itemsMap.get(o.id) ?? [];
      lines.push(
        [
          csvCell(o.code),
          csvCell(o.customer_name),
          csvCell(o.customer_phone),
          csvCell(o.customer_address),
          csvCell(o.total_amount),
          csvCell(o.shipping_fee),
          csvCell(o.payment_method),
          csvCell(o.payment_status),
          csvCell(o.status),
          csvCell(o.created_at),
          csvCell(titles.join('; ')),
        ].join(',')
      );
    }

    const body = '\uFEFF' + lines.join('\r\n');
    const filename = `orders-${ymd(new Date())}.csv`;

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return authErrorResponse(err, 'admin/orders/export');
  }
}
