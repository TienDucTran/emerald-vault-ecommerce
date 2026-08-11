-- Migration 0034: Zalo OA Messages — Lưu lịch sử chat Zalo giữa khách và shop
-- Bảng: zalo_messages
-- Mục đích: Tích hợp Zalo OA API, nhận tin qua webhook, AI auto-reply (tùy chọn)

-- Bảng lưu lịch sử tin nhắn Zalo
CREATE TABLE IF NOT EXISTS zalo_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Zalo user ID (số điện thoại hoặc user_id do Zalo assign)
  zalo_user_id TEXT NOT NULL,
  -- Tên hiển thị của user (display_name từ Zalo profile, nếu có)
  display_name TEXT,
  -- Hướng: 'in' = khách gửi đến OA, 'out' = OA gửi đến khách
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  -- Nội dung tin nhắn (text)
  message_text TEXT NOT NULL,
  -- Loại tin nhắn: 'text', 'image', 'link', 'template' (Zalo OA hỗ trợ nhiều loại)
  message_type TEXT NOT NULL DEFAULT 'text',
  -- Zalo message ID (dùng để deduplicate webhook events)
  zalo_msg_id TEXT,
  -- Trạng thái: 'received' = mới nhận, 'replied' = đã reply, 'read' = admin đã xem, 'failed' = gửi thất bại
  status TEXT NOT NULL DEFAULT 'received',
  -- ID admin đã xử lý (nếu reply manual)
  handled_by UUID REFERENCES auth.users(id),
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index theo user_id + created_at — query lịch sử chat theo user, mới nhất trước
CREATE INDEX IF NOT EXISTS idx_zalo_messages_user_time
  ON zalo_messages (zalo_user_id, created_at DESC);

-- Index theo status — admin filter "chưa trả lời" nhanh
CREATE INDEX IF NOT EXISTS idx_zalo_messages_status
  ON zalo_messages (status)
  WHERE status IN ('received', 'failed');

-- Index zalo_msg_id — deduplicate webhook events (Zalo có thể gửi lại event nếu timeout)
CREATE UNIQUE INDEX IF NOT EXISTS idx_zalo_messages_zalo_msg_id
  ON zalo_messages (zalo_msg_id)
  WHERE zalo_msg_id IS NOT NULL;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_zalo_messages_updated_at ON zalo_messages;
CREATE TRIGGER trigger_zalo_messages_updated_at
  BEFORE UPDATE ON zalo_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: Admin có thể đọc/ghi, public không có quyền (webhook dùng service_role key)
ALTER TABLE zalo_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Admin (auth.users) có thể SELECT, INSERT, UPDATE
CREATE POLICY "Admin can read zalo_messages"
  ON zalo_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin can insert zalo_messages"
  ON zalo_messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin can update zalo_messages"
  ON zalo_messages FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ghi chú:
-- 1. Webhook route (app/api/zalo/webhook/route.ts) dùng service_role key (createAdminClient)
--    → bypass RLS, INSERT tin nhắn đến từ Zalo.
-- 2. Admin UI dùng authenticated client → RLS cho phép.
-- 3. AI auto-reply (nếu bật) cũng dùng service_role key để INSERT 'out' messages.