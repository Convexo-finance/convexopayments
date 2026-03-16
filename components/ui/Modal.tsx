'use client'
import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: number
}

export function Modal({ open, onClose, title, children, width = 520 }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2,0,26,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(10,5,30,0.95)',
          borderRadius: 16,
          width: '100%',
          maxWidth: width,
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          border: '1px solid rgba(186,214,235,0.1)',
          color: 'white',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(186,214,235,0.08)',
            background: 'rgba(186,214,235,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: 'rgba(186,214,235,0.4)',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ padding: '24px' }}>{children}</div>
      </div>
    </div>
  )
}
