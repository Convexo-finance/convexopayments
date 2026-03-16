'use client'
import { useState } from 'react'
import Link from 'next/link'
import { PaymentProfileCard } from './PaymentProfileCard'
import { Modal } from '@/components/ui/Modal'
import { PaymentProfileForm } from './PaymentProfileForm'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { AddressInput } from '@/components/ui/AddressInput'

interface Entity {
  id: string
  internal_name: string
  legal_name?: string | null
  company_type?: string | null
  registration_country?: string | null
  registration_number?: string | null
  contact_email?: string | null
  company_phone?: string | null
  contact_name?: string | null
  contact_phone?: string | null
  contact_person_email?: string | null
  address?: string | null
  state?: string | null
  state_code?: string | null
  city?: string | null
  postal_code?: string | null
  office_country?: string | null
  office_country_code?: string | null
}

interface Profile {
  id: string
  method: string
  label: string | null
  details: Record<string, unknown>
  is_default: boolean | null
  entity_type: string
  entity_id: string | null
}

interface EntityDetailClientProps {
  entity: Entity
  entityType: 'SUPPLIER' | 'CLIENT'
  profiles: Profile[]
  privyToken: string
  backHref: string
}

// Parse a stored phone string like "+57 3001234567" into { code, number }
function parsePhone(stored: string | null | undefined): { code: string; number: string } {
  const s = stored ?? ''
  if (s.startsWith('+')) {
    const idx = s.indexOf(' ')
    if (idx > 0) return { code: s.slice(0, idx), number: s.slice(idx + 1) }
    return { code: s, number: '' }
  }
  return { code: '+57', number: s }
}

