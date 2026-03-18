import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { OrderWizard } from '@/components/orders/OrderWizard'
import { getSessionUser } from '@/lib/actions/auth'

export default async function NewPayOrderPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/')

  const user = await getSessionUser(privyToken)
  if (!user?.is_enabled) redirect('/dashboard')

  return (
    <div>
      <Topbar title="New Payment Order" breadcrumb="Pagar" />
      <div style={{ padding: 24 }}>
        <OrderWizard type="PAY" />
      </div>
    </div>
  )
}
