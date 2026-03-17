import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { getSessionUser } from '@/lib/actions/auth'
import { SecurityClient } from './SecurityClient'

export default async function SecurityPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/')

  const user = await getSessionUser(privyToken).catch(() => null)
  if (!user) redirect('/')

  return (
    <div>
      <Topbar title="Seguridad" breadcrumb="Clave de wallet y ajustes de seguridad" />
      <div style={{ padding: 24, maxWidth: 640 }}>
        <SecurityClient />
      </div>
    </div>
  )
}
