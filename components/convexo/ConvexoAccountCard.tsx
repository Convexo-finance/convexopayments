'use client'
import { useState } from 'react'
import QRCode from 'react-qr-code'
import { Modal } from '@/components/ui/Modal'
import { ConvexoAccountForm } from './ConvexoAccountForm'

const CHAIN_COLORS: Record<string, string> = {
  Ethereum: '#627eea',
  Solana:   '#9945ff',
  Tron:     '#ef0027',
}

interface ConvexoAccountCardProps {
  account: {
    id: string
    method: string
    label: string | null
    details: Record<string, string>
    is_default: boolean
    is_active: boolean
  }
  privyToken: string
  onUpdate: () => void
}

export function ConvexoAccountCard({ account, privyToken, onUpdate }: ConvexoAccountCardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const details = account.details as Record<string, string>

  async function handleDeactivate() {
    if (!confirm('Remove this account?')) return
    setDeleting(true)
    try {
      const { deactivateConvexoAccount } = await import('@/lib/actions/convexo-accounts')
      await deactivateConvexoAccount(privyToken, account.id)
      onUpdate()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div style={{
        background: 'white', borderRadius: 12,
        border: `1px solid ${account.is_default ? '#c7d7f0' : '#e8e4dc'}`,
        padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
          {account.method === 'BANK' ? '🏦' : account.method === 'CASH' ? '💵' : '₿'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#081F5C' }}>{account.label ?? account.method}</span>
            {account.is_default && (
              <span style={{ fontSize: 10, fontWeight: 700, background: '#334EAC', color: 'white', padding: '2px 8px', borderRadius: 10 }}>DEFAULT</span>
            )}
          </div>

          <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
            {account.method === 'BANK' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {details.direction && <DirectionBadge direction={details.direction} />}
                <span>{[details.bank_name, details.account_number, details.currency].filter(Boolean).join(' · ')}</span>
                {(details.branch_code || details.bank_code) && (
                  <span style={{ fontSize: 11, color: '#aaa' }}>
                    {details.branch_code && `Branch: ${details.branch_code}`}
                    {details.branch_code && details.bank_code && ' · '}
                    {details.bank_code && `Bank code: ${details.bank_code}`}
                  </span>
                )}
              </div>
            )}
            {account.method === 'CASH' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {details.direction && (
                  <DirectionBadge direction={details.direction} />
                )}
                {(details.city || details.state) && (
                  <span style={{ color: '#555' }}>
                    {[details.place_name, details.city, details.state].filter(Boolean).join(', ')}
                  </span>
                )}
                {details.address && (
                  <span style={{ color: '#888', fontSize: 11 }}>{details.address}</span>
                )}
                {details.instructions && (
                  <span style={{ color: '#999', fontStyle: 'italic', fontSize: 11 }}>{details.instructions}</span>
                )}
              </div>
            )}
            {account.method === 'CRYPTO' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {details.network && (
                    <span style={{ background: (CHAIN_COLORS[details.network] ?? '#888') + '22', color: CHAIN_COLORS[details.network] ?? '#888', padding: '1px 7px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                      {details.network}
                    </span>
                  )}
                  <span>{details.token}</span>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#555', wordBreak: 'break-all' }}>{details.address}</div>
                {details.address && (
                  <button type="button" onClick={() => setShowQR((v) => !v)}
                    style={{ alignSelf: 'flex-start', background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: '#555', cursor: 'pointer' }}>
                    {showQR ? 'Hide QR' : 'Show QR'}
                  </button>
                )}
                {showQR && details.address && (
                  <div style={{ background: 'white', borderRadius: 8, padding: 10, display: 'inline-block', border: '1px solid #e5e7eb' }}>
                    <QRCode value={details.address} size={130} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setEditOpen(true)} style={btnStyle}>Edit</button>
          <button onClick={handleDeactivate} disabled={deleting} style={{ ...btnStyle, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
            {deleting ? '...' : 'Remove'}
          </button>
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Convexo Account">
        <ConvexoAccountForm
          privyToken={privyToken}
          initial={{ id: account.id, method: account.method as 'BANK' | 'CRYPTO' | 'CASH', label: account.label ?? undefined, details, is_default: account.is_default }}
          onSave={() => { setEditOpen(false); onUpdate() }}
        />
      </Modal>
    </>
  )
}

function DirectionBadge({ direction }: { direction: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    COMPRAR:     { bg: '#d1fae5', color: '#065f46', label: 'COMPRAR' },
    VENDER:      { bg: '#fef3c7', color: '#92400e', label: 'VENDER' },
    OTC:         { bg: '#e0e7ff', color: '#3730a3', label: 'COMPRAR + VENDER' },
    COLLECTIONS: { bg: '#fce7f3', color: '#9d174d', label: 'COLLECTIONS' },
    ALL:         { bg: '#f3f4f6', color: '#374151', label: 'ALL' },
  }
  const style = map[direction] ?? { bg: '#f3f4f6', color: '#374151', label: direction }
  return (
    <span style={{ background: style.bg, color: style.color, padding: '1px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, display: 'inline-block' }}>
      {style.label}
    </span>
  )
}

const btnStyle: React.CSSProperties = { padding: '5px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontSize: 12, cursor: 'pointer' }
