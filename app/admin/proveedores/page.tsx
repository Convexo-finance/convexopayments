import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { requireAdmin } from '@/lib/actions/auth'
import { adminGetAllSuppliers } from '@/lib/actions/admin'

export default async function AdminProveedoresPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/login')

  await requireAdmin(privyToken)

  const { data: suppliers } = await adminGetAllSuppliers(privyToken).catch(() => ({ data: [] }))

  return (
    <div>
      <Topbar title="All Suppliers" breadcrumb="Admin view of supplier entities" />
      <div style={{ padding: 24 }}>
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e8e4dc', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#faf8f5' }}>
                {['Name', 'Email', 'Country', 'Created'].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {((suppliers ?? []) as unknown[]).length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#aaa', fontSize: 13 }}>No suppliers yet.</td></tr>
              ) : (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (suppliers ?? []).map((s: any) => (
                  <tr key={s.id} style={{ borderTop: '1px solid #f0ede8' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#081F5C', fontWeight: 600 }}>{s.internal_name}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#555' }}>{s.contact_email ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#555' }}>{s.office_country ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#888' }}>{new Date(s.created_at).toLocaleDateString()}</td>
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
