-- ============================================================================
-- Migration 0026: UNIQUE constraint cho bank_transfers.order_id
-- ----------------------------------------------------------------------------
-- Context (MED #6):
--   1 order CHỈ nên có 1 bank_transfers row. Hiện tại FK order_id chỉ đảm bảo
--   referential integrity, không ngăn duplicate rows nếu /api/orders POST bị
--   retry (network blip, double-submit từ client, ...) → sinh ra nhiều
--   bank_transfers rows cho cùng 1 order → admin confirm nhầm dòng, QR
--   expiration check chạy sai, v.v.
--
-- Fix:
--   Thêm UNIQUE(order_id) để DB-level enforce idempotency. Nếu client retry,
--   insert lần 2 sẽ fail với 23505 (unique_violation) → route handler xử lý
--   như success (existing row) hoặc trả 409 tùy nghiệp vụ.
--
-- Idempotency:
--   Dùng DO block check pg_constraint trước khi ADD CONSTRAINT.
--   Constraint name: unique_bank_transfers_order_id (chưa từng được dùng
--   trong các migration trước — đã grep, không conflict với FK constraint
--   tự sinh từ 0008_bank_payment.sql `REFERENCES orders(id) ON DELETE CASCADE`).
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_bank_transfers_order_id'
      AND conrelid = 'public.bank_transfers'::regclass
  ) THEN
    ALTER TABLE bank_transfers
      ADD CONSTRAINT unique_bank_transfers_order_id UNIQUE (order_id);
  END IF;
END
$$;

-- DOWN migration (manual):
--   ALTER TABLE bank_transfers DROP CONSTRAINT IF EXISTS unique_bank_transfers_order_id;
