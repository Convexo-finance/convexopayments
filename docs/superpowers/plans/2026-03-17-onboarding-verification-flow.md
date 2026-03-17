# Onboarding & Verification Flow — Implementation Plan

**Date:** 2026-03-17
**Scope:** 5-phase feature: onboarding wizard, profile restructure, sidebar nav changes, product lock banners, middleware redirect

---

## Current State Summary

- **Middleware** (`middleware.ts`): Only sets `NEXT_LOCALE` cookie. No auth checks.
- **Auth flow**: `AppGuard` (client component) redirects unauthenticated users to `/login`. Loads `getSessionUser()` and exposes `isEnabled` via `UserContext`.
- **Profile page** (`app/(app)/perfil/`): Already has 4 sections (Personal, Address, Social, Documents) with edit/save pattern using `SectionCard` component. Uses `upsertProfile()` server action.
- **Product pages** (`/pagar`, `/cobrar`, `/otc`): Server components that call `getSessionUser()` and `redirect('/dashboard')` if `!user?.is_enabled`.
- **Sidebar** (`components/layout/Sidebar.tsx`): Has `USER_NAV` with 4 groups (Overview, Contacts, Operations, Settings). Already uses `ENABLED_ONLY_HREFS` set to lock nav items.
- **Profile DB columns**: Already has `instagram`, `twitter`, `linkedin` (NOT `linkedin_url`, `website_url`, `twitter_handle` as the task assumed). Missing: `website_url`, `proof_of_address_url`.
- **i18n**: CLAUDE.md mentions `next-intl` but NO `messages/` directory, NO `useTranslations` calls exist anywhere. i18n is not set up. **Skip i18n for this plan** — all strings will be hardcoded in Spanish/English as the current codebase does.
- **`requestVerification()`**: Already exists in `lib/actions/profile.ts`. Requires `id_doc_url` and `rut_url` uploaded first. Sets `rut_status = 'PENDIENTE'` and notifies admins.

---

## Phase 0 — DB Migration

### Migration file to CREATE

**`supabase/migrations/010_onboarding_profile_columns.sql`**

```sql
-- Add missing profile columns for onboarding/verification flow
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS proof_of_address_url TEXT;

-- Note: linkedin, twitter, instagram columns already exist.
-- The column "linkedin" stores a full LinkedIn URL.
-- The column "twitter" stores an @handle.
-- The column "instagram" stores an @handle.
-- "website_url" stores a full URL (e.g. https://example.com).
-- "proof_of_address_url" stores a Supabase storage public URL (same pattern as id_doc_url, rut_url).
```

### After migration: Regenerate types

```
mcp__plugin_supabase_supabase__generate_typescript_types (project_id: snvnfztcatrtejpldctl)
```

Then overwrite `lib/supabase/types.ts` with the output. The profiles Row/Insert/Update types will gain `website_url` and `proof_of_address_url`.

---

## Phase 1 — Onboarding Wizard `/onboarding`

### Files to CREATE

#### 1. `app/(app)/onboarding/page.tsx` (Server component — page shell)

**Purpose:** Server component that reads the privy-token cookie, fetches profile. If profile already has `first_name`, redirect to `/dashboard` (prevent re-visiting). Otherwise render `OnboardingClient`.

**Pattern to follow:** Copy from `app/(app)/perfil/page.tsx` lines 1-16 (cookie reading, token check, profile fetch).

**Implementation:**
```
- Read privy-token from cookies
- Fetch profile via getProfile(privyToken)
- If profile?.first_name exists → redirect('/dashboard')
- Render <OnboardingClient privyToken={privyToken} />
```

#### 2. `app/(app)/onboarding/OnboardingClient.tsx` (Client component — wizard UI)

**Purpose:** 2-step wizard. Step 1 collects first_name, last_name, phone. Step 2 is confirmation. Submit calls `completeOnboarding()` then redirects to `/dashboard`.

**Implementation details:**
- `'use client'` component
- State: `step` (1 or 2), `form` object with `first_name`, `last_name`, `phone_country_code` (default `'+57'`), `phone`
- Step 1:
  - Title: "Welcome to Convexo" / subtitle: "Let's set up your profile"
  - Two text inputs: First Name, Last Name (required)
  - PhoneInput component (import from `@/components/ui/PhoneInput`)
  - "Continue" button — validates all 3 fields non-empty, then `setStep(2)`
- Step 2:
  - Title: "Confirm your details"
  - Show summary: name, phone
  - "Confirm & Continue" button — calls `completeOnboarding()`, then `router.push('/dashboard')`
  - "Back" button — `setStep(1)`
