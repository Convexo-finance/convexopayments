'use client'
import { useState } from 'react'
import { StatusBadge } from '@/components/ui/StatusBadge'

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
  metadata: { cop_amount?: number; usdcop_rate?: number; spread_pct?: number } | null
  users: {
    email: string
    profiles: { first_name?: string; last_name?: string; phone?: string; phone_country_code?: string } | null
  } | null
}

interface WalletRequestManagerProps {
  requests: WalletRequest[]
  privyToken: string
}

const OTC_STEPS = [
  { status: 'ORDERED',   label: 'Solicitado' },
  { status: 'ACEPTADO',  label: 'Aceptado' },
  { status: 'POR_PAGAR', label: 'Por Pagar' },
  { status: 'REVISION',  label: 'En Revisión' },
  { status: 'LIQUIDADO', label: 'Liquidado' },
]

function getStepIndex(status: string) {
  return OTC_STEPS.findIndex(s => s.status === status)
}

const NEXT_ADMIN_STEP: Record<string, string | null> = {
  ORDERED:   'ACEPTADO',
  ACEPTADO:  'POR_PAGAR',
  POR_PAGAR: null,
  REVISION:  'LIQUIDADO',
}
const NEXT_LABELS: Record<string, string> = {
  ACEPTADO:  'Aceptar orden',
  POR_PAGAR: 'Habilitar pago',
  LIQUIDADO: 'Marcar liquidado',
}

