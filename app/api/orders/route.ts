// POST /api/orders — tạo order mới
// Body:
//   {
//     items: [{ productId, price, title, image, material? }],
//     customer: { name, phone, email?, address, province?, district?, notes? },
//     payment: 'MOMO' | 'COD' | 'BANK_TRANSFER',
//     clientId?: string
//   }
//
// Response 200: { ok: true, order: { id, code, status, paymentMethod } }
// Response 4xx: { ok: false, error }
//
// Logic:
//  1. Verify mỗi product tồn tại + AVAILABLE
//  2. (MOMO) Lock items qua RPC lock_item với clientId
//  3. Insert order + order_items
//  4. (COD) Set products SOLD_OUT + locks CONVERTED
//  5. (MOMO) Set locks = CONVERTED chỉ khi IPN confirm thành công
//     → ở đây chỉ tạo order PENDING, status = NEW, payment = PENDING

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateOrderCode } from '@/lib/supabase/queries/orders';

const ItemSchema = z.object({
  productId: z.string().uuid(),
  price: z.number().int().positive(),
  title: z.string().min(1).max(255),
  image: z.string().url(),
  material: z.enum(['BAC_925', 'MA_VANG_18K', 'MA_VANG_24K', 'VANG_18K', 'KIM_CUONG']).optional(),
});

const CustomerSchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(8).max(20),
  email: z.string().email().optional(),
  address: z.string().min(1),
  province: z.string().max(80).optional(),
  district: z.string().max(80).optional(),
  notes: z.string().max(2000).optional(),
});

const Body = z.object({
  items: z.array(ItemSchema).min(1).max(20),
  customer: CustomerSchema,
  payment: z.enum(['MOMO', 'COD', 'BANK_TRANSFER']),
  clientId: z.string().min(8).optional(),
});

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_BODY', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { items, customer, payment, clientId } = parsed.data;

  const supabase = createAdminClient();

  // 1. Verify products còn AVAILABLE
  const productIds = items.map((i) => i.productId);
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, status, title, image_url, price, material, slug')
    .in('id', productIds);
  if (prodError) {
    return NextResponse.json({ ok: false, error: prodError.message }, { status: 500 });
  }
  if (!products || products.length !== productIds.length) {
    return NextResponse.json({ ok: false, error: 'PRODUCT_NOT_FOUND' }, { status: 404 });
  }
  const soldOut = products.find((p) => p.status === 'SOLD_OUT');
  if (soldOut) {
    return NextResponse.json(
      { ok: false, error: 'PRODUCT_SOLD_OUT', productId: soldOut.id },
      { status: 410 }
    );
  }

  // 2. (MOMO) Lock từng sản phẩm (atomic qua RPC)
  const locks: { productId: string; lockId: string }[] = [];
  if (payment === 'MOMO' && clientId) {
    for (const it of items) {
      const { data: lock, error: lockErr } = await supabase.rpc('lock_item', {
        p_product_id: it.productId,
        p_client_id: clientId,
      });
      if (lockErr) {
        // Rollback locks đã tạo
        for (const l of locks) {
          await supabase
            .from('inventory_locks')
            .update({ status: 'RELEASED', released_at: new Date().toISOString() })
            .eq('id', l.lockId);
        }
        return NextResponse.json(
          { ok: false, error: lockErr.message },
          { status: lockErr.message.includes('LOCKED_BY_OTHER') ? 409 : 500 }
        );
      }
      const lockRow = Array.isArray(lock) ? lock[0] : lock;
      locks.push({ productId: it.productId, lockId: lockRow.id });
    }
  }

  // 3. Tạo order
  const code = await generateOrderCode();
  const totalAmount = items.reduce((s, i) => s + i.price, 0);
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      code,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_email: customer.email ?? null,
      customer_address: customer.address,
      province: customer.province ?? null,
      district: customer.district ?? null,
      notes: customer.notes ?? null,
      total_amount: totalAmount,
      shipping_fee: 0,
      payment_method: payment,
      payment_status: 'PENDING',
      status: 'NEW',
    })
    .select('id, code, status, payment_status, payment_method, total_amount')
    .single();
  if (orderErr || !order) {
    return NextResponse.json(
      { ok: false, error: orderErr?.message ?? 'ORDER_INSERT_FAILED' },
      { status: 500 }
    );
  }

  // 4. Tạo order_items
  const { error: itemsErr } = await supabase.from('order_items').insert(
    items.map((it) => ({
      order_id: order.id,
      product_id: it.productId,
      price: it.price,
      snapshot_title: it.title,
      snapshot_image: it.image,
      snapshot_material: it.material ?? null,
    }))
  );
  if (itemsErr) {
    return NextResponse.json({ ok: false, error: itemsErr.message }, { status: 500 });
  }

  // 5. (MOMO) Gắn locks.order_id = order.id (sẽ set CONVERTED khi IPN OK)
  if (payment === 'MOMO' && locks.length > 0) {
    await supabase
      .from('inventory_locks')
      .update({ order_id: order.id })
      .in('id', locks.map((l) => l.lockId));
  }

  // 6. (COD) Convert locks + set SOLD_OUT ngay
  if (payment === 'COD') {
    if (locks.length > 0) {
      await supabase
        .from('inventory_locks')
        .update({ status: 'CONVERTED', order_id: order.id })
        .in('id', locks.map((l) => l.lockId));
    }
    await supabase
      .from('products')
      .update({ status: 'SOLD_OUT' })
      .in('id', productIds);
  }

  return NextResponse.json({
    ok: true,
    order: {
      id: order.id,
      code: order.code,
      status: order.status,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      totalAmount: order.total_amount,
    },
  });
}
