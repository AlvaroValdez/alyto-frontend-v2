/**
 * paymentsService.js — Capa de servicio para el motor cross-border de Alyto V2.0
 *
 * Funciones:
 *   getQuote(originAmount, destinationCountry)  → GET /payments/quote
 *   initPayment(payload)                        → POST /payments/crossborder
 *   getTransactionStatus(transactionId)         → GET /payments/status/:id
 */

import { request } from './api'

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