export function WalletRequestManager({ requests: initial, privyToken }: WalletRequestManagerProps) {
  const [requests, setRequests] = useState(initial)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [spreadInputs, setSpreadInputs] = useState<Record<string, string>>({})
  const [rateInputs,   setRateInputs]   = useState<Record<string, string>>({})
  const [copInputs,    setCopInputs]    = useState<Record<string, string>>({})
  const [proofInputs,  setProofInputs]  = useState<Record<string, string>>({})
  const [noteInputs,   setNoteInputs]   = useState<Record<string, string>>({})

  const otcOrders = requests.filter(r => ['CASH_IN', 'CASH_OUT'].includes(r.type))
  const active = otcOrders.filter(r => !['LIQUIDADO', 'CANCELADO'].includes(r.status))
  const done   = otcOrders.filter(r =>  ['LIQUIDADO', 'CANCELADO'].includes(r.status))

  async function handleUpdate(id: string, newStatus: string, extraOpts?: { spreadPct?: number; rate?: number; copAmount?: number }) {
    setLoading(id + newStatus)
    setError(null)
    try {
      const { adminUpdateWalletRequest } = await import('@/lib/actions/admin')
      await adminUpdateWalletRequest(privyToken, id, newStatus, {
        proofUrl:  proofInputs[id],
        adminNote: noteInputs[id],
        ...extraOpts,
      })
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
      if (['LIQUIDADO', 'CANCELADO'].includes(newStatus)) setExpandedId(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(null)
    }
  }

  function handleAdvance(req: WalletRequest) {
    const next = NEXT_ADMIN_STEP[req.status]
    if (!next) return
    const opts: { spreadPct?: number; rate?: number; copAmount?: number } = {}
    if (req.status === 'ORDERED' || req.status === 'ACEPTADO') {
      if (spreadInputs[req.id]) opts.spreadPct = parseFloat(spreadInputs[req.id]) / 100
      if (rateInputs[req.id])   opts.rate      = parseFloat(rateInputs[req.id])
      if (copInputs[req.id])    opts.copAmount = parseFloat(copInputs[req.id])
    }
    handleUpdate(req.id, next, opts)
  }

  function renderSection(orders: WalletRequest[], sectionLabel: string, isReadOnly: boolean) {
    if (orders.length === 0) return null
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <h2 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(186,214,235,0.4)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>
          {sectionLabel} — {orders.length}
        </h2>
        <div className="table-scroll" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(186,214,235,0.12)', borderRadius: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(186,214,235,0.08)' }}>
                {['#ID', 'Usuario', 'Tipo', 'Monto', 'COP', 'Spread', 'Estado', 'Fecha', ''].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(r => {
                const isExpanded = expandedId === r.id
                const spread = r.spread_pct ?? r.metadata?.spread_pct ?? 0.01
                const baseRate = r.metadata?.usdcop_rate ?? null
                const cop = r.metadata?.cop_amount ?? null
                const finalRate = baseRate ? (r.type === 'CASH_IN' ? baseRate * (1 + spread) : baseRate * (1 - spread)) : null
                const profile = r.users?.profiles
                const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || null

                return (
                  <>
                    <tr
                      key={r.id}
                      style={{ borderTop: '1px solid rgba(186,214,235,0.06)', cursor: 'pointer' }}
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    >
                      <td style={tdStyle}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(186,214,235,0.6)' }}>
                          #{r.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontSize: 12, color: 'rgba(186,214,235,0.8)' }}>{r.users?.email ?? '—'}</div>
                        {userName && <div style={{ fontSize: 11, color: 'rgba(186,214,235,0.4)' }}>{userName}</div>}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                          background: r.type === 'CASH_IN' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
                          color: r.type === 'CASH_IN' ? '#34d399' : '#f87171',
                        }}>
                          {r.type === 'CASH_IN' ? 'COMPRAR' : 'VENDER'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                          {Number(r.amount).toLocaleString()} {r.currency}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 12, color: 'rgba(186,214,235,0.6)' }}>
                          {cop ? `$${Number(cop).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 12, color: '#BAD6EB' }}>{(spread * 100).toFixed(2)}%</span>
                      </td>
                      <td style={tdStyle}><StatusBadge status={r.status} /></td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 11, color: 'rgba(186,214,235,0.35)' }}>
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 16, color: 'rgba(186,214,235,0.5)' }}>{isExpanded ? '▲' : '▼'}</span>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={r.id + '-expand'}>
                        <td colSpan={9} style={{ padding: 0, background: 'rgba(255,255,255,0.02)' }}>
                          <div className="expand-panel-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderTop: '1px solid rgba(186,214,235,0.08)' }}>

                            {/* LEFT: user info + transaction details */}
                            <div style={{ padding: '20px 24px', borderRight: '1px solid rgba(186,214,235,0.08)' }}>
                              <div style={{ marginBottom: 16 }}>
                                <p style={expandLabelStyle}>Información del usuario</p>
                                {userName && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 600, margin: '0 0 2px' }}>{userName}</p>}
                                <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.6)', margin: '0 0 2px' }}>{r.users?.email ?? '—'}</p>
                                {profile?.phone && (
                                  <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.5)', margin: 0 }}>
                                    {profile.phone_country_code} {profile.phone}
                                  </p>
                                )}
                              </div>

                              <div>
                                <p style={expandLabelStyle}>Detalles de la operación</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <DataRow label="Tipo">{r.type === 'CASH_IN' ? 'COMPRAR (COP → USDC)' : 'VENDER (USDC → COP)'}</DataRow>
                                  <DataRow label="Monto">{Number(r.amount).toLocaleString()} {r.currency}</DataRow>
                                  {baseRate && <DataRow label="Tasa base">{baseRate.toLocaleString(undefined, { maximumFractionDigits: 0 })} COP/USD</DataRow>}
                                  <DataRow label="Spread aplicado">{(spread * 100).toFixed(2)}%</DataRow>
                                  {finalRate && <DataRow label="Tasa final" highlight>{finalRate.toLocaleString(undefined, { maximumFractionDigits: 0 })} COP/USD</DataRow>}
                                  {cop && <DataRow label="Equivalente COP" bold>{`$${Number(cop).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}</DataRow>}
                                  {r.paid_at && <DataRow label="Fecha de pago">{new Date(r.paid_at).toLocaleString()}</DataRow>}
                                  {r.proof_url && (
                                    <div style={{ marginTop: 4 }}>
                                      <a href={r.proof_url} target="_blank" rel="noopener noreferrer"
                                        style={{ fontSize: 12, color: '#10b981', fontWeight: 600, textDecoration: 'none' }}>
                                        ✓ Ver comprobante →
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* RIGHT: stepper + action card */}
                            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                              {/* OTC Stepper */}
                              {getStepIndex(r.status) >= 0 && (
                                <div>
                                  <p style={expandLabelStyle}>Estado del pedido</p>
                                  <OtcStepper status={r.status} />
                                </div>
                              )}

                              {/* Action card */}
                              {!isReadOnly && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                  <p style={expandLabelStyle}>Acciones</p>

                                  {(r.status === 'ORDERED' || r.status === 'ACEPTADO') && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                      <div>
                                        <label style={innerLabelStyle}>Spread % (override)</label>
                                        <input
                                          type="number" min="0" step="0.1"
                                          placeholder={`${(spread * 100).toFixed(2)}`}
                                          value={spreadInputs[r.id] ?? ''}
                                          onChange={e => setSpreadInputs(p => ({ ...p, [r.id]: e.target.value }))}
                                          style={inputStyle}
                                        />
                                      </div>
                                      <div>
                                        <label style={innerLabelStyle}>Tasa USD/COP</label>
                                        <input
                                          type="number" min="0" step="1"
                                          placeholder={baseRate ? String(Math.round(baseRate)) : 'e.g. 4200'}
                                          value={rateInputs[r.id] ?? ''}
                                          onChange={e => setRateInputs(p => ({ ...p, [r.id]: e.target.value }))}
                                          style={inputStyle}
                                        />
                                      </div>
                                      <div>
                                        <label style={innerLabelStyle}>Monto COP</label>
                                        <input
                                          type="number" min="0" step="1"
                                          placeholder={cop ? String(Math.round(cop)) : 'e.g. 10500000'}
                                          value={copInputs[r.id] ?? ''}
                                          onChange={e => setCopInputs(p => ({ ...p, [r.id]: e.target.value }))}
                                          style={inputStyle}
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {r.status === 'REVISION' && (
                                    <>
                                      <div>
                                        <label style={innerLabelStyle}>URL comprobante</label>
                                        <input
                                          placeholder="https://..."
                                          value={proofInputs[r.id] ?? ''}
                                          onChange={e => setProofInputs(p => ({ ...p, [r.id]: e.target.value }))}
                                          style={inputStyle}
                                        />
                                      </div>
                                      <div>
                                        <label style={innerLabelStyle}>Nota admin</label>
                                        <input
                                          placeholder="Nota interna (opcional)"
                                          value={noteInputs[r.id] ?? ''}
                                          onChange={e => setNoteInputs(p => ({ ...p, [r.id]: e.target.value }))}
                                          style={inputStyle}
                                        />
                                      </div>
                                    </>
                                  )}

                                  {r.status === 'POR_PAGAR' && (
                                    <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
                                      ⏳ Esperando confirmación de pago del cliente
                                    </div>
                                  )}

                                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {NEXT_ADMIN_STEP[r.status] && r.status !== 'POR_PAGAR' && (
                                      <button
                                        onClick={() => handleAdvance(r)}
                                        disabled={!!loading}
                                        style={{ background: 'linear-gradient(135deg, #334EAC, #401777)', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1 }}
                                      >
                                        {loading === r.id + (NEXT_ADMIN_STEP[r.status] ?? '') ? '...' : NEXT_LABELS[NEXT_ADMIN_STEP[r.status] ?? ''] ?? 'Avanzar'}
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleUpdate(r.id, 'CANCELADO')}
                                      disabled={!!loading}
                                      style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: loading ? 'wait' : 'pointer' }}
                                    >
                                      {loading === r.id + 'CANCELADO' ? '...' : 'Cancelar'}
                                    </button>
                                  </div>

                                  {r.admin_note && (
                                    <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)', fontStyle: 'italic', margin: 0 }}>Nota previa: {r.admin_note}</p>
                                  )}
                                </div>
                              )}

                              {isReadOnly && (
                                <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.35)' }}>Orden en estado final — sin acciones disponibles.</p>
                              )}
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
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', color: '#f87171', fontSize: 13 }}>
          {error}
        </div>
      )}

      {active.length === 0 && done.length === 0 && (
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(186,214,235,0.1)', borderRadius: 12, padding: '48px 24px', textAlign: 'center', color: 'rgba(186,214,235,0.4)', fontSize: 14 }}>
          No hay órdenes OTC.
        </div>
      )}

      {renderSection(active, 'Órdenes activas', false)}
      {renderSection(done, 'Completadas / Canceladas', true)}
    </div>
  )
}

