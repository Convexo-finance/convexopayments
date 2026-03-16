'use client'
import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ConvexoAccountForm } from '@/components/convexo/ConvexoAccountForm'
import { ConvexoAccountCard } from '@/components/convexo/ConvexoAccountCard'

export type ConvexoAccount = {
  id: string
  method: string
  label: string | null
  details: Record<string, string>
  is_default: boolean
  is_active: boolean
}

interface ConvexoProfileManagerProps {
  privyToken: string
  initialAccounts: ConvexoAccount[]
}

export function ConvexoProfileManager({ privyToken, initialAccounts }: ConvexoProfileManagerProps) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [addOpen, setAddOpen] = useState(false)

  async function reload() {
    const { adminGetConvexoAccounts } = await import('@/lib/actions/convexo-accounts')
    const updated = await adminGetConvexoAccounts(privyToken)
    setAccounts((updated ?? []) as ConvexoAccount[])
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#081F5C' }}>Convexo Receiving Accounts</h2>
          <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            Bank accounts and crypto wallets where users send funds. Shown to users during payment.
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          style={{ background: 'linear-gradient(135deg, #334EAC, #401777)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          + Add Account
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {accounts.length === 0 ? (
          <p style={{ color: '#aaa', fontSize: 14, padding: '24px 0' }}>No Convexo accounts configured yet.</p>
        ) : (
          accounts.map((a) => (
            <ConvexoAccountCard key={a.id} account={a} privyToken={privyToken} onUpdate={reload} />
          ))
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Convexo Account">
        <ConvexoAccountForm
          privyToken={privyToken}
          onSave={() => { setAddOpen(false); reload() }}
        />
      </Modal>
    </div>
  )
}
