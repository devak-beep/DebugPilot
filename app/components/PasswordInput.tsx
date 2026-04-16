'use client'
import { useState } from 'react'
import { PASSWORD_RULES } from '@/lib/password'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  showStrength?: boolean
  required?: boolean
  className?: string
  style?: React.CSSProperties
}

const EyeOpen = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
)

const EyeOff = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

export default function PasswordInput({ value, onChange, placeholder = 'Password', showStrength, required, className, style }: Props) {
  const [show, setShow] = useState(false)

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={className}
          style={{ ...style, paddingRight: '2.5rem' }}
        />
        {value && (
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center"
            style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
            tabIndex={-1}>
            {show ? <EyeOff /> : <EyeOpen />}
          </button>
        )}
      </div>
      {showStrength && value.length > 0 && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-0.5">
          {PASSWORD_RULES.map(rule => (
            <div key={rule.label} className="flex items-center gap-1">
              <span style={{ color: rule.test(value) ? '#4ade80' : '#f87171', fontSize: '0.6rem' }}>
                {rule.test(value) ? '✓' : '✗'}
              </span>
              <span style={{ color: rule.test(value) ? '#4ade80' : 'var(--text-muted)', fontSize: '0.65rem' }}>
                {rule.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
