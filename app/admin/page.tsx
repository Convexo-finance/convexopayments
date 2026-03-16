import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { adminGetAllOrders } from '@/lib/actions/admin'

export default async function AdminDashboardPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/login')

  const [payOrders, collectOrders] = await Promise.all([
    adminGetAllOrders(privyToken, 'PAY', { status: 'ENVIADO' }).catch(() => ({
      data: [],
      total: 0,
    })),
    adminGetAllOrders(privyToken, 'COLLECT', { status: 'ENVIADO' }).catch(() => ({
      data: [],
      total: 0,
    })),
  ])

  const stats = [
    { label: 'Pending Pay Orders', value: payOrders.total, href: '/admin/pagar', color: '#334EAC' },
    { label: 'Pending Collect Orders', value: collectOrders.total, href: '/admin/cobrar', color: '#401777' },
    { label: 'Manage Users', value: '→', href: '/admin/usuarios', color: '#081F5C' },
    { label: 'Convexo Config', value: '→', href: '/admin/configuracion', color: '#081F5C' },
  ]

  return (
    <div>
      <Topbar title="Admin Panel" breadcrumb="pay.convexo.xyz administration" />
      <div style={{ padding: 24 }} className="admin-page-pad">
        <div className="metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
          {stats.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              style={{
                background: 'white',
                borderRadius: 12,
                padding: 16,
                border: '1px solid #e8e4dc',
                textDecoration: 'none',
                display: 'block',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#999', marginBottom: 8 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            </Link>
          ))}
        </div>

        {/* Recent pending pay orders */}
        {payOrders.data && payOrders.data.length > 0 && (
          <div className="table-scroll" style={{ background: 'white', borderRadius: 12, border: '1px solid #e8e4dc', marginBottom: 16 }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0ece4' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#081F5C' }}>Pending Pay Orders</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 500 }}>
              <thead>
                <tr>
                  {['User', 'Amount', 'Currency', 'Date', 'Status', ''].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payOrders.data.slice(0, 5).map((o: Record<string, unknown>) => (
                  <tr key={o.id as string} style={{ borderBottom: '1px solid #f8f6f2' }}>
                    <td style={tdStyle}>{(o.users as Record<string, unknown>)?.email as string ?? '—'}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{Number(o.amount).toLocaleString()}</td>
                    <td style={tdStyle}>{o.currency as string}</td>
                    <td style={{ ...tdStyle, color: '#888' }}>
                      {o.created_at ? new Date(o.created_at as string).toLocaleDateString() : '—'}
                    </td>
                    <td style={tdStyle}><StatusBadge status={o.status as string} /></td>
                    <td style={tdStyle}>
                      <Link href={`/admin/pagar`} style={{ color: '#334EAC', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '10px 16px', textAlign: 'left', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: '#aaa', fontWeight: 600, borderBottom: '1px solid #f0ece4' }
const tdStyle: React.CSSProperties = { padding: '11px 16px', color: '#081F5C' }
