-- =====================================================
-- 0036 — Loyalty, Gamification, Gift Pool, Freeship Rules
-- Tích điểm + Mua X Tặng Y + Freeship theo khu vực + Quà bí ẩn
-- Áp dụng KM/tặng cho tier SS, S only (SSS = premium, không KM)
-- =====================================================

-- 1. products: thêm cột is_gift (exclude gift products khỏi storefront)
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT false;

-- 2. customer_loyalty — điểm + cấp khách hàng
CREATE TABLE IF NOT EXISTS customer_loyalty (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points INT DEFAULT 0,        -- điểm khả dụng (dùng để giảm giá)
  lifetime_points INT DEFAULT 0,    -- tổng điểm tích lũy (để tính tier)
  tier VARCHAR(20) DEFAULT 'BRONZE', -- BRONZE|SILVER|GOLD|PLATINUM
  orders_count INT DEFAULT 0,       -- tổng số đơn DONE
  lifetime_value NUMERIC(14,0) DEFAULT 0,  -- tổng giá trị mua
  birthday VARCHAR(10),              -- DD/MM (optional, user tự cập nhật)
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. point_transactions — log điểm (audit trail)
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  points INT NOT NULL,        -- dương = cộng, âm = trừ
  reason VARCHAR(50) NOT NULL,-- ORDER_DONE|ORDER_CANCEL|TIER_BONUS|REFUND|REDEMPTION
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_tx_user ON point_transactions(user_id, created_at DESC);

-- 4. gift_rules — định nghĩa rule (mua X tặng Y, milestone, birthday...)
CREATE TABLE IF NOT EXISTS gift_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code VARCHAR(50) UNIQUE NOT NULL,   -- BUY4GET1|BUY6GET2|BUY10GET3|FIRST_ORDER_VOUCHER|MILESTONE_5|MILESTONE_10|BIRTHDAY_GIFT
  trigger_type VARCHAR(30) NOT NULL,        -- ITEM_COUNT|ORDER_COUNT|BIRTHDAY
  trigger_value INT DEFAULT 0,              -- số item/order cần đạt (0 = N/A cho BIRTHDAY)
  gift_count INT DEFAULT 1,                 -- số sản phẩm tặng (BUY4GET1=1, BUY6GET2=2, BUY10GET3=3)
  gift_tier_filter VARCHAR(10)[] DEFAULT '{SS,S}',  -- chỉ tặng sản phẩm tier này
  min_order_value NUMERIC(12,0) DEFAULT 0,
  voucher_amount NUMERIC(12,0) DEFAULT 0,   -- voucher tiền (0 = không có voucher)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. gift_pool — pool sản phẩm tặng (link products.is_gift=true với rule)
CREATE TABLE IF NOT EXISTS gift_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES gift_rules(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stock INT DEFAULT 0,            -- số lượng có thể tặng (-1 = unlimited)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gift_pool_rule ON gift_pool(rule_id);
CREATE INDEX IF NOT EXISTS idx_gift_pool_product ON gift_pool(product_id);

-- 6. order_gifts — quà tặng thực tế của đơn (snapshot)
CREATE TABLE IF NOT EXISTS order_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  rule_code VARCHAR(50) NOT NULL,
  snapshot_title VARCHAR(255) NOT NULL,
  snapshot_image TEXT NOT NULL,
  voucher_amount NUMERIC(12,0) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_gifts_order ON order_gifts(order_id);

-- 7. order_items: thêm cột is_gift + gift_rule_code
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT false;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS gift_rule_code VARCHAR(50);

-- 8. Seed gift_rules mặc định
INSERT INTO gift_rules (rule_code, trigger_type, trigger_value, gift_count, gift_tier_filter, voucher_amount, is_active) VALUES
  ('BUY4GET1', 'ITEM_COUNT', 4, 1, '{SS,S}', 0, true),
  ('BUY6GET2', 'ITEM_COUNT', 6, 2, '{SS,S}', 50000, true),
  ('BUY10GET3', 'ITEM_COUNT', 10, 3, '{SS,S}', 100000, true),
  ('FIRST_ORDER_VOUCHER', 'ORDER_COUNT', 1, 0, '{SS,S}', 30000, true),
  ('MILESTONE_5', 'ORDER_COUNT', 5, 1, '{SS,S}', 0, true),
  ('MILESTONE_10', 'ORDER_COUNT', 10, 0, '{SS,S}', 100000, true),
  ('BIRTHDAY_GIFT', 'BIRTHDAY', 0, 1, '{SS,S}', 0, true)
ON CONFLICT (rule_code) DO NOTHING;

-- 9. RLS
ALTER TABLE customer_loyalty ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_gifts ENABLE ROW LEVEL SECURITY;

-- Public read gift_rules (khách cần biết rule để thấy progress)
DROP POLICY IF EXISTS "gift_rules_read_public" ON gift_rules;
CREATE POLICY "gift_rules_read_public" ON gift_rules FOR SELECT USING (true);

-- gift_pool: public read (cần xem sản phẩm tặng khả dụng)
DROP POLICY IF EXISTS "gift_pool_read_public" ON gift_pool;
CREATE POLICY "gift_pool_read_public" ON gift_pool FOR SELECT USING (true);

-- customer_loyalty: self read only
DROP POLICY IF EXISTS "loyalty_self_read" ON customer_loyalty;
CREATE POLICY "loyalty_self_read" ON customer_loyalty FOR SELECT USING (auth.uid() = user_id);

-- point_transactions: self read only
DROP POLICY IF EXISTS "points_self_read" ON point_transactions;
CREATE POLICY "points_self_read" ON point_transactions FOR SELECT USING (auth.uid() = user_id);

-- order_gifts: self read (customer xem quà của đơn mình)
DROP POLICY IF EXISTS "order_gifts_self_read" ON order_gifts;
CREATE POLICY "order_gifts_self_read" ON order_gifts FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_gifts.order_id AND orders.customer_id = auth.uid())
);

