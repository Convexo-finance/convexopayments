'use client'
import { useState } from 'react'
import Link from 'next/link'
import QRCode from 'react-qr-code'
import { StatusBadge } from '@/components/ui/StatusBadge'
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

interface Order {
  id: string
  type: string
  status: string
  amount: number
  currency: string
  reference: string | null
  invoice_url: string | null
  proof_url: string | null
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

interface OrderDetailClientProps {
  order: Order
  privyToken: string
  backHref: string
  convexoAccounts?: ConvexoAccount[]
}

const CANCELLABLE = ['DRAFT', 'OPENED']

const CHAIN_COLORS: Record<string, string> = {
  Ethereum: '#627eea',
  Solana:   '#9945ff',
  Tron:     '#ef0027',
}

// Steps visible to user
const STEPS = [
  { status: 'DRAFT',   label: 'Draft',    desc: 'Order is being prepared' },
  { status: 'OPENED',  label: 'Opened',   desc: 'Ready for payment' },
  { status: 'ORDERED', label: 'Ordered',  desc: 'Payment submitted' },
  { status: 'PAYED',   label: 'Payed',    desc: 'Payment confirmed' },
]

function getStepIndex(status: string) {
  const map: Record<string, number> = {
    DRAFT: 0, OPENED: 1, ORDERED: 2,
    EN_REVISION: 2, PROCESANDO: 2, PAYED: 3,
  }
  return map[status] ?? 0
}

export function OrderDetailClient({ order, privyToken, backHref, convexoAccounts = [] }: OrderDetailClientProps) {
  const [status, setStatus] = useState(order.status)
  const [txnHash, setTxnHash] = useState(order.txn_hash ?? '')
  const [selectedAccount, setSelectedAccount] = useState<string>(convexoAccounts[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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

  // Use DB columns if present, fall back to legacy parsed values
  const displayFee = order.processing_fee ?? legacyFee
  const displayFiatCurrency = order.fiat_currency ?? legacyFiatCurrency
  const displayFiatAmount = order.fiat_amount ?? legacyFiatAmount
  const displayFiatRate = order.fiat_rate ?? legacyFiatRate
  const displayReference = cleanReference ?? legacyRef

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
    if (!txnHash.trim()) { setError('Please enter the transaction hash.'); return }
    setLoading(true); setError(null)
    try {
      const { confirmPayment } = await import('@/lib/actions/orders')
      await confirmPayment(privyToken, order.id, txnHash, selectedAccount || undefined)
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
    const lines = [
      `Convexo Payment Order`,
      `─────────────────────`,
      `Order ID  : #${shortId}`,
      ...(displayReference ? [`Reference : ${displayReference}`] : []),
      `Amount    : ${order.currency} ${Number(order.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      `To        : ${counterpartyName}`,
      `Date      : ${order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}`,
    ]
    if (selectedAccount) {
      const acct = convexoAccounts.find((a) => a.id === selectedAccount)
      if (acct) {
        lines.push(``, `Pay to (Convexo)`)
        lines.push(`Network   : ${acct.details.network ?? '—'}`)
        lines.push(`Token     : ${acct.details.token ?? '—'}`)
        lines.push(`Address   : ${acct.details.address ?? '—'}`)
      }
    }
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

      {/* Main info */}
      <div style={cardStyle}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
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

        {/* Order meta: supplier/client + reference */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px 24px', marginBottom: 20 }}>
          <Field label={order.type === 'PAY' ? 'Supplier' : 'Client'} value={counterpartyName} />
          {displayReference && <Field label="Reference / PO" value={displayReference} />}
        </div>

        {/* Payment breakdown — PAY orders only */}
        {order.type === 'PAY' && (
          <div style={{ background: 'rgba(186,214,235,0.04)', border: '1px solid rgba(186,214,235,0.1)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(186,214,235,0.08)', fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(186,214,235,0.4)' }}>
              Payment breakdown
            </div>

            {/* Token + amount row */}
            <div style={breakdownRowStyle}>
              <span style={breakdownLabelStyle}>Payment token</span>
              <span style={{ ...breakdownValueStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ background: '#334EAC', color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>
                  {order.currency}
                </span>
              </span>
            </div>

            <div style={breakdownRowStyle}>
              <span style={breakdownLabelStyle}>Amount to supplier</span>
              <span style={{ ...breakdownValueStyle, fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
                {Number(order.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {order.currency}
              </span>
            </div>

            {displayFee != null && displayFee > 0 && (
              <div style={breakdownRowStyle}>
                <span style={breakdownLabelStyle}>Processing fee (1%)</span>
                <span style={breakdownValueStyle}>
                  {Number(displayFee).toLocaleString('en-US', { minimumFractionDigits: 2 })} {order.currency}
                </span>
              </div>
            )}

            {displayFee != null && displayFee > 0 && (
              <div style={{ ...breakdownRowStyle, borderTop: '1px solid rgba(186,214,235,0.1)', background: 'rgba(186,214,235,0.04)' }}>
                <span style={{ ...breakdownLabelStyle, fontWeight: 700, color: 'rgba(186,214,235,0.7)' }}>Total to deposit</span>
                <span style={{ ...breakdownValueStyle, fontSize: 15, fontWeight: 800, color: '#BAD6EB' }}>
                  {(Number(order.amount) + Number(displayFee)).toLocaleString('en-US', { minimumFractionDigits: 2 })} {order.currency}
                </span>
              </div>
            )}

            {/* Fiat equivalent section */}
            {displayFiatCurrency && (
              <>
                <div style={{ padding: '8px 16px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(186,214,235,0.3)', borderTop: '1px solid rgba(186,214,235,0.08)', marginTop: 4 }}>
                  Fiat equivalent
                </div>

                <div style={breakdownRowStyle}>
                  <span style={breakdownLabelStyle}>Payment currency</span>
                  <span style={{ ...breakdownValueStyle, fontWeight: 700 }}>{displayFiatCurrency}</span>
                </div>

                {displayFiatRate != null && (
                  <div style={breakdownRowStyle}>
                    <span style={breakdownLabelStyle}>Exchange rate</span>
                    <span style={breakdownValueStyle}>
                      1 USD = {Number(displayFiatRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {displayFiatCurrency}
                    </span>
                  </div>
                )}

                {displayFiatAmount != null && (
                  <div style={{ ...breakdownRowStyle, background: 'rgba(16,185,129,0.05)' }}>
                    <span style={{ ...breakdownLabelStyle, color: 'rgba(16,185,129,0.8)' }}>Supplier receives</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>
                      {Number(displayFiatAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {displayFiatCurrency}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* COLLECT order amount */}
        {order.type === 'COLLECT' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px 24px', marginBottom: 20 }}>
            <Field label="Amount" value={`${Number(order.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${order.currency}`} />
          </div>
        )}

        {order.rejection_reason && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f87171', marginBottom: 4 }}>Rejection reason</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{order.rejection_reason}</p>
          </div>
        )}

        {/* Documents row */}
        {(order.invoice_url || order.proof_url || order.txn_hash) && (
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {order.invoice_url && (
              <a href={order.invoice_url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 13, color: '#BAD6EB', textDecoration: 'none', fontWeight: 500 }}>
                📄 View Invoice →
              </a>
            )}
            {order.txn_hash && (
              <span style={{ fontSize: 12, color: 'rgba(186,214,235,0.6)', fontFamily: 'monospace' }}>
                TxID: {order.txn_hash}
              </span>
            )}
            {order.proof_url && (
              <a href={order.proof_url} target="_blank" rel="noopener noreferrer" download
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, padding: '6px 14px', fontSize: 13, color: '#10b981', fontWeight: 600, textDecoration: 'none' }}>
                ↓ Download Proof of Payment
              </a>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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
        </div>
      </div>

      {/* ── Step 2: Payment ── */}
      {status === 'OPENED' && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 4 }}>
            Step 2 — Send Your Payment
          </h3>
          <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.5)', marginBottom: 20 }}>
            Transfer the exact amount to one of the Convexo accounts below, then enter your transaction hash to confirm.
          </p>

          {/* Convexo accounts */}
          {convexoAccounts.length === 0 ? (
            <p style={{ fontSize: 13, color: '#f59e0b' }}>No Convexo payment accounts configured yet. Contact support.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {convexoAccounts.map((acct) => {
                const isSel = selectedAccount === acct.id
                const chainColor = CHAIN_COLORS[acct.details.network] ?? '#888'
                return (
                  <div
                    key={acct.id}
                    onClick={() => setSelectedAccount(acct.id)}
                    style={{
                      border: `2px solid ${isSel ? chainColor : 'rgba(186,214,235,0.15)'}`,
                      borderRadius: 12, padding: 16, cursor: 'pointer',
                      background: isSel ? chainColor + '10' : 'rgba(255,255,255,0.03)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                            {acct.label ?? acct.method}
                          </span>
                          {acct.details.network && (
                            <span style={{ background: chainColor + '22', color: chainColor, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                              {acct.details.network}
                            </span>
                          )}
                          {acct.details.token && (
                            <span style={{ fontSize: 12, color: 'rgba(186,214,235,0.5)' }}>{acct.details.token}</span>
                          )}
                        </div>

                        {acct.details.address && (
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
                      </div>

                      {/* QR */}
                      {acct.details.address && (
                        <div style={{ background: 'white', borderRadius: 8, padding: 8, flexShrink: 0 }}>
                          <QRCode value={acct.details.address} size={100} />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Transaction hash input */}
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

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={handleConfirmPayment}
              disabled={loading || !txnHash.trim()}
              style={{ ...primaryBtn, opacity: (!txnHash.trim() || loading) ? 0.5 : 1, cursor: (!txnHash.trim() || loading) ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Confirming...' : 'Confirm Payment →'}
            </button>
            <button onClick={handleCopy} style={ghostBtn}>
              {copied ? '✓ Copied!' : '📋 Copy Order Details'}
            </button>
          </div>
        </div>
      )}

      {/* ORDERED confirmation */}
      {status === 'ORDERED' && (
        <div style={{ ...cardStyle, borderColor: 'rgba(109,40,217,0.3)', background: 'rgba(109,40,217,0.05)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 22 }}>⏳</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Payment received — Convexo is processing your order</p>
              <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.5)', marginTop: 4 }}>
                We're verifying your transaction and will process the payment to {counterpartyName} shortly.
              </p>
              {order.txn_hash && (
                <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'rgba(186,214,235,0.5)', marginTop: 8 }}>
                  TxID: {order.txn_hash}
                </p>
              )}
              <button onClick={handleCopy} style={{ ...ghostBtn, marginTop: 12 }}>
                {copied ? '✓ Copied!' : '📋 Copy Order Details'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYED */}
      {status === 'PAYED' && order.proof_url && (
        <div style={{ ...cardStyle, borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 22 }}>✅</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>Payment completed</p>
              <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.5)', marginTop: 2 }}>
                Convexo has successfully processed your payment to {counterpartyName}.
              </p>
            </div>
            <a
              href={order.proof_url}
              target="_blank"
              rel="noopener noreferrer"
              download
              style={{ ...primaryBtn, textDecoration: 'none', background: '#10b981', flexShrink: 0 }}
            >
              ↓ Download Proof
            </a>
          </div>
        </div>
      )}

      {/* REJECTED / CANCELLED */}
      {status === 'RECHAZADO' && (
        <div style={{ ...cardStyle, borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>Order rejected</p>
          {order.rejection_reason && <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.5)', marginTop: 4 }}>Reason: {order.rejection_reason}</p>}
        </div>
      )}

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

const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(186,214,235,0.1)', padding: 24 }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(186,214,235,0.7)', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(186,214,235,0.2)', fontSize: 13, color: 'white', background: 'rgba(255,255,255,0.07)', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }
const primaryBtn: React.CSSProperties = { background: 'linear-gradient(135deg, #334EAC, #401777)', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const ghostBtn: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', color: 'rgba(186,214,235,0.8)', border: '1px solid rgba(186,214,235,0.2)', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer' }
const dangerBtn: React.CSSProperties = { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const breakdownRowStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid rgba(186,214,235,0.05)' }
const breakdownLabelStyle: React.CSSProperties = { fontSize: 13, color: 'rgba(186,214,235,0.55)' }
const breakdownValueStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }
