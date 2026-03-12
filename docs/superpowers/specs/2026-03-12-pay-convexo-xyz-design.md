# pay.convexo.xyz — MVP Design Spec

**Date:** 2026-03-12
**Status:** Approved for implementation
**Domain:** pay.convexo.xyz
**Product:** B2B Payment Orchestration Platform — Payments arm of Convexo Protocol
**Languages:** English + Spanish (ES/EN cookie-based toggle — no subpath routing)

---

## 1. Overview

pay.convexo.xyz is a B2B payment platform enabling companies to pay international suppliers and collect from clients using hybrid rails: fiat in → USDC/stablecoin (Convexo Protocol) → fiat out to supplier bank. Convexo operates as the service provider, holding its own bank accounts and crypto wallets to process all orders.

### Brand

- **Logo:** Geometric diamond hexagon mark on dark navy/purple gradient
- **Colors:** `#081F5C` Navy · `#401777` Deep Purple · `#334EAC` Blue · `#BAD6EB` Sky · `#FFF9EF` Cream
- **Typography:** System UI (-apple-system, Segoe UI)
- **Style:** Hyper-professional fintech — clean, dark sidebar, cream background, status badges

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router (TypeScript, webpack mode) |
| Business Logic | Server Actions — no exposed REST endpoints |
| Database | Supabase PostgreSQL + Row Level Security |
| Realtime | Supabase Realtime (in-app notifications) |
| Storage | Supabase Storage (PDFs, proofs, docs) |
| Auth | Privy — email OTP + passkey (no wallet required) |
| Email | Resend |
| i18n | Cookie-based ES/EN toggle via `next-intl` v3 with `getRequestConfig` and no locale path segments. Locale stored in cookie `NEXT_LOCALE`. No subpath routing. |
| Deployment | Vercel — pay.convexo.xyz |
| Styling | Tailwind CSS + Framer Motion |

---

## 3. Authentication & Security

### Auth Methods
- **Email OTP** or **Passkey** via Privy React SDK
- No crypto wallet required
- **Session:** Privy session tokens; TTL managed by Privy SDK (auto-refresh on active session, redirect to `/login` on expiry)

### Roles
`USER` | `ADMIN`

### Account Gate
Admin must enable a user account before they can access the app. Disabled accounts see: *"Your account is pending activation. Contact support."*

### Auth Flow
```
/login → Privy email OTP or passkey
→ Server Action: validate Privy token + check users.is_enabled
→ If disabled: show pending message
→ If enabled: redirect to /dashboard
```

### Admin Route Enforcement
**Every Server Action** that performs an admin operation must validate `role === ADMIN` server-side by checking the `users` table against the Privy session user ID. Layout-level redirects are UI-only and not a security boundary. All admin Server Actions follow this pattern:

```typescript
// Pattern enforced on every admin Server Action
const session = await getPrivySession()
const user = await db.users.findUnique({ where: { privy_user_id: session.userId } })
if (!user || user.role !== 'ADMIN') throw new Error('Unauthorized')
```

---

## 4. User Profile

Location: `/perfil`

### Required Fields
- First Name + Last Name
- ID Number
- RUT upload (PDF — Registro Único Tributario, Colombia)
- Contact Email *(independent from auth email — stored in `profiles.contact_email`)*
- Phone (country code + number)
- Address, State, City, Country

### Optional Fields
- Instagram username
- X (Twitter) username
- LinkedIn username

### RUT Verification Flow
```
User uploads RUT PDF
→ profiles.rut_status: NULL (before upload) → PENDIENTE (after upload)
→ Admin reviews at /admin/usuarios/[id]
→ PENDIENTE → EN_REVISION → VERIFICADO | RECHAZADO
→ Email + in-app notification on each status change
```

---

## 5. Entities — Suppliers (Proveedores) & Clients (Clientes)

Both Suppliers and Clients share an identical 4-step creation wizard.

### Step 1 — Company Info
- Internal name / identifier
- Registration country: China · USA · Europe · Other

### Step 2 — Legal Identity
- Full legal name
- Company type (by country):
  - USA: LLC · Corp · Other (free text)
  - Europe: GmbH · SAS · SRL · LTD · PLC · Other (free text)
  - China: Limited · Corp · Other (free text)
- Registration number (country code + number)
- Contact email (`contact_email`)
- Company phone (country code + number)

