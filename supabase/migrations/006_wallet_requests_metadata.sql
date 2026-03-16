-- Add metadata column to wallet_requests for storing
-- rate, spread, COP amount, crypto destination address, etc.
ALTER TABLE wallet_requests
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';

-- Rename old types conceptually (no data change needed):
-- TOPUP   → now also CASH_IN (fiat→USDC via Convexo OTC)
-- WITHDRAW → now also CASH_OUT (USDC→fiat) and CRYPTO_WITHDRAW (on-chain)
-- New types added by app code: CASH_IN, CASH_OUT, CRYPTO_WITHDRAW
-- No constraint enforced — app controls valid values.
