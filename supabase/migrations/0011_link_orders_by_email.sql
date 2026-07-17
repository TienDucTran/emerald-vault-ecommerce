-- Migration 0011: Link orders to user by email + set customer_id
--
-- Background:
--   Trước đó POST /api/orders KHÔNG set `customer_id` (luôn NULL).
--   → RLS policy `orders_self_read` (auth.uid() = customer_id) fail
--   → /tai-khoan/don-hang luôn trả 0 orders cho mọi user.
--
--   Migration này:
--     1. Mở rộng RPC `link_guest_orders_to_user` để set customer_id
--        theo customer_email = auth.users.email (match an toàn)
--     2. Backfill ngay các orders cũ có customer_email match với user đang active
--     3. Thêm helper RPC `link_orders_by_email_for_current_user()` để gọi từ client
--        sau khi user login/signup
--
--   Sau khi áp dụng:
--     - Orders mới: API /api/orders set customer_id trực tiếp khi user login
--     - Orders cũ (guest checkout): user login xong gọi RPC để backfill

-- ============================================================
-- 1) Mở rộng link_guest_orders_to_user: set customer_id theo email
-- ============================================================
CREATE OR REPLACE FUNCTION link_guest_orders_to_user(
  p_user_id UUID,
  p_phone VARCHAR DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email TEXT;
  v_count INT;
BEGIN
  -- Lấy email từ auth.users
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = p_user_id;

  IF v_user_email IS NULL THEN
    RETURN 0;
  END IF;

  -- Update orders có customer_email trùng với user email
  -- mà chưa gắn customer_id (NULL hoặc empty)
  UPDATE orders
  SET customer_id = p_user_id
  WHERE customer_email = v_user_email
    AND (customer_id IS NULL OR customer_id = '');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION link_guest_orders_to_user IS
  'Link guest orders (matched by email) to newly registered/logged-in user. Set customer_id to enable /tai-khoan/don-hang view.';

-- ============================================================
-- 2) Helper RPC cho client: link orders cho current user
-- ============================================================
-- Gọi từ client sau khi login/signup thành công.
-- Dùng auth.uid() để xác định user, không cần truyền tham số.
-- Trả về số orders đã link.
CREATE OR REPLACE FUNCTION link_my_guest_orders()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_count INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  IF v_user_email IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE orders
  SET customer_id = v_user_id
  WHERE customer_email = v_user_email
    AND (customer_id IS NULL OR customer_id = '');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION link_my_guest_orders IS
  'Link current user (auth.uid()) to guest orders matched by email. Returns count of linked orders.';

-- ============================================================
-- 3) Grant quyền gọi RPC cho authenticated users
-- ============================================================
GRANT EXECUTE ON FUNCTION link_my_guest_orders() TO authenticated;

-- ============================================================
-- 4) Backfill ngay: link tất cả orders cũ có customer_email match user active
-- ============================================================
-- Chạy 1 lần khi apply migration. Lặp qua từng user có profile.
DO $$
DECLARE
  r RECORD;
  v_linked INT;
  v_total INT := 0;
BEGIN
  FOR r IN
    SELECT u.id AS user_id, u.email
    FROM auth.users u
    WHERE EXISTS (
      SELECT 1 FROM orders o
      WHERE o.customer_email = u.email
        AND (o.customer_id IS NULL OR o.customer_id = '')
    )
  LOOP
    UPDATE orders
    SET customer_id = r.user_id
    WHERE customer_email = r.email
      AND (customer_id IS NULL OR customer_id = '');

    GET DIAGNOSTICS v_linked = ROW_COUNT;
    v_total := v_total + v_linked;
    RAISE NOTICE '[0011] Linked % orders for user % (%)', v_linked, r.user_id, r.email;
  END LOOP;

  RAISE NOTICE '[0011] BACKFILL DONE: % total orders linked to users', v_total;
END $$;
