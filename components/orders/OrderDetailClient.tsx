'use client'
import { useState } from 'react'
import Link from 'next/link'
import QRCode from 'react-qr-code'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { FileUpload } from '@/components/ui/FileUpload'
import { OrderStatusHistory } from './OrderStatusHistory'

interface StatusHistoryEntry {
  status: string
  changed_at: string
  changed_by?: string
}

interface ConvexoAccount {
  id: string
  method: string
  label: string | null
  details: Record<string, string>
}

interface PaymentProfile {
  id: string
  method: string
  label: string | null
  details: Record<string, string>
}

interface EntityInfo {
  internal_name?: string | null
  legal_name?: string | null
  office_country?: string | null
  contact_email?: string | null
  company_phone?: string | null
  contact_name?: string | null
  contact_phone?: string | null
}

interface Order {
  id: string
  type: string
  status: string
  amount: number
  currency: string
  reference: string | null
  invoice_url: string | null
  proof_url: string | null
  user_proof_url: string | null
  txn_hash: string | null
  rejection_reason: string | null
  created_at: string | null
  updated_at: string | null
  due_date: string | null
  status_history: StatusHistoryEntry[] | null
  entity_name?: string | null
  entity?: EntityInfo | null
  processing_fee?: number | null
  fiat_currency?: string | null
  fiat_amount?: number | null
  fiat_rate?: number | null
  convexo_account_id?: string | null
  admin_fee?: number | null
  admin_rate?: number | null
  admin_fiat_amount?: number | null
  admin_convexo_account_id?: string | null
}

interface OrderDetailClientProps {
  order: Order
  privyToken: string
  backHref: string
  convexoAccounts?: ConvexoAccount[]
  paymentProfile?: PaymentProfile | null
}

const CANCELLABLE = ['DRAFT', 'OPENED', 'ACCEPTED']

const CHAIN_COLORS: Record<string, string> = {
  Ethereum: '#627eea',
  Solana:   '#9945ff',
  Tron:     '#ef0027',
}

// Steps visible to user
const STEPS = [
  { status: 'DRAFT',    label: 'Draft',     desc: 'Order is being prepared' },
  { status: 'OPENED',   label: 'Submitted', desc: 'Awaiting admin review' },
  { status: 'ACCEPTED', label: 'Accepted',  desc: 'Ready for payment' },
  { status: 'ORDERED',  label: 'Ordered',   desc: 'Payment submitted' },
  { status: 'PAYED',    label: 'Paid',      desc: 'Payment confirmed' },
]

function getStepIndex(status: string) {
  const map: Record<string, number> = {
    DRAFT: 0, OPENED: 1, ACCEPTED: 2, ORDERED: 3,
    EN_REVISION: 3, PROCESANDO: 3, PROCESSING: 3, PAYED: 4,
  }
  return map[status] ?? 0
}