### Step 3 — Contact Person
- Full name
- Phone (country code + number)
- Email (`contact_person_email`)

> **Duplicate detection:** Triggered against `contact_email` only, scoped to the current user's entities of the same type (suppliers or clients). Shows an inline warning, does not block creation.

### Step 4 — Office Location
- Address, State, City, Country (`office_country` — separate from `registration_country`)

> **Payment profiles** are added after entity creation via the entity detail page. The creation wizard captures identity only.

---

## 6. Payment Profiles

Each entity (Supplier, Client) and the user's own profile can have multiple payment methods. Convexo's own receiving accounts are managed by admin.

### Supported Methods

| Method | Fields |
|---|---|
| **Bank Account** | Account Holder Type (Company/Individual) · Holder Name · Bank Name · Bank Country · Account Currency (auto-suggested from bank country) · Account Number · SWIFT/BIC · Branch Code (optional) · Note (optional) · PDF document upload |
| **Crypto Wallet** | Network (Solana · Ethereum · TRON) · Wallet Address |
| **WeChat Pay** | WeChat ID + QR code upload (optional) |
| **Alibaba Pay** | Alibaba account ID |
| **PayPal** | PayPal email |
| **Cash** | Currency · Notes |

### Profile Types

| Profile Type | Owner | Purpose |
|---|---|---|
| `SUPPLIER` | Linked to a supplier entity | How the supplier gets paid |
| `CLIENT` | Linked to a client entity | How the client pays |
| `USER_OWN` | Linked to the logged-in user | Where the user receives money (Cobrar + wallet requests) |
| `CONVEXO` | Admin-managed (`entity_id = NULL`, no FK constraint) | Convexo's own receiving accounts shown to users for top-ups |

### Convexo Accounts (Admin-Managed at `/admin/configuracion`)

All Convexo accounts are fully CRUD-managed by admin over time — add, edit, deactivate.

**Bank Accounts** (receive fiat from users and settle pay orders):
- Currencies supported: USD · GBP · EUR · CNY · AUD · SGD
- Fields per account: Bank Name · Bank Country · Currency · Account Number · SWIFT/BIC · Account Holder Name · Branch Code (optional) · Reference instructions (optional)
- Multiple accounts per currency allowed (e.g. two USD accounts at different banks)

**Crypto Wallets** (receive crypto for top-ups):
- **Solana** — USDC, USDT (wallet address + QR code)
- **Ethereum** — USDC, USDT, ERC-20 (wallet address + QR code)
- **TRON** — USDT, TRC-20 (wallet address + QR code)

All active Convexo accounts are shown to users during the top-up flow so they can send funds and submit a request.

### RLS Policies for `payment_profiles`

```sql
-- Users can read/write their own SUPPLIER and CLIENT profiles
-- (via their own entities — checked by joining to suppliers/clients)
CREATE POLICY "user_own_entity_profiles" ON payment_profiles
  FOR ALL USING (
    entity_type IN ('SUPPLIER','CLIENT') AND
    entity_id IN (
      SELECT id FROM suppliers WHERE user_id = auth.uid()
      UNION
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- Users can read/write their own USER_OWN profiles
CREATE POLICY "user_own_profiles" ON payment_profiles
  FOR ALL USING (
    entity_type = 'USER_OWN' AND
    entity_id = auth.uid()
  );

-- All authenticated users can READ CONVEXO profiles (for top-up display)
CREATE POLICY "convexo_profiles_read" ON payment_profiles
  FOR SELECT USING (entity_type = 'CONVEXO');

-- Only ADMIN can write CONVEXO profiles (enforced via Server Action + policy)
-- Uses WITH CHECK (not USING) so INSERT is also covered
CREATE POLICY "convexo_profiles_admin_write" ON payment_profiles
  FOR INSERT, UPDATE, DELETE
  WITH CHECK (
    entity_type = 'CONVEXO' AND
    EXISTS (SELECT 1 FROM users WHERE privy_user_id = auth.uid() AND role = 'ADMIN')
  );
```

### RLS Policies for `payment_orders`

```sql
-- Users can read/write their own orders
CREATE POLICY "user_own_orders" ON payment_orders
  FOR ALL USING (user_id = (SELECT id FROM users WHERE privy_user_id = auth.uid()));

-- Admin has full access to all orders
CREATE POLICY "admin_all_orders" ON payment_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE privy_user_id = auth.uid() AND role = 'ADMIN')
  );
```

