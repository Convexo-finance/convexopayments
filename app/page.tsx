'use client'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type Lang = 'en' | 'es'

const COPY = {
  en: {
    badge: 'B2B Financial Infrastructure',
    headline: 'International Payments\nBuilt for Business',
    sub: 'Convexo centralizes international payments, collections, and digital asset operations — giving your team full control with institutional-grade infrastructure.',
    cta: 'Sign in to your account',
    loading: 'Setting up your account…',
    error: 'Something went wrong. Please try again.',
    productsTitle: 'Everything your business needs',
    productsSub: 'A unified platform for cross-border financial operations.',
    products: [
      { title: 'International Payments', desc: 'Pay suppliers abroad in multiple currencies — fast, traceable, and without banking friction.' },
      { title: 'International Collections', desc: 'Receive payments from global clients with structured, trackable orders.' },
      { title: 'OTC Exchange', desc: 'Convert between fiat and digital assets at competitive institutional rates.' },
      { title: 'USDC Wallets', desc: 'Hold, send, and receive USDC from your own on-chain wallet — integrated into your account.' },
    ],
    tagline: 'Institutional-grade B2B payment infrastructure.',
    legal: [
      { label: 'Privacy Policy', href: '/legal/privacy' },
      { label: 'AML / CFT', href: '/legal/aml' },
      { label: 'Terms & Conditions', href: '/legal/terms' },
    ],
    copy: '© 2025 Convexo. All rights reserved.',
    trust: ['Powered by Privy', 'Blockchain-native', 'Institutional grade'],
  },
  es: {
    badge: 'Infraestructura Financiera B2B',
    headline: 'Pagos Internacionales\nPara Empresas',
    sub: 'Convexo centraliza pagos internacionales, cobros y operaciones con activos digitales — dando a tu equipo control total con infraestructura de nivel institucional.',
    cta: 'Iniciar sesión en tu cuenta',
    loading: 'Configurando tu cuenta…',
    error: 'Algo salió mal. Por favor intenta nuevamente.',
    productsTitle: 'Todo lo que tu empresa necesita',
    productsSub: 'Una plataforma unificada para operaciones financieras internacionales.',
    products: [
      { title: 'Pagos Internacionales', desc: 'Paga a tus proveedores en el exterior en múltiples monedas — rápido, trazable y sin fricción bancaria.' },
      { title: 'Cobros Internacionales', desc: 'Recibe pagos de tus clientes globales con órdenes estructuradas y rastreables.' },
      { title: 'OTC Exchange', desc: 'Convierte entre moneda fiat y activos digitales a tasas institucionales competitivas.' },
      { title: 'Billeteras USDC', desc: 'Mantén, envía y recibe USDC desde tu propia billetera on-chain — integrada en tu cuenta.' },
    ],
    tagline: 'Infraestructura de pagos B2B de nivel institucional.',
    legal: [
      { label: 'Política de Privacidad', href: '/legal/privacy' },
      { label: 'AML / SARLAFT', href: '/legal/aml' },
      { label: 'Términos y Condiciones', href: '/legal/terms' },
    ],
    copy: '© 2025 Convexo. Todos los derechos reservados.',
    trust: ['Powered by Privy', 'Blockchain-native', 'Nivel institucional'],
  },
}

const SOCIAL = [
  {
    name: 'X',
    href: 'https://x.com/convexoprotocol',
    icon: <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />,
  },
  {
    name: 'LinkedIn',
    href: 'https://www.linkedin.com/company/convexo-protocol/',
    icon: <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />,
  },
  {
    name: 'GitHub',
    href: 'https://github.com/Convexo-finance',
    icon: <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />,
  },
]

