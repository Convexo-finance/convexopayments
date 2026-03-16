import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { adminGetClientById } from '@/lib/actions/admin'
import { EntityDetailView } from '@/components/admin/EntityDetailView'

export default async function AdminClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/')

  let result: Awaited<ReturnType<typeof adminGetClientById>>
  try {
    result = await adminGetClientById(privyToken, id)
  } catch {
    redirect('/admin/clientes')
  }

  return (
    <div>
      <Topbar title={result.internal_name as string} breadcrumb="Admin / Clientes" />
      <div style={{ padding: 24 }} className="admin-page-pad">
        <div style={{ marginBottom: 20 }}>
          <Link href="/admin/clientes" style={{ fontSize: 13, color: '#BAD6EB', textDecoration: 'none' }}>
            ← Volver a Clientes
          </Link>
        </div>
        <EntityDetailView
          entity={result as unknown as Record<string, unknown>}
          profiles={(result.paymentProfiles ?? []) as Parameters<typeof EntityDetailView>[0]['profiles']}
          orders={(result.orders ?? []) as Parameters<typeof EntityDetailView>[0]['orders']}
          entityType="client"
        />
      </div>
    </div>
  )
}
