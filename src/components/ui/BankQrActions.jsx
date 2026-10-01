/**
 * BankQrActions — Compartir y descargar el QR de cobro que emite el banco.
 *
 * Es el equivalente a las acciones de `WalletQRScreen`, pero para el QR
 * **bancario** (BANECO y los que vengan). La diferencia no es cosmética:
 *
 *   ⚠️ Acá NO se usa `buildQRWithLogo`. Ese helper incrusta el logo de Alyto en
 *   el centro del QR, y eso solo es seguro en los QR que generamos nosotros,
 *   porque los emitimos con corrección de errores nivel H y toleran que se tape
 *   el centro. El QR del banco lo genera el banco: no controlamos su nivel de
 *   corrección, así que taparle el centro puede dejarlo ilegible. Un QR
 *   descargado que la app del banco no puede leer es peor que no ofrecer la
 *   descarga.
 *
 * El PNG se prepara apenas cambia el QR, no al hacer clic. Safari en iOS exige
 * que `navigator.share` se invoque dentro del gesto del usuario, y meter un
 * `await` de canvas antes hace que a veces lo rechace. Teniéndolo listo de
 * antemano, el handler del clic no espera nada.
 *
 * @param {string} src        - data-URI del QR ya resuelta (ver `toQrSrc`/`bankQrSrc`)
 * @param {string} [reference]- wtxId o id de transacción, para el nombre del archivo
 * @param {string} [amountLabel] - monto formateado, acompaña el texto al compartir
 * @param {string} [className]
 */
import { useEffect, useState } from 'react'
import { Share2, Download } from 'lucide-react'
import { Capacitor } from '@capacitor/core'

import { shareQRImage, downloadDataUrl } from '../../utils/shareImage'

/**
 * ¿El entorno puede compartir un archivo de verdad?
 *
 * En escritorio `navigator.canShare({files})` es false (verificado en Chromium),
 * y ahí `shareQRImage` cae a descargar. Funciona, pero un botón que dice
 * "Compartir" y descarga en silencio miente sobre lo que hace. Si no hay share
 * real, mostramos una sola acción y la llamamos por su nombre.
 */
function puedeCompartirArchivos() {
  if (Capacitor.isNativePlatform()) return true
  try {
    if (typeof navigator === 'undefined' || !navigator.canShare) return false
    const prueba = new File([new Blob([''], { type: 'image/png' })], 'qr.png', { type: 'image/png' })
    return navigator.canShare({ files: [prueba] })
  } catch {
    return false
  }
}

/**
 * Normaliza el QR a PNG. El banco real devuelve PNG, pero el modo simulado
 * devuelve un SVG: compartirlo como `image/png` produciría un archivo que
 * ninguna app abre. Rasterizar deja un único formato para descargar y compartir.
 *
 * @param {string} dataUrl
 * @returns {Promise<string>} data-URI PNG (o la original si no se pudo convertir)
 */
async function aPng(dataUrl) {
  if (!dataUrl) return ''
  if (dataUrl.startsWith('data:image/png')) return dataUrl

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const lado   = Math.max(img.naturalWidth || 0, 512)
        const canvas = document.createElement('canvas')
        canvas.width = canvas.height = lado
        const ctx = canvas.getContext('2d')
        // Fondo blanco: un QR sobre transparente queda ilegible en apps que
        // muestran la imagen sobre fondo oscuro.
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, lado, lado)
        // Sin suavizado: los módulos del QR tienen que quedar nítidos.
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(img, 0, 0, lado, lado)
        resolve(canvas.toDataURL('image/png'))
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

export default function BankQrActions({ src, reference, amountLabel, className = '' }) {
  const [pngUrl, setPngUrl] = useState('')
  const [compartible] = useState(puedeCompartirArchivos)

  useEffect(() => {
    let vigente = true
    if (!src) { setPngUrl(''); return }
    aPng(src).then((url) => { if (vigente) setPngUrl(url) })
    return () => { vigente = false }
  }, [src])

  if (!src) return null

  const nombre = `alyto-qr-${reference ?? 'cobro'}.png`
  const listo  = !!pngUrl

  const compartir = () => {
    if (!listo) return
    shareQRImage({
      dataUrl:  pngUrl,
      title:    'QR de pago Alyto',
      text:     amountLabel
        ? `QR para pagar ${amountLabel} desde tu app bancaria`
        : 'QR para pagar desde tu app bancaria',
      filename: nombre,
    })
  }

  const descargar = () => {
    if (!listo) return
    downloadDataUrl(pngUrl, nombre)
  }

  // Sin share real, una sola acción con el nombre de lo que efectivamente hace.
  if (!compartible) {
    return (
      <button
        type="button"
        onClick={descargar}
        disabled={!listo}
        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[0.875rem] font-semibold bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#233E5833] hover:text-[#233E58] disabled:opacity-50 transition-colors ${className}`}
      >
        <Download size={16} /> Descargar QR
      </button>
    )
  }

  return (
    <div className={`flex gap-3 w-full ${className}`}>
      <button
        type="button"
        onClick={compartir}
        disabled={!listo}
        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[0.875rem] font-semibold text-white disabled:opacity-50"
        style={{ background: '#233E58', boxShadow: '0 4px 20px rgba(35,62,88,0.25)' }}
      >
        <Share2 size={16} /> Compartir
      </button>
      <button
        type="button"
        onClick={descargar}
        disabled={!listo}
        aria-label="Descargar QR"
        title="Descargar QR"
        className="flex items-center justify-center px-4 py-3 rounded-2xl bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#233E5833] hover:text-[#233E58] disabled:opacity-50 transition-colors"
      >
        <Download size={16} />
      </button>
    </div>
  )
}