const PRODUCT_ICONS = [
  // Payments — outbound arrow through globe meridian
  <svg key="pay" viewBox="0 0 48 48" fill="none" aria-hidden="true" style={{ width: 38, height: 38 }}>
    <circle cx="24" cy="24" r="18" stroke="#334EAC" strokeWidth="1.5" strokeOpacity="0.5" />
    <ellipse cx="24" cy="24" rx="8" ry="18" stroke="#BAD6EB" strokeWidth="1" strokeOpacity="0.25" />
    <line x1="6" y1="24" x2="42" y2="24" stroke="#BAD6EB" strokeWidth="1" strokeOpacity="0.25" />
    <path d="M20 24h12M27 19l5 5-5 5" stroke="#BAD6EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
  // Collections — inbound arrow through globe meridian
  <svg key="col" viewBox="0 0 48 48" fill="none" aria-hidden="true" style={{ width: 38, height: 38 }}>
    <circle cx="24" cy="24" r="18" stroke="#334EAC" strokeWidth="1.5" strokeOpacity="0.5" />
    <ellipse cx="24" cy="24" rx="8" ry="18" stroke="#BAD6EB" strokeWidth="1" strokeOpacity="0.25" />
    <line x1="6" y1="24" x2="42" y2="24" stroke="#BAD6EB" strokeWidth="1" strokeOpacity="0.25" />
    <path d="M28 24H16M21 19l-5 5 5 5" stroke="#BAD6EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
  // OTC — two-way swap arrows
  <svg key="otc" viewBox="0 0 48 48" fill="none" aria-hidden="true" style={{ width: 38, height: 38 }}>
    <circle cx="24" cy="24" r="18" stroke="#334EAC" strokeWidth="1.5" strokeOpacity="0.5" />
    <path d="M16 20h16M28 16l4 4-4 4" stroke="#BAD6EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M32 28H16M20 24l-4 4 4 4" stroke="#BAD6EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>,
  // USDC / USDT / EURC — stacked token logos
  <div key="tokens" style={{ position: 'relative', width: 64, height: 38, display: 'flex', alignItems: 'center' }}>
    {['/tokens/usdc.png', '/tokens/usdt.png', '/tokens/eurc.png'].map((src, i) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img key={src} src={src} alt="" style={{
        width: 30, height: 30, borderRadius: '50%',
        position: 'absolute', left: i * 17,
        border: '2px solid rgba(2,0,26,0.9)',
        boxShadow: '0 0 0 1px rgba(186,214,235,0.12)',
      }} />
    ))}
  </div>,
]

