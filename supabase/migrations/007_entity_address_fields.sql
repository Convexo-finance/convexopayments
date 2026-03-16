-- Add structured address fields to suppliers and clients
-- These are populated by the AddressInput component in EntityWizard

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS office_country_code TEXT,
  ADD COLUMN IF NOT EXISTS state_code TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS office_country_code TEXT,
  ADD COLUMN IF NOT EXISTS state_code TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT;

-- Also add postal_code to profiles (user address)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS postal_code TEXT;
