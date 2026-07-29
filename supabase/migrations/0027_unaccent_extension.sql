-- 0027_unaccent_extension.sql
-- Bật unaccent extension cho diacritics-insensitive search.
-- Dùng bởi chatbot tools (searchProducts, getFaq, getKnowledge, getSuggestedAnswers)
-- để "nhan" match "nhẫn", "bac" match "bạc", v.v.
--
-- PostgREST syntax đang dùng: `unaccent(title).ilike.%pattern%` (xem lib/chatbot/tools.ts).
-- Nếu muốn tối ưu performance với dataset lớn, có thể thêm generated column + GIN index:
--
--   ALTER TABLE products
--     ADD COLUMN title_unaccent TEXT GENERATED ALWAYS AS (unaccent(title)) STORED;
--   CREATE INDEX idx_products_title_unaccent
--     ON products USING gin(title_unaccent gin_trgm_ops);
--
-- Lưu ý: extension unaccent cần superuser hoặc đã được grant CREATE EXTENSION.
-- Supabase managed Postgres cho phép enable unaccent/fuzzystrmm extensions mặc định.

CREATE EXTENSION IF NOT EXISTS unaccent;
