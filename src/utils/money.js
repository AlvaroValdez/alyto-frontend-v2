/**
 * Formato del dinero del usuario, en SU moneda.
 *
 * Vivía duplicado: Step1Amount tenía esta función y Step4Confirm escribía el
 * símbolo "$" a mano sobre cualquier moneda, así que la pantalla de confirmación
 * anunciaba "$1.400 BOB" mientras el paso anterior, para el mismo importe, decía
 * "Bs 1.400". Con una sola fuente no pueden volver a separarse.
 */

// Monedas que no usan decimales (enteros puros)
export const INTEGER_CURRENCIES = new Set(['CLP', 'PYG', 'JPY', 'KRW'])

/** Símbolo local de la moneda de ORIGEN. Espejo de utils/currencyDisplay.js del backend. */
export const ORIGIN_SYMBOLS = { BOB: 'Bs', CLP: '$', USD: 'US$' }

/**
 * El dinero del usuario, en SU moneda: símbolo local y sin el código ISO al lado.
 *
 * El código ISO se reserva para el importe de DESTINO, donde sí aporta: ahí el
 * usuario necesita saber en qué moneda cobra el beneficiario. En el lado origen
 * sólo duplica ("Bs 21,67 BOB") o, peor, obliga a convertir mentalmente cuando
 * se anuncia en una moneda que no es la suya.
 */
export function formatOriginAmount(amount, currency) {
  const n = Number(amount)
  if (!isFinite(n)) return '—'
  const decimals = INTEGER_CURRENCIES.has(currency) ? 0 : 2
  const numero   = n.toLocaleString('es-CL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  const simbolo = ORIGIN_SYMBOLS[currency]
  return simbolo ? `${simbolo} ${numero}` : `${numero} ${currency}`
}
