-- =====================================================
-- Emerald Vault — Full Schema, RLS, RPC, Seed
-- File này có thể chạy 1 lần duy nhất trong Supabase SQL Editor
-- Bao gồm: enums, tables, indexes, RPC functions, RLS, trigger, seed data
-- =====================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- cho gen_random_uuid()

-- 1. ENUM types
DO $$ BEGIN
  CREATE TYPE quality_tier_enum AS ENUM ('SSS', 'SS', 'S');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE product_category_enum AS ENUM ('NHAN', 'DAY_CHUYEN', 'BONG_TAI', 'VONG_TAY', 'MAT_DAY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE material_enum AS ENUM ('BAC_925', 'MA_VANG_18K', 'MA_VANG_24K', 'VANG_18K', 'KIM_CUONG');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE product_status_enum AS ENUM ('AVAILABLE', 'SOLD_OUT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lock_status_enum AS ENUM ('ACTIVE', 'RELEASED', 'EXPIRED', 'CONVERTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status_enum AS ENUM ('NEW', 'CONFIRMED', 'SHIPPING', 'DONE', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method_enum AS ENUM ('MOMO', 'COD', 'BANK_TRANSFER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Tables
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) UNIQUE NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  display_order INT DEFAULT 0,
  launch_at TIMESTAMPTZ,
  story_text TEXT,
  hero_gallery TEXT[] DEFAULT '{}',
  meta_title VARCHAR(160),
  meta_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  material material_enum NOT NULL,
  category product_category_enum NOT NULL,
  image_url TEXT NOT NULL,
  gallery TEXT[] DEFAULT '{}',
  price NUMERIC(12,0) NOT NULL,
  original_price NUMERIC(12,0),
  era VARCHAR(255),
  status product_status_enum DEFAULT 'AVAILABLE',
  is_featured BOOLEAN DEFAULT false,
  quality_tier quality_tier_enum NOT NULL,
  season_tags VARCHAR(50)[] DEFAULT '{}',
  story_quote TEXT,
  story_body TEXT[] DEFAULT '{}',
  highlight_title VARCHAR(255),
  highlight_body TEXT,
  highlight_image TEXT,
  meta_title VARCHAR(160),
  meta_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label VARCHAR(120) NOT NULL,
  value TEXT NOT NULL,
  display_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inventory_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  client_id VARCHAR(120) NOT NULL,
  status lock_status_enum DEFAULT 'ACTIVE',
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  order_id UUID
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) UNIQUE NOT NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_email VARCHAR(120),
  customer_address TEXT,
  province VARCHAR(80),
  district VARCHAR(80),
  notes TEXT,
  total_amount NUMERIC(12,0) NOT NULL,
  shipping_fee NUMERIC(12,0) DEFAULT 0,
  payment_method payment_method_enum NOT NULL,
  payment_status payment_status_enum DEFAULT 'PENDING',
  status order_status_enum DEFAULT 'NEW',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  price NUMERIC(12,0) NOT NULL,
  snapshot_title VARCHAR(255) NOT NULL,
  snapshot_image TEXT NOT NULL,
  snapshot_material material_enum
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  momo_request_id VARCHAR(50) UNIQUE NOT NULL,
  momo_order_id VARCHAR(200) NOT NULL,
  momo_trans_id BIGINT,
  amount NUMERIC(12,0) NOT NULL,
  pay_type VARCHAR(20),
  result_code INT,
  message TEXT,
  signature VARCHAR(255),
  status VARCHAR(20) DEFAULT 'CREATED',
  ipn_received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(120),
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_products_status        ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_filters       ON products(is_featured, quality_tier);
CREATE INDEX IF NOT EXISTS idx_products_collection    ON products(collection_id);
CREATE INDEX IF NOT EXISTS idx_products_slug          ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_season        ON products USING GIN(season_tags);
CREATE INDEX IF NOT EXISTS idx_product_specs_product  ON product_specs(product_id, display_order);
CREATE INDEX IF NOT EXISTS idx_locks_product_active   ON inventory_locks(product_id) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_locks_expires          ON inventory_locks(expires_at) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_locks_client           ON inventory_locks(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_code            ON orders(code);
CREATE INDEX IF NOT EXISTS idx_orders_phone           ON orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status          ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_tx_order       ON payment_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_momo_order  ON payment_transactions(momo_order_id);

-- 4. Trigger: auto create profile when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 5. RPC: lock_item
CREATE OR REPLACE FUNCTION lock_item(p_product_id UUID, p_client_id VARCHAR)
RETURNS inventory_locks
LANGUAGE plpgsql
AS $$
DECLARE
  v_status product_status_enum;
  v_lock inventory_locks;
BEGIN
  SELECT status INTO v_status FROM products WHERE id = p_product_id FOR UPDATE;
  IF v_status IS NULL THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND'; END IF;
  IF v_status = 'SOLD_OUT' THEN RAISE EXCEPTION 'PRODUCT_SOLD_OUT'; END IF;

  IF EXISTS (
    SELECT 1 FROM inventory_locks
    WHERE product_id = p_product_id
      AND status = 'ACTIVE'
      AND expires_at > NOW()
      AND client_id <> p_client_id
  ) THEN RAISE EXCEPTION 'PRODUCT_LOCKED_BY_OTHER'; END IF;

  -- expire các lock cũ của cùng client trên sản phẩm này
  UPDATE inventory_locks
  SET status = 'RELEASED', released_at = NOW()
  WHERE product_id = p_product_id
    AND client_id = p_client_id
    AND status = 'ACTIVE';

  INSERT INTO inventory_locks (product_id, client_id, locked_at, expires_at, status)
  VALUES (p_product_id, p_client_id, NOW(), NOW() + INTERVAL '10 minutes', 'ACTIVE')
  RETURNING * INTO v_lock;

  RETURN v_lock;
END;
$$;

-- 6. RPC: confirm_payment
CREATE OR REPLACE FUNCTION confirm_payment(p_order_id UUID, p_momo_trans_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE orders SET payment_status = 'PAID', status = 'CONFIRMED', updated_at = NOW()
  WHERE id = p_order_id;
  UPDATE products SET status = 'SOLD_OUT'
  WHERE id IN (SELECT product_id FROM order_items WHERE order_id = p_order_id);
  UPDATE inventory_locks SET status = 'CONVERTED'
  WHERE order_id = p_order_id;
END;
$$;

-- 7. RLS policies
ALTER TABLE collections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_specs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_locks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;

-- Public read
DROP POLICY IF EXISTS "collections_read_public" ON collections;
CREATE POLICY "collections_read_public" ON collections FOR SELECT USING (true);

DROP POLICY IF EXISTS "products_read_public" ON products;
CREATE POLICY "products_read_public" ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "product_specs_read_public" ON product_specs;
CREATE POLICY "product_specs_read_public" ON product_specs FOR SELECT USING (true);

-- Orders: chỉ service_role (admin client) đọc/ghi; khách tra cứu qua API verify
DROP POLICY IF EXISTS "orders_no_public" ON orders;
-- (không tạo policy public -> mặc định deny)

DROP POLICY IF EXISTS "order_items_no_public" ON order_items;
-- (không tạo policy public)

-- Profiles: user đọc/update của chính mình
DROP POLICY IF EXISTS "profiles_self_read" ON profiles;
CREATE POLICY "profiles_self_read" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
CREATE POLICY "profiles_self_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- 8. SEED DATA — đồng bộ với lib/mock-data.ts
-- =====================================================

-- Collections
INSERT INTO collections (id, name, slug, description, cover_image_url, is_published, display_order, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'Opalescent Waters', 'opalescent-waters',
  'Lấy cảm hứng từ những bờ biển nhiệt đới, bộ sưu tập tỏa sáng với đá quý xanh như sóng biển. Mỗi món đồ là một viên ngọc kể câu chuyện về đại dương.',
  'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&q=80', true, 1, '2026-07-12T00:00:00Z'),
('22222222-2222-2222-2222-222222222222', 'Vintage Autumn', 'vintage-autumn',
  'Tông màu ấm áp của mùa thu với đá carnelian, garnet và amber. Trầm tích của thời gian được lưu giữ trong từng thiết kế.',
  'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&q=80', true, 2, '2026-07-05T00:00:00Z'),
('33333333-3333-3333-3333-333333333333', 'Midnight Garden', 'midnight-garden',
  'Khu vườn huyền bí dưới ánh trăng — emerald, sapphire và những bông hoa bạc tinh tế.',
  'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80', true, 3, '2026-06-28T00:00:00Z'),
('44444444-4444-4444-4444-444444444444', 'Bridal Tears', 'bridal-tears',
  'Những giọt nước mắt hạnh phúc — pearl, diamond và kim cương cổ điển cho ngày trọng đại.',
  'https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=800&q=80', true, 4, '2026-06-20T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- Products
INSERT INTO products (id, collection_id, title, slug, description, material, category, image_url, gallery, price, original_price, era, status, is_featured, quality_tier, season_tags, story_quote, story_body, highlight_title, highlight_body, highlight_image, created_at) VALUES
('a1111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
  'Nhẫn Bạc 925 Opal Hồ Ly', 'nhan-bac-925-opal-ho-ly',
  'Nhẫn bạc 925 Nhật niên 1960s, điểm opal thiên nhiên lấp lánh. Một món đồ vintage hiếm có với lớp patina tự nhiên.',
  'BAC_925', 'NHAN',
  'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&q=80',
  ARRAY['https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80','https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80'],
  1850000, NULL, NULL, 'AVAILABLE', true, 'SSS', ARRAY['SUMMER_2026'], NULL, NULL, NULL, NULL, NULL, '2026-07-12T00:00:00Z'),

('a1111111-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111',
  'Dây Chuyền Bạc Sapphire Đại Dương', 'day-chuyen-bac-sapphire-dai-duong',
  'Dây chuyền bạc Ý với mặt sapphire cabochon cắt mịn. Hoàn hảo cho cả dạo phố lẫn dự tiệc.',
  'BAC_925', 'DAY_CHUYEN',
  'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80',
  ARRAY[]::TEXT[], 2450000, NULL, NULL, 'AVAILABLE', true, 'SS', ARRAY['SUMMER_2026'], NULL, NULL, NULL, NULL, NULL, '2026-07-11T00:00:00Z'),

('a1111111-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222',
  'Bông Tai Mạ Vàng 18K Garnet Vintage', 'bong-tai-ma-vang-garnet',
  'Bông tai vintage mạ vàng 18K cổ điển, điểm garnet đỏ rượu. Phong cách thập niên 70s.',
  'MA_VANG_18K', 'BONG_TAI',
  'https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=600&q=80',
  ARRAY[]::TEXT[], 3200000, NULL, NULL, 'AVAILABLE', true, 'SS', ARRAY['VINTAGE_AUTUMN'], NULL, NULL, NULL, NULL, NULL, '2026-07-10T00:00:00Z'),

('a1111111-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222',
  'Vòng Tay Bạc 925 Hoa Văn Lá', 'vong-tay-bac-hoa-van-la',
  'Vòng tay bạc 925 với họa tiết lá thủ công. Đeo đơn lẻ hoặc xếp chồng đều đẹp.',
  'BAC_925', 'VONG_TAY',
  'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&q=80',
  ARRAY[]::TEXT[], 980000, NULL, NULL, 'AVAILABLE', false, 'S', ARRAY['VINTAGE_AUTUMN'], NULL, NULL, NULL, NULL, NULL, '2026-07-09T00:00:00Z'),

('a1111111-0000-0000-0000-000000000005', '33333333-3333-3333-3333-333333333333',
  'Nhẫn Emerald Vàng 18K Classic', 'nhan-emerald-vang-18k',
  'Nhẫn vàng 18K Ý với emerald cắt emerald-cut. Sang trọng vượt thời gian, phù hợp kỷ niệm.',
  'VANG_18K', 'NHAN',
  'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=600&q=80',
  ARRAY[]::TEXT[], 12800000, NULL, NULL, 'AVAILABLE', true, 'SSS', ARRAY['SUMMER_2026'], NULL, NULL, NULL, NULL, NULL, '2026-07-08T00:00:00Z'),

('a1111111-0000-0000-0000-000000000006', '33333333-3333-3333-3333-333333333333',
  'Mặt Dây Bạc Sapphire Hình Giọt Nước', 'mat-day-bac-sapphire',
  'Mặt dây bạc sterling hình giọt nước điểm sapphire xanh dương. Đeo kết hợp với dây chuyền bạc mảnh.',
  'BAC_925', 'MAT_DAY',
  'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=600&q=80',
  ARRAY[]::TEXT[], 1650000, NULL, NULL, 'AVAILABLE', false, 'SS', ARRAY[]::TEXT[], NULL, NULL, NULL, NULL, NULL, '2026-07-07T00:00:00Z'),

('a1111111-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111',
  'Dây Chuyền Pearl Nhật Akoya', 'day-chuyen-pearl-akoya',
  'Dây chuyền ngọc trai Akoya Nhật Bản chính hiệu, ánh sáng tự nhiên đặc trưng.',
  'BAC_925', 'DAY_CHUYEN',
  'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&q=80',
  ARRAY[]::TEXT[], 4500000, NULL, NULL, 'AVAILABLE', false, 'SSS', ARRAY['SUMMER_2026'], NULL, NULL, NULL, NULL, NULL, '2026-07-06T00:00:00Z'),

('a1111111-0000-0000-0000-000000000008', '22222222-2222-2222-2222-222222222222',
  'Nhẫn Bạc 925 Amber Cognac', 'nhan-bac-amber-cognac',
  'Nhẫn bạc 925 với đá amber màu cognac ấm áp. Một món đồ hoàn hảo cho mùa thu.',
  'BAC_925', 'NHAN',
  'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&q=80',
  ARRAY[]::TEXT[], 1350000, NULL, NULL, 'SOLD_OUT', false, 'S', ARRAY['VINTAGE_AUTUMN'], NULL, NULL, NULL, NULL, NULL, '2026-07-05T00:00:00Z'),

('a1111111-0000-0000-0000-000000000009', '33333333-3333-3333-3333-333333333333',
  'Nhẫn Kim Cương Lệ Hoàng Gia', 'nhan-kim-cuong-le-hoang-gia',
  '"Một tuyệt phẩm hiếm hoi từ kỷ nguyên Showa, mang trong mình linh hồn của nghệ thuật kim hoàn Nhật Bản cổ điển. Từng đường nét đều kể về sự kiêu hãnh và vẻ đẹp vĩnh cửu của những giọt lệ hoàng gia."',
  'VANG_18K', 'NHAN',
  '/images/product-detail/detail-main-4a0be7.png',
  ARRAY['/images/product-detail/detail-main-4a0be7.png','/images/product-detail/thumb-1-4a0be7.png','/images/product-detail/thumb-2-4a0be7.png','/images/product-detail/thumb-3-4a0be7.png','/images/product-detail/thumb-4-4a0be7.png'],
  85000000, 110000000, 'Vàng 18K & Kim Cương Tự Nhiên | Nhật Bản thập niên 1960',
  'AVAILABLE', true, 'SSS', ARRAY[]::TEXT[],
  '"Mỗi món đồ tại Emerald Vault không chỉ là trang sức, mà là một mảnh ghép của lịch sử được lưu giữ trong những bức tường thành của thời gian."',
  ARRAY['Được chế tác thủ công tại Tokyo vào những năm 1960, chiếc nhẫn này đại diện cho sự giao thoa hoàn hảo giữa kỹ thuật kim hoàn phương Tây và thẩm mỹ tinh tế của người Nhật. Central diamond hình giọt nước (pear-shaped) được lựa chọn kỹ lưỡng để đạt đến độ trong suốt hoàn hảo.','Trong thập niên này, trang sức Nhật Bản bắt đầu chuyển mình từ những thiết kế truyền thống sang phong cách Avant-garde đầy táo bạo, nhưng vẫn giữ được sự thanh thoát đặc trưng.'],
  'Gia Tộc Kỷ Vật',
  'Vốn thuộc sở hữu của một gia tộc danh tiếng tại Kyoto, tuyệt phẩm này đã trải qua ba thập kỷ được bảo quản trong két sắt tư nhân trước khi xuất hiện tại Emerald Vault.',
  '/images/product-detail/story-highlight-5bb9e5.png',
  '2026-07-14T00:00:00Z'),

('a1111111-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111',
  'Nhẫn Lục Bảo Art Deco', 'nhan-luc-bao-art-deco',
  'Nhẫn lục bảo (emerald) phong cách Art Deco, đường nét góc cạnh đặc trưng thập niên 1920.',
  'VANG_18K', 'NHAN',
  '/images/product-detail/rec-card-1.png',
  ARRAY[]::TEXT[], 42500000, NULL, NULL, 'AVAILABLE', false, 'SS', ARRAY[]::TEXT[], NULL, NULL, NULL, NULL, NULL, '2026-07-13T00:00:00Z'),

('a1111111-0000-0000-0000-000000000011', '33333333-3333-3333-3333-333333333333',
  'Vòng Cổ Lam Ngọc Cổ', 'vong-co-lam-ngoc-co',
  'Vòng cổ lam ngọc (sapphire) cổ điển, một tuyệt phẩm từ thời kỳ Edo.',
  'VANG_18K', 'DAY_CHUYEN',
  '/images/product-detail/rec-card-2.png',
  ARRAY[]::TEXT[], 125000000, NULL, NULL, 'AVAILABLE', true, 'SSS', ARRAY[]::TEXT[], NULL, NULL, NULL, NULL, NULL, '2026-07-12T00:00:00Z'),

('a1111111-0000-0000-0000-000000000012', '22222222-2222-2222-2222-222222222222',
  'Trâm Cài Ngọc Trai Victorian', 'tram-cai-ngoc-trai-victorian',
  'Trâm cài ngọc trai phong cách Victorian, tinh tế và thanh lịch.',
  'BAC_925', 'MAT_DAY',
  '/images/product-detail/rec-card-3.png',
  ARRAY[]::TEXT[], 18200000, NULL, NULL, 'AVAILABLE', false, 'S', ARRAY[]::TEXT[], NULL, NULL, NULL, NULL, NULL, '2026-07-11T00:00:00Z'),

('a1111111-0000-0000-0000-000000000013', '22222222-2222-2222-2222-222222222222',
  'Nhẫn Vàng Hạc Meiji', 'nhan-vang-hac-meiji',
  'Nhẫn vàng thời Meiji với họa tiết hạc — biểu tượng trường thọ.',
  'VANG_18K', 'NHAN',
  '/images/product-detail/rec-card-4.png',
  ARRAY[]::TEXT[], 55000000, NULL, NULL, 'SOLD_OUT', false, 'SS', ARRAY[]::TEXT[], NULL, NULL, NULL, NULL, NULL, '2026-07-10T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- Product specs (chỉ p9 có)
INSERT INTO product_specs (product_id, label, value, display_order) VALUES
('a1111111-0000-0000-0000-000000000009', 'Chất liệu', 'Vàng 18K (Au750)', 1),
('a1111111-0000-0000-0000-000000000009', 'Kim cương chính', '1.2ct — Pear-shaped, VS1, F', 2),
('a1111111-0000-0000-0000-000000000009', 'Kim cương tấm', '0.48ct total — Brilliant cut', 3),
('a1111111-0000-0000-0000-000000000009', 'Ni size', '12 (có thể chỉnh size)', 4),
('a1111111-0000-0000-0000-000000000009', 'Trọng lượng', '5.8 gam', 5),
('a1111111-0000-0000-0000-000000000009', 'Xuất xứ', 'Tokyo, Nhật Bản — thập niên 1960', 6),
('a1111111-0000-0000-0000-000000000009', 'Giấy kiểm định', 'GIA Certificate #7421', 7)
ON CONFLICT DO NOTHING;

-- =====================================================
-- DONE. Sau khi chạy:
-- 1. Vào Supabase Dashboard → SQL Editor → dán toàn bộ file này → Run
-- 2. Vào Authentication → Users → Invite/Create admin user
-- 3. Chạy: UPDATE profiles SET role = 'admin' WHERE id = '<admin-user-id>';
-- 4. (Optional) Bật pg_cron trong Database → Extensions và schedule release_expired_locks
-- =====================================================
