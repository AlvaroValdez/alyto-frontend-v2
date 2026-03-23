/**
 * TransactionsPage.jsx — Historial de transferencias del usuario
 *
 * Muestra todas las transferencias cross-border realizadas por el usuario
 * con estados en tiempo real, filtros por tab y paginación.
 *
 * Ruta: /transactions
 */

import { useState, useRef } from 'react'
import { useNavigate }      from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  RefreshCw,
  CheckCircle,
  XCircle,
  Send,
  RotateCcw,
} from 'lucide-react'
import { useTransactions } from '../../hooks/useTransactions.js'

// ── Constantes ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'all',         label: 'Todas'       },
  { key: 'in_progress', label: 'En proceso'  },
  { key: 'completed',   label: 'Completadas' },
  { key: 'failed',      label: 'Fallidas'    },
]

const IN_PROGRESS_STATUSES = new Set([
  'initiated', 'payin_pending', 'payin_confirmed', 'payin_completed',
  'processing', 'in_transit', 'payout_pending', 'payout_sent',
])

const STATUS_CONFIG = {
  initiated:        { label: 'Iniciada',          color: '#8A96B8', bg: '#8A96B81A',  Icon: Clock      },
  payin_pending:    { label: 'Pago pendiente',     color: '#8A96B8', bg: '#8A96B81A',  Icon: Clock      },
  payin_confirmed:  { label: 'Pago confirmado',    color: '#C4CBD8', bg: '#C4CBD81A',  Icon: RefreshCw  },
  payin_completed:  { label: 'Pago completado',    color: '#C4CBD8', bg: '#C4CBD81A',  Icon: RefreshCw  },
  processing:       { label: 'Procesando',         color: '#3B82F6', bg: '#3B82F61A',  Icon: RefreshCw  },
  in_transit:       { label: 'En tránsito',        color: '#3B82F6', bg: '#3B82F61A',  Icon: RefreshCw  },
  payout_pending:   { label: 'Enviando...',        color: '#C4CBD8', bg: '#C4CBD81A',  Icon: RefreshCw  },
  payout_sent:      { label: 'Enviado al banco',   color: '#3B82F6', bg: '#3B82F61A',  Icon: RefreshCw  },
  completed:        { label: 'Completada',         color: '#22C55E', bg: '#22C55E1A',  Icon: CheckCircle },
  failed:           { label: 'Fallida',            color: '#EF4444', bg: '#EF44441A',  Icon: XCircle    },
  refunded:         { label: 'Reembolsada',        color: '#F59E0B', bg: '#F59E0B1A',  Icon: RotateCcw  },
}

// ── Utilidades ────────────────────────────────────────────────────────────────

function filterByTab(transactions, tab) {
  if (tab === 'all')         return transactions
  if (tab === 'in_progress') return transactions.filter(tx => IN_PROGRESS_STATUSES.has(tx.status))
  if (tab === 'completed')   return transactions.filter(tx => tx.status === 'completed')
  if (tab === 'failed')      return transactions.filter(tx => tx.status === 'failed' || tx.status === 'refunded')
  return transactions
}

function formatRelativeDate(dateStr) {
  if (!dateStr) return ''
  const date  = new Date(dateStr)
  const now   = new Date()
  const diffMs = now - date
  const mins   = Math.floor(diffMs / 60_000)
  const hours  = Math.floor(diffMs / 3_600_000)
  const days   = Math.floor(diffMs / 86_400_000)

  if (mins  <  1)  return 'ahora mismo'
  if (mins  < 60)  return `hace ${mins} min`
  if (hours < 24)  return `hace ${hours} hora${hours > 1 ? 's' : ''}`
  if (days  === 1) return 'ayer'
  if (days  <  7)  return `hace ${days} días`
  return date.toLocaleDateString('es-ES', {
    day:   'numeric',
    month: 'short',
    year:  days > 365 ? 'numeric' : undefined,
  })
}

