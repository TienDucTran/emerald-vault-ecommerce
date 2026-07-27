-- Migration 0023: Refactor refund lifecycle → bảng `order_refunds` riêng.
--
-- Bối cảnh:
--   Sprint "order_refunds refactor" (Phase 1 — schema & types).
--   Trước Phase này, refund state được "nhét" vào orders.payment_status
--   (enum value REFUND_REQUESTED) + cột refund_requested_at / refund_reason.
--   Vấn đề:
--     - payment_status là payment state, không phải refund lifecycle.
--     - Khi admin approve → reject → re-approve, hoặc partial refund, hoặc
--       retry CK fail, không có audit trail tách biệt (chỉ có 1 cột thời gian).
--     - Customer chỉ được 1 lần refund/đơn (không retry sau khi rejected).
--   Phase 1 tách refund ra bảng riêng, GIỮ NGUYÊN orders.status (7 values)
--   và payment_status_enum (5 values). Cột refund_* trên orders vẫn còn
--   (dùng làm denormalized cache cho query nhanh) — Phase 4 mới drop.
--
--   Phase 2: route handlers POST /api/account/orders/[code]/refund-request.
--   Phase 3: admin refund queue + state transitions.
--   Phase 4: drop cột refund_* cũ trên orders (khi route handlers đã chuyển xong).

-- ============================================================
-- 1. Enum order_refund_state_enum
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_refund_state_enum') THEN
    CREATE TYPE order_refund_state_enum AS ENUM (
      'PENDING',      -- customer vừa request, chờ admin review
      'APPROVED',     -- admin duyệt, chuẩn bị chuyển khoản
      'COMPLETED',    -- admin đã CK xong → orders.payment_status = 'REFUNDED'
      'FAILED',       -- CK lỗi, cần retry
      'REJECTED'      -- admin từ chối
    );
  END IF;
END $$;

-- ============================================================
-- 2. Bảng order_refunds
-- ============================================================
CREATE TABLE IF NOT EXISTS order_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  state order_refund_state_enum NOT NULL DEFAULT 'PENDING',
  customer_reason TEXT,
  customer_requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_decision_at TIMESTAMPTZ,             -- approved_at | rejected_at | failed_at (cột dùng chung)
  admin_decision_reason TEXT,
  refund_amount NUMERIC(12,0),                -- partial refund support
  bank_account_name VARCHAR(120),
  bank_account_number VARCHAR(20),
  bank_name VARCHAR(80),
  bill_proof_url TEXT,                       -- bill admin upload khi CK xong
  completed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refunds_state_pending
  ON order_refunds(created_at)
  WHERE state IN ('PENDING', 'APPROVED');

CREATE INDEX IF NOT EXISTS idx_refunds_order
  ON order_refunds(order_id);

-- ============================================================
-- 3. Partial unique index — 1 ACTIVE refund per order
-- ============================================================
-- Chỉ 1 row với state ∈ {PENDING, APPROVED} tại 1 thời điểm.
-- Sau khi COMPLETED/REJECTED/FAILED thì row terminal → customer có thể
-- request lại (insert row mới). Unique index chỉ áp dụng trên active rows
-- (partial index với WHERE clause).
CREATE UNIQUE INDEX IF NOT EXISTS one_active_refund_per_order
  ON order_refunds(order_id)
  WHERE state IN ('PENDING', 'APPROVED');

-- ============================================================
-- 4. Row-Level Security
-- ============================================================
ALTER TABLE order_refunds ENABLE ROW LEVEL SECURITY;

-- Không tạo policy nào — mặc định deny all cho anon/authenticated.
-- Mọi read/write đều qua service_role (admin client) trong route handlers.
-- Customer access sẽ qua API route kiểm tra ownership (orders.customer_id = auth.uid())
-- rồi mới query qua adminClient.

-- ============================================================
-- 5. Backfill từ migration 0021
-- ============================================================
-- Orders có refund_requested_at IS NOT NULL → insert 1 row PENDING vào order_refunds.
-- Lưu ý:
--   - orders.status có thể đã CANCELLED (do admin xử lý ngoài flow), hoặc
--     payment_status đã REFUNDED (admin đã CK xong trước Phase 1).
--     Backfill vẫn insert PENDING vì lịch sử gốc là "customer đã request",
--     admin xử lý trước đó không được ghi nhận. Nếu muốn chính xác hơn:
--       WHERE refund_requested_at IS NOT NULL
--         AND payment_status IN ('REFUND_REQUESTED', 'REFUNDED');
--     và set state tương ứng. Phase 2/3 sẽ cleanup các row này bằng tay.
INSERT INTO order_refunds (order_id, state, customer_reason, customer_requested_at)
SELECT id, 'PENDING', refund_reason, refund_requested_at
FROM orders
WHERE refund_requested_at IS NOT NULL
ON CONFLICT DO NOTHING;

-- Verification (run manually):
--   SELECT * FROM order_refunds ORDER BY created_at DESC LIMIT 10;
--   SELECT state, COUNT(*) FROM order_refunds GROUP BY state;