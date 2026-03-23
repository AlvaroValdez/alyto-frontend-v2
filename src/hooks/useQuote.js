// @deprecated — usar useQuoteSocket en su lugar

/**
 * useQuote.js — Hook para cotización en tiempo real con debounce, countdown y auto-refresh.
 *
 * Uso:
 *   const { quote, loading, error, isExpired, fetchQuote } = useQuote()
 *   fetchQuote(100000, 'CO')   ← llama con debounce de 600ms
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { getQuote } from '../services/paymentsService'
import Sentry from '../services/sentry.js'

const DEBOUNCE_MS = 600

export function useQuote() {
  const [quote, setQuote]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [isExpired, setIsExpired] = useState(false)
  const [countdown, setCountdown] = useState(null)   // segundos restantes

  const debounceTimer   = useRef(null)
  const abortController = useRef(null)
  const countdownTimer  = useRef(null)
  const failureCount    = useRef(0)

  // Limpia el countdown interno
  const clearCountdown = useCallback(() => {
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current)
      countdownTimer.current = null
    }
  }, [])

  // Inicia el contador regresivo hasta quoteExpiresAt
  const startCountdown = useCallback((expiresAt) => {
    clearCountdown()
    setIsExpired(false)

    const tick = () => {
      const secs = Math.floor((new Date(expiresAt) - Date.now()) / 1000)
      if (secs <= 0) {
        setCountdown(0)
        setIsExpired(true)
        clearCountdown()
      } else {
        setCountdown(secs)
      }
    }

    tick()
    countdownTimer.current = setInterval(tick, 1000)
  }, [clearCountdown])

  // Ejecuta la petición real al backend
  const doFetch = useCallback(async (originAmount, destinationCountry) => {
    // Cancelar petición anterior si existe
    if (abortController.current) {
      abortController.current.abort()
    }
    abortController.current = new AbortController()

    setLoading(true)
    setError(null)
    setIsExpired(false)
    clearCountdown()

    try {
      const data = await getQuote(originAmount, destinationCountry, abortController.current.signal)
      failureCount.current = 0  // reset en cada éxito
      setQuote(data)
      if (data.quoteExpiresAt) {
        startCountdown(data.quoteExpiresAt)
      }
    } catch (err) {
      if (err.name === 'AbortError') return  // petición cancelada intencionalmente
      failureCount.current += 1
      setError(err.message || 'Error al obtener cotización')
      setQuote(null)
      if (failureCount.current >= 3) {
        Sentry.captureMessage('Quote fetch repeated failure', {
          level: 'warning',
          extra: { destinationCountry, originAmount },
        })
        failureCount.current = 0  // reiniciar contador tras reportar
      }
    } finally {
      setLoading(false)
    }
  }, [clearCountdown, startCountdown])

  // Función pública con debounce
  const fetchQuote = useCallback((originAmount, destinationCountry) => {
    if (!originAmount || !destinationCountry) {
      setQuote(null)
      setError(null)
      return
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    debounceTimer.current = setTimeout(() => {
      doFetch(originAmount, destinationCountry)
    }, DEBOUNCE_MS)
  }, [doFetch])

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimer.current)   clearTimeout(debounceTimer.current)
      if (abortController.current) abortController.current.abort()
      clearCountdown()
    }
  }, [clearCountdown])

  return { quote, loading, error, isExpired, countdown, fetchQuote }
}
