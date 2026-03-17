import Link from 'next/link'

export function ActivationBanner() {
  return (
    <div style={{
      background: 'rgba(245,158,11,0.12)',
      border: '1px solid rgba(245,158,11,0.25)',
      borderRadius: 10,
      padding: '14px 20px',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 18 }}>⚠</span>
      <span style={{ fontSize: 13, color: '#f59e0b', fontWeight: 600, flex: 1 }}>
        Activa tu cuenta completando la verificacion.
      </span>
      <Link
        href="/perfil#verificacion"
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'white',
          background: 'rgba(245,158,11,0.3)',
          border: '1px solid rgba(245,158,11,0.4)',
          borderRadius: 7,
          padding: '6px 14px',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        Completar verificacion →
      </Link>
    </div>
  )
}
