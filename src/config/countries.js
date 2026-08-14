/**
 * countries.js — Fuente ÚNICA de metadatos de países en el frontend.
 *
 * Antes esto vivía copiado en 7 archivos con 4 formas distintas (COUNTRY_META ×3,
 * COUNTRY_INFO, COUNTRY_NAMES ×2, PHONE_PREFIXES ×2), cada una desactualizándose
 * por su lado: el Dashboard decía "Yen japonés" cuando el corredor de Japón ya
 * paga USD, el selector de contactos no conocía Canadá, y la pantalla de éxito
 * solo sabía nombrar 3 países.
 *
 * ⚠️ QUÉ ES Y QUÉ NO ES ESTE MÓDULO:
 *   - ES presentación: nombres, banderas, nombres de moneda, prefijos telefónicos.
 *   - NO decide qué países se pueden elegir ni en qué moneda opera un corredor.
 *     Eso sale SIEMPRE de GET /payments/corridors (la moneda del corredor manda;
 *     `currency` aquí es solo referencia para mostrar contactos/transacciones
 *     viejas de países hoy inactivos).
 *
 * Nota: RegisterPage mantiene su propia lista corta de prefijos a propósito —
 * es el teléfono del USUARIO que se registra (top-8 mercados), no un dato de
 * beneficiario.
 */

export const COUNTRY_META = {
  // ── LatAm ──────────────────────────────────────────────────────────────────
  AR: { name: 'Argentina',       currency: 'ARS', currencyName: 'Peso Argentino',      flagCode: 'ar', flag: '🇦🇷', phonePrefix: '+54' },
  BO: { name: 'Bolivia',         currency: 'BOB', currencyName: 'Boliviano',           flagCode: 'bo', flag: '🇧🇴', phonePrefix: '+591' },
  BR: { name: 'Brasil',          currency: 'BRL', currencyName: 'Real Brasileño',      flagCode: 'br', flag: '🇧🇷', phonePrefix: '+55' },
  CL: { name: 'Chile',           currency: 'CLP', currencyName: 'Peso Chileno',        flagCode: 'cl', flag: '🇨🇱', phonePrefix: '+56' },
  CO: { name: 'Colombia',        currency: 'COP', currencyName: 'Peso Colombiano',     flagCode: 'co', flag: '🇨🇴', phonePrefix: '+57' },
  CR: { name: 'Costa Rica',      currency: 'CRC', currencyName: 'Colón Costarricense', flagCode: 'cr', flag: '🇨🇷', phonePrefix: '+506' },
  DO: { name: 'Rep. Dominicana', currency: 'DOP', currencyName: 'Peso Dominicano',     flagCode: 'do', flag: '🇩🇴', phonePrefix: '+1' },
  EC: { name: 'Ecuador',         currency: 'USD', currencyName: 'Dólar Americano',     flagCode: 'ec', flag: '🇪🇨', phonePrefix: '+593' },
  MX: { name: 'México',          currency: 'MXN', currencyName: 'Peso Mexicano',       flagCode: 'mx', flag: '🇲🇽', phonePrefix: '+52' },
  PA: { name: 'Panamá',          currency: 'USD', currencyName: 'Dólar Americano',     flagCode: 'pa', flag: '🇵🇦', phonePrefix: '+507' },
  PE: { name: 'Perú',            currency: 'PEN', currencyName: 'Sol Peruano',         flagCode: 'pe', flag: '🇵🇪', phonePrefix: '+51' },
  PY: { name: 'Paraguay',        currency: 'PYG', currencyName: 'Guaraní',             flagCode: 'py', flag: '🇵🇾', phonePrefix: '+595' },
  UY: { name: 'Uruguay',         currency: 'UYU', currencyName: 'Peso Uruguayo',       flagCode: 'uy', flag: '🇺🇾', phonePrefix: '+598' },
  VE: { name: 'Venezuela',       currency: 'USD', currencyName: 'Dólar Americano',     flagCode: 've', flag: '🇻🇪', phonePrefix: '+58' },

  // ── Global ─────────────────────────────────────────────────────────────────
  AE: { name: 'Emiratos Árabes', currency: 'AED', currencyName: 'Dírham Emiratí',      flagCode: 'ae', flag: '🇦🇪', phonePrefix: '+971' },
  AU: { name: 'Australia',       currency: 'AUD', currencyName: 'Dólar Australiano',   flagCode: 'au', flag: '🇦🇺', phonePrefix: '+61' },
  // Canadá y Japón pagan USD (rails del proveedor) — la moneda real siempre la
  // pone el corredor; esta es solo la referencia de display.
  CA: { name: 'Canadá',          currency: 'USD', currencyName: 'Dólar Americano',     flagCode: 'ca', flag: '🇨🇦', phonePrefix: '+1' },
  CN: { name: 'China',           currency: 'CNY', currencyName: 'Yuan Chino',          flagCode: 'cn', flag: '🇨🇳', phonePrefix: '+86' },
  EU: { name: 'Europa',          currency: 'EUR', currencyName: 'Euro',                flagCode: 'eu', flag: '🇪🇺', phonePrefix: '+',
        keywords: 'españa spain alemania germany francia france italia italy portugal paises bajos netherlands irlanda austria belgica sepa euro' },
  GB: { name: 'Reino Unido',     currency: 'GBP', currencyName: 'Libra Esterlina',     flagCode: 'gb', flag: '🇬🇧', phonePrefix: '+44' },
  HK: { name: 'Hong Kong',       currency: 'HKD', currencyName: 'Dólar HK',            flagCode: 'hk', flag: '🇭🇰', phonePrefix: '+852' },
  JP: { name: 'Japón',           currency: 'USD', currencyName: 'Dólar Americano',     flagCode: 'jp', flag: '🇯🇵', phonePrefix: '+81' },
  NG: { name: 'Nigeria',         currency: 'NGN', currencyName: 'Naira Nigeriana',     flagCode: 'ng', flag: '🇳🇬', phonePrefix: '+234' },
  SG: { name: 'Singapur',        currency: 'SGD', currencyName: 'Dólar de Singapur',   flagCode: 'sg', flag: '🇸🇬', phonePrefix: '+65' },
  US: { name: 'Estados Unidos',  currency: 'USD', currencyName: 'Dólar Americano',     flagCode: 'us', flag: '🇺🇸', phonePrefix: '+1' },

  // ── Solo display de datos históricos (corredores hoy inactivos o legacy) ───
  ES: { name: 'España',          currency: 'EUR', currencyName: 'Euro',                flagCode: 'es', flag: '🇪🇸', phonePrefix: '+34' },   // legacy: bo-es migró a EU
  GT: { name: 'Guatemala',       currency: 'GTQ', currencyName: 'Quetzal',             flagCode: 'gt', flag: '🇬🇹', phonePrefix: '+502' },
  HT: { name: 'Haití',           currency: 'HTG', currencyName: 'Gourde',              flagCode: 'ht', flag: '🇭🇹', phonePrefix: '+509' },
  IN: { name: 'India',           currency: 'INR', currencyName: 'Rupia India',         flagCode: 'in', flag: '🇮🇳', phonePrefix: '+91' },
  PL: { name: 'Polonia',         currency: 'PLN', currencyName: 'Zloty',               flagCode: 'pl', flag: '🇵🇱', phonePrefix: '+48' },
  SV: { name: 'El Salvador',     currency: 'USD', currencyName: 'Dólar Americano',     flagCode: 'sv', flag: '🇸🇻', phonePrefix: '+503' },
  ZA: { name: 'Sudáfrica',       currency: 'ZAR', currencyName: 'Rand Sudafricano',    flagCode: 'za', flag: '🇿🇦', phonePrefix: '+27' },
}

