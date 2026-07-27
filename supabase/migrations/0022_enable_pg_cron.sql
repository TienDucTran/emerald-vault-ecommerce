-- Migration 0022 — Enable pg_cron + release expired inventory_locks every minute.
-- Date: 2026-07-27
-- Sprint: "Fix BUGS-AUDIT (BLOCKER B12)" — pg_cron was claimed done in flows.md §0/§13
-- but no migration actually enabled the extension or scheduled the job.
-- After this migration, locks expired > 10 minutes are automatically released
-- (sets status='EXPIRED', released_at=NOW()), so the product becomes available
-- for other customers without requiring user action.

-- 1) Enable extension (idempotent — Supabase requires it once).
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2) Schedule job: every minute, mark ACTIVE locks whose expires_at has passed as EXPIRED.
-- cron.schedule() is idempotent on the same job name: re-running this migration won't
-- duplicate the job. If we ever need to drop it: SELECT cron.unschedule('release-expired-locks');
SELECT cron.schedule(
  'release-expired-locks',     -- job name
  '* * * * *',                  -- every minute
  $$
    UPDATE public.inventory_locks
    SET status = 'EXPIRED', released_at = NOW()
    WHERE status = 'ACTIVE' AND expires_at <= NOW();
  $$
);

-- Verification query (run manually to confirm):
--   SELECT * FROM cron.job WHERE jobname = 'release-expired-locks';
--   SELECT status, COUNT(*) FROM public.inventory_locks GROUP BY status;