export function OrderDetailClient({ order, privyToken, backHref, convexoAccounts = [], paymentProfile }: OrderDetailClientProps) {
  // Filter to accounts available for PAY orders
  const paymentAccounts = convexoAccounts.filter(
    (a) => a.details.direction === 'PAYMENTS' || a.details.direction === 'ALL' || !a.details.direction
  )

  // Available method types from filtered accounts
  const availableMethods = Array.from(new Set(paymentAccounts.map((a) => a.method)))

  // Resolve the effective Convexo account: admin override takes precedence over user selection
  const effectiveAccountId = order.admin_convexo_account_id ?? order.convexo_account_id ?? null
  const effectiveAccount = effectiveAccountId
    ? (convexoAccounts.find((a) => a.id === effectiveAccountId) ?? null)
    : null

  const [status, setStatus] = useState(order.status)
  const [txnHash, setTxnHash] = useState(order.txn_hash ?? '')
  const [userProofUrl, setUserProofUrl] = useState(order.user_proof_url ?? '')
  const [selectedMethod, setSelectedMethod] = useState<string>(
    effectiveAccount?.method ?? availableMethods[0] ?? ''
  )
  const [selectedAccount, setSelectedAccount] = useState<string>(
    effectiveAccountId ?? paymentAccounts.find((a) => a.method === availableMethods[0])?.id ?? ''
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function selectMethod(method: string) {
    setSelectedMethod(method)
    setSelectedAccount(paymentAccounts.find((a) => a.method === method)?.id ?? '')
    setTxnHash('')
    setUserProofUrl('')
  }

  const counterpartyName = order.entity_name ?? '—'
  const currentStep = getStepIndex(status)
  const shortId = order.id.slice(0, 8).toUpperCase()
  // Old orders packed fee/fiat into reference with ` | ` separators — parse them out
  const cleanReference = order.reference?.includes('|') ? null : order.reference

  // Parse legacy packed reference: "My PO | Fee: 100.00 USDC | CNY 69100.00 @ 6.91"
  let legacyRef: string | null = null
  let legacyFee: number | null = null
  let legacyFiatAmount: number | null = null
  let legacyFiatCurrency: string | null = null
  let legacyFiatRate: number | null = null
  if (order.reference?.includes('|')) {
    const parts = order.reference.split('|').map((s) => s.trim())
    for (const part of parts) {
      const feeMatch = part.match(/^Fee:\s*([\d.,]+)\s*\w+$/)
      const fiatMatch = part.match(/^([A-Z]{3})\s*([\d.,]+)\s*@\s*([\d.]+)$/)
      if (feeMatch) {
        legacyFee = parseFloat(feeMatch[1].replace(/,/g, ''))
      } else if (fiatMatch) {
        legacyFiatCurrency = fiatMatch[1]
        legacyFiatAmount = parseFloat(fiatMatch[2].replace(/,/g, ''))
        legacyFiatRate = parseFloat(fiatMatch[3])
      } else if (part) {
        legacyRef = part
      }
    }
  }

  // Use admin overrides first, then DB columns, then legacy parsed values
  const displayFee = order.admin_fee ?? order.processing_fee ?? legacyFee
  const displayFiatCurrency = order.fiat_currency ?? legacyFiatCurrency
  const displayFiatAmount = order.admin_fiat_amount ?? order.fiat_amount ?? legacyFiatAmount
  const displayFiatRate = order.admin_rate ?? order.fiat_rate ?? legacyFiatRate
  const displayReference = cleanReference ?? legacyRef

  // Flags for when admin has overridden values
  const adminOverrideFee = order.admin_fee != null
  const adminOverrideRate = order.admin_rate != null
  const adminOverrideAmount = order.admin_fiat_amount != null

  async function handleSubmit() {
    setLoading(true); setError(null)
    try {
      const { submitOrder } = await import('@/lib/actions/orders')
      await submitOrder(privyToken, order.id)
      setStatus('OPENED')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally { setLoading(false) }
  }

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

  async function handleCancel() {
    if (!confirm('Cancel this order?')) return
    setLoading(true); setError(null)
    try {
      const { cancelOrder } = await import('@/lib/actions/orders')
      await cancelOrder(privyToken, order.id)
      setStatus('CANCELADO')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally { setLoading(false) }
  }

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

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildClipboardText())
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* ignore */ }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Link href={backHref} style={{ fontSize: 13, color: '#BAD6EB', textDecoration: 'none' }}>
        ← Back
      </Link>

      {error && (
        <div style={{ background: '#fee2e2', borderRadius: 8, padding: '12px 16px', color: '#991b1b', fontSize: 13 }}>{error}</div>
      )}

      {/* Step progress */}
      {!['RECHAZADO', 'CANCELADO'].includes(status) && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', gap: 0 }}>
            {STEPS.map((step, i) => {
              const done = i < currentStep
              const active = i === currentStep
              return (
                <div key={step.status} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                  {/* Connector line */}
                  {i > 0 && (
                    <div style={{
                      position: 'absolute', left: 0, top: 14, width: '50%', height: 2,
                      background: done || active ? '#334EAC' : 'rgba(186,214,235,0.15)',
                    }} />
                  )}
                  {i < STEPS.length - 1 && (
                    <div style={{
                      position: 'absolute', right: 0, top: 14, width: '50%', height: 2,
                      background: done ? '#334EAC' : 'rgba(186,214,235,0.15)',
                    }} />
                  )}
                  {/* Dot */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', zIndex: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? '#334EAC' : active ? '#BAD6EB' : 'rgba(186,214,235,0.1)',
                    border: `2px solid ${done || active ? '#334EAC' : 'rgba(186,214,235,0.2)'}`,
                    fontSize: 12, fontWeight: 700,
                    color: done ? 'white' : active ? '#081F5C' : 'rgba(186,214,235,0.3)',
                  }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <div style={{ marginTop: 8, textAlign: 'center' }}>
                    <p style={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? 'rgba(255,255,255,0.9)' : done ? '#BAD6EB' : 'rgba(186,214,235,0.3)' }}>
                      {step.label}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Header card ── */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                {order.type === 'PAY' ? 'Payment order' : 'Collection order'}
              </h2>
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', background: 'rgba(186,214,235,0.1)', color: 'rgba(186,214,235,0.7)', padding: '2px 8px', borderRadius: 6 }}>
                #{shortId}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.5)', marginTop: 4 }}>
              {order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}
              {order.due_date ? ` · Due ${new Date(order.due_date).toLocaleDateString()}` : ''}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>
        {order.rejection_reason && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f87171', marginBottom: 4 }}>Rejection reason</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{order.rejection_reason}</p>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
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
            {copied ? '✓ Copied!' : '📋 Copy details'}
          </button>
        </div>
      </div>

      {/* ── Section 1: Proveedor ── */}
      <div style={cardStyle}>
        <SectionLabel>Proveedor</SectionLabel>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 10 }}>{counterpartyName}</p>

        {/* Entity details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: paymentProfile ? 14 : 0 }}>
          {order.entity?.legal_name && <ProfileRow label="Legal name" value={order.entity.legal_name} />}
          {order.entity?.office_country && <ProfileRow label="Country" value={order.entity.office_country} />}
          {order.entity?.contact_email && <ProfileRow label="Email" value={order.entity.contact_email} />}
          {order.entity?.company_phone && <ProfileRow label="Phone" value={order.entity.company_phone} />}
          {order.entity?.contact_name && (
            <ProfileRow
              label="Contact"
              value={order.entity.contact_name + (order.entity.contact_phone ? ` · ${order.entity.contact_phone}` : '')}
            />
          )}
        </div>

        {/* Payment method */}
        {paymentProfile && (
          <>
            <div style={{ borderTop: '1px solid rgba(186,214,235,0.08)', paddingTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(186,214,235,0.4)' }}>Payment method</span>
                <span style={{ background: 'rgba(51,78,172,0.2)', color: '#BAD6EB', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>
                  {paymentProfile.method}
                </span>
                {paymentProfile.label && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{paymentProfile.label}</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {paymentProfile.method === 'BANK' && (
                  <>
                    {paymentProfile.details.bank_name && <ProfileRow label="Bank" value={paymentProfile.details.bank_name} />}
                    {paymentProfile.details.account_name && <ProfileRow label="Account holder" value={paymentProfile.details.account_name} />}
                    {paymentProfile.details.account_number && <ProfileRow label="Account / IBAN" value={paymentProfile.details.account_number} mono />}
                    {paymentProfile.details.routing_number && <ProfileRow label="SWIFT / Routing" value={paymentProfile.details.routing_number} mono />}
                    {paymentProfile.details.branch_code && <ProfileRow label="Branch code" value={paymentProfile.details.branch_code} mono />}
                    {paymentProfile.details.bank_code && <ProfileRow label="Bank code" value={paymentProfile.details.bank_code} mono />}
                    {paymentProfile.details.currency && <ProfileRow label="Currency" value={paymentProfile.details.currency} />}
                    {paymentProfile.details.country && <ProfileRow label="Country" value={paymentProfile.details.country} />}
                  </>
                )}
                {paymentProfile.method === 'CRYPTO' && (
                  <>
                    {paymentProfile.details.network && <ProfileRow label="Network" value={paymentProfile.details.network} />}
                    {paymentProfile.details.token && <ProfileRow label="Token" value={paymentProfile.details.token} />}
                    {paymentProfile.details.address && <ProfileRow label="Address" value={paymentProfile.details.address} mono />}
                  </>
                )}
                {paymentProfile.method === 'WECHAT' && paymentProfile.details.wechat_id && <ProfileRow label="WeChat ID" value={paymentProfile.details.wechat_id} />}
                {paymentProfile.method === 'PAYPAL' && paymentProfile.details.email && <ProfileRow label="PayPal email" value={paymentProfile.details.email} />}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Section 2: Detalles de la orden ── */}
      <div style={cardStyle}>
        <SectionLabel>Detalles de la orden</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: 'rgba(186,214,235,0.03)', borderRadius: 10, border: '1px solid rgba(186,214,235,0.08)', overflow: 'hidden' }}>
          <BRow label="Token">
            <span style={{ background: '#334EAC', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>{order.currency}</span>
          </BRow>
          <BRow label="Amount to supplier">
            <span style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
              {Number(order.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {order.currency}
            </span>
          </BRow>
          {displayFee != null && displayFee > 0 && (
            <BRow label={`Processing fee${adminOverrideFee ? ' ✦' : ''}`}>
              <span style={{ color: adminOverrideFee ? '#f59e0b' : undefined }}>
                {Number(displayFee).toLocaleString('en-US', { minimumFractionDigits: 2 })} {order.currency}
              </span>
            </BRow>
          )}
          {displayFee != null && displayFee > 0 && (
            <BRow label="Total to deposit" highlight>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#BAD6EB' }}>
                {(Number(order.amount) + Number(displayFee)).toLocaleString('en-US', { minimumFractionDigits: 2 })} {order.currency}
              </span>
            </BRow>
          )}
          {displayFiatCurrency && (
            <>
              <div style={{ padding: '6px 16px 2px', fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(186,214,235,0.3)', borderTop: '1px solid rgba(186,214,235,0.08)' }}>
                Fiat equivalent
              </div>
              {displayFiatRate != null && (
                <BRow label={`Exchange rate${adminOverrideRate ? ' ✦' : ''}`}>
                  <span style={{ color: adminOverrideRate ? '#f59e0b' : undefined }}>
                    1 USD = {Number(displayFiatRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {displayFiatCurrency}
                  </span>
                </BRow>
              )}
              {displayFiatAmount != null && (
                <BRow label={`Supplier receives${adminOverrideAmount ? ' ✦' : ''}`} green>
                  <span style={{ fontSize: 16, fontWeight: 800, color: adminOverrideAmount ? '#f59e0b' : '#10b981' }}>
                    {Number(displayFiatAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {displayFiatCurrency}
                  </span>
                </BRow>
              )}
            </>
          )}
        </div>
        {order.invoice_url && (
          <div style={{ marginTop: 14 }}>
            <a href={order.invoice_url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, color: '#BAD6EB', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              📄 View Invoice →
            </a>
          </div>
        )}
      </div>

      {/* ── Section 3: Pago a Convexo ── */}
      <div style={cardStyle}>
        <SectionLabel>Pago a Convexo</SectionLabel>

        {/* DRAFT / OPENED: pending states */}
        {status === 'DRAFT' && (
          <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.4)' }}>Submit the order first to get payment instructions.</p>
        )}
        {status === 'OPENED' && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'rgba(91,33,182,0.06)', borderRadius: 8, padding: '12px 14px' }}>
            <span style={{ fontSize: 18 }}>⏳</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Awaiting admin review</p>
              <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.5)', marginTop: 3 }}>
                You&apos;ll be notified once the order is accepted with payment instructions.
              </p>
            </div>
          </div>
        )}

        {/* ACCEPTED: interactive payment panel */}
        {status === 'ACCEPTED' && (
          <>
            <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.5)', marginBottom: 16 }}>
              Transfer the exact amount to the Convexo account below, then confirm your payment.
            </p>
            {!effectiveAccount ? (
              <p style={{ fontSize: 13, color: '#f59e0b' }}>No payment account assigned yet. Contact support.</p>
            ) : (
              <>
                {(() => {
                  const acct = effectiveAccount
                  const chainColor = acct.method === 'CRYPTO' ? (CHAIN_COLORS[acct.details.network] ?? '#888') : '#334EAC'
                  return (
                    <div style={{ border: `2px solid ${chainColor}`, borderRadius: 12, padding: 16, marginBottom: 16, background: chainColor + '10' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{acct.label ?? acct.method}</span>
                            {acct.method === 'CRYPTO' && acct.details.network && (
                              <span style={{ background: (CHAIN_COLORS[acct.details.network] ?? '#888') + '22', color: CHAIN_COLORS[acct.details.network] ?? '#888', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                                {acct.details.network}
                              </span>
                            )}
                            {acct.method === 'CRYPTO' && acct.details.token && <span style={{ fontSize: 12, color: 'rgba(186,214,235,0.5)' }}>{acct.details.token}</span>}
                          </div>
                          {acct.method === 'CRYPTO' && acct.details.address && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <code style={{ fontSize: 12, color: 'rgba(186,214,235,0.8)', wordBreak: 'break-all', flex: 1 }}>{acct.details.address}</code>
                              <button type="button" onClick={() => navigator.clipboard.writeText(acct.details.address)}
                                style={{ flexShrink: 0, background: 'rgba(186,214,235,0.1)', border: '1px solid rgba(186,214,235,0.2)', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: 'rgba(186,214,235,0.7)', cursor: 'pointer' }}>
                                Copy
                              </button>
                            </div>
                          )}
                          {acct.method === 'BANK' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {acct.details.bank_name && <AccountDetail label="Bank" value={acct.details.bank_name} />}
                              {acct.details.account_name && <AccountDetail label="Account holder" value={acct.details.account_name} />}
                              {acct.details.account_number && <AccountDetail label="Account / IBAN" value={acct.details.account_number} copy />}
                              {acct.details.routing_number && <AccountDetail label="SWIFT / Routing" value={acct.details.routing_number} copy />}
                              {acct.details.currency && <AccountDetail label="Currency" value={acct.details.currency} />}
                            </div>
                          )}
                          {acct.method === 'CASH' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {acct.details.place_name && <AccountDetail label="Location" value={acct.details.place_name} />}
                              {acct.details.address && <AccountDetail label="Address" value={acct.details.address} />}
                              {acct.details.instructions && <AccountDetail label="Instructions" value={acct.details.instructions} />}
                            </div>
                          )}
                        </div>
                        {acct.method === 'CRYPTO' && acct.details.address && (
                          <div style={{ background: 'white', borderRadius: 8, padding: 8, flexShrink: 0 }}>
                            <QRCode value={acct.details.address} size={100} />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
                {effectiveAccount.method === 'CRYPTO' && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Transaction Hash (TxID) <span style={{ color: '#ef4444' }}>*</span></label>
                    <input style={inputStyle} placeholder="Paste the transaction hash from your wallet..."
                      value={txnHash} onChange={(e) => setTxnHash(e.target.value)} />
                  </div>
                )}
                {effectiveAccount.method === 'BANK' && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Proof of Payment <span style={{ color: '#ef4444' }}>*</span></label>
                    <FileUpload label="Upload bank receipt or transfer confirmation (PDF, JPG, PNG)" accept=".pdf,.jpg,.jpeg,.png"
                      currentUrl={userProofUrl || undefined}
                      onUpload={async (file) => {
                        const { uploadUserProof } = await import('@/lib/actions/orders')
                        const url = await uploadUserProof(privyToken, file)
                        setUserProofUrl(url)
                        return url
                      }} />
                  </div>
                )}
                {(() => {
                  const canConfirm = effectiveAccount.method === 'CRYPTO' ? !!txnHash.trim() :
                    effectiveAccount.method === 'BANK' ? !!userProofUrl : true
                  return (
                    <button onClick={handleConfirmPayment} disabled={loading || !canConfirm}
                      style={{ ...primaryBtn, opacity: (!canConfirm || loading) ? 0.5 : 1, cursor: (!canConfirm || loading) ? 'not-allowed' : 'pointer' }}>
                      {loading ? 'Confirming...' : 'Confirm Payment →'}
                    </button>
                  )
                })()}
              </>
            )}
          </>
        )}

        {/* ORDERED / PROCESSING / PAYED: view submitted proof */}
        {['ORDERED', 'PROCESSING', 'PAYED'].includes(status) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 16 }}>✅</span>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>Payment confirmed by user</p>
            </div>
            {order.txn_hash && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(186,214,235,0.4)', marginBottom: 4 }}>Transaction ID</p>
                <code style={{ fontSize: 12, color: 'rgba(186,214,235,0.8)', wordBreak: 'break-all' }}>{order.txn_hash}</code>
              </div>
            )}
            {order.user_proof_url && (
              <a href={order.user_proof_url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 13, color: '#BAD6EB', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                📎 View payment proof →
              </a>
            )}
          </div>
        )}
      </div>

      {/* ── Section 4: Pago al Proveedor ── */}
      <div style={cardStyle}>
        <SectionLabel>Pago al Proveedor</SectionLabel>

        {/* DRAFT / OPENED / ACCEPTED: not yet processed */}
        {['DRAFT', 'OPENED', 'ACCEPTED'].includes(status) && (
          <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.4)' }}>
            Once Convexo processes your payment, the proof of transfer will appear here.
          </p>
        )}

        {/* ORDERED / PROCESSING: in progress */}
        {['ORDERED', 'PROCESSING'].includes(status) && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'rgba(91,33,182,0.06)', borderRadius: 8, padding: '12px 14px' }}>
            <span style={{ fontSize: 18 }}>⏳</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Processing payment to {counterpartyName}</p>
              <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.5)', marginTop: 3 }}>
                Convexo is verifying your transaction and processing the transfer. You&apos;ll be notified when complete.
              </p>
            </div>
          </div>
        )}

        {/* PAYED: show admin proof */}
        {status === 'PAYED' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 16 }}>✅</span>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>
                Payment to {counterpartyName} completed
              </p>
            </div>
            {order.proof_url ? (
              <a
                href={order.proof_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                style={{ fontSize: 13, color: '#BAD6EB', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                ↓ Download proof of payment
              </a>
            ) : (
              <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)' }}>Proof document not yet uploaded.</p>
            )}
          </div>
        )}

        {/* RECHAZADO / CANCELADO */}
        {['RECHAZADO', 'CANCELADO'].includes(status) && (
          <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.4)' }}>Order did not reach payment stage.</p>
        )}
      </div>

      {/* Status history */}
      {order.status_history && order.status_history.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 16 }}>Status History</h3>
          <OrderStatusHistory history={order.status_history} />
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(186,214,235,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>{value}</p>
    </div>
  )
}

function ProfileRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <span style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'right', wordBreak: 'break-all', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
    </div>
  )
}

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(186,214,235,0.4)', marginBottom: 14 }}>
      {children}
    </p>
  )
}

function BRow({ label, children, highlight, green }: { label: string; children: React.ReactNode; highlight?: boolean; green?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 16px', borderBottom: '1px solid rgba(186,214,235,0.05)',
      background: highlight ? 'rgba(51,78,172,0.08)' : green ? 'rgba(16,185,129,0.05)' : undefined,
    }}>
      <span style={{ fontSize: 13, color: 'rgba(186,214,235,0.55)' }}>{label}</span>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{children}</div>
    </div>
  )
}

const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(186,214,235,0.1)', padding: 24 }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(186,214,235,0.7)', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(186,214,235,0.2)', fontSize: 13, color: 'white', background: 'rgba(255,255,255,0.07)', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }
const primaryBtn: React.CSSProperties = { background: 'linear-gradient(135deg, #334EAC, #401777)', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const ghostBtn: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', color: 'rgba(186,214,235,0.8)', border: '1px solid rgba(186,214,235,0.2)', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer' }
const dangerBtn: React.CSSProperties = { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const breakdownRowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid rgba(186,214,235,0.05)' }
const breakdownLabelStyle: React.CSSProperties = { fontSize: 13, color: 'rgba(186,214,235,0.55)' }
const breakdownValueStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }
