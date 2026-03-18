'use client'
import { useState, useEffect } from 'react'

type Lang = 'en' | 'es'

export type Section = { id: string; title: string; paragraphs: string[] }
export type LegalContent = { title: string; subtitle: string; sections: Section[] }

interface Props {
  en: LegalContent
  es: LegalContent
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

const FOOTER_LINKS = {
  en: [
    { label: 'Privacy Policy', href: '/legal/privacy' },
    { label: 'AML / CFT', href: '/legal/aml' },
    { label: 'Terms & Conditions', href: '/legal/terms' },
  ],
  es: [
    { label: 'Política de Privacidad', href: '/legal/privacy' },
    { label: 'AML / SARLAFT', href: '/legal/aml' },
    { label: 'Términos y Condiciones', href: '/legal/terms' },
  ],
}

export function LegalShell({ en, es }: Props) {
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

  const content = lang === 'en' ? en : es
  const footerLinks = FOOTER_LINKS[lang]

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #02001A 0%, #110020 50%, #02001A 100%)',
      color: 'white',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif",
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
        <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/convexopayments.png" alt="Convexo" style={{ height: 34, width: 'auto' }} />
        </a>
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
          <a href="/" style={{
            padding: '9px 20px',
            background: '#334EAC', color: 'white',
            borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}>
            {lang === 'en' ? 'Sign in' : 'Iniciar sesión'}
          </a>
        </div>
      </nav>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="legal-layout">

        {/* Sidebar TOC */}
        <aside className="legal-sidebar" style={{ position: 'sticky', top: 88 }}>
          <p style={{
            fontSize: 10, fontWeight: 700,
            color: 'rgba(186,214,235,0.35)',
            letterSpacing: '1.2px', textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            {lang === 'en' ? 'Contents' : 'Contenido'}
          </p>
          <nav>
            {content.sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} style={{
                display: 'block', fontSize: 12,
                color: 'rgba(186,214,235,0.4)',
                textDecoration: 'none',
                padding: '7px 0',
                borderBottom: '1px solid rgba(186,214,235,0.05)',
                lineHeight: 1.4,
              }}>
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main style={{ paddingBottom: 40 }}>
          {/* Header */}
          <div style={{ marginBottom: 56 }}>
            <p style={{
              fontSize: 11, color: 'rgba(186,214,235,0.4)',
              letterSpacing: '1px', fontWeight: 600,
              textTransform: 'uppercase', marginBottom: 12,
            }}>
              {content.subtitle}
            </p>
            <h1 style={{
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 16,
            }}>
              {content.title}
            </h1>
            <div style={{
              display: 'flex', gap: 24, flexWrap: 'wrap',
              paddingBottom: 28,
              borderBottom: '1px solid rgba(186,214,235,0.08)',
            }}>
              <span style={{ fontSize: 12, color: 'rgba(186,214,235,0.3)' }}>
                {lang === 'en' ? 'Last updated: March 2025' : 'Última actualización: Marzo 2025'}
              </span>
              <span style={{ fontSize: 12, color: 'rgba(186,214,235,0.3)' }}>
                {lang === 'en' ? 'Convexo SAS' : 'Convexo SAS'}
              </span>
            </div>
          </div>

          {/* Sections */}
          {content.sections.map((s) => (
            <section key={s.id} id={s.id} style={{ marginBottom: 52, scrollMarginTop: 88 }}>
              <h2 style={{
                fontSize: 17, fontWeight: 700,
                color: 'rgba(255,255,255,0.88)',
                marginBottom: 18,
                paddingBottom: 12,
                borderBottom: '1px solid rgba(186,214,235,0.06)',
              }}>
                {s.title}
              </h2>
              {s.paragraphs.map((p, i) => (
                <p key={i} style={{
                  fontSize: 14, color: 'rgba(186,214,235,0.5)',
                  lineHeight: 1.85, marginBottom: 12,
                }}>
                  {p}
                </p>
              ))}
            </section>
          ))}
        </main>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(186,214,235,0.07)', padding: '36px 40px' }}>
        <div style={{
          maxWidth: 960, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 20,
        }}>
          <p style={{ fontSize: 11, color: 'rgba(186,214,235,0.22)' }}>
            © 2025 Convexo. {lang === 'en' ? 'All rights reserved.' : 'Todos los derechos reservados.'}
          </p>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            {footerLinks.map(l => (
              <a key={l.href} href={l.href} style={{
                fontSize: 11, color: 'rgba(186,214,235,0.35)', textDecoration: 'none',
              }}>
                {l.label}
              </a>
            ))}
            <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
              {SOCIAL.map(s => (
                <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 30, height: 30,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(186,214,235,0.1)',
                  borderRadius: 6,
                  color: 'rgba(186,214,235,0.45)', textDecoration: 'none',
                }}>
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 12, height: 12 }}>
                    {s.icon}
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
