# pay.convexo.xyz Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full pay.convexo.xyz MVP — a B2B payment orchestration platform for paying suppliers and collecting from clients via hybrid fiat/crypto rails.

**Architecture:** Next.js 16 App Router with Server Actions for all business logic (no REST API). Supabase for PostgreSQL + RLS + Realtime + Storage. Privy for email OTP / passkey auth. Vercel deployment.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS, Framer Motion, Supabase JS v2, Privy React SDK, Resend, next-intl v3, Vitest + Testing Library

---

## File Map

```
app/
  (auth)/login/page.tsx              Login page (Privy)
  (app)/layout.tsx                   Auth gate + sidebar layout
  (app)/dashboard/page.tsx
  (app)/proveedores/page.tsx
  (app)/proveedores/new/page.tsx
  (app)/proveedores/[id]/page.tsx
  (app)/clientes/page.tsx
  (app)/clientes/new/page.tsx
  (app)/clientes/[id]/page.tsx
  (app)/pagar/page.tsx
  (app)/pagar/new/page.tsx
  (app)/pagar/[id]/page.tsx
  (app)/cobrar/page.tsx
  (app)/cobrar/new/page.tsx
  (app)/cobrar/[id]/page.tsx
  (app)/cuenta/page.tsx
  (app)/perfil/page.tsx
  (app)/notificaciones/page.tsx
  admin/layout.tsx                   Admin auth gate   ← app/admin/layout.tsx
  admin/page.tsx                                       ← app/admin/page.tsx
  admin/usuarios/page.tsx                              ← app/admin/usuarios/page.tsx
  admin/usuarios/[id]/page.tsx
  admin/pagar/page.tsx
  admin/cobrar/page.tsx
  admin/cuenta/page.tsx
  admin/proveedores/page.tsx
  admin/clientes/page.tsx
  admin/configuracion/page.tsx
  admin/notificaciones/page.tsx
  -- NOTE: ALL admin routes live under app/admin/ (Next.js App Router requires this)
  globals.css
  layout.tsx                         Root layout (Privy + i18n providers)

components/
  ui/Button.tsx
  ui/Input.tsx
  ui/Badge.tsx
  ui/StatusBadge.tsx
  ui/Modal.tsx
  ui/FileUpload.tsx
  ui/Pagination.tsx
  layout/Sidebar.tsx
  layout/Topbar.tsx
  layout/NotificationBell.tsx
  entities/EntityWizard.tsx          4-step wizard (shared Suppliers/Clients)
  entities/PaymentProfileCard.tsx
  entities/PaymentProfileForm.tsx
  orders/OrderForm.tsx
  orders/OrderTable.tsx
  orders/OrderStatusHistory.tsx
  admin/AdminOrderTable.tsx
  admin/RUTVerificationPanel.tsx

lib/
  supabase/client.ts                 Browser Supabase client
  supabase/server.ts                 Server Supabase client (Server Actions)
  supabase/types.ts                  Generated DB types
  privy/server.ts                    Server-side Privy session validation
  actions/auth.ts                    Login, session, account gate
  actions/profile.ts                 User profile CRUD + RUT upload
  actions/entities.ts                Suppliers + clients CRUD
  actions/payment-profiles.ts        Payment profile CRUD
  actions/orders.ts                  Order create/update/status transitions
  actions/wallet.ts                  Wallet requests
  actions/notifications.ts           Create + mark-read notifications
  actions/admin.ts                   Admin-only actions (all require ADMIN role)
  resend/emails.ts                   Email templates + send functions
  utils/currency.ts                  Currency helpers
  utils/phone.ts                     Phone/country code helpers

supabase/
  migrations/001_schema.sql          Full schema + RLS policies
  migrations/002_seed_admin.sql      Seed first admin user

messages/
  en.json
  es.json

middleware.ts                        i18n cookie + auth redirect

tests/
  actions/entities.test.ts
  actions/orders.test.ts
  actions/admin.test.ts
  actions/payment-profiles.test.ts
```

---

## Chunk 1: Foundation — Project, DB, Auth, i18n

### Task 1: Bootstrap Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`

- [ ] Run scaffold:
```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```
- [ ] Install dependencies:
```bash
npm install @supabase/supabase-js @supabase/ssr @privy-io/react-auth \
  resend next-intl framer-motion \
  && npm install -D vitest @vitejs/plugin-react @testing-library/react \
  @testing-library/jest-dom jsdom
```
- [ ] Add to `next.config.ts`:
```ts
import createNextIntlPlugin from 'next-intl/plugin'
const withNextIntl = createNextIntlPlugin()
export default withNextIntl({ webpack: (config) => config })
```
- [ ] Commit:
```bash
git add -A && git commit -m "chore: bootstrap Next.js 16 project"
```

---

### Task 2: Supabase schema + RLS

**Files:**
- Create: `supabase/migrations/001_schema.sql`

