/**
 * ReclamosAdminPage.jsx — Panel Admin de Reclamos PRILI
 *
 * Fase 27 — ASFI exige gestión y respuesta dentro de 10 días hábiles.
 *
 * Secciones:
 *  1. Banner de urgencia (vencimientos <= 3 días)
 *  2. Filtros + lista de reclamos
 *  3. Drawer lateral de detalle + formulario de respuesta
 */

import { useState, useEffect, useCallback } from 'react'
import {
  AlertCircle, Clock, CheckCircle2, ChevronRight,
  X, FileText, User as UserIcon, Image,
} from 'lucide-react'
import { request } from '../../../services/api'

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
  recibido:      { label: 'Recibido',       color: '#3B82F6', bg: '#3B82F61A' },
  en_revision:   { label: 'En revisión',    color: '#EAB308', bg: '#EAB3081A' },
  resuelto:      { label: 'Resuelto',       color: '#22C55E', bg: '#22C55E1A' },
  escalado_asfi: { label: 'Escalado ASFI',  color: '#F97316', bg: '#F973161A' },
  cerrado:       { label: 'Cerrado',        color: '#8A96B8', bg: '#8A96B81A' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#8A96B8', bg: '#8A96B81A' }
  return (
    <span className="text-[0.6875rem] font-semibold px-2 py-0.5 rounded-full"
      style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  )
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-BO', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/La_Paz',
  })
}

function DiasRestantesBadge({ dias, status }) {
  const cerrado = ['resuelto', 'cerrado', 'escalado_asfi'].includes(status)
  if (cerrado) return null
  if (dias === null) return null
  const color = dias <= 2 ? '#EF4444' : dias <= 5 ? '#EAB308' : '#8A96B8'
  return (
    <span className="text-[0.6875rem] font-semibold" style={{ color }}>
      {dias <= 0 ? '⚠️ Vencido' : `${dias}d restantes`}
    </span>
  )
}

// ─── Drawer de Detalle ────────────────────────────────────────────────────────