- Styling: centered card on dark bg, use `cardStyle` / `inputStyle` patterns from `ProfileClient.tsx` (lines 560-565)
- Full-page centered layout: `display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh'`

#### 3. New Server Action: `completeOnboarding()` in `lib/actions/profile.ts`

**Purpose:** Upserts profile with first_name, last_name, phone_country_code, phone. Thin wrapper around existing `upsertProfile()`.

**Add to `lib/actions/profile.ts`:**

```typescript
export async function completeOnboarding(
  privyToken: string,
  data: { first_name: string; last_name: string; phone_country_code: string; phone: string }
) {
  return upsertProfile(privyToken, {
    first_name: data.first_name,
    last_name: data.last_name,
    phone_country_code: data.phone_country_code,
    phone: data.phone,
  })
}
```

**Why a separate function:** Semantic clarity for the onboarding flow. Could later add onboarding-specific side effects (welcome email, etc.) without polluting `upsertProfile`.

---

## Phase 2 — Restructure `/perfil` Page into 3 Sections

### File to MODIFY: `app/(app)/perfil/ProfileClient.tsx`

The current profile page has 4 sections: Personal Information, Address, Social Profiles, Documents for Verification. Restructure into 3 sections:

#### Section 1: "Informacion Personal" (merge current Personal + keep same fields)

Keep exactly the current "Personal Information" `SectionCard` content (name, document, email, phone). **No changes** to this section except rename title from `"Personal Information"` to `"Informacion Personal"`.

#### Section 2: "Redes Sociales" (rename current "Social Profiles")

Current Social section already has Instagram, Twitter/X, LinkedIn. Add two more fields:

- **Website URL** — new text input, stored in `profiles.website_url`
- Keep Instagram, Twitter, LinkedIn as-is

**Changes to `ProfileClient.tsx`:**
1. Add `website_url` to the `profile` state initialization: `website_url: str('website_url')`
2. Add `website_url` to the `draft` state
3. Add `ProfileInput` type in `lib/actions/profile.ts`: add `website_url?: string`
4. In the Social section view mode: add a `SocialViewRow` for Website (use a globe/link icon SVG)
5. In the Social section edit mode: add a `SocialEditRow` for Website with placeholder `"https://example.com"`
6. Rename section title from `"Social Profiles"` to `"Redes Sociales"`

#### Section 3: "Verificacion" (merge current Address + Documents + Submit sections)

Merge the Address section, Documents section, and Submit for Verification section into one unified "Verificacion" section. This is NOT a `SectionCard` with edit/cancel — it's a single card with all fields always editable (like the current Documents section).

**Layout inside the Verificacion card:**
1. **Status chip** at top right of card header showing current `rut_status`:
   - `null` → gray chip "No iniciado"
   - `'PENDIENTE'` → amber chip "Pendiente"
   - `'VERIFICADO'` → green chip "Verificado"
   - `'RECHAZADO'` → red chip "Rechazado"
2. If `'RECHAZADO'`: show `rut_admin_note` in a red-tinted info box below the chip
3. **Identity document fields** (from current Personal section):
   - Tipo de documento (CC / CE / Pasaporte) — `<select>` with `id_type`
   - Numero de documento — text input with `id_number`
4. **Address fields** (from current Address section):
   - `<AddressInput>` component with country, country_code, state, state_code, city, address
5. **Document uploads** (from current Documents section):
   - Documento de identidad (`id_doc_url`) — `<FileUpload>` — same as current
   - Prueba de domicilio (`proof_of_address_url`) — NEW `<FileUpload>` — same pattern
   - RUT (`rut_url`) — `<FileUpload>` — same as current
6. **Save button** — saves all Verificacion fields via `upsertProfile()`
7. **Submit for Verification button** — calls `requestVerification()` — same logic as current, shown when `rut_status` is null or `'RECHAZADO'`

**Changes needed:**
- Add `proof_of_address_url` to `profile` state, `draft` state, and `ProfileInput` type
- Create `uploadProofOfAddress()` server action in `lib/actions/profile.ts` (copy `uploadRUT`, change path to `proof_of_address/${user.id}/...`)
- Remove the standalone "Address" `SectionCard`
- Remove the standalone "Documents for Verification" div
- Remove the standalone "Request Account Activation" div
- Replace all three with a single "Verificacion" card
- Remove `'address'` from the `Section` type (now only `'personal' | 'social' | 'verification'`)
- The Verificacion section uses its own save flow (not the `SectionCard` edit/cancel pattern) — similar to how Documents currently works but with a Save button for the form fields
- Move id_type and id_number OUT of the Personal section edit form and INTO the Verificacion section

