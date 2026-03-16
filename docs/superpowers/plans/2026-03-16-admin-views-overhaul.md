# Admin Views Overhaul Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild four admin sections — Pay order detail pages, OTC expandable rows, Entity detail pages, and ConvexoAccountForm wizard — to give admins full visibility and control over every operation.

**Architecture:** Server components fetch data and pass it to client components for interactivity. All mutations go through existing Server Actions in `lib/actions/admin.ts`. No API routes. Admin security via `requireAdmin(privyToken)` on every action.

**Tech Stack:** Next.js 16 App Router · TypeScript · Supabase (JSONB details pattern) · Privy auth · Inline styles only (no Tailwind)

---

## Chunk 1: Pay Orders — Server Action + List Page

### Task 1: Add `adminGetOrderById` server action

**Files:**
- Modify: `lib/actions/admin.ts`

- [ ] **Step 1: Add the action** at the end of `lib/actions/admin.ts`:

```typescript
export async function adminGetOrderById(privyToken: string, orderId: string) {
  await requireAdmin(privyToken)
  const supabase = await createClient(privyToken)

  const { data: order, error } = await supabase
    .from('payment_orders')
    .select('*, users(email), payment_profiles!payment_profile_id(*)')
    .eq('id', orderId)
    .single()
  if (error || !order) throw new Error('NOT_FOUND')

  // Fetch entity separately — entity_id has no FK constraint
  const table = order.type === 'PAY' ? 'suppliers' : 'clients'
  const { data: entity } = await supabase
    .from(table)
    .select('id, internal_name, legal_name, company_type, registration_country, registration_number, contact_email, company_phone, contact_name, contact_phone, contact_person_email, office_country, state, city, address, postal_code')
    .eq('id', order.entity_id)
    .single()

  return { ...order, entity: entity ?? null }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/actions/admin.ts
git commit -m "feat(admin): add adminGetOrderById server action"
```

---

### Task 2: Improve Pay Orders list page

**Files:**
- Modify: `app/admin/pagar/page.tsx`

- [ ] **Step 1: Read the current file** to understand existing structure before editing.

- [ ] **Step 2: Replace the page** with an improved version that has status filter pills and a `→ Ver` button per row. The key changes are:
  - Add `status` search param for filtering
  - Add filter pills row above the table
  - Add `#ID` short column
  - Make rows clickable → `/admin/pagar/[id]`
  - Keep existing `AdminOrderTable` or inline the table if it's simple

The page signature:
```typescript
export default async function AdminPayOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status = '', page = '1' } = await searchParams
  // ... fetch with status filter
}
```

Status filter pills (rendered above table):
```typescript
const STATUSES = ['', 'OPENED', 'ORDERED', 'EN_REVISION', 'PROCESANDO', 'PAYED', 'RECHAZADO']
const LABELS: Record<string, string> = {
  '': 'Todos', OPENED: 'Abierto', ORDERED: 'Ordenado',
  EN_REVISION: 'En Revisión', PROCESANDO: 'Procesando',
  PAYED: 'Pagado', RECHAZADO: 'Rechazado',
}
```

Each pill is an `<a href={`/admin/pagar?status=${s}`}>` link styled as a pill button.

Table columns: `#ID` · Usuario · Entidad · Monto · Fiat · Estado · Fecha · `→ Ver`

Each row: `<a href={`/admin/pagar/${o.id}`}>` wrapping a `<tr>` (or a Ver button cell).

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/admin/pagar/page.tsx
git commit -m "feat(admin): add status filter + clickable rows to pay orders list"
```

---

## Chunk 2: Pay Orders — Detail Page Components

### Task 3: Status stepper + timeline component

**Files:**
- Create: `components/admin/PayOrderStepper.tsx`

- [ ] **Step 1: Create the file**

```typescript
'use client'

const PAY_STEPS = [
  { status: 'OPENED',      label: 'Abierto' },
  { status: 'EN_REVISION', label: 'En Revisión' },
  { status: 'PROCESANDO',  label: 'Procesando' },
  { status: 'PAYED',       label: 'Pagado' },
]

