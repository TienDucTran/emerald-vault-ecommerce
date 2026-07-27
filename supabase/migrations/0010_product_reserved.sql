-- ============================================================================
-- Migration 0010_product_reserved — DEPRECATED (2026-07-27)
-- ----------------------------------------------------------------------------
-- This file originally conflicted with 0010_storage_jewelry_images.sql (same
-- numeric prefix, would only run one depending on Supabase CLI sort order).
-- The canonical content has been moved to 0009b_product_reserved.sql which
-- runs AFTER 0009_user_account.sql and BEFORE 0010_storage_jewelry_images.sql.
--
-- This file is now a no-op (just a comment). It is safe to leave here because:
--   - If your Supabase already applied THIS file, the canonical version in
--     0009b_product_reserved.sql uses `ADD VALUE IF NOT EXISTS` and
--     `CREATE OR REPLACE FUNCTION`, so re-running 0009b is idempotent.
--   - If your Supabase has NOT applied this file yet, 0009b will run instead
--     and produce the same schema.
-- For belt-and-suspenders, you can also delete this file from your migrations
-- folder once 0009b has been applied to your remote database.
-- ============================================================================

-- (no SQL — content moved to 0009b_product_reserved.sql)
SELECT '0010_product_reserved.sql is a no-op redirect — see 0009b_product_reserved.sql' AS note;