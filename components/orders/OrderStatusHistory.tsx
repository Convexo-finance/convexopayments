import { StatusBadge } from '@/components/ui/StatusBadge'

interface HistoryEntry {
  status: string
  changed_at: string
  changed_by?: string
}

interface OrderStatusHistoryProps {
  history: HistoryEntry[]
}

export function OrderStatusHistory({ history }: OrderStatusHistoryProps) {
  if (!history || history.length === 0) {
    return <p style={{ color: 'rgba(186,214,235,0.4)', fontSize: 13 }}>No status history yet.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {history.map((entry, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            paddingBottom: i < history.length - 1 ? 16 : 0,
            position: 'relative',
          }}
        >
          {/* Timeline dot + line */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#BAD6EB',
                marginTop: 3,
                flexShrink: 0,
              }}
            />
            {i < history.length - 1 && (
              <div style={{ width: 1, flex: 1, background: 'rgba(186,214,235,0.15)', minHeight: 20 }} />
            )}
          </div>
          <div>
            <StatusBadge status={entry.status} />
            <p style={{ fontSize: 12, color: 'rgba(186,214,235,0.4)', marginTop: 4 }}>
              {new Date(entry.changed_at).toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
