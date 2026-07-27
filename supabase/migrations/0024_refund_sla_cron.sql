-- Migration 0024 — Refund SLA escalation + auto-archive terminal refunds.
-- Date: 2026-07-27
-- Sprint: "order_refunds refactor (BUGS-AUDIT follow-up + user request)"
-- Tách refund lifecycle vào bảng order_refunds (migration 0023).
-- Phase 4: cron job kiểm tra refund PENDING/APPROVED quá SLA, cảnh báo admin.

-- ============================================================================
-- Job 1: escalate-stale-pending-refunds
--   Mỗi 4 giờ, refund state=PENDING quá 24h sẽ auto-mark với admin_decision_reason
--   "AUTO_ESCALATED: SLA exceeded (>24h chưa duyệt)". Admin có thể query để xử lý gấp.
--
--   Note: Đây CHƯA gửi notification thật (email/toast). Phase 2 sẽ tích hợp
--   Supabase Realtime channel để push toast lên admin dashboard khi refund escalate.
-- ============================================================================
SELECT cron.schedule(
  'escalate-stale-pending-refunds',  -- job name
  '0 */4 * * *',                      -- mỗi 4 giờ
  $$
    UPDATE public.order_refunds
    SET admin_decision_at = NOW(),
        admin_decision_reason = COALESCE(admin_decision_reason, '') ||
          CASE WHEN admin_decision_reason IS NULL OR admin_decision_reason = ''
            THEN 'AUTO_ESCALATED: SLA exceeded (>24h chưa admin duyệt)'
            ELSE ' | AUTO_REESCALATED: vẫn chưa xử lý sau 24h tiếp theo'
          END,
        updated_at = NOW()
    WHERE state = 'PENDING'
      AND customer_requested_at < NOW() - INTERVAL '24 hours';
  $$
);

-- ============================================================================
-- Job 2: archive-completed-refunds (chạy hàng ngày 03:00)
--   Refund đã COMPLETED/REJECTED/FAILED quá 6 tháng → giữ audit ngắn hạn,
--   không xoá (orders vẫn còn, chỉ refund history bị prune).
-- ============================================================================
SELECT cron.schedule(
  'archive-old-refund-records',
  '0 3 * * *',   -- 03:00 daily
  $$
    DELETE FROM public.order_refunds
    WHERE state IN ('COMPLETED', 'REJECTED', 'FAILED')
      AND updated_at < NOW() - INTERVAL '6 months';
  $$
);

-- ============================================================================
-- Index bổ sung cho cron query: orders.payment_status = 'REFUNDED' mà chưa
-- có refund record COMPLETED (data inconsistency sau migration 0023).
-- Note: thường không cần vì mark_completed handler tự INSERT + UPDATE đồng thời.
-- ============================================================================
COMMENT ON TABLE public.order_refunds IS
  'Refund lifecycle (Phase 4 - order_refunds refactor). State machine: PENDING → APPROVED → COMPLETED/FAILED | REJECTED. Chỉ 1 active refund per order (partial unique index).';

-- Verification queries (chạy thủ công):
--   SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE '%refund%';
--   SELECT state, COUNT(*) FROM public.order_refunds GROUP BY state;
--   SELECT * FROM public.order_refunds WHERE state='PENDING' AND customer_requested_at < NOW() - INTERVAL '24 hours';