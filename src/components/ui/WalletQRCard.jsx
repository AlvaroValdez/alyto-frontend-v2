/**
 * WalletQRCard — tarjeta de marca que envuelve el QR de la wallet.
 *
 * Presentacional y sin estado: recibe los datos ya resueltos y los compone.
 * NO genera el QR ni cuenta el tiempo — de eso se encargan el backend y la
 * pantalla, que ya tienen `useCountdown` y los formateadores de monto.
 *
 * Reutiliza `QRDisplay` para el código en sí: ahí ya está resuelto lo delicado
 * (módulos sin recortar, logo al ~4,6 % del área, anillo verde para USDC). No
 * duplicar esa lógica acá.
 *
 * Cubre los tres tipos que emite `qrWalletService`:
 *   charge  — alguien escanea para pagarme   (lleva monto y vencimiento)
 *   p2p     — transferencia entre usuarios   (lleva monto y vencimiento)
 *   deposit — depósito a mi wallet           (sin monto ni vencimiento)
 *
 * Tema: CLARO. Es pantalla de usuario, así que los colores salen de
 * `styles/tokens.css` y no de la paleta oscura del panel admin.
 */

import QRDisplay from './QRDisplay'

/** Etiquetas por tipo de QR. */
const TIPOS = {
  charge:  { titulo: 'Cobro',         montoLabel: 'Monto a cobrar', quienLabel: 'Pagar a'     },
  p2p:     { titulo: 'Transferencia', montoLabel: 'Monto a enviar', quienLabel: 'Enviar a'    },
  deposit: { titulo: 'Depósito',      montoLabel: null,             quienLabel: 'Depositar a' },
}

/**
 * @param {object} props
 * @param {string}  props.qrBase64     data-URI del QR (viene del backend)
 * @param {('charge'|'p2p'|'deposit')} props.type
 * @param {('BOB'|'USDC')} [props.asset='BOB']
 * @param {string}  [props.amountText] monto YA formateado por la pantalla
 *                                     (`amountDisplay`), para no duplicar el
 *                                     formateo ni la regla de moneda local
 * @param {string}  [props.creatorName] nombre de quien creó el QR
 * @param {string}  [props.description] concepto opcional
 * @param {React.ReactNode} [props.expirySlot] insignia de vencimiento — la
 *                                     pantalla pasa su `<CountdownBadge />`
 * @param {string}  [props.qrId]       identificador corto, útil para soporte
 * @param {number}  [props.qrSize=224] lado del QR en píxeles
 */
export default function WalletQRCard({
  qrBase64,
  type = 'charge',
  asset = 'BOB',
  amountText,
  creatorName,
  description,
  expirySlot,
  qrId,
  qrSize = 224,
}) {
  const tipo = TIPOS[type] ?? TIPOS.charge
  const muestraMonto = Boolean(tipo.montoLabel && amountText)

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 360,
        margin: '0 auto',
        background: 'var(--color-bg-secondary, #FFFFFF)',
        border: '1px solid var(--color-border, #E2E8F0)',
        borderRadius: 20,
        overflow: 'hidden',
      }}
    >
      {/* Cabecera — el azul es el color dominante de la marca.
          El logotipo va a 92 px de ancho: el manual exige 90 px mínimo en
          digital, y por debajo de eso pierde legibilidad. */}
      <div
        style={{
          background: 'var(--color-wallet-primary, #233E58)',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <img
          src="/assets/LogoAlytoWB.png"
          alt="Alyto"
          style={{ width: 92, height: 'auto', display: 'block' }}
        />
        {/* Chip del tipo. En versalitas con tracking y blanco traslúcido: así
            acompaña al logotipo en vez de competirle. Texto plano en peso alto
            leía como un segundo título y rompía la jerarquía de la cabecera. */}
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(255, 255, 255, 0.82)',
            background: 'rgba(255, 255, 255, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: 999,
            padding: '4px 10px',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
          }}
        >
          {tipo.titulo}
        </span>
      </div>

      {/* Cuerpo */}
      <div style={{ padding: '22px 20px 18px', textAlign: 'center' }}>
        {muestraMonto && (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: '0.8125rem',
                color: 'var(--color-text-secondary, #5A6A8A)',
                marginBottom: 2,
              }}
            >
              {tipo.montoLabel}
            </div>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                color: 'var(--color-text-primary, #0D1F3C)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {amountText}
            </div>
          </div>
        )}

        {/* Marco del QR. El relleno blanco es la zona silenciosa visual: sin
            ella el lector pierde los marcadores de esquina contra el borde. */}
        <div
          style={{
            display: 'inline-flex',
            padding: 12,
            background: '#FFFFFF',
            border: '1px solid var(--color-border, #E2E8F0)',
            borderRadius: 14,
          }}
        >
          <QRDisplay
            src={qrBase64}
            size={qrSize}
            asset={asset}
            alt={`QR de ${tipo.titulo.toLowerCase()} Alyto`}
          />
        </div>

        {creatorName && (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-secondary, #5A6A8A)',
              }}
            >
              {tipo.quienLabel}
            </div>
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--color-text-primary, #0D1F3C)',
              }}
            >
              {creatorName}
            </div>
          </div>
        )}

        {description && (
          <div
            style={{
              marginTop: 4,
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary, #5A6A8A)',
            }}
          >
            {description}
          </div>
        )}

        {/* El depósito no vence, así que la pantalla simplemente no pasa nada.
            El slot va en flex centrado y NO en un div a secas: `CountdownBadge`
            es `display:flex` block-level, así que sin esto se estira de borde a
            borde en vez de quedar como píldora. `text-align` no lo arregla:
            no afecta a un hijo de nivel bloque. */}
        {expirySlot && (
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
            {expirySlot}
          </div>
        )}
      </div>

      {/* Pie — el identificador corto le sirve a soporte para rastrear el QR. */}
      {qrId && (
        <div
          style={{
            borderTop: '1px solid var(--color-border, #E2E8F0)',
            padding: '10px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--color-text-muted, #9AA5C0)',
          }}
        >
          <span style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>
            {String(qrId).slice(0, 8)}
          </span>
          <span>alyto.app</span>
        </div>
      )}
    </div>
  )
}
