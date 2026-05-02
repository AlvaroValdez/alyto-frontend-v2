/**
 * paymentsService.js — Capa de servicio para el motor cross-border de Alyto V2.0
 *
 * Funciones:
 *   getQuote(originAmount, destinationCountry)  → GET /payments/quote
 *   initPayment(payload)                        → POST /payments/crossborder
 *   getTransactionStatus(transactionId)         → GET /payments/status/:id
 */

import { request, requestFormData } from './api'

/**
 * Obtiene una cotización en tiempo real para el corredor indicado.
 * @param {number} originAmount           Monto en moneda origen (CLP)
 * @param {string} destinationCountry     ISO2 del país destino (CO, PE, BO)
 * @param {AbortSignal} [signal]          AbortController signal para cancelar
 * @returns {Promise<{
 *   corridorId: string,
 *   originAmount: number,
 *   originCurrency: string,
 *   destinationAmount: number,
 *   destinationCurrency: string,
 *   exchangeRate: number,
 *   fees: { alytoCSpread: number, fixedFee: number, payinFee: number, profitRetention: number },
 *   totalFees: number,
 *   quoteExpiresAt: string,
 *   estimatedDelivery: string
 * }>}
 */
export function getQuote(originAmount, destinationCountry, signal) {
  return request(
    `/payments/quote?originAmount=${originAmount}&destinationCountry=${destinationCountry}`,
    { signal },
  )
}

/**
 * Inicia un pago cross-border y obtiene la URL del widget de pago.
 * @param {{
 *   corridorId: string,
 *   originAmount: number,
 *   payinMethod: string,
 *   beneficiary: object
 * }} payload
 * @returns {Promise<{ transactionId: string, payinUrl: string, status: string }>}
 */
export function initPayment(payload) {
  const { corridorId, originAmount, beneficiary, beneficiaryData } = payload
  console.log('[initPayment] body enviado:', JSON.stringify({ corridorId, originAmount, beneficiary, beneficiaryData }))
  return request('/payments/crossborder', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Consulta el estado actual de una transacción.
 * @param {string} transactionId  MongoDB ObjectId de la transacción
 * @returns {Promise<{ transactionId: string, status: string, updatedAt: string }>}
 */
export function getTransactionStatus(transactionId) {
  return request(`/payments/${transactionId}/status`)
}

/**
 * Lista los corredores disponibles para el usuario autenticado.
 * El backend filtra por legalEntity del JWT.
 * @returns {Promise<{ corridors: Array }>}
 */
export function listUserCorridors() {
  return request('/payments/corridors')
}

/**
 * Obtiene el QR de pago de una transacción manual (Bolivia).
 * @param {string} transactionId
 * @returns {Promise<{ qrDataUrl?, qrUrl?, qr? }>}
 */
export function getPaymentQR(transactionId) {
  return request(`/payments/${encodeURIComponent(transactionId)}/qr`)
}

/**
 * Obtiene los datos bancarios y QR estáticos de AV Finance SRL para
 * mostrar las instrucciones de transferencia antes de crear la transacción.
 * @returns {Promise<{
 *   bankName: string, accountHolder: string, accountNumber: string,
 *   accountType: string, currency: string,
 *   qrImages: Array<{ label: string, imageBase64: string }>
 * }>}
 */
export function getSRLPayinInstructions() {
  return request('/payments/srl-payin-instructions')
}

/**
 * Obtiene los campos de formulario dinámicos para el país destino indicado.
 * La respuesta proviene del backend (cacheada 1h), que a su vez la obtiene de Vita.
 * @param {string} countryCode  ISO alpha-2 mayúsculas (ej. 'CO', 'PE', 'AR')
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array<{
 *   key: string,
 *   label: string,
 *   type: 'text'|'select'|'email'|'phone',
 *   required: boolean,
 *   options: Array<{label: string, value: string}>,
 *   min: number|null,
 *   max: number|null,
 *   placeholder: string,
 *   when: {key: string, value: string}|null
 * }>>}
 */
export function getWithdrawalRules(countryCode, signal) {
  return request(`/payments/withdrawal-rules/${countryCode}`, { signal })
}

/**
 * Obtiene los métodos de pago disponibles + schema de campos del beneficiario
 * para un corredor OwlPay Harbor (ej. CN/CNY).
 *
 * Respuesta esperada:
 *   {
 *     destCountry, destCurrency,
 *     methods: [
 *       { method: 'CIPS' | 'WIRE', rate: number, deliveryLabel: string,
 *         recommended: boolean, quoteId: string },
 *       ...
 *     ],
 *     fields?: Array  // si el backend devuelve schema dinámico — el frontend
 *                     // tiene config local como fallback
 *   }
 *
 * @param {string} destCountry   ISO alpha-2 (ej. 'CN')
 * @param {string} destCurrency  ISO 4217 (ej. 'CNY')
 * @param {AbortSignal} [signal]
 */
export function getHarborRequirements(destCountry, destCurrency, signal) {
  const qs = new URLSearchParams({ destCountry, destCurrency }).toString()
  return request(`/payments/harbor/requirements?${qs}`, { signal })
}

/**
 * Sube el comprobante de pago del usuario (Bolivia / payin manual).
 * @param {string} transactionId
 * @param {File}   file  — JPG, PNG o PDF, máx. 5MB
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
export function uploadComprobante(transactionId, file) {
  const formData = new FormData()
  formData.append('comprobante', file)
  return requestFormData(`/payments/${encodeURIComponent(transactionId)}/comprobante`, formData)
}

/**
 * Obtiene las tasas de cambio activas visibles para el usuario.
 * Usado en el cotizador para mostrar la tasa BOB/USDT vigente.
 * @returns {Promise<{ rates: Array<{ pair, rate, source, updatedAt }> }>}
 */
export function getCurrentExchangeRates() {
  return request('/payments/exchange-rates')
}
