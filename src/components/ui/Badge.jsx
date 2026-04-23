const CONFIG = {
  success: { bg: 'var(--color-success-bg)',     text: 'var(--color-success)',     icon: '✓' },
  pending: { bg: 'var(--color-pending-bg)',      text: 'var(--color-pending)',     icon: '⏳' },
  warning: { bg: 'var(--color-warning-bg)',      text: 'var(--color-warning)',     icon: '⚠' },
  error:   { bg: 'var(--color-error-bg)',        text: 'var(--color-error)',       icon: '✕' },
  teal:    { bg: 'var(--color-teal-status-bg)',  text: 'var(--color-teal-status)', icon: '↗' },
}

export default function Badge({ variant = 'pending', showIcon = true, children }) {
  const c = CONFIG[variant] ?? CONFIG.pending
  return (
    <span
      style={{
        display:       'inline-flex',
        alignItems:    'center',
        gap:           '4px',
        background:    c.bg,
        color:         c.text,
        borderRadius:  'var(--radius-full)',
        padding:       '3px 10px',
        fontSize:      'var(--font-sm)',
        fontWeight:    600,
        whiteSpace:    'nowrap',
        fontFamily:    "'Manrope', sans-serif",
      }}
    >
      {showIcon && <span style={{ fontSize: '0.625rem' }}>{c.icon}</span>}
      {children}
    </span>
  )
}
