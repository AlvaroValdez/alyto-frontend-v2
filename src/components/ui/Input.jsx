import { useState } from 'react'

export default function Input({
  type        = 'text',
  placeholder = '',
  prefix,
  suffix,
  label,
  error,
  value,
  onChange,
  name,
  autoComplete,
  inputMode,
  disabled = false,
  className = '',
}) {
  const [focused, setFocused] = useState(false)

  const borderColor = error
    ? 'var(--color-error)'
    : focused
      ? 'var(--color-accent-teal)'
      : 'var(--color-border)'

  const boxShadow = error
    ? '0 0 0 2px rgba(239,68,68,0.12)'
    : focused
      ? '0 0 0 2px var(--color-accent-teal-dim)'
      : 'none'

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="label-uppercase" style={{ display: 'block' }}>
          {label}
        </label>
      )}

      <div
        style={{
          display:      'flex',
          alignItems:   'center',
          background:   'var(--color-bg-secondary)',
          border:       `1px solid ${borderColor}`,
          borderRadius: 'var(--radius-md)',
          boxShadow,
          transition:   'var(--transition-fast)',
          overflow:     'hidden',
        }}
      >
        {prefix && (
          <span
            style={{
              padding:  '0 12px',
              color:    'var(--color-text-muted)',
              flexShrink: 0,
              fontSize: '0.9375rem',
            }}
          >
            {prefix}
          </span>
        )}

        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex:       1,
            background: 'transparent',
            border:     'none',
            outline:    'none',
            padding:    '14px 16px',
            paddingLeft: prefix ? '4px' : '16px',
            paddingRight: suffix ? '4px' : '16px',
            color:      'var(--color-text-primary)',
            fontSize:   'var(--font-md)',
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 500,
          }}
        />

        {suffix && (
          <span
            style={{
              padding:    '0 12px',
              color:      'var(--color-text-muted)',
              flexShrink: 0,
              fontSize:   '0.75rem',
              fontWeight: 600,
            }}
          >
            {suffix}
          </span>
        )}
      </div>

      {error && (
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-error)', marginTop: 2 }}>
          {error}
        </p>
      )}
    </div>
  )
}
