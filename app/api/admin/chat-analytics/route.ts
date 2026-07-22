// app/api/admin/chat-analytics/route.ts
// Endpoint admin xem tổng hợp analytics chatbot: summary, top questions, failed calls, cache stats.

import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { authErrorResponse } from '@/lib/auth/require-admin';
import {
  getAnalyticsSummary,
  getTopQuestions,
  getFailedCalls,
} from '@/lib/chatbot/analytics';
import { getCacheStats } from '@/lib/chatbot/tool-cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Giới hạn an toàn cho query params
const MAX_DAYS = 90;
const MAX_LIMIT = 100;
const MAX_FAILED = 200;

export async function GET(request: NextRequest) {
  // 1. Auth: yêu cầu quyền admin
  try {
    await requireAdmin();
  } catch (err) {
    return authErrorResponse(err);
  }

  // 2. Parse query params với clamp về khoảng hợp lệ
  const { searchParams } = new URL(request.url);
  const days = Math.max(1, Math.min(MAX_DAYS, Number(searchParams.get('days') ?? 7) || 7));
  const limit = Math.max(1, Math.min(MAX_LIMIT, Number(searchParams.get('limit') ?? 20) || 20));
  const failedLimit = Math.max(
    1,
    Math.min(MAX_FAILED, Number(searchParams.get('failedLimit') ?? 50) || 50),
  );

  try {
    // 3. Parallel fetch: 3 RPC + cache stats cùng lúc
    const [summary, topQuestions, failedCalls, cacheStats] = await Promise.all([
      getAnalyticsSummary(days),
      getTopQuestions(days, limit),
      getFailedCalls(days, failedLimit),
      Promise.resolve(getCacheStats()),
    ]);

    // 4. Trả response JSON
    return Response.json({
      summary,
      topQuestions,
      failedCalls,
      cacheStats,
      meta: { days, limit, failedLimit, generatedAt: new Date().toISOString() },
    });
  } catch (err) {
    console.error('[api/admin/chat-analytics]', err instanceof Error ? err.message : err);
    return Response.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to fetch analytics' },
      { status: 500 },
    );
  }
}
