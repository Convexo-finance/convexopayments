'use client'
import { useEffect, useRef, useState } from 'react'
import { useWallets } from '@privy-io/react-auth'
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana'
import Image from 'next/image'

interface Props {
  privyToken: string
  /** Initial values from DB (may be null if never saved) */
  initialEvm: string | null
  initialSolana: string | null
}

function short(addr: string) {
  if (!addr) return ''
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button onClick={copy} style={{
      background: copied ? 'rgba(16,185,129,0.15)' : 'rgba(186,214,235,0.08)',
      border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(186,214,235,0.15)'}`,
      borderRadius: 6, padding: '3px 10px', fontSize: 11,
      color: copied ? '#10b981' : 'rgba(186,214,235,0.7)',
      cursor: 'pointer', fontWeight: 600, flexShrink: 0,
    }}>
      {copied ? 'Copiado ✓' : 'Copiar'}
    </button>
  )
}

export function WalletAddressCard({ privyToken, initialEvm, initialSolana }: Props) {
  const { wallets } = useWallets()
  const { wallets: solanaWallets, ready: solanaReady } = useSolanaWallets()

  const evmWallet    = wallets.find((w) => w.walletClientType === 'privy')
  const evmAddress   = evmWallet?.address ?? null
  const solanaAddress = solanaReady ? (solanaWallets[0]?.address ?? null) : (initialSolana ?? null)

  // Show the best available address: live from Privy if available, else DB fallback
  const displayEvm    = evmAddress    ?? initialEvm
  const displaySolana = solanaAddress ?? initialSolana

  // Auto-save to DB once we have live addresses (only if they differ from DB values)
  const saved = useRef(false)
  useEffect(() => {
    if (saved.current) return
    if (!evmAddress && !solanaAddress) return
    const needsSave =
      (evmAddress    && evmAddress    !== initialEvm)    ||
      (solanaAddress && solanaAddress !== initialSolana)
    if (!needsSave) return
    saved.current = true
    import('@/lib/actions/profile').then(({ saveWalletAddresses }) => {
      saveWalletAddresses(privyToken, evmAddress, solanaAddress).catch(() => {
        saved.current = false
      })
    })
  }, [evmAddress, solanaAddress, initialEvm, initialSolana, privyToken])

  if (!displayEvm && !displaySolana) return null

  const walletRows = [
    displayEvm    && { logo: '/chains/ethereum.png', label: 'Ethereum / EVM',  address: displayEvm    },
    displaySolana && { logo: '/chains/solana.png',   label: 'Solana',          address: displaySolana },
  ].filter(Boolean) as { logo: string; label: string; address: string }[]

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)', borderRadius: 12,
      border: '1px solid rgba(186,214,235,0.1)', overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 18px', borderBottom: '1px solid rgba(186,214,235,0.08)',
        background: 'rgba(186,214,235,0.03)',
        fontSize: 11, fontWeight: 700, color: 'rgba(186,214,235,0.5)',
        letterSpacing: '1px', textTransform: 'uppercase',
      }}>
        Mis Wallets
      </div>
      {walletRows.map((row) => (
        <div key={row.label} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 18px', borderBottom: '1px solid rgba(186,214,235,0.06)',
        }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(186,214,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image src={row.logo} alt={row.label} width={28} height={28} style={{ objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: 'rgba(186,214,235,0.5)', marginBottom: 2 }}>{row.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              <span className="wallet-full">{row.address}</span>
              <span className="wallet-short">{short(row.address)}</span>
            </div>
          </div>
          <CopyButton text={row.address} />
        </div>
      ))}
    </div>
  )
}