- [ ] Write migration (paste full schema from spec Section 13 + RLS policies from spec Section 6):
```sql
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
CREATE POLICY "convexo_profiles_admin_write" ON payment_profiles
  FOR INSERT, UPDATE, DELETE
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

-- RLS: notification_errors (admin-read only)
ALTER TABLE notification_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_notification_errors" ON notification_errors FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE privy_user_id = auth.uid()::text AND role = 'ADMIN'));
```
- [ ] Apply migration:
```bash
npx supabase db push
```
- [ ] Verify tables created in Supabase dashboard
- [ ] Generate TypeScript types:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/types.ts
```
- [ ] Commit:
```bash
git add -A && git commit -m "feat: supabase schema + RLS policies"
```

---

### Task 2.5: Privy → Supabase JWT bridge (CRITICAL — RLS depends on this)

**Context:** Supabase RLS policies use `auth.uid()` to identify the current user. By default this returns the Supabase Auth user ID. Since this app uses Privy (not Supabase Auth), we must configure Supabase to accept Privy-issued JWTs so that `auth.uid()` returns the Privy user ID (`privy_user_id`).

**Files:**
- Modify: `lib/supabase/server.ts` (pass Privy token as Authorization header)
- Modify: `lib/supabase/client.ts` (same for browser)
- Supabase dashboard: configure custom JWT secret

- [ ] In Supabase dashboard → Settings → API → JWT Settings: set the JWT secret to match Privy's signing key (or use Privy's JWKS endpoint if Supabase supports asymmetric JWT — check Privy docs for `getAccessToken` which returns a JWT signed with `PRIVY_APP_SECRET`)

- [ ] Update `lib/supabase/server.ts` to pass the Privy token as the auth header:
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

export async function createClient(privyToken?: string) {
  const cookieStore = await cookies()
  const globalHeaders: Record<string, string> = {}
  if (privyToken) {
    globalHeaders['Authorization'] = `Bearer ${privyToken}`
  }
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: globalHeaders },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

- [ ] Update ALL Server Actions that call `createClient()` to pass `privyToken` so RLS works:
```ts
// Before: const supabase = await createClient()
// After:
const supabase = await createClient(privyToken)
```

- [ ] Verify in Supabase SQL editor:
```sql
-- After login with a valid Privy token, this should return the Privy user ID
SELECT auth.uid();
```

- [ ] Commit: `git commit -m "feat: privy→supabase JWT bridge for RLS"`

---

### Task 3: Supabase clients

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`

- [ ] Write `lib/supabase/client.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```
- [ ] Write `lib/supabase/server.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```
- [ ] Add `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
NEXT_PUBLIC_PRIVY_APP_ID=your-privy-app-id
PRIVY_APP_SECRET=your-privy-app-secret
RESEND_API_KEY=re_...
```
- [ ] Commit: `git commit -m "feat: supabase client setup"`

---

### Task 4: Privy auth + session validation

**Files:**
- Create: `lib/privy/server.ts`, `app/layout.tsx`, `app/(auth)/login/page.tsx`

- [ ] Write `lib/privy/server.ts`:
```ts
import { PrivyClient } from '@privy-io/server-auth'

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)

export async function verifyPrivyToken(token: string) {
  return privy.verifyAuthToken(token)
}

export async function getPrivyUser(token: string) {
  const claims = await verifyPrivyToken(token)
  return claims
}
```
- [ ] Install server auth: `npm install @privy-io/server-auth`
- [ ] Write root `app/layout.tsx` with PrivyProvider:
```tsx
import { PrivyProvider } from '@privy-io/react-auth'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()
  return (
    <html lang={locale}>
      <body>
        <PrivyProvider appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
          config={{ loginMethods: ['email', 'passkey'], appearance: { theme: 'dark' } }}>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </PrivyProvider>
      </body>
    </html>
  )
}
```
- [ ] Write `app/(auth)/login/page.tsx` — Privy login button, brand colors, logo
- [ ] Write `lib/actions/auth.ts`:
```ts
'use server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getPrivyUser } from '@/lib/privy/server'

export async function ensureUser(privyToken: string) {
  const claims = await getPrivyUser(privyToken)
  const supabase = await createClient()

  // Upsert user record
  const { data: user } = await supabase
    .from('users')
    .upsert({ privy_user_id: claims.userId, email: claims.email ?? '' },
             { onConflict: 'privy_user_id' })
    .select()
    .single()

  if (!user?.is_enabled) throw new Error('ACCOUNT_DISABLED')
  return user
}

export async function getSessionUser(privyToken: string) {
  const claims = await getPrivyUser(privyToken)
  const supabase = await createClient()
  const { data } = await supabase
    .from('users')
    .select()
    .eq('privy_user_id', claims.userId)
    .single()
  return data
}

// Guard for admin Server Actions
export async function requireAdmin(privyToken: string) {
  const user = await getSessionUser(privyToken)
  if (!user || user.role !== 'ADMIN') throw new Error('UNAUTHORIZED')
  return user
}
```
- [ ] Commit: `git commit -m "feat: privy auth + session guards"`

---

### Task 5: i18n setup + middleware

**Files:**
- Create: `middleware.ts`, `messages/en.json`, `messages/es.json`, `i18n/request.ts`

- [ ] Write `i18n/request.ts`:
```ts
import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const locale = cookieStore.get('NEXT_LOCALE')?.value ?? 'en'
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  }
})
```
- [ ] Write `middleware.ts`:
```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Default locale cookie if not set
  const response = NextResponse.next()
  if (!request.cookies.get('NEXT_LOCALE')) {
    response.cookies.set('NEXT_LOCALE', 'en')
  }
  return response
}
export const config = { matcher: ['/((?!_next|favicon).*)'] }
```
- [ ] Seed `messages/en.json` with keys for nav, statuses, common labels
- [ ] Seed `messages/es.json` with Spanish translations
- [ ] Commit: `git commit -m "feat: i18n cookie-based ES/EN"`

---

### Task 6: Brand design system + layout

**Files:**
- Create: `app/globals.css`, `components/layout/Sidebar.tsx`, `components/layout/Topbar.tsx`, `components/ui/StatusBadge.tsx`, `app/(app)/layout.tsx`

