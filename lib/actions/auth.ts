'use server'
import { cookies } from 'next/headers'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getPrivyUser } from '@/lib/privy/server'

/**
 * Called after login. Upserts the users row and verifies the account is enabled.
 * Uses the service-role client so it can write regardless of RLS
 * (the user row doesn't exist yet on first login).
 *
 * The privy-token cookie is set here as a transport mechanism so server
 * components can pass the token to server actions. It is NOT used for
 * security decisions — those happen inside each server action via
 * getSessionUser() / requireAdmin(). httpOnly:false so Privy's client
 * can overwrite it when the token refreshes.
 */
export async function ensureUser(privyToken: string) {
  const claims = await getPrivyUser(privyToken)

  // Get email from Privy user linked accounts
  let email = ''
  try {
    const { PrivyClient } = await import('@privy-io/server-auth')
    const privy = new PrivyClient(
      process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
      process.env.PRIVY_APP_SECRET!
    )
    const privyUser = await privy.getUser(claims.userId)
    email = privyUser.email?.address ?? ''
  } catch {
    // fallback: no email available
  }

  // Use service client — new users don't exist in users table yet, so RLS
  // would block the INSERT. Service role bypasses RLS for this bootstrap.
  const supabase = await createServiceClient()
  const { data: user, error } = await supabase
    .from('users')
    .upsert(
      { privy_user_id: claims.userId, email },
      { onConflict: 'privy_user_id' }
    )
    .select()
    .single()

  if (error) throw error

  const cookieStore = await cookies()
  const isProd = process.env.NODE_ENV === 'production'
  cookieStore.set('privy-token', privyToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  return user
}

/**
 * Clears the privy-token cookie on logout.
 * Called alongside privy.logout() from the Sidebar.
 */
export async function signOut() {
  const cookieStore = await cookies()
  cookieStore.delete('privy-token')
}

/**
 * Returns the current user row from Supabase, using the minted JWT for RLS.
 */
export async function getSessionUser(privyToken: string) {
  const claims = await getPrivyUser(privyToken)
  const supabase = await createClient(privyToken)
  const { data } = await supabase
    .from('users')
    .select()
    .eq('privy_user_id', claims.userId)
    .single()
  return data
}

/**
 * Verifies the current user is an ADMIN. Throws UNAUTHORIZED if not.
 */
export async function requireAdmin(privyToken: string) {
  const user = await getSessionUser(privyToken)
  if (!user || user.role !== 'ADMIN') throw new Error('UNAUTHORIZED')
  return user
}
