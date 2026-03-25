/**
 * adminService.js — Servicio de Backoffice Alyto V2.0
 *
 * Funciones para los endpoints del panel de administración.
 * Todas usan request() de api.js (inyecta JWT automáticamente).
 */

import { request } from './api'

// ── Transacciones ─────────────────────────────────────────────────────────────

/**
 * Lista transacciones con filtros y paginación.
 * @param {{ status?, corridorId?, entity?, startDate?, endDate?, page?, limit? }} params
 * @returns {Promise<{ transactions, pagination, summary }>}
 */
export function listTransactions(params = {}) {
  const qs = new URLSearchParams()
  if (params.status)      qs.set('status',      params.status)
  if (params.corridorId)  qs.set('corridorId',  params.corridorId)
  if (params.entity)      qs.set('entity',      params.entity)
  if (params.startDate)   qs.set('startDate',   params.startDate)
  if (params.endDate)     qs.set('endDate',      params.endDate)
  if (params.page)        qs.set('page',         String(params.page))
  if (params.limit)       qs.set('limit',        String(params.limit))
  const query = qs.toString()
  return request(`/admin/transactions${query ? `?${query}` : ''}`)
}

/**
 * Detalle completo de una transacción (incluye ipnLog).
 * @param {string} transactionId  — alytoTransactionId
 * @returns {Promise<{ transaction }>}
 */
export function getTransactionDetail(transactionId) {
  return request(`/admin/transactions/${encodeURIComponent(transactionId)}`)
}

/**
 * Actualización manual de status con nota de auditoría.
 * @param {string} transactionId
 * @param {string} status  — nuevo status
 * @param {string} note    — razón del cambio (requerido por backend)
 * @returns {Promise<{ transaction }>}
 */
/**
 * @param {string} transactionId
 * @param {string} status
 * @param {string} note                — nota de auditoría (requerida)
 * @param {object} [extras]            — campos adicionales, ej. { bankReference }
 */
export function updateTransactionStatus(transactionId, status, note, extras = {}) {
  return request(`/admin/transactions/${encodeURIComponent(transactionId)}/status`, {
    method: 'PATCH',
    body:   JSON.stringify({ status, note, ...extras }),
  })
}

// ── Corredores ────────────────────────────────────────────────────────────────

/**
 * Lista todos los corredores ordenados por corridorId.
 * @returns {Promise<{ total, corridors }>}
 */
export function listCorridors() {
  return request('/admin/corridors')
}

/**
 * Actualiza parámetros de un corredor (corridorId es inmutable).
 * @param {string} corridorId  — slug del corredor
 * @param {object} updates     — campos a actualizar
 * @returns {Promise<{ corridor }>}
 */
export function updateCorridor(corridorId, updates) {
  return request(`/admin/corridors/${encodeURIComponent(corridorId)}`, {
    method: 'PATCH',
    body:   JSON.stringify(updates),
  })
}

/**
 * Crea un nuevo corredor.
 * @param {object} data  — campos del corredor
 * @returns {Promise<{ corridor }>}
 */
export function createCorridor(data) {
  return request('/admin/corridors', {
    method: 'POST',
    body:   JSON.stringify(data),
  })
}

/**
 * Elimina un corredor.
 * @param {string} corridorId
 * @returns {Promise<{ ok }>}
 */
export function deleteCorridor(corridorId) {
  return request(`/admin/corridors/${encodeURIComponent(corridorId)}`, {
    method: 'DELETE',
  })
}

/**
 * Analytics de un corredor por período.
 * @param {string} corridorId
 * @param {{ period?, startDate?, endDate? }} params
 * @returns {Promise<{ analytics }>}
 */
export function getCorridorAnalytics(corridorId, params = {}) {
  const qs = new URLSearchParams()
  if (params.period)    qs.set('period',    params.period)
  if (params.startDate) qs.set('startDate', params.startDate)
  if (params.endDate)   qs.set('endDate',   params.endDate)
  const query = qs.toString()
  return request(`/admin/corridors/${encodeURIComponent(corridorId)}/analytics${query ? `?${query}` : ''}`)
}

/**
 * Analytics globales (todos los corredores).
 * @param {{ period?, startDate?, endDate? }} params
 * @returns {Promise<{ global, byEntity, topCorridors }>}
 */
export function getGlobalAnalytics(params = {}) {
  const qs = new URLSearchParams()
  if (params.period)    qs.set('period',    params.period)
  if (params.startDate) qs.set('startDate', params.startDate)
  if (params.endDate)   qs.set('endDate',   params.endDate)
  const query = qs.toString()
  return request(`/admin/analytics${query ? `?${query}` : ''}`)
}

/**
 * Historial de cambios de un corredor.
 * @param {string} corridorId
 * @returns {Promise<{ changelog }>}
 */
export function getCorridorChangeLog(corridorId) {
  return request(`/admin/corridors/${encodeURIComponent(corridorId)}/changelog`)
}

/**
 * Obtiene el comprobante de pago subido por el usuario (base64).
 * @param {string} transactionId
 * @returns {Promise<{ base64: string, mimeType: string, filename: string, uploadedAt: string }>}
 */
export function getTransactionComprobante(transactionId) {
  return request(`/admin/transactions/${encodeURIComponent(transactionId)}/comprobante`)
}

// ── Fondeo ─────────────────────────────────────────────────────────────────────

/**
 * Balances USDC disponibles por entidad legal.
 * @returns {Promise<{ SRL: number, SpA: number, LLC: number }>}
 */
export function getFundingBalances() {
  return request('/admin/funding/balances')
}

/**
 * Registra una operación de fondeo manual.
 * @param {{ entity, type, asset, amount, originCurrency, originAmount, exchangeRate,
 *           binanceOrderId?, stellarTxId?, bankReference?, note }} data
 * @returns {Promise<{ funding }>}
 */
export function registerFunding(data) {
  return request('/admin/funding', {
    method: 'POST',
    body:   JSON.stringify(data),
  })
}

/**
 * Lista el historial de fondeos con filtros opcionales.
 * @param {{ entity?, asset?, startDate?, endDate?, page?, limit? }} params
 * @returns {Promise<{ fundings, pagination }>}
 */
export function listFundings(params = {}) {
  const qs = new URLSearchParams()
  if (params.entity)    qs.set('entity',    params.entity)
  if (params.asset)     qs.set('asset',     params.asset)
  if (params.startDate) qs.set('startDate', params.startDate)
  if (params.endDate)   qs.set('endDate',   params.endDate)
  if (params.page)      qs.set('page',      String(params.page))
  if (params.limit)     qs.set('limit',     String(params.limit))
  const query = qs.toString()
  return request(`/admin/funding${query ? `?${query}` : ''}`)
}
