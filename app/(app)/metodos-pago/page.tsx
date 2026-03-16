import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { getSessionUser } from '@/lib/actions/auth'
import { getPaymentProfiles } from '@/lib/actions/payment-profiles'
import { PaymentMethodsClient } from './PaymentMethodsClient'

export default async function MetodosPagoPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/')

  const user = await getSessionUser(privyToken).catch(() => null)
  if (!user) redirect('/')

  const profiles = await getPaymentProfiles(privyToken, 'USER_OWN', user.id).catch(() => [])

  return (
    <div>
      <Topbar title="Payment Methods" breadcrumb="Your withdrawal and receiving accounts" />
      <div style={{ padding: 24, maxWidth: 800 }}>
        <PaymentMethodsClient
          privyToken={privyToken}
          userId={user.id}
          initialProfiles={(profiles ?? []) as Parameters<typeof PaymentMethodsClient>[0]['initialProfiles']}
        />
      </div>
    </div>
  )
}
