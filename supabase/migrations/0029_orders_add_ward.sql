-- 0029_orders_add_ward.sql
-- Thêm ward column cho orders table để lưu phường/xã giao hàng.
-- Lý do: Schema 0001 có province + district nhưng thiếu ward.
-- Frontend checkout-form.tsx đã gửi `ward` từ AddressPicker → backend
-- drop silently → user không biết ward bị mất.
--
-- Cũng thêm index cho reporting queries (filter theo province).
--
-- Idempotent: dùng IF NOT EXISTS để chạy nhiều lần OK.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS ward VARCHAR(80);

-- Index cho analytics: filter orders theo province (report sales by region)
CREATE INDEX IF NOT EXISTS idx_orders_province
  ON orders(province)
  WHERE province IS NOT NULL;
