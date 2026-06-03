/**
 * useSep24Status.js — Polling del estado de una transacción SEP-24.
 *
 * Hace polling cada `intervalMs` mientras la transacción no esté en estado
 * terminal (completed/error/refunded). Devuelve la transacción en formato
 * SEP-24 (campo `transaction` del backend).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { getSep24Transaction } from '../services/sep24Service'

const TERMINAL = new Set(['completed', 'error', 'refunded'])

export function useSep24Status(transactionId, token, intervalMs = 12000) {
  const [transaction, setTransaction] = useState(null)
  const [error, setError] = useState(null)
  const timer = useRef(null)

  const fetchOnce = useCallback(async () => {
    if (!transactionId) return null
    try {
      const res = await getSep24Transaction(transactionId, token)
      setTransaction(res.transaction)
      setError(null)
      return res.transaction
    } catch (e) {
      setError(e.message)
      return null
    }
  }, [transactionId, token])

  useEffect(() => {
    if (!transactionId) return undefined
    let active = true

    const tick = async () => {
      const tx = await fetchOnce()
      if (!active) return
      if (tx && TERMINAL.has(tx.status)) clearInterval(timer.current)
    }

    tick()
    timer.current = setInterval(tick, intervalMs)
    return () => { active = false; clearInterval(timer.current) }
  }, [transactionId, fetchOnce, intervalMs])

  return { transaction, error, refresh: fetchOnce }
}
