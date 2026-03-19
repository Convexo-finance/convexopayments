'use client'
import { useRef, useState } from 'react'

interface FileUploadProps {
  accept?: string
  onUpload: (file: File) => Promise<string>
  label?: string
  currentUrl?: string
}

export function FileUpload({
  accept = '.pdf',
  onUpload,
  label = 'Subir archivo',
  currentUrl,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  async function handleFile(file: File) {
    setLoading(true)
    setError(null)
    try {
      await onUpload(file)
      setFileName(file.name)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const borderColor = dragging
    ? 'rgba(51,78,172,0.8)'
    : 'rgba(186,214,235,0.18)'
  const bg = dragging ? 'rgba(51,78,172,0.08)' : 'rgba(255,255,255,0.03)'

  return (
    <div>
      <div
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files[0]
          if (file) handleFile(file)
        }}
        style={{
          border: `2px dashed ${borderColor}`,
          borderRadius: 10,
          padding: '18px 16px',
          textAlign: 'center',
          cursor: loading ? 'wait' : 'pointer',
          background: bg,
          transition: 'all 0.15s',
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ color: 'rgba(186,214,235,0.5)', fontSize: 14 }}>Subiendo...</span>
          </div>
        ) : fileName ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ color: '#10b981', fontSize: 16 }}>✓</span>
            <span style={{ color: '#10b981', fontSize: 13, fontWeight: 600 }}>{fileName}</span>
          </div>
        ) : currentUrl ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ color: 'rgba(186,214,235,0.6)', fontSize: 13 }}>
              Haz clic para reemplazar el archivo
            </span>
            <span style={{ color: 'rgba(186,214,235,0.3)', fontSize: 11 }}>PDF, JPG o PNG</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 22, opacity: 0.5 }}>↑</span>
            <span style={{ color: 'rgba(186,214,235,0.6)', fontSize: 13 }}>{label}</span>
            <span style={{ color: 'rgba(186,214,235,0.3)', fontSize: 11 }}>Arrastra o haz clic para explorar</span>
          </div>
        )}
      </div>
      {error && (
        <p style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{error}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </div>
  )
}
