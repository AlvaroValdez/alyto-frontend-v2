/**
 * AdminLayout.jsx — Layout del panel de administración
 *
 * Sidebar con links de navegación admin + contenido principal.
 */

import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { BarChart2, Layers, ArrowLeft, ShieldCheck, TrendingUp, Wallet, Building2, QrCode, Banknote, AlertCircle, ShieldAlert, Settings2, AlertTriangle, CheckCircle2, X, Bell, UserPlus, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, FileText, Send, Shield as ShieldIcon, CheckCheck, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { request, fetchUnreadCount, fetchNotifications, markNotificationsRead } from '../../services/api'

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

// ── Notification type config ─────────────────────────────────────────────────

const NOTIF_CONFIG = {
  admin_new_user:           { Icon: UserPlus,       color: '#3B82F6', bg: '#3B82F61A' },
  admin_new_transaction:    { Icon: ArrowUpRight,   color: '#F59E0B', bg: '#F59E0B1A' },
  admin_deposit_request:    { Icon: ArrowDownLeft,  color: '#F59E0B', bg: '#F59E0B1A' },
  admin_withdrawal_request: { Icon: ArrowUpRight,   color: '#EF4444', bg: '#EF44441A' },
  admin_conversion_request: { Icon: ArrowRightLeft, color: '#F59E0B', bg: '#F59E0B1A' },
  admin_kyb_submitted:      { Icon: ShieldIcon,     color: '#3B82F6', bg: '#3B82F61A' },
  admin_payment_proof:      { Icon: FileText,       color: '#1D9E75', bg: '#1D9E751A' },
  admin_p2p_transfer:       { Icon: Send,           color: '#3B82F6', bg: '#3B82F61A' },
}

function getNotifConfig(type) {
  return NOTIF_CONFIG[type] ?? { Icon: Bell, color: '#64748B', bg: '#64748B1A' }
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `${mins}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

export default function AdminLayout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const adminName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Admin'

  // ── Notifications state ──────────────────────────────────────────────────
  const [unreadCount, setUnreadCount]     = useState(0)
  const [dropdownOpen, setDropdownOpen]   = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const [markingAll, setMarkingAll]       = useState(false)
  const dropdownRef = useRef(null)

  // Fetch unread count on nav + polling
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
    const interval = setInterval(refresh, 30_000)
    return () => {
      window.removeEventListener('alyto:notification-received', refresh)
      window.removeEventListener('alyto:notifications-read', refresh)
      clearInterval(interval)
    }
  }, [])

  // Load notifications when dropdown opens
  useEffect(() => {
    if (!dropdownOpen) return
    setLoadingNotifs(true)
    fetchNotifications(1, 10)
      .then(data => setNotifications(data.notifications ?? []))
      .catch(() => {})
      .finally(() => setLoadingNotifs(false))
  }, [dropdownOpen])

  // Close dropdown on click outside
  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  async function handleMarkAll() {
    setMarkingAll(true)
    try {
      await markNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
      window.dispatchEvent(new CustomEvent('alyto:notifications-read'))
    } catch { /* silent */ }
    setMarkingAll(false)
  }

  // ── Vita balance banner ──────────────────────────────────────────────────
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

          <div className="ml-auto flex items-center gap-3">
            {/* ── Campanita de notificaciones ── */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(o => !o)}
                className="w-9 h-9 rounded-full flex items-center justify-center relative transition-colors"
                style={{ background: dropdownOpen ? '#1F2B4D' : 'transparent', border: '1px solid #263050' }}
                aria-label="Notificaciones"
              >
                <Bell size={16} className="text-[#C4CBD8]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#F59E0B] text-[#0F1628] text-[0.625rem] font-bold flex items-center justify-center px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {/* ── Dropdown ── */}
              {dropdownOpen && (
                <div
                  className="absolute right-0 top-12 w-[380px] rounded-2xl shadow-2xl z-50 overflow-hidden"
                  style={{ background: '#141C30', border: '1px solid #1F2B4D' }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #1F2B4D' }}>
                    <span className="text-[0.8125rem] font-semibold text-white">Notificaciones</span>
                    <div className="flex items-center gap-2">
                      {notifications.some(n => !n.read) && (
                        <button
                          onClick={handleMarkAll}
                          disabled={markingAll}
                          className="flex items-center gap-1 text-[0.6875rem] font-semibold text-[#F59E0B] hover:text-[#FCD34D] disabled:opacity-50"
                        >
                          {markingAll ? <Loader2 size={11} className="animate-spin" /> : <CheckCheck size={11} />}
                          Marcar leídas
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List */}
                  <div className="max-h-[400px] overflow-y-auto">
                    {loadingNotifs ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 size={18} className="animate-spin text-[#4E5A7A]" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="flex flex-col items-center py-8 text-center">
                        <Bell size={20} className="text-[#4E5A7A] mb-2" />
                        <p className="text-[0.8125rem] text-[#4E5A7A]">Sin notificaciones</p>
                      </div>
                    ) : (
                      notifications.map(notif => {
                        const { Icon: NIcon, color, bg } = getNotifConfig(notif.type)
                        return (
                          <button
                            key={notif._id}
                            onClick={() => {
                              if (!notif.read) {
                                markNotificationsRead([notif._id]).catch(() => {})
                                setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n))
                                setUnreadCount(c => Math.max(0, c - 1))
                              }
                              // Navigate to relevant admin page based on type
                              const txId = notif.data?.transactionId
                              if (txId) navigate(`/admin/ledger`)
                              else if (notif.type === 'admin_kyb_submitted') navigate('/admin/kyb')
                              setDropdownOpen(false)
                            }}
                            className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#1A2340]"
                            style={{ borderBottom: '1px solid #1A234066' }}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ background: bg }}
                            >
                              <NIcon size={14} style={{ color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`text-[0.8125rem] font-semibold truncate ${notif.read ? 'text-[#4E5A7A]' : 'text-white'}`}>
                                  {notif.title}
                                </p>
                                {!notif.read && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] flex-shrink-0" />
                                )}
                              </div>
                              <p className={`text-[0.75rem] leading-snug truncate ${notif.read ? 'text-[#3A4565]' : 'text-[#8A96B8]'}`}>
                                {notif.body}
                              </p>
                              <p className="text-[0.625rem] text-[#3A4565] mt-0.5">{timeAgo(notif.createdAt)}</p>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <button
                    onClick={() => { navigate('/admin/notifications'); setDropdownOpen(false) }}
                    className="w-full py-2.5 text-center text-[0.75rem] font-semibold text-[#F59E0B] hover:bg-[#1A2340] transition-colors"
                    style={{ borderTop: '1px solid #1F2B4D' }}
                  >
                    Ver todas las notificaciones
                  </button>
                </div>
              )}
            </div>

            {/* Admin name + avatar */}
            <div className="flex items-center gap-2">
              <span className="text-[0.75rem] text-[#4E5A7A]">{adminName}</span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[0.75rem] font-bold text-[#0F1628]"
                style={{ background: '#C4CBD8' }}
              >
                {adminName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Banner de saldos Vita — siempre visible */}
        {showBanner && (() => {
          const hasAlerts = alertBanner.alerts?.length > 0
          const isCrit    = alertBanner.alerts?.some(a => a.level === 'critical')
          const bg        = isCrit ? '#7F1D1D' : hasAlerts ? '#78350F' : '#1A2340'
          const border    = isCrit ? '#EF444455' : hasAlerts ? '#F59E0B55' : '#26305055'
          const labelColor = isCrit ? '#FCA5A5' : hasAlerts ? '#FCD34D' : '#8A96B8'
          const Icon      = isCrit ? AlertCircle : hasAlerts ? AlertTriangle : CheckCircle2
          const THRESHOLDS = {
            USD:  parseInt(import.meta.env.VITE_ALERT_THRESHOLD_USD  || '500', 10),
            CLP:  parseInt(import.meta.env.VITE_ALERT_THRESHOLD_CLP  || '500000', 10),
            USDT: parseInt(import.meta.env.VITE_ALERT_THRESHOLD_USDT || '500', 10),
            USDC: parseInt(import.meta.env.VITE_ALERT_THRESHOLD_USDC || '500', 10),
            COP:  parseInt(import.meta.env.VITE_ALERT_THRESHOLD_COP  || '2000000', 10),
          }
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
