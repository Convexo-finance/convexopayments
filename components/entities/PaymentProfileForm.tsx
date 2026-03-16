'use client'
import { useState } from 'react'
import QRCode from 'react-qr-code'
import { Country } from 'country-state-city'
import { FileUpload } from '@/components/ui/FileUpload'

const CRYPTO_CHAINS = [
  { value: 'Ethereum', label: 'Ethereum', color: '#627eea' },
  { value: 'Solana',   label: 'Solana',   color: '#9945ff' },
  { value: 'Tron',     label: 'Tron',     color: '#ef0027' },
]

function CryptoQR({ address, size = 120 }: { address: string; size?: number }) {
  return <QRCode value={address} size={size} />
}

const ALL_COUNTRIES = Country.getAllCountries().sort((a, b) => a.name.localeCompare(b.name))
const POPULAR_ISO = ['CO', 'US', 'MX', 'ES', 'CN', 'AR', 'BR', 'DE', 'GB', 'FR']

type Method = 'BANK' | 'CRYPTO' | 'WECHAT' | 'ALIBABA' | 'PAYPAL' | 'CASH'

interface PaymentProfileFormProps {
  entityType: string
  entityId: string
  privyToken: string
  onSave: () => void
  initial?: {
    id?: string
    method?: Method
    label?: string
    details?: Record<string, string>
    is_default?: boolean
    doc_url?: string
  }
}

const METHODS: { value: Method; label: string }[] = [
  { value: 'BANK', label: 'Bank Account' },
  { value: 'CRYPTO', label: 'Crypto Wallet' },
  { value: 'WECHAT', label: 'WeChat Pay' },
  { value: 'ALIBABA', label: 'Alibaba / Alipay' },
  { value: 'PAYPAL', label: 'PayPal' },
  { value: 'CASH', label: 'Cash' },
]

