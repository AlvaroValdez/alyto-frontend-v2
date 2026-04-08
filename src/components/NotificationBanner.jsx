/**
 * NotificationBanner.jsx — Banner de solicitud de permisos push.
 *
 * Posición: fixed en la parte inferior, encima del bottom nav (bottom: 72px).
 * Color teal (#1D9E75) para máxima visibilidad en el tema oscuro de Alyto.
 *
 * Props:
 *   onActivate — Callback al presionar "Activar" → llama requestPermission()
 *   onDismiss  — Callback al presionar "×" → oculta el banner
 */

import { Bell } from 'lucide-react'

export default function NotificationBanner({ onActivate, onDismiss }) {
  return (
    <div
      style={{
        position:   'fixed',
        bottom:     '72px',   // encima del bottom nav
        left:       0,
        right:      0,
        zIndex:     50,
        background: '#1D9E75',
        padding:    '12px 16px',
        display:    'flex',
        alignItems: 'center',
        gap:        '12px',
        boxShadow:  '0 -2px 12px rgba(0,0,0,0.20)',
        animation:  'slideUp 0.3s ease-out',
      }}
    >
      <Bell size={20} color="white" style={{ flexShrink: 0 }} />

      <p style={{
        flex:       1,
        color:      'white',
        fontSize:   '0.8125rem',
        margin:     0,
        lineHeight: 1.4,
        fontWeight: 500,
      }}>
        Activa las notificaciones para recibir alertas de tus pagos
      </p>

      <button
        onClick={onActivate}
        style={{
          background:   'white',
          color:        '#1D9E75',
          border:       'none',
          borderRadius: '20px',
          padding:      '6px 14px',
          fontSize:     '0.8125rem',
          fontWeight:   700,
          cursor:       'pointer',
          flexShrink:   0,
        }}
      >
        Activar
      </button>

      <button
        onClick={onDismiss}
        style={{
          background: 'transparent',
          border:     'none',
          color:      'rgba(255,255,255,0.8)',
          cursor:     'pointer',
          padding:    '4px',
          fontSize:   '20px',
          lineHeight: 1,
          flexShrink: 0,
        }}
        aria-label="Cerrar"
      >
        ×
      </button>

      {import.meta.env.DEV && (
        <button
          onClick={() => {
            localStorage.removeItem('alyto_notif_banner_denied')
            localStorage.removeItem('alyto_notif_asked_at')
            sessionStorage.removeItem('alyto_notif_banner_shown')
            window.location.reload()
          }}
          style={{
            background:   'rgba(0,0,0,0.2)',
            border:       'none',
            borderRadius: '8px',
            color:        'rgba(255,255,255,0.7)',
            cursor:       'pointer',
            padding:      '4px 8px',
            fontSize:     '0.625rem',
            flexShrink:   0,
          }}
        >
          Reset
        </button>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
