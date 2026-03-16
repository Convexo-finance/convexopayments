import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { adminGetSupplierById } from '@/lib/actions/admin'
import { EntityDetailView } from '@/components/admin/EntityDetailView'

export default async function AdminSupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/')

  let result: Awaited<ReturnType<typeof adminGetSupplierById>>
  try {
    result = await adminGetSupplierById(privyToken, id)
  } catch {
    redirect('/admin/proveedores')
  }

  return (
    <div>
      <Topbar title={result.internal_name as string} breadcrumb="Admin / Proveedores" />
      <div style={{ padding: 24 }} className="admin-page-pad">
        <div style={{ marginBottom: 20 }}>
          <Link href="/admin/proveedores" style={{ fontSize: 13, color: '#BAD6EB', textDecoration: 'none' }}>
            ← Volver a Proveedores
          </Link>
        </div>
        <EntityDetailView
          entity={result as unknown as Record<string, unknown>}
          profiles={(result.paymentProfiles ?? []) as Parameters<typeof EntityDetailView>[0]['profiles']}
          orders={(result.orders ?? []) as Parameters<typeof EntityDetailView>[0]['orders']}
          entityType="supplier"
        />
      </div>
    </div>
  )
}
