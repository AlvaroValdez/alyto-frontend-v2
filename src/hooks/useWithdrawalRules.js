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
 *   const { rules, payoutMethod, loading, error, refetch } = useWithdrawalRules(destinationCountry)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getWithdrawalRules } from '../services/paymentsService'

const CACHE_KEY_PREFIX = 'alyto_wdrules_'
const CACHE_TTL_MS     = 30 * 60 * 1000  // 30 minutos

// ── Helpers de caché sessionStorage ──────────────────────────────────────────

function cacheKey(countryCode, corridorId) {
  return corridorId
    ? `${CACHE_KEY_PREFIX}${countryCode}_${corridorId}`
    : `${CACHE_KEY_PREFIX}${countryCode}`
}

function loadFromCache(countryCode, corridorId) {
  try {
    const raw = sessionStorage.getItem(cacheKey(countryCode, corridorId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - (parsed.cachedAt ?? 0) > CACHE_TTL_MS) return null
    // Soporta formato antiguo { rules, cachedAt } y nuevo { fields, payoutMethod, cachedAt }
    return {
      fields:       parsed.fields       ?? parsed.rules ?? [],
      payoutMethod: parsed.payoutMethod ?? 'vitaWallet',
    }
  } catch {
    return null
  }
}

function saveToCache(countryCode, corridorId, fields, payoutMethod) {
  try {
    sessionStorage.setItem(
      cacheKey(countryCode, corridorId),
      JSON.stringify({ fields, payoutMethod, cachedAt: Date.now() }),
    )
  } catch { /* sessionStorage lleno o no disponible */ }
}

// ── Hook principal ────────────────────────────────────────────────────────────

/**
 * @param {string|null} countryCode  ISO alpha-2 del país destino (ej. 'CO', 'PE')
 * @param {string|null} [corridorId] ID de corredor cuando hay más de uno por país (ej. 'bo-cn-usd')
 * @returns {{ rules: Array, payoutMethod: string|null, loading: boolean, error: string|null, refetch: Function }}
 */
export function useWithdrawalRules(countryCode, corridorId = null) {
  const [rules,        setRules]        = useState([])
  const [payoutMethod, setPayoutMethod] = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)

  // Ref para cancelar fetchs en vuelo si el país cambia o el componente desmonta
  const abortRef = useRef(null)

  const fetchRules = useCallback(async (code, corrId) => {
    if (!code) {
      setRules([])
      setPayoutMethod(null)
      setLoading(false)
      setError(null)
      return
    }

    // Revisar caché primero (keyed por país + corridorId para evitar mezcla)
    const cached = loadFromCache(code, corrId)
    if (cached) {
      setRules(cached.fields)
      setPayoutMethod(cached.payoutMethod)
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
      const data = await getWithdrawalRules(code, abortRef.current.signal, corrId)
      // Backend returns { destCountry, payoutMethod, fields } OR a legacy array.
      const fields = Array.isArray(data) ? data : (data?.fields ?? [])
      const pm     = Array.isArray(data) ? 'vitaWallet' : (data?.payoutMethod ?? 'vitaWallet')
      saveToCache(code, corrId, fields, pm)
      setRules(fields)
      setPayoutMethod(pm)
      setError(null)
    } catch (err) {
      if (err.name === 'AbortError') return  // fetch cancelado — no actualizar estado
      setError(err.message ?? 'Error al cargar los campos del formulario.')
      setRules([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Recargar cuando cambia el país o el corridorId
  useEffect(() => {
    setRules([])
    setPayoutMethod(null)
    fetchRules(countryCode, corridorId)

    return () => {
      if (abortRef.current) abortRef.current.abort()
    }
  }, [countryCode, corridorId, fetchRules])

  // Refetch manual (botón "Reintentar")
  const refetch = useCallback(() => {
    if (!countryCode) return
    // Borrar caché para forzar una llamada fresca
    try { sessionStorage.removeItem(cacheKey(countryCode, corridorId)) } catch { /* ignorar */ }
    fetchRules(countryCode, corridorId)
  }, [countryCode, corridorId, fetchRules])

  return { rules, payoutMethod, loading, error, refetch }
}
