/**
 * KybListPage.jsx — Lista de solicitudes KYB en el panel de administración
 *
 * Tabla con filtros, auto-refresh cada 60 s y badge de alerta
 * para solicitudes pendientes hace más de 24 h.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate }       from 'react-router-dom'
import { Building2, AlertTriangle, RefreshCw, ChevronRight, Search } from 'lucide-react'
import { listKybApplications } from '../../../services/kybService'

// ── Catálogos ──────────────────────────────────────────────────────────────

const STATUS_META = {
  not_started:  { label: 'Sin iniciar',   bg: '#1A2340',    border: '#263050',    text: '#4E5A7A'  },
  pending:      { label: 'Pendiente',     bg: '#C4CBD81A',  border: '#C4CBD833',  text: '#C4CBD8'  },
  under_review: { label: 'En revisión',   bg: '#F59E0B1A',  border: '#F59E0B33',  text: '#F59E0B'  },
  more_info:    { label: 'Más info',      bg: '#F59E0B1A',  border: '#F59E0B33',  text: '#F59E0B'  },
  approved:     { label: 'Aprobado',      bg: '#22C55E1A',  border: '#22C55E33',  text: '#22C55E'  },
  rejected:     { label: 'Rechazado',     bg: '#EF44441A',  border: '#EF444433',  text: '#EF4444'  },
}

const COUNTRIES = {
  BO: 'Bolivia', CL: 'Chile', PE: 'Perú', AR: 'Argentina',
  CO: 'Colombia', BR: 'Brasil', MX: 'México', US: 'EEUU', OTHER: 'Otro',
}

const VOLUMES = [
  { value: '0-10k',     label: '<$10k'     },
  { value: '10k-50k',   label: '$10k–$50k' },
  { value: '50k-100k',  label: '$50k–$100k'},
  { value: '100k-500k', label: '$100k–$500k'},
  { value: '500k+',     label: '>$500k'    },
]

// ── Helpers ────────────────────────────────────────────────────────────────

function isOlderThan24h(dateStr) {
  if (!dateStr) return false
  return (Date.now() - new Date(dateStr).getTime()) > 24 * 60 * 60 * 1000
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.not_started
  return (
    <span
      className="inline-block text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full"
      style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.text }}
    >
      {meta.label}
    </span>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function KybListPage() {
  const navigate = useNavigate()

  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const [filters, setFilters] = useState({ status: '', country: '', volumeRange: '', search: '' })
  const [page,    setPage]    = useState(1)
  const [total,   setTotal]   = useState(0)

  const timerRef = useRef(null)
  const LIMIT    = 20

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchItems = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const data = await listKybApplications({
        ...filters,
        page,
        limit: LIMIT,
      })
      setItems(data.items ?? data.applications ?? data ?? [])
      setTotal(data.total ?? 0)
    } catch (err) {
      setError(err.message || 'Error al cargar solicitudes')
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Auto-refresh cada 60 s
  useEffect(() => {
    timerRef.current = setInterval(() => fetchItems(true), 60_000)
    return () => clearInterval(timerRef.current)
  }, [fetchItems])

  // ── Alerta: pending > 24h ──────────────────────────────────────────────────

  const staleCount = items.filter(
    i => i.kybStatus === 'pending' && isOlderThan24h(i.createdAt)
  ).length

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleFilterChange(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const inputCls   = 'rounded-xl px-3 py-2 text-[0.8125rem] text-white border border-[#263050] bg-[#1A2340] focus:outline-none focus:border-[#C4CBD8] placeholder-[#4E5A7A]'
  const selectCls  = `${inputCls} appearance-none`

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 size={22} className="text-[#C4CBD8]" />
          <div>
            <h1 className="text-[1.125rem] font-bold text-white">Solicitudes KYB</h1>
            <p className="text-[0.75rem] text-[#4E5A7A]">{total} solicitudes en total</p>
          </div>
          {staleCount > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[0.75rem] font-bold"
              style={{ background: '#F59E0B1A', border: '1px solid #F59E0B33', color: '#F59E0B' }}
            >
              <AlertTriangle size={13} />
              {staleCount} pendiente{staleCount > 1 ? 's' : ''} &gt;24 h
            </div>
          )}
        </div>
        <button
          onClick={() => fetchItems()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[0.8125rem] font-medium text-[#8A96B8] hover:text-white transition-colors"
          style={{ background: '#1A2340', border: '1px solid #263050' }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* ── Filtros ── */}
      <div
        className="rounded-2xl p-4 flex flex-wrap gap-3"
        style={{ background: '#1A2340', border: '1px solid #263050' }}
      >
        {/* Buscar */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search size={14} className="text-[#4E5A7A]" />
          <input
            className="flex-1 bg-transparent text-[0.8125rem] text-white outline-none placeholder-[#4E5A7A]"
            placeholder="Buscar empresa o NIT…"
            value={filters.search}
            onChange={e => handleFilterChange('search', e.target.value)}
          />
        </div>

        {/* Status */}
        <select
          className={selectCls}
          value={filters.status}
          onChange={e => handleFilterChange('status', e.target.value)}
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {/* País */}
        <select
          className={selectCls}
          value={filters.country}
          onChange={e => handleFilterChange('country', e.target.value)}
        >
          <option value="">Todos los países</option>
          {Object.entries(COUNTRIES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {/* Volumen */}
        <select
          className={selectCls}
          value={filters.volumeRange}
          onChange={e => handleFilterChange('volumeRange', e.target.value)}
        >
          <option value="">Todos los volúmenes</option>
          {VOLUMES.map(v => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* ── Error ── */}
      {error && (
        <div
          className="px-4 py-3 rounded-xl text-[0.875rem] text-[#EF4444]"
          style={{ background: '#EF44441A', border: '1px solid #EF444433' }}
        >
          {error}
        </div>
      )}

      {/* ── Tabla ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: '#1A2340', border: '1px solid #263050' }}
      >
        {/* Encabezado */}
        <div
          className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 text-[0.625rem] font-bold text-[#4E5A7A] uppercase tracking-wider"
          style={{ borderBottom: '1px solid #263050' }}
        >
          <span>Empresa / País</span>
          <span>Tipo</span>
          <span>Volumen est.</span>
          <span>Estado</span>
          <span>Fecha</span>
          <span />
        </div>

        {/* Filas */}
        {loading && !items.length ? (
          <div className="px-5 py-10 text-center text-[#4E5A7A] text-[0.875rem]">
            Cargando solicitudes…
          </div>
        ) : !items.length ? (
          <div className="px-5 py-10 text-center text-[#4E5A7A] text-[0.875rem]">
            No hay solicitudes que coincidan con los filtros.
          </div>
        ) : (
          items.map(item => {
            const stale = item.kybStatus === 'pending' && isOlderThan24h(item.createdAt)
            return (
              <div
                key={item._id ?? item.businessId}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 items-center transition-colors cursor-pointer hover:bg-[#1F2B4D]"
                style={{ borderBottom: '1px solid #263050' }}
                onClick={() => navigate(`/admin/kyb/${item._id ?? item.businessId}`)}
              >
                {/* Empresa */}
                <div className="min-w-0">
                  <p className="text-[0.875rem] font-semibold text-white truncate flex items-center gap-2">
                    {item.legalName ?? '—'}
                    {stale && <AlertTriangle size={13} className="text-[#F59E0B] flex-shrink-0" />}
                  </p>
                  <p className="text-[0.75rem] text-[#4E5A7A] truncate">
                    {COUNTRIES[item.country] ?? item.country ?? '—'} · {item.taxId ?? '—'}
                  </p>
                </div>

                {/* Tipo */}
                <span className="text-[0.8125rem] text-[#8A96B8] truncate">
                  {item.companyType ?? '—'}
                </span>

                {/* Volumen */}
                <span className="text-[0.8125rem] text-[#8A96B8] truncate">
                  {VOLUMES.find(v => v.value === item.estimatedVolume)?.label ?? item.estimatedVolume ?? '—'}
                </span>

                {/* Estado */}
                <StatusBadge status={item.kybStatus} />

                {/* Fecha */}
                <span className="text-[0.75rem] text-[#4E5A7A]">
                  {formatDate(item.createdAt)}
                </span>

                {/* Acción */}
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/admin/kyb/${item._id ?? item.businessId}`) }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.75rem] font-medium text-[#C4CBD8] hover:bg-[#C4CBD81A] transition-colors"
                >
                  Revisar <ChevronRight size={14} />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* ── Paginación ── */}
      {total > LIMIT && (
        <div className="flex items-center justify-between">
          <p className="text-[0.8125rem] text-[#4E5A7A]">
            Página {page} de {Math.ceil(total / LIMIT)}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl text-[0.8125rem] font-medium text-[#8A96B8] disabled:opacity-40 transition-colors hover:text-white"
              style={{ background: '#1A2340', border: '1px solid #263050' }}
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page * LIMIT >= total}
              className="px-4 py-2 rounded-xl text-[0.8125rem] font-medium text-[#8A96B8] disabled:opacity-40 transition-colors hover:text-white"
              style={{ background: '#1A2340', border: '1px solid #263050' }}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
