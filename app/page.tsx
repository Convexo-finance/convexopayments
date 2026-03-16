'use client'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const SERVICES = [
  { icon: '🏢', title: 'Clients & Providers', desc: 'One place for your clients and suppliers.' },
  { icon: '🌐', title: 'Collections & Payments', desc: 'International collections and payments.' },
  { icon: '💱', title: 'Cash In & Cash Out', desc: 'Move value in and out of your digital assets.' },
]

export default function LoginPage() {
  const { ready, authenticated, getAccessToken } = usePrivy()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    if (!ready || !authenticated) return
    async function bootstrap() {
      setStatus('loading')
      try {
        const token = await getAccessToken()
        if (!token) throw new Error('No token')
        const { ensureUser } = await import('@/lib/actions/auth')
        const user = await ensureUser(token)
        router.push(user.role === 'ADMIN' ? '/admin' : '/dashboard')
      } catch {
        setStatus('error')
      }
    }
    bootstrap()
  }, [ready, authenticated, getAccessToken, router])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #02001A 0%, #2A0144 55%, #081F5C 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>

        {/* Logo + name */}
        <div style={{ marginBottom: 36 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/convexopayments.png" alt="Convexo" style={{ height: 100, width: 'auto', marginBottom: 12 }} />
          <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.35)', letterSpacing: '0.5px', margin: 0 }}>
            pay.convexo.xyz
          </p>
        </div>

        {/* Services grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 36 }}>
          {SERVICES.map((s) => (
            <div key={s.title} style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(186,214,235,0.1)',
              borderRadius: 12,
              padding: '16px 12px',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>{s.icon}</span>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>{s.title}</p>
              <p style={{ fontSize: 10, color: 'rgba(186,214,235,0.4)', lineHeight: 1.4 }}>{s.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        {status === 'loading' ? (
          <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.5)' }}>Setting up your account…</p>
        ) : (
          <>
            {status === 'error' && (
              <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>
                Something went wrong. Please try again.
              </p>
            )}
            <LoginButton ready={ready} />
          </>
        )}

        <p style={{ marginTop: 16, fontSize: 11, color: 'rgba(186,214,235,0.25)' }}>
          Secure · Powered by Privy
        </p>
      </div>
    </div>
  )
}

function LoginButton({ ready }: { ready: boolean }) {
  const { login } = usePrivy()
  return (
    <button
      onClick={login}
      disabled={!ready}
      style={{
        width: '100%',
        padding: '13px 24px',
        background: 'rgba(255,255,255,0.08)',
        color: 'white',
        border: '1px solid rgba(186,214,235,0.2)',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        cursor: ready ? 'pointer' : 'not-allowed',
        opacity: ready ? 1 : 0.5,
      }}
    >
      {ready ? 'Sign in' : 'Loading…'}
    </button>
  )
}
