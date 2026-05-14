/**
 * formValidators.js — Validadores robustos para evitar errores de llenado
 * de formulario antes de submitir al backend.
 *
 * Cada validador retorna `null` si el valor es válido, o un string con el
 * mensaje de error si es inválido. Diseñado para integrarse con el
 * validateField() del Step3Beneficiary.
 *
 * Validaciones implementadas:
 *   - IBAN: format + mod-97 checksum + country prefix consistency
 *   - CPF (Brasil): format + mod-11 checksum
 *   - Postal code: regex por país (DE/FR/ES/IT/NL/AT/BE/PT/PL/CH/GB/US/CN/BR/MX/IN/SG/JP)
 *   - SWIFT/BIC: 8 u 11 chars uppercase
 *   - E.164 phone: + prefijo internacional
 *   - UAE phone: específico +971 + 8/9 digits
 *   - Sort code GB: 6 digits format 00-00-00
 *   - Routing number US: 9 digits
 *   - IFSC code IN: 4 letters + 0 + 6 alphanum
 *   - CLABE MX: 18 digits
 *   - NUBAN NG: 10 digits
 */

// ─── IBAN ───────────────────────────────────────────────────────────────────
// Algoritmo mod-97 oficial (ISO 13616). Acepta cualquier país IBAN.
export function validateIBAN(iban, expectedCountry = null) {
  if (!iban) return 'IBAN es requerido'
  const clean = iban.replace(/\s/g, '').toUpperCase()
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(clean)) {
    return 'Formato IBAN inválido (debe empezar con 2 letras país + 2 dígitos + 11-30 alfanuméricos)'
  }
  const countryCode = clean.slice(0, 2)
  if (expectedCountry && countryCode !== expectedCountry.toUpperCase()) {
    return `El IBAN empieza con ${countryCode} pero se esperaba ${expectedCountry}`
  }
  // Mod-97: mover los primeros 4 caracteres al final, convertir letras a números (A=10..Z=35), validar mod 97 === 1
  const rearranged = clean.slice(4) + clean.slice(0, 4)
  const numeric = rearranged.replace(/[A-Z]/g, (ch) => (ch.charCodeAt(0) - 55).toString())
  // BigInt division compatibility: do incremental mod
  let remainder = 0
  for (const ch of numeric) {
    remainder = (remainder * 10 + parseInt(ch, 10)) % 97
  }
  if (remainder !== 1) {
    return 'IBAN inválido (dígitos verificadores no coinciden). Verifica los dígitos con el beneficiario.'
  }
  return null
}

/** Extrae código país de un IBAN (primeros 2 chars) o null si inválido */
export function ibanCountry(iban) {
  if (!iban) return null
  const clean = iban.replace(/\s/g, '').toUpperCase()
  if (!/^[A-Z]{2}/.test(clean)) return null
  return clean.slice(0, 2)
}

// ─── CPF (Brasil) ───────────────────────────────────────────────────────────
// Algoritmo mod-11 oficial Receita Federal. Harbor valida con esto.
export function validateCPF(cpf) {
  if (!cpf) return 'CPF es requerido'
  const clean = cpf.replace(/[^\d]/g, '')
  if (clean.length !== 11) return 'CPF debe tener exactamente 11 dígitos'
  if (/^(\d)\1{10}$/.test(clean)) return 'CPF inválido (todos los dígitos iguales)'

  // Primer dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i], 10) * (10 - i)
  let digit1 = (sum * 10) % 11
  if (digit1 === 10 || digit1 === 11) digit1 = 0
  if (digit1 !== parseInt(clean[9], 10)) return 'CPF inválido (primer dígito verificador no coincide)'

  // Segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i], 10) * (11 - i)
  let digit2 = (sum * 10) % 11
  if (digit2 === 10 || digit2 === 11) digit2 = 0
  if (digit2 !== parseInt(clean[10], 10)) return 'CPF inválido (segundo dígito verificador no coincide)'

  return null
}

// ─── Postal code por país (los más comunes en Harbor) ───────────────────────
const POSTAL_CODE_PATTERNS = {
  DE: { regex: /^\d{5}$/,                        hint: '5 dígitos (ej. 10115 Berlin)' },
  FR: { regex: /^\d{5}$/,                        hint: '5 dígitos (ej. 75001 París)' },
  ES: { regex: /^\d{5}$/,                        hint: '5 dígitos (ej. 28001 Madrid)' },
  IT: { regex: /^\d{5}$/,                        hint: '5 dígitos (ej. 00100 Roma)' },
  NL: { regex: /^\d{4}\s?[A-Z]{2}$/i,            hint: '4 dígitos + 2 letras (ej. 1011 AB)' },
  BE: { regex: /^\d{4}$/,                        hint: '4 dígitos (ej. 1000 Bruselas)' },
  PT: { regex: /^\d{4}-?\d{3}$/,                 hint: '4-3 dígitos (ej. 1000-001)' },
  AT: { regex: /^\d{4}$/,                        hint: '4 dígitos' },
  PL: { regex: /^\d{2}-?\d{3}$/,                 hint: '2-3 dígitos (ej. 00-001)' },
  CH: { regex: /^\d{4}$/,                        hint: '4 dígitos' },
  IE: { regex: /^[A-Z]\d{2}\s?[A-Z0-9]{4}$/i,    hint: 'Eircode (ej. D02 X285)' },
  GB: { regex: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, hint: 'Código postal UK (ej. SW1A 1AA)' },
  US: { regex: /^\d{5}(-\d{4})?$/,               hint: 'ZIP code 5 dígitos (o 5+4, ej. 90210)' },
  CN: { regex: /^\d{6}$/,                        hint: '6 dígitos (ej. 200000 Shanghai)' },
  BR: { regex: /^\d{5}-?\d{3}$/,                 hint: 'CEP 8 dígitos (ej. 01310-100)' },
  MX: { regex: /^\d{5}$/,                        hint: '5 dígitos (ej. 06600 CDMX)' },
  IN: { regex: /^\d{6}$/,                        hint: 'PIN code 6 dígitos (ej. 560001 Bangalore)' },
  SG: { regex: /^\d{6}$/,                        hint: '6 dígitos (ej. 048616)' },
  JP: { regex: /^\d{3}-?\d{4}$/,                 hint: '7 dígitos (ej. 100-0001)' },
  HK: { regex: /^.{0,20}$/,                      hint: 'HK no usa código postal estándar' },
  AE: { regex: /^.{0,20}$/,                      hint: 'UAE no usa código postal estándar' },
  NG: { regex: /^\d{6}$/,                        hint: '6 dígitos (ej. 100001 Lagos)' },
}

export function validatePostalCode(postal, countryCode) {
  if (!postal) return 'Código postal es requerido'
  const pattern = POSTAL_CODE_PATTERNS[(countryCode ?? '').toUpperCase()]
  if (!pattern) return null  // país no mapeado — confiar
  if (!pattern.regex.test(postal.trim())) {
    return `Formato inválido para ${countryCode}. ${pattern.hint}`
  }
  return null
}

export function postalCodeHint(countryCode) {
  const p = POSTAL_CODE_PATTERNS[(countryCode ?? '').toUpperCase()]
  return p?.hint ?? 'Código postal del beneficiario'
}

// ─── SWIFT / BIC ────────────────────────────────────────────────────────────
export function validateSwiftBIC(value) {
  if (!value) return 'SWIFT/BIC es requerido'
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(value.trim())) {
    return 'SWIFT/BIC inválido (8 u 11 caracteres en mayúsculas, ej. COBADEFFXXX)'
  }
  return null
}

// ─── Phone E.164 ────────────────────────────────────────────────────────────
export function validatePhoneE164(value, expectedPrefix = null) {
  if (!value) return 'Teléfono es requerido'
  const clean = value.replace(/\s/g, '')
  if (!/^\+[1-9]\d{1,14}$/.test(clean)) {
    return 'Formato E.164 inválido (debe empezar con + y código país, ej. +5511999999999)'
  }
  if (expectedPrefix && !clean.startsWith(expectedPrefix)) {
    return `Teléfono debe empezar con ${expectedPrefix}`
  }
  return null
}

// ─── UAE phone (+971) ───────────────────────────────────────────────────────
export function validateUAEPhone(value) {
  if (!value) return 'Teléfono UAE es requerido'
  if (!/^\+971\d{8,9}$/.test(value.replace(/\s/g, ''))) {
    return 'Teléfono UAE inválido (formato: +971 + 8 o 9 dígitos)'
  }
  return null
}

// ─── Sort code UK ───────────────────────────────────────────────────────────
export function validateSortCode(value) {
  if (!value) return 'Sort code es requerido'
  if (!/^\d{2}-?\d{2}-?\d{2}$/.test(value.trim())) {
    return 'Sort code inválido (6 dígitos, ej. 20-00-00)'
  }
  return null
}

// ─── Routing number US (ABA) ────────────────────────────────────────────────
// Validación mod-10 ABA estándar
export function validateRoutingNumber(value) {
  if (!value) return 'Routing number es requerido'
  const clean = value.replace(/[^\d]/g, '')
  if (clean.length !== 9) return 'Routing number debe tener 9 dígitos'
  const d = clean.split('').map(Number)
  const checksum = (3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8])) % 10
  if (checksum !== 0) return 'Routing number inválido (checksum ABA falla)'
  return null
}

// ─── IFSC code India ────────────────────────────────────────────────────────
export function validateIFSC(value) {
  if (!value) return 'Código IFSC es requerido'
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.trim().toUpperCase())) {
    return 'IFSC inválido (4 letras + 0 + 6 alfanuméricos, ej. HDFC0001234)'
  }
  return null
}

// ─── CLABE México ───────────────────────────────────────────────────────────
// 18 dígitos. Validación mod-10 con pesos [3,7,1] repetidos.
export function validateCLABE(value) {
  if (!value) return 'CLABE es requerida'
  const clean = value.replace(/[^\d]/g, '')
  if (clean.length !== 18) return 'CLABE debe tener exactamente 18 dígitos'
  const weights = [3, 7, 1]
  let sum = 0
  for (let i = 0; i < 17; i++) {
    sum += (parseInt(clean[i], 10) * weights[i % 3]) % 10
  }
  const checksum = (10 - (sum % 10)) % 10
  if (checksum !== parseInt(clean[17], 10)) return 'CLABE inválida (dígito verificador no coincide)'
  return null
}

// ─── NUBAN Nigeria ──────────────────────────────────────────────────────────
export function validateNUBAN(value) {
  if (!value) return 'Número de cuenta NUBAN es requerido'
  if (!/^\d{10}$/.test(value.trim())) return 'NUBAN debe tener exactamente 10 dígitos'
  return null
}

// ─── Email ──────────────────────────────────────────────────────────────────
export function validateEmail(value) {
  if (!value) return null  // typically optional
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Email inválido'
  return null
}

// ─── Dispatch unificado por field key ───────────────────────────────────────
// Mapea cada `key` de form a su validador. Usado por validateField
// para invocar el validador específico antes del check de pattern genérico.
export const FIELD_VALIDATORS = {
  iban:                      (v, ctx) => validateIBAN(v, ctx?.expectedCountry ?? null),
  br_cpf:                    validateCPF,
  beneficiary_id_doc_number_br: validateCPF,
  postal_code:               (v, ctx) => validatePostalCode(v, ctx?.addressCountry ?? null),
  swift_code:                validateSwiftBIC,
  bic:                       validateSwiftBIC,
  phone_number:              (v, ctx) => ctx?.country === 'AE' ? validateUAEPhone(v) : validatePhoneE164(v),
  beneficiary_phone_number:  validatePhoneE164,
  sort_code:                 validateSortCode,
  routing_number:            validateRoutingNumber,
  bank_code:                 (v, ctx) => ctx?.country === 'IN' ? validateIFSC(v) : null,  // HK bank_code es 3 dígitos
  in_ifsc_code:              validateIFSC,
  mx_clabe:                  validateCLABE,
  account_number:            (v, ctx) => ctx?.country === 'NG' ? validateNUBAN(v) : null,
  email:                     validateEmail,
  beneficiary_email:         validateEmail,
}

/**
 * Ejecuta el validador específico de un campo si existe.
 * @param {string} key
 * @param {string} value
 * @param {object} ctx - { country, addressCountry, expectedCountry, paymentMethod }
 * @returns {string|null} mensaje de error o null si ok
 */
export function runFieldValidator(key, value, ctx = {}) {
  const validator = FIELD_VALIDATORS[key]
  if (!validator) return null
  if (!value && value !== 0) return null  // empty values: dejar al required check del form
  try {
    return validator(value, ctx)
  } catch (e) {
    console.warn(`[formValidators] Error ejecutando validator de ${key}:`, e.message)
    return null
  }
}
