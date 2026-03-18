import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { adminGetAllOrders } from '@/lib/actions/admin'

const STATUSES = ['', 'OPENED', 'ACCEPTED', 'ORDERED', 'PROCESSING', 'PAYED', 'RECHAZADO']
const LABELS: Record<string, string> = {
  '': 'Todos',
  OPENED: 'Abierto',
  ACCEPTED: 'Aceptado',
  ORDERED: 'Ordenado',
  PROCESSING: 'Procesando',
  PAYED: 'Pagado',
  RECHAZADO: 'Rechazado',
}

export default async function AdminPayOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status = '', page = '1' } = await searchParams
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/')

  const { data: orders, total } = await adminGetAllOrders(privyToken, 'PAY', {
    page: Number(page),
    status,
  }).catch(() => ({ data: [], total: 0 }))

  const totalPages = Math.ceil(total / 20)

  return (
    <div>
      <Topbar title="Admin — Pay Orders" breadcrumb={`${total} total`} />
      <div style={{ padding: 24 }} className="admin-page-pad">

        {/* Status filter pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={`/admin/pagar${s ? `?status=${s}` : ''}`}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'none',
                background: status === s ? '#334EAC' : 'rgba(255,255,255,0.06)',
                color: status === s ? 'white' : 'rgba(186,214,235,0.7)',
                border: `1px solid ${status === s ? '#334EAC' : 'rgba(186,214,235,0.15)'}`,
              }}
            >
              {LABELS[s]}
            </Link>
          ))}
        </div>

        {/* Table */}
        {!orders || orders.length === 0 ? (
          <p style={{ color: 'rgba(186,214,235,0.4)', fontSize: 14 }}>No hay órdenes.</p>
        ) : (
          <div className="table-scroll" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(186,214,235,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr>
                  {['#ID', 'Usuario', 'Entidad', 'Monto', 'Fiat', 'Estado', 'Fecha', ''].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const entityObj = o.type === 'PAY'
                    ? (Array.isArray((o as any).suppliers) ? (o as any).suppliers[0] : (o as any).suppliers)
                    : (Array.isArray((o as any).clients) ? (o as any).clients[0] : (o as any).clients)
                  const entityName = (o as any).entity_name ?? entityObj?.internal_name ?? '—'
                  const userEmail = Array.isArray((o as any).users) ? (o as any).users[0]?.email : (o as any).users?.email
                  const shortId = `#${o.id.slice(0, 8).toUpperCase()}`

                  // Parse fiat info from reference if packed
                  let fiatDisplay = '—'
                  const ppDetails = (Array.isArray((o as any).payment_profiles) ? (o as any).payment_profiles[0] : (o as any).payment_profiles)
                  if ((o as any).fiat_currency && (o as any).fiat_amount) {
                    fiatDisplay = `${(o as any).fiat_currency} ${Number((o as any).fiat_amount).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                  } else if (o.reference?.includes('|')) {
                    for (const part of o.reference.split('|').map((s: string) => s.trim())) {
                      const m = part.match(/^([A-Z]{3})\s*([\d.,]+)\s*@/)
                      if (m) { fiatDisplay = `${m[1]} ${Number(m[2].replace(',', '')).toLocaleString('en-US', { maximumFractionDigits: 0 })}` ; break }
                    }
                  }

                  return (
                    <tr key={o.id} style={{ borderTop: '1px solid rgba(186,214,235,0.07)' }}>
                      <td style={tdStyle}>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>{shortId}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>{userEmail ?? '—'}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>{entityName}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                          {Number(o.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {o.currency}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 12, color: 'rgba(186,214,235,0.5)' }}>{fiatDisplay}</span>
                      </td>
                      <td style={tdStyle}>
                        <StatusBadge status={o.status} />
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 11, color: 'rgba(186,214,235,0.4)' }}>
                          {o.created_at ? new Date(o.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <Link
                          href={`/admin/pagar/${o.id}`}
                          style={{ fontSize: 12, fontWeight: 600, color: '#BAD6EB', textDecoration: 'none', whiteSpace: 'nowrap' }}
                        >
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'center' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/admin/pagar?page=${p}${status ? `&status=${status}` : ''}`}
                style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 13,
                  textDecoration: 'none',
                  background: Number(page) === p ? '#334EAC' : 'rgba(255,255,255,0.06)',
                  color: Number(page) === p ? 'white' : 'rgba(186,214,235,0.7)',
                  border: `1px solid ${Number(page) === p ? '#334EAC' : 'rgba(186,214,235,0.15)'}`,
                }}
              >
                {p}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'rgba(186,214,235,0.4)',
  borderBottom: '1px solid rgba(186,214,235,0.08)',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 14px',
  verticalAlign: 'middle',
  color: 'rgba(255,255,255,0.85)',
}
