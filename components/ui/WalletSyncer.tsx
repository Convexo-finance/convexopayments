'use client'
/**
 * Invisible component — no UI.
 * Reads wallet addresses from Privy and saves them to the user's profile
 * so the admin can see them. Runs once per address when ready.
 */
import { useEffect, useRef } from 'react'
import { useWallets } from '@privy-io/react-auth'
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana'

interface Props {
  privyToken: string
  savedEvm: string | null
  savedSolana: string | null
}

export function WalletSyncer({ privyToken, savedEvm, savedSolana }: Props) {
  const { wallets } = useWallets()
  const { wallets: solanaWallets, ready: solanaReady } = useSolanaWallets()

  const evmAddress    = wallets.find((w) => w.walletClientType === 'privy')?.address ?? null
  const solanaAddress = solanaReady ? (solanaWallets[0]?.address ?? null) : null

  // Track each wallet independently so we don't miss Solana if EVM saves first
  const evmSaved    = useRef(false)
  const solanaSaved = useRef(false)

  useEffect(() => {
    if (!evmAddress) return
    if (evmSaved.current) return
    if (evmAddress === savedEvm) { evmSaved.current = true; return }
    evmSaved.current = true
    import('@/lib/actions/profile').then(({ saveWalletAddresses }) => {
      saveWalletAddresses(privyToken, evmAddress, null).catch(() => { evmSaved.current = false })
    })
  }, [evmAddress, savedEvm, privyToken])

  useEffect(() => {
    if (!solanaAddress) return
    if (solanaSaved.current) return
    if (solanaAddress === savedSolana) { solanaSaved.current = true; return }
    solanaSaved.current = true
    import('@/lib/actions/profile').then(({ saveWalletAddresses }) => {
      saveWalletAddresses(privyToken, null, solanaAddress).catch(() => { solanaSaved.current = false })
    })
  }, [solanaAddress, savedSolana, privyToken])

  return null
}
