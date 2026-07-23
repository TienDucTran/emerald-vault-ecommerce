/**
 * /api/admin/dashboard — data layer
 *
 * Tổng hợp số liệu cho Admin Dashboard Overview:
 *   - KPIs (revenue, orders, products, locks, subscribers...)
 *   - Recent orders (5 mới nhất)
 *   - Low stock products (AVAILABLE cũ nhất)
 *   - Pending orders
 *   - Expiring locks (ACTIVE sắp hết hạn)
 *   - Daily revenue 30 ngày
 *
 * Pattern: parallel Promise.all với supabaseAdmin.
 */
import { createAdminClient } from '@/lib/supabase/admin';
import type { OrderRow } from '@/lib/supabase/types';

export interface DashboardKpis {
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  totalOrders: number;
  ordersThisMonth: number;
  ordersLastMonth: number;
  ordersPending: number;
  pendingBankConfirmations: number;
  pendingRefundRequests: number;
  totalProducts: number;
  productsAvailable: number;
  productsSoldOut: number;
  activeLocks: number;
  totalCollections: number;
  publishedCollections: number;
  totalSubscribers: number;
}

export interface DashboardRecentOrder {
  id: string;
  code: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export interface DashboardLowStockProduct {
  id: string;
  title: string;
  slug: string;
  price: number;
  image_url: string;
  status: string;
  created_at: string;
}

export interface DashboardExpiringLock {
  id: string;
  product_id: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export interface DashboardDailyPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface DashboardData {
  kpis: DashboardKpis;
  recentOrders: DashboardRecentOrder[];
  lowStockProducts: DashboardLowStockProduct[];
  pendingOrders: DashboardRecentOrder[];
  expiringLocks: DashboardExpiringLock[];
  revenueChart: DashboardDailyPoint[];
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function startOfNextMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getDashboardData(): Promise<DashboardData> {
  const sb = createAdminClient();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = startOfNextMonth(now);
  const lastMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0)
  );
  const lastMonthEnd = monthStart;

  // 30-day window for revenue chart
  const chartStart = new Date(now);
  chartStart.setUTCDate(chartStart.getUTCDate() - 29);
  chartStart.setUTCHours(0, 0, 0, 0);

