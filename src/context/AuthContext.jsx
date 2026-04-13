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
} from '../services/api'
import Sentry from '../services/sentry.js'

// ── Contexto ───────────────────────────────────────────────────────────────

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,      setUser]      = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // ── Validación server-side: al montar, intentar /auth/me con la cookie ──
  useEffect(() => {
    getMe()
      .then(data => {
        setUser(data.user)
        Sentry.setUser({
          id:     data.user.id,
          email:  data.user.email,
          role:   data.user.role,
          entity: data.user.legalEntity,
        })
      })
      .catch(() => {
        // 401 o sin sesión → no autenticado
        setUser(null)
        Sentry.setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  // ── Listener de sesión expirada (401) disparado desde api.js ─────────────
  useEffect(() => {
    function handleUnauthorized() {
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
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Hook de acceso rápido al contexto de autenticación. */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
