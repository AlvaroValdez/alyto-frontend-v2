/**
 * ReclamosPage.jsx — Punto de Reclamo de Primera Instancia (PRILI)
 *
 * Fase 27 — Exigencia ASFI para licencia ETF/PSAV de AV Finance SRL.
 * Accesible para TODOS los usuarios (SpA, SRL, LLC).
 *
 * Secciones:
 *  1. Header + botón "Presentar Reclamo"
 *  2. Modal formulario de reclamo
 *  3. Lista de reclamos del usuario
 */

import { useState, useEffect, useCallback } from 'react'
import { Link }             from 'react-router-dom'
import {
  AlertCircle, ChevronLeft, Plus, Clock, CheckCircle2,
  XCircle, ArrowUpRight, RotateCcw, ChevronDown, ChevronUp,
  Paperclip, FileText,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { request, requestFormData } from '../../services/api'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIPO_LABELS = {
  cobro_indebido:           'Cobro indebido',
  transferencia_no_recibida: 'Transferencia no recibida',
  demora:                   'Demora',
  error_monto:              'Error en monto',
  cuenta_bloqueada:         'Cuenta bloqueada',
  otro:                     'Otro',
}

const STATUS_CONFIG = {
  recibido:       { label: 'Recibido',        color: '#3B82F6', bg: '#3B82F61A' },
  en_revision:    { label: 'En revisión',     color: '#EAB308', bg: '#EAB3081A' },
  resuelto:       { label: 'Resuelto',        color: '#22C55E', bg: '#22C55E1A' },
  escalado_asfi:  { label: 'Escalado ASFI',   color: '#F97316', bg: '#F973161A' },
  cerrado:        { label: 'Cerrado',         color: '#8A96B8', bg: '#8A96B81A' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#8A96B8', bg: '#8A96B81A' }
  return (
    <span
      className="text-[0.6875rem] font-semibold px-2 py-0.5 rounded-full"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  )
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-BO', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/La_Paz',
  })
}

function diasRestantes(plazoVence) {
  if (!plazoVence) return null
  return Math.ceil((new Date(plazoVence).getTime() - Date.now()) / 86400000)
}

// ─── Modal Presentar Reclamo ──────────────────────────────────────────────────

