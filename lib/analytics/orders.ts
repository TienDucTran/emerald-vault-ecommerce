/**
 * Orders aggregation — query Supabase cho các số liệu orders.
 *
 * Chỉ dùng để tính:
 *   - Total revenue (orders PAID trong range)
 *   - AOV (Average Order Value)
 *   - Order count, new customers
 *   - Top products by revenue (join order_items + product snapshot)
 *
 * KHÔNG dùng GA4 cho những số liệu này vì GA4 không biết giá trị đơn hàng
 * (trừ khi bạn gửi purchase event với value — nhưng admin cần số LIỀN từ DB).
 */
import { createAdminClient } from '@/lib/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, OrderRow } from '@/lib/supabase/types';
import { expandRange, type AnalyticsRange } from './range';

export type DateRange = AnalyticsRange;

export interface OrderStats {
  totalRevenue: number;
  orderCount: number;
  aov: number;
  paidCount: number;
  cancelledCount: number;
}

export async function getOrderStats(
  range: DateRange,
  client?: SupabaseClient<Database, 'public'>
): Promise<OrderStats> {
  const sb = client ?? createAdminClient();
  const { startIso, endIso } = expandRange(range);

  const { data, error } = await sb
    .from('orders')
    .select('id, total_amount, payment_status, status, created_at')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  if (error) {
    console.error('[analytics/orders] getOrderStats failed:', error);
    return { totalRevenue: 0, orderCount: 0, aov: 0, paidCount: 0, cancelledCount: 0 };
  }

  const orders = (data ?? []) as Pick<
    OrderRow,
    'id' | 'total_amount' | 'payment_status' | 'status'
  >[];

  const paid = orders.filter((o) => o.payment_status === 'PAID');
  const totalRevenue = paid.reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0);
  const paidCount = paid.length;
  const orderCount = orders.length;
  const cancelledCount = orders.filter((o) => o.status === 'CANCELLED').length;
  const aov = paidCount > 0 ? Math.round(totalRevenue / paidCount) : 0;

  return { totalRevenue, orderCount, aov, paidCount, cancelledCount };
}

export interface TopProductRow {
  productId: string;
  title: string;
  image: string;
  category: string | null;
  material: string | null;
  qualityTier: string | null;
  unitsSold: number;
  revenue: number;
}

/**
 * Top sản phẩm theo doanh thu (PAID orders) trong range.
 * Join order_items với orders để lấy paid only.
 */
export async function getTopProductsByRevenue(
  range: DateRange,
  limit = 5,
  client?: SupabaseClient<Database, 'public'>
): Promise<TopProductRow[]> {
  const sb = client ?? createAdminClient();
  const { startIso, endIso } = expandRange(range);

  const { data, error } = await sb
    .from('order_items')
    .select(
      `
      product_id,
      price,
      snapshot_title,
      snapshot_image,
      snapshot_material,
      order:orders!inner (
        payment_status,
        created_at
      )
    `
    )
    .eq('order.payment_status', 'PAID')
    .gte('order.created_at', startIso)
    .lte('order.created_at', endIso);

  if (error) {
    console.error('[analytics/orders] getTopProductsByRevenue failed:', error);
    return [];
  }

  // Aggregate
  const agg = new Map<
    string,
    {
      productId: string;
      title: string;
      image: string;
      material: string | null;
      unitsSold: number;
      revenue: number;
    }
  >();

  type Row = {
    product_id: string;
    price: number;
    snapshot_title: string;
    snapshot_image: string;
    snapshot_material: string | null;
    order: { payment_status: string; created_at: string } | { payment_status: string; created_at: string }[];
  };

  for (const raw of (data ?? []) as unknown as Row[]) {
    const order = Array.isArray(raw.order) ? raw.order[0] : raw.order;
    if (!order || order.payment_status !== 'PAID') continue;
    const existing = agg.get(raw.product_id);
    if (existing) {
      existing.unitsSold += 1;
      existing.revenue += Number(raw.price);
    } else {
      agg.set(raw.product_id, {
        productId: raw.product_id,
        title: raw.snapshot_title,
        image: raw.snapshot_image,
        material: raw.snapshot_material,
        unitsSold: 1,
        revenue: Number(raw.price),
      });
    }
  }

  // Top N by revenue
  const sorted = Array.from(agg.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);

  if (sorted.length === 0) return [];

  // Lấy thêm category + quality_tier từ products (best-effort — nếu product đã xoá thì skip)
  const ids = sorted.map((r) => r.productId);
  const { data: products } = await sb
    .from('products')
    .select('id, category, quality_tier')
    .in('id', ids);
  const meta = new Map<string, { category: string | null; quality_tier: string | null }>();
  for (const p of (products ?? []) as Array<{
    id: string;
    category: string | null;
    quality_tier: string | null;
  }>) {
    meta.set(p.id, { category: p.category, quality_tier: p.quality_tier });
  }

  return sorted.map((row) => {
    const m = meta.get(row.productId);
    return {
      productId: row.productId,
      title: row.title,
      image: row.image,
      category: m?.category ?? null,
      material: row.material,
      qualityTier: m?.quality_tier ?? null,
      unitsSold: row.unitsSold,
      revenue: row.revenue,
    };
  });
}

/** Lịch sử orders theo ngày — dùng cho chart revenue. */
export interface DailyRevenue {
  date: string;
  revenue: number;
  orderCount: number;
}

export async function getDailyRevenue(
  range: DateRange,
  client?: SupabaseClient<Database, 'public'>
): Promise<DailyRevenue[]> {
  const sb = client ?? createAdminClient();
  const { startIso, endIso } = expandRange(range);

  const { data, error } = await sb
    .from('orders')
    .select('total_amount, payment_status, created_at')
    .eq('payment_status', 'PAID')
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  if (error) {
    console.error('[analytics/orders] getDailyRevenue failed:', error);
    return [];
  }

  const byDay = new Map<string, { revenue: number; orderCount: number }>();
  for (const row of (data ?? []) as Array<Pick<OrderRow, 'total_amount' | 'created_at'>>) {
    const d = new Date(row.created_at);
    const key = d.toISOString().slice(0, 10);
    const cur = byDay.get(key) ?? { revenue: 0, orderCount: 0 };
    cur.revenue += Number(row.total_amount);
    cur.orderCount += 1;
    byDay.set(key, cur);
  }

  return Array.from(byDay.entries())
    .map(([date, v]) => ({ date, revenue: v.revenue, orderCount: v.orderCount }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
