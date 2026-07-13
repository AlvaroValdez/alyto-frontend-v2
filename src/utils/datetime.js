/**
 * datetime.js — Formateo de fechas SIEMPRE en hora de Bolivia.
 *
 * AV Finance SRL opera en Bolivia (America/La_Paz, UTC-4, sin horario de verano).
 * Los timestamps se guardan en UTC en Mongo; forzar el timeZone acá evita que el
 * dispositivo del usuario (o un servidor en UTC) muestre la hora equivocada
 * (p. ej. 23:29 UTC en lugar de 19:29 Bolivia).
 */
export const BOLIVIA_TZ = 'America/La_Paz'

/** Fecha + hora en zona Bolivia. Ej: "12 jul 2026, 19:29" */
export function formatDateTime(value, opts = {}) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d)) return '—'
  return d.toLocaleString('es-BO', {
    timeZone: BOLIVIA_TZ,
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    ...opts,
  })
}

/** Solo fecha en zona Bolivia. Ej: "12 jul 2026" */
export function formatDate(value, opts = {}) {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d)) return '—'
  return d.toLocaleDateString('es-BO', {
    timeZone: BOLIVIA_TZ,
    day: '2-digit', month: 'short', year: 'numeric',
    ...opts,
  })
}
