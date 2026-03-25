/**
 * AdminLayout.jsx — Layout del panel de administración
 *
 * Sidebar con links de navegación admin + contenido principal.
 */

import { Outlet, NavLink, Link } from 'react-router-dom'
import { BarChart2, Layers, ArrowLeft, ShieldCheck, TrendingUp, Wallet, Building2, QrCode } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

function SidebarLink({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl text-[0.875rem] font-medium transition-all ${
          isActive
            ? 'bg-[#C4CBD81A] text-[#C4CBD8] border border-[#C4CBD833]'
            : 'text-[#8A96B8] hover:text-white hover:bg-[#1F2B4D]'
        }`
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  )
}

export default function AdminLayout() {
  const { user } = useAuth()

  const adminName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Admin'

  return (
    <div className="min-h-screen bg-[#0F1628] font-sans flex">

      {/* ── Sidebar ── */}
      <aside
        className="w-64 flex-shrink-0 flex flex-col gap-2 px-4 py-8 sticky top-0 h-screen overflow-y-auto"
        style={{ borderRight: '1px solid #1A2340', background: '#0F1628' }}
      >
        {/* Logo */}
        <div className="mb-6 px-1">
          <img src="/assets/logo-alyto.png" alt="Alyto" className="h-7 w-auto" />
          <p className="text-[0.6875rem] text-[#4E5A7A] mt-1 font-medium uppercase tracking-wider">
            Backoffice
          </p>
        </div>

        {/* Nav links */}
        <SidebarLink to="/admin/ledger"     icon={BarChart2}  label="Ledger"      />
        <SidebarLink to="/admin/corridors"  icon={Layers}     label="Corredores"  />
        <SidebarLink to="/admin/analytics"  icon={TrendingUp} label="Analytics"   />
        <SidebarLink to="/admin/funding"    icon={Wallet}     label="Fondeo"      />
        <SidebarLink to="/admin/srl-config" icon={QrCode}     label="Bolivia — QR" />
        <SidebarLink to="/admin/kyb"        icon={Building2}  label="KYB"         />

        <div className="mt-auto">
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl mb-2"
            style={{ background: '#1A2340', border: '1px solid #263050' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[0.75rem] font-bold text-[#0F1628] flex-shrink-0"
              style={{ background: '#C4CBD8' }}
            >
              {adminName[0]}
            </div>
            <div className="overflow-hidden">
              <p className="text-[0.8125rem] font-semibold text-white truncate">{adminName}</p>
              <p className="text-[0.625rem] text-[#C4CBD8]">Administrador</p>
            </div>
          </div>

          <Link
            to="/dashboard"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-[0.8125rem] text-[#8A96B8] hover:text-white hover:bg-[#1F2B4D] transition-colors"
          >
            <ArrowLeft size={16} />
            Ver app
          </Link>
        </div>
      </aside>

      {/* ── Contenido principal ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sub-header */}
        <header
          className="px-8 py-5 flex items-center gap-3"
          style={{ borderBottom: '1px solid #1A2340' }}
        >
          <ShieldCheck size={18} className="text-[#C4CBD8]" />
          <span className="text-[0.875rem] font-semibold text-white">Panel de Administración</span>
          <span className="ml-auto text-[0.75rem] text-[#4E5A7A]">{adminName}</span>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
