-- RLS policies for users table (was missing entirely)
CREATE POLICY "user_own_row" ON users FOR ALL
  USING (privy_user_id = auth.uid()::text);

CREATE POLICY "admin_all_users" ON users FOR ALL
  USING (EXISTS (SELECT 1 FROM users u WHERE u.privy_user_id = auth.uid()::text AND u.role = 'ADMIN'));

-- Admin can read all profiles (needed for /admin/usuarios detail view)
CREATE POLICY "admin_all_profiles" ON profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE privy_user_id = auth.uid()::text AND role = 'ADMIN'));
