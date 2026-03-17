'use client'
import { useState, useEffect } from 'react'
import { useWallets } from '@privy-io/react-auth'
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana'
import QRCode from 'react-qr-code'

const DEFAULT_SPREAD = 0.01
const TOKENS = ['USDC', 'USDT'] as const
type Token = typeof TOKENS[number]
type Tab = 'comprar' | 'vender'

interface ConvexoAccount {
  id: string; method: string; label: string | null
  details: Record<string, string>
  directions: string[]
}
interface OwnProfile { id: string; method: string; label: string | null; details?: Record<string, string> }

interface CreatedOrder {
  id: string; cop_amount: number; amount: number; currency: string
  spread_pct: number
  convexoAccount?: ConvexoAccount; ownProfileLabel?: string
}

interface OtcWizardProps {
  privyToken: string
  balance: number
  tab: Tab
  ownProfiles: OwnProfile[]
  comprarAccounts: ConvexoAccount[]
  venderAccounts: ConvexoAccount[]
  rate: number | null
  rateLoading: boolean
  onOrderCreated: (order: CreatedOrder) => void
}

type WalletSource = 'embedded' | 'external'

const CHAINS = ['Ethereum', 'Tron', 'Solana'] as const

export function OtcWizard({
  privyToken, balance, tab, ownProfiles, comprarAccounts, venderAccounts,
  rate, rateLoading, onOrderCreated,
}: OtcWizardProps) {
  const [step, setStep] = useState(1)

  // Step 1 — token + amount
  const [token, setToken] = useState<Token>('USDC')
  const [amount, setAmount] = useState('')

  // Step 2 COMPRAR — receive wallet
  const [walletSource, setWalletSource] = useState<WalletSource>('embedded')
  const [selectedEmbeddedAddress, setSelectedEmbeddedAddress] = useState('')
  const [embeddedChain, setEmbeddedChain] = useState<'ethereum' | 'solana'>('ethereum')
  const [externalChain, setExternalChain] = useState<string>(CHAINS[0])
  const [externalAddress, setExternalAddress] = useState('')

  // Step 2 VENDER — receive FIAT
  const [destinationProfileId, setDestinationProfileId] = useState('')

  // Step 3 COMPRAR — payment method
  const [selectedConvexoId, setSelectedConvexoId] = useState('')

  // Step 3 VENDER — send crypto to Convexo
  const [selectedVenderConvexoId, setSelectedVenderConvexoId] = useState('')

  // Execution
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { wallets } = useWallets()
  const embeddedWallets = wallets.filter((w) => w.walletClientType === 'privy')

  const { wallets: solanaWallets, ready: solanaReady } = useSolanaWallets()
  const solanaEmbedded = solanaWallets[0]

  const amountNum = parseFloat(amount) || 0
  const cop = rate
    ? tab === 'comprar'
      ? amountNum * rate * (1 + DEFAULT_SPREAD)
      : amountNum * rate * (1 - DEFAULT_SPREAD)
    : null

  const bankProfiles = ownProfiles.filter((p) => p.method === 'BANK')
  const venderCryptoAccounts = venderAccounts.filter((a) => a.method === 'CRYPTO')

  // Auto-select defaults
  useEffect(() => {
    if (embeddedWallets.length > 0 && !selectedEmbeddedAddress) {
      setSelectedEmbeddedAddress(embeddedWallets[0].address)
    }
  }, [embeddedWallets, selectedEmbeddedAddress])

  useEffect(() => {
    if (comprarAccounts.length > 0 && !selectedConvexoId) {
      setSelectedConvexoId(comprarAccounts[0].id)
    }
  }, [comprarAccounts, selectedConvexoId])

  useEffect(() => {
    if (venderCryptoAccounts.length > 0 && !selectedVenderConvexoId) {
      setSelectedVenderConvexoId(venderCryptoAccounts[0].id)
    }
  }, [venderCryptoAccounts, selectedVenderConvexoId])

  function reset() {
    setStep(1); setAmount(''); setError(null)
    setWalletSource('embedded'); setExternalAddress(''); setExternalChain(CHAINS[0])
    setEmbeddedChain('ethereum')
    setDestinationProfileId(''); setSelectedConvexoId(''); setSelectedVenderConvexoId('')
  }

  // Derived: the user's chosen receive address for COMPRAR
  const receiveAddress = walletSource === 'embedded' ? selectedEmbeddedAddress : externalAddress
  const receiveChain = walletSource === 'embedded' ? (embeddedChain === 'solana' ? 'Solana' : 'Ethereum') : externalChain

  // Step validation
  const step1Valid = amountNum > 0 && !!rate && (tab === 'vender' ? amountNum <= balance : true)
  const step2ComprarValid = walletSource === 'embedded' ? !!selectedEmbeddedAddress : (!!externalAddress && !!externalChain)
  const step2VenderValid = !!destinationProfileId
  const step3ComprarValid = !!selectedConvexoId
  const step3VenderValid = !!selectedVenderConvexoId

  async function handleConfirm() {
    if (!amountNum || !rate || !cop) return
    setLoading(true); setError(null)
    try {
      const { createWalletRequest } = await import('@/lib/actions/wallet')
      if (tab === 'comprar') {
        const req = await createWalletRequest(privyToken, {
          type: 'CASH_IN',
          amount: amountNum,
          currency: token,
          convexo_account_id: selectedConvexoId || undefined,
          crypto_address: receiveAddress || undefined,
          provider_rate: rate,
          initial_spread: DEFAULT_SPREAD,
          metadata: {
            usdcop_rate: rate,
            spread_pct: DEFAULT_SPREAD,
            cop_amount: cop,
            destination_chain: receiveChain,
            destination_wallet_source: walletSource,
          },
        })
        const acct = comprarAccounts.find((a) => a.id === selectedConvexoId)
        onOrderCreated({ id: req.id, cop_amount: cop, amount: amountNum, currency: token, spread_pct: DEFAULT_SPREAD, convexoAccount: acct })
      } else {
        const selectedVenderAcct = venderCryptoAccounts.find((a) => a.id === selectedVenderConvexoId)
        const req = await createWalletRequest(privyToken, {
          type: 'CASH_OUT',
          amount: amountNum,
          currency: token,
          destination_profile_id: destinationProfileId,
          convexo_account_id: selectedVenderConvexoId || undefined,
          crypto_address: selectedVenderAcct?.details.address || undefined,
          provider_rate: rate,
          initial_spread: DEFAULT_SPREAD,
          metadata: {
            usdcop_rate: rate,
            spread_pct: DEFAULT_SPREAD,
            cop_amount: cop,
          },
        })
        const profile = bankProfiles.find((p) => p.id === destinationProfileId)
        onOrderCreated({ id: req.id, cop_amount: cop, amount: amountNum, currency: token, spread_pct: DEFAULT_SPREAD, ownProfileLabel: profile?.label ?? profile?.method })
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear la orden')
    } finally {
      setLoading(false)
    }
  }

  const totalSteps = 4

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Step indicator */}
      <WizardSteps current={step} total={totalSteps} />

      {/* Step 1 — Amount + Quote */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.6)', margin: 0 }}>
            {tab === 'comprar'
              ? 'Selecciona el token y el monto que deseas comprar.'
              : <>Selecciona el token y el monto que deseas vender. Balance: <strong style={{ color: 'rgba(255,255,255,0.9)' }}>{balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC</strong></>}
          </p>
          <TokenAmount token={token} amount={amount} onToken={setToken} onAmount={setAmount} max={tab === 'vender' ? balance : undefined} />
          {rate && amountNum > 0 && cop && (
            <SpreadBox rate={rate} cop={cop} spread={DEFAULT_SPREAD} dir={tab === 'comprar' ? 'in' : 'out'} />
          )}
          {rateLoading && <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)' }}>Cargando tasa…</p>}
          {tab === 'vender' && amountNum > balance && (
            <p style={{ color: '#ef4444', fontSize: 12 }}>El monto supera tu balance disponible.</p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              disabled={!step1Valid}
              onClick={() => { if (step1Valid) setStep(2) }}
              style={{ ...primaryBtn, width: 'auto', padding: '10px 28px', opacity: step1Valid ? 1 : 0.4 }}
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 COMPRAR — Where to receive crypto */}
      {step === 2 && tab === 'comprar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: '0 0 4px' }}>
              ¿Dónde quieres recibir el cripto?
            </p>
            <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.5)', margin: 0 }}>
              Selecciona la wallet donde Convexo enviará tu {token}.
            </p>
          </div>

          {/* Embedded wallets */}
          {(embeddedWallets.length > 0 || (solanaReady && solanaEmbedded)) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={labelStyle}>Tu wallet Convexo</span>
              {/* EVM embedded wallets */}
              {embeddedWallets.map((w) => (
                <SelectableCard
                  key={w.address}
                  selected={walletSource === 'embedded' && selectedEmbeddedAddress === w.address && embeddedChain === 'ethereum'}
                  onClick={() => { setWalletSource('embedded'); setSelectedEmbeddedAddress(w.address); setEmbeddedChain('ethereum') }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,126,234,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>⬡</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Wallet embebida</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(186,214,235,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {w.address}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(99,126,234,0.2)', color: '#627eea', padding: '2px 8px', borderRadius: 99, flexShrink: 0, marginLeft: 'auto' }}>Ethereum</span>
                  </div>
                </SelectableCard>
              ))}
              {/* Solana embedded wallet */}
              {solanaReady && solanaEmbedded && (
                <SelectableCard
                  selected={walletSource === 'embedded' && embeddedChain === 'solana'}
                  onClick={() => { setWalletSource('embedded'); setSelectedEmbeddedAddress(solanaEmbedded.address); setEmbeddedChain('solana') }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(153,69,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>◎</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Wallet embebida</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(186,214,235,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {solanaEmbedded.address}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(153,69,255,0.2)', color: '#9945FF', padding: '2px 8px', borderRadius: 99, flexShrink: 0, marginLeft: 'auto' }}>Solana</span>
                  </div>
                </SelectableCard>
              )}
            </div>
          )}

          {/* External wallet */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={labelStyle}>Otra wallet</span>
            <SelectableCard
              selected={walletSource === 'external'}
              onClick={() => setWalletSource('external')}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Pegar dirección de otra wallet</div>
              <div style={{ fontSize: 11, color: 'rgba(186,214,235,0.4)' }}>Ethereum, Tron, Solana, etc.</div>
            </SelectableCard>
            {walletSource === 'external' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4, padding: '12px 14px', background: 'rgba(186,214,235,0.04)', border: '1px solid rgba(186,214,235,0.12)', borderRadius: 10 }}>
                <div>
                  <label style={labelStyle}>Red / Blockchain</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {CHAINS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setExternalChain(c)}
                        style={{
                          padding: '6px 14px', borderRadius: 8, border: `1px solid ${externalChain === c ? '#334EAC' : 'rgba(186,214,235,0.2)'}`,
                          background: externalChain === c ? 'rgba(51,78,172,0.2)' : 'rgba(255,255,255,0.04)',
                          color: externalChain === c ? '#BAD6EB' : 'rgba(186,214,235,0.55)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}
                      >{c}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Dirección de la wallet</label>
                  <input
                    type="text"
                    placeholder="0x… / T… / dirección de la red elegida"
                    value={externalAddress}
                    onChange={(e) => setExternalAddress(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            )}
          </div>

          <StepNav
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            nextDisabled={!step2ComprarValid}
          />
        </div>
      )}

      {/* Step 2 VENDER — Where to receive FIAT */}
      {step === 2 && tab === 'vender' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: '0 0 4px' }}>
              ¿Dónde quieres recibir el COP?
            </p>
            <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.5)', margin: 0 }}>
              Selecciona la cuenta bancaria donde Convexo te enviará los fondos.
            </p>
          </div>

          {bankProfiles.length === 0 ? (
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#f59e0b' }}>
              No tienes cuentas bancarias registradas.{' '}
              <a href="/metodos-pago" style={{ color: '#BAD6EB', fontWeight: 700 }}>Agregar en Métodos de Pago →</a>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bankProfiles.map((p) => (
                <SelectableCard
                  key={p.id}
                  selected={destinationProfileId === p.id}
                  onClick={() => setDestinationProfileId(p.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(186,214,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏦</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{p.label ?? p.method}</div>
                      {p.details && (
                        <div style={{ fontSize: 11, color: 'rgba(186,214,235,0.5)' }}>
                          {[p.details.bank_name, p.details.account_number, p.details.currency].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                  </div>
                </SelectableCard>
              ))}
            </div>
          )}

          <StepNav
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            nextDisabled={!step2VenderValid}
          />
        </div>
      )}

      {/* Step 3 COMPRAR — Select payment method */}
      {step === 3 && tab === 'comprar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: '0 0 4px' }}>
              ¿Cómo quieres pagar?
            </p>
            <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.5)', margin: 0 }}>
              Elige la cuenta de Convexo a la que enviarás el pago en COP.
            </p>
          </div>

          {comprarAccounts.length === 0 ? (
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#f59e0b' }}>
              No hay opciones de pago disponibles para COMPRAR. Contacta soporte.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {comprarAccounts.map((acct) => (
                <ConvexoAccountSelectCard
                  key={acct.id}
                  acct={acct}
                  selected={selectedConvexoId === acct.id}
                  onSelect={() => setSelectedConvexoId(acct.id)}
                />
              ))}
            </div>
          )}

          <StepNav
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
            nextDisabled={!step3ComprarValid}
          />
        </div>
      )}

      {/* Step 3 VENDER — Select Convexo crypto account */}
      {step === 3 && tab === 'vender' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: '0 0 4px' }}>
              ¿A dónde envías el cripto?
            </p>
            <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.5)', margin: 0 }}>
              Elige la wallet de Convexo donde enviarás tu {token}.
            </p>
          </div>

          {venderCryptoAccounts.length === 0 ? (
            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#f59e0b' }}>
              No hay wallets disponibles para VENDER. Contacta soporte.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {venderCryptoAccounts.map((acct) => (
                  <ConvexoAccountSelectCard
                    key={acct.id}
                    acct={acct}
                    selected={selectedVenderConvexoId === acct.id}
                    onSelect={() => setSelectedVenderConvexoId(acct.id)}
                  />
                ))}
              </div>

              {/* Show address + QR for selected */}
              {(() => {
                const selAcct = venderCryptoAccounts.find((a) => a.id === selectedVenderConvexoId)
                if (!selAcct?.details.address) return null
                return (
                  <div style={{ background: 'rgba(186,214,235,0.06)', border: '1px solid rgba(186,214,235,0.15)', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(186,214,235,0.5)', margin: '0 0 6px' }}>
                        Dirección de envío
                        {selAcct.details.network && <span style={{ marginLeft: 6, background: 'rgba(51,78,172,0.25)', color: '#BAD6EB', padding: '1px 7px', borderRadius: 99, fontWeight: 700 }}>{selAcct.details.network}</span>}
                      </p>
                      <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#BAD6EB', wordBreak: 'break-all' }}>{selAcct.details.address}</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: 10, padding: 12, display: 'inline-flex', alignSelf: 'flex-start' }}>
                      <QRCode value={selAcct.details.address} size={120} />
                    </div>
                    <div style={{ background: 'rgba(245,158,11,0.08)', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#f59e0b' }}>
                      Envía sólo <strong>{selAcct.details.token ?? token}</strong> en la red <strong>{selAcct.details.network ?? 'indicada'}</strong>. Una red incorrecta puede resultar en pérdida permanente de fondos.
                    </div>
                  </div>
                )
              })()}
            </>
          )}

          <StepNav
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
            nextDisabled={!step3VenderValid}
          />
        </div>
      )}

      {/* Step 4 — Review + confirm */}
      {step === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: '0 0 4px' }}>
              Revisar y confirmar
            </p>
            <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.5)', margin: 0 }}>
              Verifica los detalles antes de crear la orden.
            </p>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: '16px 18px', fontFamily: 'monospace', fontSize: 12, color: 'rgba(186,214,235,0.8)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ReviewRow label="Tipo" value={tab === 'comprar' ? 'COMPRAR crypto' : 'VENDER crypto'} />
            <ReviewRow label="Token" value={token} />
            <ReviewRow label="Monto" value={`${amountNum.toLocaleString()} ${token}`} />
            {cop != null && (
              <ReviewRow
                label={tab === 'comprar' ? 'Debes pagar (COP)' : 'Recibes (COP)'}
                value={`$${cop.toLocaleString(undefined, { maximumFractionDigits: 0 })} COP`}
                highlight
              />
            )}
            {rate && <ReviewRow label="Tasa base" value={`${rate.toLocaleString(undefined, { maximumFractionDigits: 0 })} COP/USD`} />}
            <ReviewRow label="Spread" value={`${(DEFAULT_SPREAD * 100).toFixed(2)}% (ajustable por Convexo)`} />

            <div style={{ borderTop: '1px solid rgba(186,214,235,0.1)', paddingTop: 8, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tab === 'comprar' && (
                <>
                  <ReviewRow label="Recibirás en" value={`${receiveChain}: ${receiveAddress ? receiveAddress.slice(0, 20) + '…' : '—'}`} />
                  {(() => {
                    const acct = comprarAccounts.find((a) => a.id === selectedConvexoId)
                    if (!acct) return null
                    return <ReviewRow label="Pagarás a" value={acct.label ?? acct.details.bank_name ?? acct.method} />
                  })()}
                </>
              )}
              {tab === 'vender' && (
                <>
                  {(() => {
                    const profile = bankProfiles.find((p) => p.id === destinationProfileId)
                    if (!profile) return null
                    return <ReviewRow label="Recibirás COP en" value={profile.label ?? profile.method} />
                  })()}
                  {(() => {
                    const acct = venderCryptoAccounts.find((a) => a.id === selectedVenderConvexoId)
                    if (!acct) return null
                    return <ReviewRow label="Enviarás cripto a" value={`${acct.label ?? acct.details.network ?? 'Convexo'}: ${acct.details.address ? acct.details.address.slice(0, 20) + '…' : '—'}`} />
                  })()}
                </>
              )}
            </div>
          </div>

          {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setStep(3)}
              disabled={loading}
              style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid rgba(186,214,235,0.2)', background: 'rgba(255,255,255,0.05)', color: 'rgba(186,214,235,0.7)', fontSize: 13, cursor: 'pointer' }}
            >
              ← Volver
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              style={{ ...primaryBtn, flex: 1, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'Creando orden…' : `✓ Confirmar orden ${tab === 'comprar' ? 'COMPRAR' : 'VENDER'}`}
            </button>
          </div>

          {tab === 'comprar' && (
            <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.35)', margin: 0 }}>
              Al confirmar se crea la orden. Convexo la revisará y cuando la acepte recibirás las instrucciones de pago.
            </p>
          )}
          {tab === 'vender' && (
            <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.35)', margin: 0 }}>
              Al confirmar se crea la orden. Convexo la revisará y te mostrará la dirección cripto a la que debes enviar tu {token}.
            </p>
          )}
        </div>
      )}

      {/* Reset link */}
      {step > 1 && (
        <button
          onClick={reset}
          style={{ background: 'none', border: 'none', color: 'rgba(186,214,235,0.35)', fontSize: 12, cursor: 'pointer', textAlign: 'center', padding: 0 }}
        >
          Cancelar y empezar de nuevo
        </button>
      )}
    </div>
  )
}

