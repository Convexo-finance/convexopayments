'use client'
import Link from 'next/link'

interface TopbarProps {
  title: string
  breadcrumb?: string
  cta?: { label: string; href?: string; onClick?: () => void }
}

export function Topbar({ title, breadcrumb, cta }: TopbarProps) {
  return (
    <header
      style={{
        padding: '14px 24px',
        borderBottom: '1px solid rgba(186,214,235,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'rgba(2,0,26,0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{title}</h1>
        {breadcrumb && <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.5)', marginTop: 1 }}>{breadcrumb}</p>}
      </div>

      {cta && (
        <div style={{ marginLeft: 'auto' }}>
          {cta.href ? (
            <Link
              href={cta.href}
              style={{
                background: 'linear-gradient(135deg, #334EAC, #401777)',
                color: 'white',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'none',
                letterSpacing: '0.3px',
              }}
            >
              {cta.label}
            </Link>
          ) : (
            <button
              onClick={cta.onClick}
              style={{
                background: 'linear-gradient(135deg, #334EAC, #401777)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.3px',
              }}
            >
              {cta.label}
            </button>
          )}
        </div>
      )}
    </header>
  )
}
