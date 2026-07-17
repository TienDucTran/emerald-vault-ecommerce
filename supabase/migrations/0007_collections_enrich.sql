-- Migration 0007: Collections enrichment (launch_at, story, hero_gallery, SEO, updated_at trigger)
-- Extends collections table for latest-drops, long-form story, hero gallery, and per-collection SEO.

ALTER TABLE collections
  ADD COLUMN IF NOT EXISTS launch_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS story_text TEXT,
  ADD COLUMN IF NOT EXISTS hero_gallery TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meta_title VARCHAR(160),
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_collections_launch ON collections(launch_at DESC) WHERE launch_at IS NOT NULL;

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_collections_touch ON collections;
CREATE TRIGGER trg_collections_touch
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- DOWN:
--   DROP TRIGGER IF EXISTS trg_collections_touch ON collections;
--   DROP FUNCTION IF EXISTS touch_updated_at();
--   ALTER TABLE collections
--     DROP COLUMN IF EXISTS launch_at,
--     DROP COLUMN IF EXISTS story_text,
--     DROP COLUMN IF EXISTS hero_gallery,
--     DROP COLUMN IF EXISTS meta_title,
--     DROP COLUMN IF EXISTS meta_description,
--     DROP COLUMN IF EXISTS updated_at;
