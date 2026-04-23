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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
        <Loader2 size={24} style={{ color: 'var(--color-accent-teal)', animation: 'spin 1s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginBottom: 16 }}>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Notificaciones</h1>
        {hasUnread && (
          <button
            onClick={handleMarkAll}
            disabled={markingAll}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              color: 'var(--color-accent-teal)', fontSize: 'var(--font-sm)', fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer', opacity: markingAll ? 0.5 : 1,
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            {markingAll ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCheck size={13} />}
            Marcar todas
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 20px', textAlign: 'center' }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: 'var(--radius-xl)',
              background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}
          >
            <Bell size={24} style={{ color: 'var(--color-text-muted)' }} />
          </div>
          <p style={{ fontSize: 'var(--font-md)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            No tienes notificaciones
          </p>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)' }}>
            Las notificaciones de tus transacciones aparecerán aquí.
          </p>
        </div>
      ) : (
        <div
          style={{
            margin: '0 16px',
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-2xl)',
            overflow: 'hidden',
          }}
        >
          {notifications.map((notif, idx) => {
            const { Icon, color, bg } = getConfig(notif.type)
            return (
              <button
                key={notif._id}
                onClick={() => handleTap(notif)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '14px 16px', width: '100%', textAlign: 'left',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  borderBottom: idx < notifications.length - 1 ? '1px solid var(--color-border)' : 'none',
                  borderLeft: !notif.read ? '3px solid var(--color-accent-teal)' : '3px solid transparent',
                  transition: 'var(--transition-fast)', fontFamily: "'Manrope', sans-serif",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-elevated)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <div
                  style={{
                    width: 36, height: 36, borderRadius: 12, flexShrink: 0, marginTop: 2,
                    background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Icon size={16} style={{ color }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <p
                      style={{
                        fontSize: 'var(--font-base)', fontWeight: notif.read ? 500 : 700,
                        color: notif.read ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                    >
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent-teal)', flexShrink: 0 }} />
                    )}
                  </div>
                  <p style={{ fontSize: 'var(--font-sm)', lineHeight: 1.5, color: notif.read ? 'var(--color-text-muted)' : 'var(--color-text-secondary)' }}>
                    {notif.body}
                  </p>
                  <p style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
                    {timeAgo(notif.createdAt)}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {page < pages && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <button
            onClick={() => load(page + 1, true)}
            disabled={loadingMore}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 20px', borderRadius: 'var(--radius-lg)',
              background: 'var(--color-accent-teal-dim)', border: '1px solid var(--color-accent-teal-border)',
              color: 'var(--color-accent-teal)', fontSize: 'var(--font-sm)', fontWeight: 600,
              cursor: 'pointer', opacity: loadingMore ? 0.5 : 1, fontFamily: "'Manrope', sans-serif",
            }}
          >
            {loadingMore ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
            Cargar más
          </button>
        </div>
      )}
    </div>
  )
}
