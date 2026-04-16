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
        <button type="button" onClick={() => setShow(s => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sm"
          style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          tabIndex={-1}>
          {show ? '🙈' : '👁️'}
        </button>
      </div>
      {showStrength && value.length > 0 && (
        <div className="space-y-0.5">
          {PASSWORD_RULES.map(rule => (
            <div key={rule.label} className="flex items-center gap-1.5">
              <span style={{ color: rule.test(value) ? '#4ade80' : '#f87171', fontSize: '0.65rem' }}>
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
