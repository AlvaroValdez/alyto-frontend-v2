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
