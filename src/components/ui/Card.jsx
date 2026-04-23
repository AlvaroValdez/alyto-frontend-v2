export default function Card({ variant = 'default', className = '', style = {}, children }) {
  const base = {
    borderRadius: 'var(--radius-xl)',
    padding:      'var(--space-xl)',
  }

  const variants = {
    default: {
      background: 'var(--color-bg-secondary)',
      border:     '1px solid var(--color-border)',
    },
    balance: {
      background:   'var(--gradient-balance)',
      border:       'none',
      boxShadow:    'var(--shadow-hero)',
      borderRadius: 'var(--radius-2xl)',
      padding:      '28px 24px 24px',
      position:     'relative',
      overflow:     'hidden',
    },
    elevated: {
      background: 'var(--color-bg-elevated)',
      border:     '1px solid var(--color-border)',
      boxShadow:  'var(--shadow-card)',
    },
  }

  const variantStyle = variants[variant] ?? variants.default

  return (
    <div
      className={`alter-card-${variant === 'balance' ? 'balance' : variant === 'elevated' ? 'elevated' : ''} ${className}`}
      style={{ ...base, ...variantStyle, ...style }}
    >
      {children}
    </div>
  )
}
