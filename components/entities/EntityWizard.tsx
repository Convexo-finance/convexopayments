'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { Country } from 'country-state-city'
import { PaymentProfileForm } from './PaymentProfileForm'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { AddressInput } from '@/components/ui/AddressInput'

type EntityType = 'supplier' | 'client'

interface EntityWizardProps {
  entityType: EntityType
}

const INFO_STEPS = [
  'Registration',
  'Company Details',
  'Contact Person',
  'Address',
]
const STEPS = [...INFO_STEPS, 'Payment Methods']

// Company types keyed by ISO country code. Falls back to OTHER.
const COMPANY_TYPES: Record<string, string[]> = {
  // Latin America
  CO: ['SAS', 'SA', 'Ltda', 'Cooperativa', 'Empresa Unipersonal', 'Otra'],
  MX: ['SA de CV', 'SAPI de CV', 'SRL de CV', 'SC', 'Asociación Civil', 'Otra'],
  BR: ['LTDA', 'SA', 'MEI', 'EIRELI', 'SS', 'Outra'],
  AR: ['SA', 'SRL', 'SAS', 'Sociedad en Comandita', 'Cooperativa', 'Otra'],
  CL: ['SpA', 'SA', 'LTDA', 'Cooperativa', 'Fundación', 'Otra'],
  PE: ['SAC', 'SAA', 'EIRL', 'SRL', 'Otra'],
  PA: ['SA', 'LLC', 'Fundación de Interés Privado', 'Otra'],
  EC: ['SA', 'Cía Ltda', 'SAS', 'Otra'],
  UY: ['SA', 'SRL', 'SAS', 'Cooperativa', 'Otra'],
  CR: ['SA', 'SRL', 'Otra'],
  // North America
  US: ['LLC', 'Corporation (C-Corp)', 'S-Corporation', 'LLP', 'Partnership', 'Sole Proprietorship', 'Other'],
  CA: ['Corporation', 'Ltd', 'Inc', 'LLP', 'Partnership', 'Sole Proprietorship', 'Other'],
  // Europe
  GB: ['Ltd', 'PLC', 'LLP', 'Partnership', 'Sole Trader', 'Other'],
  DE: ['GmbH', 'AG', 'UG', 'OHG', 'KG', 'GbR', 'Other'],
  ES: ['SL', 'SA', 'SLU', 'Autónomo', 'Cooperativa', 'Other'],
  FR: ['SAS', 'SARL', 'SA', 'EURL', 'SCI', 'Other'],
  NL: ['BV', 'NV', 'VOF', 'Other'],
  PT: ['LDA', 'SA', 'Cooperativa', 'Other'],
  IT: ['SRL', 'SpA', 'SNC', 'SAS', 'Other'],
  // Asia
  CN: ['WFOE', 'JV', 'Representative Office', 'VIE Structure', 'Other'],
  HK: ['Limited', 'Partnership', 'Sole Proprietorship', 'Other'],
  SG: ['Pte Ltd', 'Ltd', 'LLP', 'Sole Proprietorship', 'Other'],
  IN: ['Pvt Ltd', 'Ltd', 'LLP', 'OPC', 'Partnership', 'Sole Proprietorship', 'Other'],
  // Middle East
  AE: ['LLC', 'Free Zone Company', 'Branch Office', 'Sole Establishment', 'Other'],
  // Fallback
  OTHER: ['LLC', 'Corporation', 'Ltd', 'Partnership', 'Other'],
}

function getCompanyTypes(isoCode: string): string[] {
  return COMPANY_TYPES[isoCode] ?? COMPANY_TYPES['OTHER']
}

// ── Single-select country picker ──
function RegistrationCountryPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (isoCode: string, name: string) => void
}) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(!value)

  const allCountries = useMemo(() => Country.getAllCountries(), [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return q
      ? allCountries.filter((c) => c.name.toLowerCase().includes(q) || c.isoCode.toLowerCase().includes(q))
      : allCountries
  }, [search, allCountries])

  const selectedCountry = allCountries.find((c) => c.isoCode === value)

  if (!open && selectedCountry) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          flex: 1,
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid rgba(186,214,235,0.2)',
          background: 'rgba(255,255,255,0.07)',
          color: 'white',
          fontSize: 14,
        }}>
          {selectedCountry.flag} {selectedCountry.name}
        </div>
        <button
          onClick={() => { setOpen(true); setSearch('') }}
          style={{
            background: 'none',
            border: '1px solid rgba(186,214,235,0.2)',
            borderRadius: 8,
            color: 'rgba(186,214,235,0.7)',
            fontSize: 12,
            padding: '10px 14px',
            cursor: 'pointer',
          }}
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <div>
      <input
        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginBottom: 6 }}
        placeholder="Search country..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />
      <div style={{
        maxHeight: 200,
        overflowY: 'auto',
        border: '1px solid rgba(186,214,235,0.15)',
        borderRadius: 8,
        background: 'rgba(2,0,26,0.95)',
      }}>
        {filtered.slice(0, 120).map((c) => (
          <button
            key={c.isoCode}
            onClick={() => {
              onChange(c.isoCode, c.name)
              setOpen(false)
              setSearch('')
            }}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '8px 12px',
              background: c.isoCode === value ? 'rgba(51,78,172,0.3)' : 'transparent',
              border: 'none',
              color: c.isoCode === value ? '#BAD6EB' : 'rgba(255,255,255,0.8)',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {c.flag} {c.name}
          </button>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: '10px 12px', color: 'rgba(186,214,235,0.4)', fontSize: 13 }}>
            No countries found
          </div>
        )}
      </div>
    </div>
  )
}

