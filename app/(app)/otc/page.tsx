import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { ActivationBanner } from '@/components/ui/ActivationBanner'
import { getSessionUser } from '@/lib/actions/auth'
import { getWalletData } from '@/lib/actions/wallet'
import { OtcClient } from './OtcClient'

export default async function OtcPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/')

  const user = await getSessionUser(privyToken)
  const isEnabled = user?.is_enabled ?? false

  const walletData = await getWalletData(privyToken).catch(() => ({
    balance: 0,
    ownProfiles: [],
    convexoAccounts: [],
    requests: [],
  }))

  // All wallet requests — OTC + deposit/withdraw — unified in one history view
  const allRequests = walletData.requests ?? []

  return (
    <div>
      <Topbar title="OTC" breadcrumb="Comprar & Vender" />
      <div style={{ padding: 24, maxWidth: 900 }}>
        {!isEnabled && <ActivationBanner />}
        <div style={{ opacity: isEnabled ? 1 : 0.5, pointerEvents: isEnabled ? 'auto' : 'none' }}>
        <OtcClient
          privyToken={privyToken}
          balance={Number(walletData.balance)}
          ownProfiles={(walletData.ownProfiles ?? []) as Parameters<typeof OtcClient>[0]['ownProfiles']}
          convexoAccounts={(walletData.convexoAccounts ?? []) as Parameters<typeof OtcClient>[0]['convexoAccounts']}
          history={allRequests as unknown as Parameters<typeof OtcClient>[0]['history']}
        />
        </div>
      </div>
    </div>
  )
}
