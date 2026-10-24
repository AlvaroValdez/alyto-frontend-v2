/**
 * MovementsSection — historial de movimientos del apartado Dark Minimal.
 *
 * Las claves de filtro son las que el backend entiende de verdad, y son
 * distintas en cada moneda (ver WalletPage.jsx:2794 y :2981). "Conversiones"
 * es `bob_to_usdc` en la vista BOB y `usdc_to_bob` en la USDC: el parámetro
 * `type` acepta un solo tipo, no una familia.
 *
 * Tres estados se distinguen y no se confunden entre sí:
 *   - cargando            → esqueletos
 *   - error de lectura     → lo dice y ofrece reintentar
 *   - leído y vacío        → "sin movimientos"
 * Mostrar "sin movimientos" cuando en realidad falló la consulta le diría al
 * usuario que no tiene historial, que es falso.
 */

import {
  AlertCircle, ArrowDownToLine, ArrowDownLeft, ArrowRightLeft, ArrowUpRight,
  Building2, ChevronRight, Receipt, RefreshCw, Snowflake,
} from 'lucide-react'
import { formatDate, formatPlain } from '../format'

const FILTROS = {
  BOB: [
    { key: 'all',         label: 'Todos'        },
    { key: 'deposit',     label: 'Depósitos'    },
    { key: 'send',        label: 'Envíos'       },
    { key: 'withdrawal',  label: 'Retiros'      },
    { key: 'receive',     label: 'Recibidos'    },
    { key: 'bob_to_usdc', label: 'Conversiones' },
  ],
  USDC: [
    { key: 'all',          label: 'Todos'        },
    { key: 'receive',      label: 'Recibidos'    },
    { key: 'send',         label: 'Enviados'     },
    { key: 'usdc_deposit', label: 'Depósitos'    },
    { key: 'usdc_to_bob',  label: 'Conversiones' },
  ],
}

/** Tipo de movimiento → icono, etiqueta y dirección del importe. */
const TIPOS = {
  deposit:      { icon: ArrowDownToLine, label: 'Depósito',        signo: '+' },
  usdc_deposit: { icon: ArrowDownToLine, label: 'Depósito USDC',   signo: '+' },
  receive:      { icon: ArrowDownLeft,   label: 'Recibido',        signo: '+' },
  p2p_receive:  { icon: ArrowDownLeft,   label: 'Recibido',        signo: '+' },
  unfreeze:     { icon: Snowflake,       label: 'Liberación',      signo: '+' },
  send:         { icon: ArrowUpRight,    label: 'Envío',           signo: '-' },
  p2p_send:     { icon: ArrowUpRight,    label: 'Envío',           signo: '-' },
  withdrawal:   { icon: Building2,       label: 'Retiro',          signo: '-' },
  fee:          { icon: Receipt,         label: 'Comisión',        signo: '-' },
  freeze:       { icon: Snowflake,       label: 'Retención',       signo: '-' },
  bob_to_usdc:  { icon: ArrowRightLeft,  label: 'Conversión a USDC', signo: '-' },
  usdc_to_bob:  { icon: ArrowRightLeft,  label: 'Conversión a BOB',  signo: '-' },
}

/** Estado del movimiento → clase del badge y etiqueta visible. */
const ESTADOS = {
  completed:      { clase: 'adm__badge--success', label: 'Completado' },
  pending:        { clase: 'adm__badge--pending', label: 'Pendiente'  },
  awaiting_proof: { clase: 'adm__badge--transit', label: 'En trámite' },
  processing:     { clase: 'adm__badge--transit', label: 'En tránsito' },
  failed:         { clase: 'adm__badge--error',   label: 'Fallido'    },
  reversed:       { clase: 'adm__badge--error',   label: 'Revertido'  },
}

