import { Loader2 } from 'lucide-react'

const SIZE = {
  sm: { padding: '8px 16px',  fontSize: '0.8125rem', height: '36px', borderRadius: '10px' },
  md: { padding: '12px 20px', fontSize: '0.9375rem', height: '44px', borderRadius: '12px' },
  lg: { padding: '14px 24px', fontSize: '0.9375rem', height: '52px', borderRadius: '14px' },
}

const VARIANT = {
  primary: {
    background: '#0D1F3C',
    color:      '#FFFFFF',
    border:     'none',
    boxShadow:  '0 2px 12px rgba(13,31,60,0.20)',
    hoverBg:    '#1A3050',
  },
  teal: {
    background: 'var(--color-accent-teal)',
    color:      '#FFFFFF',
    border:     'none',
    boxShadow:  'var(--shadow-teal)',
    hoverBg:    'var(--color-accent-teal-hover)',
  },
  secondary: {
    background: '#FFFFFF',
    color:      'var(--color-text-primary)',
    border:     '1px solid var(--color-border)',
    boxShadow:  'none',
    hoverBg:    'var(--color-bg-elevated)',
  },
  ghost: {
    background: 'transparent',
    color:      'var(--color-text-secondary)',
    border:     'none',
    boxShadow:  'none',
    hoverBg:    'var(--color-bg-elevated)',
  },
}

export default function Button({
  variant  = 'primary',
  size     = 'md',
  disabled = false,
  loading  = false,
  fullWidth = false,
  children,
  onClick,
  type     = 'button',
  className = '',
  style    = {},
}) {
  const s    = SIZE[size]    ?? SIZE.md
  const v    = VARIANT[variant] ?? VARIANT.primary
  const isOff = disabled || loading

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isOff}
      className={className}
      style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            '8px',
        fontFamily:     "'Manrope', sans-serif",
        fontWeight:     700,
        cursor:         isOff ? 'not-allowed' : 'pointer',
        opacity:        isOff ? 0.45 : 1,
        width:          fullWidth ? '100%' : 'auto',
        transition:     'var(--transition-fast)',
        whiteSpace:     'nowrap',
        ...s,
        background: v.background,
        color:      v.color,
        border:     v.border,
        boxShadow:  isOff ? 'none' : v.boxShadow,
        ...style,
      }}
      onMouseEnter={e => { if (!isOff) e.currentTarget.style.background = v.hoverBg }}
      onMouseLeave={e => { if (!isOff) e.currentTarget.style.background = v.background }}
    >
      {loading
        ? <><Loader2 size={16} className="animate-spin" />{children}</>
        : children
      }
    </button>
  )
}
