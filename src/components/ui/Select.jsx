import { useState } from 'react'

/**
 * Select — dropdown nativo estilizado, consistente con <Input/>.
 * Usa los tokens de tema claro (tokens.css). Flecha custom vía SVG inline.
 *
 * Props:
 *   label, value, onChange, name, error, disabled, placeholder
 *   options: Array<{ value: string, label: string }>
 */
const ARROW = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239AA5C0' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`

export default function Select({
  label,
  value,
  onChange,
  name,
  options = [],
  placeholder = 'Selecciona…',
  error,
  disabled = false,
  className = '',
}) {
  const [focused, setFocused] = useState(false)

  const borderColor = error
    ? 'var(--color-error)'
    : focused
      ? 'var(--color-border-focus)'
      : 'var(--color-border)'

  const boxShadow = error
    ? '0 0 0 2px rgba(239,68,68,0.12)'
    : focused
      ? '0 0 0 3px rgba(13,31,60,0.12)'
      : 'none'

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="label-uppercase" style={{ display: 'block' }}>
          {label}
        </label>
      )}

      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width:        '100%',
          appearance:   'none',
          background:   `var(--color-bg-secondary) ${ARROW} no-repeat right 14px center`,
          border:       `1px solid ${borderColor}`,
          borderRadius: 'var(--radius-md)',
          boxShadow,
          transition:   'var(--transition-fast)',
          padding:      '14px 40px 14px 16px',
          color:        value ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          fontSize:     'var(--font-md)',
          fontFamily:   "'Manrope', sans-serif",
          fontWeight:   500,
          cursor:       disabled ? 'not-allowed' : 'pointer',
          outline:      'none',
        }}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value} style={{ color: '#0D1F3C' }}>
            {opt.label}
          </option>
        ))}
      </select>

      {error && (
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-error)', marginTop: 2 }}>
          {error}
        </p>
      )}
    </div>
  )
}
