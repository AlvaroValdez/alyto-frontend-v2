/**
 * AuthContext.jsx — Gestión de Estado de Autenticación Global
 *
 * Autenticación por cookie HttpOnly `alyto_token` (seteada por el backend).
 * No se almacena ningún token en localStorage/sessionStorage: la sesión
 * se determina exclusivamente mediante GET /auth/me al montar la app.
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import {
  loginUser    as apiLogin,
  registerUser as apiRegister,
  logoutUser   as apiLogout,
  getMe,
  saveAuthToken,
  clearAuthToken,
} from '../services/api'
import Sentry from '../services/sentry.js'

// ── Contexto ───────────────────────────────────────────────────────────────

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,      setUser]      = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  /**
   * refreshUser() — re-fetch /auth/me con la cookie actual y sincroniza estado.
   * Devuelve el user actualizado o null si la sesión ya no es válida.
   * No lanza: atrapa el 401 localmente (no queremos que dispare el redirect
   * global, el caller decide qué hacer con null).
   */
  const refreshUser = useCallback(async () => {
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

  // ── Validación server-side: al montar, intentar /auth/me con la cookie ──
  useEffect(() => {
    console.log('[Auth] VITE_AUTH_MODE env:', import.meta.env.VITE_AUTH_MODE)
    console.log('[Auth] token in storage:', localStorage.getItem('alyto_token')?.substring(0, 20) ?? 'none')
    refreshUser().finally(() => setIsLoading(false))
  }, [refreshUser])

  // ── Re-check de sesión al volver el foco (post-Stripe Identity redirect) ──
  // Cuando Stripe abre un tab/popup para KYC y el usuario vuelve a la app,
  // revalidamos la cookie para evitar quedar con un estado obsoleto.
  useEffect(() => {
    function onFocus() {
      if (document.visibilityState !== 'visible') return
      refreshUser()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [refreshUser])

  // ── Listener de sesión expirada (401) disparado desde api.js ─────────────
  useEffect(() => {
    function handleUnauthorized() {
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
   */
  const login = useCallback(async ({ rememberMe = true, ...credentials }) => {
    const data = await apiLogin({ ...credentials, rememberMe })
    saveAuthToken(data.token)
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
   */
  const register = useCallback(async (userData) => {
    const data = await apiRegister(userData)
    saveAuthToken(data.token)
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
