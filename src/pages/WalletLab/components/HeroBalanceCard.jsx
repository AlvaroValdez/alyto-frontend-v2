/**
 * HeroBalanceCard — tarjeta de saldo disponible.
 *
 * Dos decisiones que no son estéticas:
 *
 * 1. El reservado se muestra SIEMPRE, incluso en cero. La wallet vigente lo
 *    esconde cuando vale 0 (WalletPage.jsx:2705) y eso entrena al usuario a no
 *    buscarlo; el día que tiene plata retenida, la fila aparece de la nada. Acá
 *    la fila es parte fija de la tarjeta.
 *
 * 2. Si la lectura del saldo falló, la tarjeta dice que falló y ofrece
 *    reintentar. No cae a "Bs 0,00": un cero inventado sobre el dinero de
 *    alguien es un error de producto, no un detalle de carga.
 */

import { AlertCircle, Lock, RefreshCw, Snowflake } from 'lucide-react'
import { formatBOB, formatUSDC } from '../format'

export default function HeroBalanceCard({
  currency,          // 'BOB' | 'USDC'
  available,         // número | null (null = sin lectura)
  reserved,
  frozen,
  error,
  loading,
  onRetry,
  badge,             // nodo: "CUSTODIA SEGURA" o la red del activo
  children,          // botonera
}) {
  const esBOB = currency === 'BOB'
  const fmt   = esBOB ? formatBOB : formatUSDC

  return (
    <section className={`adm__hero ${esBOB ? 'adm__hero--bob' : 'adm__hero--usdc'} mx-4`}>
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-3">
        <p className="adm__label">Saldo disponible</p>
        {badge}
      </div>

      {/* Monto */}
      <div className="mt-2.5">
        {error ? (
          <div>
            <div className="flex items-center gap-2">
              <AlertCircle size={18} style={{ color: '#FCA5A5' }} />
              <p className="text-[15px] font-semibold" style={{ color: '#FCA5A5' }}>
                No se pudo leer el saldo
              </p>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="adm__pill mt-2.5"
              style={{ minHeight: 34, cursor: 'pointer' }}
            >
              <RefreshCw size={12} />
              Reintentar
            </button>
          </div>
        ) : available == null || loading ? (
          <div className="adm__skeleton" style={{ height: 42, width: '68%' }} aria-label="Cargando saldo" />
        ) : (
          <p className="adm__amount">{fmt(available)}</p>
        )}
      </div>

      {/* Reservado — fila fija, nunca oculta */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="adm__reserved">
          <Lock size={11} aria-hidden="true" />
          Reservado: {error ? '—' : fmt(reserved)}
        </span>

        {/* Congelado solo existe en BOB y solo se nombra si hay algo retenido. */}
        {esBOB && !error && frozen > 0 && (
          <span className="adm__reserved" style={{ color: '#FCA5A5' }}>
            <Snowflake size={11} aria-hidden="true" />
            Congelado: {fmt(frozen)}
          </span>
        )}
      </div>

      {children}
    </section>
  )
}