function DetalleDrawer({ reclamoId, onClose, onUpdate }) {
  const [reclamo, setReclamo]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState({ status: '', respuesta: '', internalNote: '' })
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await request('GET', `/admin/reclamos/${reclamoId}`)
        setReclamo(data)
        setForm(prev => ({ ...prev, status: data.status }))
      } catch {
        // silencioso
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [reclamoId])

  async function handleSave(e) {
    e.preventDefault()
    setSaveError(null)
    if (!form.status) return setSaveError('Selecciona un status.')
    const needsRespuesta = ['resuelto', 'escalado_asfi'].includes(form.status)
    if (needsRespuesta && !form.respuesta.trim()) {
      return setSaveError('La respuesta es obligatoria para este status.')
    }
    setSaving(true)
    try {
      await request('PATCH', `/admin/reclamos/${reclamoId}`, { body: form })
      onUpdate()
      onClose()
    } catch (err) {
      setSaveError(err.message ?? 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  const u = reclamo?.userId

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-[#0F162866]" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-xl bg-[#0F1628] border-l border-[#1A2340] overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#1A2340] flex-shrink-0">
          <h2 className="text-[1rem] font-bold text-white">Detalle del reclamo</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#8A96B8] hover:text-white hover:bg-[#1A2340] transition-colors">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#C4CBD8] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reclamo ? (
          <div className="flex-1 px-6 py-5 space-y-5">

            {/* Meta */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[0.6875rem] font-mono text-[#4E5A7A] mb-1">{reclamo.reclamoId}</p>
                <p className="text-[1rem] font-bold text-white">
                  {TIPO_LABELS[reclamo.tipo] ?? reclamo.tipo}
                </p>
              </div>
              <StatusBadge status={reclamo.status} />
            </div>

            {/* Usuario */}
            <div className="bg-[#1A2340] rounded-2xl p-4 border border-[#263050]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#263050] flex items-center justify-center flex-shrink-0">
                  <UserIcon size={16} className="text-[#8A96B8]" />
                </div>
                <div>
                  <p className="text-[0.875rem] font-semibold text-white">
                    {u?.firstName} {u?.lastName}
                  </p>
                  <p className="text-[0.75rem] text-[#4E5A7A]">{u?.email}</p>
                </div>
                <span className="ml-auto text-[0.6875rem] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: '#C4CBD81A', color: '#C4CBD8' }}>
                  {u?.legalEntity}
                </span>
              </div>
            </div>

            {/* Plazo */}
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-[#4E5A7A]" />
              <span className="text-[0.8125rem] text-[#8A96B8]">
                Plazo ASFI: <span className="text-white font-medium">{formatDate(reclamo.plazoVence)}</span>
              </span>
              <DiasRestantesBadge
                dias={reclamo.plazoVence
                  ? Math.ceil((new Date(reclamo.plazoVence).getTime() - Date.now()) / 86400000)
                  : null}
                status={reclamo.status}
              />
            </div>

            {/* Descripción */}
            <div>
              <p className="text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-wide mb-2">Descripción</p>
              <p className="text-[0.875rem] text-white bg-[#1A2340] rounded-xl p-4 border border-[#263050] whitespace-pre-wrap">
                {reclamo.descripcion}
              </p>
            </div>

            {/* Datos opcionales */}
            {(reclamo.montoReclamado || reclamo.transactionId) && (
              <div className="grid grid-cols-2 gap-3">
                {reclamo.montoReclamado && (
                  <div className="bg-[#1A2340] rounded-xl p-3 border border-[#263050]">
                    <p className="text-[0.6875rem] text-[#4E5A7A] mb-1">Monto reclamado</p>
                    <p className="text-[0.9375rem] font-bold text-white">
                      {reclamo.montoReclamado} {reclamo.currency ?? ''}
                    </p>
                  </div>
                )}
                {reclamo.transactionId && (
                  <div className="bg-[#1A2340] rounded-xl p-3 border border-[#263050]">
                    <p className="text-[0.6875rem] text-[#4E5A7A] mb-1">Transacción</p>
                    <p className="text-[0.75rem] font-mono text-[#C4CBD8] truncate">
                      {reclamo.transactionId}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Documentos */}
            {reclamo.documentos?.length > 0 && (
              <div>
                <p className="text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-wide mb-2">
                  Documentos adjuntos ({reclamo.documentos.length})
                </p>
                <div className="space-y-2">
                  {reclamo.documentos.map((doc, i) => (
                    <div key={i} className="flex items-center gap-3 bg-[#1A2340] rounded-xl p-3 border border-[#263050]">
                      {doc.mimetype?.startsWith('image') ? (
                        <Image size={16} className="text-[#8A96B8] flex-shrink-0" />
                      ) : (
                        <FileText size={16} className="text-[#8A96B8] flex-shrink-0" />
                      )}
                      <span className="text-[0.8125rem] text-white flex-1 truncate">{doc.filename}</span>
                      {doc.base64 && (
                        <a
                          href={`data:${doc.mimetype};base64,${doc.base64}`}
                          download={doc.filename}
                          className="text-[0.75rem] text-[#C4CBD8] font-medium hover:underline"
                        >
                          Descargar
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Respuesta existente */}
            {reclamo.respuesta && (
              <div>
                <p className="text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-wide mb-2">Respuesta enviada</p>
                <div className="bg-[#1A2340] rounded-xl p-4 border border-[#22C55E33]">
                  <p className="text-[0.875rem] text-white whitespace-pre-wrap">{reclamo.respuesta}</p>
                  <p className="text-[0.6875rem] text-[#4E5A7A] mt-2">{formatDate(reclamo.respondidoAt)}</p>
                </div>
              </div>
            )}

            {/* Formulario respuesta */}
            {!['cerrado'].includes(reclamo.status) && (
              <form onSubmit={handleSave} className="space-y-4 border-t border-[#1A2340] pt-5">
                <p className="text-[0.875rem] font-bold text-white">Actualizar reclamo</p>

                <div>
                  <label className="block text-[0.75rem] font-medium text-[#8A96B8] mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                    className="w-full bg-[#1A2340] border border-[#263050] rounded-xl px-4 py-3 text-[0.875rem] text-white focus:outline-none focus:border-[#C4CBD8]"
                  >
                    <option value="en_revision">En revisión</option>
                    <option value="resuelto">Resuelto</option>
                    <option value="escalado_asfi">Escalar a ASFI</option>
                    <option value="cerrado">Cerrar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[0.75rem] font-medium text-[#8A96B8] mb-1.5">
                    Respuesta al usuario
                    {['resuelto', 'escalado_asfi'].includes(form.status) && (
                      <span className="text-[#EF4444] ml-1">*</span>
                    )}
                  </label>
                  <textarea
                    rows={4}
                    value={form.respuesta}
                    onChange={e => setForm(p => ({ ...p, respuesta: e.target.value }))}
                    placeholder="Escribe la respuesta que recibirá el usuario..."
                    className="w-full bg-[#1A2340] border border-[#263050] rounded-xl px-4 py-3 text-[0.875rem] text-white placeholder:text-[#4E5A7A] focus:outline-none focus:border-[#C4CBD8] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[0.75rem] font-medium text-[#8A96B8] mb-1.5">
                    Nota interna <span className="text-[#4E5A7A]">(no visible al usuario)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={form.internalNote}
                    onChange={e => setForm(p => ({ ...p, internalNote: e.target.value }))}
                    placeholder="Notas internas de gestión..."
                    className="w-full bg-[#1A2340] border border-[#263050] rounded-xl px-4 py-3 text-[0.875rem] text-white placeholder:text-[#4E5A7A] focus:outline-none focus:border-[#C4CBD8] resize-none"
                  />
                </div>

                {saveError && (
                  <div className="flex items-start gap-2 px-4 py-3 rounded-xl"
                    style={{ background: '#EF44441A', border: '1px solid #EF444433' }}>
                    <AlertCircle size={14} className="text-[#F87171] flex-shrink-0 mt-0.5" />
                    <p className="text-[0.8125rem] text-[#F87171]">{saveError}</p>
                  </div>
                )}

                <button
                  type="submit" disabled={saving}
                  className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-[#0F1628] disabled:opacity-50"
                  style={{ background: '#C4CBD8' }}
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#4E5A7A] text-sm">
            No se pudo cargar el reclamo.
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ReclamosAdminPage() {
  const [reclamos, setReclamos]         = useState([])
  const [vencimientos, setVencimientos] = useState([])
  const [loading, setLoading]           = useState(true)
  const [filters, setFilters]           = useState({ status: '', tipo: '' })
  const [page, setPage]                 = useState(1)
  const [totalPages, setTotalPages]     = useState(1)
  const [selected, setSelected]         = useState(null)

  const fetchVencimientos = useCallback(async () => {
    try {
      const data = await request('GET', '/admin/reclamos/vencimientos')
      setVencimientos(data.vencimientos ?? [])
    } catch { /* silencioso */ }
  }, [])

  const fetchReclamos = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: p, limit: 20 })
      if (filters.status) params.set('status', filters.status)
      if (filters.tipo)   params.set('tipo',   filters.tipo)
      const data = await request('GET', `/admin/reclamos?${params}`)
      setReclamos(data.reclamos ?? [])
      setTotalPages(data.pagination?.totalPages ?? 1)
      setPage(p)
    } catch { /* silencioso */ } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchVencimientos() }, [fetchVencimientos])
  useEffect(() => { fetchReclamos(1)   }, [fetchReclamos])

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Reclamos PRILI</h1>
      <p className="text-[0.8125rem] text-[#8A96B8] mb-6">Punto de Reclamo Primera Instancia · ASFI Bolivia</p>

      {/* Banner urgencia */}
      {vencimientos.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-6 border"
          style={{ background: '#EF44441A', borderColor: '#EF444433' }}>
          <AlertCircle size={18} className="text-[#EF4444] flex-shrink-0" />
          <p className="text-[0.875rem] text-[#F87171] font-semibold">
            ⚠️ {vencimientos.length} reclamo{vencimientos.length > 1 ? 's' : ''} vence{vencimientos.length === 1 ? '' : 'n'} en menos de 3 días
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <select
          value={filters.status}
          onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
          className="bg-[#1A2340] border border-[#263050] rounded-xl px-4 py-2.5 text-[0.875rem] text-white focus:outline-none focus:border-[#C4CBD8]"
        >
          <option value="">Todos los status</option>
          {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
            <option key={val} value={val}>{cfg.label}</option>
          ))}
        </select>
        <select
          value={filters.tipo}
          onChange={e => setFilters(p => ({ ...p, tipo: e.target.value }))}
          className="bg-[#1A2340] border border-[#263050] rounded-xl px-4 py-2.5 text-[0.875rem] text-white focus:outline-none focus:border-[#C4CBD8]"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      {/* Tabla / lista */}
      <div className="bg-[#1A2340] rounded-2xl border border-[#263050] overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-[#C4CBD8] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reclamos.length === 0 ? (
          <div className="p-12 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 size={32} className="text-[#4E5A7A]" />
            <p className="text-white font-semibold">Sin reclamos</p>
            <p className="text-[0.8125rem] text-[#4E5A7A]">No hay reclamos con los filtros seleccionados.</p>
          </div>
        ) : (
          <table className="w-full text-[0.8125rem]">
            <thead>
              <tr className="border-b border-[#263050]">
                {['Usuario', 'Tipo', 'Status', 'Plazo ASFI', 'Restantes', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[0.6875rem] font-semibold text-[#4E5A7A] uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reclamos.map(r => (
                <tr
                  key={r._id}
                  onClick={() => setSelected(r.reclamoId)}
                  className="border-b border-[#263050] last:border-0 hover:bg-[#1F2B4D] cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">
                      {r.userId?.firstName} {r.userId?.lastName}
                    </p>
                    <p className="text-[0.6875rem] text-[#4E5A7A]">{r.userId?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-[#8A96B8]">
                    {TIPO_LABELS[r.tipo] ?? r.tipo}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-[#8A96B8]">{formatDate(r.plazoVence)}</td>
                  <td className="px-4 py-3">
                    <DiasRestantesBadge dias={r.diasRestantes} status={r.status} />
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight size={16} className="text-[#4E5A7A]" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-3 mt-4">
          <button onClick={() => fetchReclamos(page - 1)} disabled={page === 1}
            className="px-4 py-2 rounded-xl text-[0.8125rem] font-medium border border-[#263050] text-[#8A96B8] disabled:opacity-40">
            Anterior
          </button>
          <span className="flex items-center text-[0.8125rem] text-[#4E5A7A]">{page} / {totalPages}</span>
          <button onClick={() => fetchReclamos(page + 1)} disabled={page === totalPages}
            className="px-4 py-2 rounded-xl text-[0.8125rem] font-medium border border-[#263050] text-[#8A96B8] disabled:opacity-40">
            Siguiente
          </button>
        </div>
      )}

      {/* Drawer detalle */}
      {selected && (
        <DetalleDrawer
          reclamoId={selected}
          onClose={() => setSelected(null)}
          onUpdate={() => { fetchReclamos(page); fetchVencimientos() }}
        />
      )}
    </div>
  )
}
