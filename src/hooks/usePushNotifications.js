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
import { messaging, getToken, onMessage, registerFirebaseSW } from '../services/firebase'
import { registerFcmToken } from '../services/api'

// ── Claves de storage ──────────────────────────────────────────────────────
const FCM_REGISTERED_KEY  = 'alyto_fcm_registered'
const FCM_TOKEN_KEY        = 'alyto_fcm_token'
const ASKED_AT_KEY        = 'alyto_notif_asked_at'
const BANNER_SHOWN_KEY    = 'alyto_notif_banner_shown'   // sessionStorage
const BANNER_DENIED_KEY   = 'alyto_notif_banner_denied'  // localStorage (permanente)
const BANNER_COOLDOWN_MS  = 24 * 60 * 60 * 1000         // 24 h

// VAPID key pública — generada en Firebase Console > Cloud Messaging
const VAPID_KEY = 'BHssXZMwSwImsxvw6h4V-l5lhnQbUbrl1d64t6t3iR5wxnoijY3M6K1bOQ2Yw7Oo3NS5bele6seI2MmY5KUCT-4'

// ── Helper ─────────────────────────────────────────────────────────────────
function getInitialPermission() {
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
    try {
      const saved = localStorage.getItem(FCM_TOKEN_KEY)
      if (saved && Notification.permission === 'granted') {
        setToken(saved)
        setPermission('granted')
      }
    } catch {}
  }, [])

  // ── requestPermission ──────────────────────────────────────────────────
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window) || !messaging) return

    try {
      // Pedir permiso solo si no está ya concedido
      if (Notification.permission !== 'granted') {
        const result = await Notification.requestPermission()
        setPermission(result)
        if (result !== 'granted') {
          setShowBanner(false)
          localStorage.removeItem(FCM_TOKEN_KEY)
          return
        }
      }

      // SIEMPRE intentar obtener token (aunque el permiso ya estuviera concedido)
      const swRegistration = await registerFirebaseSW()
      if (!swRegistration) {
        console.error('[Alyto FCM] SW registration unavailable — push will not work')
        setError('Service Worker registration failed')
        return
      }
      const fcmToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swRegistration,
      })

      if (!fcmToken) {
        console.error('[FCM_TOKEN] getToken returned null — cannot register push')
        setError('FCM token unavailable')
        return
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
        return
      }

      localStorage.setItem(FCM_REGISTERED_KEY, '1')
      localStorage.setItem(FCM_TOKEN_KEY, fcmToken)

      setToken(fcmToken)
      setShowBanner(false)
      // Marcar como aceptado permanentemente para no volver a mostrar el banner
      localStorage.setItem(BANNER_DENIED_KEY, 'accepted')
    } catch (err) {
      console.error('[FCM_TOKEN] requestPermission error:', err)
      setError(err.message)
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
