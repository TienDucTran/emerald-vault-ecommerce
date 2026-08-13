-- =====================================================
-- 0038 — Order Idempotency Keys
-- Chống double checkout: client gửi X-Idempotency-Key header,
-- server check key đã tồn tại → return order cũ thay vì tạo mới.
-- Giải quyết race condition khi user bấm submit 2 lần hoặc refresh.
-- =====================================================

-- 1. Bảng order_idempotency_keys
CREATE TABLE IF NOT EXISTS order_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,                       -- UUID v4 từ client (X-Idempotency-Key header)
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- 1 key chỉ map 1 order per user (chống trùng key giữa user khác nhau)
CREATE UNIQUE INDEX IF NOT EXISTS idx_idempotency_key_user
  ON order_idempotency_keys(key, user_id);

-- Index cho lookup nhanh (key + user_id)
CREATE INDEX IF NOT EXISTS idx_idempotency_key_lookup
  ON order_idempotency_keys(key, user_id)
  WHERE order_id IS NOT NULL;

-- 2. RLS — service_role only (client không đọc/ghi trực tiếp, chỉ qua API)
ALTER TABLE order_idempotency_keys ENABLE ROW LEVEL SECURITY;
-- Không tạo policy SELECT/INSERT cho authenticated → chỉ service_role bypass RLS

-- 3. Cron cleanup keys hết hạn (> 24h, không có order_id hoặc order đã tạo)
-- Chạy daily lúc 02:30 (slot trống giữa archive-old-refund-records 03:00)
SELECT cron.schedule(
  'cleanup-expired-idempotency-keys',
  '30 2 * * *',
  $$
    DELETE FROM order_idempotency_keys
    WHERE expires_at < NOW()
      AND order_id IS NOT NULL;
  $$
);

-- =====================================================
-- Verification (run manually):
--   SELECT * FROM cron.job WHERE jobname = 'cleanup-expired-idempotency-keys';
--   SELECT COUNT(*) FROM order_idempotency_keys;
-- =====================================================