function formatAmount(amount, currency) {
  if (amount == null || !currency) return '—'
  const num = new Intl.NumberFormat('es-CL', {
    style:                 'decimal',
    maximumFractionDigits: 2,
  }).format(amount)
  return `${num} ${currency}`
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function SkeletonItem() {
  return (
    <div className="flex items-center gap-3 p-4 bg-[#1A2340] rounded-2xl animate-pulse">
      <div className="w-11 h-11 rounded-xl bg-[#263050] flex-shrink-0" />
      <div className="flex-1">
        <div className="h-4 bg-[#263050] rounded w-2/3 mb-2" />
        <div className="h-3 bg-[#1F2B4D] rounded w-1/2" />
      </div>
      <div className="text-right">
        <div className="h-4 bg-[#263050] rounded w-20 mb-2" />
        <div className="h-3 bg-[#1F2B4D] rounded w-14 ml-auto" />
      </div>
    </div>
  )
}

function TransactionItem({ tx, onPress }) {
  const cfg = STATUS_CONFIG[tx.status] ?? { label: tx.status, color: '#8A96B8', bg: '#8A96B81A', Icon: Clock }
  const { Icon } = cfg

  const corridorLabel = tx.originCurrency && tx.destinationCurrency
    ? `${tx.originCurrency} → ${tx.destinationCurrency}`
    : null

  const beneficiaryName = tx.beneficiary?.fullName
    || [tx.beneficiary?.beneficiary_first_name, tx.beneficiary?.beneficiary_last_name].filter(Boolean).join(' ')
    || null

  return (
    <button
      onClick={() => onPress(tx.transactionId)}
      className="flex items-center gap-3 p-4 bg-[#1A2340] rounded-2xl w-full text-left transition-colors hover:bg-[#1F2B4D] active:bg-[#263050]"
    >
      {/* Ícono de estado */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: cfg.bg }}
      >
        <Icon size={20} style={{ color: cfg.color }} />
      </div>

      {/* Información central */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-[0.9375rem] font-semibold text-white truncate">
            {formatAmount(tx.originAmount, tx.originCurrency)}
          </p>
          <span className="text-[#4E5A7A] text-sm flex-shrink-0">→</span>
          <p className="text-[0.875rem] font-medium text-[#C4CBD8] truncate">
            {tx.destinationAmount != null
              ? formatAmount(tx.destinationAmount, tx.destinationCurrency)
              : '—'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {beneficiaryName && (
            <p className="text-[0.75rem] text-[#8A96B8] truncate">{beneficiaryName}</p>
          )}
          {corridorLabel && (
            <span className="text-[0.625rem] font-semibold px-1.5 py-0.5 rounded border border-[#C4CBD833] text-[#C4CBD8] flex-shrink-0">
              {corridorLabel}
            </span>
          )}
        </div>
      </div>

      {/* Lado derecho: badge + fecha */}
      <div className="text-right flex-shrink-0 ml-1">
        <span
          className="text-[0.6875rem] font-medium px-2 py-0.5 rounded-full block mb-1 whitespace-nowrap"
          style={{ background: cfg.bg, color: cfg.color }}
        >
          {cfg.label}
        </span>
        <p className="text-[0.6875rem] text-[#4E5A7A]">
          {formatRelativeDate(tx.createdAt)}
        </p>
      </div>
    </button>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const navigate    = useNavigate()
  const [activeTab, setActiveTab] = useState('all')

  const {
    transactions,
    loading,
    error,
    pagination,
    fetchTransactions: loadTransactions,
    fetchMore,
    refreshTransactions,
  } = useTransactions()

  // ── Pull to refresh ────────────────────────────────────────────────────────
  const touchStartY  = useRef(0)
  const [refreshing, setRefreshing] = useState(false)

  function handleTouchStart(e) {
    touchStartY.current = e.touches[0].clientY
  }

  async function handleTouchEnd(e) {
    const deltaY    = e.changedTouches[0].clientY - touchStartY.current
    const scrollTop = e.currentTarget.scrollTop
    if (deltaY > 80 && scrollTop <= 0 && !refreshing) {
      setRefreshing(true)
      await refreshTransactions()
      setRefreshing(false)
    }
  }

  // ──────────────────────────────────────────────────────────────────────────

  const filtered = filterByTab(transactions, activeTab)

  function handleItemPress(transactionId) {
    navigate(`/transactions/${encodeURIComponent(transactionId)}`)
  }

  return (
    <div className="min-h-screen bg-[#0F1628] flex flex-col max-w-[430px] mx-auto">

      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-12 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-[#1A2340] flex items-center justify-center flex-shrink-0"
        >
          <ArrowLeft size={18} className="text-[#8A96B8]" />
        </button>
        <h1 className="text-lg font-bold text-white flex-1">Mis transferencias</h1>
      </header>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-full text-[0.75rem] font-medium border transition-all flex-shrink-0 ${
              activeTab === tab.key
                ? 'bg-[#C4CBD81A] border-[#C4CBD833] text-[#C4CBD8]'
                : 'bg-transparent border-[#263050] text-[#4E5A7A] hover:border-[#C4CBD833] hover:text-[#8A96B8]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido scrollable */}
      <div
        className="flex-1 overflow-y-auto px-4 pb-8"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >

        {/* Indicador pull-to-refresh */}
        {refreshing && (
          <div className="flex justify-center py-2 mb-2">
            <RefreshCw size={18} className="text-[#C4CBD8] animate-spin" />
          </div>
        )}

        {/* Skeleton de carga inicial */}
        {loading && (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonItem key={i} />)}
          </div>
        )}

        {/* Estado de error */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#EF44441A] flex items-center justify-center mb-4">
              <XCircle size={24} className="text-[#EF4444]" />
            </div>
            <p className="text-white font-semibold mb-1">No se pudo cargar</p>
            <p className="text-[#8A96B8] text-sm mb-4">{error}</p>
            <button
              onClick={() => loadTransactions()}
              className="px-4 py-2 rounded-xl font-semibold text-sm text-[#0F1628]"
              style={{ background: '#C4CBD8' }}
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Estado vacío */}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-20 h-20 rounded-3xl bg-[#1A2340] flex items-center justify-center mb-6"
              style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}
            >
              <Send size={36} className="text-[#4E5A7A]" />
            </div>
            <p className="text-white font-bold text-base mb-2">
              {activeTab === 'all'
                ? 'Aún no has realizado ninguna transferencia'
                : activeTab === 'in_progress'
                  ? 'No hay transferencias en proceso'
                  : activeTab === 'completed'
                    ? 'No hay transferencias completadas'
                    : 'No hay transferencias fallidas'
              }
            </p>
            {activeTab === 'all' && (
              <>
                <p className="text-[#8A96B8] text-sm mb-6">
                  Envía dinero a cualquier parte del mundo.
                </p>
                <button
                  onClick={() => navigate('/send')}
                  className="px-6 py-3 rounded-2xl font-bold text-[0.9375rem] text-[#0F1628]"
                  style={{ background: '#C4CBD8', boxShadow: '0 4px 20px rgba(196,203,216,0.3)' }}
                >
                  Enviar dinero
                </button>
              </>
            )}
          </div>
        )}

        {/* Lista de transacciones */}
        {!loading && !error && filtered.length > 0 && (
          <>
            <div className="flex flex-col gap-2">
              {filtered.map((tx) => (
                <TransactionItem
                  key={tx.transactionId}
                  tx={tx}
                  onPress={handleItemPress}
                />
              ))}
            </div>

            {/* Cargar más — solo en tab "Todas" */}
            {activeTab === 'all' && pagination.page < pagination.totalPages && (
              <button
                onClick={fetchMore}
                className="w-full mt-4 py-3 rounded-2xl border border-[#263050] text-[#8A96B8] text-sm font-medium transition-colors hover:border-[#C4CBD833] hover:text-[#C4CBD8]"
              >
                Cargar más
              </button>
            )}

            {/* Contador */}
            <p className="text-center text-[0.6875rem] text-[#4E5A7A] mt-4">
              {activeTab === 'all'
                ? `${Math.min(pagination.page * pagination.limit, pagination.total)} de ${pagination.total} transferencias`
                : `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''}`
              }
            </p>
          </>
        )}

      </div>
    </div>
  )
}
