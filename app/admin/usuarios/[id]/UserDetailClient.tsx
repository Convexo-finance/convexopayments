'use client'
import { useState } from 'react'

const ID_TYPE_LABELS: Record<string, string> = {
  CC: 'Cédula de Ciudadanía',
  CE: 'Cédula de Extranjería',
  PA: 'Pasaporte',
}

interface Profile {
  first_name: string | null
  last_name: string | null
  contact_email: string | null
  phone_country_code: string | null
  phone: string | null
  id_type: string | null
  id_number: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  instagram: string | null
  twitter: string | null
  linkedin: string | null
  id_doc_url: string | null
  rut_url: string | null
  rut_status: string | null
  rut_admin_note: string | null
  // legacy fields
  full_name?: string | null
  company_name?: string | null
  rut_verified?: boolean | null
}

interface UserDetailClientProps {
  user: {
    id: string
    privy_user_id: string
    email: string
    role: string
    is_enabled: boolean
    created_at: string | null
    profiles: Profile | null | Profile[]
  }
  privyToken: string
}

export function UserDetailClient({ user, privyToken }: UserDetailClientProps) {
  const profile: Profile | null = Array.isArray(user.profiles) ? user.profiles[0] ?? null : user.profiles

  const [isActive, setIsActive] = useState(user.is_enabled)
  const [rutStatus, setRutStatus] = useState(profile?.rut_status ?? null)
  const [rejectNote, setRejectNote] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleToggleActive() {
    setLoading('active'); setError(null); setSuccess(null)
    try {
      const { adminEnableUser } = await import('@/lib/actions/admin')
      await adminEnableUser(privyToken, user.id, !isActive)
      setIsActive((v) => !v)
      setSuccess(`User ${!isActive ? 'enabled' : 'disabled'}.`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally { setLoading(null) }
  }

  async function handleVerifyDocs(status: 'VERIFICADO' | 'RECHAZADO') {
    if (status === 'RECHAZADO' && !rejectNote.trim()) {
      setError('Please enter a rejection reason.')
      return
    }
    setLoading('rut'); setError(null); setSuccess(null)
    try {
      const { adminVerifyRUT } = await import('@/lib/actions/admin')
      await adminVerifyRUT(privyToken, user.id, status, rejectNote || undefined)
      setRutStatus(status)
      setShowRejectInput(false)
      setRejectNote('')
      setSuccess(status === 'VERIFICADO' ? 'Documents verified.' : 'Documents rejected.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally { setLoading(null) }
  }

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.full_name || null
  const idTypeLabel = profile?.id_type ? (ID_TYPE_LABELS[profile.id_type] ?? profile.id_type) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {error && <div style={{ background: 'rgba(239,68,68,0.15)', borderRadius: 8, padding: '12px 16px', color: '#ef4444', fontSize: 13 }}>{error}</div>}
      {success && <div style={{ background: 'rgba(16,185,129,0.15)', borderRadius: 8, padding: '12px 16px', color: '#10b981', fontSize: 13 }}>{success}</div>}

      {/* ── Account ── */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 2 }}>
              {fullName ?? user.email}
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.5)' }}>{user.email}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <StatusPill active={isActive} />
            <span style={{ fontSize: 11, color: 'rgba(186,214,235,0.4)' }}>
              {user.role} · Joined {user.created_at ? new Date(user.created_at).toLocaleDateString('es-CO') : '—'}
            </span>
          </div>
        </div>
        <button
          onClick={handleToggleActive}
          disabled={!!loading}
          style={{
            background: isActive ? '#dc2626' : '#059669',
            color: 'white', border: 'none', borderRadius: 8,
            padding: '8px 18px', fontSize: 13, fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1,
          }}
        >
          {loading === 'active' ? '...' : isActive ? 'Disable Account' : 'Enable Account'}
        </button>
      </div>

      {/* ── Personal Info ── */}
      {profile && (
        <div style={cardStyle}>
          <SectionTitle>Personal Information</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
            <InfoField label="Full Name" value={fullName} />
            <InfoField label="Contact Email" value={profile.contact_email} />
            <InfoField
              label="Identity Document"
              value={idTypeLabel ? `${idTypeLabel} — ${profile.id_number ?? '—'}` : null}
            />
            <InfoField
              label="Phone"
              value={profile.phone ? `${profile.phone_country_code ?? ''} ${profile.phone}`.trim() : null}
            />
            <InfoField
              label="Address"
              value={[profile.address, profile.city, profile.state, profile.country].filter(Boolean).join(', ') || null}
            />
          </div>
          {/* Social */}
          {(profile.instagram || profile.twitter || profile.linkedin) && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(186,214,235,0.08)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(186,214,235,0.4)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 8 }}>Social</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {profile.instagram && (
                  <a href={`https://instagram.com/${profile.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={socialLink}>
                    📷 {profile.instagram}
                  </a>
                )}
                {profile.twitter && (
                  <a href={`https://x.com/${profile.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={socialLink}>
                    𝕏 {profile.twitter}
                  </a>
                )}
                {profile.linkedin && (
                  <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" style={socialLink}>
                    in LinkedIn →
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Documents ── */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionTitle>Verification Documents</SectionTitle>
          {rutStatus && (
            <span style={{
              background: rutStatus === 'VERIFICADO' ? '#d1fae5' : rutStatus === 'RECHAZADO' ? '#fee2e2' : '#fef3c7',
              color: rutStatus === 'VERIFICADO' ? '#065f46' : rutStatus === 'RECHAZADO' ? '#991b1b' : '#92400e',
              borderRadius: 99, padding: '3px 12px', fontSize: 12, fontWeight: 700,
            }}>
              {rutStatus === 'VERIFICADO' ? 'Verified' : rutStatus === 'RECHAZADO' ? 'Rejected' : 'Pending review'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <DocRow label="Identity Document (CC / Pasaporte / CE)" url={profile?.id_doc_url ?? null} />
          <DocRow label="RUT – Registro Único Tributario" url={profile?.rut_url ?? null} />
        </div>

        {/* Review actions — only show if there are docs and not yet verified */}
        {(profile?.id_doc_url || profile?.rut_url) && rutStatus !== 'VERIFICADO' && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(186,214,235,0.08)' }}>
            {showRejectInput ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={labelStyle}>Rejection reason (shown to user)</label>
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="e.g. RUT is expired. Please upload a document issued within the last month."
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'inherit' }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleVerifyDocs('RECHAZADO')}
                    disabled={!!loading}
                    style={{ ...actionBtn, background: '#dc2626' }}
                  >
                    {loading === 'rut' ? 'Sending...' : 'Confirm Rejection'}
                  </button>
                  <button onClick={() => { setShowRejectInput(false); setRejectNote('') }} style={ghostBtn}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => handleVerifyDocs('VERIFICADO')}
                  disabled={!!loading}
                  style={{ ...actionBtn, background: '#059669' }}
                >
                  {loading === 'rut' ? '...' : '✓ Approve Documents'}
                </button>
                <button
                  onClick={() => setShowRejectInput(true)}
                  disabled={!!loading}
                  style={{ ...actionBtn, background: '#dc2626' }}
                >
                  ✗ Reject Documents
                </button>
              </div>
            )}
          </div>
        )}

        {!profile?.id_doc_url && !profile?.rut_url && (
          <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.4)', marginTop: 8 }}>No documents uploaded yet.</p>
        )}
      </div>
    </div>
  )
}

// ── Small components ──

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: 0, letterSpacing: '0.3px' }}>{children}</h3>
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span style={{
      background: active ? '#d1fae5' : '#fee2e2',
      color: active ? '#065f46' : '#991b1b',
      borderRadius: 99, padding: '3px 12px', fontSize: 12, fontWeight: 700,
    }}>
      {active ? 'Active' : 'Disabled'}
    </span>
  )
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(186,214,235,0.4)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, color: value ? 'rgba(255,255,255,0.9)' : 'rgba(186,214,235,0.3)', fontStyle: value ? 'normal' : 'italic' }}>
        {value ?? 'Not provided'}
      </div>
    </div>
  )
}

