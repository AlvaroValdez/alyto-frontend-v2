/**
 * api.js — Capa de Comunicación con el Backend Alyto V2.0
 *
 * La sesión se mantiene con doble mecanismo: cookie HttpOnly `alyto_token`
 * (seteada por el backend en todos los modos) + token en localStorage para
 * el header Bearer. Todas las peticiones envían `credentials: 'include'`
 * y el header Authorization si el token está disponible.
 *
 * Endpoints de autenticación:
 *   loginUser(credentials)  → POST /auth/login
 *   registerUser(data)      → POST /auth/register
 *   logoutUser()            → POST /auth/logout
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'

// Belt-and-suspenders auth: cookie + Bearer header work simultaneously.
// The backend always returns the token in the response body AND sets the
// HttpOnly cookie. The frontend stores it in localStorage so all requests
// (including multipart uploads) can include the Authorization: Bearer header.
// protect() reads cookie first, then falls back to Bearer.
const TOKEN_KEY = 'alyto_token'

export function saveAuthToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// Endpoints donde un 401 NO indica sesión expirada — son credenciales inválidas
// o checks de sesión inicial. No deben disparar el redirect global.
const AUTH_PUBLIC_PATHS = [
  '/auth/me',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
]

function isAuthPublicPath(path) {
  return AUTH_PUBLIC_PATHS.some(p => path.startsWith(p))
}

// ── Request base ──────────────────────────────────────────────────────────

/**
 * Wrapper sobre fetch para subir archivos (FormData / multipart).
 * No setea Content-Type — el browser lo inyecta con el boundary correcto.
 */
export async function requestFormData(path, formData, method = 'POST') {
  const token = localStorage.getItem(TOKEN_KEY)
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })
  const contentType = res.headers.get('Content-Type') ?? ''
  const data = contentType.includes('application/json') ? await res.json() : {}
  if (!res.ok) {
    if (res.status === 401 && !isAuthPublicPath(path)) {
      window.dispatchEvent(new CustomEvent('alyto:unauthorized'))
    }
    const err = new Error(data.error || data.message || `Error ${res.status}`)
    err.status = res.status
    err.data   = data
    throw err
  }
  return data
}

export async function request(path, options = {}) {
  // Read token fresh on every request — no closure over stale values
  const token = localStorage.getItem(TOKEN_KEY)

  const headers = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  }

  const fetchOptions = {
    credentials: 'include',
    ...options,
    headers,
  }

  const res = await fetch(`${BASE_URL}${path}`, fetchOptions)

  // Respuestas no-JSON (ej. PDF binario) se manejan fuera de este wrapper
  const contentType = res.headers.get('Content-Type') ?? ''
  if (!contentType.includes('application/json')) {
    if (!res.ok) {
      const err = new Error(`Error ${res.status}`)
      err.status = res.status
      throw err
    }
    return res
  }

  const data = await res.json()

  if (!res.ok) {
    // 401 → sesión expirada. No disparar para endpoints de auth públicos
    // (login/register → credenciales inválidas; /auth/me → check sesión inicial).
    if (res.status === 401 && !isAuthPublicPath(path)) {
      window.dispatchEvent(new CustomEvent('alyto:unauthorized'))
    }
    const err = new Error(data.error || data.message || `Error ${res.status}`)
    err.status  = res.status
    err.data    = data
    throw err
  }

  return data
}

// ── Auth ───────────────────────────────────────────────────────────────────

/**
 * Valida el token activo y devuelve el perfil fresco del usuario.
 * Llamado por AuthContext al montar la app para evitar sesiones fantasma.
 * @returns {Promise<{ user: object }>}
 */
export function getMe() {
  return request('/auth/me')
}

/**
 * Inicia sesión en el backend.
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ token: string, user: { id, email, legalEntity, kycStatus } }>}
 */
export async function loginUser(credentials) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify(credentials),
  })
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.error || data.message || `Error ${res.status}`)
    err.status = res.status
    err.data   = data
    throw err
  }
  return data
}

/**
 * Registra un nuevo usuario. El backend asigna legalEntity según el country.
 * @param {{ email, password, country, firstName?, lastName?, phone? }} data
 * @returns {Promise<{ token: string, user: { id, email, legalEntity, kycStatus } }>}
 */
