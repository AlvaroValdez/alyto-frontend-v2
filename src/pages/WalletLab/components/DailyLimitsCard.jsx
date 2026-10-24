/**
 * DailyLimitsCard — límites diarios en bolivianos (exclusivo de la vista BOB).
 *
 * Datos reales de `/wallet/daily-limits`. Si el endpoint no responde, el
 * componente no se dibuja: dos barras vacías se leen como "hoy no gastaste
 * nada", que es una afirmación sobre el dinero del usuario que no podemos hacer.
 *
 * El "Renueva en 6h" de la especificación era texto fijo; acá se calcula contra
 * la medianoche de La Paz, que es cuando el contador vuelve a cero.
 */

import { formatBOB, horasHastaMedianocheBO } from '../format'

function Barra({ titulo, used, limit }) {
  const hayTope = Number.isFinite(Number(limit)) && Number(limit) > 0
  const usado   = Number(used) || 0
  const pct     = hayTope ? Math.min(100, (usado / Number(limit)) * 100) : 0

  // El color avisa al acercarse al tope. Ámbar y rojo, nunca el amarillo del
  // logo: ese vive solo dentro del logo.
  const estado = pct >= 100 ? 'adm__bar-fill--maxed' : pct >= 80 ? 'adm__bar-fill--warn' : ''

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[12px] font-semibold" style={{ color: 'var(--adm-text-70)' }}>
          {titulo}
        </p>
        <p className="text-[12px] font-bold" style={{ color: 'var(--adm-text)', fontVariantNumeric: 'tabular-nums' }}>
          {formatBOB(usado)}
          <span style={{ color: 'var(--adm-text-muted)', fontWeight: 500 }}>
            {hayTope ? ` / ${formatBOB(limit)}` : ' / sin tope informado'}
          </span>
        </p>
      </div>
      <div
        className="adm__bar mt-2"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={titulo}
      >
        <div className={`adm__bar-fill ${estado}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function DailyLimitsCard({ limits }) {
  if (!limits || (!limits.send && !limits.withdrawal)) return null

  return (
    <section className="adm__card mx-4">
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <h2 className="adm__section-title text-[14px]">Límites diarios (BOB)</h2>
        <span className="adm__pill">Renueva en {horasHastaMedianocheBO()}</span>
      </div>

      <div className="flex flex-col gap-3.5">
        {limits.send && (
          <Barra titulo="Envíos hoy" used={limits.send.used} limit={limits.send.limit} />
        )}
        {limits.withdrawal && (
          <Barra titulo="Retiros hoy" used={limits.withdrawal.used} limit={limits.withdrawal.limit} />
        )}
      </div>
    </section>
  )
}
