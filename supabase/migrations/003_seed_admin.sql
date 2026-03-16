-- Replace 'YOUR_PRIVY_USER_ID' with the actual Privy user ID of the first admin
-- Run this after the first admin user logs in (which creates the users row)

-- UPDATE users
--   SET role = 'ADMIN'
--   WHERE email = 'admin@example.com';

-- Or by privy_user_id:
-- UPDATE users
--   SET role = 'ADMIN'
--   WHERE privy_user_id = 'did:privy:YOUR_PRIVY_USER_ID';
