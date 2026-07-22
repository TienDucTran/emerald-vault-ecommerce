-- ============================================================================
-- Migration 0019: Chat suggested answers (admin-managed answer templates)
-- ----------------------------------------------------------------------------
-- Mục đích:
--   1. Bảng chat_suggested_answers — lưu mẫu trả lời do admin soạn để model
--      dùng làm reference chính xác khi trả lời câu hỏi phổ biến.
--   2. RPC get_user_question_clusters — gom cụm câu hỏi user thật theo
--      text-similarity đơn giản (lowercase + bỏ dấu tiếng Việt + bỏ punct
--      + collapse whitespace) phục vụ admin quyết định thêm mẫu nào.
--
-- Apply:
--   • Supabase Dashboard → SQL Editor → paste & run, HOẶC
--   • psql -f supabase/migrations/0019_chat_suggested_answers.sql
--
-- Idempotent: tất cả CREATE/ALTER dùng IF EXISTS / IF NOT EXISTS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Bảng chat_suggested_answers
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_suggested_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(30) NOT NULL,                          -- 'shipping'|'return'|'warranty'|'payment'|'about'|'contact'|'care'|'size'|'general'|'product'|'other'
  title VARCHAR(200) NOT NULL,                            -- tiêu đề ngắn cho admin
  content TEXT NOT NULL,                                  -- câu trả lời mẫu (sẽ được model dùng làm reference)
  trigger_keywords TEXT[] DEFAULT '{}',                   -- keyword để match nhanh khi gom cụm; optional
  source_question_cluster TEXT,                           -- text gốc từ cluster (optional, để trace nguồn)
  priority INT DEFAULT 0,                                 -- ưu tiên khi sort
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT chk_chat_suggested_answers_category
    CHECK (category IN ('shipping','return','warranty','payment','about','contact','care','size','general','product','other'))
);

CREATE INDEX IF NOT EXISTS idx_chat_suggested_answers_category
  ON chat_suggested_answers(category, is_published, priority DESC);
CREATE INDEX IF NOT EXISTS idx_chat_suggested_answers_published
  ON chat_suggested_answers(is_published, priority DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_suggested_answers_keywords
  ON chat_suggested_answers USING GIN (trigger_keywords);

-- updated_at trigger (tạo function + trigger nếu chưa có — defensive)
CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_suggested_answers_set_updated_at ON chat_suggested_answers;
CREATE TRIGGER chat_suggested_answers_set_updated_at
  BEFORE UPDATE ON chat_suggested_answers
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- RLS
ALTER TABLE chat_suggested_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role full access chat_suggested_answers" ON chat_suggested_answers;
CREATE POLICY "service_role full access chat_suggested_answers" ON chat_suggested_answers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 2. RPC get_user_question_clusters — gom cụm câu user theo text-similarity
-- ----------------------------------------------------------------------------
-- Pipeline normalize: lowercase → translate (bỏ dấu tiếng Việt) → bỏ
-- punctuation → collapse whitespace → trim. Kết quả: "ship hàng", "Ship
-- hang", "SHIP  hàng" đều cluster vào cùng 1 group.
CREATE OR REPLACE FUNCTION get_user_question_clusters(
  p_days INT DEFAULT 7,
  p_limit INT DEFAULT 50,
  p_min_length INT DEFAULT 4
) RETURNS TABLE (
  normalized_text TEXT,
  sample_text TEXT,
  ask_count BIGINT,
  unique_sessions BIGINT,
  last_asked_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH normalized AS (
    SELECT
      lower(regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              translate(
                m.content,
                'áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴĐ',
                'aaaaaaaaaaaaaaaaaeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyydAAAAAAAAAAAAAAAAAEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYYD'
              ),
              '[^a-z0-9\s]', '', 'g'
            ),
            '\s+', ' ', 'g'
          ),
          '^\s+|\s+$', '', 'g'
        )
      )) AS norm,
      m.content AS original,
      m.session_id,
      m.created_at
    FROM chat_messages m
    WHERE m.role = 'user'
      AND m.content IS NOT NULL
      AND length(m.content) >= p_min_length
      AND m.created_at >= now() - (p_days || ' days')::INTERVAL
  )
  SELECT
    n.norm AS normalized_text,
    (array_agg(n.original ORDER BY n.created_at DESC))[1] AS sample_text,
    COUNT(*)::BIGINT AS ask_count,
    COUNT(DISTINCT n.session_id)::BIGINT AS unique_sessions,
    MAX(n.created_at) AS last_asked_at
  FROM normalized n
  WHERE length(n.norm) >= p_min_length
  GROUP BY n.norm
  ORDER BY ask_count DESC, last_asked_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_question_clusters(INT, INT, INT) TO service_role;

-- ============================================================================
-- Tóm tắt:
--   • Section 1: bảng chat_suggested_answers + indexes + RLS (service_role only)
--   • Section 2: RPC get_user_question_clusters dùng cho admin dashboard
-- Tất cả statement idempotent — chạy nhiều lần không lỗi.
-- ============================================================================
