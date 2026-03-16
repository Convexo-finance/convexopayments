'use client'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { UserContext } from '@/lib/context/user-context'

/**
 * Client-side guard for authenticated app routes.
 * Redirects unauthenticated users to /login.
 * Fetches the session user and exposes is_enabled via UserContext
 * so child components (e.g. Sidebar) can conditionally show/hide features.
 */
export function AppGuard({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, getAccessToken } = usePrivy()
  const router = useRouter()
  const [resolved, setResolved] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)

  useEffect(() => {
    if (!ready) return
    if (!authenticated) {
      router.replace('/login')
      return
    }

    async function loadUser() {
      const token = await getAccessToken()
      if (!token) { router.replace('/login'); return }
      const { getSessionUser } = await import('@/lib/actions/auth')
      const user = await getSessionUser(token)
      setIsEnabled(user?.is_enabled ?? false)
      setResolved(true)
    }

    loadUser()
  }, [ready, authenticated, getAccessToken, router])

  if (!ready || !authenticated || !resolved) {
    return <div style={{ minHeight: '100vh', background: '#FFF9EF' }} />
  }

  return (
    <UserContext.Provider value={{ isEnabled }}>
      {children}
    </UserContext.Provider>
  )
}
