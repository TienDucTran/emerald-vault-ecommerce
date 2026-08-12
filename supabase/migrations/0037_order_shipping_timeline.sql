-- =====================================================
-- 0037 — Order Shipping Info + Timeline
-- Thêm cột vận chuyển vào orders + bảng order_timeline (audit trail)
-- Manual shipping flow: admin nhập carrier + tracking_number
-- =====================================================

-- 1. Thêm cột shipping info vào orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS carrier VARCHAR(100),        -- 'GHN' | 'GHTK' | 'VNPost' | 'JT' | 'OTHER'
  ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(200),  -- mã vận đơn từ hãng
  ADD COLUMN IF NOT EXISTS tracking_url TEXT,              -- link tra cứu (auto-generate từ carrier nếu null)
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,        -- khi chuyển sang SHIPPING
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;      -- khi chuyển sang DONE

-- 2. Bảng order_timeline — audit trail mọi event của đơn
CREATE TABLE IF NOT EXISTS order_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event VARCHAR(50) NOT NULL,     -- ORDER_CREATED | PAYMENT_CONFIRMED | SHIPPED | DELIVERED | CANCELLED | REFUND_REQUESTED | REFUND_APPROVED | REFUND_COMPLETED
  description TEXT,               -- chi tiết (vd: "GHN - Mã vận đơn GHN123456")
  actor VARCHAR(20),              -- 'admin' | 'customer' | 'system'
  metadata JSONB,                 -- data bổ sung (tracking_number, carrier, refund_amount...)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_timeline_order ON order_timeline(order_id, created_at DESC);

-- 3. RLS
ALTER TABLE order_timeline ENABLE ROW LEVEL SECURITY;

-- Customer chỉ xem timeline đơn của mình
DROP POLICY IF EXISTS "order_timeline_self_read" ON order_timeline;
CREATE POLICY "order_timeline_self_read" ON order_timeline FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_timeline.order_id AND orders.customer_id = auth.uid())
);

-- =====================================================
-- DONE
-- =====================================================