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
  users: { email: string } | null
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
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Per-order editable fields
  const [spreadInputs, setSpreadInputs] = useState<Record<string, string>>({})
  const [rateInputs,   setRateInputs]   = useState<Record<string, string>>({})
  const [copInputs,    setCopInputs]    = useState<Record<string, string>>({})
  const [proofInputs,  setProofInputs]  = useState<Record<string, string>>({})
  const [noteInputs,   setNoteInputs]   = useState<Record<string, string>>({})

  // Only OTC orders
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', color: '#f87171', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Active orders */}
      {active.length === 0 ? (
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(186,214,235,0.1)', borderRadius: 12, padding: '48px 24px', textAlign: 'center', color: 'rgba(186,214,235,0.4)', fontSize: 14 }}>
          No hay órdenes OTC activas.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(186,214,235,0.5)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Órdenes activas — {active.length}
          </h2>
          {active.map(r => (
            <OtcCard
              key={r.id}
              req={r}
              loading={loading}
              spreadInput={spreadInputs[r.id] ?? ''}
              rateInput={rateInputs[r.id] ?? ''}
              copInput={copInputs[r.id] ?? ''}
              proofInput={proofInputs[r.id] ?? ''}
              noteInput={noteInputs[r.id] ?? ''}
              onSpread={v => setSpreadInputs(p => ({ ...p, [r.id]: v }))}
              onRate={v   => setRateInputs(p   => ({ ...p, [r.id]: v }))}
              onCop={v    => setCopInputs(p    => ({ ...p, [r.id]: v }))}
              onProof={v  => setProofInputs(p  => ({ ...p, [r.id]: v }))}
              onNote={v   => setNoteInputs(p   => ({ ...p, [r.id]: v }))}
              onAdvance={() => handleAdvance(r)}
              onCancel={() => handleUpdate(r.id, 'CANCELADO')}
            />
          ))}
        </div>
      )}

      {/* Completed */}
      {done.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(186,214,235,0.4)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Completadas / Canceladas — {done.length}
          </h2>
          {done.map(r => (
            <OtcCard
              key={r.id}
              req={r}
              loading={loading}
              spreadInput="" rateInput="" copInput="" proofInput="" noteInput=""
              onSpread={() => {}} onRate={() => {}} onCop={() => {}}
              onProof={() => {}} onNote={() => {}}
              onAdvance={() => {}} onCancel={() => {}}
              readOnly
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── OTC Card ──────────────────────────────────────────────────────────────────

function OtcCard({
  req, loading,
  spreadInput, rateInput, copInput, proofInput, noteInput,
  onSpread, onRate, onCop, onProof, onNote,
  onAdvance, onCancel,
  readOnly = false,
}: {
  req: WalletRequest
  loading: string | null
  spreadInput: string; rateInput: string; copInput: string; proofInput: string; noteInput: string
  onSpread: (v: string) => void; onRate: (v: string) => void; onCop: (v: string) => void
  onProof: (v: string) => void; onNote: (v: string) => void
  onAdvance: () => void; onCancel: () => void
  readOnly?: boolean
}) {
  const nextStatus = NEXT_ADMIN_STEP[req.status]
  const nextLabel  = nextStatus ? NEXT_LABELS[nextStatus] : null
  const isOtcStep  = getStepIndex(req.status) >= 0
  const stepIdx    = getStepIndex(req.status)

  const spread = req.spread_pct ?? req.metadata?.spread_pct ?? 0.01
  const baseRate = req.metadata?.usdcop_rate ?? null
  const cop      = req.metadata?.cop_amount ?? null
  const finalRate = baseRate ? (req.type === 'CASH_IN' ? baseRate * (1 + spread) : baseRate * (1 - spread)) : null

  const isBusy = (s: string) => loading === req.id + s

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(186,214,235,0.12)', borderRadius: 14, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(186,214,235,0.08)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
          background: req.type === 'CASH_IN' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
          color: req.type === 'CASH_IN' ? '#34d399' : '#f87171',
        }}>
          {req.type === 'CASH_IN' ? 'COMPRAR' : 'VENDER'}
        </span>
        <span style={{ fontSize: 12, color: 'rgba(186,214,235,0.5)' }}>{req.users?.email ?? '—'}</span>
        <span style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)' }}>#{req.id.slice(0, 8).toUpperCase()}</span>
        <span style={{ marginLeft: 'auto' }}><StatusBadge status={req.status} /></span>
        <span style={{ fontSize: 11, color: 'rgba(186,214,235,0.35)' }}>{new Date(req.created_at).toLocaleDateString()}</span>
      </div>

      {/* Metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 0, borderBottom: '1px solid rgba(186,214,235,0.08)' }}>
        {[
          { label: 'Token', value: `${Number(req.amount).toLocaleString()} ${req.currency}`, bold: true },
          { label: 'COP',   value: cop ? `$${Number(cop).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—' },
          { label: 'Tasa base', value: baseRate ? baseRate.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—' },
          { label: 'Spread', value: `${(spread * 100).toFixed(2)}%`, color: '#BAD6EB' },
          { label: 'Tasa final', value: finalRate ? finalRate.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—', color: '#10b981' },
          ...(req.paid_at ? [{ label: 'Fecha pago', value: new Date(req.paid_at).toLocaleDateString() }] : []),
        ].map((m, i) => (
          <div key={i} style={{ padding: '12px 16px', borderRight: '1px solid rgba(186,214,235,0.06)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(186,214,235,0.35)', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 14, fontWeight: m.bold ? 700 : 500, color: m.color ?? 'rgba(255,255,255,0.85)' }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Stepper */}
      {isOtcStep && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(186,214,235,0.06)' }}>
          <div style={{ display: 'flex', gap: 0 }}>
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
        </div>
      )}

      {/* Actions panel */}
      {!readOnly && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ORDERED or ACEPTADO: edit spread, rate, COP */}
          {(req.status === 'ORDERED' || req.status === 'ACEPTADO') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Spread % (override)</label>
                <input
                  type="number" min="0" step="0.1"
                  placeholder={`${(spread * 100).toFixed(2)}`}
                  value={spreadInput}
                  onChange={e => onSpread(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Tasa USD/COP (override)</label>
                <input
                  type="number" min="0" step="1"
                  placeholder={baseRate ? String(Math.round(baseRate)) : 'e.g. 4200'}
                  value={rateInput}
                  onChange={e => onRate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Monto COP (override)</label>
                <input
                  type="number" min="0" step="1"
                  placeholder={cop ? String(Math.round(cop)) : 'e.g. 10500000'}
                  value={copInput}
                  onChange={e => onCop(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          )}

          {/* REVISION: add proof URL */}
          {req.status === 'REVISION' && (
            <div>
              <label style={labelStyle}>Proof URL (comprobante)</label>
              <input
                placeholder="https://..."
                value={proofInput}
                onChange={e => onProof(e.target.value)}
                style={inputStyle}
              />
            </div>
          )}

          {/* Always: admin note */}
          <div>
            <label style={labelStyle}>Nota admin</label>
            <input
              placeholder="Nota interna (opcional)"
              value={noteInput}
              onChange={e => onNote(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {nextLabel && req.status !== 'POR_PAGAR' && (
              <button
                onClick={onAdvance}
                disabled={!!loading}
                style={{ background: 'linear-gradient(135deg, #334EAC, #401777)', color: 'white', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1 }}
              >
                {isBusy(nextStatus ?? '') ? '...' : nextLabel}
              </button>
            )}
            {req.status === 'POR_PAGAR' && (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '9px 16px', fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
                ⏳ Esperando confirmación de pago del cliente
              </div>
            )}
            <button
              onClick={onCancel}
              disabled={!!loading}
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: loading ? 'wait' : 'pointer' }}
            >
              {isBusy('CANCELADO') ? '...' : 'Cancelar'}
            </button>
          </div>

          {req.admin_note && (
            <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)', fontStyle: 'italic' }}>Nota previa: {req.admin_note}</p>
          )}
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(186,214,235,0.5)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(186,214,235,0.2)', fontSize: 13, color: 'white', background: 'rgba(255,255,255,0.07)', outline: 'none', boxSizing: 'border-box' }
