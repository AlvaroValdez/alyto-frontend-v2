/**
 * sep24Service.js — Cliente SEP-24 (Interactive Anchor)
 *
 * Endpoints reales del backend (montados en /api/v1/stellar/anchor):
 *   GET  /anchor/info
 *   POST /anchor/transactions/deposit   { asset_code, amount, account? }
 *   POST /anchor/transactions/withdraw  { asset_code, amount, account?, dest, dest_extra, type }
 *   GET  /anchor/transaction?id=...
 *
 * Auth: estos endpoints usan sep10Protect (acepta JWT Alyto o token SEP-10).
 *   - Usuario Alyto in-app → token de localStorage (lo agrega request()).
 *   - Webview de wallet externa → token SEP-10 pasado por ?token= en la URL,
 *     que se reenvía aquí como override del header Authorization.
 */

import { request } from './api'

const BASE = '/stellar/anchor'

/** Construye las options de request con override opcional del token (webview SEP-10). */
function withToken(token, extra = {}) {
  if (!token) return extra
  return { ...extra, headers: { ...(extra.headers ?? {}), Authorization: `Bearer ${token}` } }
}

export function getSep24Info(token) {
  return request(`${BASE}/info`, withToken(token))
}

export function initiateSep24Deposit({ amount, account }, token) {
  return request(`${BASE}/transactions/deposit`, withToken(token, {
    method: 'POST',
    body:   JSON.stringify({ asset_code: 'USDC', amount, account }),
  }))
}

export function initiateSep24Withdraw({ amount, account, dest, dest_extra, type = 'bank_account' }, token) {
  return request(`${BASE}/transactions/withdraw`, withToken(token, {
    method: 'POST',
    body:   JSON.stringify({ asset_code: 'USDC', amount, account, dest, dest_extra, type }),
  }))
}

export function getSep24Transaction(id, token) {
  return request(`${BASE}/transaction?id=${encodeURIComponent(id)}`, withToken(token))
}
