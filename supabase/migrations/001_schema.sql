-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER',
  is_enabled BOOL NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT, last_name TEXT, id_number TEXT,
  contact_email TEXT, phone TEXT,
  address TEXT, state TEXT, city TEXT, country TEXT,
  rut_url TEXT,
  rut_status TEXT DEFAULT NULL,
  rut_admin_note TEXT,
  usdc_balance DECIMAL(18,6) DEFAULT 0,
  instagram TEXT, twitter TEXT, linkedin TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- suppliers
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  internal_name TEXT NOT NULL,
  legal_name TEXT, company_type TEXT,
  registration_country TEXT, registration_number TEXT,
  contact_email TEXT, company_phone TEXT,
  contact_name TEXT, contact_phone TEXT, contact_person_email TEXT,
  address TEXT, state TEXT, city TEXT, office_country TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- clients (identical structure)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  internal_name TEXT NOT NULL,
  legal_name TEXT, company_type TEXT,
  registration_country TEXT, registration_number TEXT,
  contact_email TEXT, company_phone TEXT,
  contact_name TEXT, contact_phone TEXT, contact_person_email TEXT,
  address TEXT, state TEXT, city TEXT, office_country TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- payment_profiles
CREATE TABLE payment_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  method TEXT NOT NULL,
  label TEXT,
  details JSONB NOT NULL DEFAULT '{}',
  doc_url TEXT,
  is_default BOOL DEFAULT false,
  is_active BOOL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- payment_orders
CREATE TABLE payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  payment_profile_id UUID REFERENCES payment_profiles(id),
  own_profile_id UUID REFERENCES payment_profiles(id),
  amount DECIMAL(18,6) NOT NULL,
  currency TEXT NOT NULL,
  due_date DATE,
  reference TEXT,
  invoice_url TEXT,
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  rejection_reason TEXT,
  status_history JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- wallet_requests
CREATE TABLE wallet_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount DECIMAL(18,6) NOT NULL,
  currency TEXT NOT NULL,
  destination_profile_id UUID REFERENCES payment_profiles(id),
  convexo_account_id UUID REFERENCES payment_profiles(id),
  status TEXT NOT NULL DEFAULT 'PENDIENTE',
  rejection_reason TEXT,
  proof_url TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOL DEFAULT false,
  related_id UUID,
  related_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- notification_errors
CREATE TABLE notification_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_errors ENABLE ROW LEVEL SECURITY;

-- RLS: profiles
CREATE POLICY "user_own_profile" ON profiles FOR ALL
  USING (user_id = (SELECT id FROM users WHERE privy_user_id = auth.uid()::text));

-- RLS: suppliers
CREATE POLICY "user_own_suppliers" ON suppliers FOR ALL
  USING (user_id = (SELECT id FROM users WHERE privy_user_id = auth.uid()::text));
CREATE POLICY "admin_all_suppliers" ON suppliers FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE privy_user_id = auth.uid()::text AND role = 'ADMIN'));

-- RLS: clients
CREATE POLICY "user_own_clients" ON clients FOR ALL
  USING (user_id = (SELECT id FROM users WHERE privy_user_id = auth.uid()::text));
CREATE POLICY "admin_all_clients" ON clients FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE privy_user_id = auth.uid()::text AND role = 'ADMIN'));

-- RLS: payment_profiles
CREATE POLICY "user_own_entity_profiles" ON payment_profiles FOR ALL
  USING (
    entity_type IN ('SUPPLIER','CLIENT') AND entity_id IN (
      SELECT id FROM suppliers WHERE user_id = (SELECT id FROM users WHERE privy_user_id = auth.uid()::text)
      UNION
      SELECT id FROM clients WHERE user_id = (SELECT id FROM users WHERE privy_user_id = auth.uid()::text)
    )
  );
CREATE POLICY "user_own_profiles" ON payment_profiles FOR ALL
  USING (entity_type = 'USER_OWN' AND entity_id = (SELECT id FROM users WHERE privy_user_id = auth.uid()::text));
CREATE POLICY "convexo_profiles_read" ON payment_profiles FOR SELECT
  USING (entity_type = 'CONVEXO');
CREATE POLICY "convexo_profiles_admin_write" ON payment_profiles FOR ALL
  WITH CHECK (entity_type = 'CONVEXO' AND EXISTS (SELECT 1 FROM users WHERE privy_user_id = auth.uid()::text AND role = 'ADMIN'));

-- RLS: payment_orders
CREATE POLICY "user_own_orders" ON payment_orders FOR ALL
  USING (user_id = (SELECT id FROM users WHERE privy_user_id = auth.uid()::text));
CREATE POLICY "admin_all_orders" ON payment_orders FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE privy_user_id = auth.uid()::text AND role = 'ADMIN'));

-- RLS: wallet_requests
CREATE POLICY "user_own_wallet_requests" ON wallet_requests FOR ALL
  USING (user_id = (SELECT id FROM users WHERE privy_user_id = auth.uid()::text));
CREATE POLICY "admin_all_wallet_requests" ON wallet_requests FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE privy_user_id = auth.uid()::text AND role = 'ADMIN'));

-- RLS: notifications
CREATE POLICY "user_own_notifications" ON notifications FOR ALL
  USING (user_id = (SELECT id FROM users WHERE privy_user_id = auth.uid()::text));
CREATE POLICY "admin_all_notifications" ON notifications FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE privy_user_id = auth.uid()::text AND role = 'ADMIN'));

-- RLS: notification_errors (admin only)
CREATE POLICY "admin_notification_errors" ON notification_errors FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE privy_user_id = auth.uid()::text AND role = 'ADMIN'));
