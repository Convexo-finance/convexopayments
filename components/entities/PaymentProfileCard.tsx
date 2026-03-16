'use client'
import { useState } from 'react'
import QRCode from 'react-qr-code'
import { Modal } from '@/components/ui/Modal'
import { PaymentProfileForm } from './PaymentProfileForm'

const CHAIN_COLORS: Record<string, string> = {
  Ethereum: '#627eea',
  Solana:   '#9945ff',
  Tron:     '#ef0027',
}

const METHOD_ICONS: Record<string, string> = {
  BANK: '🏦',
  CRYPTO: '₿',
  WECHAT: '💚',
  ALIBABA: '🧧',
  PAYPAL: '🅿️',
  CASH: '💵',
}

interface PaymentProfileCardProps {
  profile: {
    id: string
    method: string
    label: string | null
    details: Record<string, string>
    is_default: boolean | null
    entity_type: string
    entity_id: string | null
  }
  privyToken: string
  onUpdate: () => void
}

export function PaymentProfileCard({
  profile,
  privyToken,
  onUpdate,
}: PaymentProfileCardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showQR, setShowQR] = useState(false)

  async function handleDelete() {
    if (!confirm('Remove this payment method?')) return
    setDeleting(true)
    try {
      const { deactivatePaymentProfile } = await import('@/lib/actions/payment-profiles')
      await deactivatePaymentProfile(privyToken, profile.id)
      onUpdate()
    } finally {
      setDeleting(false)
    }
  }

  const details = profile.details as Record<string, string>

  return (
    <>
      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${profile.is_default ? 'rgba(186,214,235,0.3)' : 'rgba(186,214,235,0.1)'}`,
          borderRadius: 12,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          {METHOD_ICONS[profile.method] ?? '💳'}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
              {profile.label ?? profile.method}
            </span>
            {profile.is_default && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: '#334EAC',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: 10,
                  letterSpacing: '0.5px',
                }}
              >
                DEFAULT
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)', marginTop: 4 }}>
            {profile.method === 'BANK' && (
              <span>{details.bank_name} · {details.account_number}</span>
            )}
            {profile.method === 'CRYPTO' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {details.network && (
                    <span style={{
                      background: (CHAIN_COLORS[details.network] ?? '#888') + '22',
                      color: CHAIN_COLORS[details.network] ?? '#888',
                      padding: '1px 7px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                    }}>
                      {details.network}
                    </span>
                  )}
                  <span>{details.token}</span>
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(186,214,235,0.6)', wordBreak: 'break-all' }}>
                  {details.address}
                </div>
                {details.address && (
                  <button
                    type="button"
                    onClick={() => setShowQR((v) => !v)}
                    style={{ alignSelf: 'flex-start', background: 'none', border: '1px solid rgba(186,214,235,0.2)', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: 'rgba(186,214,235,0.6)', cursor: 'pointer', marginTop: 2 }}
                  >
                    {showQR ? 'Hide QR' : 'Show QR'}
                  </button>
                )}
                {showQR && details.address && (
                  <div style={{ background: 'white', borderRadius: 8, padding: 10, display: 'inline-block', marginTop: 4 }}>
                    <QRCode value={details.address} size={130} />
                  </div>
                )}
              </div>
            )}
            {profile.method === 'WECHAT' && <span>WeChat: {details.wechat_id}</span>}
            {profile.method === 'ALIBABA' && <span>Alibaba: {details.alibaba_id}</span>}
            {profile.method === 'PAYPAL' && <span>{details.email}</span>}
            {profile.method === 'CASH' && <span>{details.currency} cash</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => setEditOpen(true)}
            style={actionBtnStyle}
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{ ...actionBtnStyle, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
          >
            {deleting ? '...' : 'Remove'}
          </button>
        </div>
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Payment Method"
      >
        <PaymentProfileForm
          entityType={profile.entity_type}
          entityId={profile.entity_id ?? ''}
          privyToken={privyToken}
          initial={{
            id: profile.id,
            method: profile.method as 'BANK',
            label: profile.label ?? undefined,
            details: details,
            is_default: profile.is_default ?? false,
          }}
          onSave={() => {
            setEditOpen(false)
            onUpdate()
          }}
        />
      </Modal>
    </>
  )
}

const actionBtnStyle: React.CSSProperties = {
  padding: '5px 10px',
  borderRadius: 6,
  border: '1px solid rgba(186,214,235,0.2)',
  background: 'rgba(255,255,255,0.08)',
  color: 'rgba(186,214,235,0.8)',
  fontSize: 12,
  cursor: 'pointer',
}
