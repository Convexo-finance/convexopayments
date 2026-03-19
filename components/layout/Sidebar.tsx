'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { useAppUser } from '@/lib/context/user-context'
import { useIsMobile } from '@/lib/hooks/use-mobile'
import { useState } from 'react'

const USER_NAV = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard',       href: '/dashboard' },
      { label: 'Perfil',          href: '/perfil' },
      { label: 'Wallet',          href: '/cuenta' },
      { label: 'Métodos de Pago', href: '/metodos-pago' },
    ],
  },
  {
    group: 'Contacts',
    items: [
      { label: 'Proveedores', href: '/proveedores' },
      { label: 'Clientes',    href: '/clientes' },
    ],
  },
  {
    group: 'Operations',
    items: [
      { label: 'Cobrar',     href: '/cobrar' },
      { label: 'Pagar',      href: '/pagar' },
      { label: 'OTC Orders', href: '/otc' },
    ],
  },
  {
    group: 'Settings',
    items: [
      { label: 'Notificaciones',  href: '/notificaciones' },
      { label: 'Authentication',  href: '/settings/auth' },
      { label: 'Seguridad',       href: '/settings/security' },
    ],
  },
]

// Bottom nav tabs shown on mobile
const BOTTOM_NAV = [
  { label: 'Home',   href: '/dashboard', icon: HomeIcon },
  { label: 'Wallet', href: '/cuenta',    icon: WalletIcon },
  { label: 'Pagar',  href: '/pagar',     icon: PayIcon },
  { label: 'Cobrar', href: '/cobrar',    icon: CollectIcon },
  { label: 'OTC',    href: '/otc',       icon: OtcIcon },
]

interface NavItem { label: string; href: string }
interface NavSection { group: string; items: NavItem[] }

interface SidebarProps {
  isAdmin?: boolean
  nav?: NavSection[]
}

const ENABLED_ONLY_HREFS = new Set(['/pagar', '/cobrar', '/otc'])

