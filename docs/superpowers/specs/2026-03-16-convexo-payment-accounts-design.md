# Convexo Payment Accounts — Implementation Spec

**Goal:** Enable Convexo accounts to be designated for PAY orders, show them properly to users during the payment step, and expose the user's payment evidence to admins.

**Architecture:** Five targeted changes across the DB, one action, two UI components, and one admin view. No new routes or components created — all changes extend existing files.

**Tech Stack:** Next.js 16 App Router · Supabase (migration via MCP) · TypeScript · Server Actions

---

## Context

A PAY order represents a user asking Convexo to pay a supplier on their behalf. The user deposits funds into a Convexo account first, then Convexo disburses to the supplier.

The order lifecycle:
1. **DRAFT** — created, not yet submitted
2. **OPENED** — admin approved; user must now deposit funds into a Convexo account
3. **ORDERED** — user submitted TxID/proof; awaiting admin review before processing
4. **EN_REVISION / PROCESANDO** — internal admin statuses
5. **PAYED** — admin uploaded proof and marked complete

The gap: Convexo accounts have a `direction` field (stored in JSONB `details`) that controls where they appear (`COMPRAR`, `VENDER`, `OTC`, `COLLECTIONS`, `ALL`). `PAYMENTS` does not exist yet, so no Convexo accounts are tagged for PAY orders. The user-facing Step 2 also only renders CRYPTO accounts and has no file upload for non-crypto payment proofs.

---

## Change 1 — Add `PAYMENTS` Direction to `ConvexoAccountForm`

**File:** `components/convexo/ConvexoAccountForm.tsx`

Add one entry to the `DIRECTIONS` array:

```typescript
{ value: 'PAYMENTS', label: 'PAYMENTS', desc: 'Pay orders — user sends funds to Convexo to pay a supplier' },
```

Insert it after `COLLECTIONS` and before `ALL`. No other changes to this file.

---

## Change 2 — DB Migration: `user_proof_url`

**Via Supabase MCP** (`mcp__plugin_supabase_supabase__apply_migration`, project `snvnfztcatrtejpldctl`):

```sql
ALTER TABLE payment_orders ADD COLUMN user_proof_url text;
```

`user_proof_url` stores the user's payment proof (bank receipt, crypto screenshot) uploaded during Step 2. It is distinct from `proof_url`, which is the admin's proof of disbursement to the supplier.

Note: `convexo_account_id` already exists on `payment_orders` (no migration needed for it). The existing `user_own_*` and `admin_all_*` RLS policies on `payment_orders` automatically cover the new column — no new policies required.

After migration: regenerate `lib/supabase/types.ts` via `generate_typescript_types`.

---

## Change 3 — `confirmPayment` Action: make `txnHash` optional, add `userProofUrl`

**File:** `lib/actions/orders.ts`

Current signature:
```typescript
export async function confirmPayment(privyToken, orderId, txnHash: string, convexoAccountId?: string)
```

New signature:
```typescript
export async function confirmPayment(
  privyToken: string,
  orderId: string,
  payload: { txnHash?: string; convexoAccountId?: string; userProofUrl?: string }
)
```

Update the DB write to include `user_proof_url` when provided. Validation: at least one of `txnHash` or `userProofUrl` must be present (enforced in the action, not the DB).

---

## Change 4 — `OrderDetailClient`: full Step 2 overhaul

**File:** `components/orders/OrderDetailClient.tsx`

Four sub-changes:

### 4a — Filter accounts by direction
When rendering Convexo accounts in Step 2, filter to only show accounts where `details.direction === 'PAYMENTS' || details.direction === 'ALL'`. If no matching accounts exist, show the existing "Contact support" message.

### 4b — Render BANK and CASH accounts
Currently only CRYPTO accounts are rendered (address, QR, network, token). Add rendering for:

**BANK:**
- Bank name, account holder, account number/IBAN
- SWIFT/routing if present
- Currency + country
- No QR code

**CASH:**
- Place name
- Address + city + country
- Instructions (if present)
- No QR code

