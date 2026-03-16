# Convexo Payment Accounts — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Convexo accounts to be tagged for PAY orders, show all account types (BANK/CRYPTO/CASH) to users in the payment step with proof upload, and expose user payment evidence to admins.

**Architecture:** Six sequential tasks — DB first, then actions, then UI. No new files created. All changes extend existing files following established codebase patterns (inline styles, Server Actions, `createClient`/`createServiceClient` split).

**Tech Stack:** Next.js 16 App Router · Supabase MCP · TypeScript · Server Actions · `FileUpload` component (existing)

---

## Critical context before starting

- **Inline styles only** — no Tailwind utility classes in component files
- **Dark theme colors** — `rgba(255,255,255,0.05)` cards, `rgba(186,214,235,0.1)` borders, `rgba(186,214,235,0.7)` labels, `rgba(255,255,255,0.9)` primary text
- **Server Actions only** — no `app/api/` routes
- **`createServiceClient()`** for storage uploads (bucket RLS blocks user JWTs); identity verified before calling
- **`createClient(privyToken)`** for all user-triggered DB reads/writes
- **Never use `.catch()` on Supabase queries** — use try/catch
- **Supabase project ID:** `snvnfztcatrtejpldctl`
- **Type check command:** `npx tsc --noEmit` (ignore errors in `tests/placeholder.test.ts`)

---

## File map

| File | What changes |
|---|---|
| `components/convexo/ConvexoAccountForm.tsx` | Add `PAYMENTS` to DIRECTIONS array |
| `lib/supabase/types.ts` | Regenerate after migration (via MCP) |
| `lib/actions/orders.ts` | Add `uploadUserProof`, update `confirmPayment` signature |
| `lib/actions/admin.ts` | Add `convexo_accounts` join to `adminGetOrderById` |
| `components/orders/OrderDetailClient.tsx` | Direction filter, BANK/CASH render, TxID scoped, proof upload, clipboard always on |
| `app/admin/pagar/[id]/page.tsx` | New "Pago del usuario" section |

---

## Chunk 1: Foundation — direction flag + DB column + types

### Task 1: Add PAYMENTS direction to ConvexoAccountForm

**Files:**
- Modify: `components/convexo/ConvexoAccountForm.tsx:15-21`

The `DIRECTIONS` array currently has: `COMPRAR`, `VENDER`, `OTC`, `COLLECTIONS`, `ALL`. Add `PAYMENTS` after `COLLECTIONS`.

- [ ] **Step 1: Add PAYMENTS to DIRECTIONS**

In `components/convexo/ConvexoAccountForm.tsx`, find the `DIRECTIONS` array and add the new entry:

```typescript
const DIRECTIONS = [
  { value: 'COMPRAR',     label: 'COMPRAR',           desc: 'OTC buy orders — user sends fiat to Convexo' },
  { value: 'VENDER',      label: 'VENDER',            desc: 'OTC sell orders — Convexo sends fiat to user' },
  { value: 'OTC',         label: 'COMPRAR + VENDER',  desc: 'Both OTC directions' },
  { value: 'COLLECTIONS', label: 'COLLECTIONS',       desc: 'Collect orders — client sends fiat here' },
  { value: 'PAYMENTS',    label: 'PAYMENTS',           desc: 'Pay orders — user sends funds to Convexo to pay a supplier' },
  { value: 'ALL',         label: 'Todos / All',       desc: 'Available everywhere' },
]
```

- [ ] **Step 2: Verify build**

