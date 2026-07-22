// Analytics + logging cho chatbot tool calls.
// Insert row vào chat_analytics (migration 0018) mỗi khi tool execute.

import { createAdminClient } from '@/lib/supabase/admin';

const SENSITIVE_KEYS = new Set([
  'contactValue', 'contact_value', 'phone', 'email', 'zalo',
  'password', 'token', 'apiKey', 'api_key', 'authorization',
]);

export type ToolCallStatus = 'success' | 'empty' | 'error';

export interface AnalyticsRow {
  session_id: string | null;
  user_id: string | null;
  tool_name: string;
  tool_args: Record<string, unknown>;
  tool_result_count: number;
  tool_result_status: ToolCallStatus;
  tool_error: string | null;
  latency_ms: number;
  provider: string | null;
  model: string | null;
}

export interface AnalyticsSummaryRow {
  tool_name: string;
  total_calls: number;
  success_calls: number;
  empty_calls: number;
  error_calls: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  unique_sessions: number;
}

export interface TopQuestionRow {
  question_text: string;
  ask_count: number;
  last_asked_at: string;
}

export interface FailedCallRow {
  id: number;
  tool_name: string;
  tool_args: Record<string, unknown>;
  tool_error: string | null;
  latency_ms: number;
  session_id: string | null;
  created_at: string;
}

/**
 * Bỏ field nhạy cảm khỏi args trước khi log. Thay bằng '[REDACTED]'.
 */
export function sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (SENSITIVE_KEYS.has(k)) {
      result[k] = '[REDACTED]';
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      result[k] = sanitizeArgs(v as Record<string, unknown>);
    } else {
      result[k] = v;
    }
  }
  return result;
}

/**
 * Phân loại kết quả tool: array → count, object → 1, null/undefined → 0.
 */
export function classifyResult<T>(result: T): {
  status: ToolCallStatus;
  count: number;
} {
  if (result === null || result === undefined) {
    return { status: 'error', count: 0 };
  }
  if (Array.isArray(result)) {
    return {
      status: result.length === 0 ? 'empty' : 'success',
      count: result.length,
    };
  }
  if (typeof result === 'object' && 'error' in (result as Record<string, unknown>)) {
    return { status: 'error', count: 0 };
  }
  return { status: 'success', count: 1 };
}

/**
 * Wrap một tool call: đo latency, classify, INSERT vào chat_analytics.
 * KHÔNG throw error khi insert fail (analytics phải không block tool).
 */
export async function logToolCall<T>(opts: {
  toolName: string;
  args: Record<string, unknown>;
  sessionId?: string | null;
  userId?: string | null;
  provider?: string | null;
  model?: string | null;
  run: () => Promise<T>;
}): Promise<T> {
  const start = Date.now();
  let result: T;
  let error: Error | null = null;

  try {
    result = await opts.run();
  } catch (e) {
    error = e instanceof Error ? e : new Error(String(e));
    result = null as unknown as T;
  }

  const latency = Date.now() - start;
  const { status, count } = error
    ? { status: 'error' as const, count: 0 }
    : classifyResult(result);

  // Fire-and-forget insert (không await để không block tool)
  insertAnalytics({
    session_id: opts.sessionId ?? null,
    user_id: opts.userId ?? null,
    tool_name: opts.toolName,
    tool_args: sanitizeArgs(opts.args),
    tool_result_count: count,
    tool_result_status: status,
    tool_error: error?.message ?? null,
    latency_ms: latency,
    provider: opts.provider ?? null,
    model: opts.model ?? null,
  }).catch((e) => {
    // Analytics fail phải silent — không làm hỏng request
    console.error('[chatbot/analytics] insert failed:', e instanceof Error ? e.message : e);
  });

  if (error) throw error;
  return result;
}

async function insertAnalytics(row: AnalyticsRow): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('chat_analytics').insert(row);
  if (error) {
    throw new Error(error.message);
  }
}

export async function getAnalyticsSummary(days = 7): Promise<AnalyticsSummaryRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_chat_analytics_summary', { p_days: days });
  if (error) {
    console.error('[chatbot/analytics] getAnalyticsSummary:', error.message);
    return [];
  }
  return (data ?? []) as AnalyticsSummaryRow[];
}

export async function getTopQuestions(days = 7, limit = 20): Promise<TopQuestionRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_top_user_questions', {
    p_days: days,
    p_limit: limit,
  });
  if (error) {
    console.error('[chatbot/analytics] getTopQuestions:', error.message);
    return [];
  }
  return (data ?? []) as TopQuestionRow[];
}

export async function getFailedCalls(days = 7, limit = 50): Promise<FailedCallRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_failed_tool_calls', {
    p_days: days,
    p_limit: limit,
  });
  if (error) {
    console.error('[chatbot/analytics] getFailedCalls:', error.message);
    return [];
  }
  return (data ?? []) as FailedCallRow[];
}

export interface UserQuestionClusterRow {
  normalized_text: string;
  sample_text: string;
  ask_count: number;
  unique_sessions: number;
  last_asked_at: string;
}

/**
 * Lấy các cụm câu hỏi user thật, gom theo text-similarity (chuẩn hoá bỏ dấu).
 * Dùng cho admin dashboard để quyết định thêm mẫu trả lời nào.
 */
export async function getUserQuestionClusters(
  days = 7,
  limit = 50,
  minLength = 4
): Promise<UserQuestionClusterRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('get_user_question_clusters', {
    p_days: days,
    p_limit: limit,
    p_min_length: minLength,
  });
  if (error) {
    console.error('[chatbot/analytics] getUserQuestionClusters:', error.message);
    return [];
  }
  return (data ?? []) as UserQuestionClusterRow[];
}
