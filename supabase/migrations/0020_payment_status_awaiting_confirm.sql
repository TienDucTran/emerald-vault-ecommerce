-- Migration 0020: Thêm AWAITING_CONFIRM vào payment_status_enum + audit fields cho bank_transfers.
--
-- Bối cảnh:
--   Trước đây payment_status_enum chỉ có (PENDING, PAID, FAILED, REFUNDED).
--   Khi user click "Tôi đã chuyển" → orders.status đổi sang WAITING_CONFIRM
--   nhưng payment_status vẫn PENDING → admin list hiển thị "Chờ TT · PENDING"
--   rất dễ nhầm với đơn chưa CK.
--   Fix: thêm AWAITING_CONFIRM làm state DB-level, cùng với audit fields trên
--   bank_transfers để tracking khi admin cancel/reject.

-- ============================================================
-- 1. Thêm enum value AWAITING_CONFIRM vào payment_status_enum
-- ============================================================
-- Lưu ý: ALTER TYPE ... ADD VALUE không thể nằm trong transaction block.
-- Nếu chạy qua Supabase SQL Editor, đảm bảo chạy từng câu lệnh.
ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'AWAITING_CONFIRM';

-- ============================================================
-- 2. Thêm audit fields cho bank_transfers
-- ============================================================
ALTER TABLE bank_transfers
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS rejected_reason TEXT NULL;

-- Comment giải thích state lifecycle
COMMENT ON COLUMN bank_transfers.user_confirmed_at IS
  'Timestamp khi user click "Tôi đã chuyển" HOẶC upload bill (lần đầu).';

COMMENT ON COLUMN bank_transfers.admin_confirmed_at IS
  'Timestamp khi admin xác nhận đã nhận tiền. Khi set này, orders.status=CONFIRMED, payment_status=PAID.';

COMMENT ON COLUMN bank_transfers.rejected_at IS
  'Timestamp khi admin cancel/reject đơn bank_transfer. Khi set, orders.status=CANCELLED, payment_status=FAILED.';

COMMENT ON COLUMN bank_transfers.rejected_reason IS
  'Lý do admin reject (optional). Hiển thị trong admin audit log.';

-- ============================================================
-- 3. Backfill payment_status cho orders đang ở WAITING_CONFIRM
-- ============================================================
-- Các đơn bank_transfer hiện tại đang ở orders.status='WAITING_CONFIRM' mà
-- payment_status vẫn PENDING → cập nhật về AWAITING_CONFIRM cho đúng state.
-- An toàn vì chỉ touch bank_transfer orders chưa PAID/FAILED.
UPDATE orders
SET payment_status = 'AWAITING_CONFIRM'
WHERE status = 'WAITING_CONFIRM'
  AND payment_method = 'BANK_TRANSFER'
  AND payment_status = 'PENDING';

-- ============================================================
-- 4. Backfill bank_transfers.user_confirmed_at cho orders có bill
-- ============================================================
-- Nếu user upload bill nhưng chưa click "Tôi đã chuyển" → user_confirmed_at
-- = bill_uploaded_at. Đảm bảo audit log đầy đủ.
UPDATE bank_transfers bt
SET user_confirmed_at = bt.bill_uploaded_at
WHERE bt.user_confirmed_at IS NULL
  AND bt.bill_uploaded_at IS NOT NULL
  AND bt.bill_image_url IS NOT NULL;
