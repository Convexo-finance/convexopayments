import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { BroadcastForm } from './BroadcastForm'

export default async function AdminNotificacionesPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/')

  return (
    <div>
      <Topbar title="Broadcast Notification" breadcrumb="Send messages to users" />
      <div style={{ padding: 24, maxWidth: 600 }}>
        <BroadcastForm privyToken={privyToken} />
      </div>
    </div>
  )
}
