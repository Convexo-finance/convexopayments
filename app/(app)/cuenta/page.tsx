import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { getWalletData } from '@/lib/actions/wallet'
import { WalletActions } from './WalletActions'
import { OnChainBalances } from './OnChainBalances'

export default async function CuentaPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/login')

  const walletData = await getWalletData(privyToken).catch(() => ({
    balance: 0,
    ownProfiles: [],
    convexoAccounts: [],
    requests: [],
  }))

  return (
    <div>
      <Topbar title="Cuenta" breadcrumb="Account & Wallet" />
      <div style={{ padding: 24, maxWidth: 900 }}>
        {/* Balance + action buttons card */}
        <div
          style={{
            background: 'linear-gradient(145deg, #02001A 0%, #2A0144 60%, #081F5C 100%)',
            borderRadius: 20,
            padding: '28px 28px 24px',
            color: 'white',
            marginBottom: 24,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle glow orb */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(186,214,235,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: '#BAD6EB', opacity: 0.7, marginBottom: 10 }}>
            Convexo Balance
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-1.5px', lineHeight: 1 }}>
            ${Number(walletData.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 12, color: '#BAD6EB', opacity: 0.5, marginTop: 6, marginBottom: 28 }}>USDC · Managed by Convexo</div>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(186,214,235,0.15)', marginBottom: 20 }} />

          {/* Action buttons live inside the card */}
          <WalletActions
            privyToken={privyToken}
            balance={Number(walletData.balance)}
            convexoAccounts={(walletData.convexoAccounts ?? []) as Parameters<typeof WalletActions>[0]['convexoAccounts']}
            ownProfiles={(walletData.ownProfiles ?? []) as Parameters<typeof WalletActions>[0]['ownProfiles']}
          />
        </div>

        <OnChainBalances />
      </div>
    </div>
  )
}