- [ ] Write `app/globals.css` with CSS variables:
```css
:root {
  --navy: #081F5C;
  --purple: #401777;
  --blue: #334EAC;
  --sky: #BAD6EB;
  --cream: #FFF9EF;
}
body { background: var(--cream); color: var(--navy); }
```
- [ ] Write `components/layout/Sidebar.tsx` — dark navy sidebar, logo mark, nav items with active state, user chip at bottom. Nav groups: Overview (Dashboard, Cuenta), Contacts (Proveedores, Clientes), Operations (Pagar, Cobrar), Account (Perfil)
- [ ] Write `components/layout/Topbar.tsx` — page title, breadcrumb, notification bell, language toggle, primary CTA button slot
- [ ] Write `components/ui/StatusBadge.tsx`:
```tsx
const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ENVIADO: 'bg-blue-100 text-blue-700',
  EN_REVISION: 'bg-yellow-100 text-yellow-800',
  PROCESANDO: 'bg-indigo-100 text-indigo-700',
  PAGADO: 'bg-green-100 text-green-800',
  RECHAZADO: 'bg-red-100 text-red-700',
  CANCELADO: 'bg-gray-200 text-gray-500',
}
export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_STYLES[status] ?? ''}`}>{status}</span>
}
```
- [ ] Write `app/(app)/layout.tsx` — auth gate (redirect to /login if no Privy token), renders Sidebar + Topbar
- [ ] Write `admin/layout.tsx` — same but checks `role === ADMIN` server-side, redirects to /dashboard if not admin
- [ ] Commit: `git commit -m "feat: brand design system + app layout"`

---

## Chunk 2: User Profile + RUT

### Task 7: Profile Server Actions + tests

**Files:**
- Create: `lib/actions/profile.ts`, `tests/actions/profile.test.ts`

- [ ] Write failing tests `tests/actions/profile.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'
// Mock supabase
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

describe('upsertProfile', () => {
  it('saves profile fields to supabase', async () => { /* ... */ })
  it('sets rut_status to PENDIENTE when rut_url provided', async () => { /* ... */ })
  it('throws if user not found', async () => { /* ... */ })
})
```
- [ ] Run: `npx vitest run tests/actions/profile.test.ts` — expect FAIL
- [ ] Write `lib/actions/profile.ts`:
```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from './auth'

export async function upsertProfile(privyToken: string, data: ProfileInput) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient()
  const payload = {
    ...data,
    user_id: user.id,
    updated_at: new Date().toISOString(),
    ...(data.rut_url ? { rut_status: 'PENDIENTE' } : {}),
  }
  const { data: profile, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw error
  return profile
}

export async function uploadRUT(privyToken: string, file: File) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient()
  const path = `rut/${user.id}/${Date.now()}.pdf`
  const { error } = await supabase.storage.from('documents').upload(path, file)
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
  return publicUrl
}
```
- [ ] Run tests: `npx vitest run tests/actions/profile.test.ts` — expect PASS
- [ ] Commit: `git commit -m "feat: profile server actions"`

---

### Task 8: Profile page UI

**Files:**
- Create: `app/(app)/perfil/page.tsx`, `components/ui/FileUpload.tsx`

- [ ] Write `components/ui/FileUpload.tsx` — drag-drop zone, PDF only, shows filename after upload, calls onUpload callback
- [ ] Write `app/(app)/perfil/page.tsx`:
  - Two-column layout: left = form (required fields), right = payment profiles list
  - Form: First/Last Name, ID Number, Contact Email, Phone (with country code select), Address/State/City/Country
  - Socials section (optional): Instagram, X, LinkedIn
  - RUT upload section: FileUpload component + status badge (shows current rut_status)
  - Own payment profiles: list of USER_OWN profiles + "Add Payment Method" button → PaymentProfileForm modal
- [ ] Commit: `git commit -m "feat: profile page with RUT upload"`

---

## Chunk 3: Entities + Payment Profiles

### Task 9: Entity Server Actions + tests

**Files:**
- Create: `lib/actions/entities.ts`, `tests/actions/entities.test.ts`

- [ ] Write failing tests:
```ts
describe('createSupplier', () => {
  it('creates supplier linked to user', async () => { /* */ })
  it('warns on duplicate contact_email within user scope', async () => { /* */ })
})
describe('createClient', () => {
  it('creates client linked to user', async () => { /* */ })
})
describe('getSuppliers', () => {
  it('returns only current user suppliers paginated', async () => { /* */ })
})
```
- [ ] Run — expect FAIL
- [ ] Write `lib/actions/entities.ts`:
```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from './auth'

export async function createSupplier(privyToken: string, data: SupplierInput) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient()
  // Duplicate check
  const { data: existing } = await supabase.from('suppliers')
    .select('id').eq('user_id', user.id).eq('contact_email', data.contact_email).maybeSingle()
  const warning = existing ? 'DUPLICATE_EMAIL' : null
  const { data: supplier, error } = await supabase.from('suppliers')
    .insert({ ...data, user_id: user.id }).select().single()
  if (error) throw error
  return { supplier, warning }
}

export async function getSuppliers(privyToken: string, { page = 1, search = '' } = {}) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient()
  const from = (page - 1) * 20
  let q = supabase.from('suppliers').select('*', { count: 'exact' })
    .eq('user_id', user.id).range(from, from + 19).order('created_at', { ascending: false })
  if (search) q = q.ilike('internal_name', `%${search}%`)
  const { data, count, error } = await q
  if (error) throw error
  return { data, total: count ?? 0 }
}

// createClient, getClients — identical pattern
export async function createEntityClient(privyToken: string, data: ClientInput) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient()
  const { data: existing } = await supabase.from('clients')
    .select('id').eq('user_id', user.id).eq('contact_email', data.contact_email).maybeSingle()
  const warning = existing ? 'DUPLICATE_EMAIL' : null
  const { data: client, error } = await supabase.from('clients')
    .insert({ ...data, user_id: user.id }).select().single()
  if (error) throw error
  return { client, warning }
}

