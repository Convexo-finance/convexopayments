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
  if (!privyToken) redirect('/')

  let order: Awaited<ReturnType<typeof adminGetOrderById>>
  try {
    order = await adminGetOrderById(privyToken, id)
  } catch {
    redirect('/admin/pagar')
  }

  const shortId = `#${id.slice(0, 8).toUpperCase()}`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = order as any
  const profile = Array.isArray(o.payment_profiles) ? o.payment_profiles[0] : o.payment_profiles
  const userEmail = Array.isArray(o.users) ? o.users[0]?.email : o.users?.email
  const details = (profile?.details ?? {}) as Record<string, string>
  const convexoAcct = Array.isArray(o.convexo_accounts) ? o.convexo_accounts[0] : o.convexo_accounts
  // Admin-overridden convexo account (from admin_convexo_account_id join)
  const adminConvexoAcct = Array.isArray(o.admin_convexo_account) ? o.admin_convexo_account[0] : o.admin_convexo_account
  // Effective convexo account for receiving user payment
  const effectiveConvexoAcct = adminConvexoAcct ?? convexoAcct
  const effectiveConvexoAcctDetails = (effectiveConvexoAcct?.details ?? {}) as Record<string, string>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const history = ((order.status_history ?? []) as any[])

  // Parse fiat info — may be stored as dedicated columns or packed in reference
  let displayReference = order.reference ?? null
  let displayFee = o.processing_fee
  let displayFiatCurrency = o.fiat_currency
  let displayFiatAmount = o.fiat_amount
  let displayFiatRate = o.fiat_rate

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

  // Admin override values (shown with indicator if different from user's)
  const adminFee = o.admin_fee
  const adminRate = o.admin_rate
  const adminFiatAmount = o.admin_fiat_amount
  const hasAdminFeeOverride = adminFee != null && adminFee !== displayFee
  const hasAdminRateOverride = adminRate != null && adminRate !== displayFiatRate
  const hasAdminFiatOverride = adminFiatAmount != null && adminFiatAmount !== displayFiatAmount
  // Effective values (use admin override if set)
  const effectiveFee = adminFee ?? displayFee
  const effectiveRate = adminRate ?? displayFiatRate
  const effectiveFiatAmount = adminFiatAmount ?? displayFiatAmount

  return (
    <div>
      <Topbar title={`Orden ${shortId}`} breadcrumb="Admin / Pedidos PAY" />
      <div style={{ padding: 24 }} className="admin-page-pad">
        {/* Breadcrumb */}
        <div style={{ marginBottom: 20 }}>
          <Link href="/admin/pagar" style={{ fontSize: 13, color: '#BAD6EB', textDecoration: 'none' }}>
            ← Volver a Órdenes PAY
          </Link>
        </div>

        <div className="two-col-layout">

          {/* ── LEFT column ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Order header */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,0.9)', margin: 0 }}>{shortId}</h1>
                <span style={{ background: 'rgba(51,78,172,0.2)', color: '#BAD6EB', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>PAY</span>
                <StatusBadge status={order.status} />
              </div>
              <div style={{ display: 'flex', gap: 24, marginTop: 10, flexWrap: 'wrap' }}>
                <Info label="Usuario" value={userEmail ?? '—'} />
                <Info label="Creado" value={new Date(order.created_at!).toLocaleString()} />
                {(order as any).due_date && <Info label="Vencimiento" value={new Date((order as any).due_date).toLocaleDateString()} />}
              </div>
            </div>

            {/* 1 — Proveedor */}
            <Section title="Proveedor">
              {order.entity ? (
                <>
                  <Row label="Nombre">{(order.entity as any).internal_name}</Row>
                  {(order.entity as any).legal_name && <Row label="Razón social">{(order.entity as any).legal_name}</Row>}
                  {(order.entity as any).registration_country && <Row label="País">{(order.entity as any).registration_country}</Row>}
                  {(order.entity as any).contact_email && <Row label="Email">{(order.entity as any).contact_email}</Row>}
                  {(order.entity as any).company_phone && <Row label="Teléfono">{(order.entity as any).company_phone}</Row>}
                  {(order.entity as any).contact_name && (
                    <Row label="Contacto">
                      {(order.entity as any).contact_name}{(order.entity as any).contact_phone ? ` · ${(order.entity as any).contact_phone}` : ''}
                    </Row>
                  )}
                </>
              ) : (
                <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)' }}>Sin información de proveedor.</p>
              )}
              {profile && (
                <>
                  <div style={{ borderTop: '1px solid rgba(186,214,235,0.08)', marginTop: 8, paddingTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(186,214,235,0.4)' }}>Método de cobro</span>
                      <span style={{ background: 'rgba(51,78,172,0.2)', color: '#BAD6EB', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>
                        {profile.method}
                      </span>
                      {profile.label && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{profile.label}</span>}
                    </div>
                    {profile.method === 'BANK' && (
                      <>
                        {details.bank_name && <Row label="Banco">{details.bank_name}</Row>}
                        {details.account_name && <Row label="Titular">{details.account_name}</Row>}
                        {details.account_number && <Row label="Cuenta / IBAN" mono>{details.account_number}</Row>}
                        {details.routing_number && <Row label="SWIFT / Routing" mono>{details.routing_number}</Row>}
                        {details.branch_code && <Row label="Código sucursal">{details.branch_code}</Row>}
                        {details.bank_code && <Row label="Código banco">{details.bank_code}</Row>}
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
                    {profile.method === 'WECHAT' && details.wechat_id && <Row label="WeChat ID">{details.wechat_id}</Row>}
                    {profile.method === 'PAYPAL' && details.email && <Row label="Email PayPal">{details.email}</Row>}
                  </div>
                </>
              )}
            </Section>

            {/* 2 — Detalles de la orden */}
            <Section title="Detalles de la orden">
              <Row label="Token">{order.currency}</Row>
              <Row label="Monto a proveedor">{Number(order.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {order.currency}</Row>
              {effectiveFee != null && (
                <Row label={hasAdminFeeOverride ? 'Comisión ✦ admin' : 'Comisión'}>
                  <span style={hasAdminFeeOverride ? overrideStyle : undefined}>
                    {Number(effectiveFee).toLocaleString('en-US', { minimumFractionDigits: 2 })} {order.currency}
                  </span>
                </Row>
              )}
              {effectiveFee != null && (
                <Row label="Total a depositar" bold>
                  {(Number(order.amount) + Number(effectiveFee)).toLocaleString('en-US', { minimumFractionDigits: 2 })} {order.currency}
                </Row>
              )}
              {displayFiatCurrency && (
                <>
                  <div style={{ borderTop: '1px solid rgba(186,214,235,0.08)', marginTop: 4, paddingTop: 4 }} />
                  {effectiveRate && (
                    <Row label={hasAdminRateOverride ? 'Tasa ✦ admin' : 'Tasa de cambio'}>
                      <span style={hasAdminRateOverride ? overrideStyle : undefined}>
                        1 USD = {Number(effectiveRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {displayFiatCurrency}
                      </span>
                    </Row>
                  )}
                  {effectiveFiatAmount != null && (
                    <Row label={hasAdminFiatOverride ? `${displayFiatCurrency} recibe ✦ admin` : `${displayFiatCurrency} a recibir`}>
                      <span style={{ ...( hasAdminFiatOverride ? overrideStyle : {}), fontSize: 15, fontWeight: 700 }}>
                        {Number(effectiveFiatAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {displayFiatCurrency}
                      </span>
                    </Row>
                  )}
                </>
              )}
              {displayReference && <Row label="Referencia / PO">{displayReference}</Row>}
              {o.notes && <Row label="Notas admin"><span style={{ color: '#f59e0b' }}>{o.notes}</span></Row>}
              {o.invoice_url && (
                <div style={{ borderTop: '1px solid rgba(186,214,235,0.08)', marginTop: 8, paddingTop: 10 }}>
                  <a href={o.invoice_url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#BAD6EB', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    📄 Ver factura →
                  </a>
                </div>
              )}
            </Section>

            {/* 3 — Pago a Convexo */}
            <Section title="Pago a Convexo">
              {effectiveConvexoAcct ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ background: 'rgba(51,78,172,0.2)', color: '#BAD6EB', padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>
                      {effectiveConvexoAcct.method}
                    </span>
                    {effectiveConvexoAcct.label && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{effectiveConvexoAcct.label}</span>}
                    {adminConvexoAcct && <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>✦ ADMIN</span>}
                  </div>
                  {effectiveConvexoAcct.method === 'CRYPTO' && effectiveConvexoAcctDetails.network && <Row label="Red">{effectiveConvexoAcctDetails.network}</Row>}
                  {effectiveConvexoAcct.method === 'CRYPTO' && effectiveConvexoAcctDetails.address && <Row label="Dirección" mono>{effectiveConvexoAcctDetails.address}</Row>}
                  {effectiveConvexoAcct.method === 'BANK' && effectiveConvexoAcctDetails.bank_name && <Row label="Banco">{effectiveConvexoAcctDetails.bank_name}</Row>}
                  {effectiveConvexoAcct.method === 'BANK' && effectiveConvexoAcctDetails.account_number && <Row label="Cuenta / IBAN" mono>{effectiveConvexoAcctDetails.account_number}</Row>}
                  {effectiveConvexoAcct.method === 'CASH' && effectiveConvexoAcctDetails.place_name && <Row label="Ubicación">{effectiveConvexoAcctDetails.place_name}</Row>}
                </>
              ) : (
                <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)' }}>Sin cuenta asignada aún.</p>
              )}
              {(order.txn_hash || o.user_proof_url) && (
                <div style={{ borderTop: '1px solid rgba(186,214,235,0.08)', marginTop: 8, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(186,214,235,0.4)' }}>Comprobante del usuario</span>
                  {order.txn_hash && <Row label="TxID" mono>{order.txn_hash}</Row>}
                  {o.user_proof_url && (
                    <a href={o.user_proof_url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 12, color: '#BAD6EB', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      📎 Ver comprobante del usuario →
                    </a>
                  )}
                </div>
              )}
              {!order.txn_hash && !o.user_proof_url && (
                <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.3)', marginTop: 4 }}>Pendiente — el usuario aún no ha confirmado su pago.</p>
              )}
            </Section>

            {/* 4 — Pago al Proveedor */}
            <Section title="Pago al Proveedor">
              {o.proof_url ? (
                <a href={o.proof_url} target="_blank" rel="noopener noreferrer" download
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#10b981', fontWeight: 600, textDecoration: 'none', width: 'fit-content' }}>
                  ↓ Descargar comprobante de pago al proveedor
                </a>
              ) : (
                <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.3)' }}>Pendiente — aún no se ha cargado el comprobante.</p>
              )}
            </Section>

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
              <PayOrderActions
                orderId={id}
                status={order.status}
                privyToken={privyToken}
                orderAmount={Number(order.amount)}
                defaultFee={displayFee}
                defaultRate={displayFiatRate}
                defaultFiatAmount={displayFiatAmount}
                defaultConvexoAccountId={o.convexo_account_id ?? null}
                currency={order.currency}
                fiatCurrency={displayFiatCurrency ?? null}
              />
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
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(186,214,235,0.4)' }}>{label}</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 }}>{value}</div>
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
      <span style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: bold ? 700 : 400, fontFamily: mono ? 'monospace' : 'inherit', textAlign: 'right', wordBreak: 'break-all' }}>
        {children ?? value}
      </span>
    </div>
  )
}

const card: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', borderRadius: 12, border: '1px solid rgba(186,214,235,0.1)', padding: '18px 20px' }
const sectionTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(186,214,235,0.4)', margin: 0, marginBottom: 14 }
const overrideStyle: React.CSSProperties = { color: '#f59e0b', fontWeight: 700 }
