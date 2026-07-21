-- ============================================
-- Migration 0012: AI Chatbot schema (pgvector + chat tables)
-- Tương ứng flows.md §15.3 + §15.6
-- ============================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding columns to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding_text TEXT;

-- 3. ivfflat index for cosine similarity search
CREATE INDEX IF NOT EXISTS idx_products_embedding ON products
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 4. chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR(120) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_client ON chat_sessions(client_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id) WHERE user_id IS NOT NULL;

-- 5. chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'tool', 'system')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_results JSONB,
  tokens_used INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at);

-- 6. RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read own chat_sessions" ON chat_sessions;
CREATE POLICY "Public read own chat_sessions" ON chat_sessions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role manage chat_sessions" ON chat_sessions;
CREATE POLICY "Service role manage chat_sessions" ON chat_sessions
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "Public read chat_messages" ON chat_messages;
CREATE POLICY "Public read chat_messages" ON chat_messages
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role manage chat_messages" ON chat_messages;
CREATE POLICY "Service role manage chat_messages" ON chat_messages
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- 7. RPC: semantic product search via pgvector
CREATE OR REPLACE FUNCTION match_products(
  query_embedding vector(1536),
  match_count INT DEFAULT 5,
  filter_status product_status_enum DEFAULT 'AVAILABLE'
)
RETURNS TABLE (
  id UUID, title VARCHAR, slug VARCHAR, price NUMERIC,
  image_url TEXT, material material_enum, quality_tier quality_tier_enum,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.title, p.slug, p.price, p.image_url, p.material, p.quality_tier,
         1 - (p.embedding <=> query_embedding) AS similarity
  FROM products p
  WHERE p.embedding IS NOT NULL
    AND p.status = filter_status
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_products TO anon, authenticated, service_role;

-- 8. RPC: upsert chat session (idempotent by client_id, 24h window)
CREATE OR REPLACE FUNCTION upsert_chat_session(p_client_id VARCHAR, p_user_id UUID DEFAULT NULL)
RETURNS chat_sessions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session chat_sessions;
BEGIN
  SELECT * INTO v_session
  FROM chat_sessions
  WHERE client_id = p_client_id
    AND last_message_at > NOW() - INTERVAL '24 hours'
  ORDER BY last_message_at DESC
  LIMIT 1;

  IF v_session.id IS NOT NULL THEN
    UPDATE chat_sessions SET last_message_at = NOW() WHERE id = v_session.id;
    SELECT * INTO v_session FROM chat_sessions WHERE id = v_session.id;
    RETURN v_session;
  END IF;

  INSERT INTO chat_sessions (client_id, user_id)
  VALUES (p_client_id, p_user_id)
  RETURNING * INTO v_session;
  RETURN v_session;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_chat_session TO anon, authenticated, service_role;

DO $$ BEGIN
  RAISE NOTICE '[0012] Chatbot schema ready (pgvector + chat_sessions + chat_messages + match_products + upsert_chat_session)';
END $$;
