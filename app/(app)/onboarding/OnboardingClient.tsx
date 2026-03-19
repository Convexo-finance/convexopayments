'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { Country } from 'country-state-city'

const VOLUME_OPTIONS = [
  { value: '0-50k',    label: 'Menos de $50,000 USD' },
  { value: '50k-200k', label: '$50,000 – $200,000 USD' },
  { value: '200k-1m',  label: '$200,000 – $1,000,000 USD' },
  { value: '+1m',      label: 'Más de $1,000,000 USD' },
]

const ALL_COUNTRIES = Country.getAllCountries().map((c) => ({ code: c.isoCode, name: c.name }))

interface Props {
  privyToken: string
}

export function OnboardingClient({ privyToken }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    contact_email: '',
    phone_country_code: '+57',
    phone: '',
    supplier_countries: [] as string[],
    supplier_annual_volume: '',
    client_countries: [] as string[],
    client_annual_volume: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function toggleCountry(field: 'supplier_countries' | 'client_countries', name: string) {
    setForm((f) => {
      const current = f[field]
      return {
        ...f,
        [field]: current.includes(name)
          ? current.filter((c) => c !== name)
          : [...current, name],
      }
    })
  }

  const step1Valid = form.first_name.trim() && form.last_name.trim() && form.phone.trim()

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const { completeOnboarding } = await import('@/lib/actions/profile')
      await completeOnboarding(privyToken, form)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo salió mal')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(180deg, #02001A 0%, #2A0144 100%)', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 500,
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(186,214,235,0.1)',
        borderRadius: 16, padding: '36px 32px',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 13, color: 'rgba(186,214,235,0.5)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
            Convexo Payments
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'white', letterSpacing: '-0.4px' }}>
            {step === 1 ? 'Bienvenido' : step === 2 ? 'Tus proveedores' : step === 3 ? 'Tus clientes' : 'Confirma tus datos'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(186,214,235,0.55)', marginTop: 6 }}>
            {step === 1 ? 'Cuéntanos un poco sobre ti para comenzar.' :
             step === 2 ? 'Cuéntanos sobre tus pagos a proveedores internacionales.' :
             step === 3 ? 'Cuéntanos sobre tus cobros de clientes internacionales.' :
             'Revisa tu información antes de continuar.'}
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28, justifyContent: 'center' }}>
          {([1, 2, 3, 4] as const).map((s) => (
            <div key={s} style={{
              width: s === step ? 28 : 8, height: 6, borderRadius: 3,
              background: s === step ? '#334EAC' : s < step ? '#10b981' : 'rgba(186,214,235,0.2)',
              transition: 'width 0.2s, background 0.2s',
            }} />
          ))}
        </div>

        {/* ── Step 1: Personal info ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Nombre *</label>
                <input style={inputStyle} placeholder="Juan" value={form.first_name}
                  onChange={(e) => setField('first_name', e.target.value)} autoFocus />
              </div>
              <div>
                <label style={labelStyle}>Apellido *</label>
                <input style={inputStyle} placeholder="Pérez" value={form.last_name}
                  onChange={(e) => setField('last_name', e.target.value)} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Email de contacto</label>
              <input type="email" style={inputStyle} placeholder="correo@empresa.com"
                value={form.contact_email} onChange={(e) => setField('contact_email', e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Teléfono *</label>
              <PhoneInput
                countryCode={form.phone_country_code} number={form.phone}
                onCountryChange={(code) => setField('phone_country_code', code)}
                onNumberChange={(num) => setField('phone', num)}
              />
            </div>
            <button onClick={() => setStep(2)} disabled={!step1Valid}
              style={{ ...primaryBtn, marginTop: 8, opacity: step1Valid ? 1 : 0.5, cursor: step1Valid ? 'pointer' : 'not-allowed' }}>
              Continuar →
            </button>
          </div>
        )}

        {/* ── Step 2: Proveedores ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={labelStyle}>¿De qué países son tus proveedores?</label>
              <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)', margin: '0 0 10px' }}>Puedes seleccionar varios.</p>
              <CountryPicker
                selected={form.supplier_countries}
                onToggle={(name) => toggleCountry('supplier_countries', name)}
              />
            </div>
            <div>
              <label style={labelStyle}>Valor estimado de pagos a proveedores internacionales al año (USD)</label>
              <VolumeSelect
                value={form.supplier_annual_volume}
                onChange={(v) => setField('supplier_annual_volume', v)}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ ...secondaryBtn, flex: 1 }}>← Volver</button>
              <button onClick={() => setStep(3)} style={{ ...primaryBtn, flex: 2 }}>Continuar →</button>
            </div>
          </div>
        )}

        {/* ── Step 3: Clientes ── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={labelStyle}>¿De qué países son tus clientes?</label>
              <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)', margin: '0 0 10px' }}>Puedes seleccionar varios.</p>
              <CountryPicker
                selected={form.client_countries}
                onToggle={(name) => toggleCountry('client_countries', name)}
              />
            </div>
            <div>
              <label style={labelStyle}>Valor estimado de cobros de clientes internacionales al año (USD)</label>
              <VolumeSelect
                value={form.client_annual_volume}
                onChange={(v) => setField('client_annual_volume', v)}
              />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ ...secondaryBtn, flex: 1 }}>← Volver</button>
              <button onClick={() => setStep(4)} style={{ ...primaryBtn, flex: 2 }}>Continuar →</button>
            </div>
          </div>
        )}

        {/* ── Step 4: Confirm ── */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SummaryRow label="Nombre" value={`${form.first_name} ${form.last_name}`} />
              {form.contact_email && <SummaryRow label="Email" value={form.contact_email} />}
              <SummaryRow label="Teléfono" value={`${form.phone_country_code} ${form.phone}`} />
              {form.supplier_countries.length > 0 && (
                <SummaryRow label="Países proveedores" value={form.supplier_countries.slice(0, 3).join(', ') + (form.supplier_countries.length > 3 ? ` +${form.supplier_countries.length - 3}` : '')} />
              )}
              {form.supplier_annual_volume && (
                <SummaryRow label="Pagos a proveedores / año" value={VOLUME_OPTIONS.find(o => o.value === form.supplier_annual_volume)?.label ?? form.supplier_annual_volume} />
              )}
              {form.client_countries.length > 0 && (
                <SummaryRow label="Países clientes" value={form.client_countries.slice(0, 3).join(', ') + (form.client_countries.length > 3 ? ` +${form.client_countries.length - 3}` : '')} />
              )}
              {form.client_annual_volume && (
                <SummaryRow label="Cobros de clientes / año" value={VOLUME_OPTIONS.find(o => o.value === form.client_annual_volume)?.label ?? form.client_annual_volume} />
              )}
            </div>

            {error && <p style={{ fontSize: 13, color: '#ef4444', textAlign: 'center' }}>{error}</p>}

            <button onClick={handleSubmit} disabled={loading}
              style={{ ...primaryBtn, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Guardando…' : 'Confirmar y continuar'}
            </button>
            <button onClick={() => setStep(3)} disabled={loading} style={secondaryBtn}>
              ← Volver
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Country picker ──

function CountryPicker({ selected, onToggle }: { selected: string[]; onToggle: (name: string) => void }) {
  const [search, setSearch] = useState('')
  const filtered = search.trim()
    ? ALL_COUNTRIES.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : ALL_COUNTRIES

  return (
    <div>
      <input
        style={{ ...inputStyle, marginBottom: 8 }}
        placeholder="Buscar país…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {/* Selected chips */}
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {selected.map((name) => (
            <button key={name} onClick={() => onToggle(name)} style={{
              background: 'rgba(51,78,172,0.3)', border: '1px solid rgba(186,214,235,0.3)',
              borderRadius: 99, padding: '3px 10px', fontSize: 12, color: '#BAD6EB',
              cursor: 'pointer', fontWeight: 500,
            }}>
              {name} ✕
            </button>
          ))}
        </div>
      )}
      {/* Country list */}
      <div style={{
        maxHeight: 180, overflowY: 'auto', border: '1px solid rgba(186,214,235,0.15)',
        borderRadius: 8, background: 'rgba(0,0,0,0.2)',
      }}>
        {filtered.slice(0, 80).map((c) => {
          const isSelected = selected.includes(c.name)
          return (
            <button key={c.code} onClick={() => onToggle(c.name)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '8px 12px', border: 'none', borderBottom: '1px solid rgba(186,214,235,0.05)',
              background: isSelected ? 'rgba(51,78,172,0.2)' : 'transparent',
              cursor: 'pointer', textAlign: 'left', fontSize: 13,
              color: isSelected ? '#BAD6EB' : 'rgba(255,255,255,0.75)',
            }}>
              <span style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                background: isSelected ? '#334EAC' : 'rgba(186,214,235,0.1)',
                border: `1px solid ${isSelected ? '#334EAC' : 'rgba(186,214,235,0.2)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: 'white',
              }}>
                {isSelected ? '✓' : ''}
              </span>
              {c.name}
            </button>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ padding: '14px 12px', fontSize: 13, color: 'rgba(186,214,235,0.3)', textAlign: 'center' }}>
            No se encontraron países
          </div>
        )}
      </div>
    </div>
  )
}

// ── Volume dropdown ──

function VolumeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {VOLUME_OPTIONS.map((opt) => (
        <button key={opt.value} onClick={() => onChange(opt.value)} style={{
          padding: '10px 14px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
          border: `1px solid ${value === opt.value ? 'rgba(51,78,172,0.6)' : 'rgba(186,214,235,0.15)'}`,
          background: value === opt.value ? 'rgba(51,78,172,0.2)' : 'rgba(255,255,255,0.03)',
          color: value === opt.value ? '#BAD6EB' : 'rgba(255,255,255,0.7)',
          fontSize: 13, fontWeight: value === opt.value ? 600 : 400,
        }}>
          {value === opt.value && <span style={{ marginRight: 8, color: '#10b981' }}>✓</span>}
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Shared helpers ──

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <span style={{ fontSize: 12, color: 'rgba(186,214,235,0.55)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'rgba(186,214,235,0.7)', marginBottom: 5,
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid rgba(186,214,235,0.2)', fontSize: 13,
  color: 'white', background: 'rgba(255,255,255,0.07)',
  outline: 'none', boxSizing: 'border-box',
}
const primaryBtn: React.CSSProperties = {
  width: '100%', padding: '12px 20px', borderRadius: 10,
  border: 'none', background: 'linear-gradient(135deg, #334EAC, #401777)',
  color: 'white', fontSize: 14, fontWeight: 600,
}
const secondaryBtn: React.CSSProperties = {
  width: '100%', padding: '10px 20px', borderRadius: 10,
  border: '1px solid rgba(186,214,235,0.2)',
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(186,214,235,0.7)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}
