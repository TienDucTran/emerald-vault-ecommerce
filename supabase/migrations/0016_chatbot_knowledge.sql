-- 0016_chatbot_knowledge.sql
-- Knowledge base đa tầng cho chatbot:
--   - chat_knowledge: thông tin có cấu trúc (shipping, return, warranty, about, contact...)
--   - chat_faqs: cặp Q&A
--   - upcoming_products: sp sắp ra mắt (đã công bố)
--   - upcoming_collections: BST sắp ra mắt
--   - chat_promotions: khuyến mãi đang chạy
-- Tất cả embed được (vector 768) để search ngữ nghĩa.

-- ========== chat_knowledge ==========
CREATE TABLE IF NOT EXISTS chat_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,           -- 'shipping' | 'return' | 'warranty' | 'payment' | 'about' | 'contact' | 'size' | 'care' | 'general'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  priority INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  embedding vector(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_knowledge_category ON chat_knowledge(category) WHERE is_published;
CREATE INDEX IF NOT EXISTS idx_chat_knowledge_keywords ON chat_knowledge USING GIN(keywords);

-- ========== chat_faqs ==========
CREATE TABLE IF NOT EXISTS chat_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  category TEXT,
  display_order INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  view_count INT DEFAULT 0,
  embedding vector(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_faqs_published ON chat_faqs(is_published, display_order);
CREATE INDEX IF NOT EXISTS idx_chat_faqs_keywords ON chat_faqs USING GIN(keywords);

-- ========== upcoming_products ==========
CREATE TABLE IF NOT EXISTS upcoming_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  short_pitch TEXT,                -- 1 câu marketing
  estimated_price NUMERIC,
  material TEXT,                   -- 'BAC_925' | ...
  category TEXT,                   -- 'NHAN' | ...
  cover_image_url TEXT,
  gallery TEXT[] DEFAULT '{}',
  expected_launch_date DATE,
  notify_enabled BOOLEAN DEFAULT true,
  is_announced BOOLEAN DEFAULT true, -- is_announced=false: lưu nội bộ, chatbot không trả lời
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upcoming_products_launch ON upcoming_products(expected_launch_date);
CREATE INDEX IF NOT EXISTS idx_upcoming_products_announced ON upcoming_products(is_announced);

-- ========== upcoming_collections ==========
CREATE TABLE IF NOT EXISTS upcoming_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  theme TEXT,
  cover_image_url TEXT,
  expected_launch_date DATE,
  teaser_note TEXT,                -- thông điệp teaser
  is_announced BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upcoming_collections_launch ON upcoming_collections(expected_launch_date);
CREATE INDEX IF NOT EXISTS idx_upcoming_collections_announced ON upcoming_collections(is_announced);

-- ========== chat_promotions ==========
CREATE TABLE IF NOT EXISTS chat_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  code TEXT,                       -- mã KM nếu có
  discount_type TEXT CHECK (discount_type IN ('percent', 'fixed', 'shipping', 'gift')),
  discount_value NUMERIC,
  min_order_value NUMERIC,
  applicable_categories TEXT[] DEFAULT '{}',  -- [] = all
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_promotions_active ON chat_promotions(is_active, valid_from, valid_until);

-- ========== RLS ==========
ALTER TABLE chat_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE upcoming_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE upcoming_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_promotions ENABLE ROW LEVEL SECURITY;

-- Service role: full access
DROP POLICY IF EXISTS "service_role_chat_knowledge" ON chat_knowledge;
CREATE POLICY "service_role_chat_knowledge" ON chat_knowledge FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_chat_faqs" ON chat_faqs;
CREATE POLICY "service_role_chat_faqs" ON chat_faqs FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_upcoming_products" ON upcoming_products;
CREATE POLICY "service_role_upcoming_products" ON upcoming_products FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_upcoming_collections" ON upcoming_collections;
CREATE POLICY "service_role_upcoming_collections" ON upcoming_collections FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "service_role_chat_promotions" ON chat_promotions;
CREATE POLICY "service_role_chat_promotions" ON chat_promotions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Anon/authenticated: chỉ đọc published/announced/active
DROP POLICY IF EXISTS "anon_read_chat_knowledge" ON chat_knowledge;
CREATE POLICY "anon_read_chat_knowledge" ON chat_knowledge FOR SELECT TO anon, authenticated USING (is_published = true);
DROP POLICY IF EXISTS "anon_read_chat_faqs" ON chat_faqs;
CREATE POLICY "anon_read_chat_faqs" ON chat_faqs FOR SELECT TO anon, authenticated USING (is_published = true);
DROP POLICY IF EXISTS "anon_read_upcoming_products" ON upcoming_products;
CREATE POLICY "anon_read_upcoming_products" ON upcoming_products FOR SELECT TO anon, authenticated USING (is_announced = true);
DROP POLICY IF EXISTS "anon_read_upcoming_collections" ON upcoming_collections;
CREATE POLICY "anon_read_upcoming_collections" ON upcoming_collections FOR SELECT TO anon, authenticated USING (is_announced = true);
DROP POLICY IF EXISTS "anon_read_chat_promotions" ON chat_promotions;
CREATE POLICY "anon_read_chat_promotions" ON chat_promotions FOR SELECT TO anon, authenticated USING (is_active = true);

-- ========== updated_at trigger ==========
CREATE OR REPLACE FUNCTION set_updated_at_chat()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chat_knowledge_updated ON chat_knowledge;
CREATE TRIGGER trg_chat_knowledge_updated BEFORE UPDATE ON chat_knowledge FOR EACH ROW EXECUTE FUNCTION set_updated_at_chat();
DROP TRIGGER IF EXISTS trg_chat_faqs_updated ON chat_faqs;
CREATE TRIGGER trg_chat_faqs_updated BEFORE UPDATE ON chat_faqs FOR EACH ROW EXECUTE FUNCTION set_updated_at_chat();
DROP TRIGGER IF EXISTS trg_upcoming_products_updated ON upcoming_products;
CREATE TRIGGER trg_upcoming_products_updated BEFORE UPDATE ON upcoming_products FOR EACH ROW EXECUTE FUNCTION set_updated_at_chat();
DROP TRIGGER IF EXISTS trg_upcoming_collections_updated ON upcoming_collections;
CREATE TRIGGER trg_upcoming_collections_updated BEFORE UPDATE ON upcoming_collections FOR EACH ROW EXECUTE FUNCTION set_updated_at_chat();

COMMENT ON TABLE chat_knowledge IS 'Knowledge base cho chatbot: chính sách, thông tin shop, hướng dẫn bảo quản...';
COMMENT ON TABLE chat_faqs IS 'FAQ cứng dùng cho chatbot (khi match cao, trả lời thẳng).';
COMMENT ON TABLE upcoming_products IS 'Sản phẩm sắp ra mắt đã công bố. Chatbot có thể tư vấn trước và gợi ý đăng ký nhận thông báo.';
COMMENT ON TABLE upcoming_collections IS 'Bộ sưu tập sắp ra mắt đã công bố.';
COMMENT ON TABLE chat_promotions IS 'Khuyến mãi đang chạy, chatbot chủ động đề xuất khi phù hợp.';
