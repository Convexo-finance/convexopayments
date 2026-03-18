export type OrderEmailParams = {
  orderId: string
  orderType: 'PAY' | 'COLLECT'
  amount: number
  currency: string
  entityName: string | null
  reference?: string | null
  dueDate?: string | null
  proofUrl?: string | null
  rejectionReason?: string | null
  adminFee?: number | null
}

function shortId(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`
}

const ROW = (label: string, value: string) => `
  <tr>
    <td style="padding:10px 0;color:#666;width:42%;font-size:14px;border-bottom:1px solid #eee">${label}</td>
    <td style="padding:10px 0;font-size:14px;border-bottom:1px solid #eee">${value}</td>
  </tr>`

const HEADER = `
  <div style="background:linear-gradient(135deg,#02001A 0%,#081F5C 100%);padding:20px 28px;border-radius:8px 8px 0 0">
    <p style="color:#BAD6EB;margin:0;font-size:12px;letter-spacing:1px;text-transform:uppercase">Convexo Pay</p>
  </div>`

const FOOTER = `
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
  <p style="color:#aaa;font-size:12px;margin:0">
    Convexo · <a href="https://pay.convexo.xyz" style="color:#334EAC;text-decoration:none">pay.convexo.xyz</a>
  </p>`

function baseRows(p: OrderEmailParams) {
  const entityLabel = p.orderType === 'PAY' ? 'Proveedor' : 'Cliente'
  const typeLabel = p.orderType === 'PAY' ? 'Pago' : 'Cobro'
  return [
    ROW('ID de Orden', `<span style="font-family:monospace;font-weight:600;color:#081F5C">${shortId(p.orderId)}</span>`),
    ROW('Tipo', typeLabel),
    p.entityName ? ROW(entityLabel, p.entityName) : '',
    ROW('Monto', `<strong>${Number(p.amount).toLocaleString('es-CO')} ${p.currency}</strong>`),
    p.reference ? ROW('Referencia', p.reference) : '',
    p.dueDate ? ROW('Fecha límite', new Date(p.dueDate).toLocaleDateString('es-CO')) : '',
  ].join('')
}

function wrap(inner: string) {
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
      ${HEADER}
      <div style="background:#f9f9fb;padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        ${inner}
        ${FOOTER}
      </div>
    </div>`
}

/**
 * OPENED — user submits an order.
 */
export function buildOrderCreatedEmail(p: OrderEmailParams): string {
  const typeLabel = p.orderType === 'PAY' ? 'Pago' : 'Cobro'
  return wrap(`
    <h2 style="color:#081F5C;margin:0 0 6px">Orden de ${typeLabel} Recibida</h2>
    <p style="color:#555;margin:0 0 20px;font-size:14px">
      Tu orden fue enviada exitosamente. El equipo de Convexo la revisará y te notificará cuando sea aceptada.
    </p>
    <table style="width:100%;border-collapse:collapse">
      ${baseRows(p)}
      ${ROW('Fecha de envío', new Date().toLocaleDateString('es-CO'))}
    </table>
    <div style="margin-top:20px;padding:14px 16px;background:#EEF2FF;border-radius:6px;border-left:4px solid #334EAC">
      <p style="margin:0;color:#334EAC;font-size:13px;line-height:1.5">
        <strong>Próximo paso:</strong> Una vez aceptada recibirás instrucciones para completar tu pago.
      </p>
    </div>`)
}

/**
 * ACCEPTED — admin accepts the order, user must now complete payment.
 */
export function buildOrderAcceptedEmail(p: OrderEmailParams): string {
  const typeLabel = p.orderType === 'PAY' ? 'Pago' : 'Cobro'
  const feeRow = p.adminFee != null && p.adminFee > 0
    ? ROW('Fee Convexo', `${Number(p.adminFee).toLocaleString('es-CO')} ${p.currency}`)
    : ''
  return wrap(`
    <h2 style="color:#081F5C;margin:0 0 6px">¡Orden Aceptada!</h2>
    <p style="color:#555;margin:0 0 20px;font-size:14px">
      Tu orden de ${typeLabel.toLowerCase()} fue revisada y aceptada por Convexo.
      El siguiente paso es completar tu pago desde la plataforma.
    </p>
    <table style="width:100%;border-collapse:collapse">
      ${baseRows(p)}
      ${feeRow}
    </table>
    <div style="margin-top:20px;padding:14px 16px;background:#EEF2FF;border-radius:6px;border-left:4px solid #334EAC">
      <p style="margin:0;color:#334EAC;font-size:13px;line-height:1.5">
        <strong>Acción requerida:</strong> Ingresa a
        <a href="https://pay.convexo.xyz" style="color:#334EAC">pay.convexo.xyz</a>
        y sigue las instrucciones para completar el pago.
      </p>
    </div>`)
}

