'use client'
import { useState, useMemo } from 'react'
import { Country, State, City } from 'country-state-city'

interface AddressValue {
  address: string
  country: string
  country_code: string
  state: string
  state_code: string
  city: string
  postal_code: string
}

interface AddressInputProps {
  value: AddressValue
  onChange: (val: AddressValue) => void
}

const ALL_COUNTRIES = Country.getAllCountries().sort((a, b) => a.name.localeCompare(b.name))
const POPULAR_ISO = ['CO', 'US', 'MX', 'ES', 'AR', 'BR', 'PE', 'CL', 'VE', 'EC']

export function AddressInput({ value, onChange }: AddressInputProps) {
  const set = (patch: Partial<AddressValue>) => onChange({ ...value, ...patch })

  const states = useMemo(
    () => value.country_code ? State.getStatesOfCountry(value.country_code) : [],
    [value.country_code]
  )

  const cities = useMemo(
    () => value.country_code && value.state_code
      ? City.getCitiesOfState(value.country_code, value.state_code)
      : [],
    [value.country_code, value.state_code]
  )

  function handleCountry(isoCode: string) {
    const country = ALL_COUNTRIES.find((c) => c.isoCode === isoCode)
    set({ country: country?.name ?? '', country_code: isoCode, state: '', state_code: '', city: '' })
  }

  function handleState(isoCode: string) {
    const state = states.find((s) => s.isoCode === isoCode)
    set({ state: state?.name ?? '', state_code: isoCode, city: '' })
  }

  function handleCity(name: string) {
    set({ city: name })
  }

  const popularCountries = POPULAR_ISO.map((iso) => ALL_COUNTRIES.find((c) => c.isoCode === iso)).filter(Boolean)
  const otherCountries = ALL_COUNTRIES.filter((c) => !POPULAR_ISO.includes(c.isoCode))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Street address */}
      <div>
        <label style={labelStyle}>Street Address</label>
        <input
          type="text"
          value={value.address}
          onChange={(e) => set({ address: e.target.value })}
          placeholder="Calle 100 # 15-23"
          style={inputStyle}
        />
      </div>

      {/* Country */}
      <div>
        <label style={labelStyle}>Country</label>
        <select
          value={value.country_code}
          onChange={(e) => handleCountry(e.target.value)}
          style={inputStyle}
        >
          <option value="">Select country...</option>
          <optgroup label="Popular">
            {popularCountries.map((c) => (
              <option key={c!.isoCode} value={c!.isoCode}>{c!.flag} {c!.name}</option>
            ))}
          </optgroup>
          <optgroup label="All countries">
            {otherCountries.map((c) => (
              <option key={c.isoCode} value={c.isoCode}>{c.flag} {c.name}</option>
            ))}
          </optgroup>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Postal code */}
        <div>
          <label style={labelStyle}>Postal / ZIP Code</label>
          <input
            type="text"
            value={value.postal_code}
            onChange={(e) => set({ postal_code: e.target.value })}
            placeholder="e.g. 110111"
            style={inputStyle}
          />
        </div>
        {/* Spacer — keeps grid aligned */}
        <div />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* State */}
        <div>
          <label style={labelStyle}>State / Department</label>
          {states.length > 0 ? (
            <select
              value={value.state_code}
              onChange={(e) => handleState(e.target.value)}
              disabled={!value.country_code}
              style={{ ...inputStyle, color: !value.country_code ? 'rgba(186,214,235,0.3)' : 'white' }}
            >
              <option value="">Select state...</option>
              {states.map((s) => (
                <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={value.state}
              onChange={(e) => set({ state: e.target.value, state_code: '' })}
              placeholder="State / Province"
              style={inputStyle}
            />
          )}
        </div>

        {/* City */}
        <div>
          <label style={labelStyle}>City</label>
          {cities.length > 0 ? (
            <select
              value={value.city}
              onChange={(e) => handleCity(e.target.value)}
              disabled={!value.state_code}
              style={{ ...inputStyle, color: !value.state_code ? 'rgba(186,214,235,0.3)' : 'white' }}
            >
              <option value="">Select city...</option>
              {cities.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={value.city}
              onChange={(e) => set({ city: e.target.value })}
              placeholder="City"
              style={inputStyle}
            />
          )}
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(186,214,235,0.7)', marginBottom: 5 }
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 7, border: '1px solid rgba(186,214,235,0.2)',
  fontSize: 13, color: 'white', background: 'rgba(255,255,255,0.07)', outline: 'none', boxSizing: 'border-box',
}
