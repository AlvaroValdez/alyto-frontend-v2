/**
 * adminService.js — Servicio de Backoffice Alyto V2.0
 *
 * Funciones para los endpoints del panel de administración.
 * Todas usan request() de api.js (inyecta JWT automáticamente).
 */

import { request, requestFormData } from './api'

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

// ── Tasas de cambio ────────────────────────────────────────────────────────────

/**
 * Obtiene las tasas de cambio activas (admin).
 * @returns {Promise<{ rates: Array<{ pair, rate, source, note, updatedAt, updatedBy }> }>}
 */
export function getExchangeRates() {
  return request('/admin/exchange-rates')
}

/**
 * Actualiza (o crea) una tasa de cambio manual.
 * @param {string} pair    — ej. 'BOB/USDT'
 * @param {number} rate    — ej. 9.31
 * @param {string} source  — 'Binance P2P' | 'Manual'
 * @param {string} [note]  — nota de auditoría
 * @returns {Promise<{ rate }>}
 */
export function updateExchangeRate(pair, rate, source, note) {
  return request('/admin/exchange-rates', {
    method: 'POST',
    body:   JSON.stringify({ pair, rate, source, note: note || null }),
  })
}

// ── SRL Config — QR de pago Bolivia ───────────────────────────────────────────

/**
 * Obtiene la configuración SRL, incluyendo el array de qrImages.
 * @returns {Promise<{ qrImages: Array<{ _id, label, imageBase64, isActive, uploadedAt }> }>}
 */
export function getSRLConfig() {
  return request('/admin/srl-config')
}

/**
 * Sube un nuevo QR de pago para Bolivia.
 * @param {string} label — ej. "Tigo Money", "Banco Bisa QR"
 * @param {File}   file  — imagen PNG/JPG/WebP del QR, máx 2 MB
 * @returns {Promise<{ qrImage }>}
 */
export function uploadSRLQR(label, file) {
  const fd = new FormData()
  fd.append('label', label)
  fd.append('qr', file, file.name)
  return requestFormData('/admin/srl-config/qr', fd)
}

/**
 * Activa o desactiva un QR existente.
 * @param {string}  qrId
 * @param {boolean} isActive
 * @returns {Promise<{ qrImage }>}
 */
export function toggleSRLQR(qrId, isActive) {
  return request(`/admin/srl-config/qr/${encodeURIComponent(qrId)}`, {
    method: 'PATCH',
    body:   JSON.stringify({ isActive }),
  })
}

/**
 * Elimina un QR de pago.
 * @param {string} qrId
 * @returns {Promise<{ ok }>}
 */
export function deleteSRLQR(qrId) {
  return request(`/admin/srl-config/qr/${encodeURIComponent(qrId)}`, {
    method: 'DELETE',
  })
}
