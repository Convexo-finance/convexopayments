import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { getSuppliers } from '@/lib/actions/entities'

export default async function ProveedoresPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/login')

  const { data: suppliers, total } = await getSuppliers(privyToken).catch(() => ({
    data: [],
    total: 0,
  }))

  return (
    <div>
      <Topbar
        title="Proveedores"
        breadcrumb={`${total} suppliers`}
        cta={{ label: '+ New Supplier', href: '/proveedores/new' }}
      />
      <div style={{ padding: 24 }} className="admin-page-pad">
        <div className="table-scroll" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(186,214,235,0.1)' }}>
          {!suppliers || suppliers.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'rgba(186,214,235,0.4)', fontSize: 14 }}>
              No suppliers yet.{' '}
              <Link href="/proveedores/new" style={{ color: '#BAD6EB' }}>
                Add your first supplier →
              </Link>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 560 }}>
              <thead>
                <tr>
                  {['Name', 'Legal Name', 'Country', 'Contact Email', 'Status', ''].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(186,214,235,0.07)' }}>
                    <td style={tdStyle}><strong>{s.internal_name}</strong></td>
                    <td style={tdStyle}>{s.legal_name ?? '—'}</td>
                    <td style={tdStyle}>{s.office_country ?? '—'}</td>
                    <td style={tdStyle}>{s.contact_email ?? '—'}</td>
                    <td style={tdStyle}><StatusBadge status={s.status ?? 'ACTIVE'} /></td>
                    <td style={tdStyle}>
                      <Link href={`/proveedores/${s.id}`} style={{ color: '#BAD6EB', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>
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

const thStyle: React.CSSProperties = { padding: '10px 16px', textAlign: 'left', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(186,214,235,0.4)', fontWeight: 600, borderBottom: '1px solid rgba(186,214,235,0.08)', whiteSpace: 'nowrap' }
const tdStyle: React.CSSProperties = { padding: '11px 16px', color: 'rgba(255,255,255,0.9)' }
