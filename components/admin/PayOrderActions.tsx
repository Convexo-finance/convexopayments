'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileUpload } from '@/components/ui/FileUpload'

interface PayOrderActionsProps {
  orderId: string
  status: string
  privyToken: string
}

const NEXT_ACTION: Record<string, { label: string; next: string }> = {
  OPENED:      { label: 'Mover a Revisión',   next: 'EN_REVISION' },
  ORDERED:     { label: 'Mover a Revisión',   next: 'EN_REVISION' },
  EN_REVISION: { label: 'Iniciar Proceso',    next: 'PROCESANDO' },
  PROCESANDO:  { label: 'Marcar como Pagado', next: 'PAYED' },
}

const TERMINAL = ['PAYED', 'RECHAZADO']

export function PayOrderActions({ orderId, status, privyToken }: PayOrderActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (TERMINAL.includes(status)) {
    return (
      <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.4)' }}>Esta orden está en estado final. No hay acciones disponibles.</p>
    )
  }

  const next = NEXT_ACTION[status]

  async function handleAdvance() {
    setLoading(true); setError(null)
    try {
      const { adminUpdateOrderStatus } = await import('@/lib/actions/admin')
      await adminUpdateOrderStatus(privyToken, orderId, next.next, {
        proofUrl: status === 'PROCESANDO' ? proofUrl : undefined,
      })
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally { setLoading(false) }
  }

  async function handleReject() {
    if (!reason.trim()) { setError('Ingresa el motivo de rechazo'); return }
    setLoading(true); setError(null)
    try {
      const { adminUpdateOrderStatus } = await import('@/lib/actions/admin')
      await adminUpdateOrderStatus(privyToken, orderId, 'RECHAZADO', { rejectionReason: reason })
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {status === 'PROCESANDO' && (
        <div>
          <label style={labelStyle}>Comprobante de pago <span style={{ color: '#ef4444' }}>*</span></label>
          <FileUpload
            label="Subir comprobante (PDF, JPG, PNG)"
            accept=".pdf,.jpg,.jpeg,.png"
            currentUrl={proofUrl || undefined}
            onUpload={async (file) => {
              const { uploadAdminProof } = await import('@/lib/actions/admin')
              const url = await uploadAdminProof(privyToken, file)
              setProofUrl(url)
              return url
            }}
          />
        </div>
      )}

      {next && (
        <button
          onClick={handleAdvance}
          disabled={loading || (status === 'PROCESANDO' && !proofUrl)}
          style={{ ...primaryBtn, opacity: (status === 'PROCESANDO' && !proofUrl) ? 0.5 : 1, cursor: (status === 'PROCESANDO' && !proofUrl) ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Procesando...' : next.label}
        </button>
      )}

      {!rejecting ? (
        <button onClick={() => setRejecting(true)} style={dangerOutlineBtn}>
          Rechazar orden
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={labelStyle}>Motivo de rechazo</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explica el motivo..."
            style={{ ...inputStyle, resize: 'vertical' as const }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleReject} disabled={loading} style={dangerBtn}>
              {loading ? '...' : 'Confirmar rechazo'}
            </button>
            <button onClick={() => { setRejecting(false); setReason('') }} style={secondaryBtn}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ color: '#ef4444', fontSize: 12 }}>{error}</p>}
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(186,214,235,0.7)', marginBottom: 4 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(186,214,235,0.2)', fontSize: 13, color: 'white', background: 'rgba(255,255,255,0.07)', outline: 'none', boxSizing: 'border-box' }
const primaryBtn: React.CSSProperties = { background: 'linear-gradient(135deg, #334EAC, #401777)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%' }
const dangerBtn: React.CSSProperties = { background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', flex: 1 }
const dangerOutlineBtn: React.CSSProperties = { background: 'transparent', color: '#ef4444', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%' }
const secondaryBtn: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', color: 'rgba(186,214,235,0.7)', border: '1px solid rgba(186,214,235,0.2)', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer', flex: 1 }
