import { Link } from 'react-router-dom'
import { ShieldAlert, Clock } from 'lucide-react'

export default function WelcomeBanner({ firstName, kycStatus, activeTransactions }) {
  const kycApproved = kycStatus === 'approved'

  return (
    <div style={{ padding: '0 16px', marginBottom: 4 }}>

      {/* Greeting */}
      <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 16 }}>
        Hola, {firstName} 👋
      </p>

      {/* KYC pending banner */}
      {!kycApproved && (
        <Link
          to="/kyc"
          className="no-underline block"
          style={{
            display:      'flex',
            alignItems:   'flex-start',
            gap:          12,
            borderRadius: 'var(--radius-xl)',
            padding:      '14px 16px',
            marginBottom: 12,
            background:   'var(--color-accent-teal-dim)',
            border:       '1px solid var(--color-accent-teal-border)',
            transition:   'var(--transition-fast)',
          }}
        >
          <div
            style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'var(--color-accent-teal-dim)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: 2,
            }}
          >
            <ShieldAlert size={15} style={{ color: 'var(--color-accent-teal)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-accent-teal)', marginBottom: 2 }}>
              Completa tu verificación de identidad
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Para comenzar a enviar dinero necesitas verificar tu identidad.
            </p>
          </div>
          <span
            style={{
              flexShrink:   0,
              marginTop:    2,
              fontSize:     '0.6875rem',
              fontWeight:   600,
              color:        'var(--color-accent-teal)',
              border:       '1px solid var(--color-accent-teal-border)',
              background:   'var(--color-accent-teal-dim)',
              padding:      '2px 10px',
              borderRadius: 'var(--radius-full)',
              whiteSpace:   'nowrap',
            }}
          >
            Verificar ahora
          </span>
        </Link>
      )}

      {/* Active transactions banner */}
      {activeTransactions > 0 && (
        <Link
          to="/transactions"
          className="no-underline block"
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          12,
            borderRadius: 'var(--radius-xl)',
            padding:      '14px 16px',
            marginBottom: 12,
            background:   'var(--color-teal-status-bg)',
            border:       '1px solid var(--color-teal-status-bg)',
            transition:   'var(--transition-fast)',
          }}
        >
          <div
            style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'var(--color-teal-status-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Clock size={15} style={{ color: 'var(--color-teal-status)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {activeTransactions === 1
                ? 'Tienes 1 transferencia en proceso'
                : `Tienes ${activeTransactions} transferencias en proceso`}
            </p>
          </div>
          <span
            style={{
              flexShrink:   0,
              fontSize:     '0.6875rem',
              fontWeight:   600,
              color:        'var(--color-teal-status)',
              border:       '1px solid var(--color-accent-teal-border)',
              padding:      '2px 10px',
              borderRadius: 'var(--radius-full)',
              whiteSpace:   'nowrap',
            }}
          >
            Ver estado
          </span>
        </Link>
      )}

    </div>
  )
}
