/**
 * NotificationBanner.jsx — Banner no intrusivo de solicitud de permisos push.
 *
 * Aparece una vez por sesión, anclado en la parte superior de la pantalla,
 * con entrada animada. Respeta siempre la decisión del usuario.
 *
 * Props:
 *   onActivate — Callback al presionar "Activar" → llama requestPermission()
 *   onDismiss  — Callback al presionar "Ahora no" → oculta el banner
 */

import { Bell, X } from 'lucide-react'

export default function NotificationBanner({ onActivate, onDismiss }) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 px-4 pt-safe-top pt-4"
      style={{ animation: 'slideDown 0.3s ease-out' }}
    >
      <div className="bg-[#1A2340] border border-[#C4CBD833] rounded-2xl px-4 py-3 flex items-center gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">

        {/* Ícono */}
        <div className="w-9 h-9 rounded-xl bg-[#C4CBD81A] flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4 text-[#C4CBD8]" />
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold leading-tight">
            Activa las notificaciones
          </p>
          <p className="text-[#8A96B8] text-xs mt-0.5 leading-tight">
            Sabe cuándo llega tu transferencia
          </p>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onActivate}
            className="bg-[#C4CBD8] text-[#0F1628] text-xs font-bold px-3 py-1.5 rounded-lg
                       hover:bg-[#A8B0C0] active:scale-95 transition-all duration-150"
          >
            Activar
          </button>
          <button
            onClick={onDismiss}
            className="w-7 h-7 flex items-center justify-center rounded-lg
                       hover:bg-[#1F2B4D] active:bg-[#263050] transition-colors"
            aria-label="Ahora no"
          >
            <X className="w-3.5 h-3.5 text-[#4E5A7A]" />
          </button>
        </div>

      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
