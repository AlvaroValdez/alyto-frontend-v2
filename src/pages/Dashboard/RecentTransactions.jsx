/**
 * RecentTransactions.jsx — Últimas 3 transferencias del usuario
 *
 * Estados:
 *  - loading   → muestra 3 skeleton cards
 *  - sin datos → muestra empty state
 *  - con datos → muestra hasta 3 transaction cards
 */

import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusConfig(status) {
  if (status === 'completed') {
    return { label: 'Completada', color: '#22C55E', bg: '#22C55E1A' }
  }
  if (status === 'failed' || status === 'refunded') {
    return { label: status === 'refunded' ? 'Reembolsada' : 'Fallida', color: '#EF4444', bg: '#EF44441A' }
  }
  return { label: 'En proceso', color: '#C4CBD8', bg: '#C4CBD81A' }
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  const now  = new Date()

  const diffMs   = now - date
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHrs  = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 60)  return `Hace ${diffMins} min`
  if (diffHrs  < 24)  return `Hace ${diffHrs} h`
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7)   return `Hace ${diffDays} días`

  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

function formatAmount(amount, currency) {
  if (amount == null) return '—'
  const num = new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
  return `${num} ${currency ?? ''}`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 p-4 bg-[#1A2340] rounded-2xl animate-pulse">
      <div className="w-11 h-11 rounded-xl bg-[#263050] flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-[#263050] rounded-full w-3/5" />
        <div className="h-3 bg-[#1F2B4D] rounded-full w-2/5" />
      </div>
      <div className="space-y-2 text-right">
        <div className="h-3.5 bg-[#263050] rounded-full w-16" />
        <div className="h-3 bg-[#1F2B4D] rounded-full w-10 ml-auto" />
      </div>
    </div>
  )
}

const COUNTRY_FLAGS = {
  CL: '🇨🇱', BO: '🇧🇴', US: '🇺🇸', AR: '🇦🇷',
  CO: '🇨🇴', PE: '🇵🇪', MX: '🇲🇽', BR: '🇧🇷',
  UY: '🇺🇾', EC: '🇪🇨', PY: '🇵🇾',
}

const CURRENCY_TO_COUNTRY = {
  CLP: 'CL', BOB: 'BO', USD: 'US', ARS: 'AR',
  COP: 'CO', PEN: 'PE', MXN: 'MX', BRL: 'BR',
  UYU: 'UY',
}

function TransactionCard({ tx }) {
  const st       = statusConfig(tx.status)
  const isActive = tx.status !== 'completed' && tx.status !== 'failed' && tx.status !== 'refunded'

  const beneficiaryName = tx.beneficiary?.fullName && tx.beneficiary.fullName !== '—'
    ? tx.beneficiary.fullName
    : null

  const destCountryCode = CURRENCY_TO_COUNTRY[tx.destinationCurrency]
  const destFlag = destCountryCode ? COUNTRY_FLAGS[destCountryCode] : null

  // Title: beneficiary name if available, else "Envío a {currency} {flag}"
  const title = beneficiaryName
    ?? `Envío a ${tx.destinationCurrency ?? tx.originCurrency ?? ''}${destFlag ? ` ${destFlag}` : ''}`

  // Corridor label: "CLP → BOB"
  const corridorLabel = tx.originCurrency && tx.destinationCurrency && tx.originCurrency !== tx.destinationCurrency
    ? `${tx.originCurrency} → ${tx.destinationCurrency}`
    : null

  return (
    <Link
      to={`/transactions/${tx.transactionId}`}
      className="flex items-center gap-3 p-4 bg-[#1A2340] rounded-2xl no-underline hover:bg-[#1F2B4D] transition-colors block"
    >
      {/* Icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: st.bg }}
      >
        <ArrowUpRight size={18} style={{ color: st.color }} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[0.9375rem] font-semibold text-white truncate">
          {title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[0.6875rem] text-[#4E5A7A]">
            {formatDate(tx.createdAt)}
          </span>
          {corridorLabel && (
            <span className="text-[0.6875rem] text-[#4E5A7A]">{corridorLabel}</span>
          )}
          <span
            className="text-[0.6875rem] font-medium px-1.5 py-0.5 rounded-full"
            style={{ color: st.color, background: st.bg }}
          >
            {st.label}
          </span>
          {isActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#C4CBD8] animate-pulse flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0">
        <p className="text-[0.9375rem] font-bold text-white">
          {formatAmount(tx.originAmount, tx.originCurrency)}
        </p>
        {tx.destinationAmount != null && tx.destinationCurrency !== tx.originCurrency && (
          <p className="text-[0.6875rem] text-[#4E5A7A] mt-0.5">
            {formatAmount(tx.destinationAmount, tx.destinationCurrency)}
          </p>
        )}
      </div>
    </Link>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function RecentTransactions({ transactions, loading }) {
  return (
    <div className="px-4 mb-2">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-white">Transferencias recientes</p>
        <Link
          to="/transactions"
          className="text-[0.8125rem] font-medium text-[#C4CBD8] no-underline"
        >
          Ver todas
        </Link>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : transactions.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[2rem] mb-2">💸</p>
            <p className="text-[0.875rem] font-medium text-[#8A96B8]">
              Aún no tienes transferencias
            </p>
            <p className="text-[0.75rem] text-[#4E5A7A] mt-1">
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
