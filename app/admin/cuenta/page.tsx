import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { createClient } from '@/lib/supabase/server'
import { WalletRequestManager } from './WalletRequestManager'

export default async function AdminCuentaPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/')

  const supabase = await createClient(privyToken)
  let requests: unknown[] = []
  try {
    const { data } = await supabase
      .from('wallet_requests')
      .select(`*, users(id, email, profiles(first_name, last_name, phone, phone_country_code))`)
      .order('created_at', { ascending: false })
      .limit(100)
    requests = data ?? []
  } catch {
    requests = []
  }

  return (
    <div>
      <Topbar title="OTC Orders" breadcrumb="Comprar & Vender — manage OTC flow" />
      <div style={{ padding: 24 }}>
        <WalletRequestManager
          requests={(requests ?? []) as Parameters<typeof WalletRequestManager>[0]['requests']}
          privyToken={privyToken}
        />
      </div>
    </div>
  )
}
