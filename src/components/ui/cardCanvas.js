/**
 * cardCanvas — primitivas compartidas para dibujar tarjetas Alyto en un canvas.
 *
 * Existen dos imágenes que se comparten por WhatsApp (el QR de cobro y el
 * comprobante de movimiento) y las dos tienen la misma identidad: cabecera azul
 * con el logotipo, chip en versalitas, cuerpo blanco y pie. Sin este módulo cada
 * una llevaría su propia copia de la paleta, la fuente, el rectángulo redondeado
 * y el tracking, y acabarían divergiendo a la primera corrección.
 *
 * Un canvas no puede renderizar el DOM, así que la duplicación respecto de los
 * componentes React es inevitable; lo que se evita acá es duplicarlo DOS veces.
 */

/** Paleta — la misma de la tarjeta (tokens.css), en literal: el canvas no resuelve variables CSS. */
export const C = {
  fondo:      '#FFFFFF',
  borde:      '#E2E8F0',
  cabecera:   '#233E58',
  texto:      '#0D1F3C',
  secundario: '#5A6A8A',
  tenue:      '#9AA5C0',
  credito:    '#15803D',
  debito:     '#B91C1C',
}

export const FUENTE = "'Manrope', system-ui, -apple-system, sans-serif"

/** Proporción exacta del wordmark (604 × 217). */
export const LOGO_RATIO = 604 / 217

/** Rectángulo redondeado. `ctx.roundRect` no está en WebViews viejas de Android. */
export function rectRedondo(ctx, x, y, w, h, r) {
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
export function textoConTracking(ctx, texto, x, y, tracking) {
  let cursor = x
  for (const ch of texto) {
    ctx.fillText(ch, cursor, y)
    cursor += ctx.measureText(ch).width + tracking
  }
}

export function anchoConTracking(ctx, texto, tracking) {
  let w = 0
  for (const ch of texto) w += ctx.measureText(ch).width + tracking
  return w - tracking
}

/** Carga una imagen y resuelve a null si falla, para no colgar el compartir. */
export function cargarImagen(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/**
 * Espera a que Manrope esté disponible.
 *
 * Sin esto el canvas cae a una genérica y la imagen compartida no se parece a
 * lo que el usuario vio en pantalla. Se traga el error a propósito: un
 * navegador sin Font Loading API debe seguir generando la imagen.
 */
export async function esperarFuentes() {
  try { await document.fonts?.ready } catch { /* navegador sin Font Loading API */ }
}

/**
 * Cabecera azul con el logotipo y el chip del tipo.
 *
 * El chip va en versalitas traslúcidas para acompañar al logotipo en vez de
 * competirle: en texto plano y peso alto leía como un segundo título.
 *
 * @returns {number} alto de la cabecera dibujada
 */
export function dibujarCabecera(ctx, { W, logoImg, chipTexto, padLateral = 56, padVertical = 56, logoW = 240, fontChip = 30 }) {
  const logoH = Math.round(logoW / LOGO_RATIO)
  const alto  = padVertical + logoH + padVertical

  ctx.fillStyle = C.cabecera
  ctx.fillRect(0, 0, W, alto)

  if (logoImg) {
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(logoImg, padLateral, Math.round((alto - logoH) / 2), logoW, logoH)
  }

  if (chipTexto) {
    const txt = String(chipTexto).toUpperCase()
    const tracking = fontChip * 0.12
    const previo = ctx.textAlign
    ctx.textAlign = 'left'
    ctx.font = `600 ${fontChip}px ${FUENTE}`
    const chipW = anchoConTracking(ctx, txt, tracking) + 52
    const chipH = fontChip + 24
    const chipX = W - padLateral - chipW
    const chipY = Math.round((alto - chipH) / 2)
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    rectRedondo(ctx, chipX, chipY, chipW, chipH, chipH / 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.82)'
    textoConTracking(ctx, txt, chipX + 26, chipY + 12, tracking)
    ctx.textAlign = previo
  }

  return alto
}

/** Pie con un identificador a la izquierda y el dominio a la derecha. */
export function dibujarPie(ctx, { W, y, alto, izquierda, derecha = 'alyto.app', padLateral = 56, fontPie = 30 }) {
  ctx.strokeStyle = C.borde
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, y)
  ctx.lineTo(W, y)
  ctx.stroke()
  ctx.fillStyle = C.tenue
  ctx.font = `400 ${fontPie}px ${FUENTE}`
  const baseline = y + Math.round((alto - fontPie) / 2)
  ctx.textAlign = 'left'
  ctx.fillText(izquierda, padLateral, baseline)
  ctx.textAlign = 'right'
  ctx.fillText(derecha, W - padLateral, baseline)
}
