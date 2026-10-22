/**
 * usePushNotifications.js — Hook para gestión de notificaciones push FCM.
 *
 * API pública:
 *   permission        — "default" | "granted" | "denied"
 *   token             — String FCM | null
 *   error             — String | null
 *   showBanner        — Boolean (controla el banner de solicitud)
 *   requestPermission()           — Pide permiso y registra el token en el backend
 *   setupForegroundNotifications(onPayload) — Escucha mensajes con app abierta
 *   triggerBannerCheck()          — Evalúa si mostrar el banner (llamar tras login)
 *   dismissBanner()               — Oculta el banner por la sesión actual
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { messaging, getToken, onMessage, registerFirebaseSW, VAPID_KEY } from '../services/firebase'
import { registerFcmToken } from '../services/api'
import {
  isNativePlatform,
  requestNativePushPermission,
  checkNativePushPermission,
  FCM_TOKEN_KEY,
  PUSH_TOKEN_EVENT,
} from '../native/nativePush'

const IS_NATIVE = isNativePlatform()

// ── Claves de storage ──────────────────────────────────────────────────────
const FCM_REGISTERED_KEY  = 'alyto_fcm_registered'
const ASKED_AT_KEY        = 'alyto_notif_asked_at'
const BANNER_SHOWN_KEY    = 'alyto_notif_banner_shown'   // sessionStorage
const BANNER_DENIED_KEY   = 'alyto_notif_banner_denied'  // localStorage (permanente)
const BANNER_COOLDOWN_MS  = 24 * 60 * 60 * 1000         // 24 h

// ── Helper ─────────────────────────────────────────────────────────────────
function getInitialPermission() {
  // En nativo el permiso lo resuelve el plugin de push (async, vía efecto).
  // Partimos de 'default' para no bloquear el banner antes de comprobarlo.
  if (IS_NATIVE) return 'default'
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied'
  return Notification.permission
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function usePushNotifications() {
  const [permission, setPermission] = useState(getInitialPermission)
  const [token,      setToken]      = useState(null)
  const [error,      setError]      = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const unsubRef = useRef(null)

  // ── Hydrate token from localStorage on mount ───────────────────────────
  useEffect(() => {
    if (IS_NATIVE) {
      // En nativo el token lo emite el plugin por el listener 'registration'.
      // Se recoge por los dos lados porque puede llegar antes o después de este
      // montaje: lo ya guardado, y el aviso del que llegue a partir de ahora.
      checkNativePushPermission().then((p) => {
        setPermission(p === 'prompt' ? 'default' : p)
      }).catch(() => {})
      try {
        const guardado = localStorage.getItem(FCM_TOKEN_KEY)
        if (guardado) setToken(guardado)
      } catch { /* modo privado */ }
      const alLlegarToken = (e) => setToken(e.detail)
      window.addEventListener(PUSH_TOKEN_EVENT, alLlegarToken)
      return () => window.removeEventListener(PUSH_TOKEN_EVENT, alLlegarToken)
    }
    try {
      const saved = localStorage.getItem(FCM_TOKEN_KEY)
      if (saved && Notification.permission === 'granted') {
        setToken(saved)
        setPermission('granted')
      }
    } catch {}
  }, [])

  // ── Detectar cambios de permisos en settings del navegador ────────────
  // El usuario puede cambiar el permiso sin recargar (en Chrome settings).
  // Usamos PermissionStatus API si existe; si no, polling liviano cada 5s.
  useEffect(() => {
    if (IS_NATIVE) return  // permisos nativos no usan la Permissions API web
    if (typeof window === 'undefined' || !('Notification' in window)) return

    let cleanup = () => {}
    // Flag de cancelación: si el componente se desmonta antes de que la promesa
    // resuelva, el .then NO debe registrar listener/interval (quedaba huérfano
    // para siempre — memory leak, audit 2026-06-11).
    let cancelled = false

    if (navigator.permissions?.query) {
      navigator.permissions.query({ name: 'notifications' }).then((status) => {
        if (cancelled) return
        const handleChange = () => {
          const newPermission = status.state === 'prompt' ? 'default' : status.state
          setPermission(newPermission)
          // Si el usuario acaba de conceder permisos en settings → auto-registrar
          if (newPermission === 'granted') {
            requestPermission()
          }
        }
        status.addEventListener('change', handleChange)
        cleanup = () => status.removeEventListener('change', handleChange)
      }).catch(() => {
        if (cancelled) return
        // Fallback: polling cada 5s si PermissionStatus no está disponible
        const id = setInterval(() => {
          const current = Notification.permission
          setPermission(prev => {
            if (prev !== current) {
              if (current === 'granted') requestPermission()
              return current
            }
            return prev
          })
        }, 5000)
        cleanup = () => clearInterval(id)
      })
    }

    return () => { cancelled = true; cleanup() }
  // requestPermission se define con useCallback y es estable — no genera loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── requestPermission ──────────────────────────────────────────────────
  const requestPermission = useCallback(async () => {
    // ── Camino nativo (Capacitor + FCM nativo) ──────────────────────────
    if (IS_NATIVE) {
      try {
        const result = await requestNativePushPermission()
        const estado = result === 'granted' ? 'granted' : 'denied'
        setPermission(estado)
        setShowBanner(false)
        localStorage.setItem(
          BANNER_DENIED_KEY,
          result === 'granted' ? 'accepted' : 'dismissed',
        )
        // Se DEVUELVE el resultado, no solo se guarda en el estado de React:
        // quien llama lo necesita inmediatamente despues del await, y ahi su
        // variable de `permission` sigue siendo la del render anterior. En web
        // se leia `Notification.permission`, un global vivo, y por eso nunca se
        // noto. El valor es "se pudo activar", que es la pregunta real de quien
        // llama, y no solo el permiso: en web hace falta ademas el token.
        return estado === 'granted'
      } catch (err) {
        console.error('[NativePush] requestPermission error:', err?.message)
        setError(err?.message ?? 'No se pudo habilitar las notificaciones.')
        return false
      }
    }

    if (!('Notification' in window) || !messaging) return false

    try {
      // Pedir permiso solo si no está ya concedido
      if (Notification.permission !== 'granted') {
        const result = await Notification.requestPermission()
        setPermission(result)
        if (result !== 'granted') {
          setShowBanner(false)
          localStorage.removeItem(FCM_TOKEN_KEY)
          return false
        }
      }

      // SIEMPRE intentar obtener token (aunque el permiso ya estuviera concedido)
      const swRegistration = await registerFirebaseSW()
      if (!swRegistration) {
        console.error('[Alyto FCM] SW registration unavailable — push will not work')
        setError('Service Worker registration failed')
        return false
      }
      const fcmToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration,
      })

      if (!fcmToken) {
        console.error('[FCM_TOKEN] getToken returned null — cannot register push')
        setError('FCM token unavailable')
        return false
      }

      // Siempre enviamos el token al backend: la autoridad sobre qué tokens
      // están vigentes vive en el servidor (fcmTokens array en User). El
      // backend usa $addToSet para evitar duplicados, así que reenviar el
      // mismo token es idempotente.
      try {
        await registerFcmToken(fcmToken)
      } catch (err) {
        console.error('[FCM] Token registration failed:', err.message)
        setError('No se pudo habilitar las notificaciones. Intenta de nuevo.')
        return false
      }

      localStorage.setItem(FCM_REGISTERED_KEY, '1')
      localStorage.setItem(FCM_TOKEN_KEY, fcmToken)

      setToken(fcmToken)
      setShowBanner(false)
      // Marcar como aceptado permanentemente para no volver a mostrar el banner
      localStorage.setItem(BANNER_DENIED_KEY, 'accepted')
      return true
    } catch (err) {
      console.error('[FCM_TOKEN] requestPermission error:', err)
      setError(err.message)
      return false
    }
  }, [])

  // ── setupForegroundNotifications ───────────────────────────────────────
  /**
   * Registra un listener para mensajes recibidos con la app en primer plano.
   * @param {(payload: object) => void} onPayload — Callback con el payload FCM
   * @returns {() => void} Función de limpieza para useEffect
   */
  const setupForegroundNotifications = useCallback((onPayload) => {
    if (!messaging) return () => {}

    // Cancelar listener previo antes de registrar uno nuevo
    if (unsubRef.current) unsubRef.current()

    unsubRef.current = onMessage(messaging, onPayload)

    return () => {
      if (unsubRef.current) {
        unsubRef.current()
        unsubRef.current = null
      }
    }
  }, [])

  // ── triggerBannerCheck ─────────────────────────────────────────────────
  /**
   * Evalúa si corresponde mostrar el banner de solicitud de permisos.
   * Reglas:
   *  - Navegador soporta notificaciones
   *  - Permiso todavía es "default" (no decidido)
   *  - El usuario no ha aceptado/negado permanentemente
   *  - No se ha mostrado en esta sesión
   *  - Han pasado más de 24 h desde la última vez que se preguntó
   */
  const triggerBannerCheck = useCallback(() => {
    // ── Camino nativo: decidir el banner según el permiso del sistema ────
    if (IS_NATIVE) {
      const denied = localStorage.getItem(BANNER_DENIED_KEY)
      if (denied === 'accepted') return
      if (denied === 'dismissed') {
        const lastAsked = Number(localStorage.getItem(ASKED_AT_KEY) || 0)
        if (Date.now() - lastAsked < BANNER_COOLDOWN_MS) return
      }
      checkNativePushPermission().then((p) => {
        if (p === 'prompt' || p === 'default') {
          setShowBanner(true)
          sessionStorage.setItem(BANNER_SHOWN_KEY, 'true')
          localStorage.setItem(ASKED_AT_KEY, String(Date.now()))
        } else if (p === 'granted') {
          // Ya concedido (ej. reinstalación) → re-registrar token en backend.
          requestNativePushPermission().catch(() => {})
          setPermission('granted')
        }
      }).catch(() => {})
      return
    }

    if (!('Notification' in window))           return
    if (Notification.permission !== 'default') return
    // Solo bloquear si el usuario explícitamente dismisseó:
    // 'accepted' → ya aceptó, no mostrar más
    // 'dismissed' → cerró, respetar cooldown de 24h
    const denied = localStorage.getItem(BANNER_DENIED_KEY)
    if (denied === 'accepted') return
    if (denied === 'dismissed') {
      const lastAsked = Number(localStorage.getItem(ASKED_AT_KEY) || 0)
      if (Date.now() - lastAsked < BANNER_COOLDOWN_MS) return
    }

    setShowBanner(true)
    sessionStorage.setItem(BANNER_SHOWN_KEY, 'true')
    localStorage.setItem(ASKED_AT_KEY, String(Date.now()))
  }, [])

  // ── dismissBanner ──────────────────────────────────────────────────────
  const dismissBanner = useCallback(() => {
    setShowBanner(false)
    // Guardar "negado" para no volver a preguntar en futuras sesiones
    // (respeta la decisión del usuario; no idéntico a "denied" del sistema)
    localStorage.setItem(BANNER_DENIED_KEY, 'dismissed')
  }, [])

  // ── clearToken ──────────────────────────────────────────────────────────
  const clearToken = useCallback(() => {
    setToken(null)
    try {
      localStorage.removeItem(FCM_REGISTERED_KEY)
      localStorage.removeItem(FCM_TOKEN_KEY)
    } catch {}
  }, [])

  return {
    permission,
    token,
    error,
    showBanner,
    requestPermission,
    setupForegroundNotifications,
    triggerBannerCheck,
    dismissBanner,
    clearToken,
  }
}
