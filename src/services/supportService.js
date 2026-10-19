// src/services/supportService.js
//
// Cliente del agente IA de soporte (AWS-4 Bedrock — backend /api/v1/support/chat).
// El backend degrada con gracia: ante OFF o error responde 200 con
// { reply, source: 'fallback' }, así que el widget casi nunca ve excepciones
// (solo red caída / 401).

import { request } from './api'

/**
 * Envía un mensaje al asistente "Aly".
 * @param {object} params
 * @param {string} params.message  mensaje del usuario
 * @param {Array<{role:'user'|'assistant', text:string}>} [params.history]  turnos previos
 * @returns {Promise<{ reply: string, source: 'ai'|'fallback' }>}
 */
export function sendSupportMessage({ message, history = [] }) {
  return request('/support/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  })
}

/** Motivos de denuncia. Mismo orden y claves que el enum del backend. */
export const MOTIVOS_DENUNCIA = [
  { clave: 'ofensivo',   etiqueta: 'Ofensivo o inapropiado' },
  { clave: 'peligroso',  etiqueta: 'Peligroso o engañoso' },
  { clave: 'incorrecto', etiqueta: 'Información incorrecta' },
  { clave: 'otro',       etiqueta: 'Otro motivo' },
]

/**
 * Denuncia una respuesta de Aly.
 *
 * Existe por exigencia de la política de IA generativa de Google Play: tiene que
 * poder hacerse sin salir de la app. El `contenido` se manda entero porque la
 * conversación vive solo aquí, en el cliente: el backend no tiene copia y sin
 * este envío la denuncia llegaría sin el texto que denuncia.
 *
 * @param {object} params
 * @param {string} params.contenido       respuesta de Aly que se denuncia
 * @param {string} params.motivo          una de MOTIVOS_DENUNCIA
 * @param {string} [params.mensajeUsuario] el mensaje que la provocó, para contexto
 * @param {string} [params.comentario]    texto libre del usuario
 * @returns {Promise<{ ok: true, reportId: string }>}
 */
export function reportSupportMessage({ contenido, motivo, mensajeUsuario, comentario }) {
  return request('/support/report', {
    method: 'POST',
    body: JSON.stringify({ contenido, motivo, mensajeUsuario, comentario }),
  })
}
