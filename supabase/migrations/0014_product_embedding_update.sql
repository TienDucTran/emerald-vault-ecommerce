-- ============================================
-- Migration 0014: RPC update_product_embedding
-- Dùng bởi scripts/embed-all-products.ts để ghi vector
-- Postgres sẽ tự cast string '[x,x,...]' sang vector(1536).
-- ============================================
CREATE OR REPLACE FUNCTION update_product_embedding(p_id UUID, p_vec vector(1536))
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE products SET embedding = p_vec WHERE id = p_id;
$$;

GRANT EXECUTE ON FUNCTION update_product_embedding(UUID, vector) TO service_role;
