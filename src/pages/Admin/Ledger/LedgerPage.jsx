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
  Copy, CheckCheck, Inbox, Clock, Bell, Banknote, Hourglass, Archive,
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { listTransactions, getLedgerCounts } from '../../../services/adminService'
import { useAdminSSE } from '../../../hooks/useAdminSSE'
import TransactionDrawer from './TransactionDrawer'
import CorridorsPanel   from './CorridorsPanel'

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  pending:                   { bg: '#4E5A7A1A', text: '#8A96B8',  label: 'Pendiente'     },
  initiated:                 { bg: '#1D346140', text: '#8AB4F8',  label: 'Iniciada'      },
  payin_pending:             { bg: '#F59E0B1A', text: '#F59E0B',  label: 'Pay-in pend.'  },
  payin_confirmed:           { bg: '#22C55E1A', text: '#22C55E',  label: 'Pay-in conf.'  },
  payin_completed:           { bg: '#22C55E1A', text: '#22C55E',  label: 'Pay-in OK'     },
  processing:                { bg: '#C4CBD81A', text: '#C4CBD8',  label: 'Procesando'    },
  in_transit:                { bg: '#C4CBD81A', text: '#C4CBD8',  label: 'En tránsito'   },
  payout_pending:            { bg: '#F59E0B1A', text: '#F59E0B',  label: 'Payout pend.'  },
  payout_sent:               { bg: '#C4CBD81A', text: '#C4CBD8',  label: 'Payout enviado'},
  payout_pending_usdc_send:  { bg: '#F59E0B1A', text: '#F59E0B',  label: 'USDC pend.'    },
  payout_in_transit:         { bg: '#C4CBD81A', text: '#C4CBD8',  label: 'Payout tránsito'},
  pending_funding:           { bg: '#EF44441A', text: '#F87171',  label: 'Falta fondeo'  },
  completed:                 { bg: '#22C55E1A', text: '#22C55E',  label: 'Completada'    },
  failed:                    { bg: '#EF44441A', text: '#F87171',  label: 'Fallida'       },
  refunded:                  { bg: '#EF44441A', text: '#F87171',  label: 'Reembolsada'   },
}

const ENTITY_STYLES = {
  SpA: { bg: '#1D346114', text: '#8AB4F8',  border: '#1D346140', label: 'SpA · Chile'   },
  LLC: { bg: '#4E5A7A14', text: '#C4CBD8',  border: '#4E5A7A40', label: 'LLC · EE.UU.'  },
  SRL: { bg: '#22C55E14', text: '#22C55E',  border: '#22C55E40', label: 'SRL · Bolivia' },
}

const VALID_STATUSES = [
  'pending', 'initiated', 'payin_pending', 'payin_confirmed', 'payin_completed',
  'processing', 'in_transit', 'payout_pending', 'payout_sent',
  'payout_pending_usdc_send', 'payout_in_transit', 'pending_funding',
  'completed', 'failed', 'refunded',
]

const STATUS_LABELS = {
  pending: 'Pendiente', initiated: 'Iniciada', payin_pending: 'Pay-in pendiente',
  payin_confirmed: 'Pay-in confirmado', payin_completed: 'Pay-in completado',
  processing: 'Procesando', in_transit: 'En tránsito',
  payout_pending: 'Payout pendiente', payout_sent: 'Payout enviado',
  payout_pending_usdc_send: 'USDC pendiente', payout_in_transit: 'Payout en tránsito',
  pending_funding: 'Falta fondeo', completed: 'Completada',
  failed: 'Fallida', refunded: 'Reembolsada',
}

// ── Tabs del Ledger (alineado con TAB_FILTERS del backend) ───────────────────
const LEDGER_TABS = [
  { id: 'actionable',    label: 'Accionables',   icon: Bell,      color: '#F59E0B' },
  { id: 'manual_payout', label: 'Payout manual', icon: Banknote,  color: '#8AB4F8' },
  { id: 'in_progress',   label: 'En proceso',    icon: Hourglass, color: '#C4CBD8' },
  { id: 'history',       label: 'Historial',     icon: Archive,   color: '#4E5A7A' },
]

