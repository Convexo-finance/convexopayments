'use client'
import { useState, useEffect, useCallback } from 'react'
import { StatusBadge } from '@/components/ui/StatusBadge'

const DEFAULT_SPREAD = 0.01
const TOKENS = ['USDC', 'USDT'] as const
type Token = typeof TOKENS[number]
type Tab = 'comprar' | 'vender'

interface OwnProfile { id: string; method: string; label: string | null; details?: Record<string, string> }
interface ConvexoAccount { id: string; method: string; label: string | null; details: Record<string, string> }

interface HistoryItem {
  id: string; type: string; amount: string | number; currency: string
  status: string; created_at: string | null; paid_at?: string | null
  spread_pct?: number | null
  convexo_account_id?: string | null
  destination_profile_id?: string | null
  metadata: { cop_amount?: number; usdcop_rate?: number; spread_pct?: number } | null
}

interface CreatedOrder {
  id: string; cop_amount: number; amount: number; currency: string
  spread_pct: number
  convexoAccount?: ConvexoAccount; ownProfileLabel?: string
}

interface OtcClientProps {
  privyToken: string
  balance: number
  ownProfiles: OwnProfile[]
  convexoAccounts: ConvexoAccount[]
  history: HistoryItem[]
}

// Steps for the OTC progress stepper
const OTC_STEPS = [
  { status: 'ORDERED',   label: 'Solicitado' },
  { status: 'ACEPTADO',  label: 'Aceptado' },
  { status: 'POR_PAGAR', label: 'Por Pagar' },
  { status: 'REVISION',  label: 'En Revisión' },
  { status: 'LIQUIDADO', label: 'Liquidado' },
]

function getStepIndex(status: string) {
  const map: Record<string, number> = {
    ORDERED: 0, ACEPTADO: 1, POR_PAGAR: 2, REVISION: 3, LIQUIDADO: 4,
  }
  return map[status] ?? -1
}

