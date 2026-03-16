'use server'
import { Resend } from 'resend'
import { createClient, createServiceClient } from '@/lib/supabase/server'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

/**
 * Insert a notification for any user and attempt to send an email.
 * Uses service client because it writes to other users' rows (bypasses RLS).
 * Email errors are logged to notification_errors — never thrown.
 */
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  relatedId?: string,
  relatedType?: string
) {
  const supabase = await createServiceClient()
  const { data: notif, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      body,
      related_id: relatedId,
      related_type: relatedType,
    })
    .select()
    .single()
  if (error) throw error

  // Send email — log failure, don't throw
  const { data: user } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single()

  if (user?.email) {
    try {
      await getResend().emails.send({
        from: 'pay@convexo.xyz',
        to: user.email,
        subject: title,
        html: `<p>${body}</p>`,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      await supabase
        .from('notification_errors')
        .insert({ notification_id: notif.id, error: message })
    }
  }
  return notif
}

/**
 * Mark notifications as read for the authenticated user.
 */
export async function markNotificationsRead(
  privyToken: string,
  ids: string[]
) {
  const supabase = await createClient(privyToken)
  await supabase.from('notifications').update({ is_read: true }).in('id', ids)
}

/**
 * Paginated list of notifications for the authenticated user.
 */
export async function getNotifications(
  privyToken: string,
  { page = 1 } = {}
) {
  const supabase = await createClient(privyToken)
  const from = (page - 1) * 20
  const { data, count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, from + 19)
  return { data, total: count ?? 0 }
}
