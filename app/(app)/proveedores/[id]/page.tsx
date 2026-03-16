import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { createClient } from '@/lib/supabase/server'
import { getSupplierById } from '@/lib/actions/entities'
import { getPaymentProfiles } from '@/lib/actions/payment-profiles'
import { EntityDetailClient } from '@/components/entities/EntityDetailClient'

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/')

  const [supplier, profiles] = await Promise.all([
    getSupplierById(privyToken, id).catch(() => null),
    getPaymentProfiles(privyToken, 'SUPPLIER', id).catch(() => []),
  ])

  if (!supplier) redirect('/proveedores')

  return (
    <div>
      <Topbar title={supplier.internal_name} breadcrumb="Supplier detail" />
      <div style={{ padding: 24, maxWidth: 900 }}>
        <EntityDetailClient
          entity={supplier as Parameters<typeof EntityDetailClient>[0]['entity']}
          entityType="SUPPLIER"
          profiles={(profiles ?? []) as Parameters<typeof EntityDetailClient>[0]['profiles']}
          privyToken={privyToken}
          backHref="/proveedores"
        />
      </div>
    </div>
  )
}
