import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { requireAdmin } from '@/lib/actions/auth'
import { adminGetAllClients } from '@/lib/actions/admin'

export default async function AdminClientesPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/login')

  await requireAdmin(privyToken)

  const { data: clients } = await adminGetAllClients(privyToken).catch(() => ({ data: [] }))

  return (
    <div>
      <Topbar title="All Clients" breadcrumb="Admin view of client entities" />
      <div style={{ padding: 24 }}>
        <div className="table-scroll" style={{ background: 'white', borderRadius: 12, border: '1px solid #e8e4dc' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr style={{ background: '#faf8f5' }}>
                {['Name', 'Email', 'Country', 'Created', ''].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {((clients ?? []) as unknown[]).length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#aaa', fontSize: 13 }}>No clients yet.</td></tr>
              ) : (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (clients ?? []).map((c: any) => (
                  <tr key={c.id} style={{ borderTop: '1px solid #f0ede8' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#081F5C', fontWeight: 600 }}>{c.internal_name}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#555' }}>{c.contact_email ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#555' }}>{c.office_country ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#888' }}>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <Link href={`/admin/clientes/${c.id}`} style={{ fontSize: 12, color: '#334EAC', fontWeight: 600, textDecoration: 'none' }}>Ver →</Link>
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
