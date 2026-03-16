'use client'
import { useState, useEffect } from 'react'
import { useWallets } from '@privy-io/react-auth'
import Image from 'next/image'

const CHAINS = [
  { id: 'ethereum', name: 'Ethereum', rpc: 'https://eth.llamarpc.com', logo: '/chains/ethereum.png' },
  { id: 'arbitrum', name: 'Arbitrum', rpc: 'https://arb1.arbitrum.io/rpc', logo: '/chains/arb.png' },
  { id: 'base', name: 'Base', rpc: 'https://mainnet.base.org', logo: '/chains/base_logo.svg' },
] as const

type ChainId = typeof CHAINS[number]['id']

const TOKENS = [
  {
    symbol: 'USDC',
    logo: '/tokens/usdc.png',
    contracts: {
      ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      arbitrum: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      base: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    } as Record<ChainId, string>,
    decimals: 6,
  },
  {
    symbol: 'USDT',
    logo: '/tokens/usdt.png',
    contracts: {
      ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      arbitrum: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      base: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    } as Record<ChainId, string>,
    decimals: 6,
  },
] as const

async function fetchBalance(rpc: string, contract: string, address: string): Promise<number> {
  try {
    const data = '0x70a08231' + address.slice(2).toLowerCase().padStart(64, '0')
    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', method: 'eth_call',
        params: [{ to: contract, data }, 'latest'],
        id: 1,
      }),
    })
    const json = await res.json()
    if (!json.result || json.result === '0x' || json.result === '0x0') return 0
    return Number(BigInt(json.result)) / 1e6
  } catch {
    return 0
  }
}

type Balances = Record<string, Record<ChainId, number>>

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function OnChainBalances() {
  const { wallets } = useWallets()
  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy')
  const address = embeddedWallet?.address

  const [balances, setBalances] = useState<Balances>({})
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!address) return
    setLoading(true)
    const results: Balances = {}

    Promise.all(
      TOKENS.map(async (token) => {
        results[token.symbol] = {} as Record<ChainId, number>
        await Promise.all(
          CHAINS.map(async (chain) => {
            results[token.symbol][chain.id] = await fetchBalance(chain.rpc, token.contracts[chain.id], address)
          })
        )
      })
    ).finally(() => {
      setBalances(results)
      setLoading(false)
    })
  }, [address])

  if (!address) return null

  function toggle(symbol: string) {
    setExpanded((prev) => ({ ...prev, [symbol]: !prev[symbol] }))
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 16, border: '1px solid rgba(186,214,235,0.1)', overflow: 'hidden', marginBottom: 24 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(186,214,235,0.08)', background: 'rgba(186,214,235,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>On-chain Balances</span>
        {loading && (
          <span style={{ fontSize: 11, color: 'rgba(186,214,235,0.4)', fontStyle: 'italic' }}>Fetching…</span>
        )}
      </div>

      {TOKENS.map((token, i) => {
        const chainBalances = balances[token.symbol] ?? {}
        const total = Object.values(chainBalances).reduce((s, v) => s + v, 0)
        const isOpen = expanded[token.symbol] ?? false

        return (
          <div key={token.symbol} style={{ borderBottom: i < TOKENS.length - 1 ? '1px solid rgba(186,214,235,0.07)' : 'none' }}>
            {/* Token row */}
            <button
              onClick={() => toggle(token.symbol)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
              }}
            >
              {/* Token logo — exact 36×36 */}
              <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(186,214,235,0.15)' }}>
                <Image src={token.logo} alt={token.symbol} width={36} height={36} style={{ objectFit: 'cover', display: 'block' }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{token.symbol}</div>
                <div style={{ fontSize: 11, color: 'rgba(186,214,235,0.4)', marginTop: 2 }}>ETH · ARB · BASE</div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                  {loading ? '—' : fmt(total)}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(186,214,235,0.4)', marginTop: 1 }}>{token.symbol}</div>
              </div>

              {/* Chevron */}
              <div style={{ flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#BAD6EB" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </button>

            {/* Chain breakdown */}
            {isOpen && (
              <div style={{ background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(186,214,235,0.07)' }}>
                {CHAINS.map((chain) => (
                  <div key={chain.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px 10px 70px' }}>
                    {/* Chain logo — exact 20×20 square */}
                    <div style={{ width: 20, height: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Image
                        src={chain.logo}
                        alt={chain.name}
                        width={20}
                        height={20}
                        style={{ objectFit: 'contain', width: 20, height: 20 }}
                      />
                    </div>
                    <span style={{ fontSize: 13, color: 'rgba(186,214,235,0.7)', flex: 1 }}>{chain.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
                      {loading ? '—' : fmt(chainBalances[chain.id] ?? 0)}
                      <span style={{ fontSize: 11, color: 'rgba(186,214,235,0.4)', marginLeft: 4 }}>{token.symbol}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Footer */}
      <div style={{ padding: '10px 20px', borderTop: '1px solid rgba(186,214,235,0.07)' }}>
        <p style={{ fontSize: 11, color: 'rgba(186,214,235,0.4)', fontFamily: 'monospace' }}>
          {address.slice(0, 6)}…{address.slice(-4)}
        </p>
      </div>
    </div>
  )
}
