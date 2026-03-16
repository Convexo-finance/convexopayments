'use client'

interface PaginationProps {
  page: number
  total: number
  pageSize?: number
  onPage: (page: number) => void
}

export function Pagination({ page, total, pageSize = 20, onPage }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  if (totalPages <= 1) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', padding: '16px 0' }}>
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        style={{
          padding: '6px 12px',
          borderRadius: 6,
          border: '1px solid #e5e7eb',
          background: page <= 1 ? '#f9fafb' : 'white',
          color: page <= 1 ? '#ccc' : '#081F5C',
          cursor: page <= 1 ? 'not-allowed' : 'pointer',
          fontSize: 13,
        }}
      >
        ← Prev
      </button>
      <span style={{ fontSize: 13, color: '#888' }}>
        {page} / {totalPages}
      </span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        style={{
          padding: '6px 12px',
          borderRadius: 6,
          border: '1px solid #e5e7eb',
          background: page >= totalPages ? '#f9fafb' : 'white',
          color: page >= totalPages ? '#ccc' : '#081F5C',
          cursor: page >= totalPages ? 'not-allowed' : 'pointer',
          fontSize: 13,
        }}
      >
        Next →
      </button>
    </div>
  )
}
