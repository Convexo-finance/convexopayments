import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { adminGetAllUsers } from '@/lib/actions/admin'

export default async function AdminUsuariosPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/login')

  const { data: users, total } = await adminGetAllUsers(privyToken).catch(() => ({
    data: [],
    total: 0,
  }))

  return (
    <div>
      <Topbar title="Users" breadcrumb={`${total} registered users`} />
      <div style={{ padding: 24 }}>
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e8e4dc', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
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
                  <tr key={u.id as string} style={{ borderBottom: '1px solid #f8f6f2' }}>
                    <td style={tdStyle}>{u.email as string}</td>
                    <td style={tdStyle}>
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        padding: '2px 8px', borderRadius: 10,
                        background: u.role === 'ADMIN' ? '#e0e7ff' : '#f3f4f6',
                        color: u.role === 'ADMIN' ? '#4338ca' : '#555',
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
                    <td style={{ ...tdStyle, color: '#888', fontSize: 12 }}>
                      {u.created_at ? new Date(u.created_at as string).toLocaleDateString() : '—'}
                    </td>
                    <td style={tdStyle}>
                      <Link
                        href={`/admin/usuarios/${u.id}`}
                        style={{ color: '#334EAC', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}
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

const thStyle: React.CSSProperties = { padding: '10px 16px', textAlign: 'left', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: '#aaa', fontWeight: 600, borderBottom: '1px solid #f0ece4' }
const tdStyle: React.CSSProperties = { padding: '11px 16px', color: '#081F5C' }
