'use client'
import { useState } from 'react'
import QRCode from 'react-qr-code'
import { Country, State } from 'country-state-city'

const CRYPTO_CHAINS = [
  { value: 'Ethereum', label: 'Ethereum', color: '#627eea' },
  { value: 'Solana',   label: 'Solana',   color: '#9945ff' },
  { value: 'Tron',     label: 'Tron',     color: '#ef0027' },
]

const ALL_COUNTRIES = Country.getAllCountries().sort((a, b) => a.name.localeCompare(b.name))
const POPULAR_ISO = ['CO', 'US', 'MX', 'ES', 'CN', 'AR', 'BR', 'DE', 'GB', 'FR']

const DIRECTIONS = [
  { value: 'COMPRAR',     label: 'COMPRAR',           desc: 'OTC buy orders — user sends fiat to Convexo' },
  { value: 'VENDER',      label: 'VENDER',            desc: 'OTC sell orders — Convexo sends fiat to user' },
  { value: 'OTC',         label: 'COMPRAR + VENDER',  desc: 'Both OTC directions' },
  { value: 'COLLECTIONS', label: 'COLLECTIONS',       desc: 'Collect orders — client sends fiat here' },
  { value: 'PAYMENTS',   label: 'PAYMENTS',           desc: 'Pay orders — user sends funds to Convexo to pay a supplier' },
  { value: 'ALL',         label: 'Todos / All',       desc: 'Available everywhere' },
]

type Method = 'BANK' | 'CRYPTO' | 'CASH'

const METHOD_CARDS: { value: Method; icon: string; label: string; desc: string }[] = [
  { value: 'BANK',   icon: '🏦', label: 'Bank Account',  desc: 'Wire transfer · financial coordinates' },
  { value: 'CRYPTO', icon: '₿',  label: 'Crypto Wallet', desc: 'USDC/crypto on-chain address' },
  { value: 'CASH',   icon: '💵', label: 'Cash Point',    desc: 'Physical location for in-person cash exchange' },
]

const STEP_LABELS = ['Tipo', 'Detalles', 'Configuración']

interface ConvexoAccountFormProps {
  privyToken: string
  onSave: () => void
  initial?: {
    id?: string
    method?: Method
    label?: string
    details?: Record<string, string>
    is_default?: boolean
  }
}

