import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { adminGetAllOrders } from '@/lib/actions/admin'
import { AdminOrderTable } from '@/components/admin/AdminOrderTable'

export default async function AdminCobrarPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/')

  const { data: orders, total } = await adminGetAllOrders(privyToken, 'COLLECT').catch(() => ({
    data: [],
    total: 0,
  }))

  return (
    <div>
      <Topbar title="Admin — Collect Orders" breadcrumb={`${total} total`} />
      <div style={{ padding: 24 }}>
        <AdminOrderTable
          orders={(orders ?? []) as Parameters<typeof AdminOrderTable>[0]['orders']}
          privyToken={privyToken}
        />
      </div>
    </div>
  )
}