export async function getClients(privyToken: string, { page = 1, search = '' } = {}) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient()
  const from = (page - 1) * 20
  let q = supabase.from('clients').select('*', { count: 'exact' })
    .eq('user_id', user.id).range(from, from + 19).order('created_at', { ascending: false })
  if (search) q = q.ilike('internal_name', `%${search}%`)
  const { data, count, error } = await q
  if (error) throw error
  return { data, total: count ?? 0 }
}
```
- [ ] Run tests — expect PASS
- [ ] Also add to `lib/actions/entities.ts`:
```ts
export async function getSupplierById(privyToken: string, id: string) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).eq('user_id', user.id).single()
  if (error) throw error
  return data
}

export async function updateSupplier(privyToken: string, id: string, data: Partial<SupplierInput>) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const { data: updated, error } = await supabase.from('suppliers').update(data).eq('id', id).eq('user_id', user.id).select().single()
  if (error) throw error
  return updated
}

export async function getClientById(privyToken: string, id: string) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).eq('user_id', user.id).single()
  if (error) throw error
  return data
}

export async function updateClient(privyToken: string, id: string, data: Partial<ClientInput>) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const { data: updated, error } = await supabase.from('clients').update(data).eq('id', id).eq('user_id', user.id).select().single()
  if (error) throw error
  return updated
}
```
- [ ] Commit: `git commit -m "feat: entity server actions (suppliers + clients)"`

---

### Task 10: 4-step Entity Wizard UI

**Files:**
- Create: `components/entities/EntityWizard.tsx`, `app/(app)/proveedores/new/page.tsx`, `app/(app)/clientes/new/page.tsx`

- [ ] Write `components/entities/EntityWizard.tsx` — shared wizard with 4 steps:
  - Step 1: Internal name + registration country (China/USA/Europe/Other)
  - Step 2: Legal name, company type (dynamic by country), registration number, contact email (with duplicate warning inline), company phone
  - Step 3: Contact person name, phone, email
  - Step 4: Address, state, city, office country
  - Progress bar across top (step 1/4 etc.), Back/Next/Submit buttons
  - Prop: `entityType: 'supplier' | 'client'`
- [ ] Wire `/proveedores/new` and `/clientes/new` pages to the wizard with correct `entityType`
- [ ] On submit: call `createSupplier` or `createEntityClient` → redirect to detail page
- [ ] Commit: `git commit -m "feat: 4-step entity creation wizard"`

---

### Task 11: Payment Profile Actions + UI

**Files:**
- Create: `lib/actions/payment-profiles.ts`, `tests/actions/payment-profiles.test.ts`, `components/entities/PaymentProfileForm.tsx`, `components/entities/PaymentProfileCard.tsx`

- [ ] Write failing tests:
```ts
describe('createPaymentProfile', () => {
  it('creates SUPPLIER profile with bank details', async () => { /* */ })
  it('creates CONVEXO profile only if admin', async () => { /* */ })
  it('throws UNAUTHORIZED if non-admin tries to create CONVEXO profile', async () => { /* */ })
})
```
- [ ] Run — expect FAIL
- [ ] Write `lib/actions/payment-profiles.ts`:
```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser, requireAdmin } from './auth'

export async function createPaymentProfile(privyToken: string, data: PaymentProfileInput) {
  const supabase = await createClient()
  if (data.entity_type === 'CONVEXO') {
    await requireAdmin(privyToken) // throws if not admin
  } else {
    await getSessionUser(privyToken) // just validates session
  }
  const { data: profile, error } = await supabase.from('payment_profiles')
    .insert(data).select().single()
  if (error) throw error
  return profile
}

export async function getPaymentProfiles(privyToken: string, entityType: string, entityId: string) {
  await getSessionUser(privyToken)
  const supabase = await createClient()
  const { data, error } = await supabase.from('payment_profiles')
    .select('*').eq('entity_type', entityType).eq('entity_id', entityId)
    .eq('is_active', true).order('is_default', { ascending: false })
  if (error) throw error
  return data
}

export async function getConvexoAccounts() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('payment_profiles')
    .select('*').eq('entity_type', 'CONVEXO').eq('is_active', true)
  if (error) throw error
  return data
}
```
- [ ] Run tests — expect PASS
- [ ] Write `components/entities/PaymentProfileForm.tsx` — tabbed form: Bank Account / Crypto Wallet / WeChat / Alibaba / PayPal / Cash. Each tab shows relevant fields. Includes file upload for bank PDF and WeChat QR.
- [ ] Also add to `lib/actions/payment-profiles.ts`:
```ts
export async function updatePaymentProfile(privyToken: string, id: string, data: Partial<PaymentProfileInput>) {
  if (data.entity_type === 'CONVEXO') await requireAdmin(privyToken)
  else await getSessionUser(privyToken)
  const supabase = await createClient(privyToken)
  const { data: updated, error } = await supabase.from('payment_profiles')
    .update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) throw error
  return updated
}

