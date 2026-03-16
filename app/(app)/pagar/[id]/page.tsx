import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { getOrderById } from '@/lib/actions/orders'
import { getConvexoAccounts } from '@/lib/actions/convexo-accounts'
import { OrderDetailClient } from '@/components/orders/OrderDetailClient'

export default async function PayOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/login')

  const [order, convexoAccounts] = await Promise.all([
    getOrderById(privyToken, id).catch(() => null),
    getConvexoAccounts(privyToken).catch(() => []),
  ])
  if (!order || order.type !== 'PAY') redirect('/pagar')

  return (
    <div>
      <Topbar title={`Order #${id.slice(0, 8).toUpperCase()}`} breadcrumb="Pay order detail" />
      <div style={{ padding: 24, maxWidth: 800 }}>
        <OrderDetailClient
          order={order as unknown as Parameters<typeof OrderDetailClient>[0]['order']}
          privyToken={privyToken}
          backHref="/pagar"
          convexoAccounts={convexoAccounts ?? []}
        />
      </div>
    </div>
  )
}
