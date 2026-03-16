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
      <Topbar title="Users" breadcrumb={`${total} registered users`} />
      <div style={{ padding: 24 }} className="admin-page-pad">
        <div className="table-scroll" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(186,214,235,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
            <thead>
              <tr>
                {['Email', 'Role', 'Status', 'RUT', 'Joined', ''].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u: Record<string, unknown>) => {
                const profile = u.profiles as Record<string, unknown> | null
                return (
                  <tr key={u.id as string} style={{ borderTop: '1px solid rgba(186,214,235,0.07)' }}>
                    <td style={tdStyle}>{u.email as string}</td>
                    <td style={tdStyle}>
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        padding: '2px 8px', borderRadius: 10,
                        background: u.role === 'ADMIN' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.08)',
                        color: u.role === 'ADMIN' ? '#a5b4fc' : 'rgba(186,214,235,0.6)',
                      }}>
                        {u.role as string}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <StatusBadge status={u.is_enabled ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td style={tdStyle}>
                      {profile?.rut_status ? (
                        <StatusBadge status={profile.rut_status as string} />
                      ) : '—'}
                    </td>
                    <td style={{ ...tdStyle, color: 'rgba(186,214,235,0.5)', fontSize: 12 }}>
                      {u.created_at ? new Date(u.created_at as string).toLocaleDateString() : '—'}
                    </td>
                    <td style={tdStyle}>
                      <Link
                        href={`/admin/usuarios/${u.id}`}
                        style={{ color: '#BAD6EB', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '10px 16px', textAlign: 'left', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(186,214,235,0.4)', fontWeight: 600, borderBottom: '1px solid rgba(186,214,235,0.08)' }
const tdStyle: React.CSSProperties = { padding: '11px 16px', color: 'rgba(255,255,255,0.85)' }
