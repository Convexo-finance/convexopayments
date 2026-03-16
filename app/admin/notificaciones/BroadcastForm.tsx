'use client'
import { useState } from 'react'

export function BroadcastForm({ privyToken }: { privyToken: string }) {
  const [target, setTarget] = useState('ALL')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [sendInApp, setSendInApp] = useState(true)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { adminBroadcastNotification } = await import('@/lib/actions/admin')
      await adminBroadcastNotification(privyToken, {
        target,
        title,
        body,
        sendEmail,
        sendInApp,
      })
      setSuccess(true)
      setTitle('')
      setBody('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e8e4dc', padding: 24 }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#081F5C', marginBottom: 20 }}>
        Send Notification
      </h2>

      {success && (
        <div style={{ background: '#d1fae5', borderRadius: 8, padding: '12px 16px', color: '#065f46', fontSize: 14, marginBottom: 16 }}>
          ✓ Notification sent successfully.
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle}>Target</label>
          <select style={inputStyle} value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="ALL">All users</option>
            <option value="custom">Specific email</option>
          </select>
          {target === 'custom' && (
            <input
              style={{ ...inputStyle, marginTop: 8 }}
              type="email"
              placeholder="user@example.com"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          )}
        </div>

        <div>
          <label style={labelStyle}>Title</label>
          <input
            style={inputStyle}
            placeholder="Notification title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label style={labelStyle}>Body</label>
          <textarea
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
            placeholder="Notification body..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
        </div>

        <div style={{ display: 'flex', gap: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#555', cursor: 'pointer' }}>
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
            Send email
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#555', cursor: 'pointer' }}>
            <input type="checkbox" checked={sendInApp} onChange={(e) => setSendInApp(e.target.checked)} />
            Send in-app
          </label>
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}

        <button
          type="submit"
          disabled={loading || !title || !body}
          style={{
            background: 'linear-gradient(135deg, #334EAC, #401777)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '10px 20px',
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Sending...' : 'Send Notification'}
        </button>
      </form>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 7, border: '1px solid #e5e7eb', fontSize: 13, color: '#081F5C', background: 'white', outline: 'none' }