function getStepIndex(status: string) {
  if (status === 'RECHAZADO') return -1
  const map: Record<string, number> = { OPENED: 0, ORDERED: 0, EN_REVISION: 1, PROCESANDO: 2, PAYED: 3 }
  return map[status] ?? 0
}

export function PayOrderStepper({ status }: { status: string }) {
  const currentStep = getStepIndex(status)
  const isRejected = status === 'RECHAZADO'

  if (isRejected) {
    return (
      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#ef4444' }}>
        ✕ Orden rechazada
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 0 }}>
      {PAY_STEPS.map((step, i) => {
        const done   = i < currentStep
        const active = i === currentStep
        return (
          <div key={step.status} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {i > 0 && (
              <div style={{ position: 'absolute', left: 0, top: 10, width: '50%', height: 2, background: done || active ? '#334EAC' : '#e5e7eb' }} />
            )}
            {i < PAY_STEPS.length - 1 && (
              <div style={{ position: 'absolute', right: 0, top: 10, width: '50%', height: 2, background: done ? '#334EAC' : '#e5e7eb' }} />
            )}
            <div style={{
              width: 22, height: 22, borderRadius: '50%', zIndex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: done ? '#334EAC' : active ? '#BAD6EB' : '#f3f4f6',
              border: `2px solid ${done || active ? '#334EAC' : '#e5e7eb'}`,
              fontSize: 10, fontWeight: 700,
              color: done ? 'white' : active ? '#081F5C' : '#9ca3af',
            }}>
              {done ? '✓' : i + 1}
            </div>
            <p style={{ fontSize: 9, marginTop: 5, textAlign: 'center', fontWeight: active ? 700 : 400, color: active ? '#081F5C' : done ? '#334EAC' : '#9ca3af' }}>
              {step.label}
            </p>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Create status timeline component** in the same file (append):

```typescript
interface HistoryEntry { status: string; changed_at: string; changed_by?: string }

const STATUS_LABELS: Record<string, string> = {
  OPENED: 'Abierto', ORDERED: 'Ordenado', EN_REVISION: 'En Revisión',
  PROCESANDO: 'Procesando', PAYED: 'Pagado', RECHAZADO: 'Rechazado',
  DRAFT: 'Borrador',
}

export function StatusTimeline({ history }: { history: HistoryEntry[] }) {
  if (!history || history.length === 0) return (
    <p style={{ fontSize: 12, color: '#9ca3af' }}>Sin historial registrado.</p>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[...history].reverse().map((h, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#334EAC', marginTop: 4, flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#081F5C' }}>{STATUS_LABELS[h.status] ?? h.status}</span>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
              {new Date(h.changed_at).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/PayOrderStepper.tsx
git commit -m "feat(admin): add PayOrderStepper and StatusTimeline components"
```

---

### Task 4: Pay Order action manager (client component)

**Files:**
- Create: `components/admin/PayOrderActions.tsx`

- [ ] **Step 1: Create the file**

This client component receives the current order status + id and renders the appropriate action form.

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PayOrderActionsProps {
  orderId: string
  status: string
  privyToken: string
}

const NEXT_ACTION: Record<string, { label: string; next: string }> = {
  OPENED:      { label: 'Mover a Revisión',    next: 'EN_REVISION' },
  ORDERED:     { label: 'Mover a Revisión',    next: 'EN_REVISION' },
  EN_REVISION: { label: 'Iniciar Proceso',     next: 'PROCESANDO' },
  PROCESANDO:  { label: 'Marcar como Pagado',  next: 'PAYED' },
}

const TERMINAL = ['PAYED', 'RECHAZADO']

export function PayOrderActions({ orderId, status, privyToken }: PayOrderActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (TERMINAL.includes(status)) {
    return (
      <p style={{ fontSize: 13, color: '#9ca3af' }}>Esta orden está en estado final. No hay acciones disponibles.</p>
    )
  }

  const next = NEXT_ACTION[status]

  async function handleAdvance() {
    setLoading(true); setError(null)
    try {
      const { adminUpdateOrderStatus } = await import('@/lib/actions/admin')
      await adminUpdateOrderStatus(privyToken, orderId, next.next, {
        proofUrl: status === 'PROCESANDO' ? proofUrl : undefined,
      })
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally { setLoading(false) }
  }

  async function handleReject() {
    if (!reason.trim()) { setError('Ingresa el motivo de rechazo'); return }
    setLoading(true); setError(null)
    try {
      const { adminUpdateOrderStatus } = await import('@/lib/actions/admin')
      await adminUpdateOrderStatus(privyToken, orderId, 'RECHAZADO', { rejectionReason: reason })
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {status === 'PROCESANDO' && (
        <div>
          <label style={labelStyle}>URL de prueba de pago <span style={{ color: '#9ca3af', fontWeight: 400 }}>(opcional)</span></label>
          <input
            placeholder="https://..."
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
            style={inputStyle}
          />
        </div>
      )}

      {next && (
        <button onClick={handleAdvance} disabled={loading} style={primaryBtn}>
          {loading ? 'Procesando...' : next.label}
        </button>
      )}

      {!rejecting ? (
        <button onClick={() => setRejecting(true)} style={dangerOutlineBtn}>
          Rechazar orden
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={labelStyle}>Motivo de rechazo</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explica el motivo..."
            style={{ ...inputStyle, resize: 'vertical' as const }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleReject} disabled={loading} style={dangerBtn}>
              {loading ? '...' : 'Confirmar rechazo'}
            </button>
            <button onClick={() => { setRejecting(false); setReason('') }} style={secondaryBtn}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ color: '#ef4444', fontSize: 12 }}>{error}</p>}
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 13, color: '#081F5C', outline: 'none', boxSizing: 'border-box' }
const primaryBtn: React.CSSProperties = { background: 'linear-gradient(135deg, #334EAC, #401777)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%' }
const dangerBtn: React.CSSProperties = { background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', flex: 1 }
const dangerOutlineBtn: React.CSSProperties = { background: 'white', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%' }
const secondaryBtn: React.CSSProperties = { background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer', flex: 1 }
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/PayOrderActions.tsx
git commit -m "feat(admin): add PayOrderActions client component"
```

---

### Task 5: Pay Order detail page

**Files:**
- Create: `app/admin/pagar/[id]/page.tsx`

- [ ] **Step 1: Create the detail page**

```typescript
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PayOrderStepper, StatusTimeline } from '@/components/admin/PayOrderStepper'
import { PayOrderActions } from '@/components/admin/PayOrderActions'
import { adminGetOrderById } from '@/lib/actions/admin'

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/login')

  const { order } = await adminGetOrderById(privyToken, id).then((o) => ({ order: o })).catch(() => redirect('/admin/pagar'))

  const shortId = `#${id.slice(0, 8).toUpperCase()}`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = Array.isArray(order.payment_profiles) ? order.payment_profiles[0] : order.payment_profiles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userEmail = Array.isArray((order as any).users) ? (order as any).users[0]?.email : (order as any).users?.email
  const details = (profile?.details ?? {}) as Record<string, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const history = ((order.status_history ?? []) as any[])

  // Legacy packed reference parser
  let displayReference = order.reference ?? null
  let displayFee = order.processing_fee
  let displayFiatCurrency = order.fiat_currency
  let displayFiatAmount = order.fiat_amount
  let displayFiatRate = order.fiat_rate
  if (order.reference?.includes('|')) {
    displayReference = null
    for (const part of order.reference.split('|').map((s: string) => s.trim())) {
      const feeMatch = part.match(/^Fee:\s*([\d.,]+)/)
      const fiatMatch = part.match(/^([A-Z]{3})\s*([\d.,]+)\s*@\s*([\d.]+)$/)
      if (feeMatch && !displayFee) displayFee = parseFloat(feeMatch[1].replace(',', ''))
      if (fiatMatch && !displayFiatCurrency) {
        displayFiatCurrency = fiatMatch[1]
        displayFiatAmount = parseFloat(fiatMatch[2].replace(',', ''))
        displayFiatRate = parseFloat(fiatMatch[3])
      }
    }
  }

  return (
    <div>
      <Topbar title={`Orden ${shortId}`} breadcrumb="Admin / Pedidos PAY" />
      <div style={{ padding: 24 }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: 20 }}>
          <Link href="/admin/pagar" style={{ fontSize: 13, color: '#334EAC', textDecoration: 'none' }}>
            ← Volver a Órdenes PAY
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>

          {/* ── LEFT column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Order header */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: '#081F5C', margin: 0 }}>{shortId}</h1>
                <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>PAY</span>
                <StatusBadge status={order.status} />
              </div>
              <div style={{ display: 'flex', gap: 24, marginTop: 10, flexWrap: 'wrap' }}>
                <Info label="Usuario" value={userEmail ?? '—'} />
                <Info label="Creado" value={new Date(order.created_at).toLocaleString()} />
                {order.due_date && <Info label="Vencimiento" value={new Date(order.due_date).toLocaleDateString()} />}
              </div>
            </div>

            {/* Financial breakdown */}
            <Section title="Desglose financiero">
              <Row label="Token">{order.currency}</Row>
              <Row label="Monto a proveedor">{Number(order.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {order.currency}</Row>
              {displayFee && <Row label="Comisión de procesamiento">{Number(displayFee).toLocaleString('en-US', { minimumFractionDigits: 2 })} {order.currency}</Row>}
              {displayFee && <Row label="Total a depositar" bold>{(Number(order.amount) + Number(displayFee)).toLocaleString('en-US', { minimumFractionDigits: 2 })} {order.currency}</Row>}
              {displayFiatCurrency && displayFiatAmount && (
                <>
                  <div style={{ borderTop: '1px solid #f0ede8', marginTop: 8, paddingTop: 8 }} />
                  <Row label="Equivalente fiat">{displayFiatCurrency} {Number(displayFiatAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</Row>
                  {displayFiatRate && <Row label="Tasa de cambio">1 {order.currency} = {Number(displayFiatRate).toLocaleString('en-US', { minimumFractionDigits: 4 })} {displayFiatCurrency}</Row>}
                </>
              )}
              {displayReference && <Row label="Referencia">{displayReference}</Row>}
            </Section>

            {/* Supplier info */}
            {order.entity && (
              <Section title="Información del proveedor / cliente">
                <Row label="Nombre interno">{order.entity.internal_name}</Row>
                {order.entity.legal_name && <Row label="Razón social">{order.entity.legal_name}</Row>}
                {order.entity.company_type && <Row label="Tipo de empresa">{order.entity.company_type}</Row>}
                {order.entity.registration_country && <Row label="País de registro">{order.entity.registration_country}</Row>}
                {order.entity.registration_number && <Row label="Nº de registro">{order.entity.registration_number}</Row>}
                {order.entity.contact_email && <Row label="Email">{order.entity.contact_email}</Row>}
                {order.entity.company_phone && <Row label="Teléfono">{order.entity.company_phone}</Row>}
                {order.entity.contact_name && <Row label="Persona de contacto">{order.entity.contact_name} {order.entity.contact_phone ? `· ${order.entity.contact_phone}` : ''}</Row>}
              </Section>
            )}

            {/* Payment method */}
            {profile && (
              <Section title="Método de pago del proveedor">
                <div style={{ marginBottom: 8 }}>
                  <span style={{ background: '#f0f4ff', color: '#334EAC', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                    {profile.method}
                  </span>
                  {profile.label && <span style={{ fontSize: 13, color: '#374151', marginLeft: 8 }}>{profile.label}</span>}
                </div>
                {profile.method === 'BANK' && (
                  <>
                    {details.bank_name && <Row label="Banco">{details.bank_name}</Row>}
                    {details.account_name && <Row label="Titular">{details.account_name}</Row>}
                    {details.account_number && <Row label="Cuenta / IBAN">{details.account_number}</Row>}
                    {details.routing_number && <Row label="SWIFT / Routing">{details.routing_number}</Row>}
                    {details.branch_code && <Row label="Código de sucursal">{details.branch_code}</Row>}
                    {details.bank_code && <Row label="Código de banco">{details.bank_code}</Row>}
                    {details.currency && <Row label="Divisa">{details.currency}</Row>}
                    {details.country && <Row label="País">{details.country}</Row>}
                  </>
                )}
                {profile.method === 'CRYPTO' && (
                  <>
                    {details.network && <Row label="Red">{details.network}</Row>}
                    {details.token && <Row label="Token">{details.token}</Row>}
                    {details.address && <Row label="Dirección" mono>{details.address}</Row>}
                  </>
                )}
              </Section>
            )}
          </div>

          {/* ── RIGHT sidebar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Status stepper */}
            <div style={card}>
              <h3 style={sectionTitle}>Estado del pedido</h3>
              <PayOrderStepper status={order.status} />
            </div>

            {/* Actions */}
            <div style={card}>
              <h3 style={sectionTitle}>Acciones</h3>
              <PayOrderActions orderId={id} status={order.status} privyToken={privyToken} />
            </div>

            {/* History */}
            <div style={card}>
              <h3 style={sectionTitle}>Historial de estados</h3>
              <StatusTimeline history={history} />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>{label}</div>
      <div style={{ fontSize: 13, color: '#081F5C', marginTop: 2 }}>{value}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={card}>
      <h3 style={{ ...sectionTitle, marginBottom: 14 }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  )
}

function Row({ label, value, bold, mono, children }: {
  label: string; value?: string; bold?: boolean; mono?: boolean; children?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#081F5C', fontWeight: bold ? 700 : 400, fontFamily: mono ? 'monospace' : 'inherit', textAlign: 'right', wordBreak: 'break-all' }}>
        {children ?? value}
      </span>
    </div>
  )
}

const card: React.CSSProperties = { background: 'white', borderRadius: 12, border: '1px solid #e8e4dc', padding: '18px 20px' }
const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: 0, marginBottom: 14 }
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/admin/pagar/[id]/page.tsx
git commit -m "feat(admin): add pay order detail page with full breakdown + actions"
```

---

## Chunk 3: OTC Orders — Expandable Rows

### Task 6: Update OTC wallet requests query to join profiles

**Files:**
- Modify: `app/admin/cuenta/page.tsx`

- [ ] **Step 1: Read the current file** to understand the existing query.

- [ ] **Step 2: Update the Supabase query** to join `profiles` for user contact info:

```typescript
// Change the select to also join profiles via users
const { data: requests } = await supabase
  .from('wallet_requests')
  .select(`
    *,
    users(id, email, profiles(first_name, last_name, phone, phone_country_code))
  `)
  .order('created_at', { ascending: false })
  .limit(100)
```

Note: `profiles` is joined through `users` since wallet_requests has `user_id → users.id` and `users.id → profiles.user_id`.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/admin/cuenta/page.tsx
git commit -m "feat(admin): join profiles in OTC wallet requests query"
```

---

### Task 7: Rewrite WalletRequestManager with expandable rows

**Files:**
- Modify: `app/admin/cuenta/WalletRequestManager.tsx`

- [ ] **Step 1: Read the current file** fully before editing.

- [ ] **Step 2: Update the `WalletRequest` interface** to include profile data:

```typescript
interface WalletRequest {
  id: string
  type: string
  amount: number
  currency: string
  status: string
  spread_pct: number | null
  proof_url: string | null
  admin_note: string | null
  created_at: string
  paid_at: string | null
  metadata: { cop_amount?: number; usdcop_rate?: number } | null
  users: {
    email: string
    profiles: { first_name?: string; last_name?: string; phone?: string; phone_country_code?: string } | null
  } | null
}
```

- [ ] **Step 3: Replace `RequestTable` component** with a new version that uses expandable rows instead of wide action cells. The key change: remove all inline action columns from the table; add an expand toggle button; when `expandedId === row.id`, render a full-width `<tr>` below with two panels.

The expanded panel structure:
```
<tr key={r.id + '-expand'}>
  <td colSpan={8}>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, padding: 20 }}>
      {/* LEFT: User info + transaction details */}
      {/* RIGHT: Stepper + action card */}
    </div>
  </td>
</tr>
```

Left panel content:
- User name (`first_name + last_name`), email, phone
- Amount + currency, type badge
- Base rate (`metadata.usdcop_rate`), spread %, final rate (`baseRate * (1 ± spread)`), COP equivalent

Right panel content:
- `OtcStepper` (reuse the same 5-step component logic, adapted for light background)
- Action card:
  - `ORDERED`: spread input + "Aceptar" btn + "Cancelar"
  - `ACEPTADO`: "Habilitar Pago" btn + "Cancelar"
  - `POR_PAGAR`: amber info box "Esperando pago del cliente" + "Cancelar"
  - `REVISION`: proof URL input + admin note input + "Liquidar" btn + "Cancelar"
  - `LIQUIDADO` / `CANCELADO`: read-only

Table columns (simplified, no action cells): `#ID` · Usuario · Tipo · Monto · COP · Spread · Estado · Created · `↕` (expand toggle)

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/admin/cuenta/WalletRequestManager.tsx app/admin/cuenta/page.tsx
git commit -m "feat(admin): expandable OTC rows with user profile info + stepper"
```

---

## Chunk 4: Entity Detail Pages

### Task 8: Add `adminGetSupplierById` and `adminGetClientById` server actions

**Files:**
- Modify: `lib/actions/admin.ts`

- [ ] **Step 1: Append the two new actions**:

```typescript
export async function adminGetSupplierById(privyToken: string, id: string) {
  await requireAdmin(privyToken)
  const supabase = await createClient(privyToken)
  const [{ data: supplier }, { data: profiles }, { data: orders }] = await Promise.all([
    supabase.from('suppliers').select('*').eq('id', id).single(),
    supabase.from('payment_profiles').select('*').eq('entity_id', id).eq('is_active', true).order('is_default', { ascending: false }),
    supabase.from('payment_orders').select('id, type, amount, currency, status, created_at').eq('entity_id', id).order('created_at', { ascending: false }).limit(20),
  ])
  if (!supplier) throw new Error('NOT_FOUND')
  return { entity: supplier, profiles: profiles ?? [], orders: orders ?? [] }
}

export async function adminGetClientById(privyToken: string, id: string) {
  await requireAdmin(privyToken)
  const supabase = await createClient(privyToken)
  const [{ data: client }, { data: profiles }, { data: orders }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', id).single(),
    supabase.from('payment_profiles').select('*').eq('entity_id', id).eq('is_active', true).order('is_default', { ascending: false }),
    supabase.from('payment_orders').select('id, type, amount, currency, status, created_at').eq('entity_id', id).order('created_at', { ascending: false }).limit(20),
  ])
  if (!client) throw new Error('NOT_FOUND')
  return { entity: client, profiles: profiles ?? [], orders: orders ?? [] }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add lib/actions/admin.ts
git commit -m "feat(admin): add adminGetSupplierById and adminGetClientById actions"
```

---

### Task 9: Shared EntityDetailView component

**Files:**
- Create: `components/admin/EntityDetailView.tsx`

- [ ] **Step 1: Create the component**

This is a client-friendly server component (no 'use client' — pure display). It accepts the entity data, profiles list, and orders list.

Key sections rendered:
1. **Company header** — internal_name (large), legal_name, badges for company_type + registration_country
2. **Contact card** — contact_email, company_phone, contact_name, contact_phone, contact_person_email
3. **Address card** — office_country, state, city, address, postal_code
4. **Payment methods** — list of profiles using a mini card per profile showing method badge, label, key details from `details` JSONB
5. **Order history sidebar** — orders table: `#ID` · Type · Amount · Status · Date · link

Two-column layout: left 65% (sections 1-4) / right 35% (order history + stats).

Stats: total orders count + total USDC volume (sum of `amount` where status = 'PAYED' or 'COMPLETADO').

```typescript
interface EntityDetailViewProps {
  entity: Record<string, unknown>
  profiles: Array<{ id: string; method: string; label: string | null; details: Record<string, string>; is_default: boolean }>
  orders: Array<{ id: string; type: string; amount: number; currency: string; status: string; created_at: string }>
  entityType: 'supplier' | 'client'
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/admin/EntityDetailView.tsx
git commit -m "feat(admin): add shared EntityDetailView component"
```

---

### Task 10: Supplier and Client detail pages + updated list pages

**Files:**
- Create: `app/admin/proveedores/[id]/page.tsx`
- Create: `app/admin/clientes/[id]/page.tsx`
- Modify: `app/admin/proveedores/page.tsx`
- Modify: `app/admin/clientes/page.tsx`

- [ ] **Step 1: Create supplier detail page** `app/admin/proveedores/[id]/page.tsx`:

```typescript
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { adminGetSupplierById } from '@/lib/actions/admin'
import { EntityDetailView } from '@/components/admin/EntityDetailView'

export default async function AdminSupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/login')

  const { entity, profiles, orders } = await adminGetSupplierById(privyToken, id)
    .catch(() => redirect('/admin/proveedores'))

  return (
    <div>
      <Topbar title={entity.internal_name as string} breadcrumb="Admin / Proveedores" />
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 20 }}>
          <Link href="/admin/proveedores" style={{ fontSize: 13, color: '#334EAC', textDecoration: 'none' }}>
            ← Volver a Proveedores
          </Link>
        </div>
        <EntityDetailView entity={entity} profiles={profiles} orders={orders} entityType="supplier" />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create client detail page** `app/admin/clientes/[id]/page.tsx` — identical structure but using `adminGetClientById` and breadcrumb pointing to `/admin/clientes`.

- [ ] **Step 3: Update list pages** — add `→ Ver` link button to each row in both `app/admin/proveedores/page.tsx` and `app/admin/clientes/page.tsx`:

```typescript
// In each table row, add a final cell:
<td style={tdStyle}>
  <Link href={`/admin/proveedores/${item.id}`}
    style={{ fontSize: 12, color: '#334EAC', fontWeight: 600, textDecoration: 'none' }}>
    Ver →
  </Link>
</td>
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/admin/proveedores/[id]/page.tsx app/admin/clientes/[id]/page.tsx app/admin/proveedores/page.tsx app/admin/clientes/page.tsx components/admin/EntityDetailView.tsx
git commit -m "feat(admin): supplier + client detail pages with payment methods + order history"
```

---

## Chunk 5: ConvexoAccountForm — 3-Step Wizard

### Task 11: Rewrite ConvexoAccountForm as a wizard

**Files:**
- Modify: `components/convexo/ConvexoAccountForm.tsx`

- [ ] **Step 1: Read the current file** fully — the field sets already exist, just need restructuring.

- [ ] **Step 2: Add a step state** and wrap existing content in step-conditional rendering:

```typescript
const [step, setStep] = useState<1 | 2 | 3>(1)
```

- [ ] **Step 3: Add progress indicator** at the top of the form (rendered always):

```typescript
const STEPS = ['Tipo', 'Detalles', 'Configuración']
// Render three dots/numbers with connecting lines
```

- [ ] **Step 4: Step 1** — Replace method selector (current vertical card list) with larger, more prominent cards. Keep the same 3 options but bigger, with icon + title + description. "Siguiente →" button (disabled until method selected).

- [ ] **Step 5: Step 2** — Show only the field group for the selected method (existing BANK / CRYPTO / CASH field sets). "← Atrás" and "Siguiente →" buttons.

- [ ] **Step 6: Step 3** — Show: Label input + Available For direction selector + Set as default checkbox + "Guardar" submit button + "← Atrás".

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add components/convexo/ConvexoAccountForm.tsx
git commit -m "feat(admin): rewrite ConvexoAccountForm as 3-step wizard"
```

---

## Final Verification

- [ ] Run `npx tsc --noEmit` — zero errors
- [ ] Start dev server `npm run dev` and manually verify:
  - `/admin/pagar` — filter pills work, rows link to detail page
  - `/admin/pagar/[id]` — full breakdown visible, actions work for each status
  - `/admin/cuenta` — rows expand with user info + stepper + actions
  - `/admin/proveedores` and `/admin/clientes` — Ver button works
  - `/admin/proveedores/[id]` — shows company info, payment methods, order history
  - `/admin/configuracion` (ConvexoAccountForm) — 3-step wizard flows correctly
- [ ] Final commit

```bash
git add -A
git commit -m "feat(admin): complete admin views overhaul — pay orders, OTC, entities, account wizard"
```
