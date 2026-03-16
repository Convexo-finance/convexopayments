'use client'
import { useState } from 'react'
import { useAppUser } from '@/lib/context/user-context'
import { FileUpload } from '@/components/ui/FileUpload'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { AddressInput } from '@/components/ui/AddressInput'

const ID_TYPES = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'PA', label: 'Pasaporte' },
]

interface ProfileClientProps {
  privyToken: string
  initialProfile: Record<string, unknown> | null
  initialPaymentProfiles: Array<Record<string, unknown>>
  userId?: string
}

type Section = 'personal' | 'address' | 'social'

export function ProfileClient({ privyToken, initialProfile }: ProfileClientProps) {
  const { isEnabled } = useAppUser()

  function str(key: string) { return (initialProfile?.[key] as string) ?? '' }

  const [profile, setProfile] = useState({
    first_name: str('first_name'),
    last_name: str('last_name'),
    contact_email: str('contact_email'),
    id_type: str('id_type'),
    id_number: str('id_number'),
    phone_country_code: str('phone_country_code') || '+57',
    phone: str('phone'),
    address: str('address'),
    country: str('country'),
    country_code: str('country_code'),
    state: str('state'),
    state_code: str('state_code'),
    city: str('city'),
    postal_code: str('postal_code'),
    instagram: str('instagram'),
    twitter: str('twitter'),
    linkedin: str('linkedin'),
    id_doc_url: str('id_doc_url'),
    rut_url: str('rut_url'),
    rut_status: str('rut_status'),
    rut_admin_note: str('rut_admin_note'),
  })

  // Per-section draft state (only active while editing)
  const [editSection, setEditSection] = useState<Section | null>(null)
  const [draft, setDraft] = useState<typeof profile>(profile)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [requesting, setRequesting] = useState(false)
  const [requested, setRequested] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  function startEdit(section: Section) {
    setDraft({ ...profile })
    setEditSection(section)
    setSaveError(null)
  }

  function cancelEdit() { setEditSection(null); setSaveError(null) }

  async function saveSection() {
    setSaving(true); setSaveError(null)
    try {
      const { upsertProfile } = await import('@/lib/actions/profile')
      const updated = await upsertProfile(privyToken, draft)
      setProfile((p) => ({ ...p, ...(updated as unknown as typeof profile) }))
      setEditSection(null)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  async function handleIDDocUpload(file: File) {
    const { uploadIDDoc, upsertProfile } = await import('@/lib/actions/profile')
    const url = await uploadIDDoc(privyToken, file)
    await upsertProfile(privyToken, { id_doc_url: url })
    setProfile((p) => ({ ...p, id_doc_url: url }))
    return url
  }

  async function handleRUTUpload(file: File) {
    const { uploadRUT, upsertProfile } = await import('@/lib/actions/profile')
    const url = await uploadRUT(privyToken, file)
    await upsertProfile(privyToken, { rut_url: url })
    setProfile((p) => ({ ...p, rut_url: url }))
    return url
  }

  async function handleRequestVerification() {
    setRequesting(true); setRequestError(null)
    try {
      const { requestVerification } = await import('@/lib/actions/profile')
      await requestVerification(privyToken)
      setRequested(true)
      setProfile((p) => ({ ...p, rut_status: 'PENDIENTE' }))
    } catch (err: unknown) {
      setRequestError(err instanceof Error ? err.message : 'Failed to submit')
    } finally { setRequesting(false) }
  }

  const rutStatus = profile.rut_status
  const hasIDDoc = !!profile.id_doc_url
  const hasRUT = !!profile.rut_url
  const canSubmit = hasIDDoc && hasRUT

  const idTypeLabel = ID_TYPES.find((t) => t.value === profile.id_type)?.label ?? ''

  return (
    <div style={{ maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Verification banner ── */}
      {isEnabled ? (
        <Banner color="green" icon="✓" title="Account verified & active" body="You have full access to pay and collect orders." />
      ) : rutStatus === 'PENDIENTE' ? (
        <Banner color="amber" icon="⏳" title="Verification pending" body="Convexo is reviewing your profile. We'll enable your account once approved." />
      ) : rutStatus === 'RECHAZADO' ? (
        <Banner color="red" icon="✗" title="Verification rejected"
          body={profile.rut_admin_note ? `Reason: ${profile.rut_admin_note}. Please update your documents and resubmit.` : 'Please upload valid documents and resubmit.'} />
      ) : (
        <Banner color="blue" icon="ℹ" title="Complete your profile to get verified"
          body="Fill in your details, upload your ID document and RUT, then submit for verification." />
      )}

      {/* ── Personal Information ── */}
      <SectionCard
        title="Personal Information"
        editing={editSection === 'personal'}
        onEdit={() => startEdit('personal')}
        onCancel={cancelEdit}
        onSave={saveSection}
        saving={saving}
        saveError={editSection === 'personal' ? saveError : null}
        view={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Name */}
            <ViewRow icon="👤" label="Name">
              {(profile.first_name || profile.last_name)
                ? `${profile.first_name} ${profile.last_name}`.trim()
                : <Placeholder>Not set</Placeholder>}
            </ViewRow>
            {/* Document */}
            <ViewRow icon="🪪" label="Identity Document">
              {profile.id_type
                ? <span>{idTypeLabel} &nbsp;·&nbsp; <strong>{profile.id_number || '–'}</strong></span>
                : <Placeholder>Not set</Placeholder>}
            </ViewRow>
            {/* Email */}
            <ViewRow icon="✉" label="Contact Email">
              {profile.contact_email
                ? <a href={`mailto:${profile.contact_email}`} style={{ color: '#BAD6EB', textDecoration: 'none' }}>{profile.contact_email}</a>
                : <Placeholder>Not set</Placeholder>}
            </ViewRow>
            {/* Phone */}
            <ViewRow icon="📞" label="Phone">
              {profile.phone
                ? `${profile.phone_country_code} ${profile.phone}`
                : <Placeholder>Not set</Placeholder>}
            </ViewRow>
          </div>
        }
        edit={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="First Name">
                <input style={inputStyle} value={draft.first_name} onChange={(e) => setDraft((d) => ({ ...d, first_name: e.target.value }))} placeholder="First name" />
              </Field>
              <Field label="Last Name">
                <input style={inputStyle} value={draft.last_name} onChange={(e) => setDraft((d) => ({ ...d, last_name: e.target.value }))} placeholder="Last name" />
              </Field>
            </div>
            <Field label="Identity Document">
              <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 10 }}>
                <select style={inputStyle} value={draft.id_type} onChange={(e) => setDraft((d) => ({ ...d, id_type: e.target.value }))}>
                  <option value="">Select type...</option>
                  {ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input style={inputStyle} placeholder="Document number" value={draft.id_number} onChange={(e) => setDraft((d) => ({ ...d, id_number: e.target.value }))} />
              </div>
            </Field>
            <Field label="Contact Email">
              <input type="email" style={inputStyle} value={draft.contact_email} onChange={(e) => setDraft((d) => ({ ...d, contact_email: e.target.value }))} placeholder="email@example.com" />
            </Field>
            <Field label="Phone">
              <PhoneInput
                countryCode={draft.phone_country_code}
                number={draft.phone}
                onCountryChange={(code) => setDraft((d) => ({ ...d, phone_country_code: code }))}
                onNumberChange={(num) => setDraft((d) => ({ ...d, phone: num }))}
              />
            </Field>
          </div>
        }
      />

      {/* ── Address ── */}
      <SectionCard
        title="Address"
        editing={editSection === 'address'}
        onEdit={() => startEdit('address')}
        onCancel={cancelEdit}
        onSave={saveSection}
        saving={saving}
        saveError={editSection === 'address' ? saveError : null}
        view={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ViewRow icon="📍" label="Address">
              {(profile.address || profile.city || profile.country) ? (
                <div>
                  {profile.address && <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>{profile.address}</div>}
                  <div style={{ fontSize: 13, color: 'rgba(186,214,235,0.7)' }}>
                    {[profile.city, profile.state, profile.country].filter(Boolean).join(', ')}
                  </div>
                </div>
              ) : <Placeholder>Not set</Placeholder>}
            </ViewRow>
          </div>
        }
        edit={
          <AddressInput
            value={{ address: draft.address, country: draft.country, country_code: draft.country_code, state: draft.state, state_code: draft.state_code, city: draft.city, postal_code: draft.postal_code }}
            onChange={(v) => setDraft((d) => ({ ...d, address: v.address, country: v.country, country_code: v.country_code, state: v.state, state_code: v.state_code, city: v.city, postal_code: v.postal_code }))}
          />
        }
      />

      {/* ── Social ── */}
      <SectionCard
        title="Social Profiles"
        editing={editSection === 'social'}
        onEdit={() => startEdit('social')}
        onCancel={cancelEdit}
        onSave={saveSection}
        saving={saving}
        saveError={editSection === 'social' ? saveError : null}
        view={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SocialViewRow
              icon={<InstagramIcon />}
              label="Instagram"
              value={profile.instagram}
              href={profile.instagram ? `https://instagram.com/${profile.instagram.replace('@', '')}` : null}
            />
            <SocialViewRow
              icon={<XIcon />}
              label="X / Twitter"
              value={profile.twitter}
              href={profile.twitter ? `https://x.com/${profile.twitter.replace('@', '')}` : null}
            />
            <SocialViewRow
              icon={<LinkedInIcon />}
              label="LinkedIn"
              value={profile.linkedin}
              href={profile.linkedin || null}
              isUrl
            />
          </div>
        }
        edit={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SocialEditRow icon={<InstagramIcon />} label="Instagram" placeholder="@username" value={draft.instagram} onChange={(v) => setDraft((d) => ({ ...d, instagram: v }))} />
            <SocialEditRow icon={<XIcon />} label="X / Twitter" placeholder="@username" value={draft.twitter} onChange={(v) => setDraft((d) => ({ ...d, twitter: v }))} />
            <SocialEditRow icon={<LinkedInIcon />} label="LinkedIn" placeholder="https://linkedin.com/in/..." value={draft.linkedin} onChange={(v) => setDraft((d) => ({ ...d, linkedin: v }))} />
          </div>
        }
      />

      {/* ── Documents ── */}
      <div style={cardStyle}>
        <div style={{ marginBottom: 16 }}>
          <h3 style={sectionTitle}>Documents for Verification</h3>
          <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)', marginTop: 2 }}>Upload both documents to enable account verification.</p>
        </div>

        {/* ID Document */}
        <div style={{ borderRadius: 10, border: '1px solid rgba(186,214,235,0.1)', padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 20 }}>🪪</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Identity Document</div>
              <div style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)' }}>Cédula, Pasaporte or Cédula de Extranjería</div>
            </div>
            {hasIDDoc && <DocBadge status="uploaded" />}
          </div>
          <FileUpload
            label={hasIDDoc ? 'Replace document' : 'Upload ID document (PDF, JPG, PNG)'}
            accept=".pdf,.jpg,.jpeg,.png"
            currentUrl={profile.id_doc_url}
            onUpload={handleIDDocUpload}
          />
        </div>

        {/* RUT */}
        <div style={{ borderRadius: 10, border: '1px solid rgba(186,214,235,0.1)', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 20 }}>📄</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>RUT – Registro Único Tributario</div>
              <div style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)' }}>Documento de la DIAN</div>
            </div>
            {hasRUT && <DocBadge status={rutStatus === 'VERIFICADO' ? 'verified' : rutStatus === 'PENDIENTE' ? 'review' : 'uploaded'} />}
          </div>
          <div style={{ background: '#fef3c7', borderRadius: 7, padding: '8px 12px', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: '#92400e' }}>
              ⚠ <strong>Must be issued within the last month.</strong> Older documents will be rejected.
            </span>
          </div>
          {hasRUT && profile.rut_url && (
            <div style={{ marginBottom: 8 }}>
              <a href={profile.rut_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#BAD6EB' }}>View uploaded RUT →</a>
            </div>
          )}
          <FileUpload
            label={hasRUT ? 'Replace RUT' : 'Upload RUT (PDF, JPG, PNG)'}
            accept=".pdf,.jpg,.jpeg,.png"
            currentUrl={profile.rut_url}
            onUpload={handleRUTUpload}
          />
        </div>
      </div>

      {/* ── Submit for Verification ── */}
      {!isEnabled && rutStatus !== 'PENDIENTE' && rutStatus !== 'VERIFICADO' && (
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(186,214,235,0.1)', padding: 20 }}>
          <h3 style={{ ...sectionTitle, marginBottom: 8 }}>Request Account Activation</h3>
          <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.7)', marginBottom: 12 }}>
            Once you&apos;ve uploaded both documents and saved your profile, submit your verification request.
            Convexo will review and activate your account within 1–2 business days.
          </p>

          {/* Checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            <CheckItem done={hasIDDoc} label="Identity document uploaded" />
            <CheckItem done={hasRUT} label="RUT document uploaded" />
          </div>

          {requestError && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 10 }}>{requestError}</p>}

          {requested ? (
            <div style={{ background: '#d1fae5', borderRadius: 8, padding: '12px 16px', color: '#065f46', fontSize: 13, fontWeight: 600 }}>
              ✓ Verification request submitted. Convexo will review your profile shortly.
            </div>
          ) : (
            <button
              onClick={handleRequestVerification}
              disabled={requesting || !canSubmit}
              style={{
                background: canSubmit ? 'linear-gradient(135deg, #334EAC, #401777)' : 'rgba(255,255,255,0.08)',
                color: canSubmit ? 'white' : 'rgba(186,214,235,0.4)',
                border: 'none', borderRadius: 8,
                padding: '11px 24px', fontSize: 14, fontWeight: 600,
                cursor: (!canSubmit || requesting) ? 'not-allowed' : 'pointer',
                width: '100%',
              }}
            >
              {requesting ? 'Submitting...' : 'Submit for Verification →'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── SectionCard ──
interface SectionCardProps {
  title: string
  editing: boolean
  saving: boolean
  saveError: string | null
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  view: React.ReactNode
  edit: React.ReactNode
}
function SectionCard({ title, editing, saving, saveError, onEdit, onCancel, onSave, view, edit }: SectionCardProps) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={sectionTitle}>{title}</h3>
        {editing ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onCancel} style={ghostBtn}>Cancel</button>
            <button onClick={onSave} disabled={saving} style={primarySmallBtn}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        ) : (
          <button onClick={onEdit} style={ghostBtn}>Edit</button>
        )}
      </div>
      {saveError && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 10 }}>{saveError}</p>}
      {editing ? edit : view}
    </div>
  )
}

// ── ViewRow ──
function ViewRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(186,214,235,0.4)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>{children}</div>
      </div>
    </div>
  )
}

// ── SocialViewRow ──
function SocialViewRow({ icon, label, value, href, isUrl }: { icon: React.ReactNode; label: string; value: string; href: string | null; isUrl?: boolean }) {
  const display = isUrl
    ? (value ? value.replace(/^https?:\/\/(www\.)?/, '') : null)
    : (value || null)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(186,214,235,0.4)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>{label}</div>
        {display && href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#BAD6EB', textDecoration: 'none', fontWeight: 500 }}>
            {display} →
          </a>
        ) : (
          <span style={{ fontSize: 13, color: 'rgba(186,214,235,0.4)' }}>Not linked</span>
        )}
      </div>
    </div>
  )
}

// ── SocialEditRow ──
function SocialEditRow({ icon, label, placeholder, value, onChange }: { icon: React.ReactNode; label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <label style={{ ...labelStyle, marginBottom: 3 }}>{label}</label>
        <input style={inputStyle} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  )
}

// ── CheckItem ──
function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
        background: done ? '#d1fae5' : 'rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {done
          ? <span style={{ color: '#065f46', fontSize: 11, fontWeight: 700 }}>✓</span>
          : <span style={{ color: 'rgba(186,214,235,0.4)', fontSize: 11 }}>○</span>}
      </div>
      <span style={{ fontSize: 13, color: done ? '#065f46' : 'rgba(186,214,235,0.4)', fontWeight: done ? 600 : 400 }}>{label}</span>
    </div>
  )
}

// ── DocBadge ──
function DocBadge({ status }: { status: 'uploaded' | 'review' | 'verified' }) {
  const styles = {
    uploaded: { bg: '#eff6ff', color: '#1d4ed8', label: 'Uploaded' },
    review:   { bg: '#fef3c7', color: '#92400e', label: 'Under review' },
    verified: { bg: '#d1fae5', color: '#065f46', label: 'Verified' },
  }[status]
  return (
    <span style={{ marginLeft: 'auto', background: styles.bg, color: styles.color, borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
      {styles.label}
    </span>
  )
}

// ── Placeholder ──
function Placeholder({ children }: { children: React.ReactNode }) {
  return <span style={{ color: 'rgba(186,214,235,0.4)', fontStyle: 'italic' }}>{children}</span>
}

// ── Banner ──
function Banner({ color, icon, title, body }: { color: 'green' | 'amber' | 'red' | 'blue'; icon: string; title: string; body: string }) {
  const c = { green: ['#d1fae5', '#065f46', '#047857'], amber: ['#fef3c7', '#92400e', '#b45309'], red: ['#fee2e2', '#991b1b', '#b91c1c'], blue: ['rgba(186,214,235,0.08)', '#BAD6EB', 'rgba(186,214,235,0.7)'] }[color]
  return (
    <div style={{ background: c[0], borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: c[1] }}>{title}</p>
        <p style={{ fontSize: 12, color: c[2], marginTop: 2 }}>{body}</p>
      </div>
    </div>
  )
}

// ── Field wrapper ──
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

// ── Social Icons ──
function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433" />
          <stop offset="25%" stopColor="#e6683c" />
          <stop offset="50%" stopColor="#dc2743" />
          <stop offset="75%" stopColor="#cc2366" />
          <stop offset="100%" stopColor="#bc1888" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="5" fill="url(#ig)" />
      <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="1.8" fill="none" />
      <circle cx="17.5" cy="6.5" r="1.1" fill="white" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#000" />
      <path d="M13.6 10.94L18.4 5h-1.15l-4.17 4.7L9.6 5H5.5l5.03 7.1L5.5 19h1.15l4.4-4.96L14.4 19h4.1L13.6 10.94zM11.7 13.3l-.5-.7-4.1-5.8h1.75l3.3 4.6.5.7 4.3 6.05h-1.75l-3.5-4.85z" fill="white" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="5" fill="#0077b5" />
      <path d="M7.1 9.5H5V19h2.1V9.5zM6.05 8.5a1.22 1.22 0 110-2.44 1.22 1.22 0 010 2.44zM19 19h-2.1v-4.65c0-1.1-.4-1.85-1.4-1.85-.75 0-1.2.5-1.4 1-.07.17-.09.42-.09.67V19H11.9s.03-8.1 0-8.95h2.1v1.27c.28-.43.78-1.05 1.9-1.05 1.38 0 2.42.9 2.42 2.84V19z" fill="white" />
    </svg>
  )
}

// ── Styles ──
const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(186,214,235,0.1)', padding: 20 }
const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.3px', margin: 0 }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(186,214,235,0.7)', marginBottom: 5 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 7, border: '1px solid rgba(186,214,235,0.2)', fontSize: 13, color: 'white', background: 'rgba(255,255,255,0.07)', outline: 'none', boxSizing: 'border-box' }
const ghostBtn: React.CSSProperties = { padding: '6px 14px', borderRadius: 7, border: '1px solid rgba(186,214,235,0.2)', background: 'rgba(255,255,255,0.08)', fontSize: 12, fontWeight: 600, color: 'rgba(186,214,235,0.8)', cursor: 'pointer' }
const primarySmallBtn: React.CSSProperties = { padding: '6px 14px', borderRadius: 7, border: 'none', background: 'linear-gradient(135deg, #334EAC, #401777)', fontSize: 12, fontWeight: 600, color: 'white', cursor: 'pointer' }