export function OtcClient({ privyToken, balance, ownProfiles, convexoAccounts, history: initialHistory }: OtcClientProps) {
  const [tab, setTab] = useState<Tab>('comprar')
  const [token, setToken] = useState<Token>('USDC')
  const [amount, setAmount] = useState('')
  const [rate, setRate] = useState<number | null>(null)
  const [rateLoading, setRateLoading] = useState(false)
  const [rateError, setRateError] = useState(false)
  const [destinationProfileId, setDestinationProfileId] = useState('')
  const [selectedConvexoId, setSelectedConvexoId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState(initialHistory)
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)

  const cashAccounts = convexoAccounts.filter((a) => a.method === 'CASH')
  const convexoComprarAccounts = cashAccounts.filter((a) => ['COMPRAR', 'OTC', 'ALL'].includes(a.details.direction ?? ''))
  const convexoVenderAccounts  = cashAccounts.filter((a) => ['VENDER',  'OTC', 'ALL'].includes(a.details.direction ?? ''))
  const bankProfiles = ownProfiles.filter((p) => p.method === 'BANK')

  const amountNum   = parseFloat(amount) || 0
  const copComprar  = rate ? amountNum * rate * (1 + DEFAULT_SPREAD) : null
  const copVender   = rate ? amountNum * rate * (1 - DEFAULT_SPREAD) : null

  const fetchRate = useCallback(async () => {
    setRateLoading(true); setRateError(false)
    try {
      const { getUsdCopRate } = await import('@/lib/actions/wallet')
      setRate(await getUsdCopRate())
    } catch { setRateError(true) }
    finally { setRateLoading(false) }
  }, [])

  useEffect(() => { fetchRate() }, [fetchRate])

  useEffect(() => {
    if (convexoComprarAccounts.length > 0 && !selectedConvexoId) {
      setSelectedConvexoId(convexoComprarAccounts[0].id)
    }
  }, [convexoComprarAccounts, selectedConvexoId])

  function reset() { setAmount(''); setDestinationProfileId(''); setCreatedOrder(null); setError(null) }
  function switchTab(t: Tab) { setTab(t); reset() }

  async function handleComprar() {
    if (!amountNum || !rate) return
    setLoading(true); setError(null)
    try {
      const { createWalletRequest } = await import('@/lib/actions/wallet')
      const req = await createWalletRequest(privyToken, {
        type: 'CASH_IN', amount: amountNum, currency: token,
        convexo_account_id: selectedConvexoId || undefined,
        metadata: { usdcop_rate: rate, spread_pct: DEFAULT_SPREAD, cop_amount: copComprar },
      })
      const acct = convexoComprarAccounts.find((a) => a.id === selectedConvexoId)
      setCreatedOrder({ id: req.id, cop_amount: copComprar!, amount: amountNum, currency: token, spread_pct: DEFAULT_SPREAD, convexoAccount: acct })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setHistory((h) => [req as any, ...h])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally { setLoading(false) }
  }

  async function handleVender() {
    if (!amountNum || !rate || !destinationProfileId) return
    setLoading(true); setError(null)
    try {
      const { createWalletRequest } = await import('@/lib/actions/wallet')
      const req = await createWalletRequest(privyToken, {
        type: 'CASH_OUT', amount: amountNum, currency: token,
        destination_profile_id: destinationProfileId,
        metadata: { usdcop_rate: rate, spread_pct: DEFAULT_SPREAD, cop_amount: copVender },
      })
      const profile = bankProfiles.find((p) => p.id === destinationProfileId)
      setCreatedOrder({ id: req.id, cop_amount: copVender!, amount: amountNum, currency: token, spread_pct: DEFAULT_SPREAD, ownProfileLabel: profile?.label ?? profile?.method })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setHistory((h) => [req as any, ...h])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally { setLoading(false) }
  }

  async function handleMarkAsPaid(requestId: string) {
    setPayingId(requestId)
    try {
      const { markOtcAsPaid } = await import('@/lib/actions/wallet')
      await markOtcAsPaid(privyToken, requestId)
      setHistory((h) => h.map((r) => r.id === requestId ? { ...r, status: 'REVISION' } : r))
      setExpandedId(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error')
    } finally { setPayingId(null) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Rate strip */}
      <div style={{ background: 'linear-gradient(135deg, #02001A, #2A0144)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Tasa USD/COP en vivo</div>
          {rateLoading ? (
            <div style={{ fontSize: 22, fontWeight: 800, color: 'rgba(255,255,255,0.4)' }}>—</div>
          ) : rateError ? (
            <div style={{ fontSize: 14, color: '#ef4444' }}>Tasa no disponible</div>
          ) : rate ? (
            <div style={{ fontSize: 22, fontWeight: 800, color: 'white' }}>
              {rate.toLocaleString(undefined, { maximumFractionDigits: 0 })} COP
            </div>
          ) : null}
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
            Spread del {(DEFAULT_SPREAD * 100).toFixed(1)}% aplicado por defecto · puede ajustarse por Convexo al aceptar
          </div>
        </div>
        <button onClick={fetchRate} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '8px 14px', color: 'rgba(255,255,255,0.7)', fontSize: 12, cursor: 'pointer' }}>
          ↻ Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(186,214,235,0.1)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid rgba(186,214,235,0.08)', background: 'rgba(186,214,235,0.04)' }}>
          {(['comprar', 'vender'] as const).map((key) => (
            <button key={key} onClick={() => switchTab(key)} style={{
              padding: '16px 8px', border: 'none', cursor: 'pointer', textAlign: 'center',
              borderBottom: tab === key ? '2px solid #BAD6EB' : '2px solid transparent',
              background: tab === key ? 'rgba(186,214,235,0.08)' : 'transparent',
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: tab === key ? '#BAD6EB' : 'rgba(255,255,255,0.6)', letterSpacing: '0.5px' }}>
                {key === 'comprar' ? 'COMPRAR' : 'VENDER'}
              </div>
            </button>
          ))}
        </div>

        <div style={{ padding: 24 }}>
          {createdOrder ? (
            <OrderSuccess order={createdOrder} type={tab} onDone={reset} />
          ) : tab === 'comprar' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.6)' }}>
                Envía COP a Convexo y recibe USDC acreditado en tu cuenta.
              </p>
              <TokenAmount token={token} amount={amount} onToken={setToken} onAmount={setAmount} />
              {rate && amountNum > 0 && <SpreadBox rate={rate} cop={copComprar!} spread={DEFAULT_SPREAD} dir="in" />}

              {convexoComprarAccounts.length === 0 ? (
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#f59e0b' }}>
                  No hay opciones de pago de Convexo disponibles para COMPRAR. Contacta soporte.
                </div>
              ) : (
                <div>
                  <label style={labelStyle}>Enviar a (cuenta Convexo)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {convexoComprarAccounts.map((acct) => {
                      const sel = selectedConvexoId === acct.id
                      return (
                        <div key={acct.id} onClick={() => setSelectedConvexoId(acct.id)} style={{
                          border: `2px solid ${sel ? '#334EAC' : 'rgba(186,214,235,0.15)'}`,
                          borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
                          background: sel ? 'rgba(51,78,172,0.1)' : 'rgba(255,255,255,0.03)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                              {acct.label ?? acct.details.bank_name ?? 'Opción de pago'}
                            </span>
                            {acct.details.currency && (
                              <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(51,78,172,0.3)', color: '#BAD6EB', padding: '1px 7px', borderRadius: 99 }}>
                                {acct.details.currency}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: 'rgba(186,214,235,0.55)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            {acct.details.bank_name && <span>{acct.details.bank_name}</span>}
                            {acct.details.account_number && <span>Cuenta: {acct.details.account_number}</span>}
                            {acct.details.routing_number && <span>SWIFT: {acct.details.routing_number}</span>}
                            {acct.details.account_name && <span>{acct.details.account_name}</span>}
                          </div>
                          {acct.details.instructions && (
                            <div style={{ fontSize: 11, color: 'rgba(186,214,235,0.4)', marginTop: 4, fontStyle: 'italic' }}>
                              {acct.details.instructions}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
              <button onClick={handleComprar} disabled={loading || !amountNum || !rate || !selectedConvexoId}
                style={{ ...primaryBtn, opacity: (!amountNum || !rate || !selectedConvexoId || loading) ? 0.5 : 1 }}>
                {loading ? 'Creando...' : 'Crear orden COMPRAR'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.6)' }}>
                Convierte tu USDC a COP. Balance: <strong style={{ color: 'rgba(255,255,255,0.9)' }}>{balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC</strong>
              </p>
              <TokenAmount token={token} amount={amount} onToken={setToken} onAmount={setAmount} max={balance} />
              {rate && amountNum > 0 && <SpreadBox rate={rate} cop={copVender!} spread={DEFAULT_SPREAD} dir="out" />}

              <div>
                <label style={labelStyle}>Recibir COP en (tu cuenta bancaria)</label>
                {bankProfiles.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#f59e0b' }}>
                    No tienes cuentas bancarias. Agrega una en <a href="/metodos-pago" style={{ color: '#BAD6EB' }}>Métodos de Pago</a>.
                  </p>
                ) : (
                  <select style={inputStyle} value={destinationProfileId} onChange={(e) => setDestinationProfileId(e.target.value)}>
                    <option value="">Selecciona cuenta bancaria...</option>
                    {bankProfiles.map((p) => <option key={p.id} value={p.id}>{p.label ?? p.method}</option>)}
                  </select>
                )}
              </div>

              {amountNum > balance && <p style={{ color: '#ef4444', fontSize: 12 }}>El monto supera tu balance.</p>}
              {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
              <button onClick={handleVender} disabled={loading || !amountNum || !rate || !destinationProfileId || amountNum > balance}
                style={{ ...primaryBtn, opacity: (!amountNum || !rate || !destinationProfileId || amountNum > balance || loading) ? 0.5 : 1 }}>
                {loading ? 'Enviando...' : 'Crear orden VENDER'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Request history — filtered by active tab */}
      {(() => {
        const typeFilter = tab === 'comprar' ? 'CASH_IN' : 'CASH_OUT'
        const filtered = history.filter((r) => r.type === typeFilter)
        if (filtered.length === 0) return null
        return (
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(186,214,235,0.1)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(186,214,235,0.08)', background: 'rgba(186,214,235,0.04)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
              Historial — {tab === 'comprar' ? 'COMPRAR' : 'VENDER'}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Fecha creación', 'Token', 'Monto', 'Fiat (COP)', 'Tasa final', 'Fecha pago', 'Estado', ''].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const spread = r.spread_pct ?? r.metadata?.spread_pct ?? DEFAULT_SPREAD
                const baseRate = r.metadata?.usdcop_rate ?? null
                const finalRate = baseRate
                  ? (r.type === 'CASH_IN' ? baseRate * (1 + spread) : baseRate * (1 - spread))
                  : null
                const isExpanded = expandedId === r.id
                const convexoAcct = convexoAccounts.find((a) => a.id === r.convexo_account_id)

                return (
                  <>
                    <tr key={r.id} style={{ borderBottom: isExpanded ? 'none' : '1px solid rgba(186,214,235,0.07)' }}>
                      <td style={{ ...tdStyle, color: 'rgba(186,214,235,0.7)', whiteSpace: 'nowrap' }}>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{r.currency}</td>
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{Number(r.amount).toLocaleString()}</td>
                      <td style={tdStyle}>{r.metadata?.cop_amount ? `$${Number(r.metadata.cop_amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}</td>
                      <td style={tdStyle}>
                        {finalRate
                          ? <span style={{ fontWeight: 700, color: '#BAD6EB' }}>{finalRate.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          : <span style={{ color: 'rgba(186,214,235,0.3)' }}>—</span>}
                      </td>
                      <td style={{ ...tdStyle, color: r.paid_at ? '#10b981' : 'rgba(186,214,235,0.3)', whiteSpace: 'nowrap' }}>{r.paid_at ? new Date(r.paid_at).toLocaleDateString() : '—'}</td>
                      <td style={tdStyle}><StatusBadge status={r.status} /></td>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {r.status === 'POR_PAGAR' && (
                            <button onClick={() => setExpandedId(isExpanded ? null : r.id)}
                              style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#f59e0b', cursor: 'pointer' }}>
                              {isExpanded ? 'Cerrar' : 'Ver instrucciones'}
                            </button>
                          )}
                          <CopyButton text={buildClipboardText(r, spread)} />
                        </div>
                      </td>
                    </tr>

                    {/* Expandable POR_PAGAR panel */}
                    {isExpanded && r.status === 'POR_PAGAR' && (
                      <tr key={r.id + '-expand'} style={{ borderBottom: '1px solid rgba(186,214,235,0.07)' }}>
                        <td colSpan={8} style={{ padding: '0 16px 16px' }}>
                          <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: 16 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 12 }}>
                              Instrucciones de pago
                            </p>
                            {r.type === 'CASH_IN' && convexoAcct ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14, fontFamily: 'monospace', fontSize: 12, color: 'rgba(186,214,235,0.8)' }}>
                                <div>
                                  <span style={{ color: 'rgba(186,214,235,0.4)' }}>Monto a enviar:</span>{' '}
                                  {r.metadata?.cop_amount
                                    ? `${convexoAcct.details.currency ?? ''} ${Number(r.metadata.cop_amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                                    : '—'}
                                </div>
                                {convexoAcct.details.bank_name && <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Banco:</span> {convexoAcct.details.bank_name}</div>}
                                {convexoAcct.details.account_name && <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Beneficiario:</span> {convexoAcct.details.account_name}</div>}
                                {convexoAcct.details.account_number && <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Cuenta:</span> {convexoAcct.details.account_number}</div>}
                                {convexoAcct.details.routing_number && <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>SWIFT/Routing:</span> {convexoAcct.details.routing_number}</div>}
                                {convexoAcct.label && <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Referencia:</span> {convexoAcct.label}</div>}
                                {convexoAcct.details.instructions && (
                                  <div style={{ marginTop: 4, padding: '8px 10px', background: 'rgba(186,214,235,0.05)', borderRadius: 6, color: 'rgba(186,214,235,0.7)', fontFamily: 'sans-serif', fontStyle: 'italic', fontSize: 12 }}>
                                    {convexoAcct.details.instructions}
                                  </div>
                                )}
                              </div>
                            ) : r.type === 'CASH_OUT' ? (
                              <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.7)', marginBottom: 14 }}>
                                Convexo enviará <strong style={{ color: 'white' }}>${r.metadata?.cop_amount ? Number(r.metadata.cop_amount).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'} COP</strong> a tu cuenta bancaria registrada.
                              </p>
                            ) : null}
                            <OtcStepper status={r.status} />
                            <div style={{ marginTop: 14 }}>
                              <button
                                onClick={() => handleMarkAsPaid(r.id)}
                                disabled={!!payingId}
                                style={{ background: 'linear-gradient(135deg, #334EAC, #401777)', color: 'white', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: payingId ? 'wait' : 'pointer', opacity: payingId ? 0.6 : 1 }}
                              >
                                {payingId === r.id ? 'Procesando...' : r.type === 'CASH_IN' ? '✓ Marqué el pago' : '✓ Confirmo haber recibido'}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
        )
      })()}
    </div>
  )
}

// ── OTC progress stepper ──────────────────────────────────────────────────────

function OtcStepper({ status }: { status: string }) {
  const currentStep = getStepIndex(status)
  if (currentStep < 0) return null
  return (
    <div style={{ display: 'flex', gap: 0, marginTop: 8 }}>
      {OTC_STEPS.map((step, i) => {
        const done   = i < currentStep
        const active = i === currentStep
        return (
          <div key={step.status} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {i > 0 && (
              <div style={{ position: 'absolute', left: 0, top: 10, width: '50%', height: 2, background: done || active ? '#334EAC' : 'rgba(186,214,235,0.1)' }} />
            )}
            {i < OTC_STEPS.length - 1 && (
              <div style={{ position: 'absolute', right: 0, top: 10, width: '50%', height: 2, background: done ? '#334EAC' : 'rgba(186,214,235,0.1)' }} />
            )}
            <div style={{
              width: 22, height: 22, borderRadius: '50%', zIndex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: done ? '#334EAC' : active ? '#BAD6EB' : 'rgba(186,214,235,0.08)',
              border: `2px solid ${done || active ? '#334EAC' : 'rgba(186,214,235,0.15)'}`,
              fontSize: 10, fontWeight: 700,
              color: done ? 'white' : active ? '#081F5C' : 'rgba(186,214,235,0.2)',
            }}>
              {done ? '✓' : i + 1}
            </div>
            <p style={{ fontSize: 9, marginTop: 5, textAlign: 'center', fontWeight: active ? 700 : 400, color: active ? 'rgba(255,255,255,0.85)' : done ? 'rgba(186,214,235,0.6)' : 'rgba(186,214,235,0.25)' }}>
              {step.label}
            </p>
          </div>
        )
      })}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildClipboardText(r: HistoryItem, spread: number): string {
  const typeLabel: Record<string, string> = { CASH_IN: 'Comprar', CASH_OUT: 'Vender', TOPUP: 'Depósito', CRYPTO_WITHDRAW: 'Retiro' }
  const lines = [
    `Convexo OTC — ${typeLabel[r.type] ?? r.type}`,
    `─────────────────────────`,
    `ID        : #${r.id.slice(0, 8).toUpperCase()}`,
    `Monto     : ${Number(r.amount).toLocaleString()} ${r.currency}`,
    `Spread    : ${(spread * 100).toFixed(2)}%`,
  ]
  if (r.metadata?.cop_amount) lines.push(`COP       : $${Number(r.metadata.cop_amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}`)
  if (r.metadata?.usdcop_rate) lines.push(`Tasa      : ${Number(r.metadata.usdcop_rate).toLocaleString(undefined, { maximumFractionDigits: 0 })} COP/USD`)
  if (r.created_at) lines.push(`Creado    : ${new Date(r.created_at).toLocaleDateString()}`)
  if (r.paid_at) lines.push(`Pagado    : ${new Date(r.paid_at).toLocaleDateString()}`)
  lines.push(`Estado    : ${r.status}`)
  return lines.join('\n')
}

function buildShareText(order: CreatedOrder, type: Tab): string {
  const lines = [
    `Hola! Creé una orden ${type === 'comprar' ? 'COMPRAR' : 'VENDER'} en pay.convexo.xyz`,
    ``,
    `ID: #${order.id.slice(0, 8).toUpperCase()}`,
    `Monto: ${order.amount} ${order.currency}`,
    `COP: $${order.cop_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    `Spread aplicado: ${(order.spread_pct * 100).toFixed(2)}%`,
  ]
  if (type === 'comprar' && order.convexoAccount) {
    lines.push(``, `Enviaré el pago a:`)
    if (order.convexoAccount.details.bank_name) lines.push(`Banco: ${order.convexoAccount.details.bank_name}`)
    if (order.convexoAccount.details.account_number) lines.push(`Cuenta: ${order.convexoAccount.details.account_number}`)
  }
  if (type === 'vender' && order.ownProfileLabel) {
    lines.push(``, `Recibir en: ${order.ownProfileLabel}`)
  }
  lines.push(``, `Por favor confirma. ¡Gracias!`)
  return lines.join('\n')
}

// ── Sub-components ────────────────────────────────────────────────────────────

function OrderSuccess({ order, type, onDone }: { order: CreatedOrder; type: Tab; onDone: () => void }) {
  const msg = encodeURIComponent(buildShareText(order, type))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: '14px 18px' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#10b981', marginBottom: 4 }}>
          ✓ Orden {type === 'comprar' ? 'COMPRAR' : 'VENDER'} creada
        </p>
        <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.7)' }}>
          {type === 'comprar'
            ? <>Envía <strong style={{ color: 'white' }}>${order.cop_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} COP</strong> a Convexo y comparte los detalles.</>
            : <>Convexo te enviará <strong style={{ color: 'white' }}>${order.cop_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} COP</strong> a tu cuenta bancaria.</>
          }
        </p>
      </div>

      {/* Order summary */}
      <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, color: 'rgba(186,214,235,0.7)', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>ID:</span> #{order.id.slice(0, 8).toUpperCase()}</div>
        <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Monto:</span> {order.amount} {order.currency}</div>
        <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>COP:</span> ${order.cop_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Spread:</span> {(order.spread_pct * 100).toFixed(2)}%</div>
        {type === 'comprar' && order.convexoAccount && (
          <>
            <div style={{ borderTop: '1px solid rgba(186,214,235,0.1)', marginTop: 4, paddingTop: 6, color: 'rgba(186,214,235,0.4)', fontSize: 11 }}>ENVIAR A</div>
            {order.convexoAccount.details.bank_name && <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Banco:</span> {order.convexoAccount.details.bank_name}</div>}
            {order.convexoAccount.details.account_number && <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Cuenta:</span> {order.convexoAccount.details.account_number}</div>}
          </>
        )}
        {type === 'vender' && order.ownProfileLabel && (
          <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Recibir en:</span> {order.ownProfileLabel}</div>
        )}
      </div>

      <OtcStepper status="ORDERED" />

      <div>
        <p style={{ fontSize: 11, color: 'rgba(186,214,235,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Enviar detalles a Convexo</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href={`https://api.whatsapp.com/send?phone=573186766035&text=${msg}`} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25d366', color: 'white', padding: '11px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.528 5.845L0 24l6.335-1.507A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.003-1.371l-.359-.213-3.757.894.952-3.663-.234-.376A9.818 9.818 0 1112 21.818z"/></svg>
            WhatsApp
          </a>
          <a href={`https://t.me/convexoprotocol?text=${msg}`} target="_blank" rel="noopener noreferrer"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#229ED9', color: 'white', padding: '11px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-2.012 9.483c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.48 14.68l-2.95-.92c-.641-.2-.654-.641.136-.949l11.527-4.445c.535-.194 1.003.131.369.882z"/></svg>
            Telegram
          </a>
        </div>
      </div>

      <button onClick={onDone} style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(186,214,235,0.8)', border: '1px solid rgba(186,214,235,0.2)', borderRadius: 8, padding: '9px 16px', fontSize: 13, cursor: 'pointer' }}>
        Nueva orden
      </button>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    catch { /* ignore */ }
  }
  return (
    <button onClick={handleCopy} title="Copiar detalles"
      style={{ background: 'none', border: '1px solid rgba(186,214,235,0.15)', borderRadius: 6, padding: '4px 8px', color: copied ? '#10b981' : 'rgba(186,214,235,0.5)', fontSize: 12, cursor: 'pointer' }}>
      {copied ? '✓' : '📋'}
    </button>
  )
}

function TokenAmount({ token, amount, onToken, onAmount, max }: {
  token: Token; amount: string; onToken: (t: Token) => void; onAmount: (v: string) => void; max?: number
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
      <div>
        <label style={labelStyle}>Token</label>
        <select style={inputStyle} value={token} onChange={(e) => onToken(e.target.value as Token)}>
          {TOKENS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between' }}>
          <span>Monto</span>
          {max !== undefined && (
            <button type="button" onClick={() => onAmount(String(max))} style={{ fontSize: 11, color: '#BAD6EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Máx</button>
          )}
        </label>
        <input type="number" min="0" step="any" style={inputStyle} placeholder="0.00" value={amount} onChange={(e) => onAmount(e.target.value)} />
      </div>
    </div>
  )
}

function SpreadBox({ rate, cop, spread, dir }: { rate: number; cop: number; spread: number; dir: 'in' | 'out' }) {
  const valueColor = dir === 'in' ? '#BAD6EB' : '#10b981'
  const spreadAmt  = rate * spread
  return (
    <div style={{ background: 'rgba(186,214,235,0.08)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'rgba(186,214,235,0.7)' }}>
          Tasa base <span style={{ color: 'rgba(186,214,235,0.4)' }}>×</span> spread {(spread * 100).toFixed(2)}%
        </span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
          {rate.toLocaleString(undefined, { maximumFractionDigits: 0 })} {dir === 'in' ? '+' : '−'} {spreadAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          {' = '}
          <strong>{(dir === 'in' ? rate + spreadAmt : rate - spreadAmt).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(186,214,235,0.15)', paddingTop: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
          {dir === 'in' ? 'Debes enviar (COP)' : 'Recibes (COP)'}
        </span>
        <span style={{ fontSize: 16, fontWeight: 800, color: valueColor }}>${cop.toLocaleString(undefined, { maximumFractionDigits: 0 })} COP</span>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(186,214,235,0.7)', marginBottom: 5 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 7, border: '1px solid rgba(186,214,235,0.2)', fontSize: 13, color: 'white', background: 'rgba(255,255,255,0.07)', outline: 'none', boxSizing: 'border-box' }
const primaryBtn: React.CSSProperties = { width: '100%', padding: '11px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #334EAC, #401777)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const thStyle: React.CSSProperties = { padding: '10px 16px', textAlign: 'left', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(186,214,235,0.4)', fontWeight: 600, borderBottom: '1px solid rgba(186,214,235,0.08)', whiteSpace: 'nowrap' }
const tdStyle: React.CSSProperties = { padding: '11px 16px', color: 'rgba(255,255,255,0.9)', verticalAlign: 'middle' }
