-- 0040_chat_session_summary.sql
-- VIP upgrade Phase 4: Conversation memory
-- Add summary column to chat_sessions for long-term conversation context
-- Idempotent: uses IF NOT EXISTS

ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS summary TEXT;

CREATE INDEX IF NOT EXISTS idx_chat_sessions_has_summary
  ON chat_sessions (id)
  WHERE summary IS NOT NULL;

COMMENT ON COLUMN chat_sessions.summary IS
  'Tóm tắt cuộc trò chuyện (rule-based) — inject vào system prompt khi history dài. VIP Phase 4.';
