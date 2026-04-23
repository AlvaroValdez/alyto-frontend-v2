import { NavLink } from 'react-router-dom'
import { Home, Wallet, ArrowUpRight, Users, User } from 'lucide-react'

const NAV_ITEMS = [
  { icon: Home,         label: 'Inicio',         to: '/dashboard'    },
  { icon: Wallet,       label: 'Activos',         to: '/wallet'       },
  { icon: ArrowUpRight, label: 'Transferencias',  to: '/transactions' },
  { icon: Users,        label: 'Contactos',       to: '/contacts'     },
  { icon: User,         label: 'Perfil',          to: '/profile'      },
]

export default function BottomNavBar() {
  return (
    <nav
      style={{
        position:             'fixed',
        bottom:               0,
        left:                 '50%',
        transform:            'translateX(-50%)',
        width:                '100%',
        maxWidth:             '430px',
        background:           'rgba(15,22,40,0.92)',
        backdropFilter:       'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop:            '1px solid var(--color-border)',
        borderTopLeftRadius:  'var(--radius-2xl)',
        borderTopRightRadius: 'var(--radius-2xl)',
        display:              'flex',
        justifyContent:       'space-around',
        padding:              '12px 8px',
        paddingBottom:        'calc(20px + env(safe-area-inset-bottom))',
        zIndex:               50,
      }}
    >
      {NAV_ITEMS.map(({ icon: Icon, label, to }) => (
        <NavLink
          key={to}
          to={to}
          className="no-underline"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 52, gap: 4 }}
        >
          {({ isActive }) => (
            <>
              <div
                style={{
                  display:         'flex',
                  alignItems:      'center',
                  justifyContent:  'center',
                  width:           40,
                  height:          26,
                  borderRadius:    'var(--radius-full)',
                  background:      isActive ? 'var(--color-bg-elevated)' : 'transparent',
                  transition:      'var(--transition-fast)',
                }}
              >
                <Icon
                  size={19}
                  style={{ color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
                />
              </div>
              <span
                style={{
                  fontSize:   '0.5625rem',
                  fontWeight: 600,
                  color:      isActive ? 'var(--color-accent-teal)' : 'var(--color-text-muted)',
                  transition: 'var(--transition-fast)',
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
