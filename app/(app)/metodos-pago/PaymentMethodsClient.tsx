'use client'
import { useState } from 'react'
import { PaymentProfileCard } from '@/components/entities/PaymentProfileCard'
import { Modal } from '@/components/ui/Modal'
import { PaymentProfileForm } from '@/components/entities/PaymentProfileForm'

interface Profile {
  id: string
  method: string
  label: string | null
  details: Record<string, unknown>
  is_default: boolean | null
  entity_type: string
  entity_id: string | null
}

interface PaymentMethodsClientProps {
  privyToken: string
  userId: string
  initialProfiles: Profile[]
}

export function PaymentMethodsClient({ privyToken, userId, initialProfiles }: PaymentMethodsClientProps) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [addOpen, setAddOpen] = useState(false)

  async function reload() {
    const { getPaymentProfiles } = await import('@/lib/actions/payment-profiles')
    const updated = await getPaymentProfiles(privyToken, 'USER_OWN', userId)
    setProfiles((updated ?? []) as Profile[])
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Your Payment Methods</h2>
          <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.4)', marginTop: 4 }}>
            Bank accounts and wallets where Convexo sends your payments.
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          style={{
            background: 'linear-gradient(135deg, #334EAC, #401777)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Add Method
        </button>
      </div>

      {profiles.length === 0 ? (
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 12,
          border: '1px solid rgba(186,214,235,0.1)',
          padding: '48px 24px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, color: 'rgba(186,214,235,0.4)', marginBottom: 16 }}>No payment methods yet.</p>
          <button
            onClick={() => setAddOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #334EAC, #401777)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Add your first payment method
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {profiles.map((p) => (
            <PaymentProfileCard
              key={p.id}
              profile={p as Parameters<typeof PaymentProfileCard>[0]['profile']}
              privyToken={privyToken}
              onUpdate={reload}
            />
          ))}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Payment Method">
        <PaymentProfileForm
          entityType="USER_OWN"
          entityId={userId}
          privyToken={privyToken}
          onSave={() => {
            setAddOpen(false)
            reload()
          }}
        />
      </Modal>
    </div>
  )
}
