'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ConvexoAccount {
  id: string
  method: string
  label: string | null
  directions: string[]
}

interface AdminAcceptFormProps {
  orderId: string
  privyToken: string
  orderAmount?: number | null
  defaultFee?: number | null
  defaultRate?: number | null
  defaultFiatAmount?: number | null
  defaultConvexoAccountId?: string | null
  currency: string
  fiatCurrency?: string | null
}

export function AdminAcceptForm({
  orderId,
  privyToken,
  orderAmount,
  defaultFee,
  defaultRate,
  defaultFiatAmount,
  defaultConvexoAccountId,
  currency,
  fiatCurrency,
}: AdminAcceptFormProps) {
  const router = useRouter()
  const [accounts, setAccounts] = useState<ConvexoAccount[]>([])

  // Derive initial % from defaultFee / orderAmount, fallback to 1%
  const initialPercent = defaultFee != null && orderAmount
    ? String(Number(((defaultFee / orderAmount) * 100).toFixed(4)))
    : '1'
  const [feePercent, setFeePercent] = useState(initialPercent)
  const [rate, setRate] = useState(defaultRate != null ? String(defaultRate) : '')
  const [accountId, setAccountId] = useState(defaultConvexoAccountId ?? '')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedFeePercent = parseFloat(feePercent) || 0
  const computedFee = orderAmount ? orderAmount * (parsedFeePercent / 100) : null
  const parsedRate = parseFloat(rate) || 0
  const computedFiatAmount = orderAmount && parsedRate > 0 ? orderAmount * parsedRate : null

  useEffect(() => {
    async function load() {
      try {
        const { adminGetConvexoAccounts } = await import('@/lib/actions/convexo-accounts')
        const data = await adminGetConvexoAccounts(privyToken)
        const paymentAccts = (data ?? []).filter(
          (a) => a.is_active && (a.directions.includes('PAYMENTS') || a.directions.includes('ALL'))
        )
        setAccounts(paymentAccts as ConvexoAccount[])
      } catch { /* ignore */ }
    }
    load()
  }, [privyToken])

  async function handleAccept() {
    setLoading(true); setError(null)
    try {
      const { adminAcceptOrder } = await import('@/lib/actions/admin')
      await adminAcceptOrder(privyToken, orderId, {
        adminFee: computedFee != null ? computedFee : undefined,
        adminRate: rate ? parseFloat(rate) : undefined,
        adminFiatAmount: computedFiatAmount ?? undefined,
        adminConvexoAccountId: accountId || undefined,
        notes: notes.trim() || undefined,
      })
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.5)', marginBottom: 2 }}>
        Revisa y ajusta los valores antes de aceptar. Los campos vacíos usarán los valores originales del usuario.
      </p>

      {/* Fee */}
      <div>
        <label style={labelStyle}>
          Comisión <span style={{ color: 'rgba(186,214,235,0.4)', fontWeight: 400 }}>— ajustar porcentaje</span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', width: 100 }}>
            <input
              style={{ ...inputStyle, paddingRight: 24, textAlign: 'right' }}
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={feePercent}
              onChange={(e) => setFeePercent(e.target.value)}
            />
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'rgba(186,214,235,0.5)', pointerEvents: 'none' }}>%</span>
          </div>
          <span style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)' }}>=</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>
            {computedFee != null ? `${computedFee.toFixed(2)} ${currency}` : '—'}
          </span>
        </div>
      </div>

      {/* Exchange rate + calculated fiat amount */}
      {fiatCurrency && fiatCurrency !== 'USD' && (
        <>
          <div>
            <label style={labelStyle}>
              Tasa de cambio (1 USD → {fiatCurrency}) <span style={{ color: 'rgba(186,214,235,0.4)', fontWeight: 400 }}>— editable</span>
            </label>
            <input
              style={inputStyle}
              type="number"
              step="0.0001"
              min="0"
              placeholder="Ej. 4200.00"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </div>

          <div>
            <label style={labelStyle}>Monto {fiatCurrency} a recibir (calculado)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(186,214,235,0.1)', background: 'rgba(255,255,255,0.03)' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: computedFiatAmount != null ? '#BAD6EB' : 'rgba(186,214,235,0.3)' }}>
                {computedFiatAmount != null
                  ? `${computedFiatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${fiatCurrency}`
                  : `Ingresa la tasa para calcular`}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Convexo account */}
      <div>
        <label style={labelStyle}>Cuenta Convexo para recibir pago</label>
        <select
          style={inputStyle}
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
        >
          <option value="">Mantener la elegida por el usuario</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.method}{a.label ? ` — ${a.label}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label style={labelStyle}>Notas internas (opcional)</label>
        <textarea
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' as const }}
          placeholder="Notas visibles solo para administradores..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: 12 }}>{error}</p>}

      <button
        onClick={handleAccept}
        disabled={loading}
        style={{ ...primaryBtn, opacity: loading ? 0.6 : 1, cursor: loading ? 'wait' : 'pointer' }}
      >
        {loading ? 'Procesando...' : '✓ Aceptar Orden'}
      </button>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(186,214,235,0.7)', marginBottom: 4 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(186,214,235,0.2)', fontSize: 13, color: 'white', background: 'rgba(255,255,255,0.07)', outline: 'none', boxSizing: 'border-box' }
const primaryBtn: React.CSSProperties = { background: 'linear-gradient(135deg, #334EAC, #401777)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%' }