function DocRow({ label, url }: { label: string; url: string | null }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, border: '1px solid rgba(186,214,235,0.1)' }}>
      <span style={{ fontSize: 16 }}>📄</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{label}</div>
        {url
          ? <div style={{ fontSize: 11, color: 'rgba(186,214,235,0.5)', marginTop: 1 }}>Uploaded</div>
          : <div style={{ fontSize: 11, color: 'rgba(186,214,235,0.3)', marginTop: 1 }}>Not uploaded</div>}
      </div>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{
          fontSize: 12, fontWeight: 600, color: '#BAD6EB',
          background: 'rgba(51,78,172,0.2)', border: '1px solid rgba(186,214,235,0.2)',
          borderRadius: 6, padding: '5px 12px', textDecoration: 'none',
        }}>
          View →
        </a>
      )}
      {!url && (
        <span style={{ fontSize: 11, color: 'rgba(186,214,235,0.3)', fontWeight: 600 }}>—</span>
      )}
    </div>
  )
}

const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(186,214,235,0.1)', padding: 24 }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(186,214,235,0.7)', marginBottom: 4 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 7, border: '1px solid rgba(186,214,235,0.2)', fontSize: 13, color: 'white', background: 'rgba(255,255,255,0.07)', outline: 'none', boxSizing: 'border-box' }
const actionBtn: React.CSSProperties = { color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const ghostBtn: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(186,214,235,0.2)', background: 'rgba(255,255,255,0.06)', fontSize: 13, fontWeight: 600, color: 'rgba(186,214,235,0.7)', cursor: 'pointer' }
const socialLink: React.CSSProperties = { fontSize: 13, color: '#BAD6EB', textDecoration: 'none', fontWeight: 500 }
