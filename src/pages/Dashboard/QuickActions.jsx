import { useNavigate } from 'react-router-dom'
import { Send, UserPlus, PlusCircle } from 'lucide-react'

const ACTIONS = [
  { id: 'send',    icon: Send,      label: 'Enviar',    teal: true,  requiresKyc: true,  route: '/send'     },
  { id: 'contact', icon: UserPlus,  label: '+Contacto', teal: false, requiresKyc: false, route: '/contacts' },
  { id: 'load',    icon: PlusCircle, label: 'Cargar',   teal: false, requiresKyc: false, route: '/wallet'   },
]

export default function QuickActions({ kycStatus }) {
  const navigate    = useNavigate()
  const kycApproved = kycStatus === 'approved'

  return (
    <div style={{ padding: '0 16px', marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {ACTIONS.map(action => {
          const Icon       = action.icon
          const isDisabled = action.requiresKyc && !kycApproved

          return (
            <button
              key={action.id}
              onClick={() => { if (!isDisabled) navigate(action.route) }}
              disabled={isDisabled}
              title={isDisabled ? 'Disponible tras verificar tu identidad' : undefined}
              style={{
                flex:          1,
                display:       'flex',
                flexDirection: 'column',
                alignItems:    'center',
                gap:           8,
                padding:       '16px 8px',
                borderRadius:  'var(--radius-xl)',
                background:    action.teal && !isDisabled
                  ? 'var(--color-primary)'
                  : '#FFFFFF',
                border:        action.teal && !isDisabled
                  ? 'none'
                  : '1px solid var(--color-border)',
                boxShadow:     action.teal && !isDisabled
                  ? 'var(--shadow-primary)'
                  : 'var(--shadow-card)',
                opacity:       isDisabled ? 0.4 : 1,
                cursor:        isDisabled ? 'not-allowed' : 'pointer',
                transition:    'var(--transition-fast)',
                fontFamily:    "'Manrope', sans-serif",
              }}
            >
              <div
                style={{
                  width:          40,
                  height:         40,
                  borderRadius:   'var(--radius-md)',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  background:     action.teal && !isDisabled
                    ? 'rgba(255,255,255,0.20)'
                    : 'var(--color-primary-bg)',
                }}
              >
                <Icon
                  size={20}
                  style={{ color: action.teal && !isDisabled ? '#FFFFFF' : 'var(--color-primary)' }}
                />
              </div>
              <span
                style={{
                  fontSize:   'var(--font-sm)',
                  fontWeight: 700,
                  color:      action.teal && !isDisabled ? '#FFFFFF' : 'var(--color-text-primary)',
                }}
              >
                {action.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
