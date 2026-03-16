'use client'
import { useState, useRef, useEffect } from 'react'
import { Country } from 'country-state-city'

interface PhoneInputProps {
  countryCode: string        // e.g. '+57'
  number: string             // e.g. '3186766035'
  onCountryChange: (code: string) => void
  onNumberChange: (num: string) => void
  placeholder?: string
}

const ALL_COUNTRIES = Country.getAllCountries()
  .map((c) => ({
    isoCode: c.isoCode,
    name: c.name,
    flag: c.flag,
    dialCode: '+' + c.phonecode.replace(/[^0-9]/g, ''),
  }))
  .filter((c) => c.dialCode !== '+')
  .sort((a, b) => a.name.localeCompare(b.name))

// Popular countries at top
const POPULAR = ['CO', 'US', 'MX', 'ES', 'AR', 'BR', 'PE', 'CL', 'VE', 'EC']
const sortedCountries = [
  ...POPULAR.map((iso) => ALL_COUNTRIES.find((c) => c.isoCode === iso)!).filter(Boolean),
  { isoCode: '---', name: '─────────────────', flag: '', dialCode: '' },
  ...ALL_COUNTRIES.filter((c) => !POPULAR.includes(c.isoCode)),
]

export function PhoneInput({ countryCode, number, onCountryChange, onNumberChange, placeholder }: PhoneInputProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selected = ALL_COUNTRIES.find((c) => c.dialCode === countryCode)

  const filtered = search
    ? sortedCountries.filter(
        (c) => c.isoCode !== '---' && (
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dialCode.includes(search)
        )
      )
    : sortedCountries

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div style={{ display: 'flex', gap: 8, position: 'relative' }} ref={ref}>
      {/* Country code selector */}
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setSearch('') }}
        style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
          padding: '9px 10px', borderRadius: 7, border: '1px solid rgba(186,214,235,0.2)',
          background: 'rgba(255,255,255,0.07)', cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.9)',
          minWidth: 90, whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 16 }}>{selected?.flag ?? '🌐'}</span>
        <span style={{ fontWeight: 600 }}>{countryCode || '+?'}</span>
        <span style={{ fontSize: 9, opacity: 0.4, marginLeft: 2 }}>▼</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, zIndex: 100,
          background: '#0d0520', border: '1px solid rgba(186,214,235,0.15)', borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)', width: 280, marginTop: 4,
        }}>
          <div style={{ padding: '10px 10px 6px' }}>
            <input
              autoFocus
              type="text"
              placeholder="Search country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '7px 10px', borderRadius: 6,
                border: '1px solid rgba(186,214,235,0.15)', fontSize: 12, outline: 'none', background: 'rgba(255,255,255,0.07)', color: 'white',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {filtered.map((c) =>
              c.isoCode === '---' ? (
                <div key="sep" style={{ height: 1, background: '#f0ece4', margin: '4px 10px' }} />
              ) : (
                <button
                  key={c.isoCode}
                  type="button"
                  onClick={() => { onCountryChange(c.dialCode); setOpen(false); setSearch('') }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', border: 'none',
                    cursor: 'pointer', textAlign: 'left', fontSize: 13,
                    color: c.dialCode === countryCode ? '#BAD6EB' : 'rgba(255,255,255,0.85)',
                    background: c.dialCode === countryCode ? 'rgba(186,214,235,0.1)' : 'transparent',
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{c.flag}</span>
                  <span style={{ flex: 1 }}>{c.name}</span>
                  <span style={{ color: 'rgba(186,214,235,0.4)', fontSize: 12 }}>{c.dialCode}</span>
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Number input */}
      <input
        type="tel"
        value={number}
        onChange={(e) => onNumberChange(e.target.value.replace(/[^0-9\s\-]/g, ''))}
        placeholder={placeholder ?? '300 000 0000'}
        style={{
          flex: 1, padding: '9px 12px', borderRadius: 7, border: '1px solid #e5e7eb',
          fontSize: 13, color: 'white', background: 'rgba(255,255,255,0.07)', outline: 'none',
        }}
      />
    </div>
  )
}
