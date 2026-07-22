-- ============================================================================
-- Migration 0018: Chat analytics tracking + Admin RPCs + Defense-in-depth
-- ----------------------------------------------------------------------------
-- Mục đích:
--   1. Theo dõi mỗi tool call (analytics) phục vụ admin dashboard.
--   2. Cung cấp 3 RPC aggregate cho admin: summary, top user questions, failed calls.
--   3. Bổ sung CHECK constraints + indexes phòng schema drift và tăng tốc query.
--
-- Apply:
--   • Supabase Dashboard → SQL Editor → paste & run, HOẶC
--   • psql -f supabase/migrations/0018_chat_analytics_and_validation.sql
--
-- Idempotent: tất cả CREATE/ALTER dùng IF EXISTS / IF NOT EXISTS.
-- Không destructive với dữ liệu hiện tại (chỉ thêm constraint/index/table mới).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Bảng chat_analytics — track mỗi tool call
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_analytics (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tool_name VARCHAR(50) NOT NULL,
  tool_args JSONB,
  tool_result_count INT,
  tool_result_status VARCHAR(20) NOT NULL,
  tool_error TEXT,
  latency_ms INT NOT NULL,
  provider VARCHAR(50),
  model VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_chat_analytics_status
    CHECK (tool_result_status IN ('success', 'empty', 'error'))
);

CREATE INDEX IF NOT EXISTS idx_chat_analytics_session
  ON chat_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_analytics_tool_name
  ON chat_analytics(tool_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_analytics_created
  ON chat_analytics(created_at DESC);

-- RLS: chỉ service_role đọc/ghi
ALTER TABLE chat_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role full access chat_analytics" ON chat_analytics;
CREATE POLICY "service_role full access chat_analytics" ON chat_analytics
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 2. RPC get_chat_analytics_summary — aggregate theo tool_name + time range
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_chat_analytics_summary(
  p_days INT DEFAULT 7
) RETURNS TABLE (
  tool_name VARCHAR,
  total_calls BIGINT,
  success_calls BIGINT,
  empty_calls BIGINT,
  error_calls BIGINT,
  avg_latency_ms NUMERIC,
  p95_latency_ms NUMERIC,
  unique_sessions BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.tool_name,
    COUNT(*)::BIGINT AS total_calls,
    COUNT(*) FILTER (WHERE a.tool_result_status = 'success')::BIGINT AS success_calls,
    COUNT(*) FILTER (WHERE a.tool_result_status = 'empty')::BIGINT AS empty_calls,
    COUNT(*) FILTER (WHERE a.tool_result_status = 'error')::BIGINT AS error_calls,
    ROUND(AVG(a.latency_ms)::NUMERIC, 2) AS avg_latency_ms,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY a.latency_ms)::NUMERIC, 2) AS p95_latency_ms,
    COUNT(DISTINCT a.session_id)::BIGINT AS unique_sessions
  FROM chat_analytics a
  WHERE a.created_at >= now() - (p_days || ' days')::INTERVAL
  GROUP BY a.tool_name
  ORDER BY total_calls DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_chat_analytics_summary(INT) TO service_role;

-- ----------------------------------------------------------------------------
-- 3. RPC get_top_user_questions — top N câu user hỏi nhiều nhất
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_top_user_questions(
  p_days INT DEFAULT 7,
  p_limit INT DEFAULT 20
) RETURNS TABLE (
  question_text TEXT,
  ask_count BIGINT,
  last_asked_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.content AS question_text,
    COUNT(*)::BIGINT AS ask_count,
    MAX(m.created_at) AS last_asked_at
  FROM chat_messages m
  WHERE m.role = 'user'
    AND m.content IS NOT NULL
    AND length(m.content) > 3
    AND m.created_at >= now() - (p_days || ' days')::INTERVAL
  GROUP BY m.content
  ORDER BY ask_count DESC, last_asked_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_top_user_questions(INT, INT) TO service_role;

-- ----------------------------------------------------------------------------
-- 4. RPC get_failed_tool_calls — list tool call lỗi / rỗng để debug
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_failed_tool_calls(
  p_days INT DEFAULT 7,
  p_limit INT DEFAULT 50
) RETURNS TABLE (
  id BIGINT,
  tool_name VARCHAR,
  tool_args JSONB,
  tool_error TEXT,
  latency_ms INT,
  session_id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id, a.tool_name, a.tool_args, a.tool_error, a.latency_ms, a.session_id, a.created_at
  FROM chat_analytics a
  WHERE a.tool_result_status IN ('error', 'empty')
    AND a.created_at >= now() - (p_days || ' days')::INTERVAL
  ORDER BY a.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_failed_tool_calls(INT, INT) TO service_role;

-- ----------------------------------------------------------------------------
-- 5. Defense-in-depth CHECK constraints cho TEXT columns có enum semantic
-- ----------------------------------------------------------------------------

-- chat_knowledge.category
ALTER TABLE chat_knowledge
  DROP CONSTRAINT IF EXISTS chk_chat_knowledge_category;
ALTER TABLE chat_knowledge
  ADD CONSTRAINT chk_chat_knowledge_category
  CHECK (category IN ('shipping', 'return', 'warranty', 'payment', 'about', 'contact', 'care', 'size', 'general'));

-- chat_faqs.category
ALTER TABLE chat_faqs
  DROP CONSTRAINT IF EXISTS chk_chat_faqs_category;
ALTER TABLE chat_faqs
  ADD CONSTRAINT chk_chat_faqs_category
  CHECK (category IN ('shipping', 'return', 'warranty', 'payment', 'about', 'contact', 'care', 'size', 'general'));

-- (chat_leads.contact_type, chat_promotions.discount_type, chat_messages.role
--  đã có CHECK từ các migration trước — không cần thêm.)

-- ----------------------------------------------------------------------------
-- 6. Index bổ sung cho performance
-- ----------------------------------------------------------------------------

-- Tăng tốc query theo session + role (lịch sử hội thoại)
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_role
  ON chat_messages(session_id, role, created_at DESC);

-- Tăng tốc filter theo user_id (chỉ index row có user)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user
  ON chat_sessions(user_id) WHERE user_id IS NOT NULL;

-- ============================================================================
-- Tóm tắt:
--   • Section 1: bảng chat_analytics + RLS (service_role only)
--   • Section 2-4: 3 RPC aggregate cho admin (summary, top questions, failed)
--   • Section 5: CHECK constraints cho chat_knowledge.category, chat_faqs.category
--   • Section 6: 2 index bổ sung (chat_messages session+role, chat_sessions user)
-- Tất cả statement idempotent — chạy nhiều lần không lỗi.
-- ============================================================================