export function registerUser(data) {
  return request('/auth/register', {
    method: 'POST',
    body:   JSON.stringify(data),
  })
}

/**
 * Cierra la sesión: incrementa tokenVersion en el backend y limpia la cookie HttpOnly.
 */
export function logoutUser() {
  return request('/auth/logout', { method: 'POST' })
}

/**
 * Elimina (desactiva con retención legal) la cuenta del usuario autenticado.
 * Requiere reautenticación con contraseña. Requisito Google Play.
 * @param {string} password — contraseña actual del usuario
 */
export function deleteAccount(password) {
  return request('/auth/account', {
    method: 'DELETE',
    body:   JSON.stringify({ password, confirm: true }),
  })
}

// ── Pagos ──────────────────────────────────────────────────────────────────

/**
 * Inicia un Pay-in vía Fintoc (corredor Chile → SpA).
 * Requiere usuario autenticado con legalEntity: 'SpA'.
 * @param {number} amount  Monto en CLP
 * @param {string} userId  ID del usuario autenticado
 */
export function initiatePayin(amount, userId) {
  return request('/payments/payin/fintoc', {
    method: 'POST',
    body:   JSON.stringify({ amount, userId }),
  })
}

/**
 * Procesa la liquidación manual del Corredor Bolivia (AV Finance SRL).
 * El backend responde con PDF binario (application/pdf).
 * @param {string} transactionId  MongoDB ObjectId (status: in_transit, legalEntity: SRL)
 * @returns {Promise<{ blob: Blob, filename: string }>}
 */
export async function processBoliviaPayout(transactionId) {
  const token = localStorage.getItem(TOKEN_KEY)
  const res = await fetch(`${BASE_URL}/payouts/bolivia/manual`, {
    method:      'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ transactionId }),
  })

  if (!res.ok) {
    let errMsg = `Error ${res.status}`
    try {
      const data = await res.json()
      errMsg = data.error || errMsg
    } catch { /* body no es JSON */ }
    const err = new Error(errMsg)
    err.status = res.status
    throw err
  }

  const blob        = await res.blob()
  const disposition = res.headers.get('Content-Disposition') ?? ''
  const filename    = disposition.match(/filename="(.+?)"/)?.[1] ?? 'comprobante.pdf'

  return { blob, filename }
}

/**
 * Inicia un On-Ramp institucional B2B vía OwlPay Harbor (corredor LLC).
 * Exclusivo para clientes corporativos bajo AV Finance LLC.
 * @param {{ userId: string, amount: number, destinationWallet: string, memo?: string }} payload
 */
export function initiateCorporateOnRamp(payload) {
  return request('/institutional/onramp/owlpay', {
    method: 'POST',
    body:   JSON.stringify(payload),
  })
}

// ── Identity (Stripe Identity) ─────────────────────────────────────────────

/**
 * Crea una VerificationSession de Stripe Identity en el backend.
 * El backend genera la sesión biométrica y devuelve la client_secret
 * necesaria para abrir el modal nativo de Stripe en el frontend.
 *
 * @param {{ documentNumber?: string }} [data] - Número de documento (CI/RUT)
 *   declarado por el usuario; el backend lo persiste para el Comprobante ASFI.
 * @returns {Promise<{ clientSecret: string, sessionId: string }>}
 */
export function createIdentitySession(data = {}) {
  return request('/identity/verify', {
    method: 'POST',
    body:   JSON.stringify({ documentNumber: data.documentNumber }),
  })
}

// ── Admin ──────────────────────────────────────────────────────────────────

/**
 * Obtiene todos los usuarios del sistema (solo accesible con role = 'admin').
 * @returns {Promise<{ total: number, users: Array }>}
 */
export function fetchAdminUsers() {
  return request('/admin/users')
}

export function fetchAdminUser(userId) {
  return request(`/admin/users/${userId}`)
}

