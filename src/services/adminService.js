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
 * Si no se pasa `status` ni `tab`, el backend aplica `tab=actionable` por defecto.
 * @param {{ status?, tab?, corridorId?, entity?, startDate?, endDate?, page?, limit?, showAll? }} params
 * @returns {Promise<{ transactions, pagination, summary }>}
 */
export function listTransactions(params = {}) {
  const qs = new URLSearchParams()
  if (params.status)      qs.set('status',      params.status)
  if (params.tab)         qs.set('tab',         params.tab)
  if (params.corridorId)  qs.set('corridorId',  params.corridorId)
  if (params.entity)      qs.set('entity',      params.entity)
  if (params.startDate)   qs.set('startDate',   params.startDate)
  if (params.endDate)     qs.set('endDate',      params.endDate)
  if (params.page)        qs.set('page',         String(params.page))
  if (params.limit)       qs.set('limit',        String(params.limit))
  if (params.showAll)     qs.set('showAll',      'true')
  const query = qs.toString()
  return request(`/admin/transactions${query ? `?${query}` : ''}`)
}

/**
 * Conteos por tab del Ledger admin. Se refresca cada ~15 s desde la UI.
 * @returns {Promise<{ actionable, manual_payout, in_progress, history, unpaid, total, timestamp }>}
 */