function OtcStepper({ status }: { status: string }) {
  const stepIdx = getStepIndex(status)
  return (
    <div style={{ display: 'flex', gap: 0, marginTop: 8 }}>
      {OTC_STEPS.map((step, i) => {
        const done   = i < stepIdx
        const active = i === stepIdx
        return (
          <div key={step.status} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {i > 0 && <div style={{ position: 'absolute', left: 0, top: 10, width: '50%', height: 2, background: done || active ? '#334EAC' : 'rgba(186,214,235,0.1)' }} />}
            {i < OTC_STEPS.length - 1 && <div style={{ position: 'absolute', right: 0, top: 10, width: '50%', height: 2, background: done ? '#334EAC' : 'rgba(186,214,235,0.1)' }} />}
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
            <p style={{ fontSize: 9, marginTop: 5, textAlign: 'center', fontWeight: active ? 700 : 400, color: active ? 'rgba(255,255,255,0.85)' : done ? 'rgba(186,214,235,0.5)' : 'rgba(186,214,235,0.2)' }}>
              {step.label}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function DataRow({ label, children, bold, highlight }: { label: string; children: React.ReactNode; bold?: boolean; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: highlight ? '#10b981' : 'rgba(255,255,255,0.8)', fontWeight: bold || highlight ? 700 : 400 }}>
        {children}
      </span>
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(186,214,235,0.35)', borderBottom: '1px solid rgba(186,214,235,0.08)' }
const tdStyle: React.CSSProperties = { padding: '12px 14px', verticalAlign: 'middle' }
const expandLabelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(186,214,235,0.35)', marginBottom: 8, marginTop: 0 }
const innerLabelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(186,214,235,0.5)', marginBottom: 4 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(186,214,235,0.2)', fontSize: 12, color: 'white', background: 'rgba(255,255,255,0.07)', outline: 'none', boxSizing: 'border-box' }
