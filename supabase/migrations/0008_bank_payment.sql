-- Migration 0008: Bank payment (VietQR) - dynamic QR + manual confirm + bill upload
-- Adds order_status_enum values (WAITING_PAYMENT, WAITING_CONFIRM), bank_transfers table,
-- RLS policies, and payment-bills storage bucket for VietQR flow.

-- ============================================================
-- Part 1: ALTER enum order_status_enum
-- ============================================================
-- WAITING_PAYMENT: order tạo xong, đang chờ user CK trong thời gian hiệu lực của QR
-- WAITING_CONFIRM: user đã báo "tôi đã chuyển" / upload bill, admin chưa xác nhận
--
-- Lưu ý: ADD VALUE không thể chạy trong transaction block.
-- IF NOT EXISTS yêu cầu Postgres 12+ để idempotent.
ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'WAITING_PAYMENT';
ALTER TYPE order_status_enum ADD VALUE IF NOT EXISTS 'WAITING_CONFIRM';

-- ============================================================
-- Part 2: Table bank_transfers
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Thông tin QR đã generate (snapshot tại thời điểm tạo)
  qr_image_url TEXT NOT NULL,           -- URL ảnh QR từ vietqr.io
  bank_code VARCHAR(10) NOT NULL,       -- 'VCB', 'MB', ...
  bank_bin VARCHAR(10) NOT NULL,        -- 970436
  account_number VARCHAR(20) NOT NULL,
  account_name VARCHAR(120) NOT NULL,
  amount NUMERIC(12,0) NOT NULL,        -- Số tiền yêu cầu CK (VNĐ, không phân số)
  transfer_content VARCHAR(100) NOT NULL, -- Nội dung CK (mã đơn, vd 'EV-20260717-0001')

  -- Lifecycle
  qr_expires_at TIMESTAMPTZ,            -- Optional: QR hết hạn sau bao lâu

  -- User báo đã CK
  user_confirmed_at TIMESTAMPTZ,        -- Khi user bấm "Tôi đã chuyển"

  -- Bill upload (screenshot từ user)
  bill_image_url TEXT,                  -- Supabase Storage URL
  bill_uploaded_at TIMESTAMPTZ,

  -- Admin verify
  admin_confirmed_at TIMESTAMPTZ,       -- Khi admin bấm "Xác nhận đã nhận tiền"
  admin_note TEXT,                      -- Ghi chú admin (vd: "đã nhận qua app MB lúc 14:30")

  -- Meta
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_transfers_order ON bank_transfers(order_id);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_pending ON bank_transfers(order_id)
  WHERE admin_confirmed_at IS NULL;

-- ============================================================
-- Part 3: Trigger touch_updated_at for bank_transfers
-- ============================================================
-- touch_updated_at() đã được tạo ở migration 0007_collections_enrich.sql.
-- CREATE OR REPLACE FUNCTION là idempotent: nếu đã tồn tại thì replace,
-- nếu chưa thì tạo mới - an toàn cho cả 2 trường hợp (apply sau 0007 hoặc chạy độc lập).
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bank_transfers_touch ON bank_transfers;
CREATE TRIGGER trg_bank_transfers_touch
  BEFORE UPDATE ON bank_transfers
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- Part 4: RLS cho bank_transfers
-- ============================================================
ALTER TABLE bank_transfers ENABLE ROW LEVEL SECURITY;

-- Public/guest KHÔNG truy cập trực tiếp - mọi access đều qua API route
-- dùng service_role + verify order_code + customer_phone.
-- (Service role bypasses RLS.)

-- Admin: full access
DROP POLICY IF EXISTS "admin_all_bank_transfers" ON bank_transfers;
CREATE POLICY "admin_all_bank_transfers" ON bank_transfers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================
-- Part 5: Storage bucket payment-bills
-- ============================================================
-- Bucket riêng cho bill CK (tách khỏi jewelry-images), private, 5MB, image/* only.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-bills',
  'payment-bills',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Admin: SELECT, DELETE bills
DROP POLICY IF EXISTS "admin_read_bills" ON storage.objects;
CREATE POLICY "admin_read_bills" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-bills'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "admin_delete_bills" ON storage.objects;
CREATE POLICY "admin_delete_bills" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'payment-bills'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Lưu ý: Upload bill thực tế sẽ qua API route dùng supabaseAdmin (service_role)
-- để bypass auth, vì guest không có account. Không tạo policy INSERT cho anon/authenticated.

-- ============================================================
-- DOWN migration (manual):
--   DROP TRIGGER IF EXISTS trg_bank_transfers_touch ON bank_transfers;
--   DROP TABLE IF EXISTS bank_transfers;
--   DROP POLICY IF EXISTS "admin_read_bills" ON storage.objects;
--   DROP POLICY IF EXISTS "admin_delete_bills" ON storage.objects;
--   DELETE FROM storage.buckets WHERE id = 'payment-bills';
--   -- Không thể DROP enum value đã ADD (cần tạo enum mới + ALTER COLUMN):
--   --   CREATE TYPE order_status_enum_old AS ENUM ('NEW','CONFIRMED','SHIPPING','DONE','CANCELLED');
--   --   ALTER TABLE orders ALTER COLUMN status TYPE order_status_enum_old USING status::text::order_status_enum_old;
--   --   DROP TYPE order_status_enum;
--   --   ALTER TYPE order_status_enum_old RENAME TO order_status_enum;
--   -- Giữ lại touch_updated_at() vì đã dùng ở 0007.