export function PaymentProfileForm({
  entityType,
  entityId,
  privyToken,
  onSave,
  initial = {},
}: PaymentProfileFormProps) {
  const [method, setMethod] = useState<Method>(initial.method ?? 'BANK')
  const [label, setLabel] = useState(initial.label ?? '')
  const [details, setDetails] = useState<Record<string, string>>(
    (initial.details as Record<string, string>) ?? {}
  )
  const [isDefault, setIsDefault] = useState(initial.is_default ?? false)
  const [docUrl, setDocUrl] = useState(initial.doc_url ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function countrySelect(key: string) {
    const popularCountries = POPULAR_ISO.map((iso) => ALL_COUNTRIES.find((c) => c.isoCode === iso)).filter(Boolean)
    const otherCountries = ALL_COUNTRIES.filter((c) => !POPULAR_ISO.includes(c.isoCode))
    return (
      <select
        key={key}
        value={details[key] ?? ''}
        onChange={(e) => setDetails((d) => ({ ...d, [key]: e.target.value }))}
        style={inputStyle}
      >
        <option value="">Select country...</option>
        <optgroup label="Popular">
          {popularCountries.map((c) => (
            <option key={c!.isoCode} value={c!.name}>{c!.flag} {c!.name}</option>
          ))}
        </optgroup>
        <optgroup label="All countries">
          {otherCountries.map((c) => (
            <option key={c.isoCode} value={c.name}>{c.flag} {c.name}</option>
          ))}
        </optgroup>
      </select>
    )
  }

  function field(key: string, label: string, placeholder?: string) {
    return (
      <div key={key}>
        <label style={labelStyle}>{label}</label>
        <input
          placeholder={placeholder ?? label}
          value={details[key] ?? ''}
          onChange={(e) => setDetails((d) => ({ ...d, [key]: e.target.value }))}
          style={inputStyle}
        />
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { createPaymentProfile, updatePaymentProfile } = await import('@/lib/actions/payment-profiles')
      const data = {
        entity_type: entityType as 'SUPPLIER' | 'CLIENT',
        entity_id: entityId,
        method,
        label: label || method,
        details,
        is_default: isDefault,
        doc_url: docUrl || undefined,
      }
      if (initial.id) {
        await updatePaymentProfile(privyToken, initial.id, data)
      } else {
        await createPaymentProfile(privyToken, data)
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
      {/* Method tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {METHODS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMethod(m.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              border: '1px solid',
              borderColor: method === m.value ? '#334EAC' : 'rgba(186,214,235,0.2)',
              background: method === m.value ? '#334EAC' : 'rgba(255,255,255,0.07)',
              color: method === m.value ? 'white' : 'rgba(186,214,235,0.8)',
              fontSize: 12,
              fontWeight: method === m.value ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div>
        <label style={labelStyle}>Label</label>
        <input
          placeholder="e.g. Main USD Account"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          style={inputStyle}
        />
      </div>

      {method === 'BANK' && (
        <>
          {field('bank_name', 'Bank name')}
          {field('bank_address', 'Bank address')}
          {field('account_name', 'Account holder name')}
          {field('account_number', 'Account number / IBAN')}
          {field('routing_number', 'Routing / SWIFT / Sort code')}
          {field('branch_code', 'Branch code (optional)')}
          {field('bank_code', 'Bank code (optional)')}
          {field('currency', 'Currency', 'USD, EUR, GBP...')}
          <div>
            <label style={labelStyle}>Country</label>
            {countrySelect('country')}
          </div>
          <FileUpload
            label="Upload bank document (PDF)"
            accept=".pdf,.jpg,.png"
            onUpload={async (file) => {
              // Upload handled by parent via Supabase Storage
              const url = URL.createObjectURL(file)
              setDocUrl(url)
              return url
            }}
            currentUrl={docUrl}
          />
        </>
      )}

      {method === 'CRYPTO' && (
        <>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: 'rgba(186,214,235,0.7)', marginBottom: 6, fontWeight: 600 }}>Chain</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {CRYPTO_CHAINS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setDetails((d) => ({ ...d, network: c.value }))}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 8,
                    border: '1px solid',
                    borderColor: details.network === c.value ? c.color : 'rgba(186,214,235,0.2)',
                    background: details.network === c.value ? c.color + '22' : 'rgba(255,255,255,0.07)',
                    color: details.network === c.value ? c.color : 'rgba(186,214,235,0.7)',
                    fontSize: 12, fontWeight: details.network === c.value ? 700 : 400, cursor: 'pointer',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          {field('token', 'Token', 'USDC, USDT...')}
          {field('address', 'Wallet address')}
          {details.address && (
            <div style={{ display: 'flex', justifyContent: 'center', background: 'white', borderRadius: 10, padding: 12 }}>
              <CryptoQR address={details.address} size={140} />
            </div>
          )}
        </>
      )}

      {method === 'WECHAT' && (
        <>
          {field('wechat_id', 'WeChat ID')}
          {field('name', 'Account name', 'Name on WeChat account')}
          <FileUpload
            label="Upload WeChat QR code"
            accept=".jpg,.png,.pdf"
            onUpload={async (file) => {
              const url = URL.createObjectURL(file)
              setDocUrl(url)
              return url
            }}
            currentUrl={docUrl}
          />
        </>
      )}

      {method === 'ALIBABA' && (
        <>
          {field('alibaba_id', 'Alibaba / Alipay ID')}
          {field('name', 'Account name')}
        </>
      )}

      {method === 'PAYPAL' && (
        <>
          {field('email', 'PayPal email')}
        </>
      )}

      {method === 'CASH' && (
        <>
          {field('currency', 'Currency', 'e.g. USD, COP, EUR')}
          {field('instructions', 'Instructions / location')}
        </>
      )}

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(186,214,235,0.7)' }}>
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
        />
        Set as default
      </label>

      {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}

      <button
        type="submit"
        disabled={loading}
        style={{
          background: 'linear-gradient(135deg, #334EAC, #401777)',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: 14,
          fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Saving...' : initial.id ? 'Update' : 'Add Payment Method'}
      </button>
    </form>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: 'rgba(186,214,235,0.7)',
  marginBottom: 5,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid rgba(186,214,235,0.2)',
  fontSize: 14,
  color: 'white',
  background: 'rgba(255,255,255,0.07)',
  outline: 'none',
}
