import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { getClientById } from '@/lib/actions/entities'
import { getPaymentProfiles } from '@/lib/actions/payment-profiles'
import { EntityDetailClient } from '@/components/entities/EntityDetailClient'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/')

  const [client, profiles] = await Promise.all([
    getClientById(privyToken, id).catch(() => null),
    getPaymentProfiles(privyToken, 'CLIENT', id).catch(() => []),
  ])

  if (!client) redirect('/clientes')

  return (
    <div>
      <Topbar title={client.internal_name} breadcrumb="Client detail" />
      <div style={{ padding: 24, maxWidth: 900 }}>
        <EntityDetailClient
          entity={client as Parameters<typeof EntityDetailClient>[0]['entity']}
          entityType="CLIENT"
          profiles={(profiles ?? []) as Parameters<typeof EntityDetailClient>[0]['profiles']}
          privyToken={privyToken}
          backHref="/clientes"
        />
      </div>
    </div>
  )
}
