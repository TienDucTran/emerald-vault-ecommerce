/**
 * /api/admin/chatbot/clusters — read-only view over user question clusters
 *                      + denormalized suggested answers for client-side matching.
 * Auth: requireAdmin
 */
import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse, requireAdmin } from '@/lib/auth/require-admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserQuestionClusters } from '@/lib/chatbot/analytics';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_DAYS = 90;
const MAX_LIMIT = 200;
const MAX_MIN_LENGTH = 50;

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const days = Math.max(
      1,
      Math.min(MAX_DAYS, Number(searchParams.get('days') ?? 7) || 7),
    );
    const limit = Math.max(
      1,
      Math.min(MAX_LIMIT, Number(searchParams.get('limit') ?? 50) || 50),
    );
    const minLength = Math.max(
      1,
      Math.min(
        MAX_MIN_LENGTH,
        Number(searchParams.get('minLength') ?? 3) || 3,
      ),
    );

    const supabase = createAdminClient();

    const [clusters, suggestedAnswersResult] = await Promise.all([
      getUserQuestionClusters(days, limit, minLength),
      supabase
        .from('chat_suggested_answers')
        .select(
          'id, category, title, content, trigger_keywords, priority, is_published, source_question_cluster, created_at, updated_at',
        )
        .order('priority', { ascending: false })
        .order('updated_at', { ascending: false }),
    ]);

    const suggestedAnswers = suggestedAnswersResult.error ? [] : suggestedAnswersResult.data ?? [];

    return NextResponse.json({
      ok: true,
      data: {
        clusters,
        suggestedAnswers,
        meta: { days, limit, minLength, generatedAt: new Date().toISOString() },
      },
    });
  } catch (e) {
    return authErrorResponse(e);
  }
}
