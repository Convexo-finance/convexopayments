# pay.convexo.xyz

B2B payment orchestration platform. Companies pay international suppliers and collect from clients using hybrid rails: fiat in → USDC (Convexo Protocol) → fiat out to the supplier's bank account.

Convexo operates as the intermediary — holding its own bank accounts and crypto wallets to process all orders manually.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router (TypeScript, Turbopack) |
| Business logic | Server Actions — no REST endpoints |
| Database | Supabase PostgreSQL + Row Level Security |
| Realtime | Supabase Realtime (in-app notifications) |
| Storage | Supabase Storage (identity documents, RUT, proof images) |
| Auth | Privy — email OTP · passkey · Google OAuth |
| Email | Resend |
| i18n | next-intl — ES/EN cookie toggle, no subpath routing |
| Deployment | Vercel |
| Styling | Inline styles (brand palette below) |
| Phone input | react-phone-number-input |
| Location | country-state-city |

---

## Prerequisites

Accounts and API keys required:

- **Supabase** — database, storage, realtime
- **Privy** — authentication (privy.io)
- **Resend** — transactional email (resend.com)
- **Vercel** — deployment (optional for local dev)

Node.js 20+ required.

---

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key |
| `SUPABASE_JWT_SECRET` | Supabase → Settings → API → JWT Settings → JWT Secret |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy → App Settings → App ID |
| `PRIVY_APP_SECRET` | Privy → App Settings → App Secret |
| `RESEND_API_KEY` | resend.com → API Keys |

> **SUPABASE_JWT_SECRET** is critical — used to mint HS256 JWTs so Supabase RLS can authenticate Privy users. Must match exactly what's in the Supabase dashboard.

### 3. Run database migrations

In Supabase dashboard → SQL Editor, run in order:

```
supabase/migrations/001_schema.sql          — tables, base RLS policies
supabase/migrations/002_balance_functions.sql — increment/decrement_balance RPCs
supabase/migrations/003_seed_admin.sql      — reference only (see step 5)
supabase/migrations/004_users_rls.sql       — users + profiles admin policies
supabase/migrations/005_fix_rls_privy_sub.sql — privy_sub() + is_admin() functions
supabase/migrations/006_wallet_requests_metadata.sql — metadata JSONB column
supabase/migrations/007_profiles_unique_and_storage_rls.sql — storage RLS policies
supabase/migrations/008_profiles_id_document_and_phone.sql — id_type, phone_country_code, etc.
supabase/migrations/009_profiles_id_doc_url.sql — id_doc_url column
supabase/migrations/010_storage_id_docs_rls.sql — id_docs/ storage policies
```

### 4. Configure Supabase Storage

Create a bucket named `documents` with:
- Public: **ON** (URLs are used for admin document preview)
- Max file size: 10 MB
- Allowed MIME types: `application/pdf, image/jpeg, image/png`

### 5. Set first admin user

After your first login (creates the user row), run in SQL Editor:

```sql
UPDATE users
SET role = 'ADMIN', is_enabled = true
WHERE email = 'your@email.com';
```

### 6. Run locally

```bash
npm run dev
```

App runs at `http://localhost:3000`.

---

## Project Structure

```
app/
  (auth)/login/             Login page (Privy embedded)
  (app)/                    Authenticated user area
    dashboard/              Overview + recent activity
    cuenta/                 Wallet — USDC balance, deposit QR, withdrawal requests
    otc/                    OTC orders — Cash-in (fiat→USDC) and Cash-out (USDC→fiat)
    perfil/                 User profile + ID document + RUT upload + verification request
    metodos-pago/           User's own payment methods (bank accounts, crypto)
    proveedores/            Supplier list + detail + new supplier wizard (with payment methods)
    clientes/               Client list + detail + new client wizard
    pagar/                  Outbound payment orders (pay suppliers)
    cobrar/                 Inbound collection orders (collect from clients)
    notificaciones/         In-app notification center
    settings/auth/          Auth methods — link Google, passkey, email via Privy
  admin/                    Admin-only area (role=ADMIN required)
    page.tsx                Admin dashboard
    usuarios/               User management — profile view, document review, enable/disable
    proveedores/            All suppliers across all users
    clientes/               All clients across all users
    pagar/                  All payment orders
    cobrar/                 All collection orders
    cuenta/                 Wallet top-up request management
    notificaciones/         Broadcast notifications to users
    configuracion/          Convexo platform configuration (payment profiles)

components/
  layout/
    Sidebar.tsx             Navigation sidebar (user + admin)
    Topbar.tsx              Page header with breadcrumb + notification bell
    NotificationBell.tsx    Realtime unread badge → /notificaciones
  auth/
    AppGuard.tsx            Client-side auth gate; provides UserContext (isEnabled)
    AdminGuard.tsx          Admin-only gate
  entities/
    EntityWizard.tsx        Multi-step wizard for creating suppliers/clients
    EntityDetailClient.tsx  Inline edit for supplier/client detail
    PaymentProfileForm.tsx  Form for adding payment methods to entities
    PaymentProfileCard.tsx  Display card for a payment profile
  orders/
    OrderForm.tsx           Shared form for pay/collect orders
    OrderTable.tsx          Paginated order list
    OrderDetailClient.tsx   Order detail with status history
    OrderStatusHistory.tsx  Timeline of status changes
    AdminOrderTable.tsx     Admin order table with status update controls
  ui/
    PhoneInput.tsx          Country dial-code picker + number input
    AddressInput.tsx        Cascading Country → State → City selectors
    FileUpload.tsx          Drag-and-drop file upload with Supabase Storage
    StatusBadge.tsx         Colored status pill
    Modal.tsx               Generic modal wrapper
    Pagination.tsx          Page controls
  Providers.tsx             Root client wrapper (Privy + next-intl)

lib/
  actions/                  All Server Actions (no REST routes)
    auth.ts                 ensureUser, getSessionUser, requireAdmin, signOut
    profile.ts              upsertProfile, getProfile, uploadIDDoc, uploadRUT, requestVerification
    entities.ts             CRUD for suppliers + clients
    orders.ts               Create/read payment and collection orders
    payment-profiles.ts     CRUD for user/entity payment methods
    wallet.ts               getWalletData, createWalletRequest, getUsdCopRate
    admin.ts                All admin mutations (user enable/disable, order status, etc.)
    notifications.ts        createNotification (service client), getNotifications, markNotificationsRead
  context/
    user-context.tsx        UserContext — exposes isEnabled to client components
  supabase/
    server.ts               createClient(privyToken) and createServiceClient()
    client.ts               Browser Supabase client (realtime only)
    types.ts                Generated TypeScript types from Supabase schema
  privy/
    server.ts               verifyPrivyToken — validates Privy JWT server-side

supabase/migrations/        SQL migration files (run in order)
messages/                   i18n strings (es.json, en.json)
```