export async function deactivatePaymentProfile(privyToken: string, id: string) {
  await getSessionUser(privyToken)
  const supabase = await createClient(privyToken)
  const { error } = await supabase.from('payment_profiles').update({ is_active: false }).eq('id', id)
  if (error) throw error
}
```
- [ ] Write `components/entities/PaymentProfileCard.tsx` — displays method type icon, label, key details, edit/delete actions (edit → opens PaymentProfileForm pre-filled, delete → calls deactivatePaymentProfile)
- [ ] Wire payment profiles into entity detail pages (`/proveedores/[id]`, `/clientes/[id]`)
- [ ] Commit: `git commit -m "feat: payment profiles CRUD"`

---

## Chunk 4: Orders (Pagar + Cobrar)

### Task 12: Order Server Actions + tests

**Files:**
- Create: `lib/actions/orders.ts`, `tests/actions/orders.test.ts`

- [ ] Write failing tests:
```ts
describe('createOrder', () => {
  it('creates PAY order with status DRAFT', async () => { /* */ })
  it('creates COLLECT order with own_profile_id', async () => { /* */ })
})
describe('submitOrder', () => {
  it('transitions DRAFT → ENVIADO and appends status_history', async () => { /* */ })
  it('throws if order not in DRAFT status', async () => { /* */ })
})
describe('cancelOrder', () => {
  it('allows cancel from DRAFT', async () => { /* */ })
  it('allows cancel from ENVIADO', async () => { /* */ })
  it('throws if order is EN_REVISION or later', async () => { /* */ })
})
```
- [ ] Run — expect FAIL
- [ ] Write `lib/actions/orders.ts`:
```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from './auth'
import { createNotification } from './notifications'

const CANCEL_ALLOWED = ['DRAFT', 'ENVIADO']
// NOTE: ADMIN_TRANSITIONS lives in admin.ts — do not duplicate here

async function appendStatusHistory(supabase: any, orderId: string, newStatus: string, userId: string) {
  const { data: order } = await supabase.from('payment_orders').select('status_history').eq('id', orderId).single()
  const history = order?.status_history ?? []
  history.push({ status: newStatus, changed_at: new Date().toISOString(), changed_by: userId })
  return history
}

export async function createOrder(privyToken: string, data: OrderInput) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient()
  const { data: order, error } = await supabase.from('payment_orders')
    .insert({ ...data, user_id: user.id, status: 'DRAFT' }).select().single()
  if (error) throw error
  return order
}

export async function submitOrder(privyToken: string, orderId: string) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient()
  const { data: order } = await supabase.from('payment_orders').select().eq('id', orderId).eq('user_id', user.id).single()
  if (!order || order.status !== 'DRAFT') throw new Error('INVALID_TRANSITION')
  const history = await appendStatusHistory(supabase, orderId, 'ENVIADO', user.id)
  const { data: updated, error } = await supabase.from('payment_orders')
    .update({ status: 'ENVIADO', status_history: history, updated_at: new Date().toISOString() })
    .eq('id', orderId).select().single()
  if (error) throw error
  await createNotification(user.id, 'ORDER_STATUS', 'Order submitted', `Your order is now under review.`, orderId, 'ORDER')
  return updated
}

export async function cancelOrder(privyToken: string, orderId: string) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient()
  const { data: order } = await supabase.from('payment_orders').select().eq('id', orderId).eq('user_id', user.id).single()
  if (!order || !CANCEL_ALLOWED.includes(order.status)) throw new Error('INVALID_TRANSITION')
  const history = await appendStatusHistory(supabase, orderId, 'CANCELADO', user.id)
  const { data: updated, error } = await supabase.from('payment_orders')
    .update({ status: 'CANCELADO', status_history: history, updated_at: new Date().toISOString() })
    .eq('id', orderId).select().single()
  if (error) throw error
  // Notify on every status transition — spec Section 11
  await createNotification(user.id, 'ORDER_STATUS', 'Order cancelled', 'Your order has been cancelled.', orderId, 'ORDER')
  return updated
}

export async function getOrders(privyToken: string, type: 'PAY' | 'COLLECT', { page = 1, status = '' } = {}) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient()
  const from = (page - 1) * 20
  let q = supabase.from('payment_orders').select('*, payment_profiles(*)', { count: 'exact' })
    .eq('user_id', user.id).eq('type', type).range(from, from + 19).order('created_at', { ascending: false })
  if (status) q = q.eq('status', status)
  const { data, count, error } = await q
  if (error) throw error
  return { data, total: count ?? 0 }
}
```
- [ ] Run tests — expect PASS
- [ ] Commit: `git commit -m "feat: order server actions with status machine"`

---

### Task 13: Order form + list UI

**Files:**
- Create: `components/orders/OrderForm.tsx`, `components/orders/OrderTable.tsx`, `components/orders/OrderStatusHistory.tsx`, all order pages

- [ ] Write `components/orders/OrderForm.tsx` — props: `type: 'PAY'|'COLLECT'`:
  - PAY: Select supplier dropdown → select supplier's payment method → amount/currency/due date/reference/invoice upload
  - COLLECT: Select client → select own payment method → amount/currency/due date/reference
  - Save as Draft button + Submit button
- [ ] Write `components/orders/OrderTable.tsx` — paginated table with StatusBadge, amount, entity name, date, link to detail
- [ ] Write `components/orders/OrderStatusHistory.tsx` — timeline of status changes with timestamps
- [ ] Wire all order pages: list pages, new pages, detail pages (show form in read-only if not DRAFT, show cancel button if DRAFT/ENVIADO)
- [ ] Commit: `git commit -m "feat: order form + list UI"`

---

## Chunk 5: Wallet / Account View

### Task 14: Wallet Server Actions

**Files:**
- Create: `lib/actions/wallet.ts`, `tests/actions/wallet.test.ts`

- [ ] Write failing tests:
```ts
describe('createWalletRequest', () => {
  it('creates TOPUP request with PENDIENTE status', async () => { /* */ })
  it('creates WITHDRAW request with destination profile', async () => { /* */ })
})
describe('cancelWalletRequest', () => {
  it('cancels from PENDIENTE', async () => { /* */ })
  it('cancels from EN_REVISION', async () => { /* */ })
  it('throws if status is PROCESANDO or later', async () => { /* */ })
})
```
- [ ] Run — expect FAIL
- [ ] Write `lib/actions/wallet.ts`:
```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from './auth'