export function EntityDetailClient({ entity, entityType, profiles: initialProfiles, privyToken, backHref }: EntityDetailClientProps) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const companyPhoneParsed = parsePhone(entity.company_phone)
  const contactPhoneParsed = parsePhone(entity.contact_phone)

  const initialForm = {
    // Info
    internal_name: entity.internal_name,
    legal_name: entity.legal_name ?? '',
    company_type: entity.company_type ?? '',
    registration_country: entity.registration_country ?? '',
    registration_number: entity.registration_number ?? '',
    // Contact
    contact_email: entity.contact_email ?? '',
    company_phone_code: companyPhoneParsed.code,
    company_phone: companyPhoneParsed.number,
    contact_name: entity.contact_name ?? '',
    contact_phone_code: contactPhoneParsed.code,
    contact_phone: contactPhoneParsed.number,
    contact_person_email: entity.contact_person_email ?? '',
    // Address
    address: entity.address ?? '',
    state: entity.state ?? '',
    state_code: entity.state_code ?? '',
    city: entity.city ?? '',
    postal_code: entity.postal_code ?? '',
    office_country: entity.office_country ?? '',
    office_country_code: entity.office_country_code ?? '',
  }

  const [form, setForm] = useState(initialForm)
  const [saved, setSaved] = useState(initialForm)

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleCancel() {
    setForm(saved)
    setEditing(false)
    setEditError(null)
  }

  async function handleSave() {
    setSaving(true)
    setEditError(null)
    try {
      const payload = {
        internal_name: form.internal_name,
        legal_name: form.legal_name,
        company_type: form.company_type,
        registration_country: form.registration_country,
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

      if (entityType === 'SUPPLIER') {
        const { updateSupplier } = await import('@/lib/actions/entities')
        await updateSupplier(privyToken, entity.id, payload)
      } else {
        const { updateClient } = await import('@/lib/actions/entities')
        await updateClient(privyToken, entity.id, payload)
      }
      setSaved(form)
      setEditing(false)
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function reload() {
    const { getPaymentProfiles } = await import('@/lib/actions/payment-profiles')
    const updated = await getPaymentProfiles(privyToken, entityType, entity.id)
    setProfiles((updated ?? []) as Profile[])
  }

  // Derived display values for view mode
  const displayCompanyPhone = saved.company_phone ? `${saved.company_phone_code} ${saved.company_phone}` : null
  const displayContactPhone = saved.contact_phone ? `${saved.contact_phone_code} ${saved.contact_phone}` : null
  const displayAddress = [saved.address, saved.city, saved.state, saved.postal_code, saved.office_country].filter(Boolean).join(', ')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Link href={backHref} style={{ fontSize: 13, color: '#BAD6EB', textDecoration: 'none' }}>
        ← Back
      </Link>

      {/* Info card */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
            {editing ? form.internal_name || 'Edit' : saved.internal_name}
          </h2>
          {!editing ? (
            <button onClick={() => setEditing(true)} style={ghostBtn}>Edit</button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCancel} disabled={saving} style={ghostBtn}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={primaryBtn}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {editError && (
          <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{editError}</p>
        )}

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Section: Company Info */}
            <Section title="Company Information">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Internal Name">
                  <input style={inputStyle} value={form.internal_name} onChange={(e) => set('internal_name', e.target.value)} placeholder="Internal name" />
                </Field>
                <Field label="Legal Name">
                  <input style={inputStyle} value={form.legal_name} onChange={(e) => set('legal_name', e.target.value)} placeholder="Official registered name" />
                </Field>
                <Field label="Company Type">
                  <input style={inputStyle} value={form.company_type} onChange={(e) => set('company_type', e.target.value)} placeholder="LLC, SRL, etc." />
                </Field>
                <Field label="Registration Number">
                  <input style={inputStyle} value={form.registration_number} onChange={(e) => set('registration_number', e.target.value)} placeholder="Tax ID / Business reg." />
                </Field>
              </div>
              <Field label="Company Phone">
                <PhoneInput
                  countryCode={form.company_phone_code}
                  number={form.company_phone}
                  onCountryChange={(code) => set('company_phone_code', code)}
                  onNumberChange={(num) => set('company_phone', num)}
                />
              </Field>
              <Field label="Contact Email">
                <input type="email" style={inputStyle} value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} placeholder="company@example.com" />
              </Field>
            </Section>

            {/* Section: Contact Person */}
            <Section title="Contact Person">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Full Name">
                  <input style={inputStyle} value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} placeholder="Full name" />
                </Field>
                <Field label="Email">
                  <input type="email" style={inputStyle} value={form.contact_person_email} onChange={(e) => set('contact_person_email', e.target.value)} placeholder="contact@example.com" />
                </Field>
              </div>
              <Field label="Phone">
                <PhoneInput
                  countryCode={form.contact_phone_code}
                  number={form.contact_phone}
                  onCountryChange={(code) => set('contact_phone_code', code)}
                  onNumberChange={(num) => set('contact_phone', num)}
                />
              </Field>
            </Section>

            {/* Section: Address */}
            <Section title="Address">
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
            </Section>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* View: Company */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px 24px' }}>
              {saved.legal_name && <ViewRow label="Legal Name" value={saved.legal_name} />}
              {saved.company_type && <ViewRow label="Company Type" value={saved.company_type} />}
              {saved.registration_number && <ViewRow label="Registration #" value={saved.registration_number} />}
              {saved.contact_email && <ViewRow label="Contact Email" value={saved.contact_email} />}
              {displayCompanyPhone && <ViewRow label="Company Phone" value={displayCompanyPhone} />}
            </div>
            {/* View: Contact Person */}
            {(saved.contact_name || displayContactPhone || saved.contact_person_email) && (
              <div>
                <p style={sectionLabel}>Contact Person</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px 24px' }}>
                  {saved.contact_name && <ViewRow label="Name" value={saved.contact_name} />}
                  {saved.contact_person_email && <ViewRow label="Email" value={saved.contact_person_email} />}
                  {displayContactPhone && <ViewRow label="Phone" value={displayContactPhone} />}
                </div>
              </div>
            )}
            {/* View: Address */}
            {displayAddress && (
              <div>
                <p style={sectionLabel}>Address</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{displayAddress}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment profiles */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Payment Methods</h3>
          <button onClick={() => setAddOpen(true)} style={primaryBtn}>+ Add</button>
        </div>

        {profiles.length === 0 ? (
          <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.4)' }}>No payment methods yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {profiles.map((p) => (
              <PaymentProfileCard
                key={p.id}
                profile={p as Parameters<typeof PaymentProfileCard>[0]['profile']}
                privyToken={privyToken}
                onUpdate={reload}
              />
            ))}
          </div>
        )}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Payment Method">
        <PaymentProfileForm
          entityType={entityType}
          entityId={entity.id}
          privyToken={privyToken}
          onSave={() => { setAddOpen(false); reload() }}
        />
      </Modal>
    </div>
  )
}

// ── Sub-components ──

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={sectionLabel}>{title}</p>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(186,214,235,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      {children}
    </div>
  )
}

function ViewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(186,214,235,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>{value}</p>
    </div>
  )
}

// ── Styles ──
const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(186,214,235,0.1)', padding: 24 }
const sectionLabel: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'rgba(186,214,235,0.35)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 4 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 7, border: '1px solid rgba(186,214,235,0.2)', fontSize: 13, color: 'white', background: 'rgba(255,255,255,0.07)', outline: 'none', boxSizing: 'border-box' }
const ghostBtn: React.CSSProperties = { background: 'rgba(255,255,255,0.08)', color: 'rgba(186,214,235,0.8)', border: '1px solid rgba(186,214,235,0.2)', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
const primaryBtn: React.CSSProperties = { background: 'linear-gradient(135deg, #334EAC, #401777)', color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
