'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PhoneInput } from '@/components/ui/PhoneInput'

interface Props {
  privyToken: string
}

export function OnboardingClient({ privyToken }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone_country_code: '+57',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleContinue() {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.phone.trim()) return
    setStep(2)
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const { completeOnboarding } = await import('@/lib/actions/profile')
      await completeOnboarding(privyToken, form)
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #02001A 0%, #2A0144 100%)',
      padding: 24,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 460,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(186,214,235,0.1)',
        borderRadius: 16,
        padding: '36px 32px',
      }}>
        {/* Logo / brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 13, color: 'rgba(186,214,235,0.5)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
            Convexo Payments
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'white', letterSpacing: '-0.4px' }}>
            {step === 1 ? 'Bienvenido' : 'Confirma tus datos'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(186,214,235,0.55)', marginTop: 6 }}>
            {step === 1
              ? 'Cuéntanos un poco sobre ti para comenzar.'
              : 'Revisa tu información antes de continuar.'}
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28, justifyContent: 'center' }}>
          {[1, 2].map((s) => (
            <div
              key={s}
              style={{
                width: s === step ? 24 : 8,
                height: 6,
                borderRadius: 3,
                background: s === step ? '#334EAC' : s < step ? '#10b981' : 'rgba(186,214,235,0.2)',
                transition: 'width 0.2s, background 0.2s',
              }}
            />
          ))}
        </div>

        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Nombre *</label>
                <input
                  style={inputStyle}
                  placeholder="Juan"
                  value={form.first_name}
                  onChange={(e) => set('first_name', e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label style={labelStyle}>Apellido *</label>
                <input
                  style={inputStyle}
                  placeholder="Pérez"
                  value={form.last_name}
                  onChange={(e) => set('last_name', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Teléfono *</label>
              <PhoneInput
                countryCode={form.phone_country_code}
                number={form.phone}
                onCountryChange={(code) => set('phone_country_code', code)}
                onNumberChange={(num) => set('phone', num)}
              />
            </div>

            <button
              onClick={handleContinue}
              disabled={!form.first_name.trim() || !form.last_name.trim() || !form.phone.trim()}
              style={{
                ...primaryBtn,
                marginTop: 8,
                opacity: (!form.first_name.trim() || !form.last_name.trim() || !form.phone.trim()) ? 0.5 : 1,
                cursor: (!form.first_name.trim() || !form.last_name.trim() || !form.phone.trim()) ? 'not-allowed' : 'pointer',
              }}
            >
              Continuar →
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Summary */}
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SummaryRow label="Nombre" value={`${form.first_name} ${form.last_name}`} />
              <SummaryRow label="Teléfono" value={`${form.phone_country_code} ${form.phone}`} />
            </div>

            {error && (
              <p style={{ fontSize: 13, color: '#ef4444', textAlign: 'center' }}>{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{ ...primaryBtn, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Guardando…' : 'Confirmar y continuar'}
            </button>

            <button
              onClick={() => setStep(1)}
              disabled={loading}
              style={secondaryBtn}
            >
              ← Volver
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: 'rgba(186,214,235,0.55)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{value}</span>
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
