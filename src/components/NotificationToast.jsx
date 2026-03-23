/**
 * NotificationToast.jsx — Toast de notificación push en primer plano.
 *
 * Se muestra cuando la app está abierta y llega un mensaje FCM.
 * Auto-cierra tras 6 segundos (el timer lo gestiona AppNotifications).
 *
 * Props:
 *   payload    — Objeto FCM { notification: { title, body }, data: { type, transactionId } }
 *   onDismiss  — Callback al cerrar el toast
 *   onNavigate — Callback(transactionId) para "Ver transacción"
 */

import { X, ArrowDownLeft, ArrowUpRight, Clock, AlertCircle, Bell } from 'lucide-react'

// ── Mapa de tipos de notificación ─────────────────────────────────────────
const TYPE_CONFIG = {
  payment_received: { Icon: ArrowDownLeft, color: '#22C55E', bg: '#22C55E1A' },
  payment_sent:     { Icon: ArrowUpRight,  color: '#C4CBD8', bg: '#C4CBD81A' },
  payment_pending:  { Icon: Clock,         color: '#C4CBD8', bg: '#C4CBD81A' },
  payment_failed:   { Icon: AlertCircle,   color: '#EF4444', bg: '#EF44441A' },
}

function getConfig(type) {
  return TYPE_CONFIG[type] ?? { Icon: Bell, color: '#C4CBD8', bg: '#C4CBD81A' }
}

// ── Componente ─────────────────────────────────────────────────────────────
export default function NotificationToast({ payload, onDismiss, onNavigate }) {
  const { notification = {}, data = {} } = payload
  const { Icon, color, bg } = getConfig(data.type)

  return (
    <div
      className="bg-[#1A2340] border border-[#263050] rounded-2xl p-4
                 shadow-[0_8px_40px_rgba(0,0,0,0.5)] w-full"
      style={{ animation: 'toastIn 0.25s ease-out' }}
    >
      <div className="flex items-start gap-3">

        {/* Ícono de tipo */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: bg }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          {notification.title && (
            <p className="text-white text-sm font-semibold leading-snug">
              {notification.title}
            </p>
          )}
          {notification.body && (
            <p className="text-[#8A96B8] text-xs mt-0.5 leading-snug">
              {notification.body}
            </p>
          )}
          {data.transactionId && (
            <button
              onClick={() => onNavigate(data.transactionId)}
              className="mt-2 text-[#C4CBD8] text-xs font-semibold hover:underline
                         focus:outline-none focus:underline"
            >
              Ver transacción →
            </button>
          )}
        </div>

        {/* Cerrar */}
        <button
          onClick={onDismiss}
          className="w-6 h-6 flex items-center justify-center rounded-lg shrink-0
                     hover:bg-[#1F2B4D] transition-colors"
          aria-label="Cerrar notificación"
        >
          <X className="w-3.5 h-3.5 text-[#4E5A7A]" />
        </button>

      </div>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