const WALLET_CANCEL_ALLOWED = ['PENDIENTE', 'EN_REVISION']

export async function createWalletRequest(privyToken: string, data: WalletRequestInput) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient()
  const { data: req, error } = await supabase.from('wallet_requests')
    .insert({ ...data, user_id: user.id, status: 'PENDIENTE' }).select().single()
  if (error) throw error
  return req
}

export async function cancelWalletRequest(privyToken: string, requestId: string) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient()
  const { data: req } = await supabase.from('wallet_requests').select().eq('id', requestId).eq('user_id', user.id).single()
  if (!req || !WALLET_CANCEL_ALLOWED.includes(req.status)) throw new Error('INVALID_TRANSITION')
  const { data: updated, error } = await supabase.from('wallet_requests')
    .update({ status: 'CANCELADO', updated_at: new Date().toISOString() }).eq('id', requestId).select().single()
  if (error) throw error
  return updated
}

export async function getWalletData(privyToken: string) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient()
  const [{ data: profile }, { data: ownProfiles }, { data: convexoAccounts }, { data: requests }] = await Promise.all([
    supabase.from('profiles').select('usdc_balance').eq('user_id', user.id).single(),
    supabase.from('payment_profiles').select('*').eq('entity_type', 'USER_OWN').eq('entity_id', user.id),
    supabase.from('payment_profiles').select('*').eq('entity_type', 'CONVEXO').eq('is_active', true),
    supabase.from('wallet_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
  ])
  return { balance: profile?.usdc_balance ?? 0, ownProfiles, convexoAccounts, requests }
}
```
- [ ] Run tests — expect PASS
- [ ] Write `app/(app)/cuenta/page.tsx` — balance card, own accounts list, top-up/withdraw request forms, request history table
- [ ] Commit: `git commit -m "feat: wallet/account view"`

---

## Chunk 6: Notifications

### Task 15: Notification actions + Realtime bell

**Files:**
- Create: `lib/actions/notifications.ts`, `components/layout/NotificationBell.tsx`

- [ ] Write `lib/actions/notifications.ts`:
```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function createNotification(
  userId: string, type: string, title: string, body: string,
  relatedId?: string, relatedType?: string
) {
  const supabase = await createClient()
  const { data: notif, error } = await supabase.from('notifications')
    .insert({ user_id: userId, type, title, body, related_id: relatedId, related_type: relatedType })
    .select().single()
  if (error) throw error

  // Send email — log failure, don't throw
  const { data: user } = await supabase.from('users').select('email').eq('id', userId).single()
  if (user?.email) {
    try {
      await resend.emails.send({
        from: 'pay@convexo.xyz',
        to: user.email,
        subject: title,
        html: `<p>${body}</p>`,
      })
    } catch (err: any) {
      await supabase.from('notification_errors').insert({ notification_id: notif.id, error: err.message })
    }
  }
  return notif
}

export async function markNotificationsRead(privyToken: string, ids: string[]) {
  const supabase = await createClient()
  await supabase.from('notifications').update({ is_read: true }).in('id', ids)
}

export async function getNotifications(privyToken: string, { page = 1 } = {}) {
  const supabase = await createClient()
  const from = (page - 1) * 20
  const { data, count } = await supabase.from('notifications').select('*', { count: 'exact' })
    .order('created_at', { ascending: false }).range(from, from + 19)
  return { data, total: count ?? 0 }
}
```
- [ ] Write `components/layout/NotificationBell.tsx` — uses `useSupabaseRealtime` to subscribe to new notifications for current user, shows unread count badge, dropdown preview of last 5
- [ ] Write `app/(app)/notificaciones/page.tsx` — paginated list, mark all read button
- [ ] Commit: `git commit -m "feat: notifications (email + realtime bell)"`

---

## Chunk 7: Admin Panel

### Task 16: Admin Server Actions + tests

**Files:**
- Create: `lib/actions/admin.ts`, `tests/actions/admin.test.ts`

- [ ] Write failing tests:
```ts
describe('adminUpdateOrderStatus', () => {
  it('transitions ENVIADO → EN_REVISION', async () => { /* */ })
  it('throws if transition invalid', async () => { /* */ })
  it('throws UNAUTHORIZED if caller is not ADMIN', async () => { /* */ })
  it('saves rejection_reason when transitioning to RECHAZADO', async () => { /* */ })
})
describe('adminEnableUser', () => {
  it('sets is_enabled = true', async () => { /* */ })
  it('throws UNAUTHORIZED if not ADMIN', async () => { /* */ })
})
describe('adminVerifyRUT', () => {
  it('sets rut_status to VERIFICADO', async () => { /* */ })
  it('sets rut_status to RECHAZADO with note', async () => { /* */ })
})
```
- [ ] Run — expect FAIL
- [ ] Write `lib/actions/admin.ts`:
```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from './auth'
import { createNotification } from './notifications'

const ADMIN_VALID_TRANSITIONS: Record<string, string[]> = {
  ENVIADO: ['EN_REVISION'],
  EN_REVISION: ['PROCESANDO', 'RECHAZADO'],
  PROCESANDO: ['PAGADO', 'RECHAZADO'], // admin can reject at any non-terminal stage
}

