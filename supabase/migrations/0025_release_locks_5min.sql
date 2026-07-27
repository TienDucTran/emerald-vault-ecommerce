-- Migration 0025 — Adjust release-expired-locks cron từ 1 phút → 5 phút.
-- Date: 2026-07-27
-- Sprint: "Job optimization (user request: 7 jobs quá nhiều)"
--
-- Lý do:
--   MVP traffic: ~50 orders/ngày. inventory_locks table ~50-200 active rows.
--   Cron mỗi 1 phút chạy 1440 lần/ngày nhưng thực tế chỉ ~3-5 rows expire/ngày.
--   5 phút = 288 lần/ngày (-80%) nhưng user-perceived latency vẫn OK
--   (5 phút delay vs 1 phút delay — không ảnh hưởng UX vì user thấy "Đã hết hạn"
--    qua client-side countdown, không qua cron).
--
-- KHÔNG sửa migration 0022 (đã apply trên prod) → un_schedule + re_schedule.
-- cron.schedule() idempotent trên cùng job name NHƯNG không tự update schedule
-- khi re-run — phải unschedule trước rồi schedule lại.

SELECT cron.unschedule('release-expired-locks');

SELECT cron.schedule(
  'release-expired-locks',     -- cùng job name (idempotent replace)
  '*/5 * * * *',                -- mỗi 5 phút (was: '* * * * *' every minute)
  $$
    UPDATE public.inventory_locks
    SET status = 'EXPIRED', released_at = NOW()
    WHERE status = 'ACTIVE' AND expires_at <= NOW();
  $$
);

-- Verification:
--   SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'release-expired-locks';
--   Expected: schedule = '*/5 * * * *'