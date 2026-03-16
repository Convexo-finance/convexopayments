import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { getSessionUser } from '@/lib/actions/auth'
import { AuthSettingsClient } from './AuthSettingsClient'

export default async function AuthSettingsPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/login')

  const user = await getSessionUser(privyToken).catch(() => null)
  if (!user) redirect('/login')

  return (
    <div>
      <Topbar title="Authentication" breadcrumb="Manage your sign-in methods" />
      <div style={{ padding: 24, maxWidth: 640 }}>
        <AuthSettingsClient />
      </div>
    </div>
  )
}
