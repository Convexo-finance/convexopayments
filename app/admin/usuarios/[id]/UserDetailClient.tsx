'use client'
import { useState } from 'react'

const ID_TYPE_LABELS: Record<string, string> = {
  CC: 'Cédula de Ciudadanía',
  CE: 'Cédula de Extranjería',
  PA: 'Pasaporte',
}

const MONTHLY_VOLUME_LABELS: Record<string, string> = {
  '0-1k':   '$0 – $1,000 USD',
  '1k-5k':  '$1,000 – $5,000 USD',
  '5k-20k': '$5,000 – $20,000 USD',
  '+20k':   'Más de $20,000 USD',
}

const ANNUAL_VOLUME_LABELS: Record<string, string> = {
  '0-50k':    'Menos de $50,000 USD',
  '50k-200k': '$50,000 – $200,000 USD',
  '200k-1m':  '$200,000 – $1,000,000 USD',
  '+1m':      'Más de $1,000,000 USD',
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
  postal_code: string | null
  instagram: string | null
  twitter: string | null
  linkedin: string | null
  website_url: string | null
  monthly_volume: string | null
  supplier_countries: string[] | null
  supplier_annual_volume: string | null
  client_countries: string[] | null
  client_annual_volume: string | null
  evm_address: string | null
  solana_address: string | null
  id_doc_url: string | null
  rut_url: string | null
  proof_of_address_url: string | null
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
      setSuccess(isActive ? 'Cuenta deshabilitada.' : 'Cuenta habilitada.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally { setLoading(null) }
  }

  async function handleVerifyDocs(status: 'VERIFICADO' | 'RECHAZADO') {
    if (status === 'RECHAZADO' && !rejectNote.trim()) {
      setError('Ingresa un motivo de rechazo.')
      return
    }
    setLoading('rut'); setError(null); setSuccess(null)
    try {
      const { adminVerifyRUT } = await import('@/lib/actions/admin')
      await adminVerifyRUT(privyToken, user.id, status, rejectNote || undefined)
      setRutStatus(status)
      setShowRejectInput(false)
      setRejectNote('')
      setSuccess(status === 'VERIFICADO' ? 'Documentos aprobados.' : 'Documentos rechazados.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally { setLoading(null) }
  }

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.full_name || null
  const idTypeLabel = profile?.id_type ? (ID_TYPE_LABELS[profile.id_type] ?? profile.id_type) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Alerts ── */}
      {error   && <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '11px 16px', color: '#ef4444', fontSize: 13 }}>{error}</div>}
      {success && <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, padding: '11px 16px', color: '#10b981', fontSize: 13 }}>{success}</div>}

      {/* ── Header card: identity + account control ── */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
        {/* Avatar placeholder */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #334EAC, #401777)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700, color: 'white',
        }}>
          {(fullName ?? user.email).charAt(0).toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.95)', margin: 0 }}>
              {fullName ?? <span style={{ color: 'rgba(186,214,235,0.4)', fontStyle: 'italic', fontWeight: 400 }}>Sin nombre</span>}
            </h2>
            <StatusPill active={isActive} />
            {rutStatus && <RutPill status={rutStatus} />}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(186,214,235,0.5)', marginBottom: 2 }}>{user.email}</div>
          <div style={{ fontSize: 11, color: 'rgba(186,214,235,0.35)' }}>
            {user.role} · Se unió {user.created_at ? new Date(user.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button
            onClick={handleToggleActive}
            disabled={!!loading}
            style={{
              background: isActive ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
              color: isActive ? '#ef4444' : '#10b981',
              border: `1px solid ${isActive ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
              borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1,
            }}
          >
            {loading === 'active' ? '...' : isActive ? 'Deshabilitar' : 'Habilitar'}
          </button>
        </div>
      </div>

      {/* ── 2-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'start' }}>

        {/* LEFT: Personal Info */}
        <div style={cardStyle}>
          <SectionTitle>Información Personal</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
            <InfoField label="Nombre" value={profile?.first_name} />
            <InfoField label="Apellido" value={profile?.last_name} />
            <InfoField label="Email de contacto" value={profile?.contact_email} />
            <InfoField
              label="Teléfono"
              value={profile?.phone ? `${profile.phone_country_code ?? ''} ${profile.phone}`.trim() : null}
            />
            <InfoField label="Tipo de documento" value={idTypeLabel} />
            <InfoField label="Número de documento" value={profile?.id_number} />
            <InfoField
              label="Dirección"
              value={[profile?.address, profile?.city, profile?.state, profile?.country].filter(Boolean).join(', ') || null}
            />
            <InfoField label="Código postal" value={profile?.postal_code} />
            <InfoField
              label="Volumen mensual estimado"
              value={profile?.monthly_volume ? (MONTHLY_VOLUME_LABELS[profile.monthly_volume] ?? profile.monthly_volume) : null}
            />
            <InfoField label="Privy ID" value={user.privy_user_id} mono />
          </div>

          {/* Social */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(186,214,235,0.07)' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(186,214,235,0.35)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 12 }}>Redes Sociales</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <InfoField label="Instagram" value={profile?.instagram} />
              <InfoField label="Twitter / X" value={profile?.twitter} />
              <InfoField label="LinkedIn" value={profile?.linkedin} />
              <InfoField label="Sitio web" value={profile?.website_url} />
            </div>
          </div>
        </div>

        {/* RIGHT column stack */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Wallets */}
          <div style={cardStyle}>
            <SectionTitle>Wallets</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <WalletRow chain="Ethereum / EVM" logo="/chains/ethereum.png" address={profile?.evm_address ?? null} />
              <WalletRow chain="Solana" logo="/chains/solana.png" address={profile?.solana_address ?? null} />
            </div>
          </div>

          {/* Commercial Profile */}
          <div style={cardStyle}>
            <SectionTitle>Perfil Comercial</SectionTitle>

            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(186,214,235,0.35)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>Proveedores</div>
              <CountryChips countries={profile?.supplier_countries ?? []} />
              <div style={{ marginTop: 10 }}>
                <InfoField
                  label="Pagos a proveedores / año"
                  value={profile?.supplier_annual_volume ? (ANNUAL_VOLUME_LABELS[profile.supplier_annual_volume] ?? profile.supplier_annual_volume) : null}
                />
              </div>
            </div>

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(186,214,235,0.07)' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(186,214,235,0.35)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>Clientes</div>
              <CountryChips countries={profile?.client_countries ?? []} />
              <div style={{ marginTop: 10 }}>
                <InfoField
                  label="Cobros de clientes / año"
                  value={profile?.client_annual_volume ? (ANNUAL_VOLUME_LABELS[profile.client_annual_volume] ?? profile.client_annual_volume) : null}
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── Documents — full width ── */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionTitle>Documentos de Verificación</SectionTitle>
          {rutStatus && <RutPill status={rutStatus} />}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <DocRow icon="🪪" label="Documento de identidad" url={profile?.id_doc_url ?? null} />
          <DocRow icon="🏠" label="Prueba de domicilio" url={profile?.proof_of_address_url ?? null} />
          <DocRow icon="📄" label="RUT – DIAN" url={profile?.rut_url ?? null} />
        </div>

        {/* Review actions */}
        {(profile?.id_doc_url || profile?.rut_url) && rutStatus !== 'VERIFICADO' && (
          <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid rgba(186,214,235,0.08)' }}>
            {showRejectInput ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={labelStyle}>Motivo de rechazo (visible para el usuario)</label>
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Ej: El RUT está vencido. Por favor sube un documento expedido en el último mes."
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'inherit' }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleVerifyDocs('RECHAZADO')} disabled={!!loading}
                    style={{ ...actionBtn, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                    {loading === 'rut' ? 'Enviando...' : '✗ Confirmar rechazo'}
                  </button>
                  <button onClick={() => { setShowRejectInput(false); setRejectNote('') }} style={ghostBtn}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => handleVerifyDocs('VERIFICADO')} disabled={!!loading}
                  style={{ ...actionBtn, background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                  {loading === 'rut' ? '...' : '✓ Aprobar documentos'}
                </button>
                <button onClick={() => setShowRejectInput(true)} disabled={!!loading}
                  style={{ ...actionBtn, background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                  ✗ Rechazar documentos
                </button>
              </div>
            )}
          </div>
        )}

        {!profile?.id_doc_url && !profile?.rut_url && (
          <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.35)', marginTop: 8, fontStyle: 'italic' }}>No hay documentos subidos aún.</p>
        )}
      </div>
    </div>
  )
}

// ── Components ──

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', margin: 0, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{children}</h3>
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span style={{
      background: active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
      color: active ? '#10b981' : '#ef4444',
      border: `1px solid ${active ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
      borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700,
    }}>
      {active ? 'Activo' : 'Deshabilitado'}
    </span>
  )
}

function RutPill({ status }: { status: string }) {
  const s = status === 'VERIFICADO'
    ? { bg: 'rgba(16,185,129,0.15)', color: '#10b981', border: 'rgba(16,185,129,0.3)', label: 'Verificado' }
    : status === 'RECHAZADO'
    ? { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'rgba(239,68,68,0.3)', label: 'Rechazado' }
    : { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)', label: 'Pendiente' }
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
      {s.label}
    </span>
  )
}

