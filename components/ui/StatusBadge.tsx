const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  // Payment orders
  DRAFT:       { bg: '#f3f4f6', color: '#6b7280' },
  OPENED:      { bg: '#dbeafe', color: '#1d4ed8' },
  ORDERED:     { bg: '#ede9fe', color: '#6d28d9' },
  EN_REVISION: { bg: '#fef3c7', color: '#92400e' },
  PROCESANDO:  { bg: '#e0e7ff', color: '#3730a3' },
  PAYED:       { bg: '#d1fae5', color: '#065f46' },
  RECHAZADO:   { bg: '#fee2e2', color: '#991b1b' },
  CANCELADO:   { bg: '#f3f4f6', color: '#9ca3af' },
  // OTC orders
  ACEPTADO:    { bg: '#e0f2fe', color: '#0369a1' },
  POR_PAGAR:   { bg: '#fef9c3', color: '#854d0e' },
  REVISION:    { bg: '#fef3c7', color: '#92400e' },
  LIQUIDADO:   { bg: '#d1fae5', color: '#065f46' },
  // General
  PENDIENTE:   { bg: '#ffedd5', color: '#9a3412' },
  APROBADO:    { bg: '#d1fae5', color: '#065f46' },
  ACTIVE:      { bg: '#d1fae5', color: '#065f46' },
  INACTIVE:    { bg: '#f3f4f6', color: '#6b7280' },
  // legacy
  ENVIADO:     { bg: '#dbeafe', color: '#1d4ed8' },
  PAGADO:      { bg: '#d1fae5', color: '#065f46' },
}

const STATUS_LABELS: Record<string, string> = {
  // Payment orders
  DRAFT:       'Draft',
  OPENED:      'Opened',
  ORDERED:     'Ordered',
  EN_REVISION: 'Under Review',
  PROCESANDO:  'Processing',
  PAYED:       'Payed',
  RECHAZADO:   'Rejected',
  CANCELADO:   'Cancelled',
  // OTC orders
  ACEPTADO:    'Aceptado',
  POR_PAGAR:   'Por Pagar',
  REVISION:    'En Revisión',
  LIQUIDADO:   'Liquidado',
  // General
  PENDIENTE:   'Pending',
  APROBADO:    'Approved',
  ACTIVE:      'Active',
  INACTIVE:    'Inactive',
  ENVIADO:     'Opened',
  PAGADO:      'Payed',
}

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status
  const style = STATUS_STYLES[status] ?? { bg: '#f3f4f6', color: '#6b7280' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.3px',
      background: style.bg, color: style.color,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}