export function updateAdminUser(userId, data) {
  return request(`/admin/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

/**
 * Obtiene las últimas 100 operaciones del libro mayor global (solo admin).
 * @returns {Promise<{ total: number, transactions: Array }>}
 */
export function fetchAdminLedger() {
  return request('/admin/ledger')
}

// ── Vita Wallet — Regional (LatAm) ────────────────────────────────────

/**
 * Obtiene las reglas de formulario dinámico para retiros por país.
 * @returns {Promise<{ rules: Array }>}
 */
export function fetchWithdrawalRules() {
  return request('/regional/withdrawal-rules')
}

/**
 * Obtiene los métodos de pago disponibles para un país.
 * @param {string} countryIso — AR | CL | CO | MX | BR
 * @returns {Promise<{ methods: Array, country: string }>}
 */
export function fetchPaymentMethods(countryIso) {
  return request(`/regional/payment-methods/${countryIso}`)
}

/**
 * Crea un retiro bancario (off-ramp) vía Vita Wallet.
 * @param {object} payload — Campos fijos + dinámicos del país
 */
export function createVitaPayout(payload) {
  return request('/regional/payout', {
    method: 'POST',
    body:   JSON.stringify(payload),
  })
}

/**
 * Crea una orden de pago (on-ramp / payin) vía Vita Wallet.
 * @param {object} payload — { amount, country_iso_code, issue, currency_destiny? }
 */
export function createVitaPayin(payload) {
  return request('/regional/payin', {
    method: 'POST',
    body:   JSON.stringify(payload),
  })
}

/**
 * Precios en tiempo real para calcular montos finales.
 */
export function fetchVitaPrices() {
  return request('/regional/prices')
}

/**
 * Obtiene una VerificationSession de Stripe Identity para iniciar el KYC.
 * @returns {Promise<{ clientSecret: string, sessionId: string }>}
 */
export function createKycSession() {
  return request('/kyc/session')
}

/**
 * Consulta el estado KYC actual del usuario. Usar para polling post-verificación.
 * @returns {Promise<{ kycStatus: string, kycApprovedAt: string|null }>}
 */
export function getKycStatus() {
  return request('/kyc/status')
}

/**
 * Perfil completo del usuario (incluye phone, nationality, sourceOfFunds,
 * dateOfBirth, address, emailVerified, kycProfileCompleted). Usado para
 * pre-llenar el formulario de cumplimiento.
 */
export function getUserProfile() {
  return request('/user/profile')
}

// ── Verificación de email ────────────────────────────────────────────────────

/**
 * Confirma el email del usuario con el código de 6 dígitos.
 * @param {string} code
 * @returns {Promise<{ emailVerified: boolean }>}
 */
export function verifyEmail(code) {
  return request('/auth/verify-email', {
    method: 'POST',
    body:   JSON.stringify({ code }),
  })
}

/**
 * Reenvía el código de verificación (cooldown 60s server-side).
 * @returns {Promise<{ ok: boolean }>}
 */
export function resendVerification() {
  return request('/auth/resend-verification', { method: 'POST' })
}

// ── Información de cumplimiento KYC (CDD previo a la biometría) ───────────────

/**
 * Guarda los datos de cumplimiento que Stripe Identity no provee y que
 * Harbor/anchors requieren para reusar nuestro KYC.
 * @param {{ dateOfBirth: string, nationality: string, sourceOfFunds: string,
 *           address: { street, city, state, zip, country }, phone?: string }} data
 * @returns {Promise<object>} perfil actualizado
 */
export function updateKycProfile(data) {
  return request('/user/kyc-profile', {
    method: 'PATCH',
    body:   JSON.stringify(data),
  })
}

// ── Notificaciones Push ─────────────────────────────────────────────────────

/**
 * Registra el token FCM del dispositivo en el backend para habilitar
 * notificaciones push (pagos recibidos, actualizaciones de transferencia, etc).
 * @param {string} token — Token FCM generado por Firebase Messaging
 */
export function registerFcmToken(token) {
  return request('/auth/fcm-token', {
    method: 'POST',
    body:   JSON.stringify({ token }),
  })
}

// ── Centro de Notificaciones ────────────────────────────────────────────────

export function fetchNotifications(page = 1, limit = 20) {
  return request(`/notifications?page=${page}&limit=${limit}`)
}

export function fetchUnreadCount() {
  return request('/notifications/unread')
}

export function markNotificationsRead(notificationIds) {
  return request('/notifications/read', {
    method: 'PATCH',
    body:   JSON.stringify(notificationIds?.length ? { notificationIds } : {}),
  })
}

// ── Dashboard ───────────────────────────────────────────────────────────────

/**
 * Obtiene todos los datos agregados del dashboard del usuario autenticado.
 *
 * @returns {Promise<{
 *   user: { firstName, lastName, entity, kycStatus },
 *   stats: { totalSent, totalTransactions, completedTransactions, activeTransactions },
 *   recentTransactions: Array,
 *   availableCorridors: Array,
 * }>}
 */
export function fetchDashboard() {
  return request('/dashboard')
}

// ── Auth: recuperación de contraseña ───────────────────────────────────────

/**
 * Solicita el email de recuperación de contraseña.
 * Siempre responde 200 (no revela si el email existe).
 * @param {string} email
 */
export function forgotPassword(email) {
  return request('/auth/forgot-password', {
    method: 'POST',
    body:   JSON.stringify({ email }),
  })
}

/**
 * Restablece la contraseña usando el token recibido por email.
 * @param {{ token: string, newPassword: string }} data
 */
export function resetPassword(data) {
  return request('/auth/reset-password', {
    method: 'POST',
    body:   JSON.stringify(data),
  })
}

// ── KYC ────────────────────────────────────────────────────────────────────

/**
 * Envía la documentación KYC del usuario al backend.
 *
 * Espera un FormData con los campos:
 *   - documentFront  (File) Frente del documento de identidad
 *   - documentBack   (File) Reverso del documento
 *   - selfie         (File) Fotografía de liveness
 *   - tosAccepted    (string 'true') Aceptación de los Términos de Servicio
 *   - legalEntity    (string 'SpA' | 'SRL' | 'LLC') Entidad operativa
 *   - tosVersion     (string) Fecha de versión del contrato aceptado
 *
 * El backend actualiza kycStatus a 'under_review' (o 'approved' en dev)
 * y retorna el usuario actualizado.
 *
 * @param {FormData} formData
 * @returns {Promise<{ message: string, user: object }>}
 */
export async function submitKyc(formData) {
  const token = localStorage.getItem(TOKEN_KEY)
  const res = await fetch(`${BASE_URL}/user/kyc`, {
    method:      'POST',
    credentials: 'include',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  })

  const contentType = res.headers.get('Content-Type') ?? ''
  const data = contentType.includes('application/json') ? await res.json() : {}

  if (!res.ok) {
    const err = new Error(data.error || data.message || `Error ${res.status}`)
    err.status = res.status
    err.data   = data
    throw err
  }

  return data
}

// ── Contactos ──────────────────────────────────────────────────────────────

export const listContacts = (country) =>
  request(`/contacts${country ? `?country=${country}` : ''}`)

export const createContact = (data) =>
  request('/contacts', { method: 'POST', body: JSON.stringify(data) })

export const updateContact = (id, data) =>
  request(`/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const deleteContact = (id) =>
  request(`/contacts/${id}`, { method: 'DELETE' })

export const toggleContactFavorite = (id) =>
  request(`/contacts/${id}/favorite`, { method: 'PATCH' })

// ── Factura B2B ──────────────────────────────────────────────────────────

/**
 * Descarga el Comprobante Oficial de Servicio B2B (PDF) de una transacción.
 * Solo disponible para cuentas Business con KYB aprobado y transacciones SRL completadas.
 *
 * @param {string} transactionId — alytoTransactionId
 */
// ── Wallet P2P (alias + USDC) ────────────────────────────────────────────────

export const getMyAlias = () =>
  request('/wallet/alias/me')

export const checkAliasAvailable = (alias) =>
  request(`/wallet/alias/available?alias=${encodeURIComponent(alias)}`)

export const setAlias = (alias) =>
  request('/wallet/alias', { method: 'PUT', body: JSON.stringify({ alias }) })

export const getUSDCTransferQuote = (alias, amount) =>
  request(`/wallet/usdc/transfer-quote?alias=${encodeURIComponent(alias)}&amount=${amount}`)

export const sendUSDC = (recipientAlias, amount, description, idempotencyKey) =>
  request('/wallet/usdc/send', {
    method: 'POST',
    body: JSON.stringify({
      recipientAlias,
      amount,
      ...(description ? { description } : {}),
    }),
    headers: { 'Idempotency-Key': idempotencyKey },
  })

// ── Factura B2B ──────────────────────────────────────────────────────────
export async function downloadBusinessInvoice(transactionId) {
  const res = await request(`/payments/${transactionId}/business-invoice`)
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
