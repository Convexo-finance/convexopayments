-- convexo_accounts
-- Stores Convexo's own receiving accounts (bank, crypto, cash points).
-- Created via MCP in an earlier session; this migration documents the schema.
CREATE TABLE IF NOT EXISTS convexo_accounts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method     TEXT NOT NULL,               -- 'BANK' | 'CRYPTO' | 'CASH'
  label      TEXT,
  details    JSONB NOT NULL DEFAULT '{}', -- all sub-fields live here (no fixed columns needed)
  is_default BOOL DEFAULT false,
  is_active  BOOL DEFAULT true,
  doc_url    TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Only admins can write; any authenticated user can read active accounts.
ALTER TABLE convexo_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "convexo_accounts_read" ON convexo_accounts
  FOR SELECT USING (is_active = true);

CREATE POLICY IF NOT EXISTS "convexo_accounts_admin_write" ON convexo_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE privy_user_id = (auth.jwt() ->> 'sub')
        AND role = 'admin'
    )
  );
