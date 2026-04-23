import { useState, useEffect, useCallback } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Home, Wallet, ArrowUpRight, Users, User, Shield, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { fetchUnreadCount } from '../../services/api'
import { useInactivityTimeout } from '../../hooks/useInactivityTimeout'
import BottomNavBar from '../layout/BottomNavBar'
import SideNavBar   from '../layout/SideNavBar'

const NAV_ITEMS_MOBILE = [
  { icon: Home,         label: 'Inicio',         to: '/dashboard'    },
  { icon: Wallet,       label: 'Activos',         to: '/wallet'       },
  { icon: ArrowUpRight, label: 'Transferencias',  to: '/transactions' },
  { icon: Users,        label: 'Contactos',       to: '/contacts'     },
  { icon: User,         label: 'Perfil',          to: '/profile'      },
]

export default function AppLayout() {
  const { user, isLoading, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const firstName = user?.firstName ?? ''
  const role      = user?.role      ?? ''
  const initials  = firstName ? firstName.charAt(0).toUpperCase() : '?'

  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetchUnreadCount()
      .then(data => { if (!cancelled) setUnreadCount(data.unreadCount ?? 0) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [location.pathname, user])

  useEffect(() => {
    if (!user) return
    const refresh = () => {
      fetchUnreadCount()
        .then(data => setUnreadCount(data.unreadCount ?? 0))
        .catch(() => {})
    }
    window.addEventListener('alyto:notification-received', refresh)
    window.addEventListener('alyto:notifications-read', refresh)
    const interval = setInterval(refresh, 60_000)
    return () => {
      window.removeEventListener('alyto:notification-received', refresh)
      window.removeEventListener('alyto:notifications-read', refresh)
      clearInterval(interval)
    }
  }, [user])

  const handleLogout = useCallback(() => {
    logout()
    navigate('/login?logout=1', { replace: true })
  }, [logout, navigate])

  const handleInactivityLogout = useCallback(() => {
    logout()
    navigate('/login', {
      replace: true,
      state: { message: 'Tu sesión fue cerrada por inactividad.' },
    })
  }, [logout, navigate])

  const { showModal: showInactivityModal, countdown, continueSession, endSession } =
    useInactivityTimeout({ onLogout: handleInactivityLogout })

  function isActive(to) {
    if (to === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/'
    return location.pathname.startsWith(to)
  }

  return (
    <>
      {/* ═══════════════════════════════════════════════════════
          DESKTOP LAYOUT (≥ 1024px)
          SideNavBar (fixed 260px) + TopNavBar + content
          ═══════════════════════════════════════════════════════ */}
      <div className="hidden lg:flex" style={{ minHeight: '100vh', background: 'var(--color-bg-app)' }}>
        <SideNavBar user={user} onLogout={handleLogout} />

        {/* Main area — left of sidebar */}
        <div style={{ marginLeft: 260, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

          {/* Desktop top bar */}
          <header
            style={{
              height:         64,
              background:     '#FFFFFF',
              boxShadow:      '0 1px 0 #E2E8F0, 0 2px 8px rgba(29,52,97,0.04)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              padding:        '0 28px',
              position:       'sticky',
              top:            0,
              zIndex:         30,
              flexShrink:     0,
            }}
          >
            <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {NAV_ITEMS_MOBILE.find(n => isActive(n.to))?.label ?? 'Alyto'}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {role === 'admin' && (
                <Link
                  to="/admin"
                  className="no-underline flex items-center gap-1.5 px-3 rounded-full text-xs font-semibold"
                  style={{
                    height:      32,
                    background:  'var(--color-accent-teal-dim)',
                    border:      '1px solid var(--color-accent-teal-border)',
                    color:       'var(--color-accent-teal)',
                  }}
                >
                  <Shield size={12} />
                  Backoffice
                </Link>
              )}

              <button
                onClick={() => navigate('/notifications')}
                aria-label="Notificaciones"
                style={{
                  width:          36, height: 36, borderRadius: '50%',
                  background:     'var(--color-bg-elevated)',
                  border:         '1px solid var(--color-border)',
                  display:        'flex', alignItems: 'center', justifyContent: 'center',
                  cursor:         'pointer', position: 'relative',
                }}
              >
                <Bell size={16} style={{ color: '#1D3461' }} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute', top: -2, right: -2,
                      minWidth: 16, height: 16,
                      borderRadius: 'var(--radius-full)',
                      background: '#EF4444', color: '#FFF',
                      fontSize: '0.5rem', fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 4px', border: '2px solid #FFFFFF',
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              <Link
                to="/profile"
                className="no-underline"
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: '#1D3461',
                  border: '2px solid rgba(29,52,97,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.875rem', fontWeight: 800, color: '#FFFFFF',
                  flexShrink: 0, letterSpacing: '0.02em',
                }}
              >
                {isLoading
                  ? <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />
                  : initials
                }
              </Link>
            </div>
          </header>

          {/* Content */}
          <main
            style={{ flex: 1, overflowY: 'auto', padding: '28px', maxWidth: 1200 }}
            className="scrollbar-hide"
          >
            <Outlet />
          </main>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          MOBILE LAYOUT (< 1024px)
          Sticky header + scrollable content + BottomNavBar
          ═══════════════════════════════════════════════════════ */}
      <div
        className="flex flex-col lg:hidden"
        style={{
          minHeight:  '100vh',
          maxWidth:   430,
          margin:     '0 auto',
          background: 'var(--color-bg-app)',
          position:   'relative',
        }}
      >
        {/* Mobile header */}
        <header
          style={{
            height:         60,
            background:     '#FFFFFF',
            boxShadow:      '0 1px 0 #E2E8F0, 0 2px 8px rgba(29,52,97,0.04)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '0 20px',
            position:       'sticky',
            top:            0,
            zIndex:         40,
            flexShrink:     0,
          }}
        >
          {/* Logo */}
          <Link to="/dashboard" className="no-underline flex-shrink-0">
            <img
              src="/assets/LogoAlyto.png"
              alt="Alyto"
              style={{ height: 26, width: 'auto', objectFit: 'contain' }}
            />
          </Link>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {role === 'admin' && (
              <Link
                to="/admin"
                className="no-underline flex items-center gap-1 px-2.5 rounded-full text-xs font-semibold"
                style={{
                  height:     26,
                  background: 'var(--color-accent-teal-dim)',
                  border:     '1px solid var(--color-accent-teal-border)',
                  color:      'var(--color-accent-teal)',
                  fontSize:   '0.6875rem',
                }}
              >
                <Shield size={10} />
                Admin
              </Link>
            )}

            {/* Bell */}
            <button
              onClick={() => navigate('/notifications')}
              aria-label="Notificaciones"
              style={{
                width:          38,
                height:         38,
                borderRadius:   '50%',
                background:     'var(--color-bg-elevated)',
                border:         '1px solid var(--color-border)',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                cursor:         'pointer',
                position:       'relative',
                flexShrink:     0,
              }}
            >
              <Bell size={17} style={{ color: '#1D3461' }} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position:       'absolute',
                    top:            -3,
                    right:          -3,
                    minWidth:       17,
                    height:         17,
                    borderRadius:   'var(--radius-full)',
                    background:     '#EF4444',
                    color:          '#FFFFFF',
                    fontSize:       '0.5rem',
                    fontWeight:     800,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    padding:        '0 4px',
                    border:         '2px solid #FFFFFF',
                    letterSpacing:  '-0.01em',
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Profile initial */}
            <Link
              to="/profile"
              className="no-underline"
              style={{
                width:          38,
                height:         38,
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
              {isLoading
                ? <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />
                : initials
              }
            </Link>
          </div>
        </header>

        {/* Mobile content — extra bottom padding for floating nav */}
        <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ paddingBottom: 108 }}>
          <Outlet />
        </div>

        {/* Bottom nav */}
        <BottomNavBar />
      </div>

      {/* ═══════════════════════════════════════════════════════
          INACTIVITY MODAL (shared)
          ═══════════════════════════════════════════════════════ */}
      {showInactivityModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--color-bg-overlay)',
            backdropFilter: 'blur(8px)',
            padding: '0 24px',
          }}
        >
          <div
            style={{
              background:   'var(--color-bg-elevated)',
              borderRadius: 'var(--radius-2xl)',
              border:       '1px solid var(--color-border)',
              boxShadow:    'var(--shadow-modal)',
              maxWidth:     380,
              width:        '100%',
              padding:      24,
              textAlign:    'center',
            }}
          >
            <div
              style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'var(--color-warning-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Bell size={24} style={{ color: 'var(--color-warning)' }} />
            </div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
              ¿Sigues ahí?
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
              Tu sesión se cerrará por inactividad en
            </p>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: '#1D3461', marginBottom: 20, fontVariantNumeric: 'tabular-nums' }}>
              {countdown}<span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 4 }}>seg</span>
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={endSession}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 16,
                  background: 'transparent', border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'Manrope', sans-serif",
                }}
              >
                Cerrar sesión
              </button>
              <button
                onClick={continueSession}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 16,
                  background: '#1D3461', border: 'none',
                  color: '#FFFFFF', fontSize: '0.875rem', fontWeight: 700,
                  cursor: 'pointer', fontFamily: "'Manrope', sans-serif",
                  boxShadow: '0 4px 16px rgba(29,52,97,0.30)',
                }}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
