/**
 * NotificationsPage.jsx — Centro de notificaciones del usuario.
 *
 * Lista paginada con indicadores de lectura, "marcar todas" y
 * navegación a transacción si la notificación incluye transactionId.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  Bell, CheckCircle2, ArrowDownLeft, ArrowUpRight, ArrowRightLeft,
  AlertCircle, Snowflake, Sun, Wallet, Loader2, CheckCheck,
  UserPlus, FileText, Send, Shield,
} from 'lucide-react'
import { fetchNotifications, markNotificationsRead } from '../../services/api'

// ── Mapa tipo → icono + colores (sincronizado con backend NOTIFICATIONS) ─────

const TYPE_CONFIG = {
  payin_confirmed:      { Icon: ArrowDownLeft,  color: '#1D9E75', bg: '#1D9E751A' },
  payment_completed:    { Icon: CheckCircle2,   color: '#1D9E75', bg: '#1D9E751A' },
  payout_sent:          { Icon: ArrowUpRight,   color: '#3B82F6', bg: '#3B82F61A' },
  payment_failed:       { Icon: AlertCircle,    color: '#EF4444', bg: '#EF44441A' },
  deposit_confirmed:    { Icon: ArrowDownLeft,  color: '#1D9E75', bg: '#1D9E751A' },
  withdrawal_requested: { Icon: ArrowUpRight,   color: '#F59E0B', bg: '#F59E0B1A' },
  wallet_frozen:        { Icon: Snowflake,      color: '#EF4444', bg: '#EF44441A' },
  wallet_unfrozen:      { Icon: Sun,            color: '#1D9E75', bg: '#1D9E751A' },
  p2p_received:         { Icon: Wallet,         color: '#1D9E75', bg: '#1D9E751A' },
  conversion_confirmed: { Icon: ArrowRightLeft, color: '#1D9E75', bg: '#1D9E751A' },
  conversion_rejected:  { Icon: AlertCircle,    color: '#EF4444', bg: '#EF44441A' },
  qr_payment:           { Icon: Wallet,         color: '#3B82F6', bg: '#3B82F61A' },
  kyc:                  { Icon: CheckCircle2,   color: '#F59E0B', bg: '#F59E0B1A' },
  system:               { Icon: Bell,           color: '#64748B', bg: '#64748B1A' },
  // ── Admin-facing ──
  transfer_initiated:      { Icon: ArrowUpRight,  color: '#233E58', bg: '#233E581A' },
  admin_new_user:          { Icon: UserPlus,      color: '#3B82F6', bg: '#3B82F61A' },
  admin_new_transaction:   { Icon: ArrowUpRight,  color: '#F59E0B', bg: '#F59E0B1A' },
  admin_deposit_request:   { Icon: ArrowDownLeft, color: '#F59E0B', bg: '#F59E0B1A' },
  admin_withdrawal_request:{ Icon: ArrowUpRight,  color: '#EF4444', bg: '#EF44441A' },
  admin_conversion_request:{ Icon: ArrowRightLeft,color: '#F59E0B', bg: '#F59E0B1A' },
  admin_kyb_submitted:     { Icon: Shield,        color: '#3B82F6', bg: '#3B82F61A' },
  admin_payment_proof:     { Icon: FileText,      color: '#1D9E75', bg: '#1D9E751A' },
  admin_p2p_transfer:      { Icon: Send,          color: '#3B82F6', bg: '#3B82F61A' },
}

function getConfig(type) {
  return TYPE_CONFIG[type] ?? { Icon: Bell, color: '#64748B', bg: '#64748B1A' }
}

// ── Tiempo relativo ──────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)

  if (mins < 1)  return 'Ahora'
  if (mins < 60) return `Hace ${mins} min`
  if (hours < 24) return `Hace ${hours}h`
  if (days < 7)  return `Hace ${days}d`
  return new Date(dateStr).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

// ── Componente ───────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [notifications, setNotifications] = useState([])
  const [page, setPage]         = useState(1)
  const [pages, setPages]       = useState(1)
  const [loading, setLoading]   = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [markingAll, setMarkingAll]   = useState(false)

  const hasUnread = notifications.some(n => !n.read)

  // ── Fetch notificaciones — solo si autenticado ─────────────────────────────

  const load = useCallback(async (p = 1, append = false) => {
    try {
      if (p === 1) setLoading(true)
      else setLoadingMore(true)

      const data = await fetchNotifications(p, 20)
      setNotifications(prev => append ? [...prev, ...data.notifications] : data.notifications)
      setPages(data.pages)
      setPage(p)
    } catch {
      // silencioso
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    load()
  }, [load, user])

  // ── Marcar todas como leidas ───────────────────────────────────────────────

  async function handleMarkAll() {
    try {
      setMarkingAll(true)
      await markNotificationsRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true, readAt: new Date().toISOString() })))
      window.dispatchEvent(new CustomEvent('alyto:notifications-read'))
    } catch {
      // silencioso
    } finally {
      setMarkingAll(false)
    }
  }

  // ── Marcar individual + navegar ────────────────────────────────────────────

  async function handleTap(notif) {
    // Marcar como leída si no lo está
    if (!notif.read) {
      markNotificationsRead([notif._id]).catch(() => {})
      setNotifications(prev =>
        prev.map(n => n._id === notif._id ? { ...n, read: true, readAt: new Date().toISOString() } : n),
      )
      window.dispatchEvent(new CustomEvent('alyto:notifications-read'))
    }

    // Navegar según tipo y payload
    const isAdminNotif = typeof notif.type === 'string' && notif.type.startsWith('admin_')
    const adminTxId = notif.data?.txId
    if (isAdminNotif && adminTxId) {
      navigate(`/admin/ledger?tx=${adminTxId}`)
      return
    }

    const txId  = notif.data?.transactionId ?? notif.data?.txId
    const wtxId = notif.data?.wtxId
    if (txId) navigate(`/transactions/${txId}`)
    else if (wtxId) navigate(`/wallet`)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-[#233E58]" />
      </div>
    )
  }

  return (
    <div className="py-4">
      {/* Header */}
      <div className="flex items-center justify-between px-5 mb-4">
        <h1 className="text-[1.125rem] font-bold text-[#0F172A]">Notificaciones</h1>
        {hasUnread && (
          <button
            onClick={handleMarkAll}
            disabled={markingAll}
            className="flex items-center gap-1.5 text-[#233E58] text-[0.8125rem] font-semibold disabled:opacity-50"
          >
            {markingAll ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
            Marcar todas
          </button>
        )}
      </div>

      {/* Lista */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-5">
          <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mb-4">
            <Bell size={24} className="text-[#94A3B8]" />
          </div>
          <p className="text-[0.9375rem] font-semibold text-[#0F172A] mb-1">No tienes notificaciones</p>
          <p className="text-[0.8125rem] text-[#64748B]">Las notificaciones de tus transacciones y wallet apareceran aqui.</p>
        </div>
      ) : (
        <div className="mx-4 bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden divide-y divide-[#E2E8F0]">
          {notifications.map(notif => {
            const { Icon, color, bg } = getConfig(notif.type)
            return (
              <button
                key={notif._id}
                onClick={() => handleTap(notif)}
                className="w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#F8FAFC] active:bg-[#F1F5F9]"
              >
                {/* Icono */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: bg }}
                >
                  <Icon size={16} style={{ color }} />
                </div>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`text-[0.875rem] font-semibold truncate ${notif.read ? 'text-[#64748B]' : 'text-[#0F172A]'}`}>
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-[#1D9E75] flex-shrink-0" />
                    )}
                  </div>
                  <p className={`text-[0.8125rem] leading-snug ${notif.read ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                    {notif.body}
                  </p>
                  <p className="text-[0.6875rem] text-[#94A3B8] mt-1">{timeAgo(notif.createdAt)}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Cargar mas */}
      {page < pages && (
        <div className="flex justify-center mt-4">
          <button
            onClick={() => load(page + 1, true)}
            disabled={loadingMore}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#233E581A] text-[#233E58] text-[0.8125rem] font-semibold disabled:opacity-50"
          >
            {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
            Cargar mas
          </button>
        </div>
      )}
    </div>
  )
}
