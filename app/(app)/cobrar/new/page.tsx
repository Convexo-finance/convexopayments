import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { OrderForm } from '@/components/orders/OrderForm'
import { getSessionUser } from '@/lib/actions/auth'

export default async function NewCollectOrderPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/login')

  const user = await getSessionUser(privyToken)
  if (!user?.is_enabled) redirect('/dashboard')

  return (
    <div>
      <Topbar title="New Collection Order" breadcrumb="Cobrar" />
      <div style={{ padding: 24 }}>
        <OrderForm type="COLLECT" />
      </div>
    </div>
  )
}
