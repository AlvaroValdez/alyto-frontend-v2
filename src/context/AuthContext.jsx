/**
 * AuthContext.jsx — Gestión de Estado de Autenticación Global
 *
 * Provee: user, token, login(), register(), logout()
 * Persiste: token en localStorage bajo la clave 'alyto_token'.
 * El objeto `user` se reconstruye desde el token JWT (payload) sin
 * necesidad de un endpoint /me adicional para los datos básicos.
 */

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { loginUser as apiLogin, registerUser as apiRegister, getMe } from '../services/api'
import Sentry from '../services/sentry.js'

// ── Helpers ────────────────────────────────────────────────────────────────

const TOKEN_KEY = 'alyto_token'
const USER_KEY  = 'alyto_user'

/** Decodifica el payload del JWT sin verificar la firma (solo para el cliente). */
function decodeToken(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

/**
 * Lee el token guardado y devuelve { token, user, storage } o nulos.
 * Prioriza sessionStorage (sesiones no persistentes) sobre localStorage.
 */
function loadPersistedSession() {
  // Intentar sessionStorage primero (login sin rememberMe)
  for (const storage of [sessionStorage, localStorage]) {
    const token = storage.getItem(TOKEN_KEY)
    if (!token) continue

    const payload = decodeToken(token)
    if (!payload) { storage.removeItem(TOKEN_KEY); continue }

    // Verificar expiración
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      storage.removeItem(TOKEN_KEY)
      storage.removeItem(USER_KEY)
      continue
    }

    const savedUser = storage.getItem(USER_KEY)
    const user = savedUser ? JSON.parse(savedUser) : { id: payload.id }

    return { token, user, storage }
  }

  return { token: null, user: null, storage: null }
}

// ── Contexto ───────────────────────────────────────────────────────────────

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session,   setSession]   = useState(() => loadPersistedSession())
  const [isLoading, setIsLoading] = useState(true)

  // ── Validación server-side del token al montar la app ─────────────────────
  // Evita que tokens previos (de sesiones de testing) accedan al dashboard
  // sin verificación real con el backend.
  useEffect(() => {
    const { token, storage } = loadPersistedSession()

    if (!token) {
      setIsLoading(false)
      return
    }

    getMe()
      .then(data => {
        // Actualizar usuario con datos frescos de la DB
        const s = storage ?? localStorage
        s.setItem(USER_KEY, JSON.stringify(data.user))
        setSession(prev => ({ ...prev, user: data.user }))
        Sentry.setUser({ id: data.user.id, email: data.user.email })
      })
      .catch(() => {
        // Token inválido o expirado server-side → limpiar sesión
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        sessionStorage.removeItem(TOKEN_KEY)
        sessionStorage.removeItem(USER_KEY)
        setSession({ token: null, user: null, storage: null })
        Sentry.setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Listener de sesión expirada (401) disparado desde api.js ─────────────
  useEffect(() => {
    function handleUnauthorized() {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      sessionStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem(USER_KEY)
      setSession({ token: null, user: null, storage: null })
      Sentry.setUser(null)
      // Redirigir con flag para que LoginPage muestre el toast de sesión expirada
      window.location.href = '/login?expired=1'
    }
    window.addEventListener('alyto:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('alyto:unauthorized', handleUnauthorized)
  }, [])

  /**
   * Persiste la sesión en el storage elegido y actualiza el estado.
   * @param {string}  token       JWT recibido del backend
   * @param {object}  user        Perfil básico { id, email, legalEntity, kycStatus }
   * @param {boolean} [remember]  true → localStorage (default); false → sessionStorage
   */
  const persist = useCallback((token, user, remember = true) => {
    const storage = remember ? localStorage : sessionStorage
    storage.setItem(TOKEN_KEY, token)
    storage.setItem(USER_KEY, JSON.stringify(user))
    setSession({ token, user, storage })
    Sentry.setUser({
      id:     user.id,
      email:  user.email,
      role:   user.role,
      entity: user.legalEntity,
    })
  }, [])

  /**
   * login(credentials) — llama al backend y persiste la sesión.
   * @param {{ email: string, password: string, rememberMe?: boolean }} credentials
   * @returns {Promise<{ user, token }>}
   */
  const login = useCallback(async ({ rememberMe = true, ...credentials }) => {
    const data = await apiLogin({ ...credentials, rememberMe })
    persist(data.token, data.user, rememberMe)
    return data
  }, [persist])

  /**
   * register(userData) — crea la cuenta y persiste la sesión.
   * @param {{ email, password, country, firstName?, lastName?, phone? }} userData
   * @returns {Promise<{ user, token }>}
   */
  const register = useCallback(async (userData) => {
    const data = await apiRegister(userData)
    persist(data.token, data.user)
    return data
  }, [persist])

  /** logout() — limpia ambos storages y el estado. */
  const logout = useCallback(() => {
    window.Fintoc?.destroy?.()
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(USER_KEY)
    setSession({ token: null, user: null, storage: null })
    Sentry.setUser(null)
  }, [])

  /**
   * updateUser(partial) — actualiza campos del usuario en contexto sin re-login.
   * Útil cuando el backend confirma el KYC y devuelve el nuevo kycStatus.
   */
  const updateUser = useCallback((partial) => {
    setSession(prev => {
      const updated = { ...prev.user, ...partial }
      // Actualizar en el mismo storage donde está la sesión activa
      const storage = prev.storage ?? localStorage
      storage.setItem(USER_KEY, JSON.stringify(updated))
      return { ...prev, user: updated }
    })
  }, [])

  const value = {
    user:       session.user,
    token:      session.token,
    isAuth:     !!session.token,
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
