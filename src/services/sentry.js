/**
 * sentry.js — Inicialización de Sentry para Alyto Frontend V2.0
 *
 * Debe importarse como PRIMERA importación en main.jsx para que
 * la instrumentación automática de React Router y fetch quede activa
 * desde el primer render.
 *
 * Errores ignorados (flujos esperados — no son bugs):
 *   - "Network Error" / "Request aborted" → AbortController del cotizador
 *   - Respuestas 401/403 → sesión expirada o permisos insuficientes (flujo normal)
 */

import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,

  environment: import.meta.env.MODE,

  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText:   true,   // enmascara texto sensible (montos, cuentas, nombres)
      blockAllMedia: true,   // no graba imágenes ni videos del UI
    }),
  ],

  // Muestra de trazas de rendimiento
  tracesSampleRate: 0.2,

  // Session Replay: 5% de sesiones normales, 100% de sesiones con error
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate:  1.0,

  // Errores esperados — no son bugs, no deben aparecer en el dashboard
  ignoreErrors: [
    'Network Error',
    'Request aborted',   // AbortController.abort() del cotizador con debounce
    /401/,              // token expirado → sesión normal
    /403/,              // permisos insuficientes → flujo de acceso normal
  ],
})

export default Sentry