export function ConvexoAccountForm({ privyToken, onSave, initial = {} }: ConvexoAccountFormProps) {
  // When editing, allow jumping to any step
  const isEdit = !!initial.id
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [method, setMethod] = useState<Method>(initial.method ?? 'BANK')
  const [label, setLabel] = useState(initial.label ?? '')
  const [details, setDetails] = useState<Record<string, string>>(initial.details ?? {})
  const [isDefault, setIsDefault] = useState(initial.is_default ?? false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: string, value: string) {
    setDetails((d) => ({ ...d, [key]: value }))
  }

  function field(key: string, labelText: string, placeholder?: string, optional = false) {
    return (
      <div key={key}>
        <label style={labelStyle}>{labelText}{optional && <span style={{ color: 'rgba(186,214,235,0.35)', fontWeight: 400 }}> (optional)</span>}</label>
        <input
          placeholder={placeholder ?? labelText}
          value={details[key] ?? ''}
          onChange={(e) => set(key, e.target.value)}
          style={inputStyle}
        />
      </div>
    )
  }

  function countrySelect(key: string) {
    const popular = POPULAR_ISO.map((iso) => ALL_COUNTRIES.find((c) => c.isoCode === iso)).filter(Boolean)
    const rest = ALL_COUNTRIES.filter((c) => !POPULAR_ISO.includes(c.isoCode))
    return (
      <div key={key}>
        <label style={labelStyle}>País</label>
        <select value={details[key] ?? ''} onChange={(e) => set(key, e.target.value)} style={inputStyle}>
          <option value="">Select country...</option>
          <optgroup label="Popular">
            {popular.map((c) => <option key={c!.isoCode} value={c!.isoCode}>{c!.flag} {c!.name}</option>)}
          </optgroup>
          <optgroup label="All countries">
            {rest.map((c) => <option key={c.isoCode} value={c.isoCode}>{c.flag} {c.name}</option>)}
          </optgroup>
        </select>
      </div>
    )
  }

  function stateSelect(countryKey: string, stateKey: string) {
    const countryCode = details[countryKey] ?? ''
    const states = countryCode ? State.getStatesOfCountry(countryCode) : []
    if (states.length === 0) return field(stateKey, 'State / Department', 'e.g. Cundinamarca')
    return (
      <div key={stateKey}>
        <label style={labelStyle}>Estado / Departamento</label>
        <select value={details[stateKey] ?? ''} onChange={(e) => set(stateKey, e.target.value)} style={inputStyle}>
          <option value="">Select state...</option>
          {states.map((s) => <option key={s.isoCode} value={s.name}>{s.name}</option>)}
        </select>
      </div>
    )
  }

  async function handleSubmit() {
    setLoading(true); setError(null)
    try {
      const { createConvexoAccount, updateConvexoAccount } = await import('@/lib/actions/convexo-accounts')
      const payload = { method, label: label || method, details, is_default: isDefault }
      if (initial.id) {
        await updateConvexoAccount(privyToken, initial.id, payload)
      } else {
        await createConvexoAccount(privyToken, payload)
      }
      onSave()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Progress indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {STEP_LABELS.map((label, i) => {
          const s = i + 1
          const done   = s < step
          const active = s === step
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: (isEdit || done) ? 'pointer' : 'default' }}
                onClick={() => { if (isEdit || done) setStep(s as 1 | 2 | 3) }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? '#334EAC' : active ? '#BAD6EB' : 'rgba(186,214,235,0.1)',
                  border: `2px solid ${done || active ? '#334EAC' : 'rgba(186,214,235,0.2)'}`,
                  fontSize: 11, fontWeight: 700,
                  color: done ? 'white' : active ? '#081F5C' : 'rgba(186,214,235,0.3)',
                }}>
                  {done ? '✓' : s}
                </div>
                <span style={{ fontSize: 10, marginTop: 4, color: active ? '#BAD6EB' : done ? 'rgba(186,214,235,0.6)' : 'rgba(186,214,235,0.3)', fontWeight: active ? 700 : 400 }}>
                  {label}
                </span>
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div style={{ flex: 1, height: 2, background: done ? '#334EAC' : 'rgba(186,214,235,0.15)', margin: '0 4px', marginBottom: 16 }} />
              )}
            </div>
          )
        })}
      </div>

      {/* ── STEP 1: Method type ── */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.5)', margin: 0 }}>Selecciona el tipo de cuenta:</p>
          {METHOD_CARDS.map((m) => (
            <button key={m.value} type="button"
              onClick={() => { setMethod(m.value); setStep(2) }}
              style={{
                padding: '14px 16px', borderRadius: 10, border: '1px solid', textAlign: 'left', cursor: 'pointer',
                borderColor: method === m.value ? '#334EAC' : 'rgba(186,214,235,0.2)',
                background: method === m.value ? 'rgba(51,78,172,0.15)' : 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
              <span style={{ fontSize: 28 }}>{m.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: method === m.value ? '#BAD6EB' : 'rgba(255,255,255,0.85)' }}>{m.label}</div>
                <div style={{ fontSize: 11, color: 'rgba(186,214,235,0.4)', marginTop: 2 }}>{m.desc}</div>
              </div>
              {method === m.value && <span style={{ marginLeft: 'auto', color: '#334EAC', fontSize: 16 }}>✓</span>}
            </button>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" onClick={() => setStep(2)}
              style={primaryBtn}>
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Details ── */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.5)', margin: 0 }}>
            {METHOD_CARDS.find(m => m.value === method)?.icon} {METHOD_CARDS.find(m => m.value === method)?.label} — completa los datos:
          </p>

          {method === 'BANK' && (
            <>
              {field('bank_name', 'Bank name')}
              {field('bank_address', 'Bank address', undefined, true)}
              {field('account_name', 'Account holder name')}
              {field('account_number', 'Account number / IBAN')}
              {field('routing_number', 'Routing / SWIFT / Sort code', undefined, true)}
              {field('branch_code', 'Branch code', undefined, true)}
              {field('bank_code', 'Bank code', undefined, true)}
              {field('currency', 'Currency', 'COP, USD, EUR…')}
              {countrySelect('country')}
            </>
          )}

          {method === 'CRYPTO' && (
            <>
              <div>
                <label style={labelStyle}>Chain</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {CRYPTO_CHAINS.map((c) => (
                    <button key={c.value} type="button"
                      onClick={() => set('network', c.value)}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid',
                        borderColor: details.network === c.value ? c.color : 'rgba(186,214,235,0.2)',
                        background: details.network === c.value ? c.color + '22' : 'rgba(255,255,255,0.07)',
                        color: details.network === c.value ? c.color : 'rgba(186,214,235,0.7)',
                        fontSize: 12, fontWeight: details.network === c.value ? 700 : 400, cursor: 'pointer',
                      }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              {field('token', 'Token', 'USDC, USDT…')}
              {field('address', 'Wallet address')}
              {details.address && (
                <div style={{ display: 'flex', justifyContent: 'center', background: 'white', borderRadius: 10, padding: 12 }}>
                  <QRCode value={details.address} size={140} />
                </div>
              )}
            </>
          )}

          {method === 'CASH' && (
            <>
              <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.45)', margin: '-6px 0 0' }}>
                Ubicación física donde se realiza el intercambio de efectivo.
              </p>
              {field('place_name', 'Place name', 'e.g. Oficina Convexo Bogotá', true)}
              {countrySelect('country')}
              {stateSelect('country', 'state')}
              {field('city', 'City')}
              {field('address', 'Street address')}
              <div>
                <label style={labelStyle}>Instructions <span style={{ color: 'rgba(186,214,235,0.35)', fontWeight: 400 }}>(optional)</span></label>
                <textarea
                  placeholder="Hours, contact info, extra instructions…"
                  value={details.instructions ?? ''}
                  onChange={(e) => set('instructions', e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' as const }}
                />
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={() => setStep(1)} style={secondaryBtn}>← Atrás</button>
            <button type="button" onClick={() => setStep(3)} style={{ ...primaryBtn, flex: 1 }}>Siguiente →</button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Configuration ── */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.5)', margin: 0 }}>Configura el uso de esta cuenta:</p>

          {/* Label */}
          <div>
            <label style={labelStyle}>Nombre / Label</label>
            <input
              placeholder="e.g. Bancolombia COP Bogotá"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Direction */}
          <div>
            <label style={labelStyle}>Disponible para</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DIRECTIONS.map((d) => (
                <button key={d.value} type="button"
                  onClick={() => set('direction', d.value)}
                  style={{
                    padding: '10px 14px', borderRadius: 8, border: '1px solid', textAlign: 'left', cursor: 'pointer',
                    borderColor: details.direction === d.value ? '#10b981' : 'rgba(186,214,235,0.2)',
                    background: details.direction === d.value ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.05)',
                  }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: details.direction === d.value ? '#10b981' : 'rgba(255,255,255,0.7)' }}>{d.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(186,214,235,0.4)', marginTop: 2 }}>{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Default */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(186,214,235,0.7)', cursor: 'pointer' }}>
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
            Set as default
          </label>

          {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => setStep(2)} style={secondaryBtn}>← Atrás</button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              style={{ ...primaryBtn, flex: 1, opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}
            >
              {loading ? 'Saving...' : initial.id ? 'Update Account' : 'Add Account'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(186,214,235,0.7)', marginBottom: 5 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(186,214,235,0.2)', fontSize: 14, color: 'white', background: 'rgba(255,255,255,0.07)', outline: 'none', boxSizing: 'border-box' }
const primaryBtn: React.CSSProperties = { background: 'linear-gradient(135deg, #334EAC, #401777)', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const secondaryBtn: React.CSSProperties = { background: 'rgba(255,255,255,0.07)', color: 'rgba(186,214,235,0.7)', border: '1px solid rgba(186,214,235,0.2)', borderRadius: 8, padding: '10px 16px', fontSize: 13, cursor: 'pointer' }
