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
  label = 'Upload PDF',
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
          border: `2px dashed ${dragging ? '#334EAC' : '#d1d5db'}`,
          borderRadius: 10,
          padding: '24px 16px',
          textAlign: 'center',
          cursor: loading ? 'wait' : 'pointer',
          background: dragging ? '#f0f4ff' : '#fafafa',
          transition: 'all 0.15s',
        }}
      >
        {loading ? (
          <p style={{ color: '#888', fontSize: 14 }}>Uploading...</p>
        ) : fileName ? (
          <p style={{ color: '#334EAC', fontSize: 14, fontWeight: 600 }}>
            ✓ {fileName}
          </p>
        ) : currentUrl ? (
          <p style={{ color: '#334EAC', fontSize: 14 }}>
            File uploaded —{' '}
            <a href={currentUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>
              view
            </a>
            . Click to replace.
          </p>
        ) : (
          <>
            <p style={{ color: '#888', fontSize: 14 }}>{label}</p>
            <p style={{ color: '#bbb', fontSize: 12, marginTop: 4 }}>
              Drag & drop or click to browse
            </p>
          </>
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
