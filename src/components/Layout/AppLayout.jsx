/**
 * AppLayout.jsx — Shell persistente de la app: header + bottom nav
 *
 * Todas las rutas privadas del usuario (no admin, no auth flows) se renderizan
 * como <Outlet> dentro de este layout. El header y la barra de navegación
 * inferior son siempre visibles independientemente de la sección activa.
 *
 * Estructura:
 *  ┌──────────────────────────────────────┐
 *  │  Header: logo · bell · nombre · 👤  │  ← sticky
 *  ├──────────────────────────────────────┤
 *  │  <Outlet /> — contenido de la ruta  │  ← scroll
 *  ├──────────────────────────────────────┤
 *  │  Bottom Nav: Inicio · Activos · …   │  ← fixed
 *  └──────────────────────────────────────┘
 */

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, Home, BarChart2, FileText, User, Shield, LogOut, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { icon: Home,      label: 'Inicio',        to: '/dashboard'    },
  { icon: BarChart2, label: 'Activos',        to: '/assets'       },
  { icon: FileText,  label: 'Transferencias', to: '/transactions' },
  { icon: Users,     label: 'Contactos',      to: '/contacts'     },
  { icon: User,      label: 'Perfil',         to: '/profile'      },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const location         = useLocation()
  const navigate         = useNavigate()

  const firstName = user?.firstName ?? ''
  const role      = user?.role      ?? ''

  function handleLogout() {
    logout()
    navigate('/login?logout=1', { replace: true })
  }

  function isActive(to) {
    if (to === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/'
    return location.pathname.startsWith(to)
  }

  return (
    <div className="min-h-screen bg-[#0F1628] font-sans flex flex-col max-w-[430px] mx-auto relative">

      {/* ── HEADER (sticky) ──────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#0F1628] border-b border-[#1A2340] px-5 py-3 flex items-center justify-between flex-shrink-0">
        <Link to="/dashboard" className="no-underline flex-shrink-0">
          <img
            src="/assets/logo-alyto.png"
            alt="Alyto"
            className="h-8 w-auto object-contain"
          />
        </Link>

        <div className="flex items-center gap-2.5">
          {role === 'admin' && (
            <Link
              to="/admin"
              className="flex items-center gap-1.5 px-3 h-8 rounded-full border border-[#C4CBD833] bg-[#C4CBD80D] text-[#C4CBD8] text-[0.75rem] font-semibold no-underline transition-all hover:bg-[#C4CBD81A]"
            >
              <Shield size={12} />
              Backoffice
            </Link>
          )}

          <button
            className="w-9 h-9 rounded-full bg-[#1A2340] border border-[#263050] flex items-center justify-center"
            aria-label="Notificaciones"
          >
            <Bell size={16} className="text-[#8A96B8]" />
          </button>

          {firstName && (
            <span className="text-[0.8125rem] font-semibold text-white leading-none">
              {firstName}
            </span>
          )}

          <Link
            to="/profile"
            className="w-9 h-9 rounded-full border-2 border-[#C4CBD8] bg-[#1D3461] flex items-center justify-center text-[#C4CBD8] text-xs font-bold tracking-wide no-underline flex-shrink-0"
          >
            {firstName ? firstName.charAt(0).toUpperCase() : 'A'}
          </Link>
        </div>
      </header>

      {/* ── CONTENT (outlet) ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pb-24">
        <Outlet />
      </div>

      {/* ── BOTTOM NAV (fixed) ───────────────────────────────────── */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#0F1628] border-t border-[#1A2340] flex justify-around px-2 pt-2.5 pb-6 z-50">
        {NAV_ITEMS.map(({ icon: Icon, label, to }) => {
          const active = isActive(to)
          return (
            <Link
              key={label}
              to={to}
              className="flex flex-col items-center gap-1 min-w-[56px] no-underline"
            >
              <Icon size={20} className={active ? 'text-[#C4CBD8]' : 'text-[#4E5A7A]'} />
              <span className={`text-[0.625rem] font-medium ${active ? 'text-[#C4CBD8]' : 'text-[#4E5A7A]'}`}>
                {label}
              </span>
              {active && <span className="w-1 h-1 rounded-full bg-[#C4CBD8]" />}
            </Link>
          )
        })}

        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 min-w-[56px] text-[#4E5A7A] transition-colors active:text-[#F87171]"
        >
          <LogOut size={20} />
          <span className="text-[0.625rem] font-medium">Salir</span>
        </button>
      </nav>

    </div>
  )
}
