-- =====================================================
-- 0039 — MoMo Timeout Auto-Cancel
-- Cron mỗi 15 phút: cancel MoMo orders NEW > 15 phút chưa nhận IPN.
-- Release locks CONVERTED → RELEASED, restore products RESERVED → AVAILABLE.
-- Giải quyết: order stuck PENDING mãi nếu user đóng app sau redirect MoMo.
-- =====================================================

-- 1. Function cancel stale MoMo orders
CREATE OR REPLACE FUNCTION cancel_stale_momo_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
  v_order_ids UUID[];
BEGIN
  -- Tìm MoMo orders NEW > 15 phút (chưa nhận IPN success)
  SELECT array_agg(id) INTO v_order_ids
  FROM orders
  WHERE status = 'NEW'
    AND payment_method = 'MOMO'
    AND created_at < NOW() - INTERVAL '15 minutes';

  IF v_order_ids IS NULL OR array_length(v_order_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- 1. Release inventory_locks CONVERTED → RELEASED
  UPDATE inventory_locks
  SET status = 'RELEASED', released_at = NOW()
  WHERE order_id = ANY(v_order_ids)
    AND status = 'CONVERTED';

  -- 2. Restore products RESERVED → AVAILABLE
  UPDATE products
  SET status = 'AVAILABLE'
  WHERE id IN (
    SELECT product_id FROM order_items
    WHERE order_id = ANY(v_order_ids)
  )
  AND status = 'RESERVED';

  -- 3. Cancel orders
  UPDATE orders
  SET status = 'CANCELLED',
      payment_status = 'FAILED',
      updated_at = NOW()
  WHERE id = ANY(v_order_ids);

  -- 4. Log timeline event (nếu bảng order_timeline tồn tại)
  INSERT INTO order_timeline (order_id, event, description, actor, metadata)
  SELECT id, 'CANCELLED', 'Auto-cancel: MoMo timeout 15 phút chưa nhận IPN', 'system', jsonb_build_object('reason', 'MOMO_TIMEOUT')
  FROM orders
  WHERE id = ANY(v_order_ids)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 2. Schedule cron mỗi 15 phút (offset khỏi release-expired-locks */5)
-- Chạy lúc :02, :17, :32, :47 (tránh đụng release-expired-locks :00/:05/:10...)
SELECT cron.schedule(
  'cancel-stale-momo-orders',
  '2,17,32,47 * * * *',
  $$ SELECT cancel_stale_momo_orders(); $$
);

-- =====================================================
-- Verification (run manually):
--   SELECT * FROM cron.job WHERE jobname = 'cancel-stale-momo-orders';
--   SELECT cancel_stale_momo_orders();  -- chạy 1 lần để verify
--   SELECT code, status, payment_method, created_at FROM orders
--   WHERE payment_method = 'MOMO' AND status = 'NEW' AND created_at < NOW() - INTERVAL '15 minutes';
-- =====================================================