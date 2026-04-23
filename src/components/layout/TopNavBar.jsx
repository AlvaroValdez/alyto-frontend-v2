import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function TopNavBar({ title = 'Dashboard', unreadCount = 0, user }) {
  const navigate  = useNavigate()
  const firstName = user?.firstName ?? ''
  const initials  = firstName ? firstName.charAt(0).toUpperCase() : '?'

  return (
    <header
      style={{
        height:       64,
        background:   'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border)',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
        padding:      '0 28px',
        position:     'sticky',
        top:          0,
        zIndex:       30,
        flexShrink:   0,
      }}
    >
      {/* Page title */}
      <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
        {title}
      </h1>

      {/* Right: bell + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => navigate('/notifications')}
          aria-label="Notificaciones"
          style={{
            width:          36,
            height:         36,
            borderRadius:   '50%',
            background:     'var(--color-bg-elevated)',
            border:         '1px solid var(--color-border)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            cursor:         'pointer',
            position:       'relative',
          }}
        >
          <Bell size={16} style={{ color: 'var(--color-text-secondary)' }} />
          {unreadCount > 0 && (
            <span
              style={{
                position:        'absolute',
                top:             -2,
                right:           -2,
                minWidth:        16,
                height:          16,
                borderRadius:    'var(--radius-full)',
                background:      'var(--color-error)',
                color:           '#FFFFFF',
                fontSize:        '0.5625rem',
                fontWeight:      700,
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                padding:         '0 4px',
                border:          '2px solid var(--color-bg-secondary)',
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => navigate('/profile')}
          style={{
            width:          36,
            height:         36,
            borderRadius:   '50%',
            background:     'linear-gradient(135deg, #1D3461, #0F1628)',
            border:         '2px solid var(--color-border)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       '0.8125rem',
            fontWeight:     700,
            color:          'var(--color-text-primary)',
            cursor:         'pointer',
            flexShrink:     0,
          }}
        >
          {initials}
        </button>
      </div>
    </header>
  )
}
