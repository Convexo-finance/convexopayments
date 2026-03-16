import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Topbar } from '@/components/layout/Topbar'
import { getNotifications } from '@/lib/actions/notifications'

export default async function NotificacionesPage() {
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/')

  const { data: notifications } = await getNotifications(privyToken).catch(() => ({
    data: [],
    total: 0,
  }))

  return (
    <div>
      <Topbar title="Notificaciones" breadcrumb="Notification center" />
      <div style={{ padding: 24, maxWidth: 700 }}>
        {!notifications || notifications.length === 0 ? (
          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 12,
              border: '1px solid rgba(186,214,235,0.1)',
              padding: '48px 24px',
              textAlign: 'center',
              color: 'rgba(186,214,235,0.4)',
              fontSize: 14,
            }}
          >
            No notifications yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  background: n.is_read ? 'rgba(255,255,255,0.05)' : 'rgba(186,214,235,0.08)',
                  borderRadius: 10,
                  border: `1px solid ${n.is_read ? 'rgba(186,214,235,0.1)' : 'rgba(186,214,235,0.2)'}`,
                  padding: '14px 16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: n.is_read ? 400 : 700, color: 'rgba(255,255,255,0.9)', marginBottom: 3 }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 13, color: 'rgba(186,214,235,0.7)' }}>{n.body}</div>
                  </div>
                  {!n.is_read && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#BAD6EB', marginTop: 4, flexShrink: 0 }} />
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(186,214,235,0.4)', marginTop: 6 }}>
                  {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