// ── beep programático (sin asset externo) ────────────────────────────────────
function playBeep() {
  try {
    const Ctx = window.AudioContext ?? window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.38)
    osc.onended = () => ctx.close()
  } catch { /* audio unavailable */ }
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
  // Tab del Ledger: actionable | manual_payout | in_progress | history
  const [activeTab, setActiveTab] = useState('actionable')
  const [page, setPage] = useState(1)
  const LIMIT = 20

  // Datos
  const [transactions, setTransactions] = useState([])
  const [pagination,   setPagination]   = useState({ total: 0, page: 1, limit: LIMIT, totalPages: 0 })
  const [summary,      setSummary]      = useState({ totalVolume: 0, totalCompleted: 0, totalFailed: 0, totalFees: 0, pendingNoProofCount: 0 })
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)

  // Counts por tab (polling + SSE)
  const [counts, setCounts] = useState({ actionable: 0, manual_payout: 0, in_progress: 0, history: 0, unpaid: 0 })
  // Pulse en la pestaña actionable cuando llega una tx nueva
  const [pulseActionable,   setPulseActionable]   = useState(false)
  const [pulseManualPayout, setPulseManualPayout] = useState(false)

  // Toast in-page (nuevas tx en tiempo real)
  const [toast, setToast] = useState(null)
  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4500)
  }, [])

  // Drawer
  const [selectedTxId, setSelectedTxId] = useState(null)

  // Si el admin pasa un `status` manual, el backend salta el filtro por tab.
  // En ese caso no incluimos `tab` en los query params.
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const params = {
        ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '')),
        page,
        limit: LIMIT,
      }
      if (!filters.status) params.tab = activeTab
      const data = await listTransactions(params)
      setTransactions(data.transactions ?? [])
      setPagination(data.pagination ?? { total: 0, page: 1, limit: LIMIT, totalPages: 0 })
      setSummary(data.summary ?? { totalVolume: 0, totalCompleted: 0, totalFailed: 0, totalFees: 0, pendingNoProofCount: 0 })
    } catch (err) {
      if (!silent) setError(err.message || 'Error al cargar transacciones.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [filters, activeTab, page])

  const loadCounts = useCallback(async () => {
    try {
      const data = await getLedgerCounts()
      setCounts({
        actionable:    data.actionable    ?? 0,
        manual_payout: data.manual_payout ?? 0,
        in_progress:   data.in_progress   ?? 0,
        history:       data.history       ?? 0,
        unpaid:        data.unpaid        ?? 0,
      })
    } catch { /* silent */ }
  }, [])

  // Cargar al montar, al cambiar filtros/tab/página — solo si autenticado
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

  // Counts polling cada 15 s (refuerzo del SSE — si el stream cae, los badges
  // siguen actualizándose y el admin no queda ciego)
  useEffect(() => {
    if (!user || tab !== 'transactions') return undefined
    loadCounts()
    const id = setInterval(loadCounts, 15_000)
    return () => clearInterval(id)
  }, [loadCounts, tab, user])

  // SSE: nueva tx accionable → beep + toast + pulse + recargar si estoy en la pestaña
  useAdminSSE({
    enabled: !!user && tab === 'transactions',
    onActionable: (data) => {
      playBeep()
      showToast(`Nueva tx accionable · ${data.transactionId}`)
      setPulseActionable(true)
      setTimeout(() => setPulseActionable(false), 2500)
      setCounts(prev => ({ ...prev, actionable: prev.actionable + 1 }))
      if (activeTab === 'actionable' && page === 1) load(true)
    },
    onManualPayout: (data) => {
      playBeep()
      showToast(`Payout manual requerido · ${data.transactionId}`)
      setPulseManualPayout(true)
      setTimeout(() => setPulseManualPayout(false), 2500)
      setCounts(prev => ({ ...prev, manual_payout: prev.manual_payout + 1 }))
      if (activeTab === 'manual_payout' && page === 1) load(true)
    },
  })

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

            {/* Tabs del Ledger (Accionables / Payout manual / En proceso / Historial) */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#1A2340] rounded-2xl border border-[#263050] mb-4">
              {LEDGER_TABS.map(({ id, label, icon: Icon, color }) => {
                const active = activeTab === id
                const count  = counts[id] ?? 0
                const pulse  = (id === 'actionable' && pulseActionable) || (id === 'manual_payout' && pulseManualPayout)
                return (
                  <button
                    key={id}
                    onClick={() => { setPage(1); setActiveTab(id) }}
                    className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-[0.8125rem] font-semibold transition-all duration-200 ${
                      active ? 'bg-[#0F1628] text-white shadow-sm' : 'text-[#4E5A7A] hover:text-[#8A96B8]'
                    } ${pulse ? 'ring-2 ring-[#F59E0B80]' : ''}`}
                    style={pulse ? { boxShadow: `0 0 0 3px ${color}33` } : undefined}
                  >
                    <Icon size={14} style={{ color: active ? color : undefined }} />
                    <span>{label}</span>
                    {count > 0 && (
                      <span
                        className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full tabular-nums"
                        style={{ background: `${color}26`, color }}
                      >
                        {count > 99 ? '99+' : count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Banner: payins sin comprobante (sólo visible en Accionables) */}
            {activeTab === 'actionable' && counts.unpaid > 0 && (
              <div className="flex items-center gap-3 p-3 bg-[#1D346114] rounded-2xl border border-[#1D346140] mb-4">
                <Inbox size={16} className="text-[#8AB4F8] flex-shrink-0" />
                <p className="text-[0.8125rem] text-[#8AB4F8]">
                  {counts.unpaid} {counts.unpaid === 1 ? 'transacción' : 'transacciones'} en pay-in sin comprobante · el usuario aún no subió el recibo
                </p>
                <button
                  onClick={() => { setPage(1); setFilters(f => ({ ...f, status: 'payin_pending' })) }}
                  className="ml-auto px-3 py-1 rounded-lg text-[0.6875rem] font-semibold text-[#8AB4F8] border border-[#1D346140] hover:border-[#8AB4F880] transition-colors whitespace-nowrap"
                >
                  Ver pay-in pendientes
                </button>
              </div>
            )}

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
                    const isPendingNoProof = tx.status === 'payin_pending' && !tx.paymentProof
                    return (
                    <div
                      key={tx._id}
                      ref={el => { if (el) rowRefs.current[txId] = el }}
                      className={`px-4 py-3 transition-colors ${
                        isHighlighted
                          ? 'bg-[#F59E0B26] ring-2 ring-[#F59E0B80]'
                          : isPendingNoProof
                            ? 'opacity-50 hover:opacity-100 hover:bg-[#1F2B4D30]'
                            : 'hover:bg-[#1F2B4D30]'
                      }`}
                    >
                      {/* Fila 1: ID · badges · fecha · botón */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <TxIdCell id={tx.alytoTransactionId ?? tx._id} />
                        <StatusBadge status={tx.status} />
                        <EntityBadge entity={tx.legalEntity} />
                        {isPendingNoProof && (
                          <span
                            className="flex items-center gap-1 text-[0.625rem] font-semibold px-2 py-0.5 rounded-full bg-[#4E5A7A1A] text-[#8A96B8] whitespace-nowrap"
                            title="Esperando comprobante del usuario"
                          >
                            <Clock size={10} />
                            Sin comprobante
                          </span>
                        )}
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

      {/* ── TOAST (SSE real-time) ─────────────────────────────────────────── */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#1A2340] border border-[#F59E0B80] shadow-lg"
          role="status"
          aria-live="polite"
        >
          <Bell size={14} className="text-[#F59E0B]" />
          <span className="text-[0.8125rem] text-white">{toast}</span>
        </div>
      )}
    </div>
  )
}