**New server action to add to `lib/actions/profile.ts`:**

```typescript
export async function uploadProofOfAddress(privyToken: string, file: File) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)
  const ext = file.name.split('.').pop() || 'pdf'
  const path = `proof_of_address/${user.id}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('documents').upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/pdf',
  })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
  return publicUrl
}
```

**Update `ProfileInput` type** in `lib/actions/profile.ts`:
```typescript
// Add to the existing type:
  website_url?: string
  proof_of_address_url?: string
```

---

## Phase 3 — Sidebar Navigation Changes

### File to MODIFY: `components/layout/Sidebar.tsx`

**Change the `USER_NAV` array** (lines 10-43) from:

```typescript
const USER_NAV = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard',       href: '/dashboard' },
      { label: 'Notificaciones',  href: '/notificaciones' },
      { label: 'Perfil',          href: '/perfil' },
      { label: 'Wallet',          href: '/cuenta' },
      { label: 'Métodos de Pago', href: '/metodos-pago' },
    ],
  },
  // ... Contacts, Operations unchanged ...
  {
    group: 'Settings',
    items: [
      { label: 'Authentication', href: '/settings/auth' },
      { label: 'Seguridad',      href: '/settings/security' },
    ],
  },
]
```

**To:**

```typescript
const USER_NAV = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard',       href: '/dashboard' },
      { label: 'Perfil',          href: '/perfil' },
      { label: 'Wallet',          href: '/cuenta' },
      { label: 'Métodos de Pago', href: '/metodos-pago' },
    ],
  },
  // ... Contacts, Operations unchanged ...
  {
    group: 'Settings',
    items: [
      { label: 'Notificaciones',  href: '/notificaciones' },
      { label: 'Authentication',  href: '/settings/auth' },
      { label: 'Seguridad',       href: '/settings/security' },
    ],
  },
]
```

**Summary of change:** Move `Notificaciones` from Overview group to Settings group (as first item in Settings).

---

## Phase 4 — Product Lock Banners

### Files to MODIFY: 3 page files

The current behavior on `/pagar`, `/cobrar`, `/otc` is: `if (!user?.is_enabled) redirect('/dashboard')` — a hard redirect. Replace with a soft banner.

#### 4a. `app/(app)/pagar/page.tsx`

**Remove** line 15: `if (!user?.is_enabled) redirect('/dashboard')`

**Add** after `<Topbar>` and before the content div: a conditional amber banner component.

**Replace the hard redirect with:**
```typescript
const isEnabled = user?.is_enabled ?? false
```

Then in the JSX, after `<Topbar>`:
```tsx
{!isEnabled && <ActivationBanner />}
```

**Disable the CTA button** when `!isEnabled`: change the Topbar `cta` prop to be conditional:
```tsx
cta={isEnabled ? { label: '+ New Order', href: '/pagar/new' } : undefined}
```

#### 4b. `app/(app)/cobrar/page.tsx`

Same pattern as 4a. Remove redirect, add banner, disable CTA.

#### 4c. `app/(app)/otc/page.tsx`

Same pattern as 4a. Remove redirect, add banner. (OTC has no Topbar CTA to disable.)

### File to CREATE: `components/ui/ActivationBanner.tsx`

**Purpose:** Reusable amber banner shown on locked product pages.

```tsx
import Link from 'next/link'

