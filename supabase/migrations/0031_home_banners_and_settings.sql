-- =====================================================
-- 0031 — Home Banners + Site Settings (dynamic homepage content)
-- Tạo 2 bảng: home_banners (4 slot banner) + site_settings (key-value)
-- RLS: public read, admin write (service_role)
-- =====================================================

-- 1. home_banners — 4 slot banner trên homepage
CREATE TABLE IF NOT EXISTS home_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_key VARCHAR(40) NOT NULL,        -- 'main' | 'top' | 'bottom_left' | 'bottom_right'
  title VARCHAR(120) NOT NULL,
  subtitle VARCHAR(200),
  image_url TEXT NOT NULL,
  link_url VARCHAR(500) NOT NULL,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint: 1 row per slot_key (chỉ 1 banner active cho mỗi slot)
CREATE UNIQUE INDEX IF NOT EXISTS idx_home_banners_slot_key ON home_banners(slot_key);

-- 2. site_settings — key-value store cho cấu hình động
CREATE TABLE IF NOT EXISTS site_settings (
  key VARCHAR(80) PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS
ALTER TABLE home_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Public read
DROP POLICY IF EXISTS "home_banners_read_public" ON home_banners;
CREATE POLICY "home_banners_read_public" ON home_banners FOR SELECT USING (true);

DROP POLICY IF EXISTS "site_settings_read_public" ON site_settings;
CREATE POLICY "site_settings_read_public" ON site_settings FOR SELECT USING (true);

-- 4. Seed: 4 banner mặc định (match hardcoded hiện tại)
INSERT INTO home_banners (slot_key, title, subtitle, image_url, link_url, display_order, is_active) VALUES
  ('main', 'Dây Chuyền & Pendants', 'Di sản từ các triều đại cổ', '/images/home/collection-main-465cec.png', '/san-pham?category=DAY_CHUYEN', 1, true),
  ('top', 'Nhẫn Siêu Cấp', 'TIER SSS ONLY', '/images/home/collection-rings-5298d6.png', '/san-pham?tier=SSS', 2, true),
  ('bottom_left', 'Bông Tai', NULL, '/images/home/collection-bong-tai-759e1e.png', '/san-pham?category=BONG_TAI', 3, true),
  ('bottom_right', 'Vòng Tay', NULL, '/images/home/collection-vong-tay-318ebe.png', '/san-pham?category=VONG_TAY', 4, true)
ON CONFLICT (slot_key) DO NOTHING;

-- 5. Seed: site settings mặc định
INSERT INTO site_settings (key, value) VALUES
  ('site_name', 'Emerald Vault'),
  ('contact_email', 'hello@emerald-vault.vn'),
  ('contact_phone', '0901 234 567'),
  ('address', '12 Nguyen Hue, District 1, HCMC'),
  ('footer_tagline', 'Trang sức si Nhật vintage — tuyển chọn thủ công, đã qua thẩm định chất lượng.'),
  ('social_instagram', 'https://instagram.com'),
  ('social_facebook', 'https://facebook.com'),
  ('social_youtube', 'https://youtube.com'),
  ('announcement_messages', '["Miễn phí vận chuyển cho đơn từ 2 triệu","Giữ hàng 10 phút — không ai cướp được món đồ bạn thích","Đồ si đã qua tuyển chọn bởi chuyên gia Nhật"]')
ON CONFLICT (key) DO NOTHING;

-- 6. Trigger: auto update updated_at
CREATE OR REPLACE FUNCTION update_home_banners_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_home_banners_updated_at ON home_banners;
CREATE TRIGGER trg_home_banners_updated_at
  BEFORE UPDATE ON home_banners
  FOR EACH ROW EXECUTE FUNCTION update_home_banners_updated_at();

CREATE OR REPLACE FUNCTION update_site_settings_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_site_settings_updated_at ON site_settings;
CREATE TRIGGER trg_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION update_site_settings_updated_at();

-- =====================================================
-- DONE
-- =====================================================