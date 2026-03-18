'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useWallets } from '@privy-io/react-auth'
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana'
import { Modal } from '@/components/ui/Modal'

const TOKENS = ['USDC', 'USDT'] as const
type Token = typeof TOKENS[number]
type ModalType = 'deposit' | 'withdraw' | null
type DepositChain = 'ethereum' | 'solana'
type WithdrawChain = 'ethereum' | 'solana'

interface OwnProfile { id: string; method: string; label: string | null }

interface WalletActionsProps {
  privyToken: string
  balance: number
  convexoAccounts: Array<{ id: string; method: string; label: string | null; details: Record<string, unknown> }>
  ownProfiles: OwnProfile[]
}

export function WalletActions({ privyToken, balance }: WalletActionsProps) {
  const [modal, setModal] = useState<ModalType>(null)
  const [token, setToken] = useState<Token>('USDC')
  const [amount, setAmount] = useState('')
  const [destAddress, setDestAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [depositChain, setDepositChain] = useState<DepositChain>('ethereum')
  const [withdrawChain, setWithdrawChain] = useState<WithdrawChain>('ethereum')

  const { wallets } = useWallets()
  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy')

  const { wallets: solanaWallets, ready: solanaReady } = useSolanaWallets()
  const solanaEmbedded = solanaWallets[0]
  const solanaAddress = solanaEmbedded?.address ?? ''

  const depositAddress = depositChain === 'solana' ? solanaAddress : (embeddedWallet?.address ?? '')

  function closeModal() {
    setModal(null)
    setAmount('')
    setDestAddress('')
    setError(null)
    setDone(false)
    setDepositChain('ethereum')
    setWithdrawChain('ethereum')
  }

  async function handleWithdraw() {
    if (!parseFloat(amount) || !destAddress) return
    setLoading(true); setError(null)
    try {
      const { createWalletRequest } = await import('@/lib/actions/wallet')
      await createWalletRequest(privyToken, {
        type: 'CRYPTO_WITHDRAW', amount: parseFloat(amount), currency: token,
        metadata: { dest_address: destAddress, destination_chain: withdrawChain },
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  const amountNum = parseFloat(amount) || 0

  return (
    <>
      {/* ── Action buttons ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <ActionButton
          icon={<DownIcon />}
          label="Deposit"
          sub="Receive on-chain"
          onClick={() => setModal('deposit')}
        />
        <ActionButton
          icon={<UpIcon />}
          label="Withdraw"
          sub="Send on-chain"
          onClick={() => setModal('withdraw')}
        />
      </div>

      {/* ── Deposit Modal ── */}
      <Modal open={modal === 'deposit'} onClose={closeModal} title="Deposit" width={480}>
        {/* Chain tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['ethereum', 'solana'] as DepositChain[]).map((chain) => (
            <button
              key={chain}
              type="button"
              onClick={() => setDepositChain(chain)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 20, border: `1px solid ${depositChain === chain ? '#334EAC' : 'rgba(186,214,235,0.2)'}`,
                background: depositChain === chain ? 'rgba(51,78,172,0.25)' : 'rgba(255,255,255,0.04)',
                color: depositChain === chain ? '#BAD6EB' : 'rgba(186,214,235,0.55)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/chains/${chain}.png`} alt={chain} style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />
              {chain === 'ethereum' ? 'Ethereum' : 'Solana'}
            </button>
          ))}
        </div>

        {(depositChain === 'solana' ? (!solanaReady || !solanaAddress) : !embeddedWallet?.address) ? (
          <div style={{ background: '#fef3c7', borderRadius: 10, padding: '16px 20px' }}>
            <p style={{ fontSize: 13, color: '#92400e', fontWeight: 600 }}>Wallet loading…</p>
            <p style={{ fontSize: 12, color: '#b45309', marginTop: 4 }}>Your embedded wallet is initializing. Try refreshing.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.7)', textAlign: 'center' }}>
              {depositChain === 'ethereum'
                ? 'This is your personal Ethereum wallet. Send USDC or USDT here and Convexo will credit your balance.'
                : 'This is your personal Solana wallet. Send USDC or USDT (SPL) here and Convexo will credit your balance.'}
            </p>
            {/* QR */}
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 16, border: '1px solid rgba(186,214,235,0.1)', padding: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(depositAddress)}&bgcolor=FFFFFF&color=02001A&margin=8`}
                alt="Deposit QR" width={180} height={180} style={{ display: 'block' }}
              />
            </div>
            {/* Tags */}
            <div style={{ display: 'flex', gap: 8 }}>
              {depositChain === 'ethereum' ? (
                <>
                  <Tag label="Ethereum" color="#BAD6EB" text="#081F5C" />
                  <Tag label="ERC-20" color="#d1fae5" text="#065f46" />
                </>
              ) : (
                <>
                  <Tag label="Solana" color="#BAD6EB" text="#081F5C" />
                  <Tag label="SPL" color="#d1fae5" text="#065f46" />
                </>
              )}
            </div>
            {/* Address */}
            <div style={{ width: '100%', background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(186,214,235,0.7)', wordBreak: 'break-all' }}>{depositAddress}</span>
              <button
                onClick={() => navigator.clipboard.writeText(depositAddress)}
                style={{ flexShrink: 0, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(186,214,235,0.2)', borderRadius: 7, padding: '6px 12px', fontSize: 12, color: 'rgba(186,214,235,0.8)', cursor: 'pointer', fontWeight: 600 }}
              >
                Copy
              </button>
            </div>
            {/* Warning */}
            <div style={{ background: '#fef3c7', borderRadius: 10, padding: '12px 16px', width: '100%' }}>
              <p style={{ fontSize: 12, color: '#92400e', fontWeight: 600, marginBottom: 2 }}>Important</p>
              <p style={{ fontSize: 12, color: '#b45309' }}>
                {depositChain === 'ethereum'
                  ? <>Only send <strong>USDC or USDT on Ethereum (ERC-20)</strong>. Wrong network or token = permanent loss.</>
                  : <>Only send <strong>USDC or USDT on Solana (SPL)</strong>. Wrong network or token = permanent loss.</>}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Withdraw Modal ── */}
      <Modal open={modal === 'withdraw'} onClose={closeModal} title="Withdraw" width={460}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckIcon />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#065f46', marginBottom: 4 }}>Withdrawal request submitted</p>
            <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.4)', marginBottom: 24 }}>{amountNum} {token} will be sent on-chain within 24 hours.</p>
            <button onClick={closeModal} style={secondaryBtn}>Close</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.7)' }}>
              Available: <strong style={{ color: 'rgba(255,255,255,0.9)' }}>{balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC</strong>
            </p>
            {/* Chain selector */}
            <div>
              <label style={labelStyle}>Network</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['ethereum', 'solana'] as WithdrawChain[]).map((chain) => (
                  <button
                    key={chain}
                    type="button"
                    onClick={() => setWithdrawChain(chain)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px', borderRadius: 20, border: `1px solid ${withdrawChain === chain ? '#334EAC' : 'rgba(186,214,235,0.2)'}`,
                      background: withdrawChain === chain ? 'rgba(51,78,172,0.25)' : 'rgba(255,255,255,0.04)',
                      color: withdrawChain === chain ? '#BAD6EB' : 'rgba(186,214,235,0.55)', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/chains/${chain}.png`} alt={chain} style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }} />
                    {chain === 'ethereum' ? 'Ethereum' : 'Solana'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Token</label>
                <select style={inputStyle} value={token} onChange={(e) => setToken(e.target.value as Token)}>
                  {TOKENS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Amount</span>
                  <button type="button" onClick={() => setAmount(String(balance))} style={{ fontSize: 11, color: '#BAD6EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Max</button>
                </label>
                <input type="number" min="0" step="any" style={inputStyle} placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Destination wallet address</label>
              <input
                style={inputStyle}
                placeholder={withdrawChain === 'ethereum' ? '0x...' : 'Base58 address...'}
                value={destAddress}
                onChange={(e) => setDestAddress(e.target.value)}
              />
            </div>
            {amountNum > balance && <p style={{ color: '#ef4444', fontSize: 12 }}>Amount exceeds your balance.</p>}
            {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}
            <button
              onClick={handleWithdraw}
              disabled={loading || !amountNum || !destAddress || amountNum > balance}
              style={{ ...primaryBtn, opacity: (loading || !amountNum || !destAddress || amountNum > balance) ? 0.5 : 1 }}
            >
              {loading ? 'Submitting…' : 'Request Withdrawal'}
            </button>
          </div>
        )}
      </Modal>
    </>
  )
}

// ── Sub-components ──

function ActionButton({ icon, label, sub, onClick, loading }: {
  icon: React.ReactNode
  label: string
  sub: string
  onClick: () => void
  loading?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '18px 12px', borderRadius: 14, border: '1px solid rgba(186,214,235,0.3)',
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(8px)',
        cursor: loading ? 'not-allowed' : 'pointer',
        color: 'white',
        opacity: loading ? 0.6 : 1,
        transition: 'background 0.15s',
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(186,214,235,0.15)', border: '1px solid rgba(186,214,235,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.2px' }}>{label}</div>
      <div style={{ fontSize: 10, opacity: 0.55, letterSpacing: '0.3px' }}>{sub}</div>
    </button>
  )
}

function Tag({ label, color, text }: { label: string; color: string; text: string }) {
  return (
    <span style={{ background: color, color: text, borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700 }}>{label}</span>
  )
}

// ── Icons ──
function DownIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
}
function UpIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
}
function CheckIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}

// suppress unused import warning
void Image

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(186,214,235,0.7)', marginBottom: 5 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(186,214,235,0.2)', fontSize: 13, color: 'white', background: 'rgba(255,255,255,0.07)', outline: 'none', boxSizing: 'border-box' }
const primaryBtn: React.CSSProperties = { width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #081F5C, #2A0144)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const secondaryBtn: React.CSSProperties = { padding: '9px 24px', borderRadius: 8, border: '1px solid rgba(186,214,235,0.2)', background: 'rgba(255,255,255,0.08)', color: 'rgba(186,214,235,0.8)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
