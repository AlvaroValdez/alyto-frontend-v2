/**
 * AppLayout.jsx — Layout de la aplicación para rutas privadas
 *
 * Proporciona:
 *  - Header: logo, notificaciones, avatar con dropdown
 *  - Área de contenido (Outlet)
 *  - Bottom navigation bar (mobile-first)
 *
 * Nota: páginas como DashboardPage ya incluyen su propia navegación.
 * Usar este layout solo en páginas nuevas que lo requieran.
 */

import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import {
  Bell,
  Home,
  Send,
  FileText,
  User,
  ChevronDown,
  LogOut,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

function entityBadge(legalEntity) {
  const map = { SpA: 'SpA', SRL: 'SRL', LLC: 'LLC' }
  return map[legalEntity] ?? 'LLC'
}

// ── Bottom Nav Item ───────────────────────────────────────────────────────────

function NavItem({ to, icon: Icon, label, disabled }) {
  if (disabled) {
    return (
      <div className="flex flex-col items-center gap-1 min-w-[56px] opacity-40 cursor-not-allowed">
        <Icon size={22} />
        <span className="text-[0.6875rem] font-medium">{label}</span>
      </div>
    )
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 min-w-[56px] transition-colors ${
          isActive ? 'text-[#C4CBD8]' : 'text-[#4E5A7A]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={22} />
          <span className="text-[0.6875rem] font-medium">{label}</span>
          {isActive && (
            <span className="w-1 h-1 rounded-full bg-[#C4CBD8]" />
          )}
        </>
      )}
    </NavLink>
  )
}

// ── Bottom Nav Button (action, no route) ─────────────────────────────────────

function NavButton({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 min-w-[56px] text-[#4E5A7A] transition-colors hover:text-[#F87171] active:text-[#F87171]"
    >
      <Icon size={22} />
      <span className="text-[0.6875rem] font-medium">{label}</span>
    </button>
  )
}

// ── Dropdown avatar ───────────────────────────────────────────────────────────

function AvatarDropdown({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref             = useRef(null)

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initials = [user?.firstName?.[0], user?.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || 'U'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 focus:outline-none"
        aria-label="Menú de usuario"
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[0.8125rem] font-bold text-[#0F1628]"
          style={{ background: '#C4CBD8' }}
        >
          {initials}
        </div>
        <ChevronDown
          size={14}
          className={`text-[#8A96B8] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-52 rounded-2xl overflow-hidden z-50"
          style={{
            background: '#1A2340',
            border:     '1px solid #263050',
            boxShadow:  '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {/* Info usuario */}
          <div className="px-4 py-3 border-b border-[#263050]">
            <p className="text-[0.875rem] font-semibold text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[0.75rem] text-[#8A96B8] truncate">{user?.email}</p>
          </div>

          {/* Links */}
          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-[0.875rem] text-[#8A96B8] hover:text-white hover:bg-[#1F2B4D] transition-colors"
          >
            <User size={16} />
            Mi perfil
          </Link>

          {user?.role === 'admin' && (
            <Link
              to="/admin/ledger"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-[0.875rem] text-[#8A96B8] hover:text-white hover:bg-[#1F2B4D] transition-colors"
            >
              <ShieldCheck size={16} />
              Backoffice
            </Link>
          )}

          <button
            onClick={() => { setOpen(false); onLogout() }}
            className="w-full flex items-center gap-3 px-4 py-3 text-[0.875rem] text-[#F87171] hover:bg-[#EF44441A] transition-colors"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

// ── AppLayout ─────────────────────────────────────────────────────────────────

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate         = useNavigate()
  const kycApproved      = user?.kycStatus === 'approved'

  function handleLogout() {
    logout()
    navigate('/login?logout=1', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#0F1628] font-sans flex flex-col">

      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-4 pt-12 pb-4 sticky top-0 z-40"
        style={{ background: '#0F1628', borderBottom: '1px solid #1A2340' }}
      >
        <Link to="/dashboard">
          <img src="/assets/logo-alyto.png" alt="Alyto" className="h-7 w-auto" />
        </Link>

        {/* Usuario activo */}
        {user?.firstName && (
          <div className="flex items-center gap-1.5">
            <span className="text-[0.8125rem] font-semibold text-white leading-none">
              {user.firstName}
            </span>
            <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded-md bg-[#1A2340] border border-[#263050] text-[#8A96B8] leading-none">
              {entityBadge(user.legalEntity)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Notificaciones */}
          <Link
            to="/notifications"
            className="w-9 h-9 rounded-full bg-[#1A2340] flex items-center justify-center"
            style={{ border: '1px solid #263050' }}
          >
            <Bell size={17} className="text-[#8A96B8]" />
          </Link>

          {/* Avatar + dropdown */}
          <AvatarDropdown user={user} onLogout={handleLogout} />
        </div>
      </header>

      {/* ── Contenido principal ── */}
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      {/* ── Bottom Navigation ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex justify-around items-center px-4"
        style={{
          background:   '#0F1628',
          borderTop:    '1px solid #1A2340',
          paddingTop:   '10px',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)',
        }}
      >
        <NavItem to="/dashboard"     icon={Home}     label="Inicio"    />
        <NavItem to="/send"          icon={Send}      label="Enviar"    disabled={!kycApproved} />
        <NavItem to="/transactions"  icon={FileText}  label="Historial" />
        <NavItem to="/profile"       icon={User}      label="Perfil"    />
        <NavButton icon={LogOut} label="Salir" onClick={handleLogout} />
      </nav>
    </div>
  )
}
