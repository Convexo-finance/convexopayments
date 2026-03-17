'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useWallets, useExportWallet } from '@privy-io/react-auth'

export function SecurityClient() {
  const [exporting, setExporting] = useState(false)
  const { wallets } = useWallets()
  const embeddedWallet = wallets.find((w) => w.walletClientType === 'privy')
  const { exportWallet } = useExportWallet()

  async function handleExport() {
    if (!embeddedWallet?.address) return
    setExporting(true)
    try {
      await exportWallet({ address: embeddedWallet.address })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.7)', marginBottom: 8 }}>
        Gestiona la seguridad de tu cuenta y el acceso a tu wallet.
      </p>

      {/* Export Key card */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        border: '1px solid rgba(186,214,235,0.1)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: 'rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <KeyIcon />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
            Exportar clave privada
          </div>
          <div style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)', marginTop: 2 }}>
            Descarga o copia la clave privada de tu wallet embebida para hacer una copia de seguridad.
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting || !embeddedWallet}
          style={{
            flexShrink: 0,
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(135deg, #334EAC, #401777)',
            color: 'white',
            fontSize: 12,
            fontWeight: 600,
            cursor: exporting || !embeddedWallet ? 'not-allowed' : 'pointer',
            opacity: exporting || !embeddedWallet ? 0.5 : 1,
          }}
        >
          {exporting ? 'Abriendo…' : 'Exportar'}
        </button>
      </div>

      {!embeddedWallet && (
        <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)', paddingLeft: 4 }}>
          Tu wallet se está inicializando. Recarga la página si tarda más de unos segundos.
        </p>
      )}

      {/* Auth methods link */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        border: '1px solid rgba(186,214,235,0.1)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: 'rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>
          🔐
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
            Métodos de autenticación
          </div>
          <div style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)', marginTop: 2 }}>
            Email, Google, Passkey — gestiona cómo accedes a tu cuenta.
          </div>
        </div>

        <Link
          href="/settings/auth"
          style={{
            flexShrink: 0,
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid rgba(186,214,235,0.2)',
            background: 'rgba(255,255,255,0.07)',
            color: 'rgba(186,214,235,0.8)',
            fontSize: 12,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Gestionar
        </Link>
      </div>
    </div>
  )
}

function KeyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(186,214,235,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5"/>
      <line x1="21" y1="2" x2="13" y2="10"/>
      <line x1="18" y1="5" x2="21" y2="8"/>
    </svg>
  )
}