/**
 * PAYED — admin marks the order as paid. Includes proof-of-payment button.
 */
export function buildOrderPaidEmail(p: OrderEmailParams): string {
  const typeLabel = p.orderType === 'PAY' ? 'Pago' : 'Cobro'
  const paidLabel = p.orderType === 'PAY' ? 'Pagada' : 'Cobrada'
  const proofButton = p.proofUrl
    ? `<div style="margin-top:20px">
        <a href="${p.proofUrl}" style="display:inline-block;background:#334EAC;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
          Descargar comprobante →
        </a>
       </div>`
    : ''
  return wrap(`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <span style="display:inline-block;background:#10b981;color:white;border-radius:50%;width:28px;height:28px;line-height:28px;text-align:center;font-size:16px">✓</span>
      <h2 style="color:#081F5C;margin:0">Orden de ${typeLabel} ${paidLabel}</h2>
    </div>
    <p style="color:#555;margin:0 0 20px;font-size:14px">
      Tu orden ha sido procesada y completada exitosamente por el equipo de Convexo.
    </p>
    <table style="width:100%;border-collapse:collapse">
      ${baseRows(p)}
      ${ROW('Fecha de pago', new Date().toLocaleDateString('es-CO'))}
    </table>
    ${proofButton}
    <div style="margin-top:20px;padding:14px 16px;background:#f0fdf4;border-radius:6px;border-left:4px solid #10b981">
      <p style="margin:0;color:#065f46;font-size:13px;line-height:1.5">
        Puedes ver el detalle completo en <a href="https://pay.convexo.xyz" style="color:#065f46">pay.convexo.xyz</a>.
      </p>
    </div>`)
}

/**
 * RECHAZADO — admin rejects the order. Shows rejection reason prominently.
 */
export function buildOrderRejectedEmail(p: OrderEmailParams): string {
  const typeLabel = p.orderType === 'PAY' ? 'Pago' : 'Cobro'
  const reasonBlock = p.rejectionReason
    ? `<div style="margin-top:20px;padding:14px 16px;background:#fef2f2;border-radius:6px;border-left:4px solid #ef4444">
        <p style="margin:0 0 4px;color:#991b1b;font-size:13px;font-weight:600">Motivo del rechazo:</p>
        <p style="margin:0;color:#7f1d1d;font-size:13px;line-height:1.5">${p.rejectionReason}</p>
       </div>`
    : ''
  return wrap(`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <span style="display:inline-block;background:#ef4444;color:white;border-radius:50%;width:28px;height:28px;line-height:28px;text-align:center;font-size:18px;font-weight:bold">✕</span>
      <h2 style="color:#081F5C;margin:0">Orden Rechazada</h2>
    </div>
    <p style="color:#555;margin:0 0 20px;font-size:14px">
      Lamentamos informarte que tu orden de ${typeLabel.toLowerCase()} no pudo ser procesada.
    </p>
    <table style="width:100%;border-collapse:collapse">
      ${baseRows(p)}
    </table>
    ${reasonBlock}
    <div style="margin-top:16px;padding:14px 16px;background:#EEF2FF;border-radius:6px;border-left:4px solid #334EAC">
      <p style="margin:0;color:#334EAC;font-size:13px;line-height:1.5">
        Si tienes dudas contáctanos desde <a href="https://pay.convexo.xyz" style="color:#334EAC">pay.convexo.xyz</a>.
      </p>
    </div>`)
}

/**
 * CANCELADO — user cancels their own order.
 */
export function buildOrderCancelledEmail(p: OrderEmailParams): string {
  const typeLabel = p.orderType === 'PAY' ? 'Pago' : 'Cobro'
  return wrap(`
    <h2 style="color:#081F5C;margin:0 0 6px">Orden Cancelada</h2>
    <p style="color:#555;margin:0 0 20px;font-size:14px">
      Tu orden de ${typeLabel.toLowerCase()} ha sido cancelada exitosamente.
    </p>
    <table style="width:100%;border-collapse:collapse">
      ${baseRows(p)}
      ${ROW('Fecha de cancelación', new Date().toLocaleDateString('es-CO'))}
    </table>
    <div style="margin-top:20px;padding:14px 16px;background:#EEF2FF;border-radius:6px;border-left:4px solid #334EAC">
      <p style="margin:0;color:#334EAC;font-size:13px;line-height:1.5">
        Puedes crear una nueva orden en cualquier momento desde
        <a href="https://pay.convexo.xyz" style="color:#334EAC">pay.convexo.xyz</a>.
      </p>
    </div>`)
}