  const monthStartIso = monthStart.toISOString();
  const monthEndIso = monthEnd.toISOString();
  const lastMonthStartIso = lastMonthStart.toISOString();
  const lastMonthEndIso = lastMonthEnd.toISOString();
  const chartStartIso = chartStart.toISOString();
  const nowIso = now.toISOString();
  const lockExpiringBeforeIso = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  const [
    ordersPaidAll,
    ordersPaidThisMonth,
    ordersPaidLastMonth,
    ordersAll,
    ordersThisMonth,
    ordersLastMonth,
    ordersPending,
    bankConfirmPending,
    refundRequestsPending,
    productsAll,
    productsAvail,
    productsSold,
    locksActive,
    collectionsAll,
    collectionsPublished,
    subsTotal,
    recentOrdersRes,
    lowStockRes,
    pendingOrdersRes,
    expiringLocksRes,
    paid30d,
  ] = await Promise.all([
    // Total revenue all time (PAID)
    sb
      .from('orders')
      .select('total_amount')
      .eq('payment_status', 'PAID'),
    // Revenue this month
    sb
      .from('orders')
      .select('total_amount')
      .eq('payment_status', 'PAID')
      .gte('created_at', monthStartIso)
      .lt('created_at', monthEndIso),
    // Revenue last month
    sb
      .from('orders')
      .select('total_amount')
      .eq('payment_status', 'PAID')
      .gte('created_at', lastMonthStartIso)
      .lt('created_at', lastMonthEndIso),
    // Total orders
    sb.from('orders').select('id', { count: 'exact', head: true }),
    // Orders this month
    sb
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', monthStartIso)
      .lt('created_at', monthEndIso),
    // Orders last month (for delta)
    sb
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', lastMonthStartIso)
      .lt('created_at', lastMonthEndIso),
    // Pending orders (status NEW)
    sb
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'NEW'),
    // Bank confirmations pending (status WAITING_CONFIRM + BANK_TRANSFER)
    sb
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'WAITING_CONFIRM')
      .eq('payment_method', 'BANK_TRANSFER'),
    // Refund requests pending (customer yêu cầu hoàn tiền, admin chưa xử lý)
    sb
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('payment_status', 'REFUND_REQUESTED'),
    // Products counts
    sb.from('products').select('id', { count: 'exact', head: true }),
    sb
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'AVAILABLE'),
    sb
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'SOLD_OUT'),
    // Active locks
    sb
      .from('inventory_locks')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ACTIVE')
      .gt('expires_at', nowIso),
    // Collections counts
    sb.from('collections').select('id', { count: 'exact', head: true }),
    sb
      .from('collections')
      .select('id', { count: 'exact', head: true })
      .eq('is_published', true),
    // Active subscribers
    sb
      .from('newsletter_subscribers')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    // Recent orders (5)
    sb
      .from('orders')
      .select('id, code, customer_name, total_amount, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    // Low stock — AVAILABLE cũ nhất (sản phẩm 1-1 nên coi như sắp hết nếu lâu không bán)
    sb
      .from('products')
      .select('id, title, slug, price, image_url, status, created_at')
      .eq('status', 'AVAILABLE')
      .order('created_at', { ascending: true })
      .limit(5),
    // Pending orders (5)
    sb
      .from('orders')
      .select('id, code, customer_name, total_amount, status, created_at')
      .eq('status', 'NEW')
      .order('created_at', { ascending: true })
      .limit(5),
    // Expiring locks (ACTIVE expires < now + 5min)
    sb
      .from('inventory_locks')
      .select('id, product_id, status, expires_at, created_at')
      .eq('status', 'ACTIVE')
      .lt('expires_at', lockExpiringBeforeIso)
      .gt('expires_at', nowIso)
      .order('expires_at', { ascending: true })
      .limit(5),
    // Paid orders 30 ngày cho daily revenue chart
    sb
      .from('orders')
      .select('total_amount, created_at')
      .eq('payment_status', 'PAID')
      .gte('created_at', chartStartIso),
  ]);

  const sumAmount = (rows: { total_amount: number | null }[] | null): number =>
    (rows ?? []).reduce((s, r) => s + Number(r.total_amount ?? 0), 0);

  const kpis: DashboardKpis = {
    totalRevenue: sumAmount(ordersPaidAll.data),
    revenueThisMonth: sumAmount(ordersPaidThisMonth.data),
    revenueLastMonth: sumAmount(ordersPaidLastMonth.data),
    totalOrders: ordersAll.count ?? 0,
    ordersThisMonth: ordersThisMonth.count ?? 0,
    ordersLastMonth: ordersLastMonth.count ?? 0,
    ordersPending: ordersPending.count ?? 0,
    pendingBankConfirmations: bankConfirmPending.count ?? 0,
    pendingRefundRequests: refundRequestsPending.count ?? 0,
    totalProducts: productsAll.count ?? 0,
    productsAvailable: productsAvail.count ?? 0,
    productsSoldOut: productsSold.count ?? 0,
    activeLocks: locksActive.count ?? 0,
    totalCollections: collectionsAll.count ?? 0,
    publishedCollections: collectionsPublished.count ?? 0,
    totalSubscribers: subsTotal.count ?? 0,
  };

  // Daily revenue bucket
  const buckets = new Map<string, { revenue: number; orders: number }>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(chartStart);
    d.setUTCDate(chartStart.getUTCDate() + i);
    buckets.set(isoDate(d), { revenue: 0, orders: 0 });
  }
  for (const row of (paid30d.data ?? []) as Pick<OrderRow, 'total_amount' | 'created_at'>[]) {
    const key = isoDate(new Date(row.created_at));
    const cur = buckets.get(key);
    if (cur) {
      cur.revenue += Number(row.total_amount);
      cur.orders += 1;
    }
  }
  const revenueChart: DashboardDailyPoint[] = Array.from(buckets.entries()).map(
    ([date, v]) => ({ date, revenue: v.revenue, orders: v.orders })
  );

  return {
    kpis,
    recentOrders: (recentOrdersRes.data ?? []) as DashboardRecentOrder[],
    lowStockProducts: (lowStockRes.data ?? []) as unknown as DashboardLowStockProduct[],
    pendingOrders: (pendingOrdersRes.data ?? []) as DashboardRecentOrder[],
    expiringLocks: (expiringLocksRes.data ?? []) as DashboardExpiringLock[],
    revenueChart,
  };
}