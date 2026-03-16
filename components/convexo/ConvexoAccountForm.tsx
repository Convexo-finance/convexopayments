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

// Where this account can be used — applies to ALL method types
const DIRECTIONS = [
  { value: 'COMPRAR',     label: 'COMPRAR',              desc: 'Shown for OTC buy orders (user sends fiat to Convexo)' },
  { value: 'VENDER',      label: 'VENDER',               desc: 'Shown for OTC sell orders (Convexo sends fiat to user)' },
  { value: 'OTC',         label: 'COMPRAR + VENDER',     desc: 'Available for both OTC directions' },
  { value: 'COLLECTIONS', label: 'COLLECTIONS',          desc: 'Shown in collect orders (client sends fiat to this account)' },
  { value: 'ALL',         label: 'Todos / All',          desc: 'Available everywhere' },
]

type Method = 'BANK' | 'CRYPTO' | 'CASH'

const METHODS: { value: Method; label: string; desc: string }[] = [
  { value: 'BANK',   label: 'Bank Account', desc: 'Wire transfer — financial coordinates' },
  { value: 'CRYPTO', label: 'Crypto Wallet', desc: 'USDC/crypto on-chain address' },
  { value: 'CASH',   label: 'Cash Point',   desc: 'Physical location for in-person cash exchange' },
]

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
  const [method, setMethod] = useState<Method>(initial.method as Method ?? 'BANK')
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
        <label style={labelStyle}>Country</label>
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
        <label style={labelStyle}>State / Department</label>
        <select value={details[stateKey] ?? ''} onChange={(e) => set(stateKey, e.target.value)} style={inputStyle}>
          <option value="">Select state...</option>
          {states.map((s) => <option key={s.isoCode} value={s.name}>{s.name}</option>)}
        </select>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Method selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {METHODS.map((m) => (
          <button key={m.value} type="button" onClick={() => setMethod(m.value)} style={{
            padding: '10px 14px', borderRadius: 8, border: '1px solid', textAlign: 'left',
            borderColor: method === m.value ? '#334EAC' : 'rgba(186,214,235,0.2)',
            background: method === m.value ? 'rgba(51,78,172,0.15)' : 'rgba(255,255,255,0.05)',
            cursor: 'pointer',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: method === m.value ? '#BAD6EB' : 'rgba(255,255,255,0.7)' }}>{m.label}</div>
            <div style={{ fontSize: 11, color: 'rgba(186,214,235,0.4)', marginTop: 2 }}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Label */}
      <div>
        <label style={labelStyle}>Label</label>
        <input placeholder="e.g. Bancolombia COP · Bogotá" value={label} onChange={(e) => setLabel(e.target.value)} style={inputStyle} />
      </div>

      {/* ── BANK fields ── */}
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

      {/* ── CRYPTO fields ── */}
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

      {/* ── CASH Point fields ── */}
      {method === 'CASH' && (
        <>
          <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.45)', marginTop: -4 }}>
            Physical location where cash is exchanged in person.
          </p>
          {field('place_name', 'Place name', 'e.g. Oficina Convexo Bogotá', true)}
          {countrySelect('country')}
          {stateSelect('country', 'state')}
          {field('city', 'City')}
          {field('address', 'Street address')}
          <div>
            <label style={labelStyle}>Instructions <span style={{ color: 'rgba(186,214,235,0.35)', fontWeight: 400 }}>(optional)</span></label>
            <textarea
              placeholder="Hours, contact info, any extra instructions…"
              value={details.instructions ?? ''}
              onChange={(e) => set('instructions', e.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' as const }}
            />
          </div>
        </>
      )}

      {/* ── Available for (all methods) ── */}
      <div>
        <label style={labelStyle}>Available for</label>
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

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(186,214,235,0.7)' }}>
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
        Set as default
      </label>

      {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}

      <button type="submit" disabled={loading} style={{
        background: 'linear-gradient(135deg, #334EAC, #401777)', color: 'white',
        border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14,
        fontWeight: 600, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
      }}>
        {loading ? 'Saving...' : initial.id ? 'Update Account' : 'Add Account'}
      </button>
    </form>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(186,214,235,0.7)', marginBottom: 5 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(186,214,235,0.2)', fontSize: 14, color: 'white', background: 'rgba(255,255,255,0.07)', outline: 'none', boxSizing: 'border-box' }
