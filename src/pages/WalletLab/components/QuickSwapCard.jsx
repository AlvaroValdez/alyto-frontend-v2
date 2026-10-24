/**
 * QuickSwapCard — cotización y acceso a la conversión BOB ⇄ USDC.
 *
 * La tasa sale SIEMPRE de `/wallet/usdc/rate`. La especificación traía
 * "1 USDC = 6.96 BOB" de ejemplo y ese número ya no existe: el tipo de cambio
 * boliviano está en flotación administrada y un valor incrustado en el código
 * envejece en días. Si el backend no devuelve tasa, la tarjeta lo dice y el
 * botón queda inhabilitado; no hay valor por defecto.
 *
 * El spread tampoco es decorativo: se calcula contra `marketRate` y, si el
 * backend no manda referencia de mercado, no se muestra.
 */

import { ArrowRightLeft } from 'lucide-react'

export default function QuickSwapCard({ rate, currency, onConvert }) {
  const acento = currency === 'BOB' ? 'var(--adm-bob)' : 'var(--adm-usdc)'

  // Diferencia entre la tasa de compra y la referencia de mercado.
  const spread = (rate?.buy && rate?.market)
    ? Math.abs((rate.buy - rate.market) / rate.market) * 100
    : null

  const nf = (n, d = 2) => new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: d, maximumFractionDigits: d,
  }).format(n)

  return (
    <section className="adm__card mx-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {rate?.buy ? (
            <>
              <p className="text-[15px] font-bold" style={{ color: 'var(--adm-text)' }}>
                1 USDC = Bs {nf(rate.buy)}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="adm__dot-live" aria-hidden="true" />
                <span className="text-[11px] font-semibold" style={{ color: 'var(--adm-text-60)' }}>
                  Cotización en vivo
                </span>
                {spread != null && (
                  <span className="text-[11px] font-medium" style={{ color: 'var(--adm-text-muted)' }}>
                    • Spread {nf(spread)}%
                  </span>
                )}
              </div>
              {/* La tasa de venta se muestra porque convertir de vuelta no
                  devuelve el mismo número, y enterarse después es peor. */}
              {rate.sell && (
                <p className="mt-1 text-[11px] font-medium" style={{ color: 'var(--adm-text-muted)' }}>
                  Venta: 1 USDC = Bs {nf(rate.sell)}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-[14px] font-semibold" style={{ color: 'var(--adm-text-70)' }}>
                Cotización no disponible
              </p>
              <p className="mt-1 text-[11px] font-medium" style={{ color: 'var(--adm-text-muted)' }}>
                Vuelve a intentarlo en unos minutos.
              </p>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onConvert}
          disabled={!rate?.buy}
          className="flex flex-none items-center gap-2 rounded-full px-4 text-[13px] font-bold"
          style={{
            minHeight: 44,
            background: rate?.buy ? 'var(--adm-usdc-tint)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${rate?.buy ? 'var(--adm-usdc-border)' : 'var(--adm-border)'}`,
            color: rate?.buy ? '#6EE7B7' : 'var(--adm-text-muted)',
            cursor: rate?.buy ? 'pointer' : 'not-allowed',
            outlineColor: acento,
          }}
        >
          <ArrowRightLeft size={15} aria-hidden="true" />
          Convertir
        </button>
      </div>
    </section>
  )
}