export async function adminUpdateOrderStatus(
  privyToken: string, orderId: string, newStatus: string,
  opts: { rejectionReason?: string; proofUrl?: string } = {}
) {
  const admin = await requireAdmin(privyToken)
  const supabase = await createClient()
  const { data: order } = await supabase.from('payment_orders').select().eq('id', orderId).single()
  if (!order) throw new Error('NOT_FOUND')
  const allowed = ADMIN_VALID_TRANSITIONS[order.status] ?? []
  if (!allowed.includes(newStatus)) throw new Error('INVALID_TRANSITION')

  const history = order.status_history ?? []
  history.push({ status: newStatus, changed_at: new Date().toISOString(), changed_by: admin.id })

  const update: any = { status: newStatus, status_history: history, updated_at: new Date().toISOString() }
  if (opts.rejectionReason) update.rejection_reason = opts.rejectionReason
  if (opts.proofUrl) update.proof_url = opts.proofUrl

  const { data: updated, error } = await supabase.from('payment_orders').update(update).eq('id', orderId).select().single()
  if (error) throw error

  await createNotification(order.user_id, 'ORDER_STATUS',
    `Order ${newStatus.toLowerCase()}`,
    newStatus === 'RECHAZADO' ? `Your order was rejected: ${opts.rejectionReason}` : `Your order status is now ${newStatus}.`,
    orderId, 'ORDER')

  return updated
}

export async function adminEnableUser(privyToken: string, userId: string, enabled: boolean) {
  await requireAdmin(privyToken)
  const supabase = await createClient()
  const { error } = await supabase.from('users').update({ is_enabled: enabled }).eq('id', userId)
  if (error) throw error
  await createNotification(userId, 'ACCOUNT', enabled ? 'Account activated' : 'Account deactivated',
    enabled ? 'Your account has been activated. You can now log in.' : 'Your account has been deactivated.')
}

export async function adminVerifyRUT(privyToken: string, userId: string, status: 'VERIFICADO' | 'RECHAZADO', note?: string) {
  await requireAdmin(privyToken)
  const supabase = await createClient()
  await supabase.from('profiles').update({ rut_status: status, rut_admin_note: note ?? null, updated_at: new Date().toISOString() }).eq('user_id', userId)
  await createNotification(userId, 'PROFILE', `RUT ${status.toLowerCase()}`,
    status === 'VERIFICADO' ? 'Your RUT has been verified.' : `Your RUT was rejected: ${note}`)
}

export async function adminGetAllOrders(privyToken: string, type: 'PAY' | 'COLLECT', { page = 1, status = '' } = {}) {
  await requireAdmin(privyToken)
  const supabase = await createClient()
  const from = (page - 1) * 20
  let q = supabase.from('payment_orders').select('*, users(email), payment_profiles(*)', { count: 'exact' })
    .eq('type', type).range(from, from + 19).order('created_at', { ascending: false })
  if (status) q = q.eq('status', status)
  const { data, count, error } = await q
  if (error) throw error
  return { data, total: count ?? 0 }
}

export async function adminUpdateWalletRequest(privyToken: string, requestId: string, newStatus: string, opts: { proofUrl?: string; rejectionReason?: string; adminNote?: string } = {}) {
  const admin = await requireAdmin(privyToken)
  const supabase = await createClient()
  const { data: req } = await supabase.from('wallet_requests').select().eq('id', requestId).single()
  if (!req) throw new Error('NOT_FOUND')
  // Map camelCase opts to snake_case DB columns explicitly
  const update: any = {
    status: newStatus,
    updated_at: new Date().toISOString(),
    ...(opts.proofUrl ? { proof_url: opts.proofUrl } : {}),
    ...(opts.rejectionReason ? { rejection_reason: opts.rejectionReason } : {}),
    ...(opts.adminNote ? { admin_note: opts.adminNote } : {}),
  }
  if (newStatus === 'COMPLETADO' && opts.proofUrl) {
    // supabase.rpc must be called as standalone — cannot be embedded in .update()
    const fn = req.type === 'TOPUP' ? 'increment_balance' : 'decrement_balance'
    await supabase.rpc(fn, { user_id: req.user_id, amount: req.amount })
  }
  await supabase.from('wallet_requests').update(update).eq('id', requestId)
  await createNotification(req.user_id, 'WALLET', `Request ${newStatus}`, `Your wallet request status is now ${newStatus}.`, requestId, 'WALLET_REQUEST')
}

export async function adminBroadcastNotification(privyToken: string, opts: { target: 'ALL' | string; title: string; body: string; sendEmail: boolean; sendInApp: boolean }) {
  await requireAdmin(privyToken)
  const supabase = await createClient(privyToken)
  let users: { id: string; email: string }[] = []
  if (opts.target === 'ALL') {
    const { data } = await supabase.from('users').select('id, email').eq('is_enabled', true)
    users = data ?? []
  } else {
    const { data } = await supabase.from('users').select('id, email').eq('email', opts.target).single()
    if (data) users = [data]
  }
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  await Promise.all(users.map(async (u) => {
    if (opts.sendInApp) {
      await createNotification(u.id, 'BROADCAST', opts.title, opts.body, undefined, 'BROADCAST')
    } else if (opts.sendEmail) {
      // sendInApp=false but sendEmail=true — send email only, no in-app row
      try {
        await resend.emails.send({ from: 'pay@convexo.xyz', to: u.email, subject: opts.title, html: `<p>${opts.body}</p>` })
      } catch (err: any) {
        // Log silently — broadcast email failures don't block
        await supabase.from('notification_errors').insert({ error: err.message })
      }
    }
    // sendInApp already calls createNotification which also sends email via Resend
  }))
}

