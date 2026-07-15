// Orders queries — server-side (Service role client).
// Mọi order truy vấn qua đây đều dùng admin client (bypass RLS).

import { createAdminClient } from '@/lib/supabase/admin';
import type { OrderRow, OrderItemRow, ProductRow } from '@/lib/supabase/types';

export interface CustomerOrderListItem {
  id: string;
  code: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  itemCount: number;
  thumbnailUrl: string | null;
}

export type OrderWithItems = OrderRow & {
  order_items: (OrderItemRow & {
    product: Pick<ProductRow, 'id' | 'slug' | 'title' | 'image_url'> | null;
  })[];
};

export async function getOrderByCode(code: string): Promise<OrderWithItems | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('orders')
    .select(
      `*, order_items(*, product:products(id, slug, title, image_url))`
    )
    .eq('code', code)
    .maybeSingle();
  if (error) throw error;
  return data as OrderWithItems | null;
}

export async function getOrderStatus(code: string): Promise<{
  code: string;
  status: OrderRow['status'];
  payment_status: OrderRow['payment_status'];
  payment_method: OrderRow['payment_method'];
  updated_at: string;
} | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('orders')
    .select('code, status, payment_status, payment_method, updated_at')
    .eq('code', code)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Lấy danh sách orders của 1 customer (cho trang /account/orders).
 * Trả về `{ data, total }` để client phân trang.
 *
 * - Dùng admin client để bypass RLS — caller (route handler) đã xác thực
 *   customer trước đó qua `requireCustomer()`.
 * - Mỗi order kèm `itemCount` (số order_items) và `thumbnailUrl` (ảnh đầu tiên,
 *   ưu tiên snapshot_image của order_item, fallback sang product.image_url).
 * - Mặc định limit = 20, offset = 0, max limit = 100.
 */
export async function getOrdersByCustomer(
  customerId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ data: CustomerOrderListItem[]; total: number }> {
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);
  const offset = Math.max(options?.offset ?? 0, 0);

  try {
    const supabase = createAdminClient();

    // Count tổng
    const { count, error: countError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customerId);

    if (countError) {
      console.error('[getOrdersByCustomer] count error:', countError);
      return { data: [], total: 0 };
    }

    // Lấy orders + items + product image
    const { data, error } = await supabase
      .from('orders')
      .select(
        `id, code, status, payment_status, total_amount, created_at,
         order_items(id, product_id, snapshot_image, product:products(image_url))`
      )
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[getOrdersByCustomer] query error:', error);
      return { data: [], total: 0 };
    }

    const items: CustomerOrderListItem[] = (data ?? []).map((row) => {
      const orderItems = (row.order_items ?? []) as Array<{
        snapshot_image: string;
        product: { image_url: string } | null;
      }>;
      const first = orderItems[0];
      const thumbnailUrl = first?.snapshot_image ?? first?.product?.image_url ?? null;
      return {
        id: row.id as string,
        code: row.code as string,
        status: row.status as string,
        paymentStatus: row.payment_status as string,
        totalAmount: Number(row.total_amount),
        createdAt: row.created_at as string,
        itemCount: orderItems.length,
        thumbnailUrl,
      };
    });

    return { data: items, total: count ?? 0 };
  } catch (err) {
    console.error('[getOrdersByCustomer] unexpected error:', err);
    return { data: [], total: 0 };
  }
}

/**
 * Sinh mã order theo format EV-YYYYMMDD-XXXX (4 số random, collision thấp).
 */
export async function generateOrderCode(): Promise<string> {
  const now = new Date();
  const ymd =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `EV-${ymd}-${rand}`;
}
