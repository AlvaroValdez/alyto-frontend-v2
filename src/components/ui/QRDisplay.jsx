/**
 * QRDisplay — QR Alyto con logo monocromático centrado.
 *
 * Reglas de no-distorsión:
 *  - El QR se renderiza con `object-contain` en un contenedor cuadrado fijo.
 *  - NO hay border-radius en el <img> del QR: los tres marcadores de posición
 *    de las esquinas deben estar intactos para que los lectores lo detecten.
 *  - El logo se coloca en un rectángulo blanco cuyas dimensiones respetan la
 *    proporción exacta del wordmark (604 × 217 px ≈ 2.78:1).
 *  - El área del logo ≤ 8 % del área total del QR (límite seguro: 30 % con
 *    corrección de errores nivel H).
 *
 * @param {string}  src   - URL / data-URI de la imagen QR
 * @param {string}  [alt] - Texto alternativo
 * @param {number}  [size=256] - Lado del QR en píxeles
 * @param {string}  [className]
 */
export default function QRDisplay({ src, alt = 'QR Alyto', size = 256, className = '' }) {
  // Logo "alyto" wordmark: 604 × 217 px → ratio 2.783
  const LOGO_RATIO = 604 / 217

  // Logo ocupa 28 % del ancho del QR; alto proporcional
  const logoW = Math.round(size * 0.28)
  const logoH = Math.round(logoW / LOGO_RATIO)

  // Padding del contenedor blanco (2.5 % H, 2 % V del tamaño del QR)
  const padX = Math.round(size * 0.025)
  const padY = Math.round(size * 0.02)

  const boxW = logoW + padX * 2
  const boxH = logoH + padY * 2

  return (
    <div
      className={className}
      style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}
    >
      {/* QR image — object-contain mantiene proporción 1:1 sin estirar */}
      <img
        src={src}
        alt={alt}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          // Sin border-radius: los marcadores de esquina NO deben recortarse
        }}
      />

      {/* Logo overlay proporcional al wordmark */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: boxW,
          height: boxH,
          background: 'white',
          borderRadius: Math.round(boxH * 0.22),
          boxShadow: '0 1px 6px rgba(0,0,0,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <img
          src="/assets/LogoAlytoBlack.png"
          alt=""
          aria-hidden="true"
          style={{
            display: 'block',
            width: logoW,
            height: logoH,
            objectFit: 'contain',
          }}
        />
      </div>
    </div>
  )
}

/**
 * buildQRWithLogo — genera un canvas con el QR + logo superpuesto para
 * descargas / compartir. Usa las mismas proporciones que QRDisplay.
 *
 * @param {string} qrBase64 - data-URI o base64 pura de la imagen QR
 * @returns {Promise<string>} data-URI PNG del QR con logo
 */
export async function buildQRWithLogo(qrBase64) {
  const LOGO_RATIO = 604 / 217

  return new Promise((resolve) => {
    const src    = qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`
    const qrImg  = new Image()
    const logoImg = new Image()
    let loaded = 0

    const onBothLoaded = () => {
      // Renderizar al tamaño nativo del QR (mínimo 400 px para buena calidad)
      const size   = Math.max(qrImg.naturalWidth || 400, 400)
      const canvas = document.createElement('canvas')
      canvas.width  = size
      canvas.height = size
      const ctx = canvas.getContext('2d')

      // Dibujar QR sin suavizado para mantener módulos nítidos
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(qrImg, 0, 0, size, size)

      // Caja blanca para el logo
      const logoW = Math.round(size * 0.28)
      const logoH = Math.round(logoW / LOGO_RATIO)
      const padX  = Math.round(size * 0.025)
      const padY  = Math.round(size * 0.02)
      const boxW  = logoW + padX * 2
      const boxH  = logoH + padY * 2
      const boxX  = Math.round((size - boxW) / 2)
      const boxY  = Math.round((size - boxH) / 2)
      const r     = Math.round(boxH * 0.22)

      // Rounded-rect blanco
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.moveTo(boxX + r, boxY)
      ctx.lineTo(boxX + boxW - r, boxY)
      ctx.quadraticCurveTo(boxX + boxW, boxY, boxX + boxW, boxY + r)
      ctx.lineTo(boxX + boxW, boxY + boxH - r)
      ctx.quadraticCurveTo(boxX + boxW, boxY + boxH, boxX + boxW - r, boxY + boxH)
      ctx.lineTo(boxX + r, boxY + boxH)
      ctx.quadraticCurveTo(boxX, boxY + boxH, boxX, boxY + boxH - r)
      ctx.lineTo(boxX, boxY + r)
      ctx.quadraticCurveTo(boxX, boxY, boxX + r, boxY)
      ctx.closePath()
      ctx.fill()

      // Sombra sutil (leve contorno)
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'
      ctx.lineWidth   = Math.max(1, Math.round(size * 0.003))
      ctx.stroke()

      // Logo con suavizado para que el wordmark quede nítido
      ctx.imageSmoothingEnabled  = true
      ctx.imageSmoothingQuality  = 'high'
      ctx.drawImage(
        logoImg,
        boxX + padX,
        boxY + padY,
        logoW,
        logoH,
      )

      try {
        resolve(canvas.toDataURL('image/png'))
      } catch {
        resolve(src)
      }
    }

    const onLoad = () => {
      loaded++
      if (loaded === 2) onBothLoaded()
    }

    qrImg.onload    = onLoad
    logoImg.onload  = onLoad
    qrImg.onerror   = () => resolve(src)
    logoImg.onerror = () => {
      // Logo no cargó — devolver QR sin logo antes de fallar
      if (loaded === 1 && qrImg.complete && qrImg.naturalWidth) {
        const canvas = document.createElement('canvas')
        const s = Math.max(qrImg.naturalWidth, 400)
        canvas.width = canvas.height = s
        const ctx2 = canvas.getContext('2d')
        ctx2.imageSmoothingEnabled = false
        ctx2.drawImage(qrImg, 0, 0, s, s)
        try { resolve(canvas.toDataURL('image/png')); return } catch { /* */ }
      }
      resolve(src)
    }

    // crossOrigin necesario para canvas si el logo viene de origen cruzado
    logoImg.crossOrigin = 'anonymous'
    qrImg.src   = src
    logoImg.src = '/assets/LogoAlytoBlack.png'
  })
}
