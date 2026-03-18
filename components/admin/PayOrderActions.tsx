'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileUpload } from '@/components/ui/FileUpload'
import { AdminAcceptForm } from './AdminAcceptForm'

interface PayOrderActionsProps {
  orderId: string
  status: string
  privyToken: string
  orderAmount?: number | null
  defaultFee?: number | null
  defaultRate?: number | null
  defaultFiatAmount?: number | null
  defaultConvexoAccountId?: string | null
  currency: string
  fiatCurrency?: string | null
}

const TERMINAL = ['PAYED', 'RECHAZADO', 'CANCELADO']

export function PayOrderActions({
  orderId,
  status,
  privyToken,
  orderAmount,
  defaultFee,
  defaultRate,
  defaultFiatAmount,
  defaultConvexoAccountId,
  currency,
  fiatCurrency,
}: PayOrderActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (TERMINAL.includes(status)) {
    return (
      <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.4)' }}>
        Esta orden está en estado final. No hay acciones disponibles.
      </p>
    )
  }

  async function handleAdvance(next: string) {
    if (next === 'PAYED' && !proofUrl) {
      setError('Debes subir el comprobante de pago antes de marcar como pagado.')
      return
    }
    setLoading(true); setError(null)
    try {
      const { adminUpdateOrderStatus } = await import('@/lib/actions/admin')
      await adminUpdateOrderStatus(privyToken, orderId, next, {
        proofUrl: next === 'PAYED' ? proofUrl : undefined,
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* OPENED → Admin reviews and accepts */}
      {status === 'OPENED' && (
        <AdminAcceptForm
          orderId={orderId}
          privyToken={privyToken}
          orderAmount={orderAmount}
          defaultFee={defaultFee}
          defaultRate={defaultRate}
          defaultFiatAmount={defaultFiatAmount}
          defaultConvexoAccountId={defaultConvexoAccountId}
          currency={currency}
          fiatCurrency={fiatCurrency}
        />
      )}

      {/* ACCEPTED → Waiting for user payment, no admin advance action */}
      {status === 'ACCEPTED' && (
        <div style={{ background: 'rgba(91,33,182,0.08)', border: '1px solid rgba(91,33,182,0.2)', borderRadius: 8, padding: '10px 14px' }}>
          <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.7)' }}>
            Orden aceptada. Esperando que el usuario complete su pago.
          </p>
        </div>
      )}

      {/* ORDERED → Admin starts processing */}
      {status === 'ORDERED' && (
        <button
          onClick={() => handleAdvance('PROCESSING')}
          disabled={loading}
          style={{ ...primaryBtn, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Procesando...' : 'Iniciar Procesamiento'}
        </button>
      )}

      {/* PROCESSING → Admin uploads proof and marks paid */}
      {status === 'PROCESSING' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={labelStyle}>
            Comprobante de pago al proveedor <span style={{ color: '#ef4444' }}>*</span>
          </label>
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
          <button
            onClick={() => handleAdvance('PAYED')}
            disabled={loading || !proofUrl}
            style={{ ...primaryBtn, opacity: (!proofUrl || loading) ? 0.5 : 1, cursor: (!proofUrl || loading) ? 'not-allowed' : 'pointer', background: '#10b981' }}
          >
            {loading ? 'Guardando...' : '✓ Marcar como Pagado'}
          </button>
        </div>
      )}

      {/* Reject — available for OPENED, ACCEPTED, ORDERED, PROCESSING */}
      {['OPENED', 'ACCEPTED', 'ORDERED', 'PROCESSING'].includes(status) && (
        <>
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
        </>
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
