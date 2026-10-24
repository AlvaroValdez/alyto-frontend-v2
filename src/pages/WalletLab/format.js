/**
 * Formateadores del apartado Dark Minimal.
 *
 * Difieren a propósito de `pages/Wallet/WalletPage.jsx` en un detalle: la
 * especificación pide "Bs 14.850,00" sin punto tras "Bs", mientras la wallet
 * vigente escribe "Bs. 14.850,00". Es parte de lo que se está evaluando, así
 * que vive acá y no se toca el original.
 *
 * El dinero del usuario boliviano se muestra SIEMPRE en bolivianos con su
 * símbolo local, nunca convertido a dólares para "ayudar".
 */

const NF_BOB = new Intl.NumberFormat('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const NF_USDC = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * `null`/`undefined` NO se formatean como cero: devuelven un guion largo.
 * Un cero inventado sobre un saldo que no se pudo leer es un dato falso.
 */
export function formatBOB(amount) {
  if (amount == null || !Number.isFinite(Number(amount))) return '—'
  return `Bs ${NF_BOB.format(Number(amount))}`
}

export function formatUSDC(amount) {
  if (amount == null || !Number.isFinite(Number(amount))) return '—'
  return `${NF_USDC.format(Number(amount))} USDC`
}

/** Elige el formateador según la moneda activa. */
export function formatMoney(amount, currency) {
  return currency === 'USDC' ? formatUSDC(amount) : formatBOB(amount)
}

/** Solo la parte numérica, para montos donde el símbolo va aparte. */
export function formatPlain(amount, currency) {
  if (amount == null || !Number.isFinite(Number(amount))) return '—'
  const nf = currency === 'USDC' ? NF_USDC : NF_BOB
  return nf.format(Number(amount))
}

/** Fecha en hora de Bolivia, no la del dispositivo. */
export function formatDate(d) {
  if (!d) return ''
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

/**
 * Cuánto falta para la medianoche de La Paz, que es cuando se renuevan los
 * límites diarios. Se calcula en vez de escribir "Renueva en 6h", que sería
 * un número decorativo y falso once horas al día.
 */
export function horasHastaMedianocheBO(ahora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/La_Paz',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(ahora)

  const get = (t) => Number(partes.find((p) => p.type === t)?.value ?? 0)
  const h = get('hour') % 24
  const m = get('minute')
  const minutosRestantes = (24 * 60) - (h * 60 + m)

  if (minutosRestantes <= 60) return `${minutosRestantes} min`
  return `${Math.floor(minutosRestantes / 60)} h`
}
