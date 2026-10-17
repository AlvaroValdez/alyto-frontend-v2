/**
 * buildQRCardImage — versión en imagen de `WalletQRCard`, para compartir y descargar.
 *
 * Por qué existe: lo que se manda por WhatsApp no es el DOM de la tarjeta, es un
 * PNG. Un canvas no sabe nada del HTML, así que la tarjeta hay que volver a
 * dibujarla acá. Es duplicación de PRESENTACIÓN, inevitable; la duplicación que
 * sí se evita es la de datos (`TIPOS` viene de la tarjeta) y la del sello del
 * logo sobre el QR (se reutiliza `buildQRWithLogo`).
 *
 * Dos decisiones que no son obvias:
 *
 * 1. **El QR se dibuja a un múltiplo ENTERO de su tamaño nativo** (×2) y con el
 *    suavizado apagado. A escala fraccionaria el vecino-más-cercano reparte mal
 *    los píxeles y los módulos quedan de anchos distintos, que es justo lo que
 *    arruina la lectura. El resto de la tarjeta se adapta al QR, y no al revés.
 *
 * 2. **El tiempo restante NO se dibuja.** En pantalla es un contador vivo; una
 *    imagen es estática y se reenvía. Un "04:32" congelado miente apenas se
 *    comparte. Se recibe `expiryText` ya resuelto por la pantalla ("Sin
 *    expiración", "Vence 18:45") y, si no viene, no se dibuja nada.
 */

import { buildQRWithLogo } from './QRDisplay'
import { TIPOS } from './WalletQRCard'

// Paleta — la misma de la tarjeta (tokens.css), acá en literal porque el canvas
// no resuelve variables CSS.
const C = {
  fondo:      '#FFFFFF',
  borde:      '#E2E8F0',
  cabecera:   '#233E58',
  texto:      '#0D1F3C',
  secundario: '#5A6A8A',
  tenue:      '#9AA5C0',
}

const FUENTE = "'Manrope', system-ui, -apple-system, sans-serif"
const LOGO_RATIO = 604 / 217

/** Rectángulo redondeado. `ctx.roundRect` no está en WebViews viejas de Android. */
function rectRedondo(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
  ctx.lineTo(x + rr, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr)
  ctx.lineTo(x, y + rr)
  ctx.quadraticCurveTo(x, y, x + rr, y)
  ctx.closePath()
}

/**
 * Texto con tracking, letra por letra.
 *
 * `ctx.letterSpacing` existe pero es reciente (Chrome 99+, Safari 16+) y acá
 * corre dentro de una WebView que puede ser más vieja; si no está, el chip
 * perdería las versalitas sin avisar.
 */
function textoConTracking(ctx, texto, x, y, tracking) {
  let cursor = x
  for (const ch of texto) {
    ctx.fillText(ch, cursor, y)
    cursor += ctx.measureText(ch).width + tracking
  }
}

function anchoConTracking(ctx, texto, tracking) {
  let w = 0
  for (const ch of texto) w += ctx.measureText(ch).width + tracking
  return w - tracking
}

