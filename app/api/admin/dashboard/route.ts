/**
 * /api/admin/dashboard
 *
 *   GET — Trả về data tổng hợp cho Admin Dashboard Overview:
 *     - kpis (revenue, orders, products, locks, subscribers...)
 *     - recentOrders, lowStockProducts, pendingOrders, expiringLocks
 *     - revenueChart (30 ngày)
 *
 *   Auth: requireAdmin.
 *
 *   Note: Dashboard page `/admin` thường fetch trực tiếp ở Server Component
 *   qua `getDashboardData()` trong `lib/analytics/dashboard.ts`. API này dùng
 *   cho Client Component refresh button (nếu cần) hoặc external consumers.
 */
import { NextResponse } from 'next/server';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';
import { getDashboardData } from '@/lib/analytics/dashboard';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireAdmin();
    const data = await getDashboardData();
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return authErrorResponse(err, 'admin/dashboard');
  }
}