### RLS Policies for `wallet_requests`

```sql
-- Users can read/write their own wallet requests
CREATE POLICY "user_own_wallet_requests" ON wallet_requests
  FOR ALL USING (user_id = (SELECT id FROM users WHERE privy_user_id = auth.uid()));

-- Admin has full access to all wallet requests
CREATE POLICY "admin_all_wallet_requests" ON wallet_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE privy_user_id = auth.uid() AND role = 'ADMIN')
  );
```

---

## 7. Pay Orders (Pagar)

Location: `/pagar` | Create: `/pagar/new`

### Creation Flow
1. Select Supplier (from user's supplier list)
2. Select the supplier's payment method (from their registered profiles)
3. Fill order details: Amount + Currency · Due date · Reference / description · Attach invoice PDF *(optional on creation, can be added while in Draft)*

### Status Flow
```
Draft → Enviado → En revisión → Procesando → Pagado
                                           ↘ Rechazado
Draft → Cancelado (user cancels before submitting)
Enviado → Cancelado (user cancels after submitting, before admin picks up)
```

| Status | Trigger | Actor |
|---|---|---|
| Draft | Created | User |
| Enviado | User submits | User |
| En revisión | Admin picks up | Admin |
| Procesando | Admin begins processing | Admin |
| Pagado | Payment sent, proof uploaded | Admin |
| Rechazado | Admin rejects (with reason) | Admin |
| Cancelado | User cancels (Draft or Enviado only) | User |

- **Email + in-app notification** sent on every status transition
- **Admin uploads payment proof** (PDF/image) when moving to Pagado
- **Admin provides rejection reason** when moving to Rechazado

---

## 8. Collect Orders (Cobrar)

Location: `/cobrar` | Create: `/cobrar/new`

### Creation Flow
1. Select Client (from user's client list)
2. Select **own payment method** (where user wants to receive the money — from `USER_OWN` profiles)
3. Fill: Amount + Currency · Due date · Reference / description
4. Invoice attachment: optional (not required for collection orders; `invoice_url` is NULL by default on COLLECT type)

### Status Flow
Identical to Pagar:
```
Draft → Enviado → En revisión → Procesando → Pagado
                                           ↘ Rechazado
Draft | Enviado → Cancelado
```

---

## 9. Account / Wallet View

Location: `/cuenta`

### Display
- **USDC Balance** — stored as `profiles.usdc_balance DECIMAL` in Supabase, updated manually by admin when processing top-ups/withdrawals. Not fetched on-chain (MVP scope).
- User's own bank accounts and crypto wallets (`USER_OWN` payment profiles)

### Actions
- **Request Top-Up:** User selects amount + currency → sees Convexo's receiving accounts → submits request → admin processes manually
- **Request Withdrawal:** User selects amount, currency, destination (from `USER_OWN` profiles) → submits → admin processes manually

**Wallet request cancellation:** User can cancel while status is `PENDIENTE` or `EN_REVISION`. Admin can reject (`RECHAZADO`, with reason) from any non-terminal status.

---

## 10. Admin Panel

Location: `/admin` (role-gated — server-side role check on every Server Action, see Section 3)

### Routes

| Route | Purpose |
|---|---|
| `/admin` | Dashboard — pending counts, recent activity |
| `/admin/usuarios` | All users — enable/disable, paginated, searchable |
| `/admin/usuarios/[id]` | User detail — validate RUT, update verification |
| `/admin/pagar` | All payment orders across all users — filterable by status |
| `/admin/cobrar` | All collection orders — filterable by status |
| `/admin/cuenta` | Top-up and withdrawal requests |
| `/admin/proveedores` | All suppliers across all users |
| `/admin/clientes` | All clients across all users |
| `/admin/configuracion` | Convexo's own receiving accounts (bank + crypto) |
| `/admin/notificaciones` | Manual notification broadcast |

### Admin Capabilities
- Update order status (any valid transition) + provide reason on Rechazado
- Upload payment proof (PDF/image) on Pagado
- Enable / disable user accounts
- Validate RUT documents (Verificado / Rechazado + optional note)
- Manage Convexo CONVEXO-type payment profiles
- Update user USDC balance after processing top-up/withdrawal
- View all entities and orders across all users (no RLS restriction for ADMIN role)

### `/admin/notificaciones` — Manual Broadcast
Fields: Target (All Users · Specific User by email) · Title (max 80 chars) · Body (max 300 chars) · Send Email (toggle) · Send In-App (toggle). Dispatches via Resend (if email toggled) and inserts notification rows for all targeted users.

---

## 11. Notifications

### Channels
- **Email** via Resend — on failure: log error to `notification_errors` table, fall back to in-app only. No retry on MVP.
- **In-app bell** via Supabase Realtime — unread count badge in sidebar

### Triggers
- Order status change (every transition, PAY and COLLECT)
- Wallet request status change
- RUT verification result
- Account enabled / disabled

### Notification Center
- Location: `/notificaciones`
- Paginated list, read/unread state
- Click → navigate to related entity

---

## 12. List Pages — Pagination & Search

All list pages (user and admin) implement:
- **Pagination:** 20 items per page, cursor-based via Supabase
- **Search:** by entity name / reference number / email
- **Filter:** by status (orders), by country (entities)
- **Sort:** by created_at DESC (default)

---

## 13. Data Model

```sql
-- Core auth
users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER', -- 'USER' | 'ADMIN'
  is_enabled BOOL NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- User profile
profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  id_number TEXT,
  contact_email TEXT, -- independent from auth email
  phone TEXT,
  address TEXT,
  state TEXT,
  city TEXT,
  country TEXT,
  rut_url TEXT, -- Supabase Storage path
  rut_status TEXT DEFAULT NULL, -- NULL | 'PENDIENTE' | 'EN_REVISION' | 'VERIFICADO' | 'RECHAZADO'
  rut_admin_note TEXT,
  usdc_balance DECIMAL(18,6) DEFAULT 0, -- updated by admin on wallet request completion
  instagram TEXT,
  twitter TEXT,
  linkedin TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Entities
suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  internal_name TEXT NOT NULL,
  legal_name TEXT,
  company_type TEXT,
  registration_country TEXT,
  registration_number TEXT,
  contact_email TEXT,
  company_phone TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_person_email TEXT,
  address TEXT,
  state TEXT,
  city TEXT,
  office_country TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now()
)

clients ( -- identical structure to suppliers
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  internal_name TEXT NOT NULL,
  legal_name TEXT,
  company_type TEXT,
  registration_country TEXT,
  registration_number TEXT,
  contact_email TEXT,
  company_phone TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_person_email TEXT,
  address TEXT,
  state TEXT,
  city TEXT,
  office_country TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Payment profiles (polymorphic — no FK constraint on entity_id)
payment_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'SUPPLIER' | 'CLIENT' | 'USER_OWN' | 'CONVEXO'
  entity_id UUID, -- NULL for CONVEXO; supplier_id | client_id | user_id otherwise
  -- ↑ No FK REFERENCES constraint — polymorphic; ownership enforced via RLS (see Section 6)
  method TEXT NOT NULL, -- 'BANK' | 'CRYPTO' | 'WECHAT' | 'ALIBABA' | 'PAYPAL' | 'CASH'
  label TEXT, -- e.g. "USD Bank - Chase"
  details JSONB NOT NULL DEFAULT '{}', -- method-specific fields
  doc_url TEXT,
  is_default BOOL DEFAULT false,
  is_active BOOL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Orders
payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'PAY' | 'COLLECT'
  entity_id UUID NOT NULL, -- supplier_id (PAY) or client_id (COLLECT) — no FK, polymorphic
  payment_profile_id UUID REFERENCES payment_profiles(id),
  own_profile_id UUID REFERENCES payment_profiles(id), -- COLLECT only; NULL for PAY
  amount DECIMAL(18,6) NOT NULL,
  currency TEXT NOT NULL,
  due_date DATE,
  reference TEXT,
  invoice_url TEXT, -- PAY: user uploads; COLLECT: typically NULL
  proof_url TEXT, -- admin uploads on Pagado
  status TEXT NOT NULL DEFAULT 'DRAFT',
  -- 'DRAFT'|'ENVIADO'|'EN_REVISION'|'PROCESANDO'|'PAGADO'|'RECHAZADO'|'CANCELADO'
  rejection_reason TEXT, -- populated when status = RECHAZADO
  status_history JSONB NOT NULL DEFAULT '[]',
  -- stored as JSONB column containing a JSON array:
  -- [{"status":"ENVIADO","changed_at":"...","changed_by":"user_id"}]
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Wallet requests
wallet_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'TOPUP' | 'WITHDRAW'
  amount DECIMAL(18,6) NOT NULL,
  currency TEXT NOT NULL,
  destination_profile_id UUID REFERENCES payment_profiles(id), -- WITHDRAW: user's own account
  convexo_account_id UUID REFERENCES payment_profiles(id), -- TOPUP: Convexo receiving account
  status TEXT NOT NULL DEFAULT 'PENDIENTE',
  -- 'PENDIENTE' | 'EN_REVISION' | 'PROCESANDO' | 'COMPLETADO' | 'RECHAZADO' | 'CANCELADO'
  rejection_reason TEXT,
  proof_url TEXT, -- admin uploads completion proof
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Notifications
notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOL DEFAULT false,
  related_id UUID,
  related_type TEXT, -- 'ORDER' | 'WALLET_REQUEST' | 'PROFILE' | 'BROADCAST'
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Email delivery error log
notification_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id),
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

---

## 14. Agent Team

| Agent | Responsibility |
|---|---|
| **Auth Agent** | Privy session handling · role enforcement · account enable/disable gate |
| **Entity Agent** | CRUD for suppliers + clients · 4-step wizard state · duplicate detection |
| **Payment Profile Agent** | Payment method CRUD per entity type · RLS-aware queries |
| **Orders Agent** | Create + manage PAY/COLLECT orders · all status transitions · cancellation + rejection flows |
| **Admin Agent** | Process all orders · upload proofs · enable accounts · validate RUTs · manage CONVEXO profiles |
| **Notification Agent** | Email (Resend) + in-app (Supabase Realtime) · error logging on email failure |
| **Wallet Agent** | Account view · USDC balance display · top-up/withdrawal request lifecycle |
| **File Agent** | Supabase Storage · invoices · proofs · RUT docs · QR codes |

> **Maintenance Agent deferred to post-MVP.** Not in scope for launch.

---

## 15. App Routes Summary

### User App — pay.convexo.xyz
```
/login
/dashboard
/proveedores              list (paginated, searchable)
/proveedores/new          4-step wizard
/proveedores/[id]         detail + payment profiles
/clientes                 list (paginated, searchable)
/clientes/new             4-step wizard
/clientes/[id]            detail + payment profiles
/pagar                    list (filterable by status)
/pagar/new
/pagar/[id]               detail + status history + cancel action
/cobrar                   list (filterable by status)
/cobrar/new
/cobrar/[id]              detail + status history + cancel action
/cuenta                   wallet view + top-up/withdrawal request
/perfil                   profile + own payment methods + RUT upload
/notificaciones           notification center (paginated)
```

### Admin Panel — pay.convexo.xyz/admin
```
/admin
/admin/usuarios           paginated, searchable
/admin/usuarios/[id]      profile + RUT validation
/admin/pagar              all orders, filterable
/admin/cobrar             all orders, filterable
/admin/cuenta             wallet requests
/admin/proveedores
/admin/clientes
/admin/configuracion      Convexo payment profiles
/admin/notificaciones     manual broadcast
```

---

## 16. Key Design Decisions

- **No wallet connection** — Privy email OTP / passkey only
- **Server Actions only** — no REST API; admin role validated server-side on every action
- **Supabase RLS** — per-entity-type policies; CONVEXO profiles readable by all, writable by admin only
- **Supabase Realtime** — powers in-app notification bell
- **USDC balance stored in Supabase** — admin-managed for MVP; not fetched on-chain
- **Cookie-based i18n** — `next-intl` with `NEXT_LOCALE` cookie, no subpath locale routing
- **status_history as JSONB** — single `JSONB` column containing a JSON array for full order audit trail
- **Payment profiles polymorphic** — no DB-level FK on `entity_id`; ownership enforced via RLS policies
- **Cancellation allowed** — on Draft and Enviado only; Rechazado by admin on any non-terminal status
- **Email failure handling** — log to `notification_errors`, fall back to in-app; no retry on MVP
- **Maintenance Agent** — deferred to post-MVP

---

*Spec reviewed and approved. Ready for implementation plan.*
