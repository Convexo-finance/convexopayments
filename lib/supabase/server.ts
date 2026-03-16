import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import type { Database } from './types'

/**
 * Mint a Supabase-compatible HS256 JWT from a verified Privy user ID.
 *
 * Why this pattern:
 * - Privy access tokens are RS256 (asymmetric). Supabase by default uses
 *   HS256 with its own JWT secret and cannot verify Privy-signed tokens.
 * - Instead of re-configuring Supabase JWT settings, we verify the Privy
 *   token server-side (via @privy-io/server-auth) and then mint a fresh
 *   Supabase-compatible JWT signed with SUPABASE_JWT_SECRET.
 * - This JWT has `sub` = Privy user ID, so auth.uid() in RLS returns the
 *   Privy user ID, which our users.privy_user_id column stores.
 *
 * Alternative: configure Supabase to use Privy's JWKS endpoint at
 *   https://auth.privy.io/api/v1/apps/{PRIVY_APP_ID}/jwks.json
 *   via Supabase dashboard → Authentication → Third-party auth.
 *   If you do that, remove this minting and pass the raw Privy token.
 */
function mintSupabaseJWT(privyUserId: string): string {
  const header = base64url({ alg: 'HS256', typ: 'JWT' })
  const now = Math.floor(Date.now() / 1000)
  const payload = base64url({
    sub: privyUserId,
    role: 'authenticated',
    iat: now,
    exp: now + 3600, // 1 hour
  })
  const sig = createHmac('sha256', process.env.SUPABASE_JWT_SECRET!)
    .update(`${header}.${payload}`)
    .digest('base64url')
  return `${header}.${payload}.${sig}`
}

function base64url(obj: object): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url')
}

/**
 * Server Supabase client.
 *
 * Pass `privyToken` to enable RLS — the token is verified via
 * @privy-io/server-auth and exchanged for a Supabase JWT so that
 * auth.uid() returns the Privy user ID and all RLS policies fire correctly.
 *
 * Omit `privyToken` only for unauthenticated operations.
 */
export async function createClient(privyToken?: string) {
  const cookieStore = await cookies()
  const globalHeaders: Record<string, string> = {}

  if (privyToken) {
    // Verify with Privy, then mint a Supabase-compatible JWT
    const { verifyPrivyToken } = await import('@/lib/privy/server')
    const claims = await verifyPrivyToken(privyToken)
    const supabaseJWT = mintSupabaseJWT(claims.userId)
    globalHeaders['Authorization'] = `Bearer ${supabaseJWT}`
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: globalHeaders },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

/**
 * Service-role client — bypasses RLS entirely. Use only in admin Server Actions.
 */
export async function createServiceClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
    }
  )
}
