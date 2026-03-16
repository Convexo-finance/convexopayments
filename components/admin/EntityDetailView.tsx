import Link from 'next/link'
import { StatusBadge } from '@/components/ui/StatusBadge'

interface EntityDetailViewProps {
  entity: Record<string, unknown>
  profiles: Array<{
    id: string
    method: string
    label: string | null
    details: Record<string, string>
    is_default: boolean
  }>
  orders: Array<{
    id: string
    type: string
    amount: number
    currency: string
    status: string
    created_at: string
  }>
  entityType: 'supplier' | 'client'
}

export function EntityDetailView({ entity, profiles, orders, entityType }: EntityDetailViewProps) {
  const e = entity as Record<string, string | null>
  const orderBase = entityType === 'supplier' ? '/admin/pagar' : '/admin/cobrar'

  const totalVolume = orders
    .filter(o => ['PAYED', 'COMPLETADO', 'COLLECTED'].includes(o.status))
    .reduce((sum, o) => sum + Number(o.amount), 0)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>

      {/* ── LEFT column ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Company info */}
        <div style={card}>
          <h3 style={sectionTitle}>Información de la empresa</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Row label="Nombre interno">{e.internal_name ?? '—'}</Row>
            {e.legal_name && <Row label="Razón social">{e.legal_name}</Row>}
            {e.company_type && <Row label="Tipo de empresa">{e.company_type}</Row>}
            {e.registration_country && <Row label="País de registro">{e.registration_country}</Row>}
            {e.registration_number && <Row label="Nº de registro">{e.registration_number}</Row>}
          </div>
        </div>

        {/* Contact */}
        <div style={card}>
          <h3 style={sectionTitle}>Contacto</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {e.contact_email && <Row label="Email">{e.contact_email}</Row>}
            {e.company_phone && <Row label="Teléfono empresa">{e.company_phone}</Row>}
            {e.contact_name && <Row label="Persona de contacto">{e.contact_name}</Row>}
            {e.contact_phone && <Row label="Tel. contacto">{e.contact_phone}</Row>}
            {e.contact_person_email && <Row label="Email contacto">{e.contact_person_email}</Row>}
          </div>
        </div>

        {/* Address */}
        {(e.office_country || e.state || e.city || e.address) && (
          <div style={card}>
            <h3 style={sectionTitle}>Dirección</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {e.office_country && <Row label="País">{e.office_country}</Row>}
              {e.state && <Row label="Estado / Depto">{e.state}</Row>}
              {e.city && <Row label="Ciudad">{e.city}</Row>}
              {e.address && <Row label="Dirección">{e.address}</Row>}
              {e.postal_code && <Row label="Código postal">{e.postal_code}</Row>}
            </div>
          </div>
        )}

        {/* Payment methods */}
        <div style={card}>
          <h3 style={sectionTitle}>Métodos de pago ({profiles.length})</h3>
          {profiles.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af' }}>Sin métodos de pago registrados.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {profiles.map(p => {
                const d = p.details
                return (
                  <div key={p.id} style={{ background: '#f9fafb', borderRadius: 8, border: `1px solid ${p.is_default ? '#c7d7f0' : '#e5e7eb'}`, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>{p.method}</span>
                      {p.is_default && <span style={{ background: '#334EAC', color: 'white', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>DEFAULT</span>}
                      {p.label && <span style={{ fontSize: 13, fontWeight: 600, color: '#081F5C' }}>{p.label}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {p.method === 'BANK' && (
                        <span>{[d.bank_name, d.account_number, d.currency].filter(Boolean).join(' · ')}</span>
                      )}
                      {p.method === 'CRYPTO' && (
                        <span>{d.network} · {d.token} · <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{d.address?.slice(0, 20)}…</span></span>
                      )}
                      {p.method === 'WECHAT' && <span>WeChat: {d.wechat_id}</span>}
                      {p.method === 'PAYPAL' && <span>PayPal: {d.email}</span>}
                      {p.method === 'CASH' && <span>{[d.place_name, d.city, d.country].filter(Boolean).join(', ')}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT sidebar ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Stats */}
        <div style={card}>
          <h3 style={sectionTitle}>Estadísticas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Row label="Total órdenes">{String(orders.length)}</Row>
            <Row label="Volumen pagado" bold>{`${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC`}</Row>
          </div>
        </div>

        {/* Order history */}
        <div style={card}>
          <h3 style={sectionTitle}>Historial de órdenes</h3>
          {orders.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af' }}>Sin órdenes.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {orders.map(o => (
                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingBottom: 8, borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>#{o.id.slice(0, 8).toUpperCase()}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#081F5C' }}>
                      {Number(o.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {o.currency}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>
                      {new Date(o.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Link
                    href={`${orderBase}/${o.id}`}
                    style={{ fontSize: 12, color: '#334EAC', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}
                  >
                    Ver →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, children, bold }: { label: string; children: React.ReactNode; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#081F5C', fontWeight: bold ? 700 : 400, textAlign: 'right', wordBreak: 'break-all' }}>
        {children}
      </span>
    </div>
  )
}

const card: React.CSSProperties = { background: 'white', borderRadius: 12, border: '1px solid #e8e4dc', padding: '18px 20px' }
const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: 0, marginBottom: 14 }
