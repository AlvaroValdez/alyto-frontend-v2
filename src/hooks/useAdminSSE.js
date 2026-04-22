/**
 * useAdminSSE — hook de Server-Sent Events para el admin Ledger.
 *
 * Abre un stream persistente a /admin/ledger/events y enruta los eventos
 * `tx_actionable` y `tx_manual_payout` a callbacks proporcionados por la página.
 *
 * Auth: cookie HttpOnly `alyto_token` — EventSource lleva `withCredentials:true`.
 * En VITE_AUTH_MODE=header (solo token en localStorage, sin cookie same-origin)
 * el stream fallará silenciosamente y la UI seguirá funcionando con el polling
 * de counts cada 15 s.
 *
 * Reconexión: EventSource reintenta sólo en errores de red. Para 401/403
 * explícitos (cookie vencida) cerramos el stream y dejamos de reintentar —
 * el usuario volverá a autenticar y la siguiente renderización del hook
 * abrirá un stream nuevo.
 */

import { useEffect, useRef } from 'react'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'

export function useAdminSSE({ onActionable, onManualPayout, enabled = true } = {}) {
  const onActionableRef   = useRef(onActionable)
  const onManualPayoutRef = useRef(onManualPayout)

  useEffect(() => { onActionableRef.current   = onActionable   }, [onActionable])
  useEffect(() => { onManualPayoutRef.current = onManualPayout }, [onManualPayout])

  useEffect(() => {
    if (!enabled) return undefined

    const url = `${BASE_URL}/admin/ledger/events`
    let source
    try {
      source = new EventSource(url, { withCredentials: true })
    } catch (err) {
      console.warn('[useAdminSSE] EventSource no soportado:', err?.message)
      return undefined
    }

    source.addEventListener('connected', (evt) => {
      try {
        const data = JSON.parse(evt.data)
        console.log('[useAdminSSE] connected:', data.clientId)
      } catch { /* noop */ }
    })

    source.addEventListener('tx_actionable', (evt) => {
      try {
        const data = JSON.parse(evt.data)
        onActionableRef.current?.(data)
      } catch (err) {
        console.warn('[useAdminSSE] tx_actionable parse error:', err?.message)
      }
    })

    source.addEventListener('tx_manual_payout', (evt) => {
      try {
        const data = JSON.parse(evt.data)
        onManualPayoutRef.current?.(data)
      } catch (err) {
        console.warn('[useAdminSSE] tx_manual_payout parse error:', err?.message)
      }
    })

    source.onerror = () => {
      // readyState: 0 connecting, 1 open, 2 closed. Si el browser cerró,
      // EventSource no reintenta solo — log y salir.
      if (source.readyState === 2) {
        console.warn('[useAdminSSE] stream cerrado por el servidor o el browser')
      }
    }

    return () => {
      source.close()
    }
  }, [enabled])
}

export default useAdminSSE
