import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { requireAdmin } from '@/lib/actions/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { UserDetailClient } from './UserDetailClient'

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/login')

  await requireAdmin(privyToken)

  const supabase = await createServiceClient()
  let user = null
  try {
    const { data } = await supabase
      .from('users')
      .select(`
        *,
        profiles(
          first_name, last_name, contact_email,
          phone_country_code, phone,
          id_type, id_number,
          address, city, state, country,
          instagram, twitter, linkedin,
          id_doc_url, rut_url, rut_status, rut_admin_note
        )
      `)
      .eq('id', id)
      .single()
    user = data
  } catch {
    user = null
  }

  if (!user) redirect('/admin/usuarios')

  return (
    <div>
      <Topbar title="User Detail" breadcrumb={user.email} />
      <div style={{ padding: 24, maxWidth: 800 }}>
        <UserDetailClient user={user as unknown as Parameters<typeof UserDetailClient>[0]['user']} privyToken={privyToken} />
      </div>
    </div>
  )
}
