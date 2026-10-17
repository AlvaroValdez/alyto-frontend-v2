import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import StatusBadge from '../../components/ui/StatusBadge'
import { COUNTRY_META } from '../../config/countries'

function statusColor(status) {
  if (status === 'completed')   return { color: 'var(--color-success)', bg: 'var(--color-success-bg)' }
  if (status === 'failed')      return { color: 'var(--color-error)',   bg: 'var(--color-error-bg)'   }
  if (status === 'refunded')    return { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' }
  return { color: 'var(--color-teal-status)', bg: 'var(--color-teal-status-bg)' }
}

function formatDate(dateStr) {
  const date     = new Date(dateStr)
  const now      = new Date()
  const diffMins = Math.floor((now - date) / 60_000)
  const diffHrs  = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHrs / 24)

  if (diffMins < 60)  return `Hace ${diffMins} min`
  if (diffHrs  < 24)  return `Hace ${diffHrs} h`
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7)   return `Hace ${diffDays} días`
  return date.toLocaleDateString('es-BO', { timeZone: 'America/La_Paz', day: 'numeric', month: 'short' })
}

function formatAmount(amount, currency) {
  if (amount == null) return '—'
  return `${new Intl.NumberFormat('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount)} ${currency ?? ''}`
}

/**
 * Monedas que identifican un país sin ambigüedad.
 *
 * El USD NO está aquí a propósito: lo usan Venezuela, Ecuador, Panamá, El
 * Salvador y Estados Unidos, entre otros. Deducir el país de la moneda hacía
 * que un envío a Venezuela se mostrara como "Envío a USD 🇺🇸". Un tester lo
 * reportó, y quien analizó el informe también lo leyó como Estados Unidos
 * teniendo la base de datos delante: si confunde a quien investiga, confunde
 * al usuario que está mandando dinero.
 *
 * Esto es solo el respaldo. La fuente buena es `tx.destinationCountry`.
 */
const CURRENCY_TO_COUNTRY = {
  CLP: 'CL', BOB: 'BO', ARS: 'AR',
  COP: 'CO', PEN: 'PE', MXN: 'MX', BRL: 'BR', UYU: 'UY',
}

function SkeletonCard() {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: 16,
        background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="skeleton-line" style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="skeleton-line" style={{ width: '60%', height: 13 }} />
        <div className="skeleton-line" style={{ width: '40%', height: 11 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
        <div className="skeleton-line" style={{ width: 64, height: 13 }} />
        <div className="skeleton-line" style={{ width: 40, height: 11 }} />
      </div>
    </div>
  )
}

function TransactionCard({ tx }) {
  const st          = statusColor(tx.status)
  const isActive    = !['completed','failed','refunded'].includes(tx.status)
  const benefName   = tx.beneficiary?.fullName && tx.beneficiary.fullName !== '—' ? tx.beneficiary.fullName : null
  // El país de destino manda; la moneda solo es respaldo y no cubre el USD.
  // Si no hay ninguno de los dos, no se pinta bandera: mejor ninguna que la
  // equivocada.
  const destCode    = tx.destinationCountry ?? CURRENCY_TO_COUNTRY[tx.destinationCurrency] ?? null
  const destFlag    = destCode ? (COUNTRY_META[destCode]?.flag ?? null) : null
  const title       = benefName ?? `Envío a ${tx.destinationCurrency ?? ''}${destFlag ? ` ${destFlag}` : ''}`
  const corridor    = tx.originCurrency && tx.destinationCurrency && tx.originCurrency !== tx.destinationCurrency
    ? `${tx.originCurrency} → ${tx.destinationCurrency}` : null

  return (
    <Link
      to={`/transactions/${tx.transactionId}`}
      className="no-underline block"
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: 16,
        background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)', transition: 'var(--transition-fast)',
        boxShadow: 'var(--shadow-card)',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-elevated)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-bg-secondary)' }}
    >
      {/* Icon */}
      <div
        style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <ArrowUpRight size={18} style={{ color: st.color }} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 'var(--font-md)', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-muted)' }}>
            {formatDate(tx.createdAt)}
          </span>
          {corridor && <span style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-muted)' }}>{corridor}</span>}
          <StatusBadge status={tx.status} />
          {isActive && (
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-teal-status)', animation: 'spin 2s linear infinite', flexShrink: 0 }} />
          )}
        </div>
      </div>

      {/* Amount */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: 'var(--font-md)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {formatAmount(tx.originAmount, tx.originCurrency)}
        </p>
        {tx.destinationAmount != null && tx.destinationCurrency !== tx.originCurrency && (
          <p style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
            {formatAmount(tx.destinationAmount, tx.destinationCurrency)}
          </p>
        )}
      </div>
    </Link>
  )
}

export default function RecentTransactions({ transactions, loading }) {
  return (
    <div style={{ padding: '0 16px', marginBottom: 8 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p className="label-uppercase">Recientes</p>
        <Link
          to="/transactions"
          className="no-underline"
          style={{ fontSize: 'var(--font-sm)', fontWeight: 600, color: 'var(--color-accent-teal)' }}
        >
          Ver todas
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
        ) : transactions.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <p style={{ fontSize: '2rem', marginBottom: 8 }}>💸</p>
            <p style={{ fontSize: 'var(--font-base)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Aún no tienes transferencias
            </p>
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-muted)', marginTop: 4 }}>
              Tu historial aparecerá aquí
            </p>
          </div>
        ) : (
          transactions.map((tx) => (
            <TransactionCard key={String(tx.transactionId)} tx={tx} />
          ))
        )}
      </div>
    </div>
  )
}
