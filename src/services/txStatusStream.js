/**
 * txStatusStream.js — Estado de transacción en tiempo real.
 *
 * Primario: SSE (EventSource) → una sola conexión larga; el backend empuja el
 * estado solo cuando cambia. Reemplaza el polling HTTP cada 5s (que saturaba el
 * rate limiter y generaba ~12 req/min por transacción).
 *
 * Fallback: si el SSE no está disponible o cae, hace polling REST a un intervalo
 * largo (20s) — resiliente sin volver a saturar.
 *
 * Uso:
 *   const unsub = subscribeTxStatus(txId, ({ status, updatedAt }) => { ... })
 *   // ...
 *   unsub()
 */
import { getTransactionStatus } from './paymentsService'

const FALLBACK_POLL_MS = 20_000
const apiBase = () => import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'

/**
 * @param {string} transactionId
 * @param {(data: { status: string, updatedAt?: string }) => void} onStatus
 * @returns {() => void} unsubscribe
 */
export function subscribeTxStatus(transactionId, onStatus) {
  if (!transactionId) return () => {}

  let es      = null
  let poll    = null
  let closed  = false
  const token = localStorage.getItem('alyto_token')

  const emit = (data) => { if (!closed && data && data.status) onStatus(data) }

  const startFallbackPoll = () => {
    if (poll || closed) return
    const tick = async () => {
      try { emit(await getTransactionStatus(transactionId)) } catch { /* reintenta al próximo tick */ }
    }
    tick()
    poll = setInterval(tick, FALLBACK_POLL_MS)
  }

  // ── Primario: SSE ──────────────────────────────────────────────────────────
  if (typeof EventSource !== 'undefined') {
    try {
      const url = `${apiBase()}/payments/${encodeURIComponent(transactionId)}/status/stream` +
        (token ? `?token=${encodeURIComponent(token)}` : '')
      es = new EventSource(url)
      es.addEventListener('status', (e) => {
        try { emit(JSON.parse(e.data)) } catch { /* ignore malformado */ }
      })
      es.onerror = () => {
        // SSE cayó o no se pudo abrir → cerrar y pasar a fallback REST
        if (es) { es.close(); es = null }
        if (!closed) startFallbackPoll()
      }
    } catch {
      startFallbackPoll()
    }
  } else {
    startFallbackPoll()
  }

  return () => {
    closed = true
    if (es)   { es.close(); es = null }
    if (poll) { clearInterval(poll); poll = null }
  }
}
