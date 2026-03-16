'use client'
import { useState } from 'react'
import { StatusBadge } from '@/components/ui/StatusBadge'

interface Order {
  id: string
  type: string
  amount: number
  currency: string
  status: string
  reference: string | null
  invoice_url: string | null
  proof_url: string | null
  txn_hash: string | null
  created_at: string | null
  rejection_reason?: string | null
  users?: { email: string } | null
  suppliers?: { internal_name: string } | { internal_name: string }[] | null
  clients?: { internal_name: string } | { internal_name: string }[] | null
}

interface AdminOrderTableProps {
  orders: Order[]
  privyToken: string
}

const NEXT_STATUSES: Record<string, string[]> = {
  OPENED:      ['EN_REVISION'],
  ORDERED:     ['EN_REVISION'],
  EN_REVISION: ['PROCESANDO', 'RECHAZADO'],
  PROCESANDO:  ['PAYED', 'RECHAZADO'],
}

function getEntityName(order: Order): string {
  const obj = order.type === 'PAY' ? order.suppliers : order.clients
  if (!obj) return '—'
  const record = Array.isArray(obj) ? obj[0] : obj
  return record?.internal_name ?? '—'
}

export function AdminOrderTable({ orders, privyToken }: AdminOrderTableProps) {
  const [updating, setUpdating] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<Record<string, string>>({})
  const [selectedStatus, setSelectedStatus] = useState<Record<string, string>>({})
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({})
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({})
  const [uploadingProof, setUploadingProof] = useState<string | null>(null)
  const [localOrders, setLocalOrders] = useState(orders)

  async function handleProofUpload(orderId: string, file: File) {
    setUploadingProof(orderId)
    try {
      const { adminUploadProof } = await import('@/lib/actions/admin')
      const url = await adminUploadProof(privyToken, orderId, file)
      setProofUrls((p) => ({ ...p, [orderId]: url }))
      return url
    } finally {
      setUploadingProof(null)
    }
  }

  async function handleUpdate(orderId: string) {
    const newStatus = selectedStatus[orderId]
    if (!newStatus) return
    if (newStatus === 'PAGADO' && !proofUrls[orderId]) {
      setUpdateError((e) => ({ ...e, [orderId]: 'Upload proof of payment before marking as paid.' }))
      return
    }
    setUpdating(orderId)
    setUpdateError((e) => ({ ...e, [orderId]: '' }))
    try {
      const { adminUpdateOrderStatus } = await import('@/lib/actions/admin')
      await adminUpdateOrderStatus(privyToken, orderId, newStatus, {
        rejectionReason: rejectionReasons[orderId],
        proofUrl: proofUrls[orderId],
      })
      setLocalOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, proof_url: proofUrls[orderId] ?? o.proof_url } : o))
      )
      setSelectedStatus((s) => ({ ...s, [orderId]: '' }))
    } catch (err: unknown) {
      setUpdateError((e) => ({ ...e, [orderId]: err instanceof Error ? err.message : 'Update failed' }))
    } finally {
      setUpdating(null)
    }
  }

  if (!localOrders || localOrders.length === 0) {
    return <p style={{ color: '#aaa', fontSize: 14, padding: '24px 0' }}>No orders.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {localOrders.map((o) => {
        const nextOptions = NEXT_STATUSES[o.status] ?? []
        const entityName = getEntityName(o)
        const pendingStatus = selectedStatus[o.id]

        return (
          <div key={o.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #e8e4dc', padding: 20 }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#081F5C' }}>
                  {o.users?.email ?? '—'}
                </div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                  {entityName}
                  {o.reference && <span style={{ marginLeft: 8, color: '#aaa' }}>· {o.reference}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <StatusBadge status={o.status} />
                <span style={{ fontSize: 15, fontWeight: 800, color: '#081F5C' }}>
                  {Number(o.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {o.currency}
                </span>
              </div>
            </div>

            {/* Links row */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: '#aaa' }}>
                {o.created_at ? new Date(o.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
              </span>
              {o.txn_hash && (
                <span style={{ fontSize: 12, color: '#6d28d9', fontWeight: 600, fontFamily: 'monospace' }}
                  title={o.txn_hash}>
                  TxID: {o.txn_hash.slice(0, 16)}…
                </span>
              )}
              {o.invoice_url && (
                <a
                  href={o.invoice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: '#334EAC', fontWeight: 600, textDecoration: 'none' }}
                >
                  📄 View Invoice →
                </a>
              )}
              {o.proof_url && (
                <a
                  href={o.proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: '#10b981', fontWeight: 600, textDecoration: 'none' }}
                >
                  ✓ View Payment Proof →
                </a>
              )}
              {o.rejection_reason && (
                <span style={{ fontSize: 12, color: '#ef4444' }}>
                  Rejected: {o.rejection_reason}
                </span>
              )}
            </div>

            {/* Actions */}
            {nextOptions.length > 0 && (
              <div style={{ borderTop: '1px solid #f0ece4', paddingTop: 14 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <select
                    value={pendingStatus ?? ''}
                    onChange={(e) => setSelectedStatus((s) => ({ ...s, [o.id]: e.target.value }))}
                    style={selectStyle}
                  >
                    <option value="">Select next status...</option>
                    {nextOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>

                  {pendingStatus === 'RECHAZADO' && (
                    <input
                      placeholder="Rejection reason (required)"
                      value={rejectionReasons[o.id] ?? ''}
                      onChange={(e) => setRejectionReasons((r) => ({ ...r, [o.id]: e.target.value }))}
                      style={{ ...selectStyle, flex: 1, minWidth: 200 }}
                    />
                  )}

                  {pendingStatus && pendingStatus !== 'RECHAZADO' && (
                    <button
                      onClick={() => handleUpdate(o.id)}
                      disabled={updating === o.id}
                      style={actionBtnStyle}
                    >
                      {updating === o.id ? 'Updating...' : 'Confirm →'}
                    </button>
                  )}

                  {pendingStatus === 'RECHAZADO' && rejectionReasons[o.id] && (
                    <button
                      onClick={() => handleUpdate(o.id)}
                      disabled={updating === o.id}
                      style={{ ...actionBtnStyle, background: '#ef4444' }}
                    >
                      {updating === o.id ? 'Updating...' : 'Reject Order'}
                    </button>
                  )}
                </div>

                {/* Proof upload — only when transitioning to PAGADO */}
                {pendingStatus === 'PAGADO' && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 }}>
                      Upload proof of payment <span style={{ color: '#ef4444' }}>*</span>
                    </p>
                    {proofUrls[o.id] ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ background: '#d1fae5', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#065f46', fontWeight: 600 }}>
                          ✓ Proof uploaded
                        </div>
                        <a href={proofUrls[o.id]} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#334EAC' }}>
                          View →
                        </a>
                        <button
                          onClick={() => setProofUrls((p) => { const next = { ...p }; delete next[o.id]; return next })}
                          style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          Replace
                        </button>
                        <button
                          onClick={() => handleUpdate(o.id)}
                          disabled={updating === o.id}
                          style={{ ...actionBtnStyle, background: '#10b981', marginLeft: 4 }}
                        >
                          {updating === o.id ? 'Saving...' : 'Mark as PAGADO →'}
                        </button>
                      </div>
                    ) : (
                      <label style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '8px 14px', borderRadius: 8,
                        border: '2px dashed #d1d5db', background: '#fafafa',
                        fontSize: 13, color: '#555', cursor: uploadingProof === o.id ? 'wait' : 'pointer',
                      }}>
                        {uploadingProof === o.id ? 'Uploading...' : '📎 Click to upload proof (PDF, JPG, PNG)'}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          style={{ display: 'none' }}
                          disabled={uploadingProof === o.id}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleProofUpload(o.id, file)
                          }}
                        />
                      </label>
                    )}
                  </div>
                )}

                {updateError[o.id] && (
                  <p style={{ color: '#ef4444', fontSize: 12, marginTop: 8 }}>{updateError[o.id]}</p>
                )}
              </div>
            )}

            {nextOptions.length === 0 && (
              <div style={{ borderTop: '1px solid #f0ece4', paddingTop: 10 }}>
                <span style={{ color: '#aaa', fontSize: 12 }}>No further actions available for this order.</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const selectStyle: React.CSSProperties = { padding: '7px 10px', borderRadius: 7, border: '1px solid #e5e7eb', fontSize: 13, color: '#081F5C', background: 'white', minWidth: 180 }
const actionBtnStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #334EAC, #401777)', color: 'white', border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
