/**
 * useWithdrawalRules.js — Hook para cargar los campos dinámicos del formulario
 * de beneficiario según el país destino.
 *
 * Los campos provienen del endpoint GET /api/v1/payments/withdrawal-rules/:countryCode,
 * que los obtiene de Vita Wallet (con fallback hardcodeado para CO y PE).
 *
 * Caching en sessionStorage por 30 minutos por país — evita llamadas repetidas
 * al navegar entre pasos del flujo de pago.
 *
 * Uso:
 *   const { rules, loading, error, refetch } = useWithdrawalRules(destinationCountry)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getWithdrawalRules } from '../services/paymentsService'

const CACHE_KEY_PREFIX = 'alyto_wdrules_'
const CACHE_TTL_MS     = 30 * 60 * 1000  // 30 minutos

// ── Helpers de caché sessionStorage ──────────────────────────────────────────

function loadFromCache(countryCode) {
  try {
    const raw = sessionStorage.getItem(`${CACHE_KEY_PREFIX}${countryCode}`)
    if (!raw) return null
    const { rules, cachedAt } = JSON.parse(raw)
    if (Date.now() - cachedAt > CACHE_TTL_MS) return null
    return rules
  } catch {
    return null
  }
}

function saveToCache(countryCode, rules) {
  try {
    sessionStorage.setItem(
      `${CACHE_KEY_PREFIX}${countryCode}`,
      JSON.stringify({ rules, cachedAt: Date.now() }),
    )
  } catch { /* sessionStorage lleno o no disponible */ }
}

// ── Hook principal ────────────────────────────────────────────────────────────

/**
 * @param {string|null} countryCode  ISO alpha-2 del país destino (ej. 'CO', 'PE')
 * @returns {{ rules: Array, loading: boolean, error: string|null, refetch: Function }}
 */
export function useWithdrawalRules(countryCode) {
  const [rules,   setRules]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  // Ref para cancelar fetchs en vuelo si el país cambia o el componente desmonta
  const abortRef = useRef(null)

  const fetchRules = useCallback(async (code) => {
    if (!code) {
      setRules([])
      setLoading(false)
      setError(null)
      return
    }

    // Revisar caché primero
    const cached = loadFromCache(code)
    if (cached) {
      setRules(cached)
      setLoading(false)
      setError(null)
      return
    }

    // Cancelar fetch anterior si aún está corriendo
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setError(null)

    try {
      const data = await getWithdrawalRules(code, abortRef.current.signal)
      // Backend returns { destCountry, payoutMethod, fields } OR a legacy array.
      const fields = Array.isArray(data) ? data : (data?.fields ?? [])
      saveToCache(code, fields)
      setRules(fields)
      setError(null)
    } catch (err) {
      if (err.name === 'AbortError') return  // fetch cancelado — no actualizar estado
      setError(err.message ?? 'Error al cargar los campos del formulario.')
      setRules([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Recargar cuando cambia el país
  useEffect(() => {
    setRules([])
    fetchRules(countryCode)

    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [countryCode, fetchRules])

  // Refetch manual (botón "Reintentar")
  const refetch = useCallback(() => {
    if (!countryCode) return
    // Borrar caché para forzar una llamada fresca
    try { sessionStorage.removeItem(`${CACHE_KEY_PREFIX}${countryCode}`) } catch { /* ignorar */ }
    fetchRules(countryCode)
  }, [countryCode, fetchRules])

  return { rules, loading, error, refetch }
}
