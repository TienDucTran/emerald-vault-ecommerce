-- Migration 0006: Newsletter subscribers table + RLS
-- Allows public email subscriptions and admin management.
-- Source tracks where signup came from: 'homepage' | 'footer' | 'popup' | 'admin'

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(120) UNIQUE NOT NULL,
  full_name VARCHAR(120),
  source VARCHAR(40) DEFAULT 'homepage',
  is_active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_newsletter_active ON newsletter_subscribers(is_active, subscribed_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Public (anon) can read only active subscribers (e.g. to check duplicates before insert)
DROP POLICY IF EXISTS newsletter_select_active_anon ON newsletter_subscribers;
CREATE POLICY newsletter_select_active_anon
  ON newsletter_subscribers
  FOR SELECT
  TO anon
  USING (is_active = true);

-- Public (anon) can subscribe (insert)
DROP POLICY IF EXISTS newsletter_insert_anon ON newsletter_subscribers;
CREATE POLICY newsletter_insert_anon
  ON newsletter_subscribers
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Authenticated users can read only active subscribers
DROP POLICY IF EXISTS newsletter_select_active_auth ON newsletter_subscribers;
CREATE POLICY newsletter_select_active_auth
  ON newsletter_subscribers
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Service role: full access (bypasses RLS by default, but explicit for clarity)
DROP POLICY IF EXISTS newsletter_all_service ON newsletter_subscribers;
CREATE POLICY newsletter_all_service
  ON newsletter_subscribers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- DOWN: DROP TABLE IF EXISTS newsletter_subscribers;
