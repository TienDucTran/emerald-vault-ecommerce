-- Migration 0021: Thêm REFUND_REQUESTED vào payment_status_enum + customer cancel/refund audit fields.
--
-- Bối cảnh:
--   Sprint "Customer self-service cancel/refund" (2026-07-23).
--   Trước đây customer không có cách hủy đơn → phải gọi Zalo/email admin.
--   Sprint này thêm 2 action customer-side:
--     1. Cancel order (WAITING_PAYMENT) — set status=CANCELLED, payment=FAILED,
--        release inventory_locks, restore products to AVAILABLE.
--     2. Request refund (WAITING_CONFIRM/CONFIRMED/SHIPPING/DONE) — set
--        payment_status=REFUND_REQUESTED, status giữ nguyên.
--        Admin xử lý refund thủ công qua ngân hàng, sau đó chuyển sang
--        payment_status=REFUNDED.
--   REFUND_REQUESTED là state trung gian để admin dashboard lọc đúng case
--   "đã nhận tiền user, đang chờ admin hoàn tiền lại".

-- ============================================================
-- 1. Thêm enum value REFUND_REQUESTED
-- ============================================================
ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'REFUND_REQUESTED';

-- ============================================================
-- 2. Thêm audit fields cho orders (customer cancel + refund request)
-- ============================================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_cancelled_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS customer_cancel_reason TEXT NULL,
  ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS refund_reason TEXT NULL;

COMMENT ON COLUMN orders.customer_cancelled_at IS
  'Timestamp khi customer tự hủy đơn (chỉ áp dụng cho WAITING_PAYMENT).';

COMMENT ON COLUMN orders.customer_cancel_reason IS
  'Lý do customer hủy (optional, từ form).';

COMMENT ON COLUMN orders.refund_requested_at IS
  'Timestamp khi customer yêu cầu hoàn tiền (WAITING_CONFIRM/CONFIRMED/SHIPPING/DONE).';

COMMENT ON COLUMN orders.refund_reason IS
  'Lý do customer yêu cầu hoàn tiền (optional, từ form).';

-- ============================================================
-- 3. Index hỗ trợ admin dashboard lọc đơn có refund request
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_refund_requested
  ON orders(payment_status, refund_requested_at DESC)
  WHERE payment_status = 'REFUND_REQUESTED';
