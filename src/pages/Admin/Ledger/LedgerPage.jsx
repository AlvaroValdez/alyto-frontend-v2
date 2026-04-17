/**
 * LedgerPage.jsx — Backoffice Ledger de Transacciones
 *
 * Sección superior: 4 summary cards (se actualizan con los filtros).
 * Sección principal: tabla paginada con filtros + auto-refresh cada 30s.
 * Tab "Corredores": gestión inline de parámetros de corredores.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Shield, RefreshCw, AlertCircle, BookOpen,
  TrendingUp, CheckCircle2, XCircle, DollarSign,
  LayoutGrid, SlidersHorizontal, ChevronLeft, ChevronRight,
  Copy, CheckCheck,
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { listTransactions } from '../../../services/adminService'
import TransactionDrawer from './TransactionDrawer'
import CorridorsPanel   from './CorridorsPanel'

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  initiated:        { bg: '#1D346140', text: '#8AB4F8',  label: 'Iniciada'     },
  payin_pending:    { bg: '#C4CBD81A', text: '#C4CBD8',  label: 'Pay-in pend.' },
  payin_completed:  { bg: '#22C55E1A', text: '#22C55E',  label: 'Pay-in OK'    },
  in_transit:       { bg: '#C4CBD81A', text: '#C4CBD8',  label: 'En tránsito'  },
  payout_pending:   { bg: '#C4CBD81A', text: '#C4CBD8',  label: 'Payout pend.' },
  completed:        { bg: '#22C55E1A', text: '#22C55E',  label: 'Completada'   },
  failed:           { bg: '#EF44441A', text: '#F87171',  label: 'Fallida'      },
  refunded:         { bg: '#EF44441A', text: '#F87171',  label: 'Reembolsada'  },
}

const ENTITY_STYLES = {
  SpA: { bg: '#1D346114', text: '#8AB4F8',  border: '#1D346140', label: 'SpA · Chile'   },
  LLC: { bg: '#4E5A7A14', text: '#C4CBD8',  border: '#4E5A7A40', label: 'LLC · EE.UU.'  },
  SRL: { bg: '#22C55E14', text: '#22C55E',  border: '#22C55E40', label: 'SRL · Bolivia' },
}

const VALID_STATUSES = [
  'initiated', 'payin_pending', 'payin_completed',
  'in_transit', 'payout_pending', 'completed', 'failed', 'refunded',
]

const STATUS_LABELS = {
  initiated: 'Iniciada', payin_pending: 'Pay-in pendiente',
  payin_completed: 'Pay-in completado', in_transit: 'En tránsito',
  payout_pending: 'Payout pendiente', completed: 'Completada',
  failed: 'Fallida', refunded: 'Reembolsada',
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? { bg: '#4E5A7A1A', text: '#8A96B8', label: status }
  return (
    <span
      className="text-[0.625rem] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  )
}

function EntityBadge({ entity }) {
  const s = ENTITY_STYLES[entity] ?? ENTITY_STYLES.LLC
  return (
    <span
      className="text-[0.625rem] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {s.label}
    </span>
  )
}

function SummaryCard({ icon: Icon, label, value, color = '#C4CBD8', sub }) {
  return (
    <div className="bg-[#1A2340] rounded-2xl p-4 border border-[#263050] flex items-start gap-3">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${color}1A` }}
      >
        <Icon size={16} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[0.6875rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-0.5 truncate">
          {label}
        </p>
        <p className="text-[1.25rem] font-bold text-white leading-tight tabular-nums">{value}</p>
        {sub && <p className="text-[0.6875rem] text-[#4E5A7A] mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function LoadingSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-[#1F2B4D] animate-pulse" />
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-12 h-12 rounded-2xl bg-[#1A2340] flex items-center justify-center">
        <BookOpen size={20} className="text-[#4E5A7A]" />
      </div>
      <p className="text-[0.875rem] text-[#4E5A7A]">Sin transacciones para los filtros aplicados.</p>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options, placeholder = 'Todos' }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="rounded-xl px-3 py-2 text-[0.8125rem] text-white border border-[#263050] bg-[#1A2340] focus:outline-none focus:border-[#C4CBD8] min-w-[140px]"
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function DateInput({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider">{label}</label>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="rounded-xl px-3 py-2 text-[0.8125rem] text-white border border-[#263050] bg-[#1A2340] focus:outline-none focus:border-[#C4CBD8]"
        style={{ colorScheme: 'dark' }}
      />
    </div>
  )
}

function TxIdCell({ id }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="flex items-center gap-1 group" title="Copiar ID">
      <span className="text-[0.6875rem] font-mono text-[#C4CBD8] truncate max-w-[120px] block">
        {id}
      </span>
      {copied
        ? <CheckCheck size={10} className="text-[#22C55E] flex-shrink-0" />
        : <Copy size={10} className="text-[#4E5A7A] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      }
    </button>
  )
}

// ── LedgerPage ────────────────────────────────────────────────────────────────

export default function LedgerPage() {
  const navigate   = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user }   = useAuth()
  const intervalRef = useRef(null)
  const rowRefs = useRef({})
  const deepLinkTxId = searchParams.get('tx')
  const [highlightedTxId, setHighlightedTxId] = useState(null)

  // Tab activa: 'transactions' | 'corridors'
  const [tab, setTab] = useState('transactions')

  // Filtros
  const [filters, setFilters] = useState({
    status: '', entity: '', corridorId: '', startDate: '', endDate: '',
  })
  const [page, setPage] = useState(1)
  const LIMIT = 20

  // Datos
  const [transactions, setTransactions] = useState([])
  const [pagination,   setPagination]   = useState({ total: 0, page: 1, limit: LIMIT, totalPages: 0 })
  const [summary,      setSummary]      = useState({ totalVolume: 0, totalCompleted: 0, totalFailed: 0, totalFees: 0 })
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)

  // Drawer
  const [selectedTxId, setSelectedTxId] = useState(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const data = await listTransactions({
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')),
        page,
        limit: LIMIT,
      })
      setTransactions(data.transactions ?? [])
      setPagination(data.pagination ?? { total: 0, page: 1, limit: LIMIT, totalPages: 0 })
      setSummary(data.summary ?? { totalVolume: 0, totalCompleted: 0, totalFailed: 0, totalFees: 0 })
    } catch (err) {
      if (!silent) setError(err.message || 'Error al cargar transacciones.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [filters, page])

  // Cargar al montar, al cambiar filtros o página — solo si autenticado
  useEffect(() => {
    if (!user || tab !== 'transactions') return
    load()
  }, [load, tab, user])

  // Auto-refresh silencioso cada 30 segundos — solo si autenticado
  useEffect(() => {
    if (!user || tab !== 'transactions') return
    intervalRef.current = setInterval(() => load(true), 30_000)
    return () => clearInterval(intervalRef.current)
  }, [load, tab, user])

  // Deep-link desde notificación: ?tx=ALY-... abre drawer, scroll y highlight
  useEffect(() => {
    if (!deepLinkTxId || tab !== 'transactions' || !transactions.length) return
    const match = transactions.find(
      t => (t.alytoTransactionId ?? t._id) === deepLinkTxId,
    )
    if (!match) return

    const id = match.alytoTransactionId ?? match._id
    setSelectedTxId(id)
    setHighlightedTxId(id)

    requestAnimationFrame(() => {
      rowRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })

    const timeout = setTimeout(() => setHighlightedTxId(null), 3000)
    const clearParams = setTimeout(() => {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        next.delete('tx')
        return next
      }, { replace: true })
    }, 100)
    return () => {
      clearTimeout(timeout)
      clearTimeout(clearParams)
    }
  }, [deepLinkTxId, tab, transactions, setSearchParams])

  const setFilter = (key, value) => {
    setPage(1)
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setPage(1)
    setFilters({ status: '', entity: '', corridorId: '', startDate: '', endDate: '' })
  }

  const hasFilters = Object.values(filters).some(Boolean)

  const fmtNumber = (n) =>
    typeof n === 'number' ? n.toLocaleString('es-CL', { maximumFractionDigits: 0 }) : '—'

  const tabs = [
    { id: 'transactions', label: 'Transacciones', icon: LayoutGrid },
    { id: 'corridors',    label: 'Corredores',    icon: SlidersHorizontal },
  ]

  return (
    <div className="min-h-screen bg-[#0F1628] font-sans">

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 px-4 pt-12 pb-4"
        style={{
          background: 'linear-gradient(180deg, #0F1628 70%, #0F162800 100%)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/admin')}
              className="w-9 h-9 rounded-full bg-[#1A2340] border border-[#263050] flex items-center justify-center transition-colors hover:border-[#C4CBD833]"
            >
              <ArrowLeft size={16} className="text-[#8A96B8]" />
            </button>

            <div className="flex items-center gap-2.5 flex-1">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #1D3461, #0F1628)' }}
              >
                <Shield size={14} className="text-[#C4CBD8]" />
              </div>
              <div>
                <h1 className="text-[1rem] font-bold text-white leading-none">Ledger</h1>
                <p className="text-[0.6875rem] text-[#4E5A7A] mt-0.5">{user?.email}</p>
              </div>
            </div>

            {tab === 'transactions' && (
              <button
                onClick={() => load(false)}
                disabled={loading}
                className="w-9 h-9 rounded-full bg-[#1A2340] border border-[#263050] flex items-center justify-center transition-colors hover:border-[#C4CBD833] disabled:opacity-40"
              >
                <RefreshCw size={14} className={`text-[#8A96B8] ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-[#1A2340] rounded-2xl">
            {tabs.map(({ id, label, icon: Icon }) => {
              const active = tab === id
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[0.8125rem] font-semibold transition-all duration-200 ${
                    active ? 'bg-[#0F1628] text-white shadow-sm' : 'text-[#4E5A7A] hover:text-[#8A96B8]'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* ── CONTENIDO ─────────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 pb-16">

        {/* ── TAB TRANSACCIONES ─────────────────────────────────────────── */}
        {tab === 'transactions' && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <SummaryCard
                icon={TrendingUp}
                label="Volumen total"
                value={`$${fmtNumber(summary.totalVolume)}`}
                color="#C4CBD8"
                sub="en moneda origen"
              />
              <SummaryCard
                icon={CheckCircle2}
                label="Completadas"
                value={fmtNumber(summary.totalCompleted)}
                color="#22C55E"
              />
              <SummaryCard
                icon={XCircle}
                label="Fallidas"
                value={fmtNumber(summary.totalFailed)}
                color="#EF4444"
              />
              <SummaryCard
                icon={DollarSign}
                label="Fees recaudados"
                value={`$${fmtNumber(summary.totalFees)}`}
                color="#8AB4F8"
                sub="fee total"
              />
            </div>

            {/* Panel de filtros */}
            <div className="bg-[#1A2340] rounded-2xl border border-[#263050] p-4 mb-4">
              <div className="flex flex-wrap gap-3 items-end">
                <FilterSelect
                  label="Status"
                  value={filters.status}
                  onChange={v => setFilter('status', v)}
                  options={VALID_STATUSES.map(s => ({ value: s, label: STATUS_LABELS[s] ?? s }))}
                />
                <FilterSelect
                  label="Entidad"
                  value={filters.entity}
                  onChange={v => setFilter('entity', v)}
                  options={[
                    { value: 'LLC', label: 'LLC · EE.UU.' },
                    { value: 'SpA', label: 'SpA · Chile' },
                    { value: 'SRL', label: 'SRL · Bolivia' },
                  ]}
                />
                <div className="flex flex-col gap-1">
                  <label className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider">
                    Corredor ID
                  </label>
                  <input
                    type="text"
                    value={filters.corridorId}
                    onChange={e => setFilter('corridorId', e.target.value)}
                    placeholder="ej. cl-bo-fintoc-anchorbolivia"
                    className="rounded-xl px-3 py-2 text-[0.8125rem] text-white border border-[#263050] bg-[#0F1628] focus:outline-none focus:border-[#C4CBD8] placeholder-[#4E5A7A] min-w-[200px]"
                  />
                </div>
                <DateInput label="Desde" value={filters.startDate} onChange={v => setFilter('startDate', v)} />
                <DateInput label="Hasta" value={filters.endDate}   onChange={v => setFilter('endDate', v)} />

                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="self-end px-4 py-2 rounded-xl text-[0.8125rem] font-semibold text-[#8A96B8] border border-[#263050] hover:border-[#C4CBD833] hover:text-[#C4CBD8] transition-colors"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-[#EF44441A] rounded-2xl border border-[#EF444433] mb-4">
                <AlertCircle size={16} className="text-[#F87171] flex-shrink-0" />
                <p className="text-[0.875rem] text-[#F87171]">{error}</p>
              </div>
            )}

            {/* Tabla */}
            <div className="rounded-2xl border border-[#263050] overflow-hidden bg-[#1A2340]">
              <div className="px-4 py-3.5 border-b border-[#26305060] flex items-center justify-between">
                <h2 className="text-[0.9375rem] font-bold text-white">Transacciones</h2>
                <span className="text-[0.75rem] text-[#4E5A7A]">
                  {pagination.total} en total
                </span>
              </div>

              {loading ? (
                <LoadingSkeleton />
              ) : !transactions.length ? (
                <EmptyState />
              ) : (
                <div className="divide-y divide-[#1A234060]">
                  {transactions.map((tx) => {
                    const txId = tx.alytoTransactionId ?? tx._id
                    const isHighlighted = highlightedTxId === txId
                    return (
                    <div
                      key={tx._id}
                      ref={el => { if (el) rowRefs.current[txId] = el }}
                      className={`px-4 py-3 transition-colors ${
                        isHighlighted
                          ? 'bg-[#F59E0B26] ring-2 ring-[#F59E0B80]'
                          : 'hover:bg-[#1F2B4D30]'
                      }`}
                    >
                      {/* Fila 1: ID · badges · fecha · botón */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <TxIdCell id={tx.alytoTransactionId ?? tx._id} />
                        <StatusBadge status={tx.status} />
                        <EntityBadge entity={tx.legalEntity} />
                        <span className="text-[0.6875rem] text-[#4E5A7A] ml-auto whitespace-nowrap">
                          {tx.createdAt
                            ? new Date(tx.createdAt).toLocaleString('es-CL', {
                                day: '2-digit', month: 'short',
                                hour: '2-digit', minute: '2-digit',
                              })
                            : '—'
                          }
                        </span>
                        <button
                          onClick={() => setSelectedTxId(tx.alytoTransactionId ?? tx._id)}
                          className="px-3 py-1 rounded-lg text-[0.6875rem] font-semibold border border-[#263050] text-[#C4CBD8] hover:border-[#C4CBD833] hover:bg-[#C4CBD808] transition-colors whitespace-nowrap"
                        >
                          Ver detalle
                        </button>
                      </div>

                      {/* Fila 2: corredor + montos + usuario */}
                      <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                        {/* Corredor + montos */}
                        <div className="flex items-center gap-2">
                          <span className="text-[0.8125rem] font-bold text-white tabular-nums">
                            {tx.originalAmount?.toLocaleString('es-CL') ?? '—'}
                          </span>
                          <span className="text-[0.6875rem] text-[#4E5A7A]">{tx.originCurrency}</span>
                          <span className="text-[#4E5A7A] text-[0.75rem]">→</span>
                          <span className="text-[0.8125rem] font-bold text-[#22C55E] tabular-nums">
                            {tx.destinationAmount?.toLocaleString('es-CL') ?? '—'}
                          </span>
                          <span className="text-[0.6875rem] text-[#4E5A7A]">{tx.destinationCurrency}</span>
                          <span className="text-[0.6875rem] font-semibold text-[#4E5A7A] bg-[#0F1628] px-1.5 py-0.5 rounded-md">
                            {tx.originCountry}→{tx.destinationCountry}
                          </span>
                        </div>
                        {/* Separador */}
                        <span className="text-[#263050]">·</span>
                        {/* Usuario */}
                        <p className="text-[0.75rem] text-[#8A96B8] truncate max-w-[200px]">
                          {tx.userId?.email ?? '—'}
                        </p>
                      </div>
                    </div>
                  )})}
                </div>
              )}

              {/* Paginación */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#26305060]">
                  <p className="text-[0.75rem] text-[#4E5A7A]">
                    Página {pagination.page} de {pagination.totalPages}
                    <span className="ml-2 text-[#263050]">·</span>
                    <span className="ml-2">{pagination.total} transacciones</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="w-8 h-8 rounded-full bg-[#0F1628] border border-[#263050] flex items-center justify-center hover:border-[#C4CBD833] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft size={14} className="text-[#8A96B8]" />
                    </button>

                    {/* Números de página — ventana de 5 */}
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const start = Math.max(1, Math.min(page - 2, pagination.totalPages - 4))
                      const p = start + i
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-full text-[0.75rem] font-semibold transition-all ${
                            p === page
                              ? 'bg-[#C4CBD8] text-[#0F1628]'
                              : 'text-[#4E5A7A] hover:text-[#8A96B8]'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    })}

                    <button
                      onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={page >= pagination.totalPages}
                      className="w-8 h-8 rounded-full bg-[#0F1628] border border-[#263050] flex items-center justify-center hover:border-[#C4CBD833] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight size={14} className="text-[#8A96B8]" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── TAB CORREDORES ──────────────────────────────────────────────── */}
        {tab === 'corridors' && (
          <div className="rounded-2xl border border-[#263050] overflow-hidden bg-[#1A2340]">
            <div className="px-4 py-4 border-b border-[#26305060]">
              <h2 className="text-[0.9375rem] font-bold text-white">Corredores de pago</h2>
              <p className="text-[0.75rem] text-[#4E5A7A] mt-0.5">
                Click en spread o fee fijo para editar en línea · Enter para guardar · Escape para cancelar
              </p>
            </div>
            <div className="p-4">
              <CorridorsPanel />
            </div>
          </div>
        )}

      </main>

      {/* ── DRAWER ────────────────────────────────────────────────────────── */}
      <TransactionDrawer
        transactionId={selectedTxId}
        onClose={() => setSelectedTxId(null)}
        onStatusUpdated={() => load(true)}
      />
    </div>
  )
}
