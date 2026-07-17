import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import type {
  OrderItemRow,
  OrderRow,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ORDER_STATUSES: OrderStatus[] = [
  'NEW',
  'CONFIRMED',
  'SHIPPING',
  'DONE',
  'CANCELLED',
];

const PAYMENT_STATUSES: PaymentStatus[] = [
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
];

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DONE'],
  DONE: [],
  CANCELLED: [],
};

const patchSchema = z
  .object({
    action: z.literal('confirm_bank_payment').optional(),
    status: z
      .enum(['NEW', 'CONFIRMED', 'SHIPPING', 'DONE', 'CANCELLED'])
      .optional(),
    payment_status: z
      .enum(['PENDING', 'PAID', 'FAILED', 'REFUNDED'])
      .optional(),
    adminNote: z.string().max(500).optional(),
  })
  .refine(
    (v) =>
      v.action === 'confirm_bank_payment' ||
      v.status !== undefined ||
      v.payment_status !== undefined,
    { message: 'Không có trường nào để cập nhật' }
  );

export interface OrderDetailItem extends OrderItemRow {
  product: { id: string; slug: string } | null;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const id = params.id;
    if (!id) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Thiếu id' },
        { status: 400 }
      );
    }
    const admin = createAdminClient();

    const { data: order, error: orderErr } = await admin
      .from('orders')
      .select('*')
      .eq('id', id)
      .single<OrderRow>();

    if (orderErr || !order) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Không tìm thấy đơn hàng' },
        { status: 404 }
      );
    }

    const { data: itemsRaw, error: itemsErr } = await admin
      .from('order_items')
      .select('id, order_id, product_id, price, snapshot_title, snapshot_image, snapshot_material, product:products!order_items_product_id_fkey(id, slug)')
      .eq('order_id', id);

    if (itemsErr) {
      console.error('[admin/orders/:id] items error:', itemsErr);
      return NextResponse.json(
        { error: 'DB_ERROR', message: 'Không thể tải sản phẩm' },
        { status: 500 }
      );
    }

    const items: OrderDetailItem[] = (itemsRaw ?? []).map((row) => {
      const r = row as OrderItemRow & {
        product: { id: string; slug: string } | null;
      };
      return {
        id: r.id,
        order_id: r.order_id,
        product_id: r.product_id,
        price: r.price,
        snapshot_title: r.snapshot_title,
        snapshot_image: r.snapshot_image,
        snapshot_material: r.snapshot_material,
        product: r.product ?? null,
      };
    });

    return NextResponse.json({ order, items });
  } catch (err) {
    return authErrorResponse(err, 'admin/orders/:id');
  }
}

