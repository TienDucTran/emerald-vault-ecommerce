-- =====================================================
-- 0003 — Customer ↔ Orders link
-- Thêm customer_id (FK profiles) để tra cứu lịch sử đơn cho user đã đăng nhập.
-- Index cho per-customer order history; RLS policy cho phép customer
-- tự đọc orders của mình qua auth.uid().
--
-- Lưu ý: RLS trên orders đã được bật trong 0001 nên migration này
-- chỉ thêm policy, không gọi lại ENABLE.
-- =====================================================

-- 1. Column
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Index cho per-customer order history (newest first)
CREATE INDEX IF NOT EXISTS idx_orders_customer
  ON orders(customer_id, created_at DESC)
  WHERE customer_id IS NOT NULL;

-- 3. RLS: customer chỉ đọc được orders của chính mình
-- (service_role / admin client bypass RLS nên API layer vẫn đọc tự do)
DROP POLICY IF EXISTS "orders_self_read" ON orders;
CREATE POLICY "orders_self_read"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);
