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
import {
  C, FUENTE, LOGO_RATIO, rectRedondo, cargarImagen, esperarFuentes, dibujarCabecera,
} from './cardCanvas'

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
  await esperarFuentes()

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
  // Compartida con el comprobante de movimiento: misma marca, mismo chip.
  dibujarCabecera(ctx, {
    W, logoImg, chipTexto: tipo.titulo,
    padLateral: padCuerpo, logoW, fontChip: F.chip,
  })

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
