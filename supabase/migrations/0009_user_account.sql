-- ============================================
-- Migration 0009: End-user account
--   - addresses (sổ địa chỉ giao hàng)
--   - wishlist_items (sync server-side)
--   - product_reviews (verified buyer reviews)
--   - 2 RPCs: link_guest_orders_to_user, is_verified_purchase
--   - profile extensions: avatar, dob, gender, marketing_opt_in, updated_at
-- ============================================

-- 0) Shared trigger function (chưa có trong 0001, định nghĩa tại đây)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1) Bảng addresses
CREATE TABLE IF NOT EXISTS addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label VARCHAR(40) DEFAULT 'Nhà riêng',
  recipient_name VARCHAR(120) NOT NULL,
  recipient_phone VARCHAR(20) NOT NULL,
  address_line TEXT NOT NULL,
  province VARCHAR(80) NOT NULL,
  district VARCHAR(80) NOT NULL,
  ward VARCHAR(80),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_all ON addresses(user_id);

-- Chỉ cho phép 1 địa chỉ default / user
CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_one_default
  ON addresses(user_id) WHERE is_default = true;

-- RLS
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own addresses" ON addresses;
CREATE POLICY "Users manage own addresses" ON addresses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2) Bảng wishlist_items
CREATE TABLE IF NOT EXISTS wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist_items(user_id, created_at DESC);

ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own wishlist" ON wishlist_items;
CREATE POLICY "Users manage own wishlist" ON wishlist_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3) Bảng product_reviews
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name VARCHAR(120) NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(200),
  content TEXT NOT NULL,
  is_verified_purchase BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_approved
  ON product_reviews(product_id, created_at DESC) WHERE is_approved = true;
CREATE INDEX IF NOT EXISTS idx_reviews_user ON product_reviews(user_id);

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read approved reviews" ON product_reviews;
CREATE POLICY "Public read approved reviews" ON product_reviews
  FOR SELECT USING (is_approved = true);

DROP POLICY IF EXISTS "Users edit own reviews within 7 days" ON product_reviews;
CREATE POLICY "Users edit own reviews within 7 days" ON product_reviews
  FOR UPDATE USING (
    auth.uid() = user_id
    AND created_at > NOW() - INTERVAL '7 days'
  );

DROP POLICY IF EXISTS "Anyone can create review" ON product_reviews;
CREATE POLICY "Anyone can create review" ON product_reviews
  FOR INSERT WITH CHECK (true);

-- 4) RPC: link_guest_orders_to_user
-- Gọi 1 lần khi user vừa đăng ký: gắn email user vào các orders cũ có cùng SĐT nhưng chưa có email
CREATE OR REPLACE FUNCTION link_guest_orders_to_user(p_user_id UUID, p_phone VARCHAR)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE orders
  SET customer_email = (SELECT email FROM auth.users WHERE id = p_user_id)
  WHERE customer_phone = p_phone
    AND (customer_email IS NULL OR customer_email = '');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 5) RPC: is_verified_purchase
-- Dùng cho review: check user đã mua product (dựa vào SĐT)
CREATE OR REPLACE FUNCTION is_verified_purchase(p_user_id UUID, p_product_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.customer_phone = (SELECT phone FROM profiles WHERE id = p_user_id)
      AND oi.product_id = p_product_id
      AND o.status IN ('CONFIRMED', 'SHIPPING', 'DONE')
  ) INTO v_exists;
  RETURN v_exists;
END;
$$;

-- 6) Profile extensions
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Trigger cập nhật updated_at tự động
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Cũng áp dụng cho addresses
DROP TRIGGER IF EXISTS trg_addresses_updated_at ON addresses;
CREATE TRIGGER trg_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
