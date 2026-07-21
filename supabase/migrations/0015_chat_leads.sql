-- 0015_chat_leads.sql
-- Bảng lưu lead (SĐT/email) do chatbot thu thập khi khách để lại thông tin.
CREATE TABLE IF NOT EXISTS chat_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('phone', 'email', 'zalo')),
  contact_value TEXT NOT NULL,
  intent TEXT,
  matched_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_leads_session ON chat_leads(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_leads_contact ON chat_leads(contact_value);
CREATE INDEX IF NOT EXISTS idx_chat_leads_created ON chat_leads(created_at DESC);

ALTER TABLE chat_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manage chat_leads" ON chat_leads;
CREATE POLICY "Service role manage chat_leads" ON chat_leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE chat_leads IS 'Leads thu thập từ chatbot (SĐT/email khi khách để lại).';
