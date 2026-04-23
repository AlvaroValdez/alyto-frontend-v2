import { NavLink } from 'react-router-dom'
import { Home, Wallet, ArrowUpRight, Users, User, ArrowLeftRight, LogOut } from 'lucide-react'

const NAV_COMMON = [
  { icon: Home,           label: 'Dashboard',      to: '/dashboard'    },
  { icon: ArrowUpRight,   label: 'Enviar',          to: '/send'         },
  { icon: ArrowLeftRight, label: 'Transferencias',  to: '/transactions' },
  { icon: Users,          label: 'Contactos',       to: '/contacts'     },
  { icon: User,           label: 'Perfil',          to: '/profile'      },
]

const NAV_SRL = [
  { icon: Home,           label: 'Dashboard',      to: '/dashboard'    },
  { icon: Wallet,         label: 'Activos BOB',    to: '/wallet'       },
  { icon: ArrowUpRight,   label: 'Enviar',          to: '/send'         },
  { icon: ArrowLeftRight, label: 'Transferencias',  to: '/transactions' },
  { icon: User,           label: 'Perfil',          to: '/profile'      },
]

const ENTITY_LABEL = {
  SpA: 'AV Finance SpA',
  SRL: 'AV Finance SRL',
  LLC: 'AV Finance LLC',
}

export default function SideNavBar({ user, onLogout }) {
  const firstName = user?.firstName ?? ''
  const entity    = user?.legalEntity ?? 'LLC'
  const initials  = firstName ? firstName.charAt(0).toUpperCase() : '?'
  const navItems  = entity === 'SRL' ? NAV_SRL : NAV_COMMON

  return (
    <aside
      style={{
        width:         240,
        minWidth:      240,
        height:        '100vh',
        position:      'fixed',
        left:          0,
        top:           0,
        background:    '#FFFFFF',
        borderRight:   '1px solid var(--color-border)',
        display:       'flex',
        flexDirection: 'column',
        zIndex:        40,
        overflowY:     'auto',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px' }}>
        <img
          src="/assets/LogoAlyto.png"
          alt="Alyto"
          style={{ height: 32, width: 'auto', objectFit: 'contain' }}
        />
      </div>

      <div style={{ height: 1, background: 'var(--color-border)', margin: '0 20px' }} />

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {navItems.map(({ icon: Icon, label, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className="no-underline"
            style={{ display: 'block' }}
          >
            {({ isActive }) => (
              <div
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          12,
                  padding:      '10px 14px',
                  borderRadius: 'var(--radius-lg)',
                  background:   isActive ? 'var(--color-primary-bg)' : 'transparent',
                  borderLeft:   isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                  transition:   'var(--transition-fast)',
                  cursor:       'pointer',
                }}
              >
                <Icon
                  size={18}
                  style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)', flexShrink: 0 }}
                />
                <span
                  style={{
                    fontSize:   '0.9375rem',
                    fontWeight: isActive ? 700 : 500,
                    color:      isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    transition: 'var(--transition-fast)',
                  }}
                >
                  {label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User profile + logout */}
      <div style={{ padding: '16px 12px 24px', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 8 }}>
          <div
            style={{
              width:          36,
              height:         36,
              borderRadius:   '50%',
              background:     '#1D3461',
              border:         '2px solid rgba(29,52,97,0.15)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       '0.875rem',
              fontWeight:     800,
              color:          '#FFFFFF',
              flexShrink:     0,
              letterSpacing:  '0.02em',
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {firstName || 'Usuario'}
            </p>
            <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
              {ENTITY_LABEL[entity] ?? 'AV Finance LLC'}
            </p>
          </div>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          10,
              width:        '100%',
              padding:      '10px 14px',
              borderRadius: 'var(--radius-lg)',
              background:   'transparent',
              border:       'none',
              cursor:       'pointer',
              color:        'var(--color-text-muted)',
              fontSize:     '0.9375rem',
              fontWeight:   500,
              fontFamily:   "'Manrope', sans-serif",
              transition:   'var(--transition-fast)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--color-error-bg)'
              e.currentTarget.style.color      = 'var(--color-error)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color      = 'var(--color-text-muted)'
            }}
          >
            <LogOut size={18} style={{ flexShrink: 0 }} />
            Cerrar sesión
          </button>
        )}
      </div>
    </aside>
  )
}
