import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { ProfileClient } from './ProfileClient'
import { getProfile } from '@/lib/actions/profile'
import { getSessionUser } from '@/lib/actions/auth'

export default async function PerfilPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/login')

  const [profile, user] = await Promise.all([
    getProfile(privyToken).catch(() => null),
    getSessionUser(privyToken).catch(() => null),
  ])

  return (
    <div>
      <Topbar title="Profile" breadcrumb="Manage your personal details" />
      <div style={{ padding: 24 }}>
        <ProfileClient
          privyToken={privyToken}
          initialProfile={profile}
          initialPaymentProfiles={[]}
          userId={user?.id}
        />
      </div>
    </div>
  )
}
