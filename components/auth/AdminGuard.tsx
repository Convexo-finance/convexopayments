'use client'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * Client-side guard for admin routes.
 *
 * Layout-level security is UI protection only — the real security is
 * requireAdmin() inside every admin Server Action. This guard just
 * redirects non-admins away from the admin UI.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, getAccessToken } = usePrivy()
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (!ready) return

    if (!authenticated) {
      router.replace('/login')
      return
    }

    async function verify() {
      try {
        const token = await getAccessToken()
        if (!token) { router.replace('/login'); return }

        const { getSessionUser } = await import('@/lib/actions/auth')
        const user = await getSessionUser(token)

        if (!user || user.role !== 'ADMIN') {
          router.replace('/dashboard')
          return
        }

        setAuthorized(true)
      } catch {
        router.replace('/login')
      }
    }

    verify()
  }, [ready, authenticated, getAccessToken, router])

  if (!authorized) {
    return <div style={{ minHeight: '100vh', background: '#FFF9EF' }} />
  }

  return <>{children}</>
}