-- 10. Trigger: auto update updated_at cho customer_loyalty
CREATE OR REPLACE FUNCTION update_customer_loyalty_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customer_loyalty_updated_at ON customer_loyalty;
CREATE TRIGGER trg_customer_loyalty_updated_at
  BEFORE UPDATE ON customer_loyalty
  FOR EACH ROW EXECUTE FUNCTION update_customer_loyalty_updated_at();

-- 11. Seed freeship settings vào site_settings
INSERT INTO site_settings (key, value) VALUES
  ('freeship_inner_hcm_count', '4'),
  ('freeship_inner_hcm_value', '350000'),
  ('freeship_outer_hcm_count', '6'),
  ('freeship_outer_hcm_value', '500000'),
  ('freeship_province_count', '8'),
  ('freeship_province_value', '700000'),
  ('ship_fee_inner_hcm', '30000'),
  ('ship_fee_outer_hcm', '40000'),
  ('ship_fee_province', '50000'),
  ('loyalty_points_rate_bronze', '5'),
  ('loyalty_points_rate_silver', '7'),
  ('loyalty_points_rate_gold', '10'),
  ('loyalty_points_rate_platinum', '15'),
  ('loyalty_min_redemption_points', '50'),
  ('loyalty_max_redemption_percent', '20')
ON CONFLICT (key) DO NOTHING;

-- 12. Danh sách quận nội thành HCMC (dùng cho logic detection)
-- Lưu dưới dạng JSON array string trong site_settings
INSERT INTO site_settings (key, value) VALUES
  ('hcmc_inner_districts', '["Quận 1","Quận 2","Quận 3","Quận 4","Quận 5","Quận 6","Quận 7","Quận 8","Quận 9","Quận 10","Quận 11","Quận 12","Bình Thạnh","Gò Vấp","Phú Nhuận","Tân Bình","Tân Phú","Bình Tân","Thủ Đức"]')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- DONE
-- =====================================================