export function ActivationBanner() {
  return (
    <div style={{
      background: 'rgba(245,158,11,0.12)',
      border: '1px solid rgba(245,158,11,0.25)',
      borderRadius: 10,
      padding: '14px 20px',
      margin: '0 24px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 18 }}>⚠</span>
      <span style={{ fontSize: 13, color: '#f59e0b', fontWeight: 600, flex: 1 }}>
        Activa tu cuenta completando la verificacion.
      </span>
      <Link
        href="/perfil#verificacion"
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'white',
          background: 'rgba(245,158,11,0.3)',
          border: '1px solid rgba(245,158,11,0.4)',
          borderRadius: 7,
          padding: '6px 14px',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        Completar verificacion →
      </Link>
    </div>
  )
}
```

### Additional changes for banner pages

For each of the 3 pages, the existing content (tables, forms) should remain visible but with reduced opacity when `!isEnabled`. Wrap the main content div with:
```tsx
<div style={{ opacity: isEnabled ? 1 : 0.5, pointerEvents: isEnabled ? 'auto' : 'none' }}>
  {/* existing content */}
</div>
```

**Note for `/pagar/new`, `/cobrar/new` sub-routes:** Keep the existing `redirect('/dashboard')` on those pages since the user shouldn't be able to create new orders when disabled. Only the list pages get the banner treatment.

---

## Phase 5 — Middleware Update

### File to MODIFY: `middleware.ts`

**Current content** (10 lines): Only sets NEXT_LOCALE cookie.

**New implementation:** Add onboarding redirect logic. Since middleware runs on the Edge and cannot call Supabase directly (no server actions in middleware), use a **lightweight approach**:

The middleware cannot call `getSessionUser()` or query Supabase (those require server-auth Privy verification). Instead, the onboarding check happens **client-side in `AppGuard`**.

### Revised approach — Modify `AppGuard` instead of middleware

#### File to MODIFY: `components/auth/AppGuard.tsx`

**Why:** The middleware cannot verify Privy tokens or query Supabase. The `AppGuard` already loads the session user. Add profile check there.

**Changes to `AppGuard.tsx`:**

1. Import `getProfile` from `@/lib/actions/profile`
2. In the `loadUser()` async function, after getting `user`, also fetch the profile:
   ```typescript
   const { getProfile } = await import('@/lib/actions/profile')
   const profile = await getProfile(token).catch(() => null)
   ```
3. Check if profile has `first_name`. If not, and current path is not `/onboarding`, redirect:
   ```typescript
   const pathname = window.location.pathname
   if (!profile?.first_name && !pathname.startsWith('/onboarding')) {
     router.replace('/onboarding')
     return
   }
   ```
4. If user is ON `/onboarding` but already has `first_name`, redirect to dashboard:
   ```typescript
   if (profile?.first_name && pathname.startsWith('/onboarding')) {
     router.replace('/dashboard')
     return
   }
   ```

**Updated `loadUser()` function:**
```typescript
async function loadUser() {
  const token = await getAccessToken()
  if (!token) { router.replace('/login'); return }
  const { getSessionUser } = await import('@/lib/actions/auth')
  const user = await getSessionUser(token)

  // Onboarding check: if no first_name, redirect to onboarding
  const { getProfile } = await import('@/lib/actions/profile')
  const profile = await getProfile(token).catch(() => null)
  const pathname = window.location.pathname

  if (!profile?.first_name && !pathname.startsWith('/onboarding')) {
    router.replace('/onboarding')
    return
  }
  if (profile?.first_name && pathname.startsWith('/onboarding')) {
    router.replace('/dashboard')
    return
  }

  setIsEnabled(user?.is_enabled ?? false)
  setResolved(true)
}
```

**Keep `middleware.ts` as-is** — it only handles locale cookie. Auth and onboarding routing happen in `AppGuard`.

---

## Execution Order

### Step 1: DB Migration
1. Create `supabase/migrations/010_onboarding_profile_columns.sql` with the ALTER TABLE SQL
2. Apply migration via Supabase MCP: `mcp__plugin_supabase_supabase__apply_migration`
3. Regenerate types: `mcp__plugin_supabase_supabase__generate_typescript_types` → overwrite `lib/supabase/types.ts`
4. Run `npx tsc --noEmit` to verify

### Step 2: Server Actions (Phase 1 + Phase 2 backend)
1. Edit `lib/actions/profile.ts`:
   - Add `website_url` and `proof_of_address_url` to `ProfileInput` type
   - Add `completeOnboarding()` function
   - Add `uploadProofOfAddress()` function
2. Run `npx tsc --noEmit` to verify

### Step 3: Onboarding Wizard (Phase 1 UI)
1. Create `app/(app)/onboarding/page.tsx`
2. Create `app/(app)/onboarding/OnboardingClient.tsx`
3. Run `npx tsc --noEmit` to verify

### Step 4: AppGuard Update (Phase 5)
1. Edit `components/auth/AppGuard.tsx` — add onboarding redirect logic
2. Run `npx tsc --noEmit` to verify

### Step 5: Profile Restructure (Phase 2 UI)
1. Edit `app/(app)/perfil/ProfileClient.tsx`:
   - Add `website_url`, `proof_of_address_url` to state
   - Rename "Personal Information" → "Informacion Personal"
   - Move id_type/id_number OUT of Personal section
   - Rename "Social Profiles" → "Redes Sociales"
   - Add Website field to Social section
   - Remove standalone Address section
   - Remove standalone Documents section
   - Remove standalone Submit section
   - Create new unified "Verificacion" section with: status chip, id doc fields, address, file uploads, save, submit for verification
   - Add `id="verificacion"` to the Verificacion card div for anchor linking from the banner
2. Run `npx tsc --noEmit` to verify

### Step 6: Sidebar Changes (Phase 3)
1. Edit `components/layout/Sidebar.tsx` — update `USER_NAV` array
2. Run `npx tsc --noEmit` to verify

### Step 7: Product Lock Banners (Phase 4)
1. Create `components/ui/ActivationBanner.tsx`
2. Edit `app/(app)/pagar/page.tsx` — remove redirect, add banner, conditional CTA
3. Edit `app/(app)/cobrar/page.tsx` — remove redirect, add banner, conditional CTA
4. Edit `app/(app)/otc/page.tsx` — remove redirect, add banner
5. Run `npx tsc --noEmit` to verify

### Step 8: Final Verification
1. Run `npx tsc --noEmit` — full type check
2. Start dev server, test:
   - New user → lands on `/onboarding` → completes → `/dashboard`
   - Revisiting `/onboarding` when profile exists → redirects to `/dashboard`
   - `/perfil` shows 3 sections with correct fields
   - `/pagar`, `/cobrar`, `/otc` show banner when `!isEnabled`
   - Sidebar has correct nav groups

---

## Files Summary

### Files to CREATE (4 files)
| # | Path | Purpose |
|---|------|---------|
| 1 | `supabase/migrations/010_onboarding_profile_columns.sql` | Add `website_url`, `proof_of_address_url` columns to profiles |
| 2 | `app/(app)/onboarding/page.tsx` | Server component page shell for onboarding wizard |
| 3 | `app/(app)/onboarding/OnboardingClient.tsx` | Client component 2-step onboarding wizard |
| 4 | `components/ui/ActivationBanner.tsx` | Reusable amber banner for locked product pages |

### Files to MODIFY (7 files)
| # | Path | What Changes |
|---|------|-------------|
| 1 | `lib/supabase/types.ts` | Regenerated after migration (automated via MCP) |
| 2 | `lib/actions/profile.ts` | Add `website_url` + `proof_of_address_url` to `ProfileInput`; add `completeOnboarding()` + `uploadProofOfAddress()` functions |
| 3 | `components/auth/AppGuard.tsx` | Add onboarding redirect: check profile.first_name, redirect to `/onboarding` if missing |
| 4 | `app/(app)/perfil/ProfileClient.tsx` | Restructure into 3 sections (Informacion Personal, Redes Sociales, Verificacion); add website + proof_of_address fields |
| 5 | `components/layout/Sidebar.tsx` | Move Notificaciones from Overview to Settings group in USER_NAV |
| 6 | `app/(app)/pagar/page.tsx` | Remove `redirect('/dashboard')`, add `ActivationBanner`, conditional CTA |
| 7 | `app/(app)/cobrar/page.tsx` | Remove `redirect('/dashboard')`, add `ActivationBanner`, conditional CTA |
| 8 | `app/(app)/otc/page.tsx` | Remove `redirect('/dashboard')`, add `ActivationBanner` |

---

## Key Patterns to Follow

| Pattern | Copy From | Used In |
|---------|-----------|---------|
| Server page with cookie reading | `app/(app)/perfil/page.tsx` lines 1-16 | Onboarding page.tsx |
| Client component with wizard steps | `app/(app)/perfil/ProfileClient.tsx` (state management pattern) | OnboardingClient.tsx |
| PhoneInput usage | `app/(app)/perfil/ProfileClient.tsx` lines 193-198 | OnboardingClient.tsx |
| AddressInput usage | `app/(app)/perfil/ProfileClient.tsx` lines 228-231 | Verificacion section |
| FileUpload usage | `app/(app)/perfil/ProfileClient.tsx` lines 293-298 | Proof of address upload |
| Upload server action | `uploadRUT()` in `lib/actions/profile.ts` lines 73-86 | `uploadProofOfAddress()` |
| Card/input styles | `ProfileClient.tsx` lines 560-565 | All new UI components |
| AppGuard redirect pattern | `components/auth/AppGuard.tsx` lines 26-33 | Onboarding redirect |
| Banner component | `ProfileClient.tsx` `Banner` component lines 498-509 | ActivationBanner (adapted) |

---

## Not In Scope (Deferred)

- i18n setup with next-intl (not yet configured in the codebase)
- `middleware.ts` changes (onboarding check done in AppGuard instead since middleware cannot access Privy/Supabase)
- Admin-side changes for reviewing proof_of_address
- Email notifications on onboarding completion