async function handleConfirmBankPayment(
  orderId: string,
  adminNote?: string
): Promise<NextResponse> {
  const admin = createAdminClient();
  const db = admin as any;

  // 1. Verify order + payment_method
  const { data: order, error: orderErr } = await admin
    .from('orders')
    .select('id, status, payment_method, payment_status')
    .eq('id', orderId)
    .single<{
      id: string;
      status: OrderStatus;
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
    }>();

  if (orderErr || !order) {
    return NextResponse.json(
      { error: 'NOT_FOUND', message: 'Không tìm thấy đơn hàng' },
      { status: 404 }
    );
  }
  if (order.payment_method !== 'BANK_TRANSFER') {
    return NextResponse.json(
      {
        error: 'NOT_BANK_TRANSFER',
        message: 'Đơn không dùng chuyển khoản ngân hàng',
      },
      { status: 400 }
    );
  }

  // 2. Find bank_transfer
  const { data: bt, error: btErr } = await db
    .from('bank_transfers')
    .select('id, admin_confirmed_at')
    .eq('order_id', orderId)
    .maybeSingle();

  if (btErr) {
    console.error('[admin/orders/:id] bank_transfers find error:', btErr);
    return NextResponse.json(
      { error: 'DB_ERROR', message: 'Không thể tải thông tin CK' },
      { status: 500 }
    );
  }
  if (!bt) {
    return NextResponse.json(
      {
        error: 'NO_BANK_TRANSFER',
        message: 'Không tìm thấy thông tin chuyển khoản',
      },
      { status: 404 }
    );
  }
  if (bt.admin_confirmed_at) {
    return NextResponse.json(
      {
        error: 'ALREADY_CONFIRMED',
        message: 'Đơn đã được admin xác nhận trước đó',
      },
      { status: 409 }
    );
  }

  // 3. Update bank_transfers
  const nowIso = new Date().toISOString();
  const { data: bankTransfer, error: btUpErr } = await db
    .from('bank_transfers')
    .update({
      admin_confirmed_at: nowIso,
      admin_note: adminNote?.trim() || null,
    })
    .eq('id', bt.id)
    .select('*')
    .single();

  if (btUpErr || !bankTransfer) {
    console.error('[admin/orders/:id] bank_transfers update error:', btUpErr);
    return NextResponse.json(
      { error: 'DB_ERROR', message: 'Cập nhật bank_transfer thất bại' },
      { status: 500 }
    );
  }

  // 4. Update order → CONFIRMED + PAID
  const { data: updatedOrder, error: orderUpErr } = await admin
    .from('orders')
    .update({
      status: 'CONFIRMED',
      payment_status: 'PAID',
      updated_at: nowIso,
    })
    .eq('id', orderId)
    .select('*')
    .single<OrderRow>();

  if (orderUpErr || !updatedOrder) {
    console.error('[admin/orders/:id] order confirm error:', orderUpErr);
    return NextResponse.json(
      { error: 'DB_ERROR', message: 'Cập nhật đơn thất bại' },
      { status: 500 }
    );
  }

  // 5. Convert inventory_locks ACTIVE → CONVERTED cho order này
  const { error: lockUpErr } = await admin
    .from('inventory_locks')
    .update({ status: 'CONVERTED' })
    .eq('order_id', orderId)
    .eq('status', 'ACTIVE');

  if (lockUpErr) {
    console.error('[admin/orders/:id] inventory_locks convert error:', lockUpErr);
    // Không rollback — vẫn trả success, log để theo dõi
  }

  // 6. Set products.status = SOLD_OUT cho products trong order_items (RESERVED/AVAILABLE → SOLD_OUT)
  const { error: prodUpErr } = await (admin.rpc as any)(
    'mark_products_sold_out',
    { p_order_id: orderId }
  );
  if (prodUpErr) {
    console.error(
      '[admin/orders/:id] mark_products_sold_out failed:',
      prodUpErr.message
    );
  }

  return NextResponse.json({ order: updatedOrder, bankTransfer });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const id = params.id;
    if (!id) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Thiếu id' },
        { status: 400 }
      );
    }
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Body không phải JSON' },
        { status: 400 }
      );
    }
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }
    const { status, payment_status, action, adminNote } = parsed.data;

    // Branch: confirm_bank_payment (atomic, no order status check on schema)
    if (action === 'confirm_bank_payment') {
      return await handleConfirmBankPayment(id, adminNote);
    }

    if (!status && !payment_status) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Không có trường nào để cập nhật' },
        { status: 400 }
      );
    }
    if (status && !ORDER_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Trạng thái không hợp lệ' },
        { status: 400 }
      );
    }
    if (payment_status && !PAYMENT_STATUSES.includes(payment_status)) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'payment_status không hợp lệ' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: current, error: curErr } = await admin
      .from('orders')
      .select('id, status, payment_status')
      .eq('id', id)
      .single<{
        id: string;
        status: OrderStatus;
        payment_status: PaymentStatus;
      }>();

    if (curErr || !current) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Không tìm thấy đơn hàng' },
        { status: 404 }
      );
    }

    if (status && status !== current.status) {
      const allowed = ALLOWED_TRANSITIONS[current.status] ?? [];
      if (!allowed.includes(status)) {
        return NextResponse.json(
          {
            error: 'INVALID_TRANSITION',
            message: `Không thể chuyển ${current.status} → ${status}`,
          },
          { status: 400 }
        );
      }
    }

    const update: Partial<OrderRow> = {};
    if (status) update.status = status;
    if (payment_status) update.payment_status = payment_status;
    update.updated_at = new Date().toISOString();

    const { data: order, error: upErr } = await admin
      .from('orders')
      .update(update)
      .eq('id', id)
      .select('*')
      .single<OrderRow>();

    if (upErr || !order) {
      console.error('[admin/orders/:id] update error:', upErr);
      return NextResponse.json(
        { error: 'DB_ERROR', message: 'Cập nhật thất bại' },
        { status: 500 }
      );
    }

    // Side-effect cleanup: when moving to CANCELLED and no payment was received,
    // release the inventory locks and restore products to AVAILABLE.
    if (status === 'CANCELLED' && current.status !== 'CANCELLED') {
      if (
        current.payment_status === 'PENDING' ||
        current.payment_status === 'FAILED'
      ) {
        const { error: lockRelErr } = await admin
          .from('inventory_locks')
          .update({
            status: 'RELEASED',
            released_at: new Date().toISOString(),
          })
          .eq('order_id', id)
          .eq('status', 'ACTIVE');
        if (lockRelErr) {
          console.error(
            '[admin/orders/:id] inventory_locks release error:',
            lockRelErr
          );
        }

        // 2. Restore products to AVAILABLE — via RPC for safety (only RESERVED → AVAILABLE, never touches SOLD_OUT)
        const { error: relResErr } = await (admin.rpc as any)(
          'release_product_reservation',
          { p_order_id: id }
        );
        if (relResErr) {
          console.error(
            '[admin/orders/:id PATCH] release_product_reservation failed:',
            relResErr.message
          );
          // Non-fatal — order is already CANCELLED
        }
      }
    }

    return NextResponse.json({ order });
  } catch (err) {
    return authErrorResponse(err, 'admin/orders/:id PATCH');
  }
}
