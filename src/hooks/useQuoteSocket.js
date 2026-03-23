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

const WS_BASE    = import.meta.env.VITE_WS_URL ?? 'ws://localhost:3000'
const WS_URL     = `${WS_BASE}/ws/quote`
const DEBOUNCE_MS = 600
const BACKOFF_MS  = [1000, 2000, 4000, 8000, 16000, 30000]
const MAX_RETRIES = 5

function getToken() {
  return localStorage.getItem('alyto_token')
}

export function useQuoteSocket(originAmount, destinationCountry) {
  const [quote,     setQuote]     = useState(null)
  const [status,    setStatus]    = useState('connecting')
  const [error,     setError]     = useState(null)
  const [isStale,   setIsStale]   = useState(false)
  const [countdown, setCountdown] = useState(null)

  const wsRef       = useRef(null)
  const retries     = useRef(0)
  const retryTimer  = useRef(null)
  const debounceRef = useRef(null)
  const cdInterval  = useRef(null)
  const alive       = useRef(true)
  const params      = useRef({ originAmount, destinationCountry })

  // Always keep params ref current so callbacks read the latest values
  useEffect(() => {
    params.current = { originAmount, destinationCountry }
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

    const socket = new WebSocket(WS_URL)
    wsRef.current = socket

    socket.onopen = () => {
      if (!alive.current || wsRef.current !== socket) return
      retries.current = 0
      socket.send(JSON.stringify({
        type:               'subscribe_quote',
        token:              getToken(),
        originAmount:       params.current.originAmount,
        destinationCountry: params.current.destinationCountry,
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
          if (q.quoteExpiresAt) startCountdown(q.quoteExpiresAt)
        } else if (msg.type === 'error' || msg.type === 'quote_error') {
          setError(msg.message ?? 'Error del servidor de cotizaciones.')
          setStatus('error')
        }
      } catch {
        // Mensaje malformado — ignorar
      }
    }

    socket.onerror = () => { /* onclose se encarga del estado */ }

    socket.onclose = ({ code }) => {
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
        setError('No se pudo restablecer la conexión. Verificá tu internet.')
        setStatus('error')
        return
      }

      setStatus('disconnected')
      const delay = BACKOFF_MS[retries.current] ?? BACKOFF_MS[BACKOFF_MS.length - 1]
      retries.current++
      retryTimer.current = setTimeout(() => {
        if (alive.current) connect()
      }, delay)
    }
  }, [clearCountdown, startCountdown]) // connect is stable

  // ── Manual reconnect ─────────────────────────────────────────────────────

  const reconnect = useCallback(() => {
    retries.current = 0
    if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null }
    connect()
  }, [connect])

  // ── Mount / unmount ───────────────────────────────────────────────────────

  useEffect(() => {
    alive.current = true
    if (params.current.originAmount && params.current.destinationCountry) connect()

    return () => {
      alive.current = false
      clearCountdown()
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (retryTimer.current)  clearTimeout(retryTimer.current)
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); wsRef.current = null }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reconectar cuando cambia el país destino ──────────────────────────────

  const prevCountry = useRef(destinationCountry)
  useEffect(() => {
    if (prevCountry.current === destinationCountry) return // skip on mount
    prevCountry.current = destinationCountry
    if (destinationCountry) reconnect()
    else { setQuote(null); setStatus('connecting') }
  }, [destinationCountry, reconnect])

  // ── Enviar update_amount con debounce cuando cambia el monto ─────────────

  const prevAmount = useRef(originAmount)
  useEffect(() => {
    if (prevAmount.current === originAmount) return // skip on mount
    prevAmount.current = originAmount

    if (!originAmount) { setQuote(null); return }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
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
  }, [originAmount, connect])

  return { quote, status, error, isStale, countdown, reconnect }
}
