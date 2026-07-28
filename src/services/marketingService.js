/**
 * marketingService.js — Agente de marketing y educación financiera
 *
 * Endpoints del panel admin: /api/v1/admin/marketing
 * Todas usan request() de api.js (inyecta JWT automáticamente).
 *
 * ⚠️ El módulo es feature-gated en el backend (MARKETING_AGENT_ENABLED). Si el
 * flag está apagado el router ni se monta y estos endpoints devuelven 404 — la
 * página lo interpreta como "módulo deshabilitado", no como un error.
 */

import { request } from './api'

/**
 * Salud del módulo: flag, modelo activo y conteo de piezas por estado.
 * @returns {Promise<{ habilitado:boolean, modelo:string, piezas:Object<string,number> }>}
 */
export function getMarketingEstado() {
  return request('/admin/marketing/estado')
}

/**
 * Genera una pieza: llama al modelo, la clasifica y la persiste.
 * El estado resultante lo decide el clasificador determinista, no el modelo.
 *
 * @param {string} tarea  qué pieza generar (mensaje del usuario al agente)
 * @returns {Promise<{ pieza:object }>}
 * @throws error con `.status` 502 si el modelo devolvió algo inutilizable
 */
export function generarPieza(tarea) {
  return request('/admin/marketing/generar', {
    method: 'POST',
    body:   JSON.stringify({ tarea }),
  })
}

/**
 * Cola de aprobación: piezas de alto riesgo esperando decisión humana,
 * más viejas primero. Cada pieza viene marcada con `prohibida` cuando contiene
 * algo que NO puede aprobarse en ningún caso (terminología de marca vetada, certificaciones que Alyto no posee,
 * sobre-afirmación del estatus regulatorio).
 *
 * @param {{page?:number, limit?:number}} params
 * @returns {Promise<{ piezas:Array, pagination:object }>}
 */
export function listarPendientes(params = {}) {
  const qs = new URLSearchParams()
  if (params.page)  qs.set('page',  params.page)
  if (params.limit) qs.set('limit', params.limit)
  const q = qs.toString()
  return request(`/admin/marketing/pendientes${q ? `?${q}` : ''}`)
}

/**
 * Historial completo, paginado. Filtros opcionales: estado, canal, tipo,
 * clasificacionFinal.
 * @param {{page?, limit?, estado?, canal?, tipo?, clasificacionFinal?}} params
 * @returns {Promise<{ piezas:Array, pagination:object }>}
 */
export function listarHistorial(params = {}) {
  const qs = new URLSearchParams()
  for (const k of ['page', 'limit', 'estado', 'canal', 'tipo', 'clasificacionFinal']) {
    if (params[k]) qs.set(k, params[k])
  }
  const q = qs.toString()
  return request(`/admin/marketing/historial${q ? `?${q}` : ''}`)
}

/**
 * Aprueba una pieza pendiente. Queda registrado quién y cuándo, más un
 * AdminAuditLog con IP y estado previo.
 *
 * @throws error con `.status` 422 si la pieza contiene una prohibición absoluta
 *         (no aprobable por nadie), o 409 si otro admin ya la resolvió.
 */
export function aprobarPieza(id) {
  return request(`/admin/marketing/${id}/aprobar`, { method: 'POST' })
}

/**
 * Rechaza una pieza pendiente. Siempre disponible, incluso para piezas con
 * prohibiciones absolutas — rechazarlas es justamente lo que corresponde.
 * @param {string} id
 * @param {string} [motivo]  queda en el audit log
 */
export function rechazarPieza(id, motivo) {
  return request(`/admin/marketing/${id}/rechazar`, {
    method: 'POST',
    body:   JSON.stringify({ motivo: motivo || '' }),
  })
}

/**
 * Publica una pieza aprobada en su red social. Irreversible desde el panel.
 *
 * @throws error con `.status`:
 *   409 ya publicada / intento sin resolver / estado no publicable
 *   422 contiene una prohibición absoluta
 *   501 la red no acepta este tipo de contenido (TikTok con texto)
 *   503 publicación deshabilitada o publicador sin configurar
 *   504 no hubo respuesta de la red — la pieza queda trabada
 */
export function listarPublicables(params = {}) {
  const qs = new URLSearchParams()
  if (params.page)  qs.set('page',  params.page)
  if (params.limit) qs.set('limit', params.limit)
  const q = qs.toString()
  return request(`/admin/marketing/publicables${q ? `?${q}` : ''}`)
}

export function publicarPieza(id) {
  return request(`/admin/marketing/${id}/publicar`, { method: 'POST' })
}

/**
 * Libera una pieza trabada por un intento que no cerró.
 * Solo después de verificar en la red que el post NO salió.
 */
export function destrabarPieza(id, motivo) {
  return request(`/admin/marketing/${id}/destrabar`, {
    method: 'POST',
    body:   JSON.stringify({ motivo: motivo || '' }),
  })
}

export default {
  getMarketingEstado,
  generarPieza,
  listarPendientes,
  listarHistorial,
  aprobarPieza,
  rechazarPieza,
  listarPublicables,
  publicarPieza,
  destrabarPieza,
}