export function EntityWizard({ entityType }: EntityWizardProps) {
  const { getAccessToken } = usePrivy()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  // Set after entity creation
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [savedToken, setSavedToken] = useState<string>('')
  const [addedCount, setAddedCount] = useState(0)
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    internal_name: '',
    registration_country: '',      // ISO code, e.g. "CO", "US"
    registration_country_name: '', // human-readable, e.g. "Colombia"
    legal_name: '',
    company_type: '',
    registration_number: '',
    contact_email: '',
    company_phone: '',
    company_phone_code: '+57',
    contact_name: '',
    contact_phone: '',
    contact_phone_code: '+57',
    contact_person_email: '',
    address: '',
    state: '',
    state_code: '',
    city: '',
    postal_code: '',
    office_country: '',
    office_country_code: '',
  })

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const basePath = entityType === 'supplier' ? '/proveedores' : '/clientes'

  async function handleCreate() {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Not authenticated')

      const payload = {
        internal_name: form.internal_name,
        legal_name: form.legal_name,
        company_type: form.company_type,
        registration_country: form.registration_country_name || form.registration_country,
        registration_number: form.registration_number,
        contact_email: form.contact_email,
        company_phone: form.company_phone ? `${form.company_phone_code} ${form.company_phone}` : '',
        contact_name: form.contact_name,
        contact_phone: form.contact_phone ? `${form.contact_phone_code} ${form.contact_phone}` : '',
        contact_person_email: form.contact_person_email,
        address: form.address,
        state: form.state,
        state_code: form.state_code,
        city: form.city,
        postal_code: form.postal_code,
        office_country: form.office_country,
        office_country_code: form.office_country_code,
      }

      let id: string
      if (entityType === 'supplier') {
        const { createSupplier } = await import('@/lib/actions/entities')
        const { supplier, warning: w } = await createSupplier(token, payload)
        id = supplier.id
        if (w === 'DUPLICATE_EMAIL') setWarning('A contact with this email already exists, but proceeding.')
      } else {
        const { createEntityClient } = await import('@/lib/actions/entities')
        const { client, warning: w } = await createEntityClient(token, payload)
        id = client.id
        if (w === 'DUPLICATE_EMAIL') setWarning('A contact with this email already exists, but proceeding.')
      }

      setCreatedId(id)
      setSavedToken(token)
      setStep(INFO_STEPS.length) // advance to Payment Methods step
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create')
    } finally {
      setLoading(false)
    }
  }

  function handleFinish() {
    router.push(createdId ? `${basePath}/${createdId}` : basePath)
  }

  const companyTypes = getCompanyTypes(form.registration_country)
  const isPaymentStep = step === INFO_STEPS.length

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      {/* Progress bar */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {STEPS.map((s, i) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: i <= step ? '#334EAC' : 'rgba(255,255,255,0.1)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)' }}>
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </p>
      </div>

      {/* Step 1: Registration — only internal name */}
      {step === 0 && (
        <div style={stepStyle}>
          <label style={labelStyle}>
            Internal name *
            <input
              style={inputStyle}
              placeholder="How you refer to this entity internally"
              value={form.internal_name}
              onChange={(e) => update('internal_name', e.target.value)}
            />
          </label>
        </div>
      )}

      {/* Step 2: Company Details — registration country at top */}
      {step === 1 && (
        <div style={stepStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={labelStyle as React.CSSProperties}>Registration country</span>
            <RegistrationCountryPicker
              value={form.registration_country}
              onChange={(isoCode, name) => {
                setForm((f) => ({
                  ...f,
                  registration_country: isoCode,
                  registration_country_name: name,
                  company_type: '', // reset when country changes
                }))
              }}
            />
          </div>
          <label style={labelStyle}>
            Legal name
            <input
              style={inputStyle}
              placeholder="Official registered name"
              value={form.legal_name}
              onChange={(e) => update('legal_name', e.target.value)}
            />
          </label>
          <label style={labelStyle}>
            Company type
            <select
              style={inputStyle}
              value={form.company_type}
              onChange={(e) => update('company_type', e.target.value)}
            >
              <option value="">Select...</option>
              {companyTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label style={labelStyle}>
            Registration number
            <input
              style={inputStyle}
              placeholder="Tax ID / Business registration"
              value={form.registration_number}
              onChange={(e) => update('registration_number', e.target.value)}
            />
          </label>
          <label style={labelStyle}>
            Contact email
            <input
              style={inputStyle}
              type="email"
              placeholder="company@example.com"
              value={form.contact_email}
              onChange={(e) => update('contact_email', e.target.value)}
            />
          </label>
          {warning && <p style={{ color: '#f59e0b', fontSize: 13 }}>⚠ {warning}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'rgba(186,214,235,0.7)' }}>
            Company phone
            <PhoneInput
              countryCode={form.company_phone_code}
              number={form.company_phone}
              onCountryChange={(code) => update('company_phone_code', code)}
              onNumberChange={(num) => update('company_phone', num)}
            />
          </div>
        </div>
      )}

      {/* Step 3: Contact Person */}
      {step === 2 && (
        <div style={stepStyle}>
          <label style={labelStyle}>
            Contact person name
            <input
              style={inputStyle}
              placeholder="Full name"
              value={form.contact_name}
              onChange={(e) => update('contact_name', e.target.value)}
            />
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: 'rgba(186,214,235,0.7)' }}>
            Contact person phone
            <PhoneInput
              countryCode={form.contact_phone_code}
              number={form.contact_phone}
              onCountryChange={(code) => update('contact_phone_code', code)}
              onNumberChange={(num) => update('contact_phone', num)}
            />
          </div>
          <label style={labelStyle}>
            Contact person email
            <input
              style={inputStyle}
              type="email"
              placeholder="contact@example.com"
              value={form.contact_person_email}
              onChange={(e) => update('contact_person_email', e.target.value)}
            />
          </label>
        </div>
      )}

      {/* Step 4: Address */}
      {step === 3 && (
        <div style={stepStyle}>
          <AddressInput
            value={{
              address: form.address,
              country: form.office_country,
              country_code: form.office_country_code,
              state: form.state,
              state_code: form.state_code,
              city: form.city,
              postal_code: form.postal_code,
            }}
            onChange={(v) => setForm((f) => ({
              ...f,
              address: v.address,
              office_country: v.country,
              office_country_code: v.country_code,
              state: v.state,
              state_code: v.state_code,
              city: v.city,
              postal_code: v.postal_code,
            }))}
          />
        </div>
      )}

      {/* Step 5: Payment Methods */}
      {isPaymentStep && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'rgba(186,214,235,0.08)', borderRadius: 10, padding: '12px 16px' }}>
            <p style={{ fontSize: 13, color: '#BAD6EB', fontWeight: 600 }}>
              {entityType === 'supplier' ? 'Supplier' : 'Client'} created successfully.
            </p>
            <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.7)', marginTop: 4 }}>
              Add at least one payment method so you can select it when creating orders. You can always add more from the detail page.
            </p>
          </div>

          {addedCount > 0 && !showForm && (
            <div style={{ background: 'rgba(16,185,129,0.15)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
              {addedCount} payment method{addedCount > 1 ? 's' : ''} added.
            </div>
          )}

          {showForm && createdId ? (
            <PaymentProfileForm
              entityType={entityType === 'supplier' ? 'SUPPLIER' : 'CLIENT'}
              entityId={createdId}
              privyToken={savedToken}
              onSave={() => {
                setAddedCount((n) => n + 1)
                setShowForm(false)
              }}
            />
          ) : (
            <button
              onClick={() => setShowForm(true)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: '#BAD6EB',
                border: '2px dashed rgba(186,214,235,0.2)',
                borderRadius: 8,
                padding: '12px 20px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              + Add payment method
            </button>
          )}
        </div>
      )}

      {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', marginTop: 24 }}>
        {!isPaymentStep && step > 0 ? (
          <button onClick={() => setStep(step - 1)} style={secondaryBtnStyle}>
            ← Back
          </button>
        ) : (
          <div />
        )}

        {!isPaymentStep && step < INFO_STEPS.length - 1 && (
          <button
            onClick={() => setStep(step + 1)}
            disabled={step === 0 && !form.internal_name}
            style={primaryBtnStyle}
          >
            Next →
          </button>
        )}

        {!isPaymentStep && step === INFO_STEPS.length - 1 && (
          <button onClick={handleCreate} disabled={loading} style={primaryBtnStyle}>
            {loading ? 'Creating...' : `Create ${entityType === 'supplier' ? 'Supplier' : 'Client'}`}
          </button>
        )}

        {isPaymentStep && (
          <button onClick={handleFinish} style={primaryBtnStyle}>
            {addedCount > 0 ? 'Done →' : 'Skip for now →'}
          </button>
        )}
      </div>
    </div>
  )
}

const stepStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  marginBottom: 24,
}
const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
  color: 'rgba(186,214,235,0.7)',
}
const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid rgba(186,214,235,0.2)',
  fontSize: 14,
  color: 'white',
  background: 'rgba(255,255,255,0.07)',
  outline: 'none',
}
const primaryBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #334EAC, #401777)',
  color: 'white',
  border: 'none',
  borderRadius: 8,
  padding: '10px 24px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}
const secondaryBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  color: 'rgba(186,214,235,0.8)',
  border: '1px solid rgba(186,214,235,0.2)',
  borderRadius: 8,
  padding: '10px 24px',
  fontSize: 14,
  cursor: 'pointer',
}
