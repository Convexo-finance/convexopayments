'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { OtcWizard } from './OtcWizard'

const DEFAULT_SPREAD = 0.01
type Tab = 'comprar' | 'vender'

interface OwnProfile { id: string; method: string; label: string | null; details?: Record<string, string> }
interface ConvexoAccount {
  id: string; method: string; label: string | null
  details: Record<string, string>
  directions: string[]
}

interface HistoryItem {
  id: string; type: string; amount: string | number; currency: string
  status: string; created_at: string | null; paid_at?: string | null
  spread_pct?: number | null
  provider_rate?: number | null
  admin_rate?: number | null
  initial_spread?: number | null
  official_spread?: number | null
  txn_url?: string | null
  proof_url?: string | null
  user_proof_url?: string | null
  crypto_address?: string | null
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
  const [rate, setRate] = useState<number | null>(null)
  const [rateLoading, setRateLoading] = useState(false)
  const [rateError, setRateError] = useState(false)
  const [history, setHistory] = useState(initialHistory)
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [txnUrlInputs, setTxnUrlInputs] = useState<Record<string, string>>({})
  const [proofUploading, setProofUploading] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null)

  // Filter accounts by direction
  const comprarAccounts = convexoAccounts.filter((a) => (a.directions ?? []).includes('COMPRAR'))
  const venderAccounts  = convexoAccounts.filter((a) => (a.directions ?? []).includes('VENDER'))

  const fetchRate = useCallback(async () => {
    setRateLoading(true); setRateError(false)
    try {
      const { getUsdCopRate } = await import('@/lib/actions/wallet')
      setRate(await getUsdCopRate())
    } catch { setRateError(true) }
    finally { setRateLoading(false) }
  }, [])

  useEffect(() => { fetchRate() }, [fetchRate])

  function reset() { setCreatedOrder(null) }
  function switchTab(t: Tab) { setTab(t); reset() }

  async function handleMarkAsPaid(requestId: string, opts: { userProofUrl?: string; txnUrl?: string } = {}) {
    setPayingId(requestId)
    try {
      const { markOtcAsPaid } = await import('@/lib/actions/wallet')
      await markOtcAsPaid(privyToken, requestId, opts)
      setHistory((h) => h.map((r) => r.id === requestId ? {
        ...r, status: 'REVISION',
        ...(opts.userProofUrl ? { user_proof_url: opts.userProofUrl } : {}),
        ...(opts.txnUrl ? { txn_url: opts.txnUrl } : {}),
      } : r))
      setExpandedId(null)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error')
    } finally { setPayingId(null) }
  }

  async function handleProofUpload(requestId: string, file: File) {
    setProofUploading(requestId)
    try {
      const { uploadUserFile } = await import('@/lib/actions/wallet')
      const url = await uploadUserFile(privyToken, file)
      await handleMarkAsPaid(requestId, { userProofUrl: url })
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error subiendo comprobante')
    } finally { setProofUploading(null); setActiveUploadId(null) }
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
          ) : (
            <OtcWizard
              key={tab}
              privyToken={privyToken}
              balance={balance}
              tab={tab}
              ownProfiles={ownProfiles}
              comprarAccounts={comprarAccounts}
              venderAccounts={venderAccounts}
              rate={rate}
              rateLoading={rateLoading}
              onOrderCreated={(order) => {
                setCreatedOrder(order)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setHistory((h) => [{ id: order.id, type: tab === 'comprar' ? 'CASH_IN' : 'CASH_OUT', amount: order.amount, currency: order.currency, status: 'ORDERED', created_at: new Date().toISOString(), metadata: { cop_amount: order.cop_amount, spread_pct: order.spread_pct } } as any, ...h])
              }}
            />
          )}
        </div>
      </div>

      {/* Hidden file input for proof upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file && activeUploadId) handleProofUpload(activeUploadId, file)
          e.target.value = ''
        }}
      />

      {/* Request history */}
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
                    const baseRate = r.admin_rate ?? r.metadata?.usdcop_rate ?? null
                    const finalRate = baseRate
                      ? (r.type === 'CASH_IN' ? baseRate * (1 + spread) : baseRate * (1 - spread))
                      : null
                    const isExpanded = expandedId === r.id
                    const convexoAcct = convexoAccounts.find((a) => a.id === r.convexo_account_id)
                    const canExpand = ['POR_PAGAR', 'REVISION', 'LIQUIDADO'].includes(r.status)

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
                              {canExpand && (
                                <button onClick={() => setExpandedId(isExpanded ? null : r.id)}
                                  style={{ background: 'rgba(186,214,235,0.1)', border: '1px solid rgba(186,214,235,0.2)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#BAD6EB', cursor: 'pointer' }}>
                                  {isExpanded ? 'Cerrar' : r.status === 'POR_PAGAR' ? 'Acción' : 'Detalle'}
                                </button>
                              )}
                              <CopyButton text={buildClipboardText(r, spread)} />
                            </div>
                          </td>
                        </tr>

                        {/* Expanded panel */}
                        {isExpanded && (
                          <tr key={r.id + '-expand'} style={{ borderBottom: '1px solid rgba(186,214,235,0.07)' }}>
                            <td colSpan={8} style={{ padding: '0 16px 16px' }}>
                              <div style={{ background: 'rgba(186,214,235,0.04)', border: '1px solid rgba(186,214,235,0.1)', borderRadius: 10, padding: 16, marginTop: 8 }}>
                                <OtcStepper status={r.status} />

                                {/* POR_PAGAR: action panel */}
                                {r.status === 'POR_PAGAR' && r.type === 'CASH_IN' && convexoAcct && (
                                  <div style={{ marginTop: 16 }}>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 12 }}>Instrucciones de pago</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14, fontFamily: 'monospace', fontSize: 12, color: 'rgba(186,214,235,0.8)' }}>
                                      <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Monto a enviar:</span>{' '}
                                        {r.metadata?.cop_amount ? `${convexoAcct.details.currency ?? 'COP'} ${Number(r.metadata.cop_amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                                      </div>
                                      {convexoAcct.details.bank_name && <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Banco:</span> {convexoAcct.details.bank_name}</div>}
                                      {convexoAcct.details.account_name && <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Beneficiario:</span> {convexoAcct.details.account_name}</div>}
                                      {convexoAcct.details.account_number && <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Cuenta:</span> {convexoAcct.details.account_number}</div>}
                                      {convexoAcct.details.routing_number && <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>SWIFT/Routing:</span> {convexoAcct.details.routing_number}</div>}
                                      {convexoAcct.details.address && convexoAcct.method === 'CRYPTO' && <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Dirección:</span> {convexoAcct.details.address}</div>}
                                      {convexoAcct.details.instructions && (
                                        <div style={{ marginTop: 4, padding: '8px 10px', background: 'rgba(186,214,235,0.05)', borderRadius: 6, color: 'rgba(186,214,235,0.7)', fontFamily: 'sans-serif', fontStyle: 'italic', fontSize: 12 }}>
                                          {convexoAcct.details.instructions}
                                        </div>
                                      )}
                                    </div>
                                    <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.6)', marginBottom: 10 }}>
                                      Una vez realizado el pago, sube el comprobante para que Convexo lo procese.
                                    </p>
                                    <button
                                      onClick={() => { setActiveUploadId(r.id); fileInputRef.current?.click() }}
                                      disabled={!!proofUploading}
                                      style={{ background: 'linear-gradient(135deg, #334EAC, #401777)', color: 'white', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: proofUploading ? 'wait' : 'pointer', opacity: proofUploading ? 0.6 : 1 }}
                                    >
                                      {proofUploading === r.id ? 'Subiendo...' : '📎 Subir comprobante de pago'}
                                    </button>
                                  </div>
                                )}

                                {r.status === 'POR_PAGAR' && r.type === 'CASH_OUT' && (
                                  <div style={{ marginTop: 16 }}>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 12 }}>Envía tu cripto a Convexo</p>
                                    {convexoAcct && convexoAcct.method === 'CRYPTO' && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14, fontFamily: 'monospace', fontSize: 12, color: 'rgba(186,214,235,0.8)' }}>
                                        {convexoAcct.details.network && <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Red:</span> {convexoAcct.details.network}</div>}
                                        {convexoAcct.details.token && <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Token:</span> {convexoAcct.details.token}</div>}
                                        {convexoAcct.details.address && (
                                          <>
                                            <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Dirección:</span> {convexoAcct.details.address}</div>
                                          </>
                                        )}
                                      </div>
                                    )}
                                    <div style={{ marginBottom: 12 }}>
                                      <label style={labelStyle}>URL de la transacción (txn hash)</label>
                                      <input
                                        type="text"
                                        placeholder="https://etherscan.io/tx/0x..."
                                        value={txnUrlInputs[r.id] ?? ''}
                                        onChange={(e) => setTxnUrlInputs((prev) => ({ ...prev, [r.id]: e.target.value }))}
                                        style={inputStyle}
                                      />
                                    </div>
                                    <button
                                      onClick={() => handleMarkAsPaid(r.id, { txnUrl: txnUrlInputs[r.id] })}
                                      disabled={!!payingId || !txnUrlInputs[r.id]}
                                      style={{ background: 'linear-gradient(135deg, #334EAC, #401777)', color: 'white', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: (payingId || !txnUrlInputs[r.id]) ? 'not-allowed' : 'pointer', opacity: (payingId || !txnUrlInputs[r.id]) ? 0.5 : 1 }}
                                    >
                                      {payingId === r.id ? 'Enviando...' : '✓ Confirmé el envío de cripto'}
                                    </button>
                                  </div>
                                )}

                                {/* REVISION: waiting */}
                                {r.status === 'REVISION' && (
                                  <div style={{ marginTop: 16, padding: '12px 14px', background: 'rgba(186,214,235,0.06)', borderRadius: 8, fontSize: 13, color: 'rgba(186,214,235,0.7)' }}>
                                    ⏳ Tu {r.type === 'CASH_IN' ? 'comprobante' : 'transacción'} está siendo revisado por Convexo.
                                    {r.user_proof_url && (
                                      <div style={{ marginTop: 8 }}>
                                        <a href={r.user_proof_url} target="_blank" rel="noopener noreferrer" style={{ color: '#BAD6EB', fontSize: 12 }}>Ver comprobante adjunto →</a>
                                      </div>
                                    )}
                                    {r.txn_url && (
                                      <div style={{ marginTop: 8 }}>
                                        <a href={r.txn_url} target="_blank" rel="noopener noreferrer" style={{ color: '#BAD6EB', fontSize: 12 }}>Ver transacción →</a>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* LIQUIDADO: settled summary */}
                                {r.status === 'LIQUIDADO' && (
                                  <div style={{ marginTop: 16 }}>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: '#10b981', marginBottom: 12 }}>✓ Orden liquidada</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'monospace', fontSize: 12, color: 'rgba(186,214,235,0.8)' }}>
                                      <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>ID:</span> #{r.id.slice(0, 8).toUpperCase()}</div>
                                      <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Monto:</span> {Number(r.amount).toLocaleString()} {r.currency}</div>
                                      {r.metadata?.cop_amount && <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Equivalente COP:</span> ${Number(r.metadata.cop_amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>}
                                      {(r.admin_rate ?? r.metadata?.usdcop_rate) && <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Tasa aplicada:</span> {Number(r.admin_rate ?? r.metadata?.usdcop_rate).toLocaleString(undefined, { maximumFractionDigits: 0 })} COP/USD</div>}
                                      {r.official_spread != null && <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Spread oficial:</span> {(r.official_spread * 100).toFixed(2)}%</div>}
                                      {r.paid_at && <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Liquidado:</span> {new Date(r.paid_at).toLocaleDateString()}</div>}
                                    </div>
                                    <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                      {r.proof_url && (
                                        <a href={r.proof_url} target="_blank" rel="noopener noreferrer"
                                          style={{ fontSize: 12, color: '#10b981', fontWeight: 600, textDecoration: 'none' }}>
                                          ✓ Ver comprobante →
                                        </a>
                                      )}
                                      {r.txn_url && (
                                        <a href={r.txn_url} target="_blank" rel="noopener noreferrer"
                                          style={{ fontSize: 12, color: '#BAD6EB', fontWeight: 600, textDecoration: 'none' }}>
                                          🔗 Ver transacción →
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                )}
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
  if (r.crypto_address) lines.push(`Dirección : ${r.crypto_address}`)
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
    if (order.convexoAccount.details.address) lines.push(`Wallet: ${order.convexoAccount.details.address}`)
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
            ? <>Envía <strong style={{ color: 'white' }}>${order.cop_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} COP</strong> a Convexo. Cuando Convexo la acepte, recibirás instrucciones de pago.</>
            : <>Cuando Convexo acepte la orden, recibirás la dirección cripto a la que debes enviar <strong style={{ color: 'white' }}>{order.amount} {order.currency}</strong>.</>
          }
        </p>
      </div>

      <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, color: 'rgba(186,214,235,0.7)', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>ID:</span> #{order.id.slice(0, 8).toUpperCase()}</div>
        <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Monto:</span> {order.amount} {order.currency}</div>
        <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>COP:</span> ${order.cop_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        <div><span style={{ color: 'rgba(186,214,235,0.4)' }}>Spread inicial:</span> {(order.spread_pct * 100).toFixed(2)}%</div>
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


const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(186,214,235,0.7)', marginBottom: 5 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 7, border: '1px solid rgba(186,214,235,0.2)', fontSize: 13, color: 'white', background: 'rgba(255,255,255,0.07)', outline: 'none', boxSizing: 'border-box' }
const primaryBtn: React.CSSProperties = { width: '100%', padding: '11px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #334EAC, #401777)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const thStyle: React.CSSProperties = { padding: '10px 16px', textAlign: 'left', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(186,214,235,0.4)', fontWeight: 600, borderBottom: '1px solid rgba(186,214,235,0.08)', whiteSpace: 'nowrap' }
const tdStyle: React.CSSProperties = { padding: '11px 16px', color: 'rgba(255,255,255,0.9)', verticalAlign: 'middle' }
