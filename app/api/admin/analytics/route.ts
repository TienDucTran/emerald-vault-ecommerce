/**
 * /api/admin/analytics
 *
 *   GET ?days=7 — tổng hợp số liệu cho trang admin/analytics:
 *     - GA4 (sessions, events, key events, new users, bounce, realtime active)
 *     - Supabase (orders revenue, AOV, top products, daily revenue)
 *
 *   Response 200: {
 *     ok: true,
 *     data: AnalyticsResponse,
 *     meta: { ga4Configured, days, generatedAt }
 *   }
 *
 *   Khi GA4 chưa configure → trả `ga4Configured: false` và số liệu GA4 = null;
 *   page vẫn render được (orders vẫn lấy từ Supabase, các card GA4 hiển thị "—").
 *
 * Auth: requireAdmin (xem middleware.ts).
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';
import { isGA4Configured } from '@/lib/analytics/ga4';
import {
  defaultRange,
  previousRange,
  getSessions,
  getEventCount,
  getKeyEvents,
  getNewUsers,
  getTotalUsers,
  getBounceRate,
  getActiveUsers30m,
  getSessionsByDay,
  getSessionsByCountry,
  pctDelta,
} from '@/lib/analytics/queries';
import {
  getOrderStats,
  getTopProductsByRevenue,
  getDailyRevenue,
} from '@/lib/analytics/orders';

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(7),
});

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse({
      days: searchParams.get('days') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'BAD_REQUEST', message: 'days phải 1..90' },
        { status: 400 }
      );
    }
    const days = parsed.data.days;
    const range = defaultRange(days);
    const prev = previousRange(days);
    const ga4On = isGA4Configured();

    // === GA4 (parallel) ===
    const [
      sessions,
      prevSessions,
      eventCount,
      keyEvents,
      newUsers,
      prevNewUsers,
      totalUsers,
      bounceRate,
      active30m,
      dailySessions,
      countrySessions,
    ] = await Promise.all([
      ga4On ? getSessions(range) : Promise.resolve(null),
      ga4On ? getSessions(prev) : Promise.resolve(null),
      ga4On ? getEventCount(range) : Promise.resolve(null),
      ga4On ? getKeyEvents(range) : Promise.resolve(null),
      ga4On ? getNewUsers(range) : Promise.resolve(null),
      ga4On ? getNewUsers(prev) : Promise.resolve(null),
      ga4On ? getTotalUsers(range) : Promise.resolve(null),
      ga4On ? getBounceRate(range) : Promise.resolve(null),
      ga4On ? getActiveUsers30m() : Promise.resolve(null),
      ga4On ? getSessionsByDay(range) : Promise.resolve(null),
      ga4On ? getSessionsByCountry(range) : Promise.resolve(null),
    ]);

    // === Orders (Supabase) ===
    const [orderStats, topProducts, dailyRevenue] = await Promise.all([
      getOrderStats(range),
      getTopProductsByRevenue(range, 5),
      getDailyRevenue(range),
    ]);

    const prevOrderStats = await getOrderStats(prev);

    // === Conversion rate (orders.paid / sessions) ===
    const conversionRate =
      sessions && sessions > 0 && orderStats.paidCount > 0
        ? (orderStats.paidCount / sessions) * 100
        : null;
    const prevConversionRate =
      prevSessions && prevSessions > 0 && prevOrderStats.paidCount > 0
        ? (prevOrderStats.paidCount / prevSessions) * 100
        : null;

    const response = {
      ok: true as const,
      data: {
        range: { startDate: range.startDate, endDate: range.endDate, days },
        ga4: {
          configured: ga4On,
          sessions,
          sessionsDelta: pctDelta(sessions, prevSessions),
          eventCount,
          keyEvents,
          newUsers,
          newUsersDelta: pctDelta(newUsers, prevNewUsers),
          totalUsers,
          bounceRate, // 0..1
          activeUsers30m: active30m,
          dailySessions: dailySessions ?? [],
          countrySessions: countrySessions ?? [],
        },
        orders: {
          totalRevenue: orderStats.totalRevenue,
          revenueDelta: pctDelta(orderStats.totalRevenue, prevOrderStats.totalRevenue),
          orderCount: orderStats.orderCount,
          paidCount: orderStats.paidCount,
          cancelledCount: orderStats.cancelledCount,
          aov: orderStats.aov,
          aovDelta: pctDelta(orderStats.aov, prevOrderStats.aov),
          conversionRate, // %
          conversionRateDelta: pctDelta(conversionRate, prevConversionRate),
          topProducts,
          dailyRevenue,
        },
      },
      meta: {
        ga4Configured: ga4On,
        days,
        generatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    return authErrorResponse(err, 'admin/analytics');
  }
}