export function Sidebar({ isAdmin = false, nav }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = usePrivy()
  const { isEnabled } = useAppUser()
  const isMobile = useIsMobile()
  const [menuOpen, setMenuOpen] = useState(false)

  const userEmail = user?.email?.address ?? ''
  const userInitials = userEmail ? userEmail.slice(0, 2).toUpperCase() : '?'

  const navSections = nav ?? USER_NAV

  async function handleLogout() {
    const { signOut } = await import('@/lib/actions/auth')
    await Promise.all([logout(), signOut()])
    router.push('/login')
    setMenuOpen(false)
  }

  // ── Mobile: bottom nav + slide-up menu ──
  if (isMobile) {
    return (
      <>
        {/* Full-screen overlay menu */}
        {menuOpen && (
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'linear-gradient(180deg, #02001A 0%, #2A0144 100%)',
              display: 'flex', flexDirection: 'column',
              paddingBottom: 'calc(64px + env(safe-area-inset-bottom))',
              overflow: 'auto',
            }}
          >
            {/* Menu header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
              <Image src="/logo.png" alt="Convexo" width={28} height={28} style={{ borderRadius: 6, objectFit: 'contain' }} />
              <span style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>Convexo Payments</span>
              <button
                onClick={() => setMenuOpen(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 22, cursor: 'pointer', padding: 4 }}
              >
                ✕
              </button>
            </div>

            {/* Nav sections */}
            <nav style={{ flex: 1, padding: '8px 12px' }}>
              {navSections.map((section) => (
                <div key={section.group} style={{ marginBottom: 8 }}>
                  <div style={{
                    fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.3)', padding: '10px 10px 4px',
                  }}>
                    {section.group}
                  </div>
                  {section.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    const isLocked = !isAdmin && !isEnabled && ENABLED_ONLY_HREFS.has(item.href)
                    if (isLocked) {
                      return (
                        <div key={item.href} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '12px 10px', borderRadius: 10,
                          color: 'rgba(255,255,255,0.25)', fontSize: 15, cursor: 'not-allowed',
                        }}>
                          {item.label}
                          <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.5 }}>🔒</span>
                        </div>
                      )
                    }
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '12px 10px', borderRadius: 10,
                          color: isActive ? '#BAD6EB' : 'rgba(255,255,255,0.7)',
                          fontSize: 15, textDecoration: 'none',
                          background: isActive ? 'rgba(186,214,235,0.12)' : 'transparent',
                          marginBottom: 2,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#BAD6EB' : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              ))}
            </nav>

            {/* Logout */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: '10px', borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.55)', fontSize: 13, cursor: 'pointer',
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        )}

        {/* Fixed bottom nav */}
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: 'rgba(2,0,26,0.95)',
          borderTop: '1px solid rgba(186,214,235,0.08)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {BOTTOM_NAV.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            const isLocked = !isAdmin && !isEnabled && ENABLED_ONLY_HREFS.has(href)
            if (isLocked) {
              return (
                <div key={href} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px 8px', opacity: 0.3 }}>
                  <Icon color="rgba(255,255,255,0.4)" />
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 4, letterSpacing: '0.2px' }}>{label}</span>
                </div>
              )
            }
            return (
              <Link
                key={href}
                href={href}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px 8px', textDecoration: 'none' }}
              >
                <Icon color={isActive ? '#BAD6EB' : 'rgba(255,255,255,0.4)'} />
                <span style={{ fontSize: 9, color: isActive ? '#BAD6EB' : 'rgba(255,255,255,0.4)', marginTop: 4, letterSpacing: '0.2px' }}>{label}</span>
              </Link>
            )
          })}
          {/* More / Menu button */}
          <button
            onClick={() => setMenuOpen(true)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px 8px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <MenuIcon color="rgba(255,255,255,0.4)" />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>More</span>
          </button>
        </nav>

        {/* Spacer so content doesn't hide behind the bottom nav */}
        <div style={{ display: 'none' }} />
      </>
    )
  }

  // ── Desktop: sidebar ──
  return (
    <aside
      style={{
        width: 230,
        background: 'linear-gradient(180deg, #02001A 0%, #2A0144 100%)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Image src="/logo.png" alt="Convexo Payments" width={36} height={36} style={{ borderRadius: 8, flexShrink: 0, objectFit: 'contain' }} />
        <div>
          <div style={{ color: 'white', fontSize: 14, fontWeight: 700, letterSpacing: '-0.3px' }}>Convexo Payments</div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{isAdmin ? 'Admin Panel' : 'convexo.xyz'}</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
        {navSections.map((section) => (
          <div key={section.group} style={{ padding: '12px 12px 4px' }}>
            <div style={{
              fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.3)', padding: '0 8px', marginBottom: 4,
            }}>
              {section.group}
            </div>
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              const isLocked = !isAdmin && !isEnabled && ENABLED_ONLY_HREFS.has(item.href)
              if (isLocked) {
                return (
                  <div key={item.href} title="Complete verification to unlock" style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8,
                    color: 'rgba(255,255,255,0.25)', fontSize: 13, marginBottom: 2, cursor: 'not-allowed', userSelect: 'none',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
                    {item.label}
                    <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.5 }}>🔒</span>
                  </div>
                )
              }
              return (
                <Link key={item.href} href={item.href} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8,
                  color: isActive ? '#BAD6EB' : 'rgba(255,255,255,0.65)',
                  fontSize: 13, textDecoration: 'none',
                  background: isActive ? 'rgba(186,214,235,0.15)' : 'transparent',
                  marginBottom: 2, transition: 'all 0.15s',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#BAD6EB' : 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
                  {item.label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '7px 10px',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, color: 'rgba(255,255,255,0.55)', fontSize: 12, cursor: 'pointer', textAlign: 'center',
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}

// ── Bottom nav icons ──
function HomeIcon({ color }: { color: string }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function WalletIcon({ color }: { color: string }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 12h.01"/><path d="M2 10h20"/></svg>
}
function PayIcon({ color }: { color: string }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
}
function CollectIcon({ color }: { color: string }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
}
function OtcIcon({ color }: { color: string }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
}
function MenuIcon({ color }: { color: string }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
}