function TxRow({ tx, currency, onClick }) {
  const tipo   = TIPOS[tx.type] ?? { icon: Receipt, label: tx.type ?? 'Movimiento', signo: '' }
  const estado = ESTADOS[tx.status] ?? { clase: 'adm__badge--pending', label: tx.status ?? '—' }
  const entra  = tipo.signo === '+'
  const Icono  = tipo.icon

  // Contraparte: lo más informativo que traiga el movimiento, sin inventar.
  const contraparte = tx.recipientName || tx.senderName || tx.recipientEmail || tx.description || ''

  return (
    <button type="button" className="adm__tx" onClick={onClick}>
      <span className="adm__tx-icon">
        <Icono size={17} aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="adm__tx-title block truncate">{tipo.label}</span>
        <span className="adm__tx-meta block truncate">
          {formatDate(tx.createdAt)}
          {contraparte && ` · ${contraparte}`}
        </span>
      </span>

      <span className="flex flex-none flex-col items-end gap-1">
        <span className={`adm__tx-amount ${entra ? 'adm__tx-amount--in' : 'adm__tx-amount--out'}`}>
          {tipo.signo}{formatPlain(tx.amount, tx.currency || currency)}
        </span>
        <span className={`adm__badge ${estado.clase}`}>{estado.label}</span>
      </span>

      <ChevronRight size={15} className="flex-none" style={{ color: 'var(--adm-text-muted)' }} aria-hidden="true" />
    </button>
  )
}

export default function MovementsSection({
  currency, txs, total, error, loading,
  filter, onFilterChange,
  page, onPageChange,
  onVerTodos, onAbrirTx, onRetry,
}) {
  const chipOn   = currency === 'BOB' ? 'adm__chip--on-bob' : 'adm__chip--on-usdc'
  const paginas  = Math.max(1, Math.ceil((total || 0) / 10))

  return (
    <section className="px-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="adm__section-title">Movimientos {currency}</h2>
        <button type="button" className="adm__link" onClick={onVerTodos}>
          Ver todos <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="adm__chips scrollbar-hide mb-3">
        {FILTROS[currency].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => onFilterChange(f.key)}
            className={`adm__chip ${filter === f.key ? chipOn : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl px-4 py-7 text-center"
          style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}
        >
          <AlertCircle size={22} style={{ color: '#FCA5A5' }} />
          <p className="text-[13px] font-semibold" style={{ color: 'var(--adm-text-70)' }}>
            No se pudieron cargar los movimientos
          </p>
          <button type="button" onClick={onRetry} className="adm__pill" style={{ minHeight: 36, cursor: 'pointer' }}>
            <RefreshCw size={12} /> Reintentar
          </button>
        </div>
      ) : loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="adm__skeleton" style={{ height: 66 }} aria-label="Cargando movimientos" />
          ))}
        </div>
      ) : txs.length === 0 ? (
        <div
          className="rounded-2xl px-4 py-9 text-center"
          style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}
        >
          <p className="text-[13px] font-semibold" style={{ color: 'var(--adm-text-70)' }}>
            {filter === 'all' ? 'Sin movimientos aún' : 'Sin movimientos con este filtro'}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {txs.map((tx) => (
              <TxRow
                key={tx.wtxId ?? tx._id ?? `${tx.type}-${tx.createdAt}`}
                tx={tx}
                currency={currency}
                onClick={() => onAbrirTx(tx)}
              />
            ))}
          </div>

          {paginas > 1 && (
            <div className="mt-3 flex items-center justify-center gap-3">
              <button
                type="button"
                className="adm__chip"
                disabled={page <= 1}
                style={{ opacity: page <= 1 ? 0.4 : 1 }}
                onClick={() => onPageChange(page - 1)}
              >
                Anterior
              </button>
              <span className="text-[12px] font-semibold" style={{ color: 'var(--adm-text-muted)' }}>
                {page} / {paginas}
              </span>
              <button
                type="button"
                className="adm__chip"
                disabled={page >= paginas}
                style={{ opacity: page >= paginas ? 0.4 : 1 }}
                onClick={() => onPageChange(page + 1)}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
