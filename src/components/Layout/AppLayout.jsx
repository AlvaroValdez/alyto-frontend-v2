/**
 * AppLayout.jsx — Shell persistente de la app: header + bottom nav
 *
 * Tema: Alyto Arctic (Light Mode)
 * Header y bottom nav con glassmorphism sobre fondo #F8FAFC.
 */

import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Home, Wallet, FileText, User, Shield, LogOut, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { fetchUnreadCount } from '../../services/api'

export default function AppLayout() {
  const { user, logout } = useAuth()

  const NAV_ITEMS = [
    { icon: Home,      label: 'Inicio',        to: '/dashboard'    },
    ...(user?.legalEntity === 'SRL'
      ? [{ icon: Wallet, label: 'Activos', to: '/wallet' }]
      : []
    ),
    { icon: FileText,  label: 'Transferencias', to: '/transactions' },
    { icon: Users,     label: 'Contactos',      to: '/contacts'     },
    { icon: User,      label: 'Perfil',         to: '/profile'      },
  ]
  const location         = useLocation()
  const navigate         = useNavigate()

  const firstName = user?.firstName ?? ''
  const role      = user?.role      ?? ''

  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch unread count on navigation + on push received + on mark-as-read
  useEffect(() => {
    let cancelled = false
    fetchUnreadCount()
      .then(data => { if (!cancelled) setUnreadCount(data.unreadCount ?? 0) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [location.pathname])

  useEffect(() => {
    const refresh = () => {
      fetchUnreadCount()
        .then(data => setUnreadCount(data.unreadCount ?? 0))
        .catch(() => {})
    }
    window.addEventListener('alyto:notification-received', refresh)
    window.addEventListener('alyto:notifications-read', refresh)
    return () => {
      window.removeEventListener('alyto:notification-received', refresh)
      window.removeEventListener('alyto:notifications-read', refresh)
    }
  }, [])

  function handleLogout() {
    logout()
    navigate('/login?logout=1', { replace: true })
  }

  function isActive(to) {
    if (to === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/'
    return location.pathname.startsWith(to)
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans flex flex-col max-w-[430px] mx-auto relative">

      {/* ── HEADER (sticky + glassmorphism) ──────────────────────── */}
      <header
        className="sticky top-0 z-40 px-5 py-3 flex items-center justify-between flex-shrink-0"
        style={{
          background:    'rgba(255,255,255,0.80)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom:  '1px solid rgba(226,232,240,0.8)',
        }}
      >
        <Link to="/dashboard" className="no-underline flex-shrink-0">
          <img
            src="/assets/LogoAlyto.png"
            alt="Alyto"
            className="h-8 w-auto object-contain"
          />
        </Link>

        <div className="flex items-center gap-2.5">
          {role === 'admin' && (
            <Link
              to="/admin"
              className="flex items-center gap-1.5 px-3 h-8 rounded-full border border-[#233E5833] bg-[#233E581A] text-[#233E58] text-[0.75rem] font-semibold no-underline transition-all hover:bg-[#233E5830]"
            >
              <Shield size={12} />
              Backoffice
            </Link>
          )}

          <button
            onClick={() => navigate('/notifications')}
            className="w-9 h-9 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center shadow-sm relative"
            aria-label="Notificaciones"
          >
            <Bell size={16} className="text-[#233E58]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#EF4444] text-white text-[0.625rem] font-bold flex items-center justify-center px-1 border-2 border-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {firstName && (
            <span className="text-[0.8125rem] font-semibold text-[#0F172A] leading-none">
              {firstName}
            </span>
          )}

          <Link
            to="/profile"
            className="w-9 h-9 rounded-full border-2 border-[#233E58] flex items-center justify-center text-white text-xs font-bold tracking-wide no-underline flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #233E58, #1C3247)' }}
          >
            {firstName ? firstName.charAt(0).toUpperCase() : 'A'}
          </Link>
        </div>
      </header>

      {/* ── CONTENT (outlet) ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pb-24">
        <Outlet />
      </div>

      {/* ── BOTTOM NAV (fixed + glassmorphism) ───────────────────── */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] flex justify-around px-2 pt-3 pb-6 z-50"
        style={{
          background:    'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop:     '1px solid rgba(226,232,240,0.9)',
          borderTopLeftRadius:  '24px',
          borderTopRightRadius: '24px',
        }}
      >
        {NAV_ITEMS.map(({ icon: Icon, label, to }) => {
          const active = isActive(to)
          return (
            <Link
              key={label}
              to={to}
              className="flex flex-col items-center gap-1 min-w-[52px] no-underline"
            >
              {/* Active: teal pill background */}
              <div className={`flex items-center justify-center w-10 h-6 rounded-full transition-all ${
                active ? 'bg-[#233E581A]' : ''
              }`}>
                <Icon size={19} className={active ? 'text-[#233E58]' : 'text-[#94A3B8]'} />
              </div>
              <span className={`text-[0.5625rem] font-semibold transition-colors ${
                active ? 'text-[#233E58]' : 'text-[#94A3B8]'
              }`}>
                {label}
              </span>
            </Link>
          )
        })}

        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 min-w-[52px] text-[#94A3B8] transition-colors active:text-[#EF4444]"
        >
          <div className="flex items-center justify-center w-10 h-6">
            <LogOut size={19} />
          </div>
          <span className="text-[0.5625rem] font-semibold">Salir</span>
        </button>
      </nav>

    </div>
  )
}
