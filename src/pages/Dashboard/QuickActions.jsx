import { useNavigate } from 'react-router-dom'
import { Send, List, User, MessageCircle, QrCode } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const WHATSAPP_NUMBER = import.meta.env.VITE_SUPPORT_WHATSAPP ?? ''

const ACTIONS = [
  { id: 'send',    icon: Send,          label: 'Enviar dinero', primary: true,  requiresKyc: true,  route: '/send'     },
  { id: 'history', icon: List,          label: 'Historial',     primary: false, requiresKyc: false, route: '/transactions' },
  { id: 'profile', icon: User,          label: 'Mi perfil',     primary: false, requiresKyc: false, route: '/profile'  },
  { id: 'support', icon: MessageCircle, label: 'Soporte',       primary: false, requiresKyc: false, route: null        },
]

function ActionCard({ action, kycApproved, onNavigate, onSupport, colSpan2 = false }) {
  const Icon       = action.icon
  const isDisabled = action.requiresKyc && !kycApproved

  function handleClick() {
    if (isDisabled) return
    if (action.id === 'support') onSupport()
    else onNavigate(action.route)
  }

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      title={isDisabled ? 'Disponible tras verificar tu identidad' : undefined}
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'flex-start',
        gap:            12,
        padding:        16,
        borderRadius:   'var(--radius-xl)',
        border:         action.primary
          ? 'none'
          : '1px solid var(--color-border)',
        background:     isDisabled
          ? 'var(--color-bg-secondary)'
          : action.primary
            ? 'var(--color-accent-teal)'
            : 'var(--color-bg-secondary)',
        opacity:        isDisabled ? 0.4 : 1,
        cursor:         isDisabled ? 'not-allowed' : 'pointer',
        textAlign:      'left',
        width:          '100%',
        gridColumn:     colSpan2 ? 'span 2' : undefined,
        transition:     'var(--transition-fast)',
        boxShadow:      action.primary && !isDisabled ? 'var(--shadow-teal)' : 'none',
        fontFamily:     "'Manrope', sans-serif",
      }}
      onMouseEnter={e => {
        if (isDisabled) return
        e.currentTarget.style.background = action.primary ? 'var(--color-accent-teal-hover)' : 'var(--color-bg-elevated)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = isDisabled ? 'var(--color-bg-secondary)' : action.primary ? 'var(--color-accent-teal)' : 'var(--color-bg-secondary)'
      }}
    >
      <div
        style={{
          width:          36, height: 36, borderRadius: 12,
          display:        'flex', alignItems: 'center', justifyContent: 'center',
          background:     action.primary ? 'rgba(255,255,255,0.25)' : 'var(--color-bg-elevated)',
        }}
      >
        <Icon
          size={17}
          style={{ color: isDisabled ? 'var(--color-text-muted)' : action.primary ? '#0F1628' : 'var(--color-text-secondary)' }}
        />
      </div>
      <span
        style={{
          fontSize:   'var(--font-sm)',
          fontWeight: 600,
          color:      isDisabled ? 'var(--color-text-muted)' : action.primary ? '#0F1628' : 'var(--color-text-primary)',
        }}
      >
        {action.label}
      </span>
    </button>
  )
}

export default function QuickActions({ kycStatus }) {
  const navigate    = useNavigate()
  const { user }    = useAuth()
  const kycApproved = kycStatus === 'approved'
  const isSRL       = user?.legalEntity === 'SRL'

  function handleSupport() {
    if (WHATSAPP_NUMBER) {
      window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div style={{ padding: '0 16px', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p className="label-uppercase">Acciones rápidas</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {ACTIONS.map((action) => (
          <ActionCard
            key={action.id}
            action={action}
            kycApproved={kycApproved}
            onNavigate={navigate}
            onSupport={handleSupport}
          />
        ))}
        {isSRL && (
          <ActionCard
            action={{ id: 'qr', icon: QrCode, label: 'QR', primary: false, requiresKyc: false, route: '/wallet/qr' }}
            kycApproved={kycApproved}
            onNavigate={navigate}
            onSupport={handleSupport}
            colSpan2
          />
        )}
      </div>
    </div>
  )
}
