/**
 * shareImage.js — Comparte una imagen (data-URI PNG) por el share sheet del SO
 * (WhatsApp, etc.), con la imagen REAL adjunta — no solo texto/link.
 *
 * Estrategia por plataforma:
 *  1. App nativa (Capacitor): el Web Share de archivos NO funciona dentro del
 *     WebView de Android, así que escribimos el PNG a cache (@capacitor/filesystem)
 *     y compartimos el archivo vía @capacitor/share.
 *  2. Navegador con Web Share de archivos: navigator.share({ files: [...] }).
 *  3. Fallback: descargar la imagen (mejor que compartir solo texto).
 */
import { Capacitor } from '@capacitor/core'

/** Descarga una data-URI como archivo. */
export function downloadDataUrl(dataUrl, filename = 'alyto-qr.png') {
  const a = document.createElement('a')
  a.href     = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/**
 * @param {object}  opts
 * @param {string}  opts.dataUrl   - data-URI PNG de la imagen a compartir
 * @param {string}  [opts.text]    - texto que acompaña la imagen
 * @param {string}  [opts.title]   - título del share sheet
 * @param {string}  [opts.filename]- nombre del archivo compartido
 */
export async function shareQRImage({ dataUrl, text = '', title = 'QR Alyto', filename = 'alyto-qr.png' }) {
  if (!dataUrl) return

  // 1) App nativa → Filesystem + Share plugin (adjunta el archivo real)
  if (Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      const { Share } = await import('@capacitor/share')
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
      const written = await Filesystem.writeFile({
        path:      `alyto-qr/${filename}`,
        data:      base64,
        directory: Directory.Cache,
        recursive: true,
      })
      await Share.share({ title, text, files: [written.uri], dialogTitle: title })
      return
    } catch (err) {
      // Si el plugin nativo falla, intentamos Web Share / descarga abajo
      console.warn('[shareQRImage] share nativo falló:', err?.message)
    }
  }

  // 2) Navegador con soporte de compartir archivos
  try {
    if (typeof navigator !== 'undefined' && navigator.canShare) {
      const res  = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], filename, { type: 'image/png' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, text })
        return
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') return  // el usuario canceló el share sheet
    // cualquier otro error → caer al fallback de descarga
  }

  // 3) Fallback: descargar la imagen
  downloadDataUrl(dataUrl, filename)
}

/**
 * Comparte un Blob cualquiera (CSV, PDF…) por el share sheet del SO.
 *
 * Mismo problema que con las imágenes: dentro del WebView de Android un
 * `<a download>` con una URL `blob:` NO hace nada y falla en silencio, porque
 * no hay gestor de descargas conectado. En el navegador de escritorio sí
 * funciona, y por eso este tipo de fallo pasa desapercibido en desarrollo.
 *
 * @param {object} opts
 * @param {Blob}   opts.blob
 * @param {string} opts.filename
 * @param {string} [opts.title]
 * @param {string} [opts.mimeType]
 * @returns {Promise<boolean>} true si se compartió o descargó; false si no se pudo
 */
export async function shareFile({ blob, filename, title = 'Alyto', mimeType = 'text/csv' }) {
  if (!blob) return false

  // 1) App nativa → escribir a cache y abrir el share sheet
  if (Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      const { Share } = await import('@capacitor/share')

      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
        reader.onload  = () => {
          const r = String(reader.result)
          resolve(r.includes(',') ? r.split(',')[1] : r)
        }
        reader.readAsDataURL(blob)
      })

      const written = await Filesystem.writeFile({
        path:      `alyto/${filename}`,
        data:      base64,
        directory: Directory.Cache,
        recursive: true,
      })
      await Share.share({ title, files: [written.uri], dialogTitle: title })
      return true
    } catch (err) {
      if (err?.message?.includes('canceled') || err?.message?.includes('cancel')) return true
      console.warn('[shareFile] share nativo falló:', err?.message)
      return false
    }
  }

  // 2) Navegador con Web Share de archivos
  try {
    if (typeof navigator !== 'undefined' && navigator.canShare) {
      const file = new File([blob], filename, { type: mimeType })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title })
        return true
      }
    }
  } catch (err) {
    if (err?.name === 'AbortError') return true   // el usuario canceló
  }

  // 3) Navegador sin Web Share → descarga clásica, que aquí sí funciona
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return true
}