export function getLedgerCounts() {
  return request('/admin/ledger/counts')
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
 * @param {string} [idempotencyKey]    — UUID único por intento; el caller debe generarlo
 *                                       dentro del handler del click (no en el body del
 *                                       componente). El backend cachea la respuesta por
 *                                       (userId, key) durante 24 h y devuelve la misma
 *                                       respuesta si la misma key llega dos veces.
 */
export function updateTransactionStatus(transactionId, status, note, extras = {}, idempotencyKey) {
  return request(`/admin/transactions/${encodeURIComponent(transactionId)}/status`, {
    method: 'PATCH',
    body:   JSON.stringify({ status, note, ...extras }),
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
  })
}

export function simulateBankQrPayment(transactionId) {
  return request(`/admin/transactions/${encodeURIComponent(transactionId)}/simulate-bankqr-payment`, {
    method: 'POST',
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
 * Actualiza la tasa manual del corredor (solo payinMethod === 'manual').
 * Endpoint dedicado con auditoría: la nota es obligatoria (mín. 10 chars).
 * @param {string} corridorId
 * @param {{ manualExchangeRate: number, note: string }} data
 * @returns {Promise<{ corridor }>}
 */
export function setCorridorRate(corridorId, data) {
  return request(`/admin/corridors/${encodeURIComponent(corridorId)}/rate`, {
    method: 'PATCH',
    body:   JSON.stringify(data),
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

// ── Trazabilidad de retiros (soporte) ───────────────────────────────────────────

/**
 * Trazabilidad completa de los retiros de un usuario. Busca por email, userId,
 * wtxId, alias o nombre y devuelve cada retiro enriquecido (montos, horas, banco
 * destino, admin que procesó, comprobante y audit trail Stellar).
 * @param {string} query  email | userId | wtxId | alias | nombre
 * @param {string} [status]  filtro opcional por estado del retiro
 * @returns {Promise<{ matchedBy, query, usuarios, resumen, retiros }>}
 */
export function traceWithdrawals(query, status) {
  const params = new URLSearchParams({ query })
  if (status) params.set('status', status)
  return request(`/admin/wallet/withdrawals/trace?${params.toString()}`)
}

// ── Fondeo ─────────────────────────────────────────────────────────────────────

/**
 * Balances USDC disponibles por entidad legal.
 * @returns {Promise<{ SRL: number, SpA: number, LLC: number }>}
 */
export function getFundingBalances() {
  return request('/admin/funding/balance')
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

/**
 * Previsión USDC en tiempo real: balance Stellar live vs compromisos en vuelo
 * vs transacciones bloqueadas por liquidez insuficiente.
 * @param {'SRL'|'LLC'} entity
 * @returns {Promise<{ alertLevel, stellar, committed, availableNow, pendingFunding, gap, fundingNeeded, recommendation }>}
 */
export function getUSDCForecast(entity = 'SRL') {
  return request(`/admin/funding/forecast?entity=${entity}`)
}

// ── Intents de fondeo de tesorería (Camino A) ────────────────────────────────

/**
 * Crea un intent de fondeo: genera correlativo, dirección de tesorería, memo
 * y QR SEP-7 para que el admin retire USDC del exchange y se reconcilie on-chain.
 * @param {{ entity?, expectedAmount?, sourceCurrency?, sourceAmount?, binanceOrderId?, note? }} data
 * @returns {Promise<{ intentId, entity, asset, treasuryAddress, assetIssuer, memo, expectedAmount, status, sep7Uri, qr, note }>}
 */
export function createFundingIntent(data = {}) {
  return request('/admin/funding/intents', {
    method: 'POST',
    body:   JSON.stringify(data),
  })
}

/**
 * Lista los intents de fondeo con filtros opcionales.
 * @param {{ status?, entity?, page?, limit? }} params
 * @returns {Promise<{ intents, pagination }>}
 */
export function listFundingIntents(params = {}) {
  const qs = new URLSearchParams()
  if (params.status) qs.set('status', params.status)
  if (params.entity) qs.set('entity', params.entity)
  if (params.page)   qs.set('page',   String(params.page))
  if (params.limit)  qs.set('limit',  String(params.limit))
  const query = qs.toString()
  return request(`/admin/funding/intents${query ? `?${query}` : ''}`)
}

/**
 * Cancela un intent de fondeo abierto.
 * @param {string} intentId
 * @returns {Promise<{ intentId, status }>}
 */
export function cancelFundingIntent(intentId) {
  return request(`/admin/funding/intents/${encodeURIComponent(intentId)}/cancel`, {
    method: 'PATCH',
  })
}

// ── Comisiones P2P USDC (wallet fees) ────────────────────────────────────────

/**
 * Config actual de comisiones P2P USDC (singleton).
 * @returns {Promise<object>} usdcP2pEnabled, usdcP2pFeePercent, ... revenueAccruedUsdc
 */
export function getWalletFees() {
  return request('/admin/wallet-fees')
}

/**
 * Actualiza comisiones P2P USDC. Enviar SOLO los campos a cambiar.
 * @param {object} data
 * @returns {Promise<object>} config actualizada
 */
export function updateWalletFees(data) {
  return request('/admin/wallet-fees', {
    method: 'PUT',
    body:   JSON.stringify(data),
  })
}

/**
 * Revenue acumulada + verificación cruzada contra el ledger de fees.
 * @returns {Promise<{ revenueAccruedUsdc, verification: { sumFeeTransactions, count, matches } }>}
 */
export function getWalletFeeRevenue() {
  return request('/admin/wallet-fees/revenue')
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

// ── Tasas CLP→BOB (corredor manual) ──────────────────────────────────────────

/**
 * Obtiene las tres tasas del corredor CLP→BOB.
 * @returns {Promise<{ clpPerUsdt, bobPerUsdt, clpPerBob, pairs }>}
 */
export function getCLPBOBRate() {
  return request('/admin/exchange-rates/clp-bob')
}

/**
 * Actualiza CLP/USDT + BOB/USDT, calcula CLP/BOB, sincroniza SpAConfig.
 * @param {number} clpPerUsdt
 * @param {number} bobPerUsdt
 * @param {string} [note]
 * @returns {Promise<{ success, clpPerUsdt, bobPerUsdt, clpPerBob, spaConfigSynced }>}
 */
export function updateCLPBOBRate(clpPerUsdt, bobPerUsdt, note) {
  return request('/admin/exchange-rates/clp-bob', {
    method: 'PATCH',
    body: JSON.stringify({ clpPerUsdt, bobPerUsdt, note: note || null }),
  })
}

/**
 * Elimina el override manual de BOB/USDC, volviendo al cálculo automático.
 * @returns {Promise<{ success, deleted, previousRate }>}
 */
export function deleteBobUsdcOverride() {
  return request('/admin/exchange-rates/bob-usdc-override', { method: 'DELETE' })
}

// ── Vita Wallet balance ───────────────────────────────────────────────────────

/**
 * Retorna saldos actuales de la wallet master Vita + alertas de liquidez.
 * @returns {Promise<{ walletId, balances, alerts, hasAlerts, checkedAt }>}
 */
export function getVitaBalance() {
  return request('/admin/vita/balance')
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
 * @param {string} label — ej. "Tigo Money", "Banco Económico QR"
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

/**
 * Actualiza los datos bancarios de AV Finance SRL.
 * @param {{ bankName, accountHolder, accountNumber, accountType }} bankData
 * @returns {Promise<{ bankData, message }>}
 */
export function updateSRLBankData(bankData) {
  return request('/admin/srl-config/bank-data', {
    method: 'PATCH',
    body:   JSON.stringify(bankData),
  })
}

// ── SRL Wallet QR — QRs específicos para depósito BOB en Wallet ─────────────

/**
 * Sube un nuevo QR de depósito Wallet BOB.
 * @param {string} label — ej. "Banco Económico QR", "Tigo Money"
 * @param {File}   file  — imagen PNG/JPG/WebP, máx 2 MB
 */
export function uploadWalletSRLQR(label, file) {
  const fd = new FormData()
  fd.append('label', label)
  fd.append('qr', file, file.name)
  return requestFormData('/admin/srl-config/wallet-qr', fd)
}

/**
 * Activa o desactiva un QR de Wallet BOB.
 * @param {string}  qrId
 * @param {boolean} isActive
 */
export function toggleWalletSRLQR(qrId, isActive) {
  return request(`/admin/srl-config/wallet-qr/${encodeURIComponent(qrId)}`, {
    method: 'PATCH',
    body:   JSON.stringify({ isActive }),
  })
}

/**
 * Elimina un QR de Wallet BOB.
 * @param {string} qrId
 */
export function deleteWalletSRLQR(qrId) {
  return request(`/admin/srl-config/wallet-qr/${encodeURIComponent(qrId)}`, {
    method: 'DELETE',
  })
}

// ── SpA Config — Transferencias manuales Chile ────────────────────────────

export function getSpaConfig() {
  return request('/admin/spa-config')
}

export function updateSpaConfig(data) {
  return request('/admin/spa-config', {
    method: 'PATCH',
    body:   JSON.stringify(data),
  })
}

// ── Conversiones BOB → USDC (Admin) ──────────────────────────────────────────

export function listPendingConversions() {
  return request('/admin/wallet/usdc/conversions/pending')
}

export function confirmConversion(wtxId, note) {
  return request('/admin/wallet/usdc/conversions/confirm', {
    method: 'POST',
    body:   JSON.stringify({ wtxId, note }),
  })
}

export function rejectConversion(wtxId, rejectReason) {
  return request('/admin/wallet/usdc/conversions/reject', {
    method: 'POST',
    body:   JSON.stringify({ wtxId, rejectReason }),
  })
}

// ── Conversiones USDC → BOB (Admin) ──────────────────────────────────────────

export function listPendingUSDCtoBOB() {
  return request('/admin/wallet/bob/conversions/pending')
}

export function confirmUSDCtoBOB(wtxId, note) {
  return request('/admin/wallet/bob/conversions/confirm', {
    method: 'POST',
    body:   JSON.stringify({ wtxId, note }),
  })
}

export function rejectUSDCtoBOB(wtxId, rejectReason) {
  return request('/admin/wallet/bob/conversions/reject', {
    method: 'POST',
    body:   JSON.stringify({ wtxId, rejectReason }),
  })
}

// ── Notificaciones push manuales ──────────────────────────────────────────────

/**
 * Obtiene la lista de tipos de notificación disponibles.
 * @returns {Promise<{ types: Array<{ value: string, label: string }> }>}
 */
export function getAdminNotificationTypes() {
  return request('/admin/notifications/types')
}

/**
 * Envía una notificación push manual a un usuario específico.
 * @param {{ userId: string, notificationType: string, metadata?: object }} data
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
export function sendAdminNotification(data) {
  return request('/admin/notifications/send', {
    method: 'POST',
    body:   JSON.stringify(data),
  })
}

// ── Factura B2B (Admin) ──────────────────────────────────────────────────────

/**
 * Descarga el Comprobante Oficial de Servicio B2B (PDF) desde el panel admin.
 * @param {string} transactionId — alytoTransactionId
 */
export async function getBusinessInvoice(transactionId) {
  const res = await request(`/admin/transactions/${transactionId}/business-invoice`)
  const blob = await res.blob()
  const filename = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1]
    ?? `factura_b2b_${transactionId}.pdf`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}


// ── Monitoreo bancario (bank-agnostic, Fase 1 read-only) ─────────────────────

/** Lista el registro de cuentas bancarias de tesorería + estado del adapter. */
export function getBanks() {
  return request('/admin/banks')
}

/** Saldo en vivo de una cuenta bancaria (§8). `fresh` salta el cache de 30s. */
export function getBankBalance(code, fresh = false) {
  return request(`/admin/banks/${encodeURIComponent(code)}/balance${fresh ? '?fresh=1' : ''}`)
}

/** Extracto de movimientos normalizado por rango (yyyy-MM-dd). */
export function getBankMovements(code, { from, to } = {}) {
  const qs = new URLSearchParams()
  if (from) qs.set('from', from)
  if (to)   qs.set('to', to)
  const query = qs.toString()
  return request(`/admin/banks/${encodeURIComponent(code)}/movements${query ? `?${query}` : ''}`)
}

/** Cobertura de tesorería vs pasivo a usuarios (BOB banco + USDC Stellar). */
export function getTreasuryCoverage(entity = 'SRL') {
  return request(`/admin/treasury/coverage?entity=${encodeURIComponent(entity)}`)
}

/** Resumen de saldos + movimientos de un usuario. */
export function getUserWalletSummary(userId, limit = 50) {
  return request(`/admin/users/${encodeURIComponent(userId)}/wallet-summary?limit=${limit}`)
}