export async function adminGetAllSuppliers(privyToken: string, { page = 1, search = '' } = {}) {
  await requireAdmin(privyToken)
  const supabase = await createClient(privyToken)
  const from = (page - 1) * 20
  let q = supabase.from('suppliers').select('*, users(email)', { count: 'exact' })
    .range(from, from + 19).order('created_at', { ascending: false })
  if (search) q = q.ilike('internal_name', `%${search}%`)
  const { data, count, error } = await q
  if (error) throw error
  return { data, total: count ?? 0 }
}

export async function adminGetAllClients(privyToken: string, { page = 1, search = '' } = {}) {
  await requireAdmin(privyToken)
  const supabase = await createClient(privyToken)
  const from = (page - 1) * 20
  let q = supabase.from('clients').select('*, users(email)', { count: 'exact' })
    .range(from, from + 19).order('created_at', { ascending: false })
  if (search) q = q.ilike('internal_name', `%${search}%`)
  const { data, count, error } = await q
  if (error) throw error
  return { data, total: count ?? 0 }
}
```
- [ ] Run tests — expect PASS
- [ ] Commit: `git commit -m "feat: admin server actions"`

---

### Task 17: Admin UI pages

**Files:** All `app/admin/` pages

- [ ] Write `app/admin/page.tsx` — dashboard with 4 stat cards (pending pay orders, pending collect orders, pending wallet requests, pending RUT verifications) + recent activity table
- [ ] Write `app/admin/usuarios/page.tsx` — paginated user table: email, role, is_enabled toggle, RUT status badge, link to detail
- [ ] Write `app/admin/usuarios/[id]/page.tsx` — user detail: profile info, RUT PDF viewer (iframe), Verificar/Rechazar buttons with reason input, enable/disable toggle
- [ ] Write `components/admin/AdminOrderTable.tsx` — order table with status update dropdown + reason input + proof upload. Shared by pagar + cobrar admin pages.
- [ ] Write `app/admin/pagar/page.tsx` + `app/admin/cobrar/page.tsx` using `AdminOrderTable`
- [ ] Write `app/admin/cuenta/page.tsx` — wallet request list with approve/reject actions, proof upload
- [ ] Write `app/admin/configuracion/page.tsx` — CRUD for CONVEXO payment profiles (add bank account with currency, add crypto wallet with QR, toggle active)
- [ ] Write `app/admin/notificaciones/page.tsx` — broadcast form: target (All / specific email), title, body, send email toggle, send in-app toggle
- [ ] Commit: `git commit -m "feat: admin panel UI"`

---

### Task 18: Dashboard + final wiring

**Files:**
- Create: `app/(app)/dashboard/page.tsx`

- [ ] Write `app/(app)/dashboard/page.tsx`:
  - 4 stat cards: Total Pagado (USDC), Total Cobrado (USDC), # Proveedores, # Pendientes
  - Recent orders table (last 10, both PAY and COLLECT, with StatusBadge)
  - Quick action buttons: Nueva Orden de Pago, Nueva Orden de Cobro
- [ ] Write `app/(app)/proveedores/page.tsx` — list with search, pagination, link to detail, link to new
- [ ] Write `app/(app)/clientes/page.tsx` — same
- [ ] Smoke test full user journey in browser:
  - Login → complete profile + upload RUT → create supplier → add bank profile → create pay order → submit order
  - Admin login → enable user → verify RUT → process pay order to Pagado
- [ ] Commit: `git commit -m "feat: dashboard + full wiring complete"`

---

### Task 19: Supabase DB functions for balance

**Files:**
- Create: `supabase/migrations/002_functions.sql`

- [ ] Write:
```sql
CREATE OR REPLACE FUNCTION increment_balance(user_id UUID, amount DECIMAL)
RETURNS void AS $$
  UPDATE profiles SET usdc_balance = usdc_balance + amount WHERE user_id = $1;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION decrement_balance(user_id UUID, amount DECIMAL)
RETURNS void AS $$
  UPDATE profiles SET usdc_balance = GREATEST(0, usdc_balance - amount) WHERE user_id = $1;
$$ LANGUAGE sql;
```
- [ ] Apply: `npx supabase db push`
- [ ] Commit: `git commit -m "feat: supabase balance increment/decrement functions"`

---

### Task 20: Environment + Vercel deploy

**Files:**
- Create: `.env.example`, `vercel.json`

- [ ] Write `.env.example` with all required keys (no values)
- [ ] Add `.superpowers/` and `.env.local` to `.gitignore`
- [ ] Final build check: `npm run build` — must pass with 0 errors
- [ ] Deploy: `vercel --prod`
- [ ] Set all env vars in Vercel dashboard
- [ ] Verify pay.convexo.xyz is live, login works, RLS blocks cross-user data
- [ ] Commit: `git commit -m "chore: vercel deployment config"`

---

## Test Run Commands

```bash
# Unit tests
npx vitest run

# Type check
npx tsc --noEmit

# Build
npm run build

# Dev server (webpack required — no Turbopack)
npm run dev
```

---

## Done Criteria

- [ ] User can log in with email OTP or passkey
- [ ] User can complete profile + upload RUT PDF
- [ ] User can create suppliers and clients with 4-step wizard
- [ ] User can add multiple payment profiles per entity
- [ ] User can create, submit, and cancel pay/collect orders
- [ ] User can request top-up and withdrawal
- [ ] User receives email + in-app notification on every status change
- [ ] Admin can enable accounts, verify RUTs, process orders, upload proofs
- [ ] Admin can manage Convexo's own bank + crypto accounts
- [ ] Admin can broadcast notifications
- [ ] All list pages paginated with search/filter
- [ ] ES/EN language toggle works via cookie
- [ ] RLS verified: users cannot access other users' data
- [ ] Deployed to pay.convexo.xyz on Vercel
