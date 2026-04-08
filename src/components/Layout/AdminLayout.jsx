/**
 * AdminLayout.jsx — Layout del panel de administración
 *
 * Sidebar con links de navegación admin + contenido principal.
 */

import { Outlet, NavLink, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { BarChart2, Layers, ArrowLeft, ShieldCheck, TrendingUp, Wallet, Building2, QrCode, Banknote, AlertCircle, ShieldAlert, Settings2, AlertTriangle, CheckCircle2, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { request } from '../../services/api'

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

  const [alertBanner, setAlertBanner]       = useState({ alerts: [], balances: {} })
  const [bannerDismissed, setBannerDismissed] = useState(false)

  useEffect(() => {
    request('/admin/vita/balance')
      .then(data => {
        const level = data.alerts?.some(a => a.level === 'critical') ? 'critical' : 'warning'
        setAlertBanner({ level, alerts: data.alerts ?? [], balances: data.balances ?? {} })
      })
      .catch(() => {})
  }, [])

  const showBanner = !bannerDismissed

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
        <SidebarLink to="/admin/spa-config" icon={Settings2}  label="Chile — Transferencias" />
        <SidebarLink to="/admin/kyb"        icon={Building2}  label="KYB"         />
        <SidebarLink to="/admin/wallet"     icon={Banknote}      label="Wallets Bolivia" />
        <SidebarLink to="/admin/reclamos"   icon={AlertCircle}   label="Reclamos PRILI"  />
        <SidebarLink to="/admin/sanctions"  icon={ShieldAlert}   label="Sanciones AML"   />

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

        {/* Banner de saldos Vita — siempre visible */}
        {showBanner && (() => {
          const hasAlerts = alertBanner.alerts?.length > 0
          const isCrit    = alertBanner.alerts?.some(a => a.level === 'critical')
          const bg        = isCrit ? '#7F1D1D' : hasAlerts ? '#78350F' : '#1A2340'
          const border    = isCrit ? '#EF444455' : hasAlerts ? '#F59E0B55' : '#26305055'
          const labelColor = isCrit ? '#FCA5A5' : hasAlerts ? '#FCD34D' : '#8A96B8'
          const Icon      = isCrit ? AlertCircle : hasAlerts ? AlertTriangle : CheckCircle2
          const THRESHOLDS = { USD: 500, CLP: 500000, USDT: 500, USDC: 500, COP: 2000000 }
          const fmt = (n, cur) =>
            cur === 'CLP' || cur === 'COP'
              ? `$${Number(n).toLocaleString('es-CL', { maximumFractionDigits: 0 })}`
              : `$${Number(n).toFixed(2)}`
          return (
            <div
              className="flex items-center justify-between gap-3 px-6 py-3"
              style={{ background: bg, borderBottom: `1px solid ${border}` }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon size={15} style={{ color: labelColor, flexShrink: 0 }} />
                <p className="text-[0.8125rem] font-semibold flex flex-wrap items-baseline gap-x-1" style={{ color: labelColor }}>
                  <span>Vita —&nbsp;</span>
                  {['USD', 'CLP', 'USDT', 'USDC', 'COP'].map((cur, i) => {
                    const bal   = alertBanner.balances?.[cur.toLowerCase()] ?? 0
                    const isOk  = bal >= (THRESHOLDS[cur] ?? 0)
                    return (
                      <span key={cur}>
                        {i > 0 && <span className="mx-2 opacity-30">|</span>}
                        <strong>{cur}</strong>{' '}
                        <span style={{ color: isOk ? '#22C55E' : '#F87171' }}>{fmt(bal, cur)}</span>
                      </span>
                    )
                  })}
                  {hasAlerts && <span className="ml-2 opacity-80">— revisa el fondeo</span>}
                </p>
              </div>
              <button
                onClick={() => setBannerDismissed(true)}
                className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X size={14} style={{ color: labelColor }} />
              </button>
            </div>
          )
        })()}

        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
