// Orders queries — server-side (Service role client).
// Mọi order truy vấn qua đây đều dùng admin client (bypass RLS).

import { createAdminClient } from '@/lib/supabase/admin';
import type { OrderRow, OrderItemRow, ProductRow } from '@/lib/supabase/types';

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