/** Carga una imagen y resuelve a null si falla, para no colgar el compartir. */
function cargarImagen(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/**
 * @param {object}  o
 * @param {string}  o.qrBase64      data-URI del QR que viene del backend
 * @param {('charge'|'p2p'|'deposit')} [o.type='charge']
 * @param {('BOB'|'USDC')} [o.asset='BOB']
 * @param {string}  [o.amountText]  monto YA formateado por la pantalla
 * @param {string}  [o.creatorName] titular del QR
 * @param {string}  [o.description] concepto
 * @param {string}  [o.expiryText]  vencimiento ya resuelto, estático
 * @param {string}  [o.qrId]        identificador, para soporte
 * @returns {Promise<string>} data-URI PNG de la tarjeta
 */
export async function buildQRCardImage({
  qrBase64,
  type = 'charge',
  asset = 'BOB',
  amountText,
  creatorName,
  description,
  expiryText,
  qrId,
}) {
  const tipo = TIPOS[type] ?? TIPOS.charge
  const muestraMonto = Boolean(tipo.montoLabel && amountText)

  // El QR con su sello ya resuelto: se compone, no se vuelve a dibujar.
  const qrConLogo = await buildQRWithLogo(qrBase64, asset)

  // Esperar a que Manrope esté lista; si no, el canvas cae a una genérica y la
  // tarjeta compartida no se parece a la de la pantalla.
  try { await document.fonts?.ready } catch { /* navegador sin Font Loading API */ }

  const [qrImg, logoImg] = await Promise.all([
    cargarImagen(qrConLogo),
    cargarImagen('/assets/LogoAlytoWB.png'),
  ])
  if (!qrImg) throw new Error('No se pudo preparar la imagen del QR.')

  // ── Geometría ───────────────────────────────────────────────────────────────
  // ⚠️ La imagen de `buildQRWithLogo` NO siempre es cuadrada: en USDC lleva una
  // banda verde debajo (400×448). Hay que escalar ancho y alto con el MISMO
  // factor entero: forzarla a cuadrado deja los módulos rectangulares y el
  // código deja de escanear, que es exactamente lo que no se puede permitir.
  const ESCALA   = 2                       // entero → módulos parejos
  const qrDibujoW = (qrImg.naturalWidth  || 400) * ESCALA
  const qrDibujoH = (qrImg.naturalHeight || 400) * ESCALA
  const padQR    = 28
  const padCuerpo = 56
  const W = qrDibujoW + padQR * 2 + padCuerpo * 2

  const logoW = 240
  const logoH = Math.round(logoW / LOGO_RATIO)
  const cabeceraH = 56 + logoH + 56

  const F = {
    chip:       30,
    montoLabel: 34,
    monto:      86,
    quienLabel: 32,
    nombre:     44,
    desc:       36,
    expira:     30,
    pie:        30,
  }

  // Alto total, sumando solo los bloques que se van a dibujar.
  let H = cabeceraH + 44
  if (muestraMonto) H += F.montoLabel + 10 + F.monto + 36
  const cajaQRW = qrDibujoW + padQR * 2
  const cajaQRH = qrDibujoH + padQR * 2
  H += cajaQRH
  if (creatorName) H += 36 + F.quienLabel + 10 + F.nombre
  if (description) H += 14 + F.desc
  if (expiryText)  H += 30 + F.expira + 24
  H += 40
  const pieH = qrId ? 20 + F.pie + 20 : 0
  H += pieH

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.textBaseline = 'top'

  // Fondo de la tarjeta
  ctx.fillStyle = C.fondo
  ctx.fillRect(0, 0, W, H)

  // ── Cabecera ────────────────────────────────────────────────────────────────
  ctx.fillStyle = C.cabecera
  ctx.fillRect(0, 0, W, cabeceraH)

  if (logoImg) {
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(logoImg, padCuerpo, Math.round((cabeceraH - logoH) / 2), logoW, logoH)
  }

  // Chip del tipo: versalitas, traslúcido, para acompañar al logotipo sin competirle.
  const chipTxt = tipo.titulo.toUpperCase()
  const tracking = F.chip * 0.12
  ctx.font = `600 ${F.chip}px ${FUENTE}`
  const chipTxtW = anchoConTracking(ctx, chipTxt, tracking)
  const chipPadX = 26
  const chipW = chipTxtW + chipPadX * 2
  const chipH = F.chip + 24
  const chipX = W - padCuerpo - chipW
  const chipY = Math.round((cabeceraH - chipH) / 2)
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  rectRedondo(ctx, chipX, chipY, chipW, chipH, chipH / 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  textoConTracking(ctx, chipTxt, chipX + chipPadX, chipY + 12, tracking)

  // ── Cuerpo ──────────────────────────────────────────────────────────────────
  let y = cabeceraH + 44
  const centro = W / 2
  ctx.textAlign = 'center'

  if (muestraMonto) {
    ctx.fillStyle = C.secundario
    ctx.font = `400 ${F.montoLabel}px ${FUENTE}`
    ctx.fillText(tipo.montoLabel, centro, y)
    y += F.montoLabel + 10
    ctx.fillStyle = C.texto
    ctx.font = `700 ${F.monto}px ${FUENTE}`
    ctx.fillText(amountText, centro, y)
    y += F.monto + 36
  }

  // Marco blanco del QR. El relleno es la zona silenciosa visual: sin ella el
  // lector pierde los marcadores de esquina contra el borde de la tarjeta.
  const cajaX = Math.round(centro - cajaQRW / 2)
  ctx.fillStyle = C.fondo
  rectRedondo(ctx, cajaX, y, cajaQRW, cajaQRH, 28)
  ctx.fill()
  ctx.strokeStyle = C.borde
  ctx.lineWidth = 2
  ctx.stroke()

  // El QR, sin suavizar y con el mismo factor entero en ambos ejes.
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(qrImg, cajaX + padQR, y + padQR, qrDibujoW, qrDibujoH)
  ctx.imageSmoothingEnabled = true
  y += cajaQRH

  if (creatorName) {
    y += 36
    ctx.fillStyle = C.secundario
    ctx.font = `400 ${F.quienLabel}px ${FUENTE}`
    ctx.fillText(tipo.quienLabel, centro, y)
    y += F.quienLabel + 10
    ctx.fillStyle = C.texto
    ctx.font = `600 ${F.nombre}px ${FUENTE}`
    ctx.fillText(creatorName, centro, y)
    y += F.nombre
  }

  if (description) {
    y += 14
    ctx.fillStyle = C.secundario
    ctx.font = `400 ${F.desc}px ${FUENTE}`
    ctx.fillText(description, centro, y)
    y += F.desc
  }

  if (expiryText) {
    y += 30
    ctx.font = `600 ${F.expira}px ${FUENTE}`
    const tw = ctx.measureText(expiryText).width
    const pw = tw + 48
    const ph = F.expira + 24
    ctx.fillStyle = 'rgba(35,62,88,0.10)'
    rectRedondo(ctx, centro - pw / 2, y, pw, ph, ph / 2)
    ctx.fill()
    ctx.fillStyle = C.cabecera
    ctx.fillText(expiryText, centro, y + 12)
    y += ph
  }

  // ── Pie ─────────────────────────────────────────────────────────────────────
  if (qrId) {
    const pieY = H - pieH
    ctx.strokeStyle = C.borde
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, pieY)
    ctx.lineTo(W, pieY)
    ctx.stroke()
    ctx.fillStyle = C.tenue
    ctx.font = `400 ${F.pie}px ${FUENTE}`
    ctx.textAlign = 'left'
    ctx.fillText(String(qrId).slice(0, 8), padCuerpo, pieY + 20)
    ctx.textAlign = 'right'
    ctx.fillText('alyto.app', W - padCuerpo, pieY + 20)
  }

  return canvas.toDataURL('image/png')
}
