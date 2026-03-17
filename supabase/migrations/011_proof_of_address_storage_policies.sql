-- Storage policies for proof_of_address/ folder (matches pattern of id_docs/ and rut/)

CREATE POLICY "users_upload_own_proof_of_address"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND name LIKE ('proof_of_address/' || (SELECT id::text FROM users WHERE privy_user_id = privy_sub()) || '/%')
);

CREATE POLICY "users_update_own_proof_of_address"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents'
  AND name LIKE ('proof_of_address/' || (SELECT id::text FROM users WHERE privy_user_id = privy_sub()) || '/%')
);

CREATE POLICY "users_read_own_proof_of_address"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND name LIKE ('proof_of_address/' || (SELECT id::text FROM users WHERE privy_user_id = privy_sub()) || '/%')
);
