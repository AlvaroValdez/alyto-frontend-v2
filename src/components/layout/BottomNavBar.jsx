import { NavLink } from 'react-router-dom'
import { Home, Wallet, ArrowUpRight, Users, User } from 'lucide-react'

const NAV_ITEMS = [
  { icon: Home,         label: 'Inicio',        to: '/dashboard'    },
  { icon: Wallet,       label: 'Activos',        to: '/wallet'       },
  { icon: ArrowUpRight, label: 'Enviar',         to: '/send'         },
  { icon: Users,        label: 'Contactos',      to: '/contacts'     },
  { icon: User,         label: 'Perfil',         to: '/profile'      },
]

const ALYTO_BLUE    = '#1D3461'
const ALYTO_BLUE_DIM = 'rgba(29,52,97,0.08)'

export default function BottomNavBar() {
  return (
    <nav
      style={{
        position:       'fixed',
        bottom:         16,
        left:           '50%',
        transform:      'translateX(-50%)',
        width:          'calc(100% - 32px)',
        maxWidth:       398,
        background:     '#FFFFFF',
        borderRadius:   20,
        boxShadow:      '0 8px 32px rgba(29,52,97,0.14), 0 2px 8px rgba(29,52,97,0.06)',
        border:         '1px solid rgba(29,52,97,0.08)',
        display:        'flex',
        justifyContent: 'space-around',
        alignItems:     'center',
        padding:        '8px 4px',
        paddingBottom:  'calc(8px + env(safe-area-inset-bottom))',
        zIndex:         50,
      }}
    >
      {NAV_ITEMS.map(({ icon: Icon, label, to }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/dashboard'}
          className="no-underline"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 0 }}
        >
          {({ isActive }) => (
            <>
              <div
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  width:          42,
                  height:         30,
                  borderRadius:   12,
                  background:     isActive ? ALYTO_BLUE_DIM : 'transparent',
                  transition:     'var(--transition-fast)',
                }}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  style={{ color: isActive ? ALYTO_BLUE : 'var(--color-text-muted)' }}
                />
              </div>
              <span
                style={{
                  fontSize:   '0.5625rem',
                  fontWeight: isActive ? 700 : 500,
                  color:      isActive ? ALYTO_BLUE : 'var(--color-text-muted)',
                  transition: 'var(--transition-fast)',
                  letterSpacing: isActive ? '0.01em' : 0,
                }}
              >
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
