-- FIX: auth.uid() casts sub → uuid. Privy user IDs ('did:privy:…') are not
-- valid UUIDs, so the cast throws a Postgres error on every RLS policy check,
-- silently blocking all authenticated queries (getSessionUser always returned null).
--
-- Solution: public.privy_sub() reads the JWT sub claim as text with no uuid cast.
-- All RLS policies updated to use privy_sub() instead of auth.uid()::text.

CREATE OR REPLACE FUNCTION public.privy_sub()
  RETURNS text
  LANGUAGE sql
  STABLE SECURITY DEFINER
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE privy_user_id = public.privy_sub() AND role = 'ADMIN'
  );
$$;

-- users
DROP POLICY IF EXISTS "user_own_row" ON public.users;
DROP POLICY IF EXISTS "admin_all_users" ON public.users;
CREATE POLICY "user_own_row" ON public.users
  FOR ALL USING (privy_user_id = public.privy_sub());
CREATE POLICY "admin_all_users" ON public.users
  FOR ALL USING (public.is_admin());

-- profiles
DROP POLICY IF EXISTS "user_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "admin_all_profiles" ON public.profiles;
CREATE POLICY "user_own_profile" ON public.profiles
  FOR ALL USING (user_id = (SELECT id FROM users WHERE privy_user_id = public.privy_sub()));
CREATE POLICY "admin_all_profiles" ON public.profiles
  FOR ALL USING (public.is_admin());

-- suppliers
DROP POLICY IF EXISTS "user_own_suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "admin_all_suppliers" ON public.suppliers;
CREATE POLICY "user_own_suppliers" ON public.suppliers
  FOR ALL USING (user_id = (SELECT id FROM users WHERE privy_user_id = public.privy_sub()));
CREATE POLICY "admin_all_suppliers" ON public.suppliers
  FOR ALL USING (public.is_admin());

-- clients
DROP POLICY IF EXISTS "user_own_clients" ON public.clients;
DROP POLICY IF EXISTS "admin_all_clients" ON public.clients;
CREATE POLICY "user_own_clients" ON public.clients
  FOR ALL USING (user_id = (SELECT id FROM users WHERE privy_user_id = public.privy_sub()));
CREATE POLICY "admin_all_clients" ON public.clients
  FOR ALL USING (public.is_admin());

-- payment_orders
DROP POLICY IF EXISTS "user_own_orders" ON public.payment_orders;
DROP POLICY IF EXISTS "admin_all_orders" ON public.payment_orders;
CREATE POLICY "user_own_orders" ON public.payment_orders
  FOR ALL USING (user_id = (SELECT id FROM users WHERE privy_user_id = public.privy_sub()));
CREATE POLICY "admin_all_orders" ON public.payment_orders
  FOR ALL USING (public.is_admin());

-- payment_profiles
DROP POLICY IF EXISTS "user_own_profiles" ON public.payment_profiles;
DROP POLICY IF EXISTS "user_own_entity_profiles" ON public.payment_profiles;
DROP POLICY IF EXISTS "convexo_profiles_read" ON public.payment_profiles;
DROP POLICY IF EXISTS "convexo_profiles_admin_write" ON public.payment_profiles;
CREATE POLICY "user_own_profiles" ON public.payment_profiles
  FOR ALL USING (
    entity_type = 'USER_OWN' AND
    entity_id = (SELECT id FROM users WHERE privy_user_id = public.privy_sub())
  );
CREATE POLICY "user_own_entity_profiles" ON public.payment_profiles
  FOR ALL USING (
    entity_type = ANY (ARRAY['SUPPLIER','CLIENT']) AND
    entity_id IN (
      SELECT id FROM suppliers WHERE user_id = (SELECT id FROM users WHERE privy_user_id = public.privy_sub())
      UNION
      SELECT id FROM clients   WHERE user_id = (SELECT id FROM users WHERE privy_user_id = public.privy_sub())
    )
  );
CREATE POLICY "convexo_profiles_read" ON public.payment_profiles
  FOR SELECT USING (entity_type = 'CONVEXO');
CREATE POLICY "convexo_profiles_admin_write" ON public.payment_profiles
  FOR ALL WITH CHECK (entity_type = 'CONVEXO' AND public.is_admin());

-- notifications
DROP POLICY IF EXISTS "user_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "admin_all_notifications" ON public.notifications;
CREATE POLICY "user_own_notifications" ON public.notifications
  FOR ALL USING (user_id = (SELECT id FROM users WHERE privy_user_id = public.privy_sub()));
CREATE POLICY "admin_all_notifications" ON public.notifications
  FOR ALL USING (public.is_admin());

-- notification_errors
DROP POLICY IF EXISTS "admin_notification_errors" ON public.notification_errors;
CREATE POLICY "admin_notification_errors" ON public.notification_errors
  FOR ALL USING (public.is_admin());

-- wallet_requests
DROP POLICY IF EXISTS "user_own_wallet_requests" ON public.wallet_requests;
DROP POLICY IF EXISTS "admin_all_wallet_requests" ON public.wallet_requests;
CREATE POLICY "user_own_wallet_requests" ON public.wallet_requests
  FOR ALL USING (user_id = (SELECT id FROM users WHERE privy_user_id = public.privy_sub()));
CREATE POLICY "admin_all_wallet_requests" ON public.wallet_requests
  FOR ALL USING (public.is_admin());