function PresentarReclamoModal({ onClose, onSuccess }) {
  const [form, setForm]     = useState({
    tipo: '', descripcion: '', montoReclamado: '', currency: '', transactionId: '',
  })
  const [files, setFiles]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleFiles(e) {
    const selected = Array.from(e.target.files ?? []).slice(0, 3)
    setFiles(selected)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!form.tipo) return setError('Selecciona el tipo de reclamo.')
    if (!form.descripcion || form.descripcion.trim().length < 20) {
      return setError('La descripción debe tener al menos 20 caracteres.')
    }

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('tipo',        form.tipo)
      fd.append('descripcion', form.descripcion.trim())
      if (form.montoReclamado) fd.append('montoReclamado', form.montoReclamado)
      if (form.currency)       fd.append('currency',       form.currency)
      if (form.transactionId)  fd.append('transactionId',  form.transactionId.trim())
      files.forEach(f => fd.append('documentos', f))

      const data = await requestFormData('/reclamos', fd)
      onSuccess(data)
    } catch (err) {
      setError(err.message ?? 'Error al enviar el reclamo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4"
      style={{ background: '#0F162899' }}
    >
      <div className="w-full max-w-lg bg-[#1A2340] rounded-3xl border border-[#263050] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#263050]">
          <h2 className="text-[1.0625rem] font-bold text-white">Presentar Reclamo</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#8A96B8] hover:text-white hover:bg-[#263050] transition-colors"
          >
            <XCircle size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* Tipo */}
          <div>
            <label className="block text-[0.75rem] font-medium text-[#8A96B8] mb-1.5">
              Tipo de reclamo *
            </label>
            <select
              name="tipo" value={form.tipo} onChange={handleChange}
              className="w-full bg-[#0F1628] border border-[#263050] rounded-xl px-4 py-3 text-[0.875rem] text-white focus:outline-none focus:border-[#C4CBD8] focus:shadow-[0_0_0_2px_#C4CBD820]"
              required
            >
              <option value="">Seleccionar tipo...</option>
              {Object.entries(TIPO_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-[0.75rem] font-medium text-[#8A96B8] mb-1.5">
              Descripción * <span className="text-[#4E5A7A]">(mínimo 20 caracteres)</span>
            </label>
            <textarea
              name="descripcion" value={form.descripcion} onChange={handleChange}
              rows={4} maxLength={1000}
              placeholder="Describe detalladamente el problema..."
              className="w-full bg-[#0F1628] border border-[#263050] rounded-xl px-4 py-3 text-[0.875rem] text-white placeholder:text-[#4E5A7A] focus:outline-none focus:border-[#C4CBD8] focus:shadow-[0_0_0_2px_#C4CBD820] resize-none"
              required
            />
            <p className="text-[0.6875rem] text-[#4E5A7A] mt-1 text-right">{form.descripcion.length}/1000</p>
          </div>

          {/* Monto reclamado (opcional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.75rem] font-medium text-[#8A96B8] mb-1.5">
                Monto reclamado <span className="text-[#4E5A7A]">(opcional)</span>
              </label>
              <input
                type="number" name="montoReclamado" value={form.montoReclamado}
                onChange={handleChange} min="0" step="any"
                placeholder="0.00"
                className="w-full bg-[#0F1628] border border-[#263050] rounded-xl px-4 py-3 text-[0.875rem] text-white placeholder:text-[#4E5A7A] focus:outline-none focus:border-[#C4CBD8]"
              />
            </div>
            <div>
              <label className="block text-[0.75rem] font-medium text-[#8A96B8] mb-1.5">
                Moneda <span className="text-[#4E5A7A]">(opcional)</span>
              </label>
              <input
                type="text" name="currency" value={form.currency}
                onChange={handleChange} placeholder="BOB, CLP, USD..."
                maxLength={5}
                className="w-full bg-[#0F1628] border border-[#263050] rounded-xl px-4 py-3 text-[0.875rem] text-white placeholder:text-[#4E5A7A] focus:outline-none focus:border-[#C4CBD8]"
              />
            </div>
          </div>

          {/* ID Transacción (opcional) */}
          <div>
            <label className="block text-[0.75rem] font-medium text-[#8A96B8] mb-1.5">
              ID de transacción <span className="text-[#4E5A7A]">(opcional)</span>
            </label>
            <input
              type="text" name="transactionId" value={form.transactionId}
              onChange={handleChange} placeholder="ALY-B-... o WTX-..."
              className="w-full bg-[#0F1628] border border-[#263050] rounded-xl px-4 py-3 text-[0.875rem] text-white placeholder:text-[#4E5A7A] focus:outline-none focus:border-[#C4CBD8] font-mono text-[0.8125rem]"
            />
          </div>

          {/* Documentos (opcional) */}
          <div>
            <label className="block text-[0.75rem] font-medium text-[#8A96B8] mb-1.5">
              Documentos adjuntos <span className="text-[#4E5A7A]">(opcional — máx. 3, JPG/PNG/PDF, 5 MB c/u)</span>
            </label>
            <label className="flex items-center gap-3 px-4 py-3 bg-[#0F1628] border border-[#263050] border-dashed rounded-xl cursor-pointer hover:border-[#C4CBD833] transition-colors">
              <Paperclip size={16} className="text-[#8A96B8] flex-shrink-0" />
              <span className="text-[0.8125rem] text-[#8A96B8]">
                {files.length > 0 ? `${files.length} archivo(s) seleccionado(s)` : 'Adjuntar archivos...'}
              </span>
              <input
                type="file" multiple accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFiles} className="hidden"
              />
            </label>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-[0.75rem] text-[#8A96B8]">
                    <FileText size={12} />
                    <span className="truncate">{f.name}</span>
                    <span className="text-[#4E5A7A]">({(f.size / 1024).toFixed(0)} KB)</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl"
              style={{ background: '#EF44441A', border: '1px solid #EF444433' }}>
              <AlertCircle size={15} className="text-[#F87171] flex-shrink-0 mt-0.5" />
              <p className="text-[0.8125rem] text-[#F87171]">{error}</p>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-[#0F1628] transition-all disabled:opacity-50"
            style={{ background: '#C4CBD8', boxShadow: '0 4px 20px rgba(196,203,216,0.3)' }}
          >
            {loading ? 'Enviando...' : 'Enviar reclamo'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Resultado exitoso ────────────────────────────────────────────────────────

function ReclamoExitoso({ data, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: '#0F162899' }}>
      <div className="w-full max-w-sm bg-[#1A2340] rounded-3xl border border-[#263050] p-8 text-center">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: '#22C55E1A' }}>
          <CheckCircle2 size={28} className="text-[#22C55E]" />
        </div>
        <h3 className="text-white font-bold text-lg mb-2">Reclamo recibido</h3>
        <p className="text-[0.8125rem] text-[#8A96B8] mb-5">{data.message}</p>
        <div className="bg-[#0F1628] rounded-2xl px-4 py-3 mb-6 text-left space-y-2">
          <div className="flex justify-between text-[0.8125rem]">
            <span className="text-[#4E5A7A]">N° de reclamo</span>
            <span className="text-[#C4CBD8] font-mono font-semibold">{data.reclamoId}</span>
          </div>
          <div className="flex justify-between text-[0.8125rem]">
            <span className="text-[#4E5A7A]">Plazo ASFI</span>
            <span className="text-white font-medium">{formatDate(data.plazoVence)}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl font-bold text-[0.9375rem] text-[#0F1628]"
          style={{ background: '#C4CBD8' }}
        >
          Entendido
        </button>
      </div>
    </div>
  )
}

// ─── Card de reclamo ──────────────────────────────────────────────────────────

function ReclamoCard({ reclamo }) {
  const [expanded, setExpanded] = useState(false)
  const dias   = diasRestantes(reclamo.plazoVence)
  const cerrado = ['resuelto', 'cerrado', 'escalado_asfi'].includes(reclamo.status)
  const plazoColor = !cerrado && dias !== null && dias <= 3 ? '#EF4444' : '#4E5A7A'

  return (
    <div className="bg-[#1A2340] rounded-2xl border border-[#263050] overflow-hidden">
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-[0.6875rem] font-mono text-[#4E5A7A] mb-1">{reclamo.reclamoId}</p>
            <p className="text-[0.9375rem] font-bold text-white leading-tight">
              {TIPO_LABELS[reclamo.tipo] ?? reclamo.tipo}
            </p>
          </div>
          <StatusBadge status={reclamo.status} />
        </div>
        <p className="text-[0.8125rem] text-[#8A96B8] line-clamp-2 mb-3">
          {reclamo.descripcion}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5" style={{ color: plazoColor }}>
            <Clock size={12} />
            <span className="text-[0.6875rem] font-medium">
              {cerrado
                ? `Cerrado ${formatDate(reclamo.respondidoAt ?? reclamo.cerradoAt)}`
                : dias === null
                  ? `Vence ${formatDate(reclamo.plazoVence)}`
                  : dias <= 0
                    ? '⚠️ Plazo vencido'
                    : `Vence el ${formatDate(reclamo.plazoVence)} (${dias}d)`
              }
            </span>
          </div>
          {reclamo.respuesta && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-[0.75rem] text-[#C4CBD8] font-medium"
            >
              Ver respuesta
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>
      </div>

      {expanded && reclamo.respuesta && (
        <div className="px-4 pb-4">
          <div className="bg-[#0F1628] rounded-xl p-3 border border-[#263050]">
            <p className="text-[0.6875rem] font-semibold text-[#C4CBD8] mb-1.5 uppercase tracking-wide">
              Respuesta de Alyto
            </p>
            <p className="text-[0.8125rem] text-[#8A96B8] whitespace-pre-wrap">{reclamo.respuesta}</p>
            {reclamo.respondidoAt && (
              <p className="text-[0.6875rem] text-[#4E5A7A] mt-2">{formatDate(reclamo.respondidoAt)}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ReclamosPage() {
  const { user }                          = useAuth()
  const [reclamos, setReclamos]           = useState([])
  const [loading, setLoading]             = useState(true)
  const [showModal, setShowModal]         = useState(false)
  const [exitoData, setExitoData]         = useState(null)
  const [page, setPage]                   = useState(1)
  const [totalPages, setTotalPages]       = useState(1)

  const fetchReclamos = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const data = await request('GET', `/reclamos?page=${p}&limit=10`)
      setReclamos(data.reclamos ?? [])
      setTotalPages(data.pagination?.totalPages ?? 1)
      setPage(p)
    } catch {
      // silencioso — lista vacía
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchReclamos(1) }, [fetchReclamos])

  function handleSuccess(data) {
    setShowModal(false)
    setExitoData(data)
    fetchReclamos(1)
  }

  return (
    <div className="min-h-screen bg-[#0F1628] pb-24">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <Link to="/dashboard"
          className="w-9 h-9 rounded-full bg-[#1A2340] flex items-center justify-center border border-[#263050]"
        >
          <ChevronLeft size={18} className="text-[#8A96B8]" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">Mis Reclamos</h1>
          <p className="text-[0.6875rem] text-[#4E5A7A]">Punto de Reclamo Primera Instancia · PRILI</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-[0.8125rem] text-[#0F1628]"
          style={{ background: '#C4CBD8' }}
        >
          <Plus size={15} />
          Presentar
        </button>
      </div>

      {/* Info PRILI */}
      <div className="mx-4 mb-5 px-4 py-3 rounded-2xl border"
        style={{ background: '#3B82F61A', borderColor: '#3B82F633' }}>
        <div className="flex items-start gap-2">
          <AlertCircle size={15} className="text-[#3B82F6] flex-shrink-0 mt-0.5" />
          <p className="text-[0.75rem] text-[#8A96B8] leading-relaxed">
            Regulado por ASFI — Decreto Supremo N° 5384. Tienes derecho a recibir
            respuesta en <span className="text-white font-semibold">10 días hábiles</span>.
            Sin resolución, tu caso puede escalar a la segunda instancia ASFI.
          </p>
        </div>
      </div>

      {/* Lista de reclamos */}
      <div className="px-4 space-y-3">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-[#1A2340] rounded-2xl p-4 border border-[#263050] animate-pulse">
              <div className="h-3 bg-[#263050] rounded w-1/3 mb-3" />
              <div className="h-4 bg-[#1F2B4D] rounded w-2/3 mb-2" />
              <div className="h-3 bg-[#263050] rounded w-full" />
            </div>
          ))
        ) : reclamos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#1A2340] border border-[#263050] flex items-center justify-center mb-4">
              <CheckCircle2 size={24} className="text-[#4E5A7A]" />
            </div>
            <p className="text-white font-semibold mb-1">Sin reclamos</p>
            <p className="text-[0.8125rem] text-[#4E5A7A]">No tienes reclamos registrados.</p>
          </div>
        ) : (
          <>
            {reclamos.map(r => <ReclamoCard key={r._id} reclamo={r} />)}
            {totalPages > 1 && (
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => fetchReclamos(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-xl text-[0.8125rem] font-medium border border-[#263050] text-[#8A96B8] disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="flex items-center text-[0.8125rem] text-[#4E5A7A]">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => fetchReclamos(page + 1)}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-xl text-[0.8125rem] font-medium border border-[#263050] text-[#8A96B8] disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <PresentarReclamoModal
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
      {exitoData && (
        <ReclamoExitoso
          data={exitoData}
          onClose={() => setExitoData(null)}
        />
      )}
    </div>
  )
}
