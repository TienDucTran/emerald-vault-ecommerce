-- Migration 0030 — Cron cleanup orphaned BANK_TRANSFER orders.
-- Date: 2026-07-29
-- Sprint: "checkout BANK_TRANSFER UX fix" (root cause: WAITING_PAYMENT orders
--   chưa admin confirm giữ product RESERVED mãi → user khác / chính user đó
--   submit lại → lock_item throw PRODUCT_RESERVED → 500 confuse).
--
-- Job chạy mỗi giờ lúc phút 5 (slot trống giữa release-expired-locks */5 và
-- các refund jobs). Tìm order WAITING_PAYMENT + BANK_TRANSFER tạo > 24h,
-- KHÔNG có refund pending/approved → release product RESERVED + cancel order.
--
-- Safe:
--   - Chỉ touch orders WAITING_PAYMENT (không đụng CONFIRMED/PAID).
--   - Chỉ set products RESERVED → AVAILABLE (không đụng SOLD_OUT).
--   - Chỉ release inventory_locks ACTIVE (không đụng CONVERTED/RELEASED).
--   - Bỏ qua orders có refund PENDING/APPROVED (refund flow đang chạy).
--   - Mark bank_transfers với admin_note suffix để audit.

CREATE OR REPLACE FUNCTION cleanup_orphaned_bank_orders()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT := 0;
  v_order RECORD;
BEGIN
  FOR v_order IN
    SELECT o.id, o.code
    FROM orders o
    WHERE o.status = 'WAITING_PAYMENT'
      AND o.payment_method = 'BANK_TRANSFER'
      AND o.created_at < NOW() - INTERVAL '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM order_refunds r
        WHERE r.order_id = o.id AND r.state IN ('PENDING', 'APPROVED')
      )
  LOOP
    -- 1. Release products RESERVED → AVAILABLE
    UPDATE products
    SET status = 'AVAILABLE'
    WHERE id IN (
      SELECT product_id FROM order_items WHERE order_id = v_order.id
    )
      AND status = 'RESERVED';

    -- 2. Release inventory_locks ACTIVE
    UPDATE inventory_locks
    SET status = 'RELEASED', released_at = NOW()
    WHERE order_id = v_order.id
      AND status = 'ACTIVE';

    -- 3. Mark bank_transfers (audit trail)
    UPDATE bank_transfers
    SET user_confirmed_at = COALESCE(user_confirmed_at, NOW()),
        admin_note = COALESCE(admin_note, '') || ' [AUTO_CANCEL: 24h timeout]'
    WHERE order_id = v_order.id;

    -- 4. Cancel order
    UPDATE orders
    SET status = 'CANCELLED',
        payment_status = 'FAILED',
        updated_at = NOW()
    WHERE id = v_order.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Schedule hourly tại phút 5 (offset khỏi release-expired-locks */5 chạy tại :00/:05/...).
-- pg_cron extension đã enable ở migration 0022.
SELECT cron.schedule(
  'cleanup-orphaned-bank-orders',
  '5 * * * *',
  $$ SELECT cleanup_orphaned_bank_orders(); $$
);

-- Verification queries (chạy thủ công sau khi apply):
--   SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'cleanup-orphaned-bank-orders';
--   SELECT cleanup_orphaned_bank_orders();   -- chạy 1 lần để verify fn hoạt động
--   SELECT COUNT(*) FROM orders WHERE status = 'WAITING_PAYMENT' AND payment_method = 'BANK_TRANSFER';