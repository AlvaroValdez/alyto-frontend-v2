/**
 * useQuoteSocket.js — Cotización en tiempo real vía WebSocket.
 *
 * Reemplaza useQuote.js (HTTP polling). La conexión se mantiene abierta y el
 * servidor envía actualizaciones automáticas cada 60 s cuando la tasa cambia.
 *
 * Uso:
 *   const { quote, status, error, isStale, countdown, reconnect } =
 *     useQuoteSocket(originAmount, destinationCountry)
 *
 * Status:
 *   "connecting"   — estableciendo conexión WS
 *   "connected"    — cotización activa y fresca
 *   "updating"     — nueva cotización en camino (el monto cambió)
 *   "expired"      — cotización caducada, requiere acción del usuario
 *   "error"        — error irrecuperable (JWT inválido, max conexiones)
 *   "disconnected" — conexión perdida, reconectando con backoff
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { request } from '../services/api'

// WS base: usa VITE_WS_URL si está definida; si no, se deriva de VITE_API_URL
// (https://api-x.alyto.app/api/v1 → wss://api-x.alyto.app). Evita que un build
// sin VITE_WS_URL caiga a ws://localhost:3000 y rompa la cotización en vivo.
const API_BASE   = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'
const WS_BASE    = import.meta.env.VITE_WS_URL
  ?? API_BASE.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '')
const WS_URL     = `${WS_BASE}/ws/quote`
const DEBOUNCE_MS = 600
const BACKOFF_MS  = [1000, 2000, 4000, 8000, 16000, 30000]
const MAX_RETRIES = 5
// Fallback REST: si el WS agota los reintentos (fallo de conexión, no errores
// de negocio), se cotiza vía GET /payments/quote con polling. La UI sigue
// funcionando aunque el socket esté caído.
const REST_POLL_MS = 45000

export function useQuoteSocket(originAmount, destinationCountry, corridorId) {
  const [quote,      setQuote]      = useState(null)
  const [status,     setStatus]     = useState('connecting')
  const [error,      setError]      = useState(null)
  const [errorMeta,  setErrorMeta]  = useState(null) // { code, min, currency } para BELOW_MINIMUM
  const [isStale,    setIsStale]    = useState(false)
  const [countdown,  setCountdown]  = useState(null)

  const wsRef       = useRef(null)
  const retries     = useRef(0)
  const retryTimer  = useRef(null)
  const debounceRef = useRef(null)
  const cdInterval  = useRef(null)
  const alive       = useRef(true)
  const restMode    = useRef(false)  // true = cotizando vía REST (WS caído)
  const restTimer   = useRef(null)
  const params      = useRef({ originAmount, destinationCountry, corridorId })

  // Always keep params ref current so callbacks read the latest values
  useEffect(() => {
    params.current = { originAmount, destinationCountry, corridorId }
  })

  // ── Countdown ────────────────────────────────────────────────────────────

  const clearCountdown = useCallback(() => {
    if (cdInterval.current) { clearInterval(cdInterval.current); cdInterval.current = null }
  }, [])

  const startCountdown = useCallback((expiresAt) => {
    clearCountdown()
    setIsStale(false)

    const tick = () => {
      if (!alive.current) return
      const secs = Math.floor((new Date(expiresAt) - Date.now()) / 1000)
      if (secs <= 0) {
        setCountdown(0)
        setIsStale(true)
        setStatus('expired')
        clearCountdown()
      } else {
        setCountdown(secs)
      }
    }
    tick()
    cdInterval.current = setInterval(tick, 1000)
  }, [clearCountdown])

  // ── Fallback REST (WS caído) ─────────────────────────────────────────────

  const stopRestFallback = useCallback(() => {
    restMode.current = false
    if (restTimer.current) { clearInterval(restTimer.current); restTimer.current = null }
  }, [])

  const fetchRestQuote = useCallback(async () => {
    const { originAmount: amt, destinationCountry: country, corridorId: cid } = params.current
    if (!amt || !country) return
    try {
      const qs = new URLSearchParams({
        destinationCountry: country,
        originAmount:       String(amt),
        ...(cid ? { corridorId: cid } : {}),
      })
      const data = await request(`/payments/quote?${qs.toString()}`)
      if (!alive.current || !restMode.current) return
      setQuote({ rateConfidence: 'estimated', ...data })
      setStatus('connected')
      setIsStale(false)
      setError(null)
      setErrorMeta(null)
      if (data.quoteExpiresAt) startCountdown(data.quoteExpiresAt)
    } catch (err) {
      if (!alive.current || !restMode.current) return
      setError(err.message ?? 'No se pudo obtener la cotización.')
      setStatus('error')
    }
  }, [startCountdown])

  const startRestFallback = useCallback(() => {
    if (restMode.current) return
    restMode.current = true
    console.warn('[Quote] WS caído — usando fallback REST /payments/quote')
    fetchRestQuote()
    restTimer.current = setInterval(fetchRestQuote, REST_POLL_MS)
  }, [fetchRestQuote])

  // ── Core connect ─────────────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (!alive.current) return

    // Close any dangling socket without triggering reconnect logic
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }

    const { originAmount: amt, destinationCountry: country } = params.current
    if (!amt || !country) return

    setStatus('connecting')
    setError(null)

    // Auth: pass token as query param (header mode) + credentials (cookie mode)
    const token = localStorage.getItem('alyto_token')
    const wsUrl = token
      ? `${WS_URL}?token=${encodeURIComponent(token)}`
      : WS_URL
    console.log('[WS] Connecting to:', wsUrl.replace(/token=.{20}.*/, 'token=***'))

    const socket = new WebSocket(wsUrl)
    wsRef.current = socket

    socket.onopen = () => {
      if (!alive.current || wsRef.current !== socket) return
      console.log('[WS] Connected')
      retries.current = 0
      stopRestFallback() // el WS vuelve a mandar; apagar el polling REST
      socket.send(JSON.stringify({
        type:               'subscribe_quote',
        originAmount:       params.current.originAmount,
        destinationCountry: params.current.destinationCountry,
        ...(params.current.corridorId ? { corridorId: params.current.corridorId } : {}),
      }))
    }

    socket.onmessage = ({ data }) => {
      if (!alive.current || wsRef.current !== socket) return
      try {
        const msg = JSON.parse(data)

        if (msg.type === 'quote_update' || msg.type === 'quote') {
          const q = msg.quote ?? msg
          setQuote(q)
          setStatus('connected')
          setIsStale(false)
          setError(null)
          setErrorMeta(null)
          if (q.quoteExpiresAt) startCountdown(q.quoteExpiresAt)
        } else if (msg.type === 'error' || msg.type === 'quote_error') {
          setError(msg.message ?? 'Error del servidor de cotizaciones.')
          setErrorMeta(msg.code ? { code: msg.code, min: msg.min ?? null, currency: msg.currency ?? null } : null)
          setStatus('error')
        }
      } catch {
        // Mensaje malformado — ignorar
      }
    }

    socket.onerror = (e) => { console.error('[WS] Error:', e) }

    socket.onclose = ({ code, reason }) => {
      console.log('[WS] Closed:', code, reason)
      if (!alive.current || wsRef.current !== socket) return
      clearCountdown()

      // Cierres no recuperables
      if (code === 4001) {
        setError('Sesión inválida. Por favor inicia sesión de nuevo.')
        setStatus('error')
        return
      }
      if (code === 4002) {
        setError('Demasiadas conexiones activas. Cerrá otras pestañas y reintentá.')
        setStatus('error')
        return
      }

      // Cierre recuperable — backoff exponencial
      if (retries.current >= MAX_RETRIES) {
        // Fallo de CONEXIÓN (no de negocio): cotizar vía REST para no bloquear
        // el flujo. Si el REST también falla, ahí sí queda en 'error'.
        startRestFallback()
        return
      }

      setStatus('disconnected')
      const delay = BACKOFF_MS[retries.current] ?? BACKOFF_MS[BACKOFF_MS.length - 1]
      retries.current++
      retryTimer.current = setTimeout(() => {
        if (alive.current) connect()
      }, delay)
    }
  }, [clearCountdown, startCountdown, startRestFallback, stopRestFallback]) // connect is stable

  // ── Manual reconnect ─────────────────────────────────────────────────────

  const reconnect = useCallback(() => {
    retries.current = 0
    stopRestFallback()
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null }
    connect()
  }, [connect, stopRestFallback])

  // ── Mount / unmount ───────────────────────────────────────────────────────

  useEffect(() => {
    alive.current = true
    if (params.current.originAmount && params.current.destinationCountry) connect()

    return () => {
      alive.current = false
      clearCountdown()
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (retryTimer.current)  clearTimeout(retryTimer.current)
      if (restTimer.current)   clearInterval(restTimer.current)
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); wsRef.current = null }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reconectar cuando cambia el país destino o el corridorId ────────────

  const prevCountry   = useRef(destinationCountry)
  const prevCorridorId = useRef(corridorId)
  useEffect(() => {
    const countryChanged  = prevCountry.current   !== destinationCountry
    const corridorChanged = prevCorridorId.current !== corridorId
    if (!countryChanged && !corridorChanged) return // skip on mount
    prevCountry.current    = destinationCountry
    prevCorridorId.current = corridorId
    if (destinationCountry) reconnect()
    else { setQuote(null); setStatus('connecting') }
  }, [destinationCountry, corridorId, reconnect])

  // ── Enviar update_amount con debounce cuando cambia el monto ─────────────

  const prevAmount = useRef(originAmount)
  useEffect(() => {
    if (prevAmount.current === originAmount) return // skip on mount
    prevAmount.current = originAmount

    if (!originAmount) { setQuote(null); return }

    if (restMode.current) {
      // Modo fallback REST: recotizar con debounce por el mismo canal
      setStatus('updating')
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => { fetchRestQuote() }, DEBOUNCE_MS)
    } else if (wsRef.current?.readyState === WebSocket.OPEN) {
      setStatus('updating')
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'update_amount', originAmount }))
        }
      }, DEBOUNCE_MS)
    } else if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
      // Sin conexión activa — iniciar una nueva
      connect()
    }
  }, [originAmount, connect, fetchRestQuote])

  return { quote, status, error, errorMeta, isStale, countdown, reconnect }
}
