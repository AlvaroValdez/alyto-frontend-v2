/**
 * AppNotifications.jsx — Orquestador de notificaciones push.
 *
 * Debe estar dentro de <AuthProvider> y <BrowserRouter> para acceder
 * a useAuth() y useNavigate().
 *
 * Responsabilidades:
 *  1. Tras login, verifica si mostrar el banner de permisos (1 vez/sesión, cooldown 24h)
 *  2. Configura el listener de notificaciones en primer plano (foreground)
 *  3. Gestiona la cola de toasts con auto-cierre a los 6 segundos
 *  4. Renderiza <NotificationBanner> y los <NotificationToast> activos
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePushNotifications } from '../hooks/usePushNotifications'
import NotificationBanner from './NotificationBanner'
import NotificationToast from './NotificationToast'

const TOAST_DURATION_MS = 6000

export default function AppNotifications() {
  const { isAuth } = useAuth()
  const navigate   = useNavigate()

  const {
    permission,
    showBanner,
    requestPermission,
    setupForegroundNotifications,
    triggerBannerCheck,
    dismissBanner,
  } = usePushNotifications()

  const [toasts, setToasts] = useState([])

  // ── Agregar toast con auto-cierre ────────────────────────────────────────
  const addToast = useCallback((payload) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, payload }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, TOAST_DURATION_MS)
    // Señalar a AppLayout que actualice el badge de no leídas
    window.dispatchEvent(new CustomEvent('alyto:notification-received'))
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // ── Efecto principal: activar tras login ─────────────────────────────────
  useEffect(() => {
    if (!isAuth) return
    if (!('Notification' in window)) return

    // Delay para asegurar que el componente está montado antes de mostrar el banner
    const timer = setTimeout(() => triggerBannerCheck(), 1500)

    // Escuchar notificaciones con la app en primer plano
    const cleanup = setupForegroundNotifications(addToast)
    return () => { clearTimeout(timer); cleanup?.() }
  }, [isAuth, triggerBannerCheck, setupForegroundNotifications, addToast])

  // ── Escuchar toasts manuales (desde cualquier componente) ───────────────
  useEffect(() => {
    if (!isAuth) return
    const handler = (e) => {
      const payload = e.detail ?? {}
      addToast(payload)
    }
    window.addEventListener('alyto:show-toast', handler)
    return () => window.removeEventListener('alyto:show-toast', handler)
  }, [isAuth, addToast])

  // ── Limpiar toasts al hacer logout ───────────────────────────────────────
  useEffect(() => {
    if (!isAuth) setToasts([])
  }, [isAuth])

  if (!isAuth) return null

  return (
    <>
      {/* Banner de solicitud de permisos — solo si permiso es "default" */}
      {showBanner && permission === 'default' && (
        <NotificationBanner
          onActivate={requestPermission}
          onDismiss={dismissBanner}
        />
      )}

      {/* Cola de toasts — esquina superior derecha */}
      {toasts.length > 0 && (
        <div
          className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-xs"
          aria-live="polite"
          aria-label="Notificaciones"
        >
          {toasts.map(({ id, payload }) => (
            <NotificationToast
              key={id}
              payload={payload}
              onDismiss={() => removeToast(id)}
              onNavigate={(txId) => {
                removeToast(id)
                navigate(`/transactions/${txId}`)
              }}
            />
          ))}
        </div>
      )}
    </>
  )
}
