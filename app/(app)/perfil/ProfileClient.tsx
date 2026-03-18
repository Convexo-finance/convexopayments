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

type Section = 'personal' | 'social'

export function ProfileClient({ privyToken, initialProfile }: ProfileClientProps) {
  const { isEnabled } = useAppUser()

  function str(key: string) { return (initialProfile?.[key] as string) ?? '' }

  const [profile, setProfile] = useState({
    first_name: str('first_name'),
    last_name: str('last_name'),
    contact_email: str('contact_email'),
    phone_country_code: str('phone_country_code') || '+57',
    phone: str('phone'),
    instagram: str('instagram'),
    twitter: str('twitter'),
    linkedin: str('linkedin'),
    website_url: str('website_url'),
    // Verification fields
    id_type: str('id_type'),
    id_number: str('id_number'),
    address: str('address'),
    country: str('country'),
    country_code: str('country_code'),
    state: str('state'),
    state_code: str('state_code'),
    city: str('city'),
    postal_code: str('postal_code'),
    id_doc_url: str('id_doc_url'),
    rut_url: str('rut_url'),
    proof_of_address_url: str('proof_of_address_url'),
    rut_status: str('rut_status'),
    rut_admin_note: str('rut_admin_note'),
    monthly_volume: str('monthly_volume'),
  })

  // Per-section draft state (only active while editing)
  const [editSection, setEditSection] = useState<Section | null>(null)
  const [draft, setDraft] = useState<typeof profile>(profile)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Verification section — its own save state for the form fields
  const [verDraft, setVerDraft] = useState({
    id_type: profile.id_type,
    id_number: profile.id_number,
    address: profile.address,
    country: profile.country,
    country_code: profile.country_code,
    state: profile.state,
    state_code: profile.state_code,
    city: profile.city,
    postal_code: profile.postal_code,
    monthly_volume: profile.monthly_volume,
  })
  const [verSaving, setVerSaving] = useState(false)
  const [verSaveError, setVerSaveError] = useState<string | null>(null)

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

  async function saveVerification() {
    setVerSaving(true); setVerSaveError(null)
    try {
      const { upsertProfile } = await import('@/lib/actions/profile')
      const updated = await upsertProfile(privyToken, verDraft)
      setProfile((p) => ({ ...p, ...(updated as unknown as typeof profile) }))
    } catch (err: unknown) {
      setVerSaveError(err instanceof Error ? err.message : 'Failed to save')
    } finally { setVerSaving(false) }
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

  async function handleProofOfAddressUpload(file: File) {
    const { uploadProofOfAddress, upsertProfile } = await import('@/lib/actions/profile')
    const url = await uploadProofOfAddress(privyToken, file)
    await upsertProfile(privyToken, { proof_of_address_url: url })
    setProfile((p) => ({ ...p, proof_of_address_url: url }))
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
  const hasProofOfAddress = !!profile.proof_of_address_url
  const canSubmit = hasIDDoc && hasRUT

  return (
    <div style={{ maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Status banner ── */}
      {isEnabled ? (
        <Banner color="green" icon="✓" title="Cuenta verificada y activa" body="Tienes acceso completo a todos los productos y servicios." />
      ) : rutStatus === 'PENDIENTE' ? (
        <Banner color="amber" icon="⏳" title="Verificación en proceso" body="Convexo está revisando tu perfil. Activaremos tu cuenta una vez aprobada." />
      ) : rutStatus === 'RECHAZADO' ? (
        <Banner color="red" icon="✗" title="Verificación rechazada"
          body={profile.rut_admin_note ? `Motivo: ${profile.rut_admin_note}. Por favor actualiza tus documentos y vuelve a solicitar.` : 'Por favor sube documentos válidos y vuelve a solicitar.'} />
      ) : (
        <Banner color="blue" icon="ℹ" title="Completa tu perfil para verificarte"
          body="Llena tus datos, sube tu documento de identidad y RUT, luego solicita verificación." />
      )}

      {/* ── Informacion Personal ── */}
      <SectionCard
        title="Informacion Personal"
        editing={editSection === 'personal'}
        onEdit={() => startEdit('personal')}
        onCancel={cancelEdit}
        onSave={saveSection}
        saving={saving}
        saveError={editSection === 'personal' ? saveError : null}
        view={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ViewRow icon="👤" label="Nombre">
              {(profile.first_name || profile.last_name)
                ? `${profile.first_name} ${profile.last_name}`.trim()
                : <Placeholder>No configurado</Placeholder>}
            </ViewRow>
            <ViewRow icon="✉" label="Email de contacto">
              {profile.contact_email
                ? <a href={`mailto:${profile.contact_email}`} style={{ color: '#BAD6EB', textDecoration: 'none' }}>{profile.contact_email}</a>
                : <Placeholder>No configurado</Placeholder>}
            </ViewRow>
            <ViewRow icon="📞" label="Teléfono">
              {profile.phone
                ? `${profile.phone_country_code} ${profile.phone}`
                : <Placeholder>No configurado</Placeholder>}
            </ViewRow>
          </div>
        }
        edit={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Nombre">
                <input style={inputStyle} value={draft.first_name} onChange={(e) => setDraft((d) => ({ ...d, first_name: e.target.value }))} placeholder="Juan" />
              </Field>
              <Field label="Apellido">
                <input style={inputStyle} value={draft.last_name} onChange={(e) => setDraft((d) => ({ ...d, last_name: e.target.value }))} placeholder="Pérez" />
              </Field>
            </div>
            <Field label="Email de contacto">
              <input type="email" style={inputStyle} value={draft.contact_email} onChange={(e) => setDraft((d) => ({ ...d, contact_email: e.target.value }))} placeholder="email@ejemplo.com" />
            </Field>
            <Field label="Teléfono">
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

      {/* ── Redes Sociales ── */}
      <SectionCard
        title="Redes Sociales"
        editing={editSection === 'social'}
        onEdit={() => startEdit('social')}
        onCancel={cancelEdit}
        onSave={saveSection}
        saving={saving}
        saveError={editSection === 'social' ? saveError : null}
        view={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SocialViewRow icon={<InstagramIcon />} label="Instagram" value={profile.instagram} href={profile.instagram ? `https://instagram.com/${profile.instagram.replace('@', '')}` : null} />
            <SocialViewRow icon={<XIcon />} label="X / Twitter" value={profile.twitter} href={profile.twitter ? `https://x.com/${profile.twitter.replace('@', '')}` : null} />
            <SocialViewRow icon={<LinkedInIcon />} label="LinkedIn" value={profile.linkedin} href={profile.linkedin || null} isUrl />
            <SocialViewRow icon={<GlobeIcon />} label="Sitio Web" value={profile.website_url} href={profile.website_url || null} isUrl />
          </div>
        }
        edit={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.45)', margin: 0 }}>Opcional — todos estos campos son públicos en tu perfil.</p>
            <SocialEditRow icon={<InstagramIcon />} label="Instagram" placeholder="@usuario" value={draft.instagram} onChange={(v) => setDraft((d) => ({ ...d, instagram: v }))} />
            <SocialEditRow icon={<XIcon />} label="X / Twitter" placeholder="@usuario" value={draft.twitter} onChange={(v) => setDraft((d) => ({ ...d, twitter: v }))} />
            <SocialEditRow icon={<LinkedInIcon />} label="LinkedIn" placeholder="https://linkedin.com/in/..." value={draft.linkedin} onChange={(v) => setDraft((d) => ({ ...d, linkedin: v }))} />
            <SocialEditRow icon={<GlobeIcon />} label="Sitio Web" placeholder="https://ejemplo.com" value={draft.website_url} onChange={(v) => setDraft((d) => ({ ...d, website_url: v }))} />
          </div>
        }
      />

      {/* ── Verificacion ── */}
      <div id="verificacion" style={cardStyle}>
        {/* Header with status chip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 style={sectionTitle}>Verificacion</h3>
            <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)', marginTop: 3 }}>
              Requerida para activar Pagar, Cobrar y OTC.
            </p>
          </div>
          <StatusChip status={rutStatus} />
        </div>

        {/* Rejection note */}
        {rutStatus === 'RECHAZADO' && profile.rut_admin_note && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>Motivo del rechazo</p>
            <p style={{ fontSize: 12, color: 'rgba(239,68,68,0.8)', marginTop: 2 }}>{profile.rut_admin_note}</p>
          </div>
        )}

        {/* Identity document type + number */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(186,214,235,0.5)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>
            Documento de Identidad
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Tipo</label>
              <select
                style={inputStyle}
                value={verDraft.id_type}
                onChange={(e) => setVerDraft((d) => ({ ...d, id_type: e.target.value }))}
              >
                <option value="">Seleccionar...</option>
                {ID_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Número</label>
              <input
                style={inputStyle}
                placeholder="Número de documento"
                value={verDraft.id_number}
                onChange={(e) => setVerDraft((d) => ({ ...d, id_number: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(186,214,235,0.5)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>
            Dirección
          </p>
          <AddressInput
            value={{
              address: verDraft.address,
              country: verDraft.country,
              country_code: verDraft.country_code,
              state: verDraft.state,
              state_code: verDraft.state_code,
              city: verDraft.city,
              postal_code: verDraft.postal_code,
            }}
            onChange={(v) => setVerDraft((d) => ({ ...d, address: v.address, country: v.country, country_code: v.country_code, state: v.state, state_code: v.state_code, city: v.city, postal_code: v.postal_code }))}
          />
        </div>

        {/* Monthly volume */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(186,214,235,0.5)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>
            Volumen Mensual Estimado
          </p>
          <select
            style={inputStyle}
            value={verDraft.monthly_volume}
            onChange={(e) => setVerDraft((d) => ({ ...d, monthly_volume: e.target.value }))}
          >
            <option value="">Seleccionar rango...</option>
            <option value="0-1k">$0 – $1,000 USD</option>
            <option value="1k-5k">$1,000 – $5,000 USD</option>
            <option value="5k-20k">$5,000 – $20,000 USD</option>
            <option value="+20k">Más de $20,000 USD</option>
          </select>
        </div>

        {/* Save fields button */}
        {verSaveError && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>{verSaveError}</p>}
        <button
          onClick={saveVerification}
          disabled={verSaving}
          style={{ ...primarySmallBtn, marginBottom: 20, padding: '8px 18px', opacity: verSaving ? 0.6 : 1 }}
        >
          {verSaving ? 'Guardando...' : 'Guardar información'}
        </button>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(186,214,235,0.08)', marginBottom: 16 }} />

        {/* Document uploads */}
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(186,214,235,0.5)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>
          Documentos
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* ID Document */}
          <div style={{ borderRadius: 10, border: '1px solid rgba(186,214,235,0.1)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>🪪</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Documento de identidad</div>
                <div style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)' }}>Cédula, Pasaporte o Cédula de Extranjería</div>
              </div>
              {hasIDDoc && <DocBadge status="uploaded" />}
            </div>
            <FileUpload
              label={hasIDDoc ? 'Reemplazar documento' : 'Subir documento de identidad (PDF, JPG, PNG)'}
              accept=".pdf,.jpg,.jpeg,.png"
              currentUrl={profile.id_doc_url}
              onUpload={handleIDDocUpload}
            />
          </div>

          {/* Proof of address */}
          <div style={{ borderRadius: 10, border: '1px solid rgba(186,214,235,0.1)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>🏠</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>Prueba de domicilio</div>
                <div style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)' }}>Extracto bancario o recibo de servicios con tu dirección</div>
              </div>
              {hasProofOfAddress && <DocBadge status="uploaded" />}
            </div>
            <FileUpload
              label={hasProofOfAddress ? 'Reemplazar documento' : 'Subir prueba de domicilio (PDF, JPG, PNG)'}
              accept=".pdf,.jpg,.jpeg,.png"
              currentUrl={profile.proof_of_address_url}
              onUpload={handleProofOfAddressUpload}
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
                ⚠ <strong>Debe tener menos de un mes de expedido.</strong> Documentos más antiguos serán rechazados.
              </span>
            </div>
            {hasRUT && profile.rut_url && (
              <div style={{ marginBottom: 8 }}>
                <a href={profile.rut_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#BAD6EB' }}>Ver RUT subido →</a>
              </div>
            )}
            <FileUpload
              label={hasRUT ? 'Reemplazar RUT' : 'Subir RUT (PDF, JPG, PNG)'}
              accept=".pdf,.jpg,.jpeg,.png"
              currentUrl={profile.rut_url}
              onUpload={handleRUTUpload}
            />
          </div>
        </div>

        {/* Submit for verification */}
        {(!rutStatus || rutStatus === 'RECHAZADO') && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(186,214,235,0.08)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              <CheckItem done={hasIDDoc} label="Documento de identidad subido" />
              <CheckItem done={hasRUT} label="RUT subido" />
            </div>
            {requestError && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 10 }}>{requestError}</p>}
            {requested ? (
              <div style={{ background: '#d1fae5', borderRadius: 8, padding: '12px 16px', color: '#065f46', fontSize: 13, fontWeight: 600 }}>
                ✓ Solicitud enviada. Convexo revisará tu perfil en breve.
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
                {requesting ? 'Enviando...' : 'Solicitar verificación →'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── StatusChip ──
function StatusChip({ status }: { status: string }) {
  if (!status) return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.08)', color: 'rgba(186,214,235,0.5)' }}>No iniciado</span>
  )
  const map: Record<string, { bg: string; color: string; label: string }> = {
    PENDIENTE:  { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: 'Pendiente' },
    VERIFICADO: { bg: 'rgba(16,185,129,0.15)', color: '#10b981', label: 'Verificado' },
    RECHAZADO:  { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444', label: 'Rechazado' },
  }
  const s = map[status]
  if (!s) return null
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: s.bg, color: s.color }}>
      {s.label}
    </span>
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
            <button onClick={onCancel} style={ghostBtn}>Cancelar</button>
            <button onClick={onSave} disabled={saving} style={primarySmallBtn}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        ) : (
          <button onClick={onEdit} style={ghostBtn}>Editar</button>
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
          <span style={{ fontSize: 13, color: 'rgba(186,214,235,0.4)' }}>No vinculado</span>
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
    uploaded: { bg: '#eff6ff', color: '#1d4ed8', label: 'Subido' },
    review:   { bg: '#fef3c7', color: '#92400e', label: 'En revisión' },
    verified: { bg: '#d1fae5', color: '#065f46', label: 'Verificado' },
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
  return <img src="/socials/instagram.png" alt="Instagram" width={20} height={20} style={{ display: 'block', borderRadius: 4 }} />
}

function XIcon() {
  return <img src="/socials/x.png" alt="X" width={20} height={20} style={{ display: 'block', borderRadius: 4 }} />
}

function LinkedInIcon() {
  return <img src="/socials/linkdin.png" alt="LinkedIn" width={20} height={20} style={{ display: 'block', borderRadius: 4 }} />
}

function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(186,214,235,0.7)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
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
