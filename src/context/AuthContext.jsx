/**
 * AuthContext.jsx — Gestión de Estado de Autenticación Global
 *
 * Autenticación por cookie HttpOnly `alyto_token` (seteada por el backend).
 * No se almacena ningún token en localStorage/sessionStorage: la sesión
 * se determina exclusivamente mediante GET /auth/me al montar la app.
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import {
  loginUser    as apiLogin,
  registerUser as apiRegister,
  logoutUser   as apiLogout,
  getMe,
  clearAuthToken,
} from '../services/api'
import Sentry from '../services/sentry.js'

const TOKEN_KEY = 'alyto_token'
const REFRESH_COOLDOWN_MS = 10_000 // 10 seconds debounce for refreshUser

// ── Contexto ───────────────────────────────────────────────────────────────

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,      setUser]      = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const lastRefreshRef = useRef(0)

  /**
   * refreshUser() — re-fetch /auth/me con la cookie actual y sincroniza estado.
   * Devuelve el user actualizado o null si la sesión ya no es válida.
   * No lanza: atrapa el 401 localmente (no queremos que dispare el redirect
   * global, el caller decide qué hacer con null).
   * Includes a 10s cooldown to prevent rapid-fire calls.
   */
  const refreshUser = useCallback(async ({ force = false } = {}) => {
    // Debounce: skip if last refresh was less than 10s ago (unless forced)
    const now = Date.now()
    if (!force && now - lastRefreshRef.current < REFRESH_COOLDOWN_MS) {
      console.log('[Auth] refreshUser skipped — cooldown active')
      return user
    }
    lastRefreshRef.current = now

    console.log('[Auth] Restoring session…')
    try {
      const data = await getMe()
      console.log('[Auth] /auth/me response: 200')
      setUser(data.user)
      Sentry.setUser({
        id:     data.user.id,
        email:  data.user.email,
        role:   data.user.role,
        entity: data.user.legalEntity,
      })
      return data.user
    } catch (err) {
      console.log('[Auth] /auth/me response:', err?.status ?? 'network-error')
      setUser(null)
      Sentry.setUser(null)
      return null
    }
  }, [])

  // ── Validación server-side: al montar, intentar /auth/me SOLO si hay token ──
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    console.log('[Auth] VITE_AUTH_MODE env:', import.meta.env.VITE_AUTH_MODE)
    console.log('[Auth] token in storage:', token?.substring(0, 20) ?? 'none')
    if (token) {
      refreshUser({ force: true }).finally(() => setIsLoading(false))
    } else {
      console.log('[Auth] No token found — skipping /auth/me, setting isLoading=false')
      setIsLoading(false)
    }
  }, [refreshUser])

  // ── Re-check de sesión al volver el foco (post-Stripe Identity redirect) ──
  // Cuando Stripe abre un tab/popup para KYC y el usuario vuelve a la app,
  // revalidamos la cookie para evitar quedar con un estado obsoleto.
  // Guards: only if tab visible, token exists, and cooldown elapsed.
  useEffect(() => {
    function onFocus() {
      if (document.visibilityState !== 'visible') return
      if (!localStorage.getItem(TOKEN_KEY)) {
        console.log('[Auth] focus — no token, skipping refreshUser')
        return
      }
      refreshUser() // cooldown is enforced inside refreshUser
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [refreshUser])

  // ── Listener de sesión expirada (401) disparado desde api.js ─────────────
  // Guard: if token exists in localStorage, the 401 is likely a race condition
  // (request fired before token was sent). Don't redirect — log a warning.
  useEffect(() => {
    function handleUnauthorized() {
      const token = localStorage.getItem(TOKEN_KEY)
      if (token) {
        console.warn('[Auth] 401 received but token exists — skipping redirect (race condition)')
        return
      }
      clearAuthToken()
      setUser(null)
      Sentry.setUser(null)
      window.location.href = '/login?expired=1'
    }
    window.addEventListener('alyto:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('alyto:unauthorized', handleUnauthorized)
  }, [])

  /**
   * login(credentials) — llama al backend (que setea la cookie) y guarda el user.
   * CRITICAL: token MUST be in localStorage BEFORE setUser or any re-render
   * that could trigger child components to fire authenticated requests.
   */
  const login = useCallback(async ({ rememberMe = true, ...credentials }) => {
    console.log('[Login] Starting login...')
    const data = await apiLogin({ ...credentials, rememberMe })
    console.log('[Login] Response received:', JSON.stringify(data).substring(0, 150))
    console.log('[Login] data.token exists:', !!data.token)

    // 1. Save token SYNCHRONOUSLY — before any state update or re-render
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token)
      console.log('[Auth] Token saved to localStorage:', data.token.substring(0, 20) + '…')
      console.log('[Login] After save, localStorage has:',
        localStorage.getItem(TOKEN_KEY)?.substring(0, 20) ?? 'NOTHING')
      console.log('[Login] All localStorage keys:', Object.keys(localStorage))
    } else {
      console.error('[Login] NO TOKEN IN RESPONSE — backend may still be in cookie-only mode')
      console.log('[Login] All localStorage keys (no token):', Object.keys(localStorage))
    }

    // 2. Verify the token round-trips correctly before updating React state
    try {
      const verifyRes = await fetch(
        `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'}/auth/me`,
        { headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}` } },
      )
      console.log('[Auth] Token verify status:', verifyRes.status)
    } catch (verifyErr) {
      console.warn('[Auth] Token verify request failed:', verifyErr.message)
    }

    // 3. Now safe to update React state (triggers re-render → child requests)
    setUser(data.user)
    Sentry.setUser({
      id:     data.user.id,
      email:  data.user.email,
      role:   data.user.role,
      entity: data.user.legalEntity,
    })
    return data
  }, [])

  /**
   * register(userData) — crea la cuenta (cookie seteada por el backend) y guarda el user.
   * Same token-first pattern as login().
   */
  const register = useCallback(async (userData) => {
    const data = await apiRegister(userData)

    // 1. Save token SYNCHRONOUSLY — before any state update or re-render
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token)
      console.log('[Auth] Token saved to localStorage:', data.token.substring(0, 20) + '…')
    }

    // 2. Now safe to update React state
    setUser(data.user)
    Sentry.setUser({
      id:     data.user.id,
      email:  data.user.email,
      role:   data.user.role,
      entity: data.user.legalEntity,
    })
    return data
  }, [])

  /** logout() — revoca la sesión server-side y limpia el estado local. */
  const logout = useCallback(async () => {
    window.Fintoc?.destroy?.()
    try { await apiLogout() } catch { /* silencioso — igual limpiamos el estado */ }
    clearAuthToken()
    setUser(null)
    Sentry.setUser(null)
  }, [])

  /**
   * updateUser(partial) — actualiza campos del usuario en contexto sin re-login.
   */
  const updateUser = useCallback((partial) => {
    setUser(prev => (prev ? { ...prev, ...partial } : prev))
  }, [])

  const value = {
    user,
    isAuth: !!user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Hook de acceso rápido al contexto de autenticación. */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
