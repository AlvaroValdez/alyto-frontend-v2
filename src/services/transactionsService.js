/**
 * transactionsService.js — Servicio de historial de transferencias
 *
 * Llama al backend de Alyto V2.0 para obtener y consultar transacciones
 * del usuario autenticado.
 */

import { request } from './api.js'

/**
 * Obtiene el historial de transacciones del usuario autenticado.
 *
 * @param {{ status?: string, page?: number, limit?: number }} filters
 * @returns {Promise<{ transactions: Array, pagination: { total, page, limit, totalPages } }>}
 */
export function fetchTransactions({ status, page = 1, limit = 10 } = {}) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (status) params.set('status', status)
  return request(`/payments/transactions?${params.toString()}`)
}

/**
 * Obtiene el detalle completo de una transacción específica del usuario.
 * Usa el endpoint de status que devuelve todos los campos necesarios para la
 * vista de detalle (montos, fees, beneficiario, timestamps).
 *
 * @param {string} transactionId — alytoTransactionId (ej. "ALY-D-1710000000000-XYZ")
 * @returns {Promise<object>}
 */
export function fetchTransactionDetail(transactionId) {
  return request(`/payments/${encodeURIComponent(transactionId)}/status`)
}
