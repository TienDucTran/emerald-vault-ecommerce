-- ============================================================================
-- Migration 0010: Add RESERVED status to product_status_enum
-- ----------------------------------------------------------------------------
-- Context: Khi user tạo MOMO / BANK_TRANSFER order, product hiện vẫn là
-- AVAILABLE cho đến khi IPN confirm. Nếu lock hết hạn trước khi IPN tới,
-- client khác có thể lock + mua trùng sản phẩm → race condition.
--
-- Giải pháp: thêm status RESERVED = "đang trong checkout, chờ thanh toán".
--   - Tạo order (MOMO/BANK)     → AVAILABLE → RESERVED
--   - IPN success / COD        → RESERVED (hoặc AVAILABLE) → SOLD_OUT
--   - IPN fail / cancel / 24h  → RESERVED → AVAILABLE
--
-- Lock layer vẫn giữ nguyên (inventory_locks ACTIVE 10 phút) — RESERVED chỉ
-- là additional belt-and-suspenders chống race khi lock đã expire.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Thêm RESERVED vào enum
--    Phải chạy riêng (Postgres không cho ADD VALUE trong transaction đang dùng
--    type đó) — nhưng file migration này là single-shot nên OK.
-- ----------------------------------------------------------------------------
ALTER TYPE product_status_enum ADD VALUE IF NOT EXISTS 'RESERVED';

-- ----------------------------------------------------------------------------
-- 2. Cập nhật lock_item RPC: từ chối khi product đang RESERVED
--    (reserved = đã có order PENDING chờ thanh toán — không cho lock mới)
-- ----------------------------------------------------------------------------
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
  IF v_status = 'RESERVED' THEN RAISE EXCEPTION 'PRODUCT_RESERVED'; END IF;

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

-- ----------------------------------------------------------------------------
-- 3. confirm_payment RPC — chỉ thêm comment cho rõ
--    RESERVED → SOLD_OUT: trạng thái cuối sau khi thanh toán xác nhận
--    (AVAILABLE → SOLD_OUT cho COD vẫn hoạt động bình thường)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION confirm_payment(p_order_id UUID, p_momo_trans_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE orders SET payment_status = 'PAID', status = 'CONFIRMED', updated_at = NOW()
  WHERE id = p_order_id;

  -- RESERVED/AVAILABLE → SOLD_OUT via helper (idempotent-safe)
  PERFORM mark_products_sold_out(p_order_id);

  UPDATE inventory_locks SET status = 'CONVERTED'
  WHERE order_id = p_order_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Helper: release_product_reservation
--    Trả sản phẩm từ RESERVED → AVAILABLE. Dùng cho:
--      - Admin cancel order (khi payment đang PENDING/FAILED)
--      - MOMO IPN failure
--      - Bank transfer 24h expiry (admin hoặc cron tương lai)
--    An toàn: chỉ touch nếu đang RESERVED, không đụng SOLD_OUT.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION release_product_reservation(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_product_id UUID;
BEGIN
  FOR v_product_id IN
    SELECT product_id FROM order_items WHERE order_id = p_order_id
  LOOP
    UPDATE products
    SET status = 'AVAILABLE'
    WHERE id = v_product_id
      AND status = 'RESERVED';  -- safety: don't touch SOLD_OUT
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Helper: set_products_reserved
--    Đánh dấu sản phẩm trong order là RESERVED. Dùng bởi /api/orders cho
--    MOMO / BANK_TRANSFER ngay sau khi insert order.
--    Idempotent: chỉ set AVAILABLE → RESERVED, không đụng SOLD_OUT hoặc
--    đã-RESERVED (mặc dù về lý thuyết không nên gọi 2 lần).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_products_reserved(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_product_id UUID;
BEGIN
  FOR v_product_id IN
    SELECT product_id FROM order_items WHERE order_id = p_order_id
  LOOP
    UPDATE products
    SET status = 'RESERVED'
    WHERE id = v_product_id
      AND status = 'AVAILABLE';  -- safety: don't touch SOLD_OUT or already-RESERVED
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. Helper: mark_products_sold_out
--    Đánh dấu sản phẩm trong order là SOLD_OUT (AVAILABLE/RESERVED → SOLD_OUT).
--    Dùng cho admin confirm bank payment — products ở RESERVED (bank transfer)
--    hoặc AVAILABLE (COD) đều được finalize.
--    Idempotent: chỉ set AVAILABLE/RESERVED → SOLD_OUT, không đụng nếu đã SOLD_OUT.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION mark_products_sold_out(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_product_id UUID;
BEGIN
  FOR v_product_id IN
    SELECT product_id FROM order_items WHERE order_id = p_order_id
  LOOP
    UPDATE products
    SET status = 'SOLD_OUT'
    WHERE id = v_product_id
      AND status IN ('AVAILABLE', 'RESERVED');  -- safety: only finalize from pre-terminal states
  END LOOP;
END;
$$;
