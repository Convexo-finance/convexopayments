export type OtcEmailParams = {
  requestId: string
  type: 'CASH_IN' | 'CASH_OUT' | string
  amount: number
  currency: string
  copAmount?: number
  adminRate?: number
  spreadPct?: number
  proofUrl?: string | null
  rejectionReason?: string | null
}

function shortId(id: string) {
  return `#${id.slice(0, 8).toUpperCase()}`
}

function typeLabels(type: string) {
  const isBuy = type === 'CASH_IN'
  return {
    op: isBuy ? 'COMPRAR' : 'VENDER',
    verb: isBuy ? 'Compra' : 'Venta',
    verbPast: isBuy ? 'Comprada' : 'Vendida',
  }
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

function baseRows(p: OtcEmailParams) {
  const { verb } = typeLabels(p.type)
  return [
    ROW('ID', `<span style="font-family:monospace;font-weight:600;color:#081F5C">${shortId(p.requestId)}</span>`),
    ROW('Operación', `${verb} de ${p.currency}`),
    ROW('Monto', `<strong>${Number(p.amount).toLocaleString('es-CO')} ${p.currency}</strong>`),
  ].join('')
}

/**
 * ACEPTADO — OTC order accepted by Convexo.
 */
export function buildOtcAcceptedEmail(p: OtcEmailParams): string {
  const { op } = typeLabels(p.type)
  return wrap(`
    <h2 style="color:#081F5C;margin:0 0 6px">¡Orden OTC Aceptada!</h2>
    <p style="color:#555;margin:0 0 20px;font-size:14px">
      Tu orden de <strong>${op}</strong> fue revisada y aceptada por el equipo de Convexo.
    </p>
    <table style="width:100%;border-collapse:collapse">
      ${baseRows(p)}
      ${ROW('Fecha', new Date().toLocaleDateString('es-CO'))}
    </table>
    <div style="margin-top:20px;padding:14px 16px;background:#EEF2FF;border-radius:6px;border-left:4px solid #334EAC">
      <p style="margin:0;color:#334EAC;font-size:13px;line-height:1.5">
        <strong>Próximo paso:</strong> Convexo preparará las instrucciones de pago y te notificará cuando estén listas.
      </p>
    </div>`)
}

/**
 * POR_PAGAR — OTC order ready for user payment. Most actionable email.
 */
export function buildOtcReadyToPayEmail(p: OtcEmailParams): string {
  const { op } = typeLabels(p.type)
  const rateRows = [
    p.copAmount
      ? ROW('Equivalente COP', `<strong>$${Number(p.copAmount).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</strong>`)
      : '',
    p.adminRate
      ? ROW('Tasa aplicada', `${Number(p.adminRate).toLocaleString('es-CO', { maximumFractionDigits: 0 })} COP/USD`)
      : '',
    p.spreadPct != null
      ? ROW('Spread', `${(Number(p.spreadPct) * 100).toFixed(2)}%`)
      : '',
  ].join('')
  return wrap(`
    <h2 style="color:#081F5C;margin:0 0 6px">Lista para Pagar — Acción Requerida</h2>
    <p style="color:#555;margin:0 0 20px;font-size:14px">
      Tu orden <strong>${op}</strong> está lista. Completa tu pago para continuar.
    </p>
    <table style="width:100%;border-collapse:collapse">
      ${baseRows(p)}
      ${rateRows}
    </table>
    <div style="margin-top:20px;padding:14px 16px;background:#EEF2FF;border-radius:6px;border-left:4px solid #334EAC">
      <p style="margin:0;color:#334EAC;font-size:13px;line-height:1.5">
        <strong>Acción requerida:</strong> Ingresa a
        <a href="https://pay.convexo.xyz" style="color:#334EAC">pay.convexo.xyz</a>
        para ver las instrucciones de pago y subir tu comprobante.
      </p>
    </div>`)
}

/**
 * REVISION — user's payment is under review by Convexo.
 */
export function buildOtcInReviewEmail(p: OtcEmailParams): string {
  const { op } = typeLabels(p.type)
  return wrap(`
    <h2 style="color:#081F5C;margin:0 0 6px">Pago en Revisión</h2>
    <p style="color:#555;margin:0 0 20px;font-size:14px">
      Recibimos tu pago para la orden <strong>${op}</strong>. Nuestro equipo lo está verificando.
    </p>
    <table style="width:100%;border-collapse:collapse">
      ${baseRows(p)}
      ${ROW('Estado', '<span style="color:#f59e0b;font-weight:600">En revisión</span>')}
      ${ROW('Fecha', new Date().toLocaleDateString('es-CO'))}
    </table>
    <div style="margin-top:20px;padding:14px 16px;background:#EEF2FF;border-radius:6px;border-left:4px solid #334EAC">
      <p style="margin:0;color:#334EAC;font-size:13px;line-height:1.5">
        Te notificaremos cuando tu operación sea liquidada. El proceso normalmente toma menos de 24 horas hábiles.
      </p>
    </div>`)
}

/**
 * LIQUIDADO — OTC order fully settled. Final receipt.
 */
export function buildOtcReceiptEmail(p: OtcEmailParams): string {
  const { op } = typeLabels(p.type)
  const rateRows = [
    p.copAmount
      ? ROW('Equivalente COP', `<strong>$${Number(p.copAmount).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</strong>`)
      : '',
    p.adminRate
      ? ROW('Tasa aplicada', `${Number(p.adminRate).toLocaleString('es-CO', { maximumFractionDigits: 0 })} COP/USD`)
      : '',
    p.spreadPct != null
      ? ROW('Spread', `${(Number(p.spreadPct) * 100).toFixed(2)}%`)
      : '',
    ROW('Fecha', new Date().toLocaleDateString('es-CO')),
  ].join('')
  const proofButton = p.proofUrl
    ? `<div style="margin-top:20px">
        <a href="${p.proofUrl}" style="display:inline-block;background:#334EAC;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">
          Ver comprobante →
        </a>
       </div>`
    : ''
  return wrap(`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <span style="display:inline-block;background:#10b981;color:white;border-radius:50%;width:28px;height:28px;line-height:28px;text-align:center;font-size:16px">✓</span>
      <h2 style="color:#081F5C;margin:0">Orden OTC ${op} Liquidada</h2>
    </div>
    <p style="color:#555;margin:0 0 20px;font-size:14px">
      Tu operación ha sido completada y liquidada exitosamente.
    </p>
    <table style="width:100%;border-collapse:collapse">
      ${baseRows(p)}
      ${rateRows}
    </table>
    ${proofButton}
    <div style="margin-top:20px;padding:14px 16px;background:#f0fdf4;border-radius:6px;border-left:4px solid #10b981">
      <p style="margin:0;color:#065f46;font-size:13px;line-height:1.5">
        Puedes consultar el historial de tus operaciones en
        <a href="https://pay.convexo.xyz" style="color:#065f46">pay.convexo.xyz</a>.
      </p>
    </div>`)
}

/**
 * CANCELADO — OTC order cancelled.
 */
export function buildOtcCancelledEmail(p: OtcEmailParams): string {
  const { op } = typeLabels(p.type)
  return wrap(`
    <h2 style="color:#081F5C;margin:0 0 6px">Orden OTC Cancelada</h2>
    <p style="color:#555;margin:0 0 20px;font-size:14px">
      Tu orden de <strong>${op}</strong> ha sido cancelada.
    </p>
    <table style="width:100%;border-collapse:collapse">
      ${baseRows(p)}
      ${ROW('Fecha de cancelación', new Date().toLocaleDateString('es-CO'))}
    </table>
    <div style="margin-top:20px;padding:14px 16px;background:#EEF2FF;border-radius:6px;border-left:4px solid #334EAC">
      <p style="margin:0;color:#334EAC;font-size:13px;line-height:1.5">
        Puedes iniciar una nueva operación en cualquier momento desde
        <a href="https://pay.convexo.xyz" style="color:#334EAC">pay.convexo.xyz</a>.
      </p>
    </div>`)
}

/**
 * RECHAZADO (OTC) — order rejected with reason.
 */
export function buildOtcRejectedEmail(p: OtcEmailParams): string {
  const { op } = typeLabels(p.type)
  const reasonBlock = p.rejectionReason
    ? `<div style="margin-top:20px;padding:14px 16px;background:#fef2f2;border-radius:6px;border-left:4px solid #ef4444">
        <p style="margin:0 0 4px;color:#991b1b;font-size:13px;font-weight:600">Motivo del rechazo:</p>
        <p style="margin:0;color:#7f1d1d;font-size:13px;line-height:1.5">${p.rejectionReason}</p>
       </div>`
    : ''
  return wrap(`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
      <span style="display:inline-block;background:#ef4444;color:white;border-radius:50%;width:28px;height:28px;line-height:28px;text-align:center;font-size:18px;font-weight:bold">✕</span>
      <h2 style="color:#081F5C;margin:0">Orden OTC Rechazada</h2>
    </div>
    <p style="color:#555;margin:0 0 20px;font-size:14px">
      Lamentamos informarte que tu orden de <strong>${op}</strong> no pudo ser procesada.
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
