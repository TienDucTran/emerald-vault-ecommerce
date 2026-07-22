// app/api/admin/chat-analytics/widget/route.ts
// Compact stats cho widget sidebar. Nhỏ gọn, fetch mỗi 30s.

import { NextRequest } from 'next/server';
import { requireAdmin, authErrorResponse } from '@/lib/auth/require-admin';
import { getCacheStats } from '@/lib/chatbot/tool-cache';
import { getAnalyticsSummary, getFailedCalls } from '@/lib/chatbot/analytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    return authErrorResponse(err);
  }

  const { searchParams } = new URL(request.url);
  const days = Math.max(1, Math.min(30, Number(searchParams.get('days') ?? 1) || 1));

  try {
    const [summary24h, failedLast1h, cacheStats] = await Promise.all([
      getAnalyticsSummary(days),
      // Failed calls trong 1 ngày gần nhất — sẽ filter phía client từ list 50 row
      getFailedCalls(1, 50),
      Promise.resolve(getCacheStats()),
    ]);

    // Tính tổng calls + tỷ lệ lỗi trong N ngày
    const totalCalls = summary24h.reduce((sum, s) => sum + s.total_calls, 0);
    const totalErrors = summary24h.reduce((sum, s) => sum + s.error_calls, 0);
    const errorRate = totalCalls > 0 ? totalErrors / totalCalls : 0;

    // Top 3 tool được gọi nhiều nhất
    const topTools = summary24h.slice(0, 3).map((s) => ({
      name: s.tool_name,
      calls: s.total_calls,
    }));

    // Failed calls trong 24h (filter từ 50 row gần nhất)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const failed24h = failedLast1h.filter(
      (f) => new Date(f.created_at).getTime() >= oneDayAgo
    );

    return Response.json({
      totalCalls,
      totalErrors,
      errorRate: Math.round(errorRate * 1000) / 1000, // 3 decimal
      topTools,
      failed24hCount: failed24h.length,
      cacheSize: cacheStats.size,
      cacheHitRate: Math.round(cacheStats.hitRate * 100) / 100,
      meta: { days, generatedAt: new Date().toISOString() },
    });
  } catch (err) {
    console.error(
      '[api/admin/chat-analytics/widget]',
      err instanceof Error ? err.message : err
    );
    return Response.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch widget stats' },
      { status: 500 }
    );
  }
}
