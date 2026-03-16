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
              <div style={{ position: 'absolute', left: 0, top: 10, width: '50%', height: 2, background: done || active ? '#334EAC' : 'rgba(186,214,235,0.15)' }} />
            )}
            {i < PAY_STEPS.length - 1 && (
              <div style={{ position: 'absolute', right: 0, top: 10, width: '50%', height: 2, background: done ? '#334EAC' : 'rgba(186,214,235,0.15)' }} />
            )}
            <div style={{
              width: 22, height: 22, borderRadius: '50%', zIndex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: done ? '#334EAC' : active ? '#BAD6EB' : 'rgba(255,255,255,0.08)',
              border: `2px solid ${done || active ? '#334EAC' : 'rgba(186,214,235,0.2)'}`,
              fontSize: 10, fontWeight: 700,
              color: done ? 'white' : active ? '#02001A' : 'rgba(186,214,235,0.4)',
            }}>
              {done ? '✓' : i + 1}
            </div>
            <p style={{ fontSize: 9, marginTop: 5, textAlign: 'center', fontWeight: active ? 700 : 400, color: active ? '#BAD6EB' : done ? '#334EAC' : 'rgba(186,214,235,0.4)' }}>
              {step.label}
            </p>
          </div>
        )
      })}
    </div>
  )
}

interface HistoryEntry { status: string; changed_at: string; changed_by?: string }

const STATUS_LABELS: Record<string, string> = {
  OPENED: 'Abierto', ORDERED: 'Ordenado', EN_REVISION: 'En Revisión',
  PROCESANDO: 'Procesando', PAYED: 'Pagado', RECHAZADO: 'Rechazado',
  DRAFT: 'Borrador',
}

export function StatusTimeline({ history }: { history: HistoryEntry[] }) {
  if (!history || history.length === 0) return (
    <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)' }}>Sin historial registrado.</p>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[...history].reverse().map((h, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#334EAC', marginTop: 4, flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{STATUS_LABELS[h.status] ?? h.status}</span>
            <div style={{ fontSize: 11, color: 'rgba(186,214,235,0.4)', marginTop: 2 }}>
              {new Date(h.changed_at).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
