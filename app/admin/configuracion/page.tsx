import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { adminGetConvexoAccounts } from '@/lib/actions/convexo-accounts'
import { ConvexoProfileManager } from './ConvexoProfileManager'

export default async function AdminConfiguracionPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/login')

  const accounts = await adminGetConvexoAccounts(privyToken).catch(() => [])

  return (
    <div>
      <Topbar title="Convexo Config" breadcrumb="Manage Convexo receiving accounts" />
      <div style={{ padding: 24, maxWidth: 800 }}>
        <ConvexoProfileManager
          privyToken={privyToken}
          initialAccounts={(accounts ?? []) as unknown as Parameters<typeof ConvexoProfileManager>[0]['initialAccounts']}
        />
      </div>
    </div>
  )
}
