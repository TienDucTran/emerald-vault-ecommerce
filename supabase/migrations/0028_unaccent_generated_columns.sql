-- 0028_unaccent_generated_columns.sql
-- Generated columns + GIN trigram index cho diacritics-insensitive search.
-- Yêu cầu: migration 0027 đã apply (CREATE EXTENSION unaccent).
--
-- Bối cảnh (fix bug 2026-07-29):
--   PostgREST KHÔNG chấp nhận function call trong `.or()` filter. Cú pháp
--   `unaccent(title).ilike.%pat%` bị Supabase JS wrap thành `((...))` → PostgREST
--   throw "failed to parse logic tree" và 100% search fail.
--   Fix: dùng generated column `title_unaccent` (column thật) thay vì gọi
--   unaccent() trực tiếp trong filter. PostgREST chấp nhận vì đây là column
--   identifier, không phải function call.
--
--   Đổi sang generated column còn có lợi ích: index được bằng GIN trigram
--   (gin_trgm_ops) → query với ILIKE wildcard `%pat%` chạy nhanh hơn nhiều
--   lần so với sequential scan + unaccent() mỗi row.
--
-- Postgres constraint quan trọng: GENERATED column chỉ accept IMMUTABLE functions.
-- `unaccent()` mặc định là STABLE (vì dict có thể thay đổi theo thời gian) →
-- phải wrap với custom IMMUTABLE wrapper `immutable_unaccent()`.
--
-- Lý do có thể wrap IMMUTABLE: unaccent chỉ phụ thuộc vào input text + session
-- dictionary (ổn định trong session). Khi dict thay đổi (vd ALTER TEXT SEARCH
-- DICTIONARY), các generated column sẽ tự re-compute. Với workflow shop (ít khi
-- đổi text search config), đây là acceptable trade-off.
--
-- Cần pg_trgm extension cho gin_trgm_ops (khác với unaccent ở 0027).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Tăng maintenance_work_mem cho GIN index build (default 32MB không đủ với
-- data lớn). Supabase SQL Editor chạy mỗi statement riêng, không giữ transaction,
-- nên dùng `SET` (không LOCAL). Giá trị tự reset cuối session.
SET maintenance_work_mem = '256MB';

-- ============================================================
-- IMMUTABLE wrapper cho unaccent()
-- ============================================================
-- Postgres unaccent() là STABLE function (PostgreSQL official, xem pg documentation).
-- Generated column chỉ accept IMMUTABLE. Wrap với helper function để satisfy constraint.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  STRICT
  PARALLEL SAFE
AS $$
  SELECT public.unaccent($1);
$$;

-- ============================================================
-- products
-- ============================================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS title_unaccent TEXT
  GENERATED ALWAYS AS (immutable_unaccent(title)) STORED;

CREATE INDEX IF NOT EXISTS idx_products_title_unaccent
  ON products USING gin(title_unaccent gin_trgm_ops);

-- ============================================================
-- chat_knowledge
-- ============================================================
ALTER TABLE chat_knowledge
  ADD COLUMN IF NOT EXISTS title_unaccent TEXT
  GENERATED ALWAYS AS (immutable_unaccent(title)) STORED;

ALTER TABLE chat_knowledge
  ADD COLUMN IF NOT EXISTS content_unaccent TEXT
  GENERATED ALWAYS AS (immutable_unaccent(content)) STORED;

CREATE INDEX IF NOT EXISTS idx_chat_knowledge_title_unaccent
  ON chat_knowledge USING gin(title_unaccent gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_chat_knowledge_content_unaccent
  ON chat_knowledge USING gin(content_unaccent gin_trgm_ops);

-- ============================================================
-- chat_faqs
-- ============================================================
ALTER TABLE chat_faqs
  ADD COLUMN IF NOT EXISTS question_unaccent TEXT
  GENERATED ALWAYS AS (immutable_unaccent(question)) STORED;

ALTER TABLE chat_faqs
  ADD COLUMN IF NOT EXISTS answer_unaccent TEXT
  GENERATED ALWAYS AS (immutable_unaccent(answer)) STORED;

CREATE INDEX IF NOT EXISTS idx_chat_faqs_question_unaccent
  ON chat_faqs USING gin(question_unaccent gin_trgm_ops);

-- ============================================================
-- chat_suggested_answers
-- ============================================================
ALTER TABLE chat_suggested_answers
  ADD COLUMN IF NOT EXISTS title_unaccent TEXT
  GENERATED ALWAYS AS (immutable_unaccent(title)) STORED;

ALTER TABLE chat_suggested_answers
  ADD COLUMN IF NOT EXISTS content_unaccent TEXT
  GENERATED ALWAYS AS (immutable_unaccent(content)) STORED;

CREATE INDEX IF NOT EXISTS idx_chat_suggested_answers_title_unaccent
  ON chat_suggested_answers USING gin(title_unaccent gin_trgm_ops);

-- ============================================================
-- upcoming_products
-- (Chuẩn bị cho future use — hiện chatbot chưa filter theo keyword
-- cho bảng này, nhưng định sẵn generated column để tương thích khi mở rộng.)
-- ============================================================
ALTER TABLE upcoming_products
  ADD COLUMN IF NOT EXISTS title_unaccent TEXT
  GENERATED ALWAYS AS (immutable_unaccent(title)) STORED;

CREATE INDEX IF NOT EXISTS idx_upcoming_products_title_unaccent
  ON upcoming_products USING gin(title_unaccent gin_trgm_ops);