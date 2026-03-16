import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { getOrderById } from '@/lib/actions/orders'
import { OrderDetailClient } from '@/components/orders/OrderDetailClient'

export default async function CollectOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/')

  const order = await getOrderById(privyToken, id).catch(() => null)
  if (!order || order.type !== 'COLLECT') redirect('/cobrar')

  return (
    <div>
      <Topbar title={`Order #${order.reference ?? id.slice(0, 8)}`} breadcrumb="Collect order detail" />
      <div style={{ padding: 24, maxWidth: 800 }}>
        <OrderDetailClient
          order={order as unknown as Parameters<typeof OrderDetailClient>[0]['order']}
          privyToken={privyToken}
          backHref="/cobrar"
        />
      </div>
    </div>
  )
}