---

## Key Architecture Decisions

### Server Actions only

No REST API routes. All data fetching and mutations use Next.js Server Actions in `lib/actions/`. Auth logic stays server-side and no endpoints are exposed.

### Privy → Supabase JWT bridge

Privy issues RS256 JWTs. Supabase RLS requires HS256 signed with its own secret. The bridge in `lib/supabase/server.ts`:

1. Server Action receives a raw Privy access token from the client
2. Verifies it via `@privy-io/server-auth` against Privy's JWKS
3. Extracts `userId` (the `did:privy:…` string) from verified claims
4. Mints a fresh HS256 JWT with `sub = privy_user_id`, signed with `SUPABASE_JWT_SECRET`
5. Passes this JWT in the Authorization header so `public.privy_sub()` returns the Privy user ID in RLS policies

### Two Supabase clients

```typescript
// RLS-enforced — for all user-facing actions
const supabase = await createClient(privyToken)

// Bypasses RLS — admin and server-to-server ONLY
const supabase = await createServiceClient()
```

`createServiceClient()` is used in:
- `ensureUser` — first login bootstrap (user row doesn't exist yet)
- Admin mutations that modify other users' rows (`adminEnableUser`, `adminVerifyRUT`)
- `createNotification` — always inserts for another user, needs to bypass RLS

### RLS policy pattern

Every table has two policies:
- `user_own_*` — user can only access their own rows via `privy_sub()`
- `admin_all_*` — admin can access all rows via `is_admin()`

Admin read-only actions (listing users, orders, etc.) use `createClient(privyToken)` — the admin's JWT satisfies `is_admin()`. Admin write actions on tables without admin write policies use `createServiceClient()`.

### User verification flow

1. User fills profile + uploads **Identity Document** (CC/CE/Pasaporte) and **RUT** (<1 month old)
2. User clicks "Submit for Verification" → `requestVerification()` sets `rut_status = 'PENDIENTE'` + notifies admins
3. Admin reviews documents in `/admin/usuarios/[id]`
4. Admin approves → `adminVerifyRUT(..., 'VERIFICADO')` + optionally enables account
5. Admin enables account → `adminEnableUser(...)` sets `is_enabled = true`
6. User gets access to Operations (Cobrar, Pagar, OTC Orders)

### Account access gates

- **Server-side**: Each protected page checks `user.is_enabled` server-side and redirects to `/dashboard`
- **Client-side**: `AppGuard` fetches `isEnabled` and provides it via `UserContext`
- **Sidebar UX**: Operations items are shown but locked (🔒, `cursor: not-allowed`) for unverified users

---

## Brand Colors

```
#081F5C  Navy       — sidebar background, headings
#401777  Purple     — accents, gradient endpoints
#334EAC  Blue       — primary buttons, links
#BAD6EB  Sky        — active nav, highlights
#FFF9EF  Cream      — page background
#10b981  Green      — verified, active, success
#f59e0b  Amber      — pending, warning
#ef4444  Red        — rejected, error
```

---

## Deployment

```bash
npx vercel --prod
```

Set all `.env.local` variables in Vercel project settings before deploying. `SUPABASE_JWT_SECRET` and `PRIVY_APP_SECRET` are especially sensitive — never commit them.
