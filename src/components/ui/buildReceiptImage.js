/**
 * buildReceiptImage — resumen de un movimiento de wallet, como imagen para compartir.
 *
 * ⚠️ NO es un documento fiscal ni el "Comprobante Oficial de Transacción" que
 * exige ASFI para las operaciones liquidadas por la SRL. Eso es otra cosa: lleva
 * correlativo, NIT del cliente, pie legal IUE/IVA y se archiva en S3 con Object
 * Lock. Esto es un resumen visual para mandar por WhatsApp, y por eso lleva una
 * leyenda explícita: una imagen con la marca y un sello Stellar puede acabar
 * presentada como respaldo oficial si no se aclara.
 *
 * Dos decisiones deliberadas:
 *
 * 1. **No se dibuja el saldo de la wallet.** `WalletTransaction` guarda
 *    `balanceBefore` y `balanceAfter`, pero un comprobante dice cuánto se movió,
 *    no cuánto tenés. Una imagen que se reenvía no debe filtrar el saldo.
 *
 * 2. **El TXID de Stellar se muestra recortado.** Es la prueba de existencia
 *    on-chain y sirve para soporte, pero completo ocupa dos líneas y compite
 *    con el dato que importa, que es el monto.
 */

import {
  C, FUENTE, cargarImagen, esperarFuentes,
  dibujarCabecera, dibujarPie, rectRedondo,
} from './cardCanvas'

/**
 * Etiquetas por tipo de movimiento.
 *
 * Los tipos salen del enum de `WalletTransaction` en el backend. `credito`
 * decide el signo y el color: es lo mismo que hace `isCredit` en la lista de
 * movimientos, y tiene que coincidir o la imagen contradice a la pantalla.
 */
export const TIPOS_MOVIMIENTO = {
  deposit:      { titulo: 'Depósito',       credito: true  },
  receive:      { titulo: 'Pago recibido',  credito: true  },
  p2p_receive:  { titulo: 'Pago recibido',  credito: true  },
  usdc_deposit: { titulo: 'Depósito USDC',  credito: true  },
  unfreeze:     { titulo: 'Desbloqueo',     credito: true  },
  send:         { titulo: 'Pago enviado',   credito: false },
  withdrawal:   { titulo: 'Retiro',         credito: false },
  bob_to_usdc:  { titulo: 'Conversión',     credito: false },
  usdc_to_bob:  { titulo: 'Conversión',     credito: false },
  fee:          { titulo: 'Comisión',       credito: false },
  freeze:       { titulo: 'Bloqueo',        credito: false },
  refund:       { titulo: 'Devolución',     credito: true  },
}

const LEYENDA = 'Resumen de movimiento. No es un documento fiscal.'

/**
 * @param {object}  o
 * @param {string}  o.type         tipo del WalletTransaction
 * @param {string}  o.amountText   monto YA formateado por la pantalla (con su moneda)
 * @param {string}  [o.estado]     texto del estado ya traducido
 * @param {string}  [o.fecha]      fecha YA formateada por la pantalla
 * @param {string}  [o.contraparte] nombre del otro lado, si lo hay
 * @param {string}  [o.concepto]   descripción del movimiento
 * @param {string}  [o.wtxId]      identificador del movimiento
 * @param {string}  [o.stellarTxId] sello on-chain, se recorta al dibujar
 * @returns {Promise<string>} data-URI PNG
 */
export async function buildReceiptImage({
  type,
  amountText,
  estado,
  fecha,
  contraparte,
  concepto,
  wtxId,
  stellarTxId,
}) {
  const tipo = TIPOS_MOVIMIENTO[type] ?? { titulo: 'Movimiento', credito: true }

  await esperarFuentes()
  const logoImg = await cargarImagen('/assets/LogoAlytoWB.png')

  const W = 968
  const padLateral = 56
  const F = { etiqueta: 30, valor: 34, monto: 92, leyenda: 26, pie: 30 }

  // Filas del detalle: solo las que tienen dato. Sin saldo, a propósito.
  const filas = [
    ['Tipo', tipo.titulo],
    contraparte && [tipo.credito ? 'De' : 'Para', contraparte],
    concepto && ['Concepto', concepto],
    fecha && ['Fecha', fecha],
    estado && ['Estado', estado],
    stellarTxId && ['Sello Stellar', String(stellarTxId).slice(0, 16) + '…'],
  ].filter(Boolean)

  // Alto: se calcula sumando solo lo que se va a dibujar.
  const cabeceraH = 56 + Math.round(240 / (604 / 217)) + 56
  const filaH = 56
  const pieH = 72
  const H = cabeceraH + 52 + F.monto + 44 + filas.length * filaH + 36 + F.leyenda + 36 + pieH

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.textBaseline = 'top'

  ctx.fillStyle = C.fondo
  ctx.fillRect(0, 0, W, H)

  dibujarCabecera(ctx, { W, logoImg, chipTexto: tipo.titulo, padLateral })

  // ── Monto, con signo y color ────────────────────────────────────────────────
  let y = cabeceraH + 52
  ctx.textAlign = 'center'
  ctx.fillStyle = tipo.credito ? C.credito : C.debito
  ctx.font = `700 ${F.monto}px ${FUENTE}`
  ctx.fillText(`${tipo.credito ? '+' : '-'} ${amountText}`, W / 2, y)
  y += F.monto + 44

  // ── Detalle ─────────────────────────────────────────────────────────────────
  for (const [etiqueta, valor] of filas) {
    ctx.textAlign = 'left'
    ctx.fillStyle = C.secundario
    ctx.font = `400 ${F.etiqueta}px ${FUENTE}`
    ctx.fillText(etiqueta, padLateral, y + 8)

    ctx.textAlign = 'right'
    ctx.fillStyle = C.texto
    ctx.font = `600 ${F.valor}px ${FUENTE}`
    // El valor se recorta si no entra, para no pisar la etiqueta.
    let txt = String(valor)
    const maxW = W - padLateral * 2 - ctx.measureText(etiqueta).width - 40
    while (txt.length > 4 && ctx.measureText(txt).width > maxW) txt = txt.slice(0, -2) + '…'
    ctx.fillText(txt, W - padLateral, y + 4)

    y += filaH
    ctx.strokeStyle = C.borde
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padLateral, y - 12)
    ctx.lineTo(W - padLateral, y - 12)
    ctx.stroke()
  }

  // ── Leyenda: lo que impide que esto se confunda con un comprobante oficial ──
  y += 24
  const leyendaH = F.leyenda + 28
  ctx.fillStyle = '#F1F5F9'
  rectRedondo(ctx, padLateral, y, W - padLateral * 2, leyendaH, leyendaH / 2)
  ctx.fill()
  ctx.textAlign = 'center'
  ctx.fillStyle = C.secundario
  ctx.font = `400 ${F.leyenda}px ${FUENTE}`
  ctx.fillText(LEYENDA, W / 2, y + 14)

  dibujarPie(ctx, {
    W,
    y: H - pieH,
    alto: pieH,
    izquierda: wtxId ? String(wtxId) : '',
    padLateral,
    fontPie: F.pie,
  })

  return canvas.toDataURL('image/png')
}
