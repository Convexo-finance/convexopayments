import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { requireAdmin } from '@/lib/actions/auth'
import { adminGetAllSuppliers } from '@/lib/actions/admin'

export default async function AdminProveedoresPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/')

  await requireAdmin(privyToken)

  const { data: suppliers } = await adminGetAllSuppliers(privyToken).catch(() => ({ data: [] }))

  return (
    <div>
      <Topbar title="All Suppliers" breadcrumb="Admin view of supplier entities" />
      <div style={{ padding: 24 }}>
        <div className="table-scroll" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(186,214,235,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr>
                {['Name', 'Email', 'Country', 'Created', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(186,214,235,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(186,214,235,0.08)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {((suppliers ?? []) as unknown[]).length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'rgba(186,214,235,0.4)', fontSize: 13 }}>No suppliers yet.</td></tr>
              ) : (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (suppliers ?? []).map((s: any) => (
                  <tr key={s.id} style={{ borderTop: '1px solid rgba(186,214,235,0.07)' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{s.internal_name}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{s.contact_email ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{s.office_country ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'rgba(186,214,235,0.5)' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/admin/proveedores/${s.id}`} style={{ fontSize: 12, color: '#BAD6EB', fontWeight: 600, textDecoration: 'none' }}>Ver →</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
