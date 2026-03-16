import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { PayOrderStepper, StatusTimeline } from '@/components/admin/PayOrderStepper'
import { PayOrderActions } from '@/components/admin/PayOrderActions'
import { adminGetOrderById } from '@/lib/actions/admin'

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cookieStore = await cookies()
  const privyToken = cookieStore.get('privy-token')?.value
  if (!privyToken) redirect('/login')

  let order: Awaited<ReturnType<typeof adminGetOrderById>>
  try {
    order = await adminGetOrderById(privyToken, id)
  } catch {
    redirect('/admin/pagar')
  }

  const shortId = `#${id.slice(0, 8).toUpperCase()}`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = Array.isArray((order as any).payment_profiles) ? (order as any).payment_profiles[0] : (order as any).payment_profiles
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userEmail = Array.isArray((order as any).users) ? (order as any).users[0]?.email : (order as any).users?.email
  const details = (profile?.details ?? {}) as Record<string, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const history = ((order.status_history ?? []) as any[])

  // Parse fiat info — may be stored as dedicated columns or packed in reference
  let displayReference = order.reference ?? null
  let displayFee = (order as any).processing_fee
  let displayFiatCurrency = (order as any).fiat_currency
  let displayFiatAmount = (order as any).fiat_amount
  let displayFiatRate = (order as any).fiat_rate

  if (order.reference?.includes('|')) {
    displayReference = null
    for (const part of order.reference.split('|').map((s: string) => s.trim())) {
      const feeMatch = part.match(/^Fee:\s*([\d.,]+)/)
      const fiatMatch = part.match(/^([A-Z]{3})\s*([\d.,]+)\s*@\s*([\d.]+)$/)
      if (feeMatch && !displayFee) displayFee = parseFloat(feeMatch[1].replace(',', ''))
      if (fiatMatch && !displayFiatCurrency) {
        displayFiatCurrency = fiatMatch[1]
        displayFiatAmount = parseFloat(fiatMatch[2].replace(',', ''))
        displayFiatRate = parseFloat(fiatMatch[3])
      }
    }
  }

  return (
    <div>
      <Topbar title={`Orden ${shortId}`} breadcrumb="Admin / Pedidos PAY" />
      <div style={{ padding: 24 }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: 20 }}>
          <Link href="/admin/pagar" style={{ fontSize: 13, color: '#334EAC', textDecoration: 'none' }}>
            ← Volver a Órdenes PAY
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>

          {/* ── LEFT column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Order header */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: '#081F5C', margin: 0 }}>{shortId}</h1>
                <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>PAY</span>
                <StatusBadge status={order.status} />
              </div>
              <div style={{ display: 'flex', gap: 24, marginTop: 10, flexWrap: 'wrap' }}>
                <Info label="Usuario" value={userEmail ?? '—'} />
                <Info label="Creado" value={new Date(order.created_at!).toLocaleString()} />
                {(order as any).due_date && <Info label="Vencimiento" value={new Date((order as any).due_date).toLocaleDateString()} />}
              </div>
            </div>

            {/* Financial breakdown */}
            <Section title="Desglose financiero">
              <Row label="Token">{order.currency}</Row>
              <Row label="Monto a proveedor">{Number(order.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {order.currency}</Row>
              {displayFee && <Row label="Comisión de procesamiento">{Number(displayFee).toLocaleString('en-US', { minimumFractionDigits: 2 })} {order.currency}</Row>}
              {displayFee && <Row label="Total a depositar" bold>{(Number(order.amount) + Number(displayFee)).toLocaleString('en-US', { minimumFractionDigits: 2 })} {order.currency}</Row>}
              {displayFiatCurrency && displayFiatAmount && (
                <>
                  <div style={{ borderTop: '1px solid #f0ede8', marginTop: 8, paddingTop: 8 }} />
                  <Row label="Equivalente fiat">{displayFiatCurrency} {Number(displayFiatAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</Row>
                  {displayFiatRate && <Row label="Tasa de cambio">1 {order.currency} = {Number(displayFiatRate).toLocaleString('en-US', { minimumFractionDigits: 4 })} {displayFiatCurrency}</Row>}
                </>
              )}
              {displayReference && <Row label="Referencia">{displayReference}</Row>}
              {(order as any).invoice_url && (
                <div style={{ borderTop: '1px solid #f0ede8', marginTop: 8, paddingTop: 8 }}>
                  <a href={(order as any).invoice_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#334EAC', fontWeight: 600, textDecoration: 'none' }}>
                    📄 Ver factura →
                  </a>
                </div>
              )}
              {(order as any).proof_url && (
                <div>
                  <a href={(order as any).proof_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#10b981', fontWeight: 600, textDecoration: 'none' }}>
                    ✓ Ver comprobante de pago →
                  </a>
                </div>
              )}
            </Section>

            {/* Entity info */}
            {order.entity && (
              <Section title="Información del proveedor / cliente">
                <Row label="Nombre interno">{(order.entity as any).internal_name}</Row>
                {(order.entity as any).legal_name && <Row label="Razón social">{(order.entity as any).legal_name}</Row>}
                {(order.entity as any).company_type && <Row label="Tipo de empresa">{(order.entity as any).company_type}</Row>}
                {(order.entity as any).registration_country && <Row label="País de registro">{(order.entity as any).registration_country}</Row>}
                {(order.entity as any).registration_number && <Row label="Nº de registro">{(order.entity as any).registration_number}</Row>}
                {(order.entity as any).contact_email && <Row label="Email">{(order.entity as any).contact_email}</Row>}
                {(order.entity as any).company_phone && <Row label="Teléfono">{(order.entity as any).company_phone}</Row>}
                {(order.entity as any).contact_name && (
                  <Row label="Persona de contacto">
                    {(order.entity as any).contact_name}{(order.entity as any).contact_phone ? ` · ${(order.entity as any).contact_phone}` : ''}
                  </Row>
                )}
              </Section>
            )}

            {/* Payment method */}
            {profile && (
              <Section title="Método de pago del proveedor">
                <div style={{ marginBottom: 8 }}>
                  <span style={{ background: '#f0f4ff', color: '#334EAC', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                    {profile.method}
                  </span>
                  {profile.label && <span style={{ fontSize: 13, color: '#374151', marginLeft: 8 }}>{profile.label}</span>}
                </div>
                {profile.method === 'BANK' && (
                  <>
                    {details.bank_name && <Row label="Banco">{details.bank_name}</Row>}
                    {details.account_name && <Row label="Titular">{details.account_name}</Row>}
                    {details.account_number && <Row label="Cuenta / IBAN">{details.account_number}</Row>}
                    {details.routing_number && <Row label="SWIFT / Routing">{details.routing_number}</Row>}
                    {details.branch_code && <Row label="Código de sucursal">{details.branch_code}</Row>}
                    {details.bank_code && <Row label="Código de banco">{details.bank_code}</Row>}
                    {details.currency && <Row label="Divisa">{details.currency}</Row>}
                    {details.country && <Row label="País">{details.country}</Row>}
                  </>
                )}
                {profile.method === 'CRYPTO' && (
                  <>
                    {details.network && <Row label="Red">{details.network}</Row>}
                    {details.token && <Row label="Token">{details.token}</Row>}
                    {details.address && <Row label="Dirección" mono>{details.address}</Row>}
                  </>
                )}
                {profile.method === 'WECHAT' && (
                  <>
                    {details.wechat_id && <Row label="WeChat ID">{details.wechat_id}</Row>}
                    {details.name && <Row label="Nombre">{details.name}</Row>}
                  </>
                )}
                {profile.method === 'PAYPAL' && (
                  <>
                    {details.email && <Row label="Email PayPal">{details.email}</Row>}
                  </>
                )}
              </Section>
            )}
          </div>

          {/* ── RIGHT sidebar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Status stepper */}
            <div style={card}>
              <h3 style={sectionTitle}>Estado del pedido</h3>
              <PayOrderStepper status={order.status} />
            </div>

            {/* Actions */}
            <div style={card}>
              <h3 style={sectionTitle}>Acciones</h3>
              <PayOrderActions orderId={id} status={order.status} privyToken={privyToken} />
            </div>

            {/* History */}
            <div style={card}>
              <h3 style={sectionTitle}>Historial de estados</h3>
              <StatusTimeline history={history} />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af' }}>{label}</div>
      <div style={{ fontSize: 13, color: '#081F5C', marginTop: 2 }}>{value}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={card}>
      <h3 style={{ ...sectionTitle, marginBottom: 14 }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  )
}

function Row({ label, value, bold, mono, children }: {
  label: string; value?: string; bold?: boolean; mono?: boolean; children?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#081F5C', fontWeight: bold ? 700 : 400, fontFamily: mono ? 'monospace' : 'inherit', textAlign: 'right', wordBreak: 'break-all' }}>
        {children ?? value}
      </span>
    </div>
  )
}

const card: React.CSSProperties = { background: 'white', borderRadius: 12, border: '1px solid #e8e4dc', padding: '18px 20px' }
const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: 0, marginBottom: 14 }
