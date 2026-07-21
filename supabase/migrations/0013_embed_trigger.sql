-- ============================================
-- Migration 0013: Auto-build embedding_text on product change
-- Embedding vector được generate bằng scripts/embed-all-products.ts
-- (chạy 1 lần khi setup, hoặc khi cần re-embed sau khi đổi model)
-- ============================================

CREATE OR REPLACE FUNCTION build_product_embedding_text()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.embedding_text := CONCAT_WS(
    ' | ',
    NEW.title,
    COALESCE(NEW.description, ''),
    NEW.material::TEXT,
    NEW.category::TEXT,
    NEW.quality_tier::TEXT,
    COALESCE(array_to_string(NEW.season_tags, ', '), '')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_embedding_text ON products;
CREATE TRIGGER trg_products_embedding_text
  BEFORE INSERT OR UPDATE OF title, description, material, category, quality_tier, season_tags
  ON products
  FOR EACH ROW
  EXECUTE FUNCTION build_product_embedding_text();

-- Backfill existing rows
UPDATE products SET embedding_text = CONCAT_WS(
  ' | ',
  title,
  COALESCE(description, ''),
  material::TEXT,
  category::TEXT,
  quality_tier::TEXT,
  COALESCE(array_to_string(season_tags, ', '), '')
) WHERE embedding_text IS NULL;

DO $$ BEGIN
  RAISE NOTICE '[0013] embedding_text trigger installed + backfilled';
END $$;
