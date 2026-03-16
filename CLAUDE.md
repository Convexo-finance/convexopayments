# CLAUDE.md — pay.convexo.xyz

Coding guide for AI assistants working in this repo. Read this before touching any file.

---

## What This Is

B2B payment platform. Users create supplier/client records, then submit payment or collection orders. Convexo processes orders manually using its own bank accounts and USDC wallets. The app is the ops interface — not a payment processor itself.

**Stack:** Next.js 16 App Router · TypeScript · Supabase · Privy auth · Resend · next-intl

---

## Non-Obvious Column Names

| Table | Column | NOT |
|---|---|---|
| `suppliers`, `clients` | `internal_name` | `name` |
| `suppliers`, `clients` | `office_country` | `country` |
| `suppliers`, `clients` | `contact_email` | `email` |
| `payment_orders` | `reference` | `reference_code` |
| `payment_orders` | `rejection_reason` | `notes` |
| `users` | `is_enabled` | `is_active` |
| `profiles` | `usdc_balance` | `balance` |
| `users` | `privy_user_id` | `user_id` / `auth_id` |

USDC balance lives on `profiles.usdc_balance`, not `users`. Never update `users` for balance operations.

---

## Two Supabase Clients — Use the Right One

```typescript
import { createClient, createServiceClient } from '@/lib/supabase/server'

// RLS-enforced — for all user-facing actions
const supabase = await createClient(privyToken)

// Bypasses RLS — admin/bootstrap/server-to-server ONLY
const supabase = await createServiceClient()
```

**`createClient(privyToken)`** — verifies the Privy token, mints an HS256 JWT, passes it to Supabase so `public.privy_sub()` returns the Privy user ID. RLS policies fire. Use for all user-triggered actions.

**`createServiceClient()`** — uses `SUPABASE_SERVICE_ROLE_KEY`, bypasses all RLS. Use ONLY in:
- `ensureUser` — first login, user row doesn't exist yet
- Admin mutations on tables without admin RLS policies (e.g., direct profile/user edits)
- `createNotification` — inserts into another user's row, needs to bypass RLS
- Never use for regular user actions

**Admin read-only actions** (listing users, orders, suppliers) can safely use `createClient(privyToken)` because every table has an `admin_all_*` RLS policy that allows admin access via `is_admin()`. Only write operations on rows that belong to other users require `createServiceClient()`.

---

## RLS Policy Pattern

Every table has exactly two policies, both using `public.privy_sub()` (not `auth.uid()`):

```sql
-- User can access their own rows
CREATE POLICY "user_own_*" ON table_name FOR ALL
  USING (user_id = (SELECT id FROM users WHERE privy_user_id = public.privy_sub()));

-- Admin can access all rows
CREATE POLICY "admin_all_*" ON table_name FOR ALL
  USING (public.is_admin());
```

**Why `privy_sub()` not `auth.uid()`**: Privy user IDs (`did:privy:…`) are not valid UUIDs, so `auth.uid()::text` would throw a cast error on every policy check. `privy_sub()` reads the JWT `sub` claim as plain text.

---

## Lazy Initialization — Required for These Libraries

**Resend** and **PrivyClient** must be instantiated inside functions, never at module level. Module-level instantiation fails at build time because env vars aren't available during import.

```typescript
// WRONG — breaks build
const resend = new Resend(process.env.RESEND_API_KEY)

// CORRECT — instantiate inside a function
function getResend() {
  return new Resend(process.env.RESEND_API_KEY!)
}

// WRONG
const privy = new PrivyClient(...)

// CORRECT — dynamic import inside the Server Action
const { PrivyClient } = await import('@privy-io/server-auth')
const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
)
```

Importing the class (`import { Resend } from 'resend'`) at module level is fine. Only **instantiation** (`new Resend(...)`) must be deferred.

---

## Server Actions Only — No REST Routes

No `app/api/` routes exist. All data access and mutations are Server Actions in `lib/actions/`. Every user-facing Server Action receives `privyToken: string` from the client (via `getAccessToken()` from `usePrivy()`).