export default function LandingPage() {
  const { ready, authenticated, getAccessToken } = usePrivy()
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [lang, setLang] = useState<Lang>('en')

  useEffect(() => {
    const match = document.cookie.match(/NEXT_LOCALE=([^;]+)/)
    if (match && (match[1] === 'es' || match[1] === 'en')) {
      setLang(match[1] as Lang)
    }
  }, [])

  function toggleLang() {
    const next: Lang = lang === 'en' ? 'es' : 'en'
    setLang(next)
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000`
  }

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

  const c = COPY[lang]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #02001A 0%, #110020 50%, #02001A 100%)',
      color: 'white',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif",
      overflowX: 'hidden',
    }}>

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px', height: 64,
        background: 'rgba(2,0,26,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(186,214,235,0.07)',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/convexopayments.png" alt="Convexo" style={{ height: 34, width: 'auto' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={toggleLang} style={{
            background: 'none',
            border: '1px solid rgba(186,214,235,0.18)',
            borderRadius: 6, padding: '5px 12px',
            color: 'rgba(186,214,235,0.6)', fontSize: 11,
            fontWeight: 700, cursor: 'pointer', letterSpacing: '0.8px',
          }}>
            {lang === 'en' ? 'ES' : 'EN'}
          </button>
          <NavSignIn ready={ready} label={c.cta} status={status} lang={lang} />
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '120px 40px 80px', position: 'relative', textAlign: 'center',
      }}>
        {/* Background glow */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
            width: 700, height: 700,
            background: 'radial-gradient(circle, rgba(51,78,172,0.14) 0%, transparent 65%)',
            borderRadius: '50%',
          }} />
          <div style={{
            position: 'absolute', top: '5%', right: '10%',
            width: 350, height: 350,
            background: 'radial-gradient(circle, rgba(64,23,119,0.25) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
          <div style={{
            position: 'absolute', bottom: '10%', left: '5%',
            width: 280, height: 280,
            background: 'radial-gradient(circle, rgba(8,31,92,0.2) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
        </div>

        <div style={{ position: 'relative', maxWidth: 680 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(51,78,172,0.12)',
            border: '1px solid rgba(51,78,172,0.3)',
            borderRadius: 100, padding: '6px 18px', marginBottom: 32,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#334EAC' }} />
            <span style={{ fontSize: 11, color: 'rgba(186,214,235,0.75)', letterSpacing: '1px', fontWeight: 600 }}>
              {c.badge}
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(38px, 6vw, 72px)',
            fontWeight: 700, lineHeight: 1.08,
            letterSpacing: '-1.5px', color: 'white',
            marginBottom: 24, whiteSpace: 'pre-line',
          }}>
            {c.headline}
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(15px, 2vw, 17px)',
            color: 'rgba(186,214,235,0.55)', lineHeight: 1.75,
            maxWidth: 560, margin: '0 auto 48px',
          }}>
            {c.sub}
          </p>

          {/* CTA */}
          {status === 'loading' ? (
            <p style={{ fontSize: 14, color: 'rgba(186,214,235,0.45)' }}>{c.loading}</p>
          ) : (
            <>
              {status === 'error' && (
                <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{c.error}</p>
              )}
              <HeroSignIn ready={ready} label={c.cta} />
            </>
          )}

          {/* Trust row */}
          <div style={{ display: 'flex', gap: 28, justifyContent: 'center', marginTop: 40, flexWrap: 'wrap' }}>
            {c.trust.map(b => (
              <span key={b} style={{ fontSize: 11, color: 'rgba(186,214,235,0.28)', letterSpacing: '0.5px' }}>
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Products ───────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 40px 100px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{
            fontSize: 'clamp(26px, 3.5vw, 40px)',
            fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 14,
          }}>
            {c.productsTitle}
          </h2>
          <p style={{ fontSize: 15, color: 'rgba(186,214,235,0.45)', maxWidth: 420, margin: '0 auto' }}>
            {c.productsSub}
          </p>
        </div>

        <div className="landing-products-grid">
          {c.products.map((item, i) => (
            <div key={item.title} style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(186,214,235,0.07)',
              borderRadius: 16, padding: '32px 26px',
            }}>
              <div style={{ marginBottom: 20 }}>{PRODUCT_ICONS[i]}</div>
              <h3 style={{
                fontSize: 14, fontWeight: 700,
                color: 'rgba(255,255,255,0.88)', marginBottom: 10, letterSpacing: '-0.2px',
              }}>
                {item.title}
              </h3>
              <p style={{ fontSize: 12.5, color: 'rgba(186,214,235,0.4)', lineHeight: 1.65 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(186,214,235,0.07)', padding: '52px 40px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="landing-footer-grid">
            {/* Brand */}
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/convexopayments.png" alt="Convexo" style={{ height: 30, width: 'auto', marginBottom: 14 }} />
              <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.3)', maxWidth: 240, lineHeight: 1.6 }}>
                {c.tagline}
              </p>
            </div>

            {/* Legal links */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {c.legal.map(link => (
                <a key={link.href} href={link.href} style={{
                  fontSize: 12, color: 'rgba(186,214,235,0.4)', textDecoration: 'none',
                }}>
                  {link.label}
                </a>
              ))}
            </div>

            {/* Social + copyright */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', gap: 10 }}>
                {SOCIAL.map(s => (
                  <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 34, height: 34,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(186,214,235,0.1)',
                    borderRadius: 8,
                    color: 'rgba(186,214,235,0.55)', textDecoration: 'none',
                  }}>
                    <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 13, height: 13 }}>
                      {s.icon}
                    </svg>
                  </a>
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'rgba(186,214,235,0.22)' }}>{c.copy}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

function NavSignIn({ ready, label, status, lang }: { ready: boolean; label: string; status: string; lang: Lang }) {
  const { login } = usePrivy()
  if (status === 'loading') return null
  return (
    <button
      onClick={login}
      disabled={!ready}
      style={{
        padding: '9px 20px',
        background: '#334EAC', color: 'white',
        border: 'none', borderRadius: 8,
        fontSize: 13, fontWeight: 600,
        cursor: ready ? 'pointer' : 'not-allowed',
        opacity: ready ? 1 : 0.5,
      }}
    >
      {ready ? (lang === 'en' ? 'Sign in' : 'Iniciar sesión') : '…'}
    </button>
  )
}

function HeroSignIn({ ready, label }: { ready: boolean; label: string }) {
  const { login } = usePrivy()
  return (
    <button
      onClick={login}
      disabled={!ready}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '16px 40px',
        background: 'linear-gradient(135deg, #334EAC 0%, #081F5C 100%)',
        color: 'white',
        border: '1px solid rgba(186,214,235,0.12)',
        borderRadius: 12, fontSize: 15, fontWeight: 600,
        cursor: ready ? 'pointer' : 'not-allowed',
        opacity: ready ? 1 : 0.5,
        boxShadow: '0 0 48px rgba(51,78,172,0.2)',
      }}
    >
      {ready ? label : '…'}
    </button>
  )
}