// ── Wizard step indicator ──────────────────────────────────────────────────────

function WizardSteps({ current, total }: { current: number; total: number }) {
  const LABELS = ['Monto', 'Destino', 'Método', 'Confirmar']
  return (
    <div style={{ display: 'flex', gap: 0 }}>
      {Array.from({ length: total }).map((_, i) => {
        const stepNum = i + 1
        const done = stepNum < current
        const active = stepNum === current
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {i > 0 && (
              <div style={{ position: 'absolute', left: 0, top: 11, width: '50%', height: 2, background: done || active ? '#334EAC' : 'rgba(186,214,235,0.1)' }} />
            )}
            {i < total - 1 && (
              <div style={{ position: 'absolute', right: 0, top: 11, width: '50%', height: 2, background: done ? '#334EAC' : 'rgba(186,214,235,0.1)' }} />
            )}
            <div style={{
              width: 24, height: 24, borderRadius: '50%', zIndex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: done ? '#334EAC' : active ? '#BAD6EB' : 'rgba(186,214,235,0.08)',
              border: `2px solid ${done || active ? '#334EAC' : 'rgba(186,214,235,0.15)'}`,
              fontSize: 10, fontWeight: 700,
              color: done ? 'white' : active ? '#081F5C' : 'rgba(186,214,235,0.2)',
            }}>
              {done ? '✓' : stepNum}
            </div>
            <p style={{ fontSize: 9, marginTop: 5, textAlign: 'center', fontWeight: active ? 700 : 400, color: active ? 'rgba(255,255,255,0.85)' : done ? 'rgba(186,214,235,0.6)' : 'rgba(186,214,235,0.25)' }}>
              {LABELS[i]}
            </p>
          </div>
        )
      })}
    </div>
  )
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function StepNav({ onBack, onNext, nextDisabled }: { onBack: () => void; onNext: () => void; nextDisabled?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
      <button
        onClick={onBack}
        style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid rgba(186,214,235,0.2)', background: 'rgba(255,255,255,0.05)', color: 'rgba(186,214,235,0.7)', fontSize: 13, cursor: 'pointer' }}
      >
        ← Volver
      </button>
      <button
        onClick={onNext}
        disabled={nextDisabled}
        style={{ ...primaryBtn, flex: 1, opacity: nextDisabled ? 0.4 : 1 }}
      >
        Siguiente →
      </button>
    </div>
  )
}

