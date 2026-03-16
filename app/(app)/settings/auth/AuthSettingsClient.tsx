'use client'
import { usePrivy, useLinkAccount } from '@privy-io/react-auth'

export function AuthSettingsClient() {
  const { user } = usePrivy()
  const { linkEmail, linkGoogle, linkPasskey } = useLinkAccount()

  const linked = user?.linkedAccounts ?? []
  const hasEmail = linked.some((a) => a.type === 'email')
  const hasGoogle = linked.some((a) => a.type === 'google_oauth')
  const hasPasskey = linked.some((a) => a.type === 'passkey')

  const emailAccount = linked.find((a) => a.type === 'email') as { type: 'email'; address: string } | undefined
  const googleAccount = linked.find((a) => a.type === 'google_oauth') as { type: 'google_oauth'; email?: string | null } | undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 13, color: 'rgba(186,214,235,0.7)', marginBottom: 8 }}>
        Add multiple sign-in methods so you can access your account from any device.
      </p>

      <AuthMethodCard
        icon="✉️"
        title="Email"
        description={hasEmail ? emailAccount?.address ?? 'Linked' : 'Sign in with a one-time code sent to your email'}
        linked={hasEmail}
        onLink={linkEmail}
      />

      <AuthMethodCard
        icon="G"
        title="Google"
        description={hasGoogle ? (googleAccount?.email ?? 'Linked') : 'Sign in with your Google account'}
        linked={hasGoogle}
        onLink={linkGoogle}
        iconStyle={{ background: 'linear-gradient(135deg, #ea4335, #fbbc04)', color: 'white', fontSize: 13, fontWeight: 800 }}
      />

      <AuthMethodCard
        icon="🔑"
        title="Passkey"
        description={hasPasskey ? 'Passkey linked — use Face ID, Touch ID, or a hardware key' : 'Use biometrics or a hardware security key'}
        linked={hasPasskey}
        onLink={linkPasskey}
      />
    </div>
  )
}

interface AuthMethodCardProps {
  icon: string
  title: string
  description: string
  linked: boolean
  onLink: () => void
  iconStyle?: React.CSSProperties
}

function AuthMethodCard({ icon, title, description, linked, onLink, iconStyle }: AuthMethodCardProps) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      borderRadius: 12,
      border: linked ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(186,214,235,0.1)',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: linked ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
        ...iconStyle,
      }}>
        {icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{title}</span>
          {linked && (
            <span style={{ fontSize: 10, fontWeight: 700, background: '#d1fae5', color: '#065f46', borderRadius: 20, padding: '2px 8px' }}>
              Linked
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {description}
        </div>
      </div>

      {!linked && (
        <button
          onClick={onLink}
          style={{
            flexShrink: 0,
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(135deg, #334EAC, #401777)',
            color: 'white',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Link
        </button>
      )}
    </div>
  )
}