```bash
npx tsc --noEmit 2>&1 | grep -v "tests/placeholder"
```

Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add components/convexo/ConvexoAccountForm.tsx
git commit -m "feat: add PAYMENTS direction to Convexo account config"
```

---

### Task 2: DB migration — add user_proof_url + regenerate types

**Files:**
- Modify: `lib/supabase/types.ts` (regenerated)

- [ ] **Step 1: Run migration via Supabase MCP**

Use `mcp__plugin_supabase_supabase__apply_migration` with:
- `project_id`: `snvnfztcatrtejpldctl`
- `name`: `add_user_proof_url_to_payment_orders`
- `query`:
```sql
ALTER TABLE payment_orders ADD COLUMN user_proof_url text;
```

- [ ] **Step 2: Regenerate TypeScript types**

Use `mcp__plugin_supabase_supabase__generate_typescript_types` with `project_id: snvnfztcatrtejpldctl`.

Overwrite `lib/supabase/types.ts` with the full output.

- [ ] **Step 3: Verify types compile**

```bash
npx tsc --noEmit 2>&1 | grep -v "tests/placeholder"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "feat: add user_proof_url column to payment_orders"
```

---

## Chunk 2: Server Actions

### Task 3: Add uploadUserProof + update confirmPayment

**Files:**
- Modify: `lib/actions/orders.ts`

Current `confirmPayment` signature (line ~111):
```typescript
export async function confirmPayment(
  privyToken: string,
  orderId: string,
  txnHash: string,
  convexoAccountId?: string
)
```

- [ ] **Step 1: Add uploadUserProof action**

After the existing `uploadInvoice` function (~line 21), add:

```typescript
export async function uploadUserProof(privyToken: string, file: File) {
  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createServiceClient()
  const ext = file.name.split('.').pop() || 'pdf'
  const path = `user-proofs/${user.id}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('documents').upload(path, file, {
    upsert: true,
    contentType: file.type || 'application/pdf',
  })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
  return publicUrl
}
```

- [ ] **Step 2: Update confirmPayment signature and body**

Replace the existing `confirmPayment` function with:

```typescript
export async function confirmPayment(
  privyToken: string,
  orderId: string,
  payload: { txnHash?: string; convexoAccountId?: string; userProofUrl?: string }
) {
  const { txnHash, convexoAccountId, userProofUrl } = payload
  if (!txnHash?.trim() && !userProofUrl) throw new Error('MISSING_PAYMENT_EVIDENCE')

  const user = await getSessionUser(privyToken)
  if (!user) throw new Error('NOT_FOUND')
  const supabase = await createClient(privyToken)

  const { data: order } = await supabase
    .from('payment_orders')
    .select('status, user_id')
    .eq('id', orderId)
    .single()
  if (!order || order.status !== 'OPENED') throw new Error('INVALID_TRANSITION')

  const history = await appendStatusHistory(supabase, orderId, 'ORDERED', user.id)
  const update: Record<string, unknown> = {
    status: 'ORDERED',
    status_history: history,
    updated_at: new Date().toISOString(),
  }
  if (txnHash?.trim()) update.txn_hash = txnHash.trim()
  if (convexoAccountId) update.convexo_account_id = convexoAccountId
  if (userProofUrl) update.user_proof_url = userProofUrl

  const { error } = await supabase
    .from('payment_orders')
    .update(update)
    .eq('id', orderId)
  if (error) throw error
}
```

- [ ] **Step 3: Verify types compile**

```bash
npx tsc --noEmit 2>&1 | grep -v "tests/placeholder"
```

Expected: no output. If `OrderDetailClient.tsx` now has a type error on the old `confirmPayment` call site, that will be fixed in Task 5 — note it but don't fix yet.

- [ ] **Step 4: Commit**

```bash
git add lib/actions/orders.ts
git commit -m "feat: add uploadUserProof action, make confirmPayment accept proof payload"
```

---

### Task 4: Update adminGetOrderById to join convexo_accounts

**Files:**
- Modify: `lib/actions/admin.ts:368-382`

- [ ] **Step 1: Add convexo_accounts join**

Find `adminGetOrderById` (~line 365). Change the select query from:

```typescript
.select('*, users(email), payment_profiles!payment_profile_id(*)')
```

to:

```typescript
.select('*, users(email), payment_profiles!payment_profile_id(*), convexo_accounts!convexo_account_id(*)')
```

No other changes to this function.

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit 2>&1 | grep -v "tests/placeholder"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add lib/actions/admin.ts
git commit -m "feat: join convexo_accounts in adminGetOrderById"
```

---

## Chunk 3: User-facing UI — OrderDetailClient overhaul

### Task 5: Overhaul OrderDetailClient

**Files:**
- Modify: `components/orders/OrderDetailClient.tsx`

This task has 5 sub-steps applied to the same file. Read the full file before starting.

**Key facts about the current component:**
- `convexoAccounts` prop is `ConvexoAccount[]` where `ConvexoAccount.details` is `Record<string, string>`
- `selectedAccount` state defaults to `convexoAccounts[0]?.id ?? ''`
- `handleConfirmPayment` calls `confirmPayment(privyToken, order.id, txnHash, selectedAccount || undefined)`
- Copy button exists but only inside `status === 'OPENED'` and `status === 'ORDERED'` blocks
- `buildClipboardText()` includes order ID, reference, amount, counterparty, date, and selected account

- [ ] **Step 1: Add userProofUrl state + update Order interface**

At the top of `OrderDetailClient`, add `user_proof_url` to the `Order` interface:

```typescript
interface Order {
  id: string
  type: string
  status: string
  amount: number
  currency: string
  reference: string | null
  invoice_url: string | null
  proof_url: string | null
  user_proof_url: string | null   // ← add this
  txn_hash: string | null
  rejection_reason: string | null
  created_at: string | null
  updated_at: string | null
  due_date: string | null
  status_history: StatusHistoryEntry[] | null
  entity_name?: string | null
  processing_fee?: number | null
  fiat_currency?: string | null
  fiat_amount?: number | null
  fiat_rate?: number | null
}
```

In the component body, add `userProofUrl` state alongside `txnHash`:

```typescript
const [txnHash, setTxnHash] = useState(order.txn_hash ?? '')
const [userProofUrl, setUserProofUrl] = useState(order.user_proof_url ?? '')  // ← add
```

- [ ] **Step 2: Filter accounts and update selectedAccount default**

Before the `useState` calls, compute filtered accounts:

```typescript
// Filter to accounts available for PAY orders
const paymentAccounts = convexoAccounts.filter(
  (a) => a.details.direction === 'PAYMENTS' || a.details.direction === 'ALL' || !a.details.direction
)
```

Update `selectedAccount` default to use filtered list:

```typescript
const [selectedAccount, setSelectedAccount] = useState<string>(paymentAccounts[0]?.id ?? '')
```

In the JSX (Step 2 — OPENED block), replace `convexoAccounts` with `paymentAccounts` in the map and length checks.

- [ ] **Step 3: Add BANK and CASH rendering inside the account cards**

In the account card map (currently only renders CRYPTO fields), add BANK and CASH sections. The full updated account card body:

```tsx
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
  <div style={{ flex: 1 }}>
    {/* Label row */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
        {acct.label ?? acct.method}
      </span>
      <span style={{ background: 'rgba(186,214,235,0.12)', color: 'rgba(186,214,235,0.7)', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
        {acct.method}
      </span>
      {/* Chain badge for CRYPTO */}
      {acct.method === 'CRYPTO' && acct.details.network && (
        <span style={{ background: (CHAIN_COLORS[acct.details.network] ?? '#888') + '22', color: CHAIN_COLORS[acct.details.network] ?? '#888', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
          {acct.details.network}
        </span>
      )}
      {acct.method === 'CRYPTO' && acct.details.token && (
        <span style={{ fontSize: 12, color: 'rgba(186,214,235,0.5)' }}>{acct.details.token}</span>
      )}
    </div>

    {/* CRYPTO details */}
    {acct.method === 'CRYPTO' && acct.details.address && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <code style={{ fontSize: 12, color: 'rgba(186,214,235,0.8)', wordBreak: 'break-all', flex: 1 }}>
          {acct.details.address}
        </code>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(acct.details.address) }}
          style={{ flexShrink: 0, background: 'rgba(186,214,235,0.1)', border: '1px solid rgba(186,214,235,0.2)', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: 'rgba(186,214,235,0.7)', cursor: 'pointer' }}
        >
          Copy
        </button>
      </div>
    )}

    {/* BANK details */}
    {acct.method === 'BANK' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {acct.details.bank_name && <AccountDetail label="Bank" value={acct.details.bank_name} />}
        {acct.details.account_name && <AccountDetail label="Account holder" value={acct.details.account_name} />}
        {acct.details.account_number && <AccountDetail label="Account / IBAN" value={acct.details.account_number} copy />}
        {acct.details.routing_number && <AccountDetail label="SWIFT / Routing" value={acct.details.routing_number} copy />}
        {acct.details.currency && <AccountDetail label="Currency" value={acct.details.currency} />}
        {acct.details.country && <AccountDetail label="Country" value={acct.details.country} />}
      </div>
    )}

    {/* CASH details */}
    {acct.method === 'CASH' && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {acct.details.place_name && <AccountDetail label="Location" value={acct.details.place_name} />}
        {acct.details.address && <AccountDetail label="Address" value={acct.details.address} />}
        {acct.details.city && <AccountDetail label="City" value={acct.details.city} />}
        {acct.details.instructions && <AccountDetail label="Instructions" value={acct.details.instructions} />}
      </div>
    )}
  </div>

  {/* QR code — CRYPTO only */}
  {acct.method === 'CRYPTO' && acct.details.address && (
    <div style={{ background: 'white', borderRadius: 8, padding: 8, flexShrink: 0 }}>
      <QRCode value={acct.details.address} size={100} />
    </div>
  )}
</div>
```

Add the `AccountDetail` helper function at the bottom of the file (alongside `Field`):

```typescript
function AccountDetail({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)', flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
        {copy && (
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(value)}
            style={{ flexShrink: 0, background: 'rgba(186,214,235,0.1)', border: '1px solid rgba(186,214,235,0.2)', borderRadius: 6, padding: '2px 7px', fontSize: 10, color: 'rgba(186,214,235,0.7)', cursor: 'pointer' }}
          >
            Copy
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Scope TxID to CRYPTO + add proof file upload**

In the OPENED block, after the account cards map and before the "Confirm Payment" button:

Remove the existing standalone TxID input block. Replace with:

```tsx
{/* TxID — only for CRYPTO accounts */}
{selectedAccount && paymentAccounts.find(a => a.id === selectedAccount)?.method === 'CRYPTO' && (
  <div style={{ marginBottom: 12 }}>
    <label style={labelStyle}>Transaction Hash (TxID) *</label>
    <input
      style={inputStyle}
      placeholder="Paste the transaction hash from your wallet..."
      value={txnHash}
      onChange={(e) => setTxnHash(e.target.value)}
    />
    <p style={{ fontSize: 11, color: 'rgba(186,214,235,0.35)', marginTop: 4 }}>
      You can find the TxID in your wallet app or on the blockchain explorer after sending.
    </p>
  </div>
)}

{/* Proof of payment upload — always shown when account selected */}
{selectedAccount && (
  <div style={{ marginBottom: 12 }}>
    <label style={labelStyle}>Proof of Payment</label>
    <FileUpload
      label="Upload bank receipt, transfer confirmation or payment screenshot (PDF, JPG, PNG)"
      accept=".pdf,.jpg,.jpeg,.png"
      currentUrl={userProofUrl}
      onUpload={async (file) => {
        const token = await getAccessToken()
        if (!token) throw new Error('Not authenticated')
        const { uploadUserProof } = await import('@/lib/actions/orders')
        const url = await uploadUserProof(token, file)
        setUserProofUrl(url)
        return url
      }}
    />
  </div>
)}
```

Update `handleConfirmPayment` to use the new payload shape and relaxed validation:

```typescript
async function handleConfirmPayment() {
  const isCrypto = paymentAccounts.find(a => a.id === selectedAccount)?.method === 'CRYPTO'
  if (isCrypto && !txnHash.trim() && !userProofUrl) {
    setError('Please enter the transaction hash or upload a proof of payment.')
    return
  }
  if (!isCrypto && !userProofUrl) {
    setError('Please upload a proof of payment (bank receipt or transfer confirmation).')
    return
  }
  setLoading(true); setError(null)
  try {
    const { confirmPayment } = await import('@/lib/actions/orders')
    await confirmPayment(privyToken, order.id, {
      txnHash: txnHash.trim() || undefined,
      convexoAccountId: selectedAccount || undefined,
      userProofUrl: userProofUrl || undefined,
    })
    setStatus('ORDERED')
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : 'Error')
  } finally { setLoading(false) }
}
```

Update the "Confirm Payment" button disabled condition:

```typescript
// Disable when: no account selected, or (crypto with no txnHash AND no proof), or (non-crypto with no proof)
const canConfirm = !!selectedAccount && (
  paymentAccounts.find(a => a.id === selectedAccount)?.method === 'CRYPTO'
    ? (!!txnHash.trim() || !!userProofUrl)
    : !!userProofUrl
)
```

Update button:
```tsx
<button
  onClick={handleConfirmPayment}
  disabled={loading || !canConfirm}
  style={{ ...primaryBtn, opacity: (!canConfirm || loading) ? 0.5 : 1, cursor: (!canConfirm || loading) ? 'not-allowed' : 'pointer' }}
>
  {loading ? 'Confirming...' : 'Confirm Payment →'}
</button>
```

- [ ] **Step 5: Move copy button to all stages + enrich clipboard text**

Update `buildClipboardText()` to include status, fee, total, and fiat equivalent:

```typescript
function buildClipboardText() {
  const fee = order.processing_fee ?? null
  const total = fee != null ? Number(order.amount) + Number(fee) : null
  const lines = [
    `Convexo Payment Order`,
    `─────────────────────`,
    `Order ID    : #${shortId}`,
    `Status      : ${status}`,
    ...(displayReference ? [`Reference   : ${displayReference}`] : []),
    `Supplier    : ${counterpartyName}`,
    ``,
    `Amount      : ${Number(order.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${order.currency}`,
    ...(fee != null ? [`Fee (1%)    : ${Number(fee).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${order.currency}`] : []),
    ...(total != null ? [`Total       : ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${order.currency}`] : []),
    ...(displayFiatCurrency && displayFiatAmount ? [`Fiat equiv  : ${displayFiatCurrency} ${Number(displayFiatAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`] : []),
    ``,
    `Created     : ${order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}`,
    ...(order.due_date ? [`Due date    : ${new Date(order.due_date).toLocaleDateString()}`] : []),
  ]
  if (selectedAccount) {
    const acct = paymentAccounts.find((a) => a.id === selectedAccount)
    if (acct) {
      lines.push(``, `Pay to (Convexo — ${acct.method})`)
      if (acct.method === 'CRYPTO') {
        lines.push(`Network     : ${acct.details.network ?? '—'}`)
        lines.push(`Token       : ${acct.details.token ?? '—'}`)
        lines.push(`Address     : ${acct.details.address ?? '—'}`)
      } else if (acct.method === 'BANK') {
        if (acct.details.bank_name) lines.push(`Bank        : ${acct.details.bank_name}`)
        if (acct.details.account_name) lines.push(`Holder      : ${acct.details.account_name}`)
        if (acct.details.account_number) lines.push(`Account     : ${acct.details.account_number}`)
        if (acct.details.routing_number) lines.push(`SWIFT       : ${acct.details.routing_number}`)
        if (acct.details.currency) lines.push(`Currency    : ${acct.details.currency}`)
      } else if (acct.method === 'CASH') {
        if (acct.details.place_name) lines.push(`Location    : ${acct.details.place_name}`)
        if (acct.details.address) lines.push(`Address     : ${acct.details.address}`)
        if (acct.details.instructions) lines.push(`Instructions: ${acct.details.instructions}`)
      }
    }
  }
  if (txnHash) lines.push(``, `TxID        : ${txnHash}`)
  return lines.join('\n')
}
```

Move the copy button out of the per-status blocks into the **main info card** (always visible). Find the actions div inside the main card (currently after the documents row):

```tsx
{/* Actions + copy — always visible */}
<div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
  {status === 'DRAFT' && (
    <button onClick={handleSubmit} disabled={loading}
      style={{ ...primaryBtn, opacity: loading ? 0.6 : 1, cursor: loading ? 'wait' : 'pointer' }}>
      {loading ? 'Submitting...' : 'Submit Order →'}
    </button>
  )}
  {CANCELLABLE.includes(status) && (
    <button onClick={handleCancel} disabled={loading} style={dangerBtn}>
      {loading ? '...' : 'Cancel Order'}
    </button>
  )}
  <button onClick={handleCopy} style={ghostBtn}>
    {copied ? '✓ Copied!' : '📋 Copy Order Details'}
  </button>
</div>
```

Remove the standalone copy buttons from the `OPENED` and `ORDERED` status blocks (they will no longer be needed there).

- [ ] **Step 6: Verify types compile**

```bash
npx tsc --noEmit 2>&1 | grep -v "tests/placeholder"
```

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add components/orders/OrderDetailClient.tsx
git commit -m "feat: overhaul payment step — BANK/CASH accounts, proof upload, clipboard at all stages"
```

---

## Chunk 4: Admin view

### Task 6: Add "Pago del usuario" section to admin order detail

**Files:**
- Modify: `app/admin/pagar/[id]/page.tsx`

The admin page already imports `adminGetOrderById`. After Task 4, the query now includes `convexo_accounts!convexo_account_id(*)` so the linked Convexo account is available on the order object.

- [ ] **Step 1: Extract convexo account from order result**

After the existing `const profile = ...` and `const userEmail = ...` lines, add:

```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const convexoAcct = Array.isArray((order as any).convexo_accounts)
  ? (order as any).convexo_accounts[0]
  : (order as any).convexo_accounts
const convexoAcctDetails = (convexoAcct?.details ?? {}) as Record<string, string>
```

- [ ] **Step 2: Add "Pago del usuario" section in the left column**

In the JSX, find the left column. After the `{/* Financial breakdown */}` section and before `{/* Entity info */}`, add:

```tsx
{/* User payment info */}
{((order as any).convexo_account_id || order.txn_hash || (order as any).user_proof_url) && (
  <Section title="Pago del usuario">
    {convexoAcct && (
      <>
        <Row label="Cuenta Convexo">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#f0f4ff', color: '#334EAC', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
              {convexoAcct.method}
            </span>
            {convexoAcct.label && <span style={{ fontSize: 13, color: '#374151' }}>{convexoAcct.label}</span>}
          </span>
        </Row>
        {convexoAcct.method === 'CRYPTO' && convexoAcctDetails.network && (
          <Row label="Red">{convexoAcctDetails.network}</Row>
        )}
        {convexoAcct.method === 'CRYPTO' && convexoAcctDetails.address && (
          <Row label="Dirección" mono>{convexoAcctDetails.address}</Row>
        )}
        {convexoAcct.method === 'BANK' && convexoAcctDetails.bank_name && (
          <Row label="Banco">{convexoAcctDetails.bank_name}</Row>
        )}
        {convexoAcct.method === 'BANK' && convexoAcctDetails.account_number && (
          <Row label="Cuenta / IBAN" mono>{convexoAcctDetails.account_number}</Row>
        )}
        {convexoAcct.method === 'CASH' && convexoAcctDetails.place_name && (
          <Row label="Ubicación">{convexoAcctDetails.place_name}</Row>
        )}
      </>
    )}
    {order.txn_hash && (
      <Row label="TxID del usuario" mono>{order.txn_hash}</Row>
    )}
    {(order as any).user_proof_url && (
      <div style={{ borderTop: '1px solid #f0ede8', marginTop: 8, paddingTop: 8 }}>
        <a
          href={(order as any).user_proof_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: '#334EAC', fontWeight: 600, textDecoration: 'none' }}
        >
          📎 Ver comprobante del usuario →
        </a>
      </div>
    )}
  </Section>
)}
```

- [ ] **Step 3: Verify types compile**

```bash
npx tsc --noEmit 2>&1 | grep -v "tests/placeholder"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add app/admin/pagar/\[id\]/page.tsx
git commit -m "feat: show user payment info in admin order detail"
```

---

## Final verification

- [ ] **Run full type check**

```bash
npx tsc --noEmit 2>&1 | grep -v "tests/placeholder"
```

Expected: no output.

- [ ] **Manual smoke test checklist**

1. Go to `/admin/configuracion` → Edit a Convexo account → Step 3 should show `PAYMENTS` as a new direction option
2. Tag a CRYPTO Convexo account as `PAYMENTS`
3. Create a new PAY order as a user → submit it
4. In `/pagar/[id]` when order is OPENED: verify only PAYMENTS-tagged accounts show in Step 2
5. Select the CRYPTO account → TxID field appears, proof upload always visible
6. Add a BANK Convexo account tagged as `PAYMENTS` → verify bank details render (bank name, IBAN, SWIFT) with no QR code
7. Upload a proof file → Confirm Payment → verify order moves to ORDERED
8. Verify "📋 Copy Order Details" button is visible at DRAFT, OPENED, ORDERED, PAYED
9. In `/admin/pagar/[id]` verify new "Pago del usuario" card shows Convexo account + TxID + user proof link
