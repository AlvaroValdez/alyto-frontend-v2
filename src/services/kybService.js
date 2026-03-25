/**
 * kybService.js — Capa de comunicación KYB (Know Your Business) de Alyto V2.0
 *
 * Endpoints de usuario:
 *   applyKyb(formData)         → POST /kyb/apply          (multipart)
 *   getKybStatus()             → GET  /kyb/status
 *   uploadMoreInfo(formData)   → POST /kyb/more-info       (multipart)
 *
 * Endpoints de admin:
 *   listKybApplications(params) → GET  /admin/kyb
 *   getKybDetail(businessId)    → GET  /admin/kyb/:id
 *   decideKyb(businessId, data) → POST /admin/kyb/:id/decide
 */

import { request, requestFormData } from './api'

// ── Usuario ────────────────────────────────────────────────────────────────

/** Envía la solicitud KYB con FormData (datos + archivos). */
export function applyKyb(formData) {
  return requestFormData('/kyb/apply', formData)
}

/** Retorna el estado actual del KYB del usuario autenticado. */
export function getKybStatus() {
  return request('/kyb/status')
}

/** Sube documentos adicionales cuando el admin solicita más información. */
export function uploadMoreInfo(formData) {
  return requestFormData('/kyb/more-info', formData)
}

// ── Admin ──────────────────────────────────────────────────────────────────

/**
 * Lista solicitudes KYB.
 * @param {Object} params — { status, country, volumeRange, page, limit }
 */
export function listKybApplications(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v != null)
  )
  const qs = new URLSearchParams(clean).toString()
  return request(`/admin/kyb${qs ? '?' + qs : ''}`)
}

/** Detalle completo de una solicitud KYB. */
export function getKybDetail(businessId) {
  return request(`/admin/kyb/${businessId}`)
}

/**
 * Registra la decisión del admin sobre una solicitud.
 * @param {string} businessId
 * @param {{ decision: 'approved'|'rejected'|'more_info', note: string,
 *           rejectionReason: string, maxTransactionUsd: number, maxMonthlyUsd: number }} data
 */
export function decideKyb(businessId, data) {
  return request(`/admin/kyb/${businessId}/decide`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
