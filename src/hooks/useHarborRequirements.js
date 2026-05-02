/**
 * useHarborRequirements.js — Métodos de pago + (opcional) schema de campos
 * para un corredor OwlPay Harbor (ej. CN/CNY).
 *
 * Llama GET /payments/harbor/requirements?destCountry=...&destCurrency=...
 *
 * El backend devuelve los métodos disponibles (CIPS / WIRE para CN) con su
 * tasa, tiempo de llegada y `quoteId`. Ese `quoteId` es el que tryOwlPayV2
 * necesita para crear la transacción con el método elegido.
 *
 * Cache: sessionStorage por 5 min — los quotes expiran rápido en Harbor,
 * así que mantenemos TTL corto.
 *
 * Uso:
 *   const { methods, fields, loading, error, refetch } =
 *     useHarborRequirements('CN', 'CNY')
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getHarborRequirements } from '../services/paymentsService'

const CACHE_PREFIX = 'alyto_harbor_req_'
const CACHE_TTL_MS = 5 * 60 * 1000

function cacheKey(country, currency) {
  return `${CACHE_PREFIX}${country}_${currency}`
}

function loadFromCache(country, currency) {
  try {
    const raw = sessionStorage.getItem(cacheKey(country, currency))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - (parsed.cachedAt ?? 0) > CACHE_TTL_MS) return null
    return { methods: parsed.methods ?? [], fields: parsed.fields ?? null }
  } catch {
    return null
  }
}

function saveToCache(country, currency, payload) {
  try {
    sessionStorage.setItem(
      cacheKey(country, currency),
      JSON.stringify({ ...payload, cachedAt: Date.now() }),
    )
  } catch { /* sessionStorage lleno */ }
}

/**
 * @param {string|null} destCountry   ISO alpha-2 (ej. 'CN'); null = no fetch
 * @param {string|null} destCurrency  ISO 4217 (ej. 'CNY')
 */
export function useHarborRequirements(destCountry, destCurrency) {
  const [methods, setMethods] = useState([])
  const [fields,  setFields]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const abortRef = useRef(null)

  const fetchData = useCallback(async (country, currency) => {
    if (!country || !currency) {
      setMethods([])
      setFields(null)
      setLoading(false)
      setError(null)
      return
    }

    const cached = loadFromCache(country, currency)
    if (cached) {
      setMethods(cached.methods)
      setFields(cached.fields)
      setLoading(false)
      setError(null)
      return
    }

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setError(null)

    try {
      const data = await getHarborRequirements(country, currency, abortRef.current.signal)
      const ms = Array.isArray(data?.methods) ? data.methods : []
      const fs = Array.isArray(data?.fields)  ? data.fields  : null
      saveToCache(country, currency, { methods: ms, fields: fs })
      setMethods(ms)
      setFields(fs)
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message ?? 'Error al cargar los métodos de pago.')
      setMethods([])
      setFields(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(destCountry, destCurrency)
    return () => { if (abortRef.current) abortRef.current.abort() }
  }, [destCountry, destCurrency, fetchData])

  const refetch = useCallback(() => {
    if (!destCountry || !destCurrency) return
    try { sessionStorage.removeItem(cacheKey(destCountry, destCurrency)) } catch { /* ignorar */ }
    fetchData(destCountry, destCurrency)
  }, [destCountry, destCurrency, fetchData])

  return { methods, fields, loading, error, refetch }
}
