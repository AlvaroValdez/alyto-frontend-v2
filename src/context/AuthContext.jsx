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

// ── Plazo de inactividad: fuente de verdad única ───────────────────────────
// Este es el ÚNICO lugar donde se decide cuánto dura una sesión inactiva. El
// default de 10 min es el valor que declara la Política de Privacidad (sección
// 8 "Seguridad y Sesión", en es/en/pt): si se cambia aquí, hay que actualizar
// ese texto en los tres idiomas o queda desalineado.
const IDLE_MIN        = Number(import.meta.env.VITE_IDLE_TIMEOUT_MIN) || 10
const IDLE_TIMEOUT_MS = IDLE_MIN * 60 * 1000
// La advertencia se muestra 60s antes del cierre, nunca más de la mitad del
// plazo: con VITE_IDLE_TIMEOUT_MIN=1 un aviso de 60s saldría en el instante 0.
const IDLE_WARNING_MS = Math.min(60_000, IDLE_TIMEOUT_MS / 2)
/** Marca de la ultima actividad, en disco: sobrevive al cierre de la app. */
const IDLE_LAST_KEY = 'alyto_last_activity'

// ── Contexto ───────────────────────────────────────────────────────────────

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,      setUser]      = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  /**
   * Credencial intermedia del segundo factor: { token, enrollmentRequired, rememberMe }.
   *
   * Vive SOLO en memoria, a propósito. Guardarla en localStorage la pondría en el
   * mismo lugar que la sesión y sobreviviría al cierre de la pestaña; vale cinco
   * minutos y sólo sirve para presentar un código. Recargar la página en mitad de
   * la verificación devuelve al acceso, que es el comportamiento correcto.
   */
  const [challenge, setChallenge] = useState(null)
  /**
   * Segundos que quedan antes del cierre por inactividad, o null si no hay
   * advertencia activa. Un solo dato codifica las dos cosas que necesita la UI:
   * si mostrar el modal (!== null) y qué número pintar.
   */
  const [idleCountdown, setIdleCountdown] = useState(null)
  const lastRefreshRef   = useRef(0)
  const justLoggedInRef  = useRef(false) // prevents stale-token clear right after fresh login
  const idleRearmRef     = useRef(null)  // rearma el contador; lo expone continueIdleSession

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
      return user
    }
    lastRefreshRef.current = now

    try {
      const data = await getMe()
      setUser(data.user)
      Sentry.setUser({
        id:     data.user.id,
        email:  data.user.email,
        role:   data.user.role,
        entity: data.user.legalEntity,
      })
      return data.user
    } catch (err) {
      if (err?.status === 401) {
        if (justLoggedInRef.current) {
          console.warn('[Auth] /auth/me failed but just logged in — skipping token clear')
          return null
        }
        localStorage.removeItem(TOKEN_KEY)
      }
      setUser(null)
      Sentry.setUser(null)
      return null
    }
  }, [])

  // ── Validación server-side: al montar, intentar /auth/me SOLO si hay token ──
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      refreshUser({ force: true }).finally(() => setIsLoading(false))
    } else {
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
      if (justLoggedInRef.current) return
      if (!localStorage.getItem(TOKEN_KEY)) return
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
    function handleUnauthorized(evento) {
      const code = evento?.detail?.code ?? null

      // El servidor puede decir que la sesión está muerta de forma inequívoca.
      // En ese caso el token que sigue en localStorage ES el token muerto, así
      // que el guardián de carrera NO debe aplicarse: si lo hiciera, al usuario
      // expulsado no se le redirige a ninguna parte y se queda en una pantalla
      // que falla una y otra vez sin explicación.
      const revocacionExplicita = code === 'SESSION_REPLACED'
                               || code === 'SESSION_REVOKED'
                               || code === 'TOKEN_VERSION_MISMATCH'

      const token = localStorage.getItem(TOKEN_KEY)
      if (token && !revocacionExplicita) {
        // 401 ambiguo con token presente: puede ser una petición en vuelo que
        // llega justo después de renovar la sesión. Ahí sí conviene esperar.
        console.warn('[Auth] 401 sin código de revocación y con token presente — posible carrera, no se redirige')
        return
      }

      localStorage.removeItem(TOKEN_KEY)
      setUser(null)
      Sentry.setUser(null)
      // `motivo` en vez de `expired=1`: el usuario merece saber si su sesión
      // caducó sola o si alguien entró con sus credenciales desde otro equipo.
      // Esa segunda frase es una señal de seguridad y confundirla con la
      // primera la desperdicia.
      const motivo = code === 'SESSION_REPLACED' ? 'otro-dispositivo' : 'expirada'
      window.location.replace(`/login?motivo=${motivo}`)
    }
    window.addEventListener('alyto:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('alyto:unauthorized', handleUnauthorized)
  }, [])

  /**
   * finishLogin(data) — establece la sesión a partir de una respuesta que ya
   * trae token y usuario. Lo comparten el acceso directo y el cierre del segundo
   * factor: son dos caminos hacia la misma sesión, y duplicar el orden de estos
   * pasos invitaría a que uno de los dos se quedara atrás.
   *
   * CRITICAL: token MUST be in localStorage BEFORE setUser or any re-render
   * that could trigger child components to fire authenticated requests.
   */
  const finishLogin = useCallback((data) => {
    // 1. Raise the justLoggedIn guard FIRST — prevents stale-token clear on
    //    any /auth/me that fires in the next 5s (focus, mount, etc.)
    justLoggedInRef.current = true
    setTimeout(() => { justLoggedInRef.current = false }, 5000)

    // 2. Save token SYNCHRONOUSLY — before any state update or re-render
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token)
    } else {
      console.error('[Auth] NO TOKEN IN RESPONSE — backend may still be in cookie-only mode')
    }

    // 3. Update React state — the response already contains the full user object
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
   * login(credentials) — llama al backend (que setea la cookie) y guarda el user.
   */
  const login = useCallback(async ({ rememberMe = true, ...credentials }) => {
    const data = await apiLogin({ ...credentials, rememberMe })

    // Acceso con privilegios: la contraseña fue correcta pero NO hay sesión
    // todavía. Se devuelve tal cual para que la pantalla derive al segundo
    // factor, sin tocar el estado de sesión.
    //
    // Este corte va ANTES que todo lo demás por una razón concreta: abajo se lee
    // `data.user.id` sin guarda, y una respuesta de segundo factor no trae
    // `user`. Sin este retorno temprano eso lanzaba un TypeError que el
    // formulario de acceso atrapaba y mostraba como «Email o contraseña
    // incorrectos» — el peor mensaje posible, porque la contraseña era correcta
    // y el operador habría dado la suya por perdida.
    if (data?.twoFactorRequired) {
      setChallenge({
        token:              data.challengeToken,
        enrollmentRequired: data.enrollmentRequired === true,
        rememberMe,
      })
      return data
    }

    return finishLogin(data)
  }, [finishLogin])

  /**
   * completeTwoFactor(data) — cierra el acceso con la respuesta del segundo
   * factor, que trae la sesión ya emitida. Comparte `finishLogin` con el acceso
   * directo para que la sesión se establezca igual por los dos caminos.
   */
  const completeTwoFactor = useCallback((data) => {
    setChallenge(null)
    return finishLogin(data)
  }, [finishLogin])

  /** Descarta la credencial intermedia (cancelar, vencimiento o volver atrás). */
  const clearChallenge = useCallback(() => setChallenge(null), [])

  /**
   * register(userData) — crea la cuenta (cookie seteada por el backend) y guarda el user.
   * Same token-first pattern as login().
   */
  const register = useCallback(async (userData) => {
    const data = await apiRegister(userData)

    justLoggedInRef.current = true
    setTimeout(() => { justLoggedInRef.current = false }, 5000)

    // 1. Save token SYNCHRONOUSLY — before any state update or re-render
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token)
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

  /** logout() — revoca la sesión server-side y limpia el estado local.
   *  No navega — el caller (AppLayout) maneja la redirección vía useNavigate.
   */
  const logout = useCallback(async () => {
    window.Fintoc?.destroy?.()
    try {
      await apiLogout()
    } catch (err) {
      console.warn('[Auth] Logout API failed:', err.message)
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      setUser(null)
      Sentry.setUser(null)
    }
  }, [])

  // ── Cierre de sesión por inactividad ──────────────────────────────────────
  // El JWT del backend dura 24h fijo (sin idle-timeout server-side). Para que
  // una sesión no quede abierta indefinidamente, el frontend corta en dos pasos
  // sobre un MISMO plazo (IDLE_TIMEOUT_MS):
  //   · en T-IDLE_WARNING_MS abre la advertencia con cuenta atrás (la pinta
  //     AppLayout leyendo idleCountdown de este contexto), y
  //   · en T revoca server-side (logout) y redirige a /login?expired=1,
  //     el mismo destino que el 401 global.
  // Antes esto vivían dos mecanismos con defaults distintos (10 min aquí, 30
  // min en un hook aparte) y el cierre duro se adelantaba siempre al aviso, así
  // que la advertencia no llegaba a verse nunca.
  useEffect(() => {
    if (!user) return // solo con sesión activa

    const THROTTLE_MS = 1000 // no reprogramar el timer más de 1×/s

    let warnId    = null
    let tickId    = null
    let lastReset = 0
    let warning   = false // durante la advertencia la actividad no rearma
    // Instante real de la última actividad. Los temporizadores no bastan: ver
    // el control de reanudación más abajo.
    // La marca se PERSISTE, no vive solo en memoria.
    //
    // Guardarla en memoria cubria el paso a segundo plano, pero no el caso que
    // reportaron los probadores: al reiniciar el telefono el proceso muere, al
    // abrir de nuevo esta variable volvia a cero y la sesion sobrevivia intacta
    // por mucho tiempo que hubiera pasado. Con la marca en disco, el arranque en
    // frio se compara igual que la vuelta de segundo plano.
    const leerUltimaActividad = () => {
      const v = Number(localStorage.getItem(IDLE_LAST_KEY))
      return Number.isFinite(v) && v > 0 ? v : Date.now()
    }
    const guardarUltimaActividad = (t) => {
      try { localStorage.setItem(IDLE_LAST_KEY, String(t)) } catch { /* modo privado */ }
    }

    let ultimaActividad = leerUltimaActividad()

    // Arranque en frio: si ya vencio mientras la app estaba cerrada, se cierra
    // ahora. Se comprueba antes de armar nada, para no dar un plazo nuevo.
    if (Date.now() - ultimaActividad >= IDLE_TIMEOUT_MS) {
      logout().finally(() => window.location.replace('/login?expired=1'))
      return
    }

    const clearTimers = () => {
      if (warnId) clearTimeout(warnId)
      if (tickId) clearInterval(tickId)
      warnId = null
      tickId = null
    }

    const onIdle = async () => {
      clearTimers()
      try {
        await logout()
      } finally {
        window.location.replace('/login?expired=1')
      }
    }

    const openWarning = () => {
      warning = true
      // Cuenta atrás contra un instante fijo, no restando 1 por tick: en una
      // pestaña de fondo el navegador estrangula los timers y un contador
      // incremental se desviaría del cierre real.
      const deadline = Date.now() + IDLE_WARNING_MS
      const paint = () => {
        const left = Math.ceil((deadline - Date.now()) / 1000)
        if (left <= 0) {
          onIdle()
          return
        }
        setIdleCountdown(left)
      }
      paint()
      tickId = setInterval(paint, 1000)
    }

    const arm = () => {
      clearTimers()
      warning = false
      setIdleCountdown(null)
      warnId = setTimeout(openWarning, IDLE_TIMEOUT_MS - IDLE_WARNING_MS)
    }

    const onActivity = () => {
      // Con la advertencia abierta sólo la reanuda el botón "Continuar": un
      // mousemove accidental no debe silenciar el aviso y dejar la sesión viva.
      if (warning) return
      const now = Date.now()
      if (now - lastReset < THROTTLE_MS) return // throttle: evita coste en mousemove
      lastReset = now
      ultimaActividad = now
      guardarUltimaActividad(now)
      arm()
    }

    // ── Reanudación: el reloj manda sobre los temporizadores ────────────────
    // En Android, al pasar la app a segundo plano el WebView CONGELA los
    // setTimeout. Al volver, el temporizador reanuda donde se quedó, así que una
    // sesión dejada toda la noche seguía abierta: el cierre por inactividad
    // sencillamente no ocurría en el teléfono, que es donde se reportó.
    //
    // Por eso al recuperar el primer plano no se confía en el temporizador: se
    // compara el tiempo transcurrido de verdad contra el plazo y, si ya venció,
    // se cierra en el acto. Si no venció, se rearma por el tiempo que quede.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const inactivo = Date.now() - ultimaActividad
      if (inactivo >= IDLE_TIMEOUT_MS) {
        onIdle()
        return
      }
      const restante = IDLE_TIMEOUT_MS - inactivo
      clearTimers()
      warning = false
      setIdleCountdown(null)
      if (restante <= IDLE_WARNING_MS) openWarning()
      else warnId = setTimeout(openWarning, restante - IDLE_WARNING_MS)
    }

    const EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    EVENTS.forEach(e => window.addEventListener(e, onActivity, { passive: true }))
    document.addEventListener('visibilitychange', onVisible)
    idleRearmRef.current = () => {
      ultimaActividad = Date.now()
      guardarUltimaActividad(ultimaActividad)
      arm()
    }
    // Se sella la marca al montar, no solo con la primera interaccion: si el
    // usuario abre la app y la deja sin tocar, sin esto no habria marca que
    // comparar en el siguiente arranque y la sesion quedaria sin plazo.
    guardarUltimaActividad(ultimaActividad)
    arm() // inicia el contador al montar / al haber sesión

    return () => {
      clearTimers()
      idleRearmRef.current = null
      setIdleCountdown(null)
      EVENTS.forEach(e => window.removeEventListener(e, onActivity))
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user, logout])

  /** continueIdleSession() — "Continuar" en el modal: reinicia el plazo completo. */
  const continueIdleSession = useCallback(() => {
    idleRearmRef.current?.()
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
    challenge,
    completeTwoFactor,
    clearChallenge,
    idleCountdown,
    continueIdleSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Hook de acceso rápido al contexto de autenticación. */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
