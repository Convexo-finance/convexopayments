-- Add missing profile columns for onboarding/verification flow
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS proof_of_address_url TEXT;

-- Note: linkedin, twitter, instagram columns already exist.
-- website_url stores a full URL (e.g. https://example.com).
-- proof_of_address_url stores a Supabase storage public URL (same pattern as id_doc_url, rut_url).