function InfoField({ label, value, mono }: { label: string; value: string | null | undefined; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(186,214,235,0.35)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
      <div style={{
        fontSize: mono ? 10 : 13,
        color: value ? 'rgba(255,255,255,0.9)' : 'rgba(186,214,235,0.3)',
        fontStyle: value ? 'normal' : 'italic',
        fontFamily: mono ? 'monospace' : 'inherit',
        wordBreak: mono ? 'break-all' : 'normal',
        lineHeight: 1.4,
      }}>
        {value ?? 'No informado'}
      </div>
    </div>
  )
}

function CountryChips({ countries }: { countries: string[] }) {
  if (countries.length === 0) {
    return <div style={{ fontSize: 12, color: 'rgba(186,214,235,0.3)', fontStyle: 'italic' }}>No informado</div>
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {countries.map((c) => (
        <span key={c} style={{
          background: 'rgba(51,78,172,0.2)', border: '1px solid rgba(186,214,235,0.15)',
          borderRadius: 99, padding: '2px 9px', fontSize: 11, color: '#BAD6EB',
        }}>{c}</span>
      ))}
    </div>
  )
}

function DocRow({ icon, label, url }: { icon: string; label: string; url: string | null }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8, padding: '14px',
      background: url ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.03)',
      borderRadius: 8,
      border: `1px solid ${url ? 'rgba(16,185,129,0.15)' : 'rgba(186,214,235,0.08)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{label}</div>
          <div style={{ fontSize: 11, marginTop: 2, color: url ? 'rgba(16,185,129,0.8)' : 'rgba(186,214,235,0.3)' }}>
            {url ? '✓ Subido' : 'No subido'}
          </div>
        </div>
      </div>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{
          display: 'block', textAlign: 'center',
          fontSize: 12, fontWeight: 600, color: '#BAD6EB',
          background: 'rgba(51,78,172,0.2)', border: '1px solid rgba(186,214,235,0.2)',
          borderRadius: 6, padding: '6px 0', textDecoration: 'none',
        }}>
          Ver documento →
        </a>
      )}
    </div>
  )
}

function WalletRow({ chain, logo, address }: { chain: string; logo: string; address: string | null }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
      background: address ? 'rgba(51,78,172,0.08)' : 'rgba(255,255,255,0.03)',
      borderRadius: 8, border: `1px solid ${address ? 'rgba(51,78,172,0.2)' : 'rgba(186,214,235,0.07)'}`,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt={chain} width={20} height={20} style={{ objectFit: 'contain', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: 'rgba(186,214,235,0.45)', marginBottom: 1 }}>{chain}</div>
        <div style={{
          fontSize: 10, fontFamily: 'monospace', wordBreak: 'break-all',
          color: address ? 'rgba(255,255,255,0.8)' : 'rgba(186,214,235,0.3)',
          fontStyle: address ? 'normal' : 'italic',
        }}>
          {address ?? 'Sin wallet registrada'}
        </div>
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(186,214,235,0.1)', padding: 20 }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(186,214,235,0.7)', marginBottom: 4 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 7, border: '1px solid rgba(186,214,235,0.2)', fontSize: 13, color: 'white', background: 'rgba(255,255,255,0.07)', outline: 'none', boxSizing: 'border-box' }
const actionBtn: React.CSSProperties = { border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const ghostBtn: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(186,214,235,0.2)', background: 'rgba(255,255,255,0.06)', fontSize: 13, fontWeight: 600, color: 'rgba(186,214,235,0.7)', cursor: 'pointer' }
