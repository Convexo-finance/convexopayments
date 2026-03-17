-- Migration 009: OTC enhancements
-- Adds multi-direction support to convexo_accounts and rate/proof tracking to wallet_requests

-- 1. Add directions array to convexo_accounts (replaces single details.direction)
ALTER TABLE convexo_accounts
  ADD COLUMN IF NOT EXISTS directions TEXT[] NOT NULL DEFAULT '{}';

-- Migrate existing single direction from details JSONB into the new array column
UPDATE convexo_accounts
SET directions = CASE
  WHEN details->>'direction' = 'ALL'  THEN ARRAY['COMPRAR','VENDER','COLLECTIONS','PAYMENTS']
  WHEN details->>'direction' = 'OTC'  THEN ARRAY['COMPRAR','VENDER']
  WHEN details->>'direction' IS NOT NULL AND details->>'direction' != '' THEN ARRAY[details->>'direction']
  ELSE '{}'::TEXT[]
END
WHERE array_length(directions, 1) IS NULL;

CREATE INDEX IF NOT EXISTS idx_convexo_accounts_directions ON convexo_accounts USING GIN (directions);

-- 2. Add rate tracking and proof/txn columns to wallet_requests
ALTER TABLE wallet_requests
  ADD COLUMN IF NOT EXISTS provider_rate    NUMERIC,       -- live market rate at order creation
  ADD COLUMN IF NOT EXISTS admin_rate       NUMERIC,       -- rate admin confirmed/overrode
  ADD COLUMN IF NOT EXISTS initial_spread   NUMERIC,       -- spread applied at order creation (fixed %)
  ADD COLUMN IF NOT EXISTS official_spread  NUMERIC,       -- actual spread = |admin_rate - provider_rate| / provider_rate
  ADD COLUMN IF NOT EXISTS txn_url          TEXT,          -- crypto txn URL (VENDER: user provides; COMPRAR: admin provides)
  ADD COLUMN IF NOT EXISTS user_proof_url   TEXT,          -- user's proof of fiat payment (COMPRAR)
  ADD COLUMN IF NOT EXISTS crypto_address   TEXT;          -- user's source crypto address (VENDER)
