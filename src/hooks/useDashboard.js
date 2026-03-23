/**
 * useDashboard.js — Hook de datos del Dashboard principal
 *
 * Responsabilidades:
 *  - Llama GET /api/v1/dashboard al montar
 *  - Si hay activeTransactions > 0, refresca automáticamente cada 60 segundos
 *    para mantener el estado de las transferencias en curso
 *  - Expone { data, loading, error, refresh }
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchDashboard } from '../services/api'

const POLL_INTERVAL_MS = 60_000 // 60 segundos

export function useDashboard() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const intervalRef = useRef(null)

  const load = useCallback(async () => {
    try {
      const result = await fetchDashboard()
      setData(result)
      setError(null)
      return result
    } catch (err) {
      setError(err.message ?? 'Error al cargar el dashboard')
      return null
    }
  }, [])

  // Inicia o detiene el polling según si hay transferencias activas
  const syncPolling = useCallback((result) => {
    const hasActive = result?.stats?.activeTransactions > 0

    if (hasActive && !intervalRef.current) {
      intervalRef.current = setInterval(async () => {
        const updated = await load()
        if (updated) syncPolling(updated)
      }, POLL_INTERVAL_MS)
    }

    if (!hasActive && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [load])

  // Carga inicial
  useEffect(() => {
    let cancelled = false

    async function init() {
      setLoading(true)
      const result = await load()
      if (!cancelled) {
        setLoading(false)
        if (result) syncPolling(result)
      }
    }

    init()

    return () => {
      cancelled = true
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [load, syncPolling])

  // Refresh manual expuesto al componente
  const refresh = useCallback(async () => {
    const result = await load()
    if (result) syncPolling(result)
  }, [load, syncPolling])

  return { data, loading, error, refresh }
}
