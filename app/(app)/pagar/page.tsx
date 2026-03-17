import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ActivationBanner } from '@/components/ui/ActivationBanner'
import Link from 'next/link'
import { getOrders } from '@/lib/actions/orders'
import { getSessionUser } from '@/lib/actions/auth'

export default async function PagarPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/')

  const user = await getSessionUser(privyToken)
  const isEnabled = user?.is_enabled ?? false

  const { data: orders, total } = await getOrders(privyToken, 'PAY').catch(() => ({
    data: [],
    total: 0,
  }))

  return (
    <div>
      <Topbar
        title="Pay"
        breadcrumb={`${total} payment order${total !== 1 ? 's' : ''}`}
        cta={isEnabled ? { label: '+ New Order', href: '/pagar/new' } : undefined}
      />
      <div style={{ padding: 24 }} className="admin-page-pad">
        {!isEnabled && <ActivationBanner />}
        <div style={{ opacity: isEnabled ? 1 : 0.5, pointerEvents: isEnabled ? 'auto' : 'none' }}>
        <div className="table-scroll" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(186,214,235,0.1)' }}>
          {!orders || orders.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'rgba(186,214,235,0.4)', fontSize: 14 }}>
              No payment orders yet.{' '}
              <Link href="/pagar/new" style={{ color: '#BAD6EB' }}>Create one →</Link>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 640 }}>
              <thead>
                <tr>
                  {['Order ID', 'Provider', 'Payment method', 'Amount', 'Invoice', 'Status', ''].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const profile = o.payment_profiles

                  return (
                    <tr key={o.id} style={{ borderBottom: '1px solid rgba(186,214,235,0.07)' }}>

                      {/* Order ID */}
                      <td style={tdStyle}>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'rgba(186,214,235,0.6)', fontWeight: 600 }}>
                          #{o.id.slice(0, 8).toUpperCase()}
                        </span>
                      </td>

                      {/* Provider */}
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
                          {o.entity_name ?? '—'}
                        </span>
                      </td>

                      {/* Payment method */}
                      <td style={tdStyle}>
                        {profile ? (
                          <div>
                            <div style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                              {profile.label ?? profile.method}
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(186,214,235,0.45)', marginTop: 2 }}>
                              {profile.method}
                              {(profile.details as Record<string, string>)?.bank_name ? ` · ${(profile.details as Record<string, string>).bank_name}` : ''}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'rgba(186,214,235,0.4)' }}>—</span>
                        )}
                      </td>

                      {/* Amount */}
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
                          {Number(o.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                        <span style={{ marginLeft: 5, fontSize: 11, color: 'rgba(186,214,235,0.5)', fontWeight: 600 }}>
                          {o.currency}
                        </span>
                      </td>

                      {/* Invoice */}
                      <td style={tdStyle}>
                        {o.invoice_url ? (
                          <a
                            href={o.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#BAD6EB', fontSize: 12, textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
                          >
                            📄 View
                          </a>
                        ) : (
                          <span style={{ color: 'rgba(186,214,235,0.3)', fontSize: 12 }}>—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={tdStyle}>
                        <StatusBadge status={o.status} />
                      </td>

                      {/* View more */}
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                        <Link
                          href={`/pagar/${o.id}`}
                          style={{ color: '#BAD6EB', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}
                        >
                          View more →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  textAlign: 'left',
  fontSize: 10,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: 'rgba(186,214,235,0.4)',
  fontWeight: 600,
  borderBottom: '1px solid rgba(186,214,235,0.08)',
  whiteSpace: 'nowrap',
}
const tdStyle: React.CSSProperties = { padding: '12px 16px', color: 'rgba(255,255,255,0.9)', verticalAlign: 'middle' }
