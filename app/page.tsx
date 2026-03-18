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
    cta: 'Get started',
    loading: 'Setting up your account…',
    error: 'Something went wrong. Please try again.',
    features: [
      {
        tag: 'OTC Exchange',
        title: 'Buy & sell crypto at institutional rates',
        desc: 'Convert between fiat and digital assets with a guided order flow. Fixed spreads, live USD/COP rates, and full traceability from order creation to settlement.',
        bullets: ['USDC · USDT · EURC', 'Live rate + spread preview', 'Admin-verified settlements'],
      },
      {
        tag: 'Payments',
        title: 'Pay suppliers anywhere in the world',
        desc: 'Create supplier records and submit payment orders in multiple currencies. Convexo handles routing and sends proof of payment directly to you.',
        bullets: ['Bank transfer & crypto', 'Multi-currency support', 'Proof of payment per order'],
      },
      {
        tag: 'Collections',
        title: 'Collect from global clients effortlessly',
        desc: 'Issue structured collection orders to your clients with trackable status updates. Every collection has a full audit trail.',
        bullets: ['Trackable order status', 'Client-linked invoicing', 'Automated notifications'],
      },
      {
        tag: 'Digital Wallets',
        title: 'Your on-chain wallet, integrated',
        desc: 'Every account includes an embedded Ethereum and Solana wallet. Deposit, withdraw, or use your USDC balance directly inside Convexo.',
        bullets: ['Ethereum + Solana', 'USDC · USDT · EURC balances', 'Export key anytime'],
      },
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
    cta: 'Comenzar',
    loading: 'Configurando tu cuenta…',
    error: 'Algo salió mal. Por favor intenta nuevamente.',
    features: [
      {
        tag: 'OTC Exchange',
        title: 'Compra y vende cripto a tasas institucionales',
        desc: 'Convierte entre fiat y activos digitales con un flujo de orden guiado. Spreads fijos, tasas USD/COP en vivo y trazabilidad completa desde la creación hasta la liquidación.',
        bullets: ['USDC · USDT · EURC', 'Tasa en vivo + vista previa del spread', 'Liquidaciones verificadas por admin'],
      },
      {
        tag: 'Pagos',
        title: 'Paga a proveedores en cualquier parte del mundo',
        desc: 'Crea registros de proveedores y envía órdenes de pago en múltiples monedas. Convexo gestiona el enrutamiento y te envía el comprobante directamente.',
        bullets: ['Transferencia bancaria y cripto', 'Soporte multimoneda', 'Comprobante de pago por orden'],
      },
      {
        tag: 'Cobros',
        title: 'Cobra a tus clientes globales sin fricciones',
        desc: 'Emite órdenes de cobro estructuradas a tus clientes con actualizaciones de estado rastreables. Cada cobro tiene un historial de auditoría completo.',
        bullets: ['Estado de orden rastreable', 'Facturación vinculada al cliente', 'Notificaciones automáticas'],
      },
      {
        tag: 'Billeteras Digitales',
        title: 'Tu wallet on-chain, integrada',
        desc: 'Cada cuenta incluye una wallet embebida de Ethereum y Solana. Deposita, retira o usa tu saldo USDC directamente dentro de Convexo.',
        bullets: ['Ethereum + Solana', 'Saldos USDC · USDT · EURC', 'Exporta tu clave cuando quieras'],
      },
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

// Feature visual placeholders — replace src with real screenshots when available
const FEATURE_VISUALS = [
  // OTC
  <FeatureVisual key="otc" gradient="linear-gradient(135deg, #02001A 0%, #2A0144 60%, #081F5C 100%)" accent="#334EAC">
    <OtcMockup />
  </FeatureVisual>,
  // Payments
  <FeatureVisual key="pay" gradient="linear-gradient(135deg, #02001A 0%, #081F5C 60%, #0d2060 100%)" accent="#BAD6EB">
    <PaymentMockup />
  </FeatureVisual>,
  // Collections
  <FeatureVisual key="col" gradient="linear-gradient(135deg, #02001A 0%, #401777 60%, #2A0144 100%)" accent="#a78bfa">
    <CollectionMockup />
  </FeatureVisual>,
  // Wallets
  <FeatureVisual key="wal" gradient="linear-gradient(135deg, #081F5C 0%, #02001A 60%, #0f2040 100%)" accent="#10b981">
    <WalletMockup />
  </FeatureVisual>,
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
      minHeight: '100dvh',
      background: 'linear-gradient(160deg, #02001A 0%, #110020 50%, #02001A 100%)',
      color: 'white',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif",
      overflowX: 'hidden',
    }}>

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px, 5vw, 48px)', height: 60,
        background: 'rgba(2,0,26,0.9)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(186,214,235,0.07)',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/convexopaymentshorizontal.png" alt="Convexo Payments" style={{ height: 28, width: 'auto' }} />
        <button onClick={toggleLang} style={{
          background: 'none',
          border: '1px solid rgba(186,214,235,0.18)',
          borderRadius: 6, padding: '5px 12px',
          color: 'rgba(186,214,235,0.6)', fontSize: 11,
          fontWeight: 700, cursor: 'pointer', letterSpacing: '0.8px',
        }}>
          {lang === 'en' ? 'ES' : 'EN'}
        </button>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100dvh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(90px, 12vw, 130px) clamp(20px, 5vw, 48px) clamp(40px, 6vw, 60px)',
        position: 'relative', textAlign: 'center',
      }}>
        {/* Background glows */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
            width: 'min(700px, 90vw)', height: 'min(700px, 90vw)',
            background: 'radial-gradient(circle, rgba(51,78,172,0.14) 0%, transparent 65%)',
            borderRadius: '50%',
          }} />
          <div style={{
            position: 'absolute', top: '5%', right: '10%',
            width: 350, height: 350,
            background: 'radial-gradient(circle, rgba(64,23,119,0.25) 0%, transparent 70%)',
            borderRadius: '50%',
          }} />
        </div>

        <div style={{ position: 'relative', maxWidth: 680, width: '100%' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(51,78,172,0.12)',
            border: '1px solid rgba(51,78,172,0.3)',
            borderRadius: 100, padding: '6px 18px', marginBottom: 28,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#334EAC' }} />
            <span style={{ fontSize: 11, color: 'rgba(186,214,235,0.75)', letterSpacing: '1px', fontWeight: 600 }}>
              {c.badge}
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 'clamp(36px, 7vw, 72px)',
            fontWeight: 700, lineHeight: 1.08,
            letterSpacing: '-1.5px', color: 'white',
            marginBottom: 20, whiteSpace: 'pre-line',
          }}>
            {c.headline}
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(14px, 2vw, 17px)',
            color: 'rgba(186,214,235,0.55)', lineHeight: 1.75,
            maxWidth: 520, margin: '0 auto 40px',
          }}>
            {c.sub}
          </p>

          {/* Single CTA */}
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
          <div style={{ display: 'flex', gap: 'clamp(16px, 4vw, 28px)', justifyContent: 'center', marginTop: 36, flexWrap: 'wrap' }}>
            {c.trust.map(b => (
              <span key={b} style={{ fontSize: 11, color: 'rgba(186,214,235,0.28)', letterSpacing: '0.5px' }}>
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section style={{ padding: 'clamp(40px, 8vw, 80px) clamp(20px, 5vw, 48px) clamp(60px, 10vw, 100px)', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(60px, 10vw, 100px)' }}>
          {c.features.map((feature, i) => (
            <div key={feature.tag} className={`landing-feature-row${i % 2 === 1 ? ' reverse' : ''}`}
              style={{ direction: i % 2 === 1 ? 'rtl' : 'ltr' }}>
              {/* Visual */}
              <div style={{ direction: 'ltr' }}>
                {FEATURE_VISUALS[i]}
              </div>

              {/* Content */}
              <div style={{ direction: 'ltr', display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(51,78,172,0.12)', border: '1px solid rgba(51,78,172,0.25)',
                  borderRadius: 100, padding: '4px 14px', alignSelf: 'flex-start',
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#BAD6EB', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                    {feature.tag}
                  </span>
                </div>

                <h2 style={{
                  fontSize: 'clamp(22px, 3vw, 32px)',
                  fontWeight: 700, lineHeight: 1.2,
                  letterSpacing: '-0.5px', color: 'white',
                }}>
                  {feature.title}
                </h2>

                <p style={{
                  fontSize: 'clamp(14px, 1.5vw, 16px)',
                  color: 'rgba(186,214,235,0.55)', lineHeight: 1.75,
                }}>
                  {feature.desc}
                </p>

                <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, listStyle: 'none', padding: 0 }}>
                  {feature.bullets.map((b) => (
                    <li key={b} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(51,78,172,0.2)', border: '1px solid rgba(51,78,172,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                          <polyline points="2 6 5 9 10 3" stroke="#BAD6EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span style={{ fontSize: 13, color: 'rgba(186,214,235,0.7)', fontWeight: 500 }}>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(186,214,235,0.07)', padding: 'clamp(36px, 6vw, 52px) clamp(20px, 5vw, 48px) clamp(24px, 4vw, 40px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="landing-footer-grid">
            {/* Brand */}
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/convexopaymentshorizontal.png" alt="Convexo" style={{ height: 26, width: 'auto', marginBottom: 14 }} />
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
                    width: 36, height: 36,
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

// ── Feature visual panel (placeholder for product screenshots) ────────────────

function FeatureVisual({ gradient, accent, children }: { gradient: string; accent: string; children: React.ReactNode }) {
  void accent
  return (
    <div style={{
      borderRadius: 20,
      overflow: 'hidden',
      background: gradient,
      border: '1px solid rgba(186,214,235,0.08)',
      aspectRatio: '4/3',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    }}>
      {/* Grid pattern overlay */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'linear-gradient(rgba(186,214,235,1) 1px, transparent 1px), linear-gradient(90deg, rgba(186,214,235,1) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      {/* Glow */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at 50% 80%, ${accent}22 0%, transparent 60%)`,
      }} />
      <div style={{ position: 'relative', width: '80%', maxWidth: 360 }}>
        {children}
      </div>
    </div>
  )
}

// ── Inline mockup UI cards ─────────────────────────────────────────────────────

function MockCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(186,214,235,0.1)',
      borderRadius: 12, padding: '14px 16px',
      ...style,
    }}>
      {children}
    </div>
  )
}

function MockRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
      <span style={{ fontSize: 11, color: 'rgba(186,214,235,0.45)' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: accent ?? 'rgba(255,255,255,0.85)', fontFamily: 'monospace' }}>{value}</span>
    </div>
  )
}

function OtcMockup() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <MockCard>
        <div style={{ fontSize: 9, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'rgba(186,214,235,0.4)', marginBottom: 8 }}>Tasa USD / COP</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'white', letterSpacing: '-1px' }}>4,320 COP</div>
        <div style={{ fontSize: 10, color: 'rgba(186,214,235,0.35)', marginTop: 2 }}>Spread 1.0% aplicado</div>
      </MockCard>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <MockCard style={{ textAlign: 'center', padding: '12px 10px' }}>
          <div style={{ fontSize: 10, color: 'rgba(186,214,235,0.4)', marginBottom: 4 }}>COMPRAR</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#BAD6EB' }}>USDC</div>
        </MockCard>
        <MockCard style={{ textAlign: 'center', padding: '12px 10px' }}>
          <div style={{ fontSize: 10, color: 'rgba(186,214,235,0.4)', marginBottom: 4 }}>VENDER</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>USDC</div>
        </MockCard>
      </div>
      <MockCard>
        <MockRow label="Monto" value="500 USDC" />
        <MockRow label="Recibes (COP)" value="$2,160,000" accent="#BAD6EB" />
        <MockRow label="Estado" value="LIQUIDADO" accent="#10b981" />
      </MockCard>
    </div>
  )
}

function PaymentMockup() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <MockCard>
        <div style={{ fontSize: 9, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'rgba(186,214,235,0.4)', marginBottom: 10 }}>Nueva orden de pago</div>
        <MockRow label="Proveedor" value="Proveedor S.A." />
        <MockRow label="Monto" value="USD 12,400" />
        <MockRow label="Método" value="Wire Transfer" />
        <MockRow label="Estado" value="PROCESANDO" accent="#f59e0b" />
      </MockCard>
      <MockCard style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
        <div style={{ fontSize: 10, color: '#10b981', fontWeight: 700 }}>✓ Comprobante enviado</div>
        <div style={{ fontSize: 10, color: 'rgba(186,214,235,0.4)', marginTop: 2 }}>Orden #A4F3B2 · hace 2h</div>
      </MockCard>
    </div>
  )
}