### 4c — Make TxID optional, scoped to CRYPTO
Move the TxID input inside the selected account's card, shown only when the selected account is `method === 'CRYPTO'`. Label changes to "Transaction Hash (TxID)".

### 4d — Add user proof file upload
Add a `FileUpload` component below the account cards (always visible when an account is selected). Label: "Proof of Payment". Accepts PDF, JPG, PNG. Uses the existing `uploadInvoice` action pattern (or a new `uploadUserProof` action that writes to a different storage path).

Update `handleConfirmPayment` to:
- Accept either `txnHash` (crypto) or `userProofUrl` (bank/cash), or both
- Call updated `confirmPayment` with the new payload shape
- Validate: at least one of TxID or proof must be provided before enabling "Confirm Payment"

### 4e — Copy order details available at all stages

The existing `buildClipboardText()` + copy button is currently shown only during `OPENED` and `ORDERED` states. Move the button to always be visible (all statuses, including `DRAFT` and `PAYED`) so users can share order details with Convexo CS at any point via WhatsApp, email, etc.

Enrich `buildClipboardText()` to include all relevant fields:
```
Convexo Payment Order
─────────────────────
Order ID    : #XXXXXXXX
Status      : OPENED
Reference   : INV-2024-001
Supplier    : Proveedor ABC
Amount      : 1,000.00 USDC
Fee (1%)    : 10.00 USDC
Total       : 1,010.00 USDC
Fiat equiv  : COP 4,300,000
Created     : 16/03/2026
Due date    : 20/03/2026
```
Add Convexo account details (if one is selected) and TxID (if present) below, as already done today. Status is new — include it so CS knows where the order stands.

---

## Change 5 — Admin Order Detail: "User Payment" section

**File:** `app/admin/pagar/[id]/page.tsx`

Add a new `<Section title="Pago del usuario">` card in the left column, between "Desglose financiero" and "Información del proveedor / cliente". Renders if any of `convexo_account_id`, `txn_hash`, or `user_proof_url` is set on the order — so partial evidence (e.g. TxID without a linked account on older orders) still shows.

Fetch the linked Convexo account details: the admin query in `adminGetOrderById` should join `convexo_accounts` on `convexo_account_id` (currently joins `payment_profiles` and `users` — add `convexo_accounts` to the select).

Display:
- Convexo account method badge + label
- Key details per method (address for CRYPTO, bank name + account number for BANK, location for CASH)
- TxID if `txn_hash` is set (monospace, copy button)
- Link to user proof if `user_proof_url` is set

No admin action needed here — this is read-only display.

---

## Data Flow Summary

```
Admin config:         convexo_accounts.details.direction = 'PAYMENTS'
                              ↓
getConvexoAccounts():  filter WHERE is_active = true (direction filter on client side)
                              ↓
OrderDetailClient:    show only PAYMENTS | ALL accounts → user picks one
                              ↓
User fills:           TxID (crypto) + uploads proof (any method)
                              ↓
confirmPayment():     stores txn_hash, convexo_account_id, user_proof_url → status = ORDERED
                              ↓
Admin order detail:   reads convexo_account_id JOIN convexo_accounts → shows payment info
```

---

## Files Modified

| File | Change |
|---|---|
| `components/convexo/ConvexoAccountForm.tsx` | Add PAYMENTS to DIRECTIONS |
| `lib/actions/orders.ts` | Update `confirmPayment` signature + DB write |
| `lib/actions/admin.ts` | Add `convexo_accounts` join to `adminGetOrderById` |
| `components/orders/OrderDetailClient.tsx` | Direction filter, multi-method render, TxID optional, proof upload |
| `app/admin/pagar/[id]/page.tsx` | New "Pago del usuario" section |
| `lib/supabase/types.ts` | Regenerate after migration |

**New file:** none

---

## Error Handling

- If user submits with no TxID and no proof → client-side validation blocks submit, shows "Please enter a TxID or upload payment proof"
- If `getConvexoAccounts` returns no PAYMENTS-direction accounts → existing "Contact support" message shown
- `confirmPayment` throws if order is not in `OPENED` status (existing guard unchanged)
- Missing `convexo_account_id` on order → admin "Pago del usuario" section hidden entirely (not an error state)
