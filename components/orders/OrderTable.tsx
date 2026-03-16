import Link from 'next/link'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Pagination } from '@/components/ui/Pagination'

interface Order {
  id: string
  type: string
  amount: number
  currency: string
  status: string
  created_at: string | null
  entity_id: string
  reference?: string | null
}

interface OrderTableProps {
  orders: Order[]
  type: 'PAY' | 'COLLECT'
  total: number
  page: number
  onPage: (page: number) => void
  entityNames?: Record<string, string>
}

export function OrderTable({
  orders,
  type,
  total,
  page,
  onPage,
  entityNames = {},
}: OrderTableProps) {
  const basePath = type === 'PAY' ? '/pagar' : '/cobrar'

  if (!orders || orders.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px', color: 'rgba(186,214,235,0.4)', fontSize: 14 }}>
        No orders yet. Create your first order above.
      </div>
    )
  }

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Entity', 'Amount', 'Reference', 'Date', 'Status', ''].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontSize: 10,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    color: 'rgba(186,214,235,0.4)',
                    fontWeight: 600,
                    borderBottom: '1px solid rgba(186,214,235,0.07)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                style={{ borderBottom: '1px solid rgba(186,214,235,0.07)' }}
              >
                <td style={tdStyle}>
                  {entityNames[order.entity_id] ?? order.entity_id.slice(0, 8) + '...'}
                </td>
                <td style={{ ...tdStyle, fontWeight: 700 }}>
                  {order.amount.toLocaleString()} {order.currency}
                </td>
                <td style={{ ...tdStyle, color: 'rgba(186,214,235,0.5)' }}>{order.reference ?? '—'}</td>
                <td style={{ ...tdStyle, color: 'rgba(186,214,235,0.5)', whiteSpace: 'nowrap' }}>
                  {order.created_at
                    ? new Date(order.created_at).toLocaleDateString()
                    : '—'}
                </td>
                <td style={tdStyle}>
                  <StatusBadge status={order.status} />
                </td>
                <td style={tdStyle}>
                  <Link
                    href={`${basePath}/${order.id}`}
                    style={{ color: '#BAD6EB', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} total={total} onPage={onPage} />
    </div>
  )
}

const tdStyle: React.CSSProperties = {
  padding: '11px 16px',
  color: 'rgba(255,255,255,0.9)',
}