function CollectionMockup() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <MockCard>
        <div style={{ fontSize: 9, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'rgba(186,214,235,0.4)', marginBottom: 10 }}>Órdenes de cobro</div>
        {[
          { client: 'Cliente Corp.', amount: 'USD 8,000', status: 'PAGADO', color: '#10b981' },
          { client: 'Global Inc.',   amount: 'USD 3,200', status: 'PENDIENTE', color: '#f59e0b' },
          { client: 'Nexus SAS',     amount: 'USD 5,500', status: 'ENVIADO', color: '#BAD6EB' },
        ].map((row) => (
          <div key={row.client} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(186,214,235,0.07)' }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{row.client}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(186,214,235,0.6)', fontFamily: 'monospace' }}>{row.amount}</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: row.color, background: row.color + '18', padding: '2px 7px', borderRadius: 99 }}>{row.status}</span>
          </div>
        ))}
      </MockCard>
    </div>
  )
}

function WalletMockup() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <MockCard style={{ background: 'linear-gradient(145deg, #02001A 0%, #2A0144 60%, #081F5C 100%)', border: '1px solid rgba(186,214,235,0.12)' }}>
        <div style={{ fontSize: 9, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'rgba(186,214,235,0.4)', marginBottom: 4 }}>Balance USDC</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'white', letterSpacing: '-1px' }}>2,840.50</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          {['/tokens/usdc.png', '/tokens/usdt.png', '/tokens/eurc.png'].map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid rgba(186,214,235,0.2)' }} />
          ))}
        </div>
      </MockCard>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <MockCard style={{ textAlign: 'center', padding: '12px 8px' }}>
          <div style={{ fontSize: 18, marginBottom: 4 }}>↓</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>Deposit</div>
          <div style={{ fontSize: 9, color: 'rgba(186,214,235,0.4)' }}>Ethereum · Solana</div>
        </MockCard>
        <MockCard style={{ textAlign: 'center', padding: '12px 8px' }}>
          <div style={{ fontSize: 18, marginBottom: 4 }}>↑</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>Withdraw</div>
          <div style={{ fontSize: 9, color: 'rgba(186,214,235,0.4)' }}>On-chain</div>
        </MockCard>
      </div>
    </div>
  )
}

// ── CTA button ─────────────────────────────────────────────────────────────────

function HeroSignIn({ ready, label }: { ready: boolean; label: string }) {
  const { login } = usePrivy()
  return (
    <button
      onClick={login}
      disabled={!ready}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: 'clamp(14px, 2vw, 18px) clamp(32px, 5vw, 52px)',
        background: 'linear-gradient(135deg, #334EAC 0%, #081F5C 100%)',
        color: 'white',
        border: '1px solid rgba(186,214,235,0.15)',
        borderRadius: 14, fontSize: 'clamp(14px, 2vw, 16px)', fontWeight: 600,
        cursor: ready ? 'pointer' : 'not-allowed',
        opacity: ready ? 1 : 0.5,
        boxShadow: '0 0 48px rgba(51,78,172,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
        letterSpacing: '-0.2px',
      }}
    >
      {ready ? label : '…'}
      {ready && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      )}
    </button>
  )
}
