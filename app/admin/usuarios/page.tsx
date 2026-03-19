import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { adminGetAllUsers } from '@/lib/actions/admin'

export default async function AdminUsuariosPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/')

  const { data: users, total } = await adminGetAllUsers(privyToken).catch(() => ({
    data: [],
    total: 0,
  }))

  return (
    <div>
      <Topbar title="Usuarios" breadcrumb={`${total} registrados`} />
      <div style={{ padding: 24 }} className="admin-page-pad">
        <div className="table-scroll" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(186,214,235,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
            <thead>
              <tr>
                {['Usuario', 'Teléfono', 'Estado', 'Verificación', 'Registrado', ''].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u: Record<string, unknown>) => {
                const profile = (Array.isArray(u.profiles) ? u.profiles[0] : u.profiles) as Record<string, unknown> | null
                const firstName = profile?.first_name as string | null
                const lastName  = profile?.last_name  as string | null
                const fullName  = [firstName, lastName].filter(Boolean).join(' ') || null
                const phone     = profile?.phone as string | null
                const phoneCode = profile?.phone_country_code as string | null
                const phoneDisplay = phone ? `${phoneCode ?? ''} ${phone}`.trim() : null

                return (
                  <tr key={u.id as string} style={{ borderTop: '1px solid rgba(186,214,235,0.07)' }}>
                    {/* Usuario — name + login email */}
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
                        {fullName ?? <span style={{ color: 'rgba(186,214,235,0.35)', fontWeight: 400, fontStyle: 'italic' }}>Sin nombre</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(186,214,235,0.45)', marginTop: 2 }}>
                        {u.email as string}
                      </div>
                    </td>

                    {/* Teléfono */}
                    <td style={{ ...tdStyle, color: phoneDisplay ? 'rgba(255,255,255,0.75)' : 'rgba(186,214,235,0.3)' }}>
                      {phoneDisplay ?? '—'}
                    </td>

                    {/* Estado cuenta */}
                    <td style={tdStyle}>
                      <StatusBadge status={(u.is_enabled as boolean) ? 'ACTIVE' : 'INACTIVE'} />
                    </td>

                    {/* Verificación RUT */}
                    <td style={tdStyle}>
                      {profile?.rut_status
                        ? <StatusBadge status={profile.rut_status as string} />
                        : <span style={{ fontSize: 12, color: 'rgba(186,214,235,0.3)' }}>Sin enviar</span>}
                    </td>

                    {/* Fecha de registro */}
                    <td style={{ ...tdStyle, color: 'rgba(186,214,235,0.5)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {u.created_at
                        ? new Date(u.created_at as string).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>

                    {/* Acción */}
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <Link
                        href={`/admin/usuarios/${u.id}`}
                        style={{
                          color: '#BAD6EB', fontSize: 12, textDecoration: 'none', fontWeight: 600,
                          background: 'rgba(186,214,235,0.08)', border: '1px solid rgba(186,214,235,0.15)',
                          borderRadius: 6, padding: '5px 12px', whiteSpace: 'nowrap',
                        }}
                      >
                        Ver detalle →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {(!users || users.length === 0) && (
            <div style={{ padding: '32px 24px', textAlign: 'center', color: 'rgba(186,214,235,0.35)', fontSize: 13 }}>
              No hay usuarios registrados.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'left',
  fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase',
  color: 'rgba(186,214,235,0.4)', fontWeight: 600,
  borderBottom: '1px solid rgba(186,214,235,0.08)',
}
const tdStyle: React.CSSProperties = { padding: '12px 16px', color: 'rgba(255,255,255,0.85)' }