function SelectableCard({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClick} style={{
      border: `2px solid ${selected ? '#334EAC' : 'rgba(186,214,235,0.15)'}`,
      borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
      background: selected ? 'rgba(51,78,172,0.1)' : 'rgba(255,255,255,0.03)',
      transition: 'border-color 0.15s, background 0.15s',
    }}>
      {children}
    </div>
  )
}

function ConvexoAccountSelectCard({ acct, selected, onSelect }: { acct: ConvexoAccount; selected: boolean; onSelect: () => void }) {
  return (
    <SelectableCard selected={selected} onClick={onSelect}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(186,214,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
          {acct.method === 'BANK' ? '🏦' : acct.method === 'CASH' ? '💵' : '₿'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
              {acct.label ?? acct.details.bank_name ?? acct.details.address?.slice(0, 14) ?? acct.method}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(51,78,172,0.3)', color: '#BAD6EB', padding: '1px 7px', borderRadius: 99 }}>
              {acct.method}
            </span>
            {acct.details.currency && (
              <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(16,185,129,0.2)', color: '#10b981', padding: '1px 7px', borderRadius: 99 }}>
                {acct.details.currency}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(186,214,235,0.5)', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {acct.details.bank_name && acct.method === 'BANK' && <span>{acct.details.bank_name}</span>}
            {acct.details.account_number && <span>Cuenta: {acct.details.account_number}</span>}
            {acct.details.network && acct.method === 'CRYPTO' && <span>{acct.details.network}</span>}
            {acct.details.address && acct.method === 'CRYPTO' && (
              <span style={{ fontFamily: 'monospace' }}>{acct.details.address.slice(0, 18)}…</span>
            )}
            {acct.details.city && acct.method === 'CASH' && <span>{[acct.details.place_name, acct.details.city].filter(Boolean).join(', ')}</span>}
            {acct.details.instructions && <span style={{ fontStyle: 'italic' }}>{acct.details.instructions.slice(0, 50)}{acct.details.instructions.length > 50 ? '…' : ''}</span>}
          </div>
        </div>
      </div>
    </SelectableCard>
  )
}

function ReviewRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: 'rgba(186,214,235,0.4)', flexShrink: 0 }}>{label}:</span>
      <span style={{ color: highlight ? '#BAD6EB' : 'rgba(255,255,255,0.85)', fontWeight: highlight ? 700 : 400, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

function TokenAmount({ token, amount, onToken, onAmount, max }: {
  token: Token; amount: string; onToken: (t: Token) => void; onAmount: (v: string) => void; max?: number
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
      <div>
        <label style={labelStyle}>Token</label>
        <select style={inputStyle} value={token} onChange={(e) => onToken(e.target.value as Token)}>
          {TOKENS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label style={{ ...labelStyle, display: 'flex', justifyContent: 'space-between' }}>
          <span>Monto</span>
          {max !== undefined && (
            <button type="button" onClick={() => onAmount(String(max))} style={{ fontSize: 11, color: '#BAD6EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Máx</button>
          )}
        </label>
        <input type="number" min="0" step="any" style={inputStyle} placeholder="0.00" value={amount} onChange={(e) => onAmount(e.target.value)} />
      </div>
    </div>
  )
}

function SpreadBox({ rate, cop, spread, dir }: { rate: number; cop: number; spread: number; dir: 'in' | 'out' }) {
  const valueColor = dir === 'in' ? '#BAD6EB' : '#10b981'
  const spreadAmt  = rate * spread
  return (
    <div style={{ background: 'rgba(186,214,235,0.08)', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'rgba(186,214,235,0.7)' }}>
          Tasa base <span style={{ color: 'rgba(186,214,235,0.4)' }}>×</span> spread {(spread * 100).toFixed(2)}%
        </span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
          {rate.toLocaleString(undefined, { maximumFractionDigits: 0 })} {dir === 'in' ? '+' : '−'} {spreadAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          {' = '}
          <strong>{(dir === 'in' ? rate + spreadAmt : rate - spreadAmt).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(186,214,235,0.15)', paddingTop: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
          {dir === 'in' ? 'Debes enviar (COP)' : 'Recibes (COP)'}
        </span>
        <span style={{ fontSize: 16, fontWeight: 800, color: valueColor }}>${cop.toLocaleString(undefined, { maximumFractionDigits: 0 })} COP</span>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(186,214,235,0.7)', marginBottom: 5 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 7, border: '1px solid rgba(186,214,235,0.2)', fontSize: 13, color: 'white', background: 'rgba(255,255,255,0.07)', outline: 'none', boxSizing: 'border-box' }
const primaryBtn: React.CSSProperties = { width: '100%', padding: '11px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #334EAC, #401777)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }
