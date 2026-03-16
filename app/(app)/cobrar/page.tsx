import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import Link from 'next/link'
import { getOrders } from '@/lib/actions/orders'
import { getSessionUser } from '@/lib/actions/auth'

export default async function CobrarPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/')

  const user = await getSessionUser(privyToken)
  if (!user?.is_enabled) redirect('/dashboard')

  const { data: orders, total } = await getOrders(privyToken, 'COLLECT').catch(() => ({
    data: [],
    total: 0,
  }))

  return (
    <div>
      <Topbar
        title="Cobrar"
        breadcrumb={`${total} collection orders`}
        cta={{ label: '+ Nueva Orden de Cobro', href: '/cobrar/new' }}
      />
      <div style={{ padding: 24 }} className="admin-page-pad">
        <div className="table-scroll" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(186,214,235,0.1)' }}>
          {!orders || orders.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'rgba(186,214,235,0.4)', fontSize: 14 }}>
              No collection orders yet.{' '}
              <Link href="/cobrar/new" style={{ color: '#BAD6EB' }}>Create one →</Link>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 }}>
              <thead>
                <tr>
                  {['Amount', 'Currency', 'Reference', 'Due Date', 'Status', ''].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid rgba(186,214,235,0.07)' }}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{Number(o.amount).toLocaleString()}</td>
                    <td style={tdStyle}>{o.currency}</td>
                    <td style={{ ...tdStyle, color: 'rgba(186,214,235,0.7)' }}>{o.reference ?? '—'}</td>
                    <td style={{ ...tdStyle, color: 'rgba(186,214,235,0.7)' }}>{o.due_date ?? '—'}</td>
                    <td style={tdStyle}><StatusBadge status={o.status} /></td>
                    <td style={tdStyle}>
                      <Link href={`/cobrar/${o.id}`} style={{ color: '#BAD6EB', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = { padding: '10px 16px', textAlign: 'left', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(186,214,235,0.4)', fontWeight: 600, borderBottom: '1px solid rgba(186,214,235,0.08)' }
const tdStyle: React.CSSProperties = { padding: '11px 16px', color: 'rgba(255,255,255,0.9)' }
