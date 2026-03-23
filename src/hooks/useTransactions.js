/**
 * useTransactions — Hook para el historial de transferencias del usuario.
 *
 * Estados:
 *   transactions  — lista de transacciones cargadas
 *   loading       — carga inicial activa
 *   error         — mensaje de error, null si no hay error
 *   pagination    — { total, page, limit, totalPages }
 *
 * Funciones:
 *   fetchTransactions(filters)  — carga la lista (resetea a página 1)
 *   fetchMore()                 — carga la siguiente página y agrega al final
 *   refreshTransactions()       — re-fetch silencioso sin spinner
 *
 * Auto-refresh:
 *   Cada 30 segundos mientras haya transacciones con status activo
 *   (payin_pending, processing, payout_sent, etc.) para que el usuario
 *   vea el progreso en tiempo real sin recargar manualmente.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchTransactions as apiFetchTransactions } from '../services/transactionsService.js'

// Statuses que indican una transacción en vuelo — activan el auto-refresh
const ACTIVE_STATUSES = new Set([
  'initiated',
  'payin_pending',
  'payin_confirmed',
  'payin_completed',
  'processing',
  'in_transit',
  'payout_pending',
  'payout_sent',
])

const AUTO_REFRESH_INTERVAL = 30_000 // 30 s

export function useTransactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState(null)
  const [pagination, setPagination]     = useState({ total: 0, page: 1, limit: 10, totalPages: 0 })
  const [activeFilters, setActiveFilters] = useState({})

  const intervalRef = useRef(null)

  // ── Detecta si hay transacciones activas para disparar el polling ──────────
  const hasActiveTransactions = transactions.some(tx => ACTIVE_STATUSES.has(tx.status))

  // ── fetchTransactions: carga inicial o filtrada — muestra el spinner ───────
  const fetchTransactions = useCallback(async (filters = {}) => {
    setLoading(true)
    setError(null)
    setActiveFilters(filters)
    try {
      const data = await apiFetchTransactions({ ...filters, page: 1 })
      setTransactions(data.transactions)
      setPagination(data.pagination)
    } catch (err) {
      setError(err.message || 'Error cargando las transferencias.')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── fetchMore: carga la siguiente página y la agrega al final de la lista ──
  const fetchMore = useCallback(async () => {
    if (pagination.page >= pagination.totalPages || loading) return
    const nextPage = pagination.page + 1
    try {
      const data = await apiFetchTransactions({ ...activeFilters, page: nextPage })
      setTransactions(prev => [...prev, ...data.transactions])
      setPagination(data.pagination)
    } catch (err) {
      setError(err.message || 'Error cargando más transferencias.')
    }
  }, [pagination, activeFilters, loading])

  // ── refreshTransactions: re-fetch silencioso (sin spinner) ─────────────────
  const refreshTransactions = useCallback(async () => {
    try {
      const data = await apiFetchTransactions({ ...activeFilters, page: 1 })
      setTransactions(data.transactions)
      setPagination(data.pagination)
    } catch {
      // Silencioso — los fallos de auto-refresh no molestan al usuario
    }
  }, [activeFilters])

  // ── Carga inicial al montar ────────────────────────────────────────────────
  useEffect(() => {
    fetchTransactions()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-refresh cada 30 s cuando hay transacciones activas ───────────────
  useEffect(() => {
    clearInterval(intervalRef.current)
    if (hasActiveTransactions) {
      intervalRef.current = setInterval(refreshTransactions, AUTO_REFRESH_INTERVAL)
    }
    return () => clearInterval(intervalRef.current)
  }, [hasActiveTransactions, refreshTransactions])

  return {
    transactions,
    loading,
    error,
    pagination,
    fetchTransactions,
    fetchMore,
    refreshTransactions,
  }
}
