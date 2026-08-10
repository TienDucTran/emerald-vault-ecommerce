-- =====================================================
-- Migration 0033: RPC restore_products_on_admin_cancel (optional)
-- =====================================================
-- Context:
--   Khi admin hủy đơn đã thanh toán (PAID), products đã SOLD_OUT.
--   RPC release_product_reservation chỉ touch RESERVED (safety design).
--   Admin cancel cần restore SOLD_OUT → AVAILABLE cho case này.
--
--   NOTE: Code trong admin/orders/[id]/route.ts đã fallback về
--   direct UPDATE products SET status='AVAILABLE' WHERE status='SOLD_OUT'
--   (không cần RPC này). Migration này là optional — chạy nếu muốn
--   dùng RPC cho consistency với các RPC khác.
--
-- Chạy thủ công trên Supabase Dashboard → SQL Editor (repo không dùng CLI).
-- Idempotent: re-run an toàn (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION restore_products_on_admin_cancel(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_product_id UUID;
BEGIN
  FOR v_product_id IN
    SELECT product_id FROM order_items WHERE order_id = p_order_id
  LOOP
    UPDATE products
    SET status = 'AVAILABLE'
    WHERE id = v_product_id
      AND status = 'SOLD_OUT';  -- chỉ restore SOLD_OUT, không touch AVAILABLE/RESERVED
  END LOOP;
END;
$$;

COMMENT ON FUNCTION restore_products_on_admin_cancel IS
  'Restore SOLD_OUT → AVAILABLE cho products thuộc order bị admin cancel. Dùng khi admin chủ động hủy đơn đã thanh toán. (Optional — code đã có fallback direct UPDATE.)';