---

## Admin Security Pattern

Every admin Server Action must verify the caller is an admin server-side:

```typescript
'use server'
import { requireAdmin } from '@/lib/actions/auth'
import { createServiceClient } from '@/lib/supabase/server'

export async function someAdminAction(privyToken: string, ...) {
  await requireAdmin(privyToken)  // throws UNAUTHORIZED if not admin
  const supabase = await createServiceClient()
  // ...
}
```

Never skip `requireAdmin()` in admin actions. Layout-level redirects are UI only, not security.

---

## Notification Pattern

`createNotification()` in `lib/actions/notifications.ts` uses `createServiceClient()` internally because it always writes to another user's row. Call it from admin actions after the main mutation:

```typescript
await createNotification(
  userId,       // target user's internal UUID (not privy ID)
  'ACCOUNT',    // type string
  'Title',      // notification title
  'Body text',  // notification body
  relatedId,    // optional: related entity ID
  'ORDER'       // optional: related entity type
)
```

---

## Profiles — Verification Flow

```
User fills profile + uploads ID doc + uploads RUT
  → requestVerification() sets rut_status = 'PENDIENTE'
  → Admin sees notification in /admin/usuarios
  → Admin reviews documents in /admin/usuarios/[id]
  → adminVerifyRUT(token, userId, 'VERIFICADO')
  → adminEnableUser(token, userId, true)
  → User's is_enabled = true → full access unlocked
```

Document columns on `profiles`:
- `id_doc_url` — identity document (CC/CE/Pasaporte)
- `rut_url` — RUT from DIAN (must be < 1 month old)
- `rut_status` — `null | 'PENDIENTE' | 'VERIFICADO' | 'RECHAZADO'`
- `rut_admin_note` — rejection reason shown to user

---

## Entity/Action Return Shapes

These functions return `{ data, total }`, not a plain array:

```typescript
const { data: suppliers } = await adminGetAllSuppliers(token)
// NOT: const suppliers = await adminGetAllSuppliers(token)
```

When querying with joins, Supabase may return the joined table as an array even for single-row joins:

```typescript
const nameObj = Array.isArray(order.suppliers) ? order.suppliers[0] : order.suppliers
const name = nameObj?.internal_name ?? ''
```

---

## Type Cast Patterns

Some Supabase operations need `as any` or `as unknown as` casts:

```typescript
// JSONB arrays (status_history)
const history = (order.status_history ?? []) as any[]

// Custom RPC functions not in generated types
await (supabase.rpc as any)('increment_balance', { user_id, amount })

// Mismatched return types from Server Actions
history={data as unknown as HistoryItem[]}
```

These casts are intentional. Don't replace with complex generics.

---

## Supabase Types

Generated types live in `lib/supabase/types.ts`. After any migration that adds/changes columns, regenerate via Supabase MCP:

```
mcp__plugin_supabase_supabase__generate_typescript_types (project_id: snvnfztcatrtejpldctl)
```

Then overwrite `lib/supabase/types.ts` with the output and run `npx tsc --noEmit` to verify.

---

## i18n

Language toggle is cookie-based (`NEXT_LOCALE`). No subpath routing. All user-visible strings go in `messages/es.json` and `messages/en.json`. Access via `useTranslations()` (client) or `getTranslations()` (server).

---

## Middleware

`middleware.ts` handles auth redirects. Next.js 16 deprecates this filename (prefer `proxy.ts`) — ignore the dev log warning.

---

## Styling

Inline styles only — no Tailwind utility classes in component files.

**Dark theme** — the app uses a deep dark background with glass cards:

```
Page/sidebar bg:  linear-gradient(180deg, #02001A 0%, #2A0144 100%)
Main content bg:  linear-gradient(160deg, #02001A 0%, #110020 50%, #02001A 100%)
Balance card bg:  linear-gradient(145deg, #02001A 0%, #2A0144 60%, #081F5C 100%)
Topbar bg:        rgba(2,0,26,0.7) with backdropFilter: blur(12px)

Glass card:       background: rgba(255,255,255,0.05)
                  border: 1px solid rgba(186,214,235,0.1)
Glass input:      background: rgba(255,255,255,0.07)
                  border: 1px solid rgba(186,214,235,0.2)
                  color: white
Table row border: rgba(186,214,235,0.07)
```

**Brand palette:**

```
#02001A  Black Blue (page/sidebar bg base)
#2A0144  Deep Purple (gradient midpoint)
#081F5C  Navy (gradient end, primary btn)
#334EAC  Blue (primary buttons)
#BAD6EB  Sky Blue (links, active nav, highlights, timeline dots)
#10b981  Green (status: active/verified)
#f59e0b  Amber (status: pending)
#ef4444  Red (status: rejected/error)
```

**Text colors:**
```
Primary text:    rgba(255,255,255,0.9)  or  white
Secondary text:  rgba(186,214,235,0.5)
Label text:      rgba(186,214,235,0.7)
Muted/meta:      rgba(186,214,235,0.4)
```

**Do NOT** use `background: 'white'` or `color: '#081F5C'` for body text — these create harsh contrast against the dark background. Use the rgba values above.

---

## PhoneInput Component

`components/ui/PhoneInput.tsx` — country dial-code picker + number field. Pass two separate fields:

```tsx
<PhoneInput
  countryCode={profile.phone_country_code}  // e.g. '+57'
  number={profile.phone}                     // e.g. '3186766035'
  onCountryChange={(code) => set({ phone_country_code: code })}
  onNumberChange={(num) => set({ phone: num })}
/>
```

Store as two separate DB columns: `profiles.phone_country_code` and `profiles.phone`.

---

## AddressInput Component

`components/ui/AddressInput.tsx` — cascading Country → State → City selectors using `country-state-city`. Store five fields:

```tsx
<AddressInput
  value={{ address, country, country_code, state, state_code, city }}
  onChange={(v) => set(v)}
/>
```

DB columns: `profiles.address`, `.country`, `.country_code`, `.state`, `.state_code`, `.city`.

If a country has no states in the dataset the component falls back to a free-text input. Same for cities.

---

## MCP Tools — Use These When Relevant

When working on this project always prefer using the available MCP servers instead of guessing or writing boilerplate from scratch:

**Supabase MCP** (`mcp__plugin_supabase_supabase__*`) — use for:
- Running SQL queries or migrations (`execute_sql`, `apply_migration`)
- Listing tables and schema (`list_tables`)
- Regenerating TypeScript types after schema changes (`generate_typescript_types` → overwrite `lib/supabase/types.ts`)
- Checking project URL and keys (`get_project_url`, `get_publishable_keys`)
- Project ID: `snvnfztcatrtejpldctl`

**Privy MCP** (`mcp__privy-docs__search_privy_docs`) — use when:
- Implementing or debugging auth flows, embedded wallets, or export wallet
- Checking correct hook/API signatures (e.g. `useExportWallet`, `createWallets`, `embeddedWallets` config shape)
- Verifying server-auth patterns for `@privy-io/server-auth`

Always search the Privy docs before assuming an API shape — Privy's config options (especially `embeddedWallets`) have changed between versions and wrong shapes cause silent TypeScript errors.

---

## What Not To Do

- Do not create API routes under `app/api/`
- Do not use `createServiceClient()` for user-triggered actions
- Do not use `createClient()` without a token — it creates an anon client that fails RLS
- Do not instantiate Resend or PrivyClient at module level
- Do not touch `users.balance` — balance is `profiles.usdc_balance`
- Do not use `.catch()` on Supabase query builders — use try/catch
- Do not skip `requireAdmin()` in admin Server Actions
- Do not add `--no-turbopack` to the dev script (removed in Next.js 16)
- Do not use `auth.uid()::text` in RLS policies — use `public.privy_sub()` instead
