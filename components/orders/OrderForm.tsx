'use client'
import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { FileUpload } from '@/components/ui/FileUpload'

type OrderType = 'PAY' | 'COLLECT'

interface Entity {
  id: string
  internal_name: string
}

interface PaymentProfile {
  id: string
  method: string
  label: string | null
}

interface OrderFormProps {
  type: OrderType
}

const STABLECOINS = ['USDC', 'USDT']
const FIAT_CURRENCIES = ['USD', 'EUR', 'CNY', 'COP']
const COLLECT_CURRENCIES = ['USDC', 'USDT', 'USD', 'EUR', 'GBP', 'CNY']

// Fiat currency display labels
const FIAT_LABELS: Record<string, string> = {
  USD: 'USD — US Dollar',
  EUR: 'EUR — Euro',
  CNY: 'CNY — Chinese Yuan',
  COP: 'COP — Colombian Peso',
}

export function OrderForm({ type }: OrderFormProps) {
  const { getAccessToken } = usePrivy()
  const router = useRouter()

  const [entities, setEntities] = useState<Entity[]>([])
  const [entityProfiles, setEntityProfiles] = useState<PaymentProfile[]>([])
  const [ownProfiles, setOwnProfiles] = useState<PaymentProfile[]>([])

  const [entityId, setEntityId] = useState('')
  const [paymentProfileId, setPaymentProfileId] = useState('')
  const [ownProfileId, setOwnProfileId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [reference, setReference] = useState('')

  // PAY-specific state
  const [invoiceUrl, setInvoiceUrl] = useState('')
  const [stablecoin, setStablecoin] = useState('USDC')
  const [payAmount, setPayAmount] = useState('')
  const [fiatCurrency, setFiatCurrency] = useState('USD')
  const [fiatRate, setFiatRate] = useState<number | null>(null)
  const [loadingRate, setLoadingRate] = useState(false)
  const [rateError, setRateError] = useState<string | null>(null)

  // COLLECT-specific state
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USDC')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculated PAY values
  const parsedPayAmount = parseFloat(payAmount) || 0
  const processingFee = parsedPayAmount * 0.01
  const fiatAmount = fiatRate != null ? parsedPayAmount * fiatRate : null

  useEffect(() => {
    async function load() {
      const token = await getAccessToken()
      if (!token) return
      if (type === 'PAY') {
        const { getSuppliers } = await import('@/lib/actions/entities')
        const { data } = await getSuppliers(token)
        setEntities(data ?? [])
      } else {
        const { getClients } = await import('@/lib/actions/entities')
        const { data } = await getClients(token)
        setEntities(data ?? [])
        try {
          const { getSessionUser } = await import('@/lib/actions/auth')
          const { getPaymentProfiles } = await import('@/lib/actions/payment-profiles')
          const user = await getSessionUser(token)
          if (user) {
            const ownP = await getPaymentProfiles(token, 'USER_OWN', user.id)
            setOwnProfiles(ownP ?? [])
          }
        } catch { /* continue */ }
      }
    }
    load()
  }, [type, getAccessToken])

  useEffect(() => {
    if (!entityId) { setEntityProfiles([]); return }
    async function loadProfiles() {
      const token = await getAccessToken()
      if (!token) return
      const { getPaymentProfiles } = await import('@/lib/actions/payment-profiles')
      const entityType = type === 'PAY' ? 'SUPPLIER' : 'CLIENT'
      const profiles = await getPaymentProfiles(token, entityType, entityId)
      setEntityProfiles(profiles ?? [])
    }
    loadProfiles()
  }, [entityId, type, getAccessToken])

  // Fetch exchange rate when fiat currency changes (PAY only)
  useEffect(() => {
    if (type !== 'PAY') return
    if (fiatCurrency === 'USD') {
      setFiatRate(1)
      setRateError(null)
      return
    }
    setLoadingRate(true)
    setRateError(null)
    fetch(`https://open.er-api.com/v6/latest/USD`)
      .then((r) => r.json())
      .then((data) => {
        const rate = data?.rates?.[fiatCurrency]
        if (rate) {
          setFiatRate(rate)
        } else {
          setRateError('Rate not available')
          setFiatRate(null)
        }
      })
      .catch(() => {
        setRateError('Failed to fetch rate')
        setFiatRate(null)
      })
      .finally(() => setLoadingRate(false))
  }, [fiatCurrency, type])

  async function handleSave(submit: boolean) {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')
      const { createOrder, submitOrder } = await import('@/lib/actions/orders')

      let orderData
      if (type === 'PAY') {
        orderData = {
          type,
          entity_id: entityId,
          payment_profile_id: paymentProfileId || undefined,
          amount: parsedPayAmount,
          currency: stablecoin,
          due_date: dueDate || undefined,
          reference: reference || undefined,
          invoice_url: invoiceUrl || undefined,
          processing_fee: processingFee > 0 ? processingFee : undefined,
          fiat_currency: fiatCurrency || undefined,
          fiat_amount: fiatAmount ?? undefined,
          fiat_rate: fiatRate ?? undefined,
        }
      } else {
        orderData = {
          type,
          entity_id: entityId,
          payment_profile_id: paymentProfileId || undefined,
          own_profile_id: ownProfileId || undefined,
          amount: parseFloat(amount),
          currency,
          due_date: dueDate || undefined,
          reference: reference || undefined,
        }
      }

      const order = await createOrder(token, orderData)
      if (submit) {
        await submitOrder(token, order.id)
      }
      router.push(type === 'PAY' ? '/pagar' : '/cobrar')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const canSubmitPay = !!entityId && parsedPayAmount > 0
  const canSubmitCollect = !!entityId && !!amount

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Entity selector */}
      <div>
        <label style={labelStyle}>{type === 'PAY' ? 'Supplier' : 'Client'}</label>
        <select
          style={inputStyle}
          value={entityId}
          onChange={(e) => { setEntityId(e.target.value); setPaymentProfileId('') }}
        >
          <option value="">Select {type === 'PAY' ? 'supplier' : 'client'}...</option>
          {entities.map((e) => (
            <option key={e.id} value={e.id}>{e.internal_name}</option>
          ))}
        </select>
      </div>

      {/* Payment method selector */}
      {entityId && (
        <div>
          <label style={labelStyle}>
            {type === 'PAY' ? 'Pay to (supplier payment method)' : 'Collect to (their receiving method)'}
          </label>
          <select style={inputStyle} value={paymentProfileId} onChange={(e) => setPaymentProfileId(e.target.value)}>
            <option value="">Select payment method...</option>
            {entityProfiles.map((p) => (
              <option key={p.id} value={p.id}>{p.label ?? p.method}</option>
            ))}
          </select>
          {entityProfiles.length === 0 && (
            <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>
              No payment methods set up for this entity yet.
            </p>
          )}
        </div>
      )}

      {/* ── PAY-specific fields ── */}
      {type === 'PAY' && (
        <>
          {/* Stablecoin selection */}
          <div>
            <label style={labelStyle}>Stablecoin to use</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {STABLECOINS.map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => setStablecoin(sc)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: 8,
                    border: '1px solid',
                    borderColor: stablecoin === sc ? '#334EAC' : 'rgba(186,214,235,0.2)',
                    background: stablecoin === sc ? '#334EAC' : 'rgba(255,255,255,0.07)',
                    color: stablecoin === sc ? 'white' : 'rgba(186,214,235,0.8)',
                    fontSize: 14,
                    fontWeight: stablecoin === sc ? 700 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {sc}
                </button>
              ))}
            </div>
          </div>

          {/* Amount to pay to provider */}
          <div>
            <label style={labelStyle}>Amount to pay to supplier</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inputStyle, paddingRight: 70 }}
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
              <span style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                fontSize: 13, fontWeight: 700, color: 'rgba(186,214,235,0.6)',
              }}>
                {stablecoin}
              </span>
            </div>
          </div>

          {/* Processing fee (1%) — read-only */}
          <div style={calcBoxStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'rgba(186,214,235,0.7)' }}>Processing fee (1%)</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>
                {processingFee > 0 ? `${processingFee.toFixed(2)} ${stablecoin}` : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(186,214,235,0.08)' }}>
              <span style={{ fontSize: 13, color: 'rgba(186,214,235,0.7)' }}>Total to process</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#BAD6EB' }}>
                {parsedPayAmount > 0 ? `${(parsedPayAmount + processingFee).toFixed(2)} ${stablecoin}` : '—'}
              </span>
            </div>
          </div>

          {/* Fiat currency to pay order */}
          <div>
            <label style={labelStyle}>Currency to pay order (fiat)</label>
            <select
              style={inputStyle}
              value={fiatCurrency}
              onChange={(e) => setFiatCurrency(e.target.value)}
            >
              {FIAT_CURRENCIES.map((fc) => (
                <option key={fc} value={fc}>{FIAT_LABELS[fc]}</option>
              ))}
            </select>
          </div>

          {/* Amount supplier receives */}
          <div style={calcBoxStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: 'rgba(186,214,235,0.7)' }}>
                Exchange rate (1 USD → {fiatCurrency})
              </span>
              {loadingRate ? (
                <span style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)' }}>Fetching...</span>
              ) : rateError ? (
                <span style={{ fontSize: 12, color: '#ef4444' }}>{rateError}</span>
              ) : (
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(186,214,235,0.8)' }}>
                  {fiatRate != null ? fiatRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '—'}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'rgba(186,214,235,0.7)' }}>Amount supplier receives</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>
                {fiatAmount != null && parsedPayAmount > 0
                  ? `${fiatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${fiatCurrency}`
                  : '—'}
              </span>
            </div>
          </div>
        </>
      )}

      {/* ── COLLECT-specific fields ── */}
      {type === 'COLLECT' && (
        <>
          <div>
            <label style={labelStyle}>Send funds to (your account)</label>
            <select style={inputStyle} value={ownProfileId} onChange={(e) => setOwnProfileId(e.target.value)}>
              <option value="">Select your account...</option>
              {ownProfiles.map((p) => (
                <option key={p.id} value={p.id}>{p.label ?? p.method}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Amount</label>
              <input
                style={inputStyle}
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <select style={inputStyle} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {COLLECT_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </>
      )}

      {/* Invoice / Receipt upload — PAY only */}
      {type === 'PAY' && (
        <div>
          <label style={labelStyle}>Invoice / Receipt</label>
          <FileUpload
            label="Upload invoice or receipt (PDF, JPG, PNG)"
            accept=".pdf,.jpg,.jpeg,.png"
            currentUrl={invoiceUrl}
            onUpload={async (file) => {
              const token = await getAccessToken()
              if (!token) throw new Error('Not authenticated')
              const { uploadInvoice } = await import('@/lib/actions/orders')
              const url = await uploadInvoice(token, file)
              setInvoiceUrl(url)
              return url
            }}
          />
        </div>
      )}

      {/* Shared fields */}
      <div>
        <label style={labelStyle}>Due date</label>
        <input style={inputStyle} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>

      <div>
        <label style={labelStyle}>Reference</label>
        <input style={inputStyle} placeholder="Invoice number, PO..." value={reference} onChange={(e) => setReference(e.target.value)} />
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => handleSave(false)}
          disabled={loading || (type === 'PAY' ? !canSubmitPay : !canSubmitCollect)}
          style={{ ...secondaryBtnStyle, flex: 1 }}
        >
          Save as Draft
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={loading || (type === 'PAY' ? !canSubmitPay : !canSubmitCollect)}
          style={{ ...primaryBtnStyle, flex: 1 }}
        >
          {loading ? 'Submitting...' : 'Submit Order'}
        </button>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(186,214,235,0.7)', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(186,214,235,0.2)', fontSize: 14, color: 'white', background: 'rgba(255,255,255,0.07)', outline: 'none', boxSizing: 'border-box' }
const calcBoxStyle: React.CSSProperties = { background: 'rgba(186,214,235,0.06)', borderRadius: 10, border: '1px solid rgba(186,214,235,0.12)', padding: '14px 16px' }
const primaryBtnStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #334EAC, #401777)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const secondaryBtnStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.08)', color: 'rgba(186,214,235,0.8)', border: '1px solid rgba(186,214,235,0.2)', borderRadius: 8, padding: '10px 20px', fontSize: 14, cursor: 'pointer' }