/** Nombres de moneda por código ISO — para subtítulos donde solo hay la sigla. */
export const CURRENCY_NAMES = {
  AED: 'Dírham Emiratí',  ARS: 'Peso Argentino',  AUD: 'Dólar Australiano',
  BOB: 'Boliviano',       BRL: 'Real Brasileño',  CAD: 'Dólar Canadiense',
  CLP: 'Peso Chileno',    CNY: 'Yuan Chino',      COP: 'Peso Colombiano',
  CRC: 'Colón Costaricc.', DOP: 'Peso Dominicano', EUR: 'Euro',
  GBP: 'Libra Esterlina', GTQ: 'Quetzal',         HKD: 'Dólar HK',
  HTG: 'Gourde',          INR: 'Rupia India',     JPY: 'Yen Japonés',
  KRW: 'Won Coreano',     MXN: 'Peso Mexicano',   NGN: 'Naira Nigeriana',
  PEN: 'Sol Peruano',     PLN: 'Zloty',           PYG: 'Guaraní',
  SGD: 'Dólar Singapur',  USD: 'Dólar Americano', UYU: 'Peso Uruguayo',
  ZAR: 'Rand Sudafricano',
}

/** Nombre del país, con el código como último recurso (nunca undefined en UI). */
export function countryName(code) {
  return COUNTRY_META[code]?.name ?? code ?? '—'
}

/** Prefijo telefónico del país ('' si no se conoce). */
export function phonePrefix(code) {
  return COUNTRY_META[code]?.phonePrefix ?? ''
}

/** URL de bandera circular (flagcdn). */
export function flagUrl(codeOrFlagCode) {
  const meta = COUNTRY_META[codeOrFlagCode]
  const fc = meta?.flagCode ?? String(codeOrFlagCode ?? '').toLowerCase()
  return `https://flagcdn.com/w80/${fc}.png`
}
