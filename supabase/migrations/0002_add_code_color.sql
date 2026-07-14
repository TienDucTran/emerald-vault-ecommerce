-- =====================================================
-- 0002 — Thêm field code (SKU) + color
-- Đồng thời cập nhật seed data với code cho 13 sản phẩm
-- =====================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS code VARCHAR(40),
  ADD COLUMN IF NOT EXISTS color VARCHAR(60);

-- Unique constraint cho code (cho phép NULL trùng nhau)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_code
  ON products(code) WHERE code IS NOT NULL;

-- Cập nhật code + color cho seed data
UPDATE products SET code = 'EV-0001', color = 'Bạc ánh trăng'
  WHERE slug = 'nhan-bac-925-opal-ho-ly';

UPDATE products SET code = 'EV-0002', color = 'Bạc Ý — Sapphire xanh dương'
  WHERE slug = 'day-chuyen-bac-sapphire-dai-duong';

UPDATE products SET code = 'EV-0003', color = 'Vàng champagne — Garnet đỏ rượu'
  WHERE slug = 'bong-tai-ma-vang-garnet';

UPDATE products SET code = 'EV-0004', color = 'Bạc cổ điển'
  WHERE slug = 'vong-tay-bac-hoa-van-la';

UPDATE products SET code = 'EV-0005', color = 'Vàng 18K — Emerald xanh lục'
  WHERE slug = 'nhan-emerald-vang-18k';

UPDATE products SET code = 'EV-0006', color = 'Bạc — Sapphire giọt nước'
  WHERE slug = 'mat-day-bac-sapphire';

UPDATE products SET code = 'EV-0007', color = 'Bạc — Pearl trắng ánh hồng'
  WHERE slug = 'day-chuyen-pearl-akoya';

UPDATE products SET code = 'EV-0008', color = 'Bạc — Amber cognac'
  WHERE slug = 'nhan-bac-amber-cognac';

UPDATE products SET code = 'EV-0009', color = 'Vàng 18K — Kim cương trong suốt'
  WHERE slug = 'nhan-kim-cuong-le-hoang-gia';

UPDATE products SET code = 'EV-0010', color = 'Vàng trắng — Emerald Art Deco'
  WHERE slug = 'nhan-luc-bao-art-deco';

UPDATE products SET code = 'EV-0011', color = 'Vàng 18K — Sapphire lam đậm'
  WHERE slug = 'vong-co-lam-ngoc-co';

UPDATE products SET code = 'EV-0012', color = 'Bạc — Pearl Victorian'
  WHERE slug = 'tram-cai-ngoc-trai-victorian';

UPDATE products SET code = 'EV-0013', color = 'Vàng 18K — Hạc Meiji'
  WHERE slug = 'nhan-vang-hac-meiji';

-- Index cho code (lookup nhanh khi admin scan barcode/SKU)
CREATE INDEX IF NOT EXISTS idx_products_code_lookup ON products(code);
