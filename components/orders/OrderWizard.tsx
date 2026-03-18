'use client'
import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { FileUpload } from '@/components/ui/FileUpload'
import QRCode from 'react-qr-code'

interface Entity {
  id: string
  internal_name: string
}

interface PaymentProfile {
  id: string
  method: string
  label: string | null
}

interface ConvexoAccount {
  id: string
  method: string
  label: string | null
  directions: string[]
  details: Record<string, string>
}

const STABLECOINS = ['USDC', 'USDT']
const FIAT_CURRENCIES = ['USD', 'EUR', 'CNY', 'COP', 'GBP']
const FIAT_LABELS: Record<string, string> = {
  USD: 'USD — US Dollar',
  EUR: 'EUR — Euro',
  CNY: 'CNY — Chinese Yuan',
  COP: 'COP — Colombian Peso',
  GBP: 'GBP — British Pound',
}
const CHAIN_COLORS: Record<string, string> = {
  Ethereum: '#627eea',
  Solana:   '#9945ff',
  Tron:     '#ef0027',
}

const STEP_LABELS = ['Proveedor', 'Detalles', 'Método de pago']

export function OrderWizard({ type = 'PAY' }: { type?: string }) {
  const { getAccessToken } = usePrivy()
  const router = useRouter()

  const [step, setStep] = useState(1)

  // Step 1 state
  const [entities, setEntities] = useState<Entity[]>([])
  const [entityId, setEntityId] = useState('')
  const [entityProfiles, setEntityProfiles] = useState<PaymentProfile[]>([])
  const [paymentProfileId, setPaymentProfileId] = useState('')

  // Step 2 state
  const [stablecoin, setStablecoin] = useState('USDC')
  const [payAmount, setPayAmount] = useState('')
  const [fiatCurrency, setFiatCurrency] = useState('USD')
  const [fiatRate, setFiatRate] = useState<number | null>(null)
  const [loadingRate, setLoadingRate] = useState(false)
  const [rateError, setRateError] = useState<string | null>(null)
  const FEE_PERCENT = 1  // Fixed default — admin can adjust at review time
  const [invoiceUrl, setInvoiceUrl] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [reference, setReference] = useState('')

  // Step 3 state
  const [convexoAccounts, setConvexoAccounts] = useState<ConvexoAccount[]>([])
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [selectedAccount, setSelectedAccount] = useState<string>('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Calculated values
  const parsedAmount = parseFloat(payAmount) || 0
  const processingFee = parsedAmount * (FEE_PERCENT / 100)
  const fiatAmount = fiatRate != null ? parsedAmount * fiatRate : null

  // Load suppliers on mount
  useEffect(() => {
    async function load() {
      const token = await getAccessToken()
      if (!token) return
      const { getSuppliers } = await import('@/lib/actions/entities')
      const { data } = await getSuppliers(token)
      setEntities(data ?? [])
    }
    load()
  }, [getAccessToken])

  // Load supplier payment profiles when entity changes
  useEffect(() => {
    if (!entityId) { setEntityProfiles([]); setPaymentProfileId(''); return }
    async function load() {
      const token = await getAccessToken()
      if (!token) return
      const { getPaymentProfiles } = await import('@/lib/actions/payment-profiles')
      const profiles = await getPaymentProfiles(token, 'SUPPLIER', entityId)
      setEntityProfiles(profiles ?? [])
      setPaymentProfileId('')
    }
    load()
  }, [entityId, getAccessToken])

  // Fetch exchange rate
  useEffect(() => {
    if (fiatCurrency === 'USD') { setFiatRate(1); setRateError(null); return }
    setLoadingRate(true); setRateError(null)
    fetch('https://open.er-api.com/v6/latest/USD')
      .then((r) => r.json())
      .then((data) => {
        const rate = data?.rates?.[fiatCurrency]
        if (rate) { setFiatRate(rate) } else { setRateError('Rate not available'); setFiatRate(null) }
      })
      .catch(() => { setRateError('Failed to fetch rate'); setFiatRate(null) })
      .finally(() => setLoadingRate(false))
  }, [fiatCurrency])

  // Load convexo accounts for step 3
  useEffect(() => {
    if (step !== 3) return
    async function load() {
      const token = await getAccessToken()
      if (!token) return
      const { getConvexoAccounts } = await import('@/lib/actions/convexo-accounts')
      const data = await getConvexoAccounts(token)
      const payAccts = ((data ?? []) as ConvexoAccount[]).filter(
        (a) => a.directions.includes('PAYMENTS') || a.directions.includes('ALL')
      )
      setConvexoAccounts(payAccts)
      if (payAccts.length > 0 && !selectedMethod) {
        const firstMethod = payAccts[0].method
        setSelectedMethod(firstMethod)
        setSelectedAccount(payAccts.find(a => a.method === firstMethod)?.id ?? '')
      }
    }
    load()
  }, [step, getAccessToken, selectedMethod])

  const availableMethods = Array.from(new Set(convexoAccounts.map(a => a.method)))

  function selectMethod(method: string) {
    setSelectedMethod(method)
    setSelectedAccount(convexoAccounts.find(a => a.method === method)?.id ?? '')
  }

  const canGoStep2 = !!entityId
  const canGoStep3 = parsedAmount > 0
  const canSubmit = !!selectedAccount

  async function handleSave(submit: boolean) {
    setLoading(true); setError(null)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')
      const { createOrder, submitOrder } = await import('@/lib/actions/orders')

      const order = await createOrder(token, {
        type: 'PAY',
        entity_id: entityId,
        payment_profile_id: paymentProfileId || undefined,
        amount: parsedAmount,
        currency: stablecoin,
        processing_fee: processingFee > 0 ? processingFee : undefined,
        fiat_currency: fiatCurrency || undefined,
        fiat_amount: fiatAmount ?? undefined,
        fiat_rate: fiatRate ?? undefined,
        invoice_url: invoiceUrl || undefined,
        due_date: dueDate || undefined,
        reference: reference || undefined,
        convexo_account_id: selectedAccount || undefined,
      })

      if (submit) {
        await submitOrder(token, order.id)
      }
      router.push('/pagar')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Stepper */}
      <div style={{ display: 'flex', gap: 0 }}>
        {STEP_LABELS.map((label, i) => {
          const num = i + 1
          const done = num < step
          const active = num === step
          return (
            <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {i > 0 && (
                <div style={{ position: 'absolute', left: 0, top: 13, width: '50%', height: 2, background: done || active ? '#334EAC' : 'rgba(186,214,235,0.15)' }} />
              )}
              {i < STEP_LABELS.length - 1 && (
                <div style={{ position: 'absolute', right: 0, top: 13, width: '50%', height: 2, background: done ? '#334EAC' : 'rgba(186,214,235,0.15)' }} />
              )}
              <div style={{
                width: 26, height: 26, borderRadius: '50%', zIndex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#334EAC' : active ? '#BAD6EB' : 'rgba(186,214,235,0.08)',
                border: `2px solid ${done || active ? '#334EAC' : 'rgba(186,214,235,0.2)'}`,
                fontSize: 11, fontWeight: 700,
                color: done ? 'white' : active ? '#02001A' : 'rgba(186,214,235,0.3)',
              }}>
                {done ? '✓' : num}
              </div>
              <p style={{ fontSize: 10, marginTop: 6, textAlign: 'center', fontWeight: active ? 700 : 400, color: active ? '#BAD6EB' : done ? '#334EAC' : 'rgba(186,214,235,0.4)' }}>
                {label}
              </p>
            </div>
          )
        })}
      </div>

      {/* Card */}
      <div style={cardStyle}>

        {/* ── Step 1: Supplier & Payment Method ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={stepTitleStyle}>Proveedor y Método de Pago</h2>
              <p style={stepDescStyle}>Selecciona el proveedor al que Convexo le pagará.</p>
            </div>

            <div>
              <label style={labelStyle}>Proveedor <span style={{ color: '#ef4444' }}>*</span></label>
              <select
                style={inputStyle}
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
              >
                <option value="">Selecciona un proveedor...</option>
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>{e.internal_name}</option>
                ))}
              </select>
            </div>

            {entityId && (
              <div>
                <label style={labelStyle}>Método de pago del proveedor</label>
                <select
                  style={inputStyle}
                  value={paymentProfileId}
                  onChange={(e) => setPaymentProfileId(e.target.value)}
                >
                  <option value="">Selecciona método de pago...</option>
                  {entityProfiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.label ?? p.method}</option>
                  ))}
                </select>
                {entityProfiles.length === 0 && (
                  <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>
                    Este proveedor no tiene métodos de pago configurados.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Order Details ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={stepTitleStyle}>Detalles del Pedido</h2>
              <p style={stepDescStyle}>Ingresa el monto y la información del pago.</p>
            </div>

            {/* Stablecoin */}
            <div>
              <label style={labelStyle}>Stablecoin</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {STABLECOINS.map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => setStablecoin(sc)}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid',
                      borderColor: stablecoin === sc ? '#334EAC' : 'rgba(186,214,235,0.2)',
                      background: stablecoin === sc ? '#334EAC' : 'rgba(255,255,255,0.07)',
                      color: stablecoin === sc ? 'white' : 'rgba(186,214,235,0.8)',
                      fontSize: 14, fontWeight: stablecoin === sc ? 700 : 400, cursor: 'pointer',
                    }}
                  >
                    {sc}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label style={labelStyle}>Monto a pagar al proveedor <span style={{ color: '#ef4444' }}>*</span></label>
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
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: 'rgba(186,214,235,0.6)' }}>
                  {stablecoin}
                </span>
              </div>
            </div>

            {/* Fee summary */}
            <div style={calcBoxStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 13, color: 'rgba(186,214,235,0.7)' }}>Comisión de procesamiento</span>
                  <span style={{ fontSize: 11, color: 'rgba(186,214,235,0.35)', marginLeft: 8 }}>({FEE_PERCENT}% · el admin puede ajustar)</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                  {processingFee > 0 ? `${processingFee.toFixed(2)} ${stablecoin}` : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(186,214,235,0.08)' }}>
                <span style={{ fontSize: 13, color: 'rgba(186,214,235,0.7)' }}>Total a depositar</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#BAD6EB' }}>
                  {parsedAmount > 0 ? `${(parsedAmount + processingFee).toFixed(2)} ${stablecoin}` : '—'}
                </span>
              </div>
            </div>

            {/* Fiat currency */}
            <div>
              <label style={labelStyle}>Moneda de pago (fiat)</label>
              <select style={inputStyle} value={fiatCurrency} onChange={(e) => setFiatCurrency(e.target.value)}>
                {FIAT_CURRENCIES.map((fc) => (
                  <option key={fc} value={fc}>{FIAT_LABELS[fc] ?? fc}</option>
                ))}
              </select>
            </div>

            {/* Fiat rate + amount */}
            <div style={calcBoxStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'rgba(186,214,235,0.7)' }}>
                  Tasa de cambio (1 USD → {fiatCurrency})
                </span>
                {loadingRate ? (
                  <span style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)' }}>Cargando...</span>
                ) : rateError ? (
                  <span style={{ fontSize: 12, color: '#ef4444' }}>{rateError}</span>
                ) : (
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(186,214,235,0.8)' }}>
                    {fiatRate != null ? fiatRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '—'}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'rgba(186,214,235,0.7)' }}>Proveedor recibe</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>
                  {fiatAmount != null && parsedAmount > 0
                    ? `${fiatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${fiatCurrency}`
                    : '—'}
                </span>
              </div>
            </div>

            {/* Invoice upload */}
            <div>
              <label style={labelStyle}>Factura / Comprobante (opcional)</label>
              <FileUpload
                label="Subir factura o comprobante (PDF, JPG, PNG)"
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

            {/* Due date + reference */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Fecha de vencimiento</label>
                <input style={inputStyle} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Referencia / PO</label>
                <input style={inputStyle} placeholder="Nº de factura, PO..." value={reference} onChange={(e) => setReference(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Payment Method ── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={stepTitleStyle}>¿Cómo pagarás a Convexo?</h2>
              <p style={stepDescStyle}>Selecciona el método con el que transferirás los fondos a Convexo.</p>
            </div>

            {convexoAccounts.length === 0 ? (
              <p style={{ fontSize: 13, color: '#f59e0b' }}>No hay cuentas Convexo disponibles. Contacta a soporte.</p>
            ) : (
              <>
                {/* Method tabs */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {availableMethods.map((method) => {
                    const isActive = selectedMethod === method
                    const methodLabel: Record<string, string> = { CRYPTO: '🔗 Crypto', BANK: '🏦 Transferencia', CASH: '💵 Efectivo' }
                    return (
                      <button
                        key={method}
                        onClick={() => selectMethod(method)}
                        style={{
                          padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          border: isActive ? '2px solid #334EAC' : '2px solid rgba(186,214,235,0.15)',
                          background: isActive ? 'rgba(51,78,172,0.2)' : 'rgba(255,255,255,0.03)',
                          color: isActive ? '#BAD6EB' : 'rgba(186,214,235,0.5)',
                        }}
                      >
                        {methodLabel[method] ?? method}
                      </button>
                    )
                  })}
                </div>

                {/* Account cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {convexoAccounts.filter(a => a.method === selectedMethod).map((acct) => {
                    const isSel = selectedAccount === acct.id
                    const chainColor = acct.method === 'CRYPTO' ? (CHAIN_COLORS[acct.details.network] ?? '#888') : '#334EAC'
                    return (
                      <div
                        key={acct.id}
                        onClick={() => setSelectedAccount(acct.id)}
                        style={{
                          border: `2px solid ${isSel ? chainColor : 'rgba(186,214,235,0.15)'}`,
                          borderRadius: 12, padding: 16, cursor: 'pointer',
                          background: isSel ? chainColor + '10' : 'rgba(255,255,255,0.03)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                                {acct.label ?? acct.method}
                              </span>
                              {acct.method === 'CRYPTO' && acct.details.network && (
                                <span style={{ background: (CHAIN_COLORS[acct.details.network] ?? '#888') + '22', color: CHAIN_COLORS[acct.details.network] ?? '#888', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                                  {acct.details.network}
                                </span>
                              )}
                              {acct.method === 'CRYPTO' && acct.details.token && (
                                <span style={{ fontSize: 12, color: 'rgba(186,214,235,0.5)' }}>{acct.details.token}</span>
                              )}
                            </div>

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
                                  Copiar
                                </button>
                              </div>
                            )}

                            {acct.method === 'BANK' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {acct.details.bank_name && <AccountRow label="Banco" value={acct.details.bank_name} />}
                                {acct.details.account_name && <AccountRow label="Titular" value={acct.details.account_name} />}
                                {acct.details.account_number && <AccountRow label="Cuenta / IBAN" value={acct.details.account_number} copy />}
                                {acct.details.routing_number && <AccountRow label="SWIFT" value={acct.details.routing_number} copy />}
                                {acct.details.currency && <AccountRow label="Divisa" value={acct.details.currency} />}
                              </div>
                            )}

                            {acct.method === 'CASH' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                {acct.details.place_name && <AccountRow label="Ubicación" value={acct.details.place_name} />}
                                {acct.details.address && <AccountRow label="Dirección" value={acct.details.address} />}
                                {acct.details.instructions && <AccountRow label="Instrucciones" value={acct.details.instructions} />}
                              </div>
                            )}
                          </div>

                          {acct.method === 'CRYPTO' && acct.details.address && (
                            <div style={{ background: 'white', borderRadius: 8, padding: 8, flexShrink: 0 }}>
                              <QRCode value={acct.details.address} size={88} />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {error && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{error}</p>}

        {/* Footer buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(186,214,235,0.08)' }}>
          {step > 1 && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={secondaryBtnStyle}
            >
              ← Atrás
            </button>
          )}

          {step < 3 && (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 ? !canGoStep2 : step === 2 ? !canGoStep3 : false}
              style={{ ...primaryBtnStyle, flex: 1, opacity: (step === 1 ? !canGoStep2 : step === 2 ? !canGoStep3 : false) ? 0.5 : 1, cursor: (step === 1 ? !canGoStep2 : step === 2 ? !canGoStep3 : false) ? 'not-allowed' : 'pointer' }}
            >
              Siguiente →
            </button>
          )}

          {step === 3 && (
            <>
              <button
                onClick={() => handleSave(false)}
                disabled={loading}
                style={{ ...secondaryBtnStyle, flex: 1 }}
              >
                Guardar borrador
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={loading || !canSubmit}
                style={{ ...primaryBtnStyle, flex: 2, opacity: (!canSubmit || loading) ? 0.5 : 1, cursor: (!canSubmit || loading) ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Enviando...' : 'Enviar Orden →'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function AccountRow({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
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
            Copiar
          </button>
        )}
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(186,214,235,0.1)', padding: 24 }
const stepTitleStyle: React.CSSProperties = { fontSize: 17, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 4 }
const stepDescStyle: React.CSSProperties = { fontSize: 13, color: 'rgba(186,214,235,0.5)' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: 'rgba(186,214,235,0.7)', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(186,214,235,0.2)', fontSize: 14, color: 'white', background: 'rgba(255,255,255,0.07)', outline: 'none', boxSizing: 'border-box' }
const calcBoxStyle: React.CSSProperties = { background: 'rgba(186,214,235,0.06)', borderRadius: 10, border: '1px solid rgba(186,214,235,0.12)', padding: '14px 16px' }
const primaryBtnStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #334EAC, #401777)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const secondaryBtnStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.08)', color: 'rgba(186,214,235,0.8)', border: '1px solid rgba(186,214,235,0.2)', borderRadius: 8, padding: '10px 20px', fontSize: 14, cursor: 'pointer' }
