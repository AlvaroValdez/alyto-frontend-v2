/**
 * SanctionsPage.jsx — Panel Admin: Lista de Sanciones AML
 *
 * Fase 28 — ASFI Bolivia. Gestión de lista local OFAC/ONU/UIF/PEPs.
 *
 * Secciones:
 *  1. Tabla de entradas con filtros (fuente, tipo, búsqueda, activas)
 *  2. Modal para agregar nueva entrada
 *  3. Modal para verificación manual (screening ad-hoc)
 */

import { useState, useEffect, useCallback } from 'react'
import {
  ShieldAlert, Search, Plus, Trash2, ScanLine,
  X, CheckCircle2, AlertCircle, RefreshCw,
} from 'lucide-react'
import { request } from '../../../services/api'

// ─── Constantes ───────────────────────────────────────────────────────────────

const LIST_SOURCE_LABELS = {
  OFAC:        'OFAC (EE.UU.)',
  ONU:         'ONU / UNSC',
  UIF_Bolivia: 'UIF Bolivia',
  PEP:         'PEP',
  custom:      'Personalizada',
}

const LIST_SOURCE_COLORS = {
  OFAC:        'bg-red-900/40 text-red-400 border border-red-800/40',
  ONU:         'bg-orange-900/40 text-orange-400 border border-orange-800/40',
  UIF_Bolivia: 'bg-yellow-900/40 text-yellow-400 border border-yellow-800/40',
  PEP:         'bg-purple-900/40 text-purple-400 border border-purple-800/40',
  custom:      'bg-[#C4CBD81A] text-[#C4CBD8] border border-[#C4CBD833]',
}

const TYPE_LABELS = {
  individual: 'Persona',
  entity:     'Entidad',
}

// ─── Modal: Agregar Entrada ────────────────────────────────────────────────────

function AddSanctionModal({ onClose, onAdded }) {
  const [form, setForm]       = useState({
    type: 'individual', firstName: '', lastName: '', fullName: '',
    aliases: '', documentNumbers: '', nationality: '', dateOfBirth: '',
    listSource: 'OFAC', reason: '', notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const body = {
        ...form,
        aliases:         form.aliases.split('\n').map(s => s.trim()).filter(Boolean),
        documentNumbers: form.documentNumbers.split('\n').map(s => s.trim()).filter(Boolean),
      }
      await request('POST', '/admin/sanctions', body)
      onAdded()
      onClose()
    } catch (err) {
      setError(err.message || 'Error al agregar entrada.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F162899] backdrop-blur-sm p-4">
      <div className="bg-[#1A2340] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-[#263050]">
        <div className="flex items-center justify-between p-6 border-b border-[#263050]">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#C4CBD8]" />
            Agregar a lista de sanciones
          </h2>
          <button onClick={onClose} className="text-[#8A96B8] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipo + Fuente */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#8A96B8] mb-1">Tipo</label>
              <select name="type" value={form.type} onChange={handleChange}
                className="w-full bg-[#0F1628] border border-[#263050] rounded-xl text-white px-3 py-2.5 text-sm focus:border-[#C4CBD8] focus:outline-none">
                <option value="individual">Persona</option>
                <option value="entity">Entidad</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#8A96B8] mb-1">Fuente *</label>
              <select name="listSource" value={form.listSource} onChange={handleChange}
                className="w-full bg-[#0F1628] border border-[#263050] rounded-xl text-white px-3 py-2.5 text-sm focus:border-[#C4CBD8] focus:outline-none">
                {Object.entries(LIST_SOURCE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-xs text-[#8A96B8] mb-1">Nombre completo *</label>
            <input name="fullName" value={form.fullName} onChange={handleChange} required
              placeholder="Ej: Juan Carlos Pérez Rodríguez"
              className="w-full bg-[#0F1628] border border-[#263050] rounded-xl text-white px-3 py-2.5 text-sm placeholder-[#4E5A7A] focus:border-[#C4CBD8] focus:outline-none" />
          </div>

          {form.type === 'individual' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#8A96B8] mb-1">Nombre</label>
                <input name="firstName" value={form.firstName} onChange={handleChange}
                  placeholder="Juan Carlos"
                  className="w-full bg-[#0F1628] border border-[#263050] rounded-xl text-white px-3 py-2.5 text-sm placeholder-[#4E5A7A] focus:border-[#C4CBD8] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-[#8A96B8] mb-1">Apellido</label>
                <input name="lastName" value={form.lastName} onChange={handleChange}
                  placeholder="Pérez Rodríguez"
                  className="w-full bg-[#0F1628] border border-[#263050] rounded-xl text-white px-3 py-2.5 text-sm placeholder-[#4E5A7A] focus:border-[#C4CBD8] focus:outline-none" />
              </div>
            </div>
          )}

          {/* Aliases */}
          <div>
            <label className="block text-xs text-[#8A96B8] mb-1">Aliases (uno por línea)</label>
            <textarea name="aliases" value={form.aliases} onChange={handleChange} rows={2}
              placeholder="Alias 1&#10;Alias 2"
              className="w-full bg-[#0F1628] border border-[#263050] rounded-xl text-white px-3 py-2.5 text-sm placeholder-[#4E5A7A] focus:border-[#C4CBD8] focus:outline-none resize-none" />
          </div>

          {/* Documentos */}
          <div>
            <label className="block text-xs text-[#8A96B8] mb-1">Nros. de documento (uno por línea)</label>
            <textarea name="documentNumbers" value={form.documentNumbers} onChange={handleChange} rows={2}
              placeholder="12345678&#10;CC-987654"
              className="w-full bg-[#0F1628] border border-[#263050] rounded-xl text-white px-3 py-2.5 text-sm placeholder-[#4E5A7A] focus:border-[#C4CBD8] focus:outline-none resize-none" />
          </div>

          {/* Nacionalidad + Fecha de nacimiento */}
          {form.type === 'individual' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#8A96B8] mb-1">Nacionalidad</label>
                <input name="nationality" value={form.nationality} onChange={handleChange}
                  placeholder="BO, CL, US..."
                  className="w-full bg-[#0F1628] border border-[#263050] rounded-xl text-white px-3 py-2.5 text-sm placeholder-[#4E5A7A] focus:border-[#C4CBD8] focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-[#8A96B8] mb-1">Fecha de nacimiento</label>
                <input name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange}
                  placeholder="1980-01-01"
                  className="w-full bg-[#0F1628] border border-[#263050] rounded-xl text-white px-3 py-2.5 text-sm placeholder-[#4E5A7A] focus:border-[#C4CBD8] focus:outline-none" />
              </div>
            </div>
          )}

          {/* Motivo */}
          <div>
            <label className="block text-xs text-[#8A96B8] mb-1">Motivo</label>
            <input name="reason" value={form.reason} onChange={handleChange}
              placeholder="Ej: Tráfico de drogas — resolución OFAC 2024-001"
              className="w-full bg-[#0F1628] border border-[#263050] rounded-xl text-white px-3 py-2.5 text-sm placeholder-[#4E5A7A] focus:border-[#C4CBD8] focus:outline-none" />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs text-[#8A96B8] mb-1">Notas internas</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={2}
              placeholder="Notas adicionales para el equipo de compliance..."
              className="w-full bg-[#0F1628] border border-[#263050] rounded-xl text-white px-3 py-2.5 text-sm placeholder-[#4E5A7A] focus:border-[#C4CBD8] focus:outline-none resize-none" />
          </div>

          {error && (
            <p className="text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-[#263050] text-white font-semibold hover:border-[#C4CBD8] hover:text-[#C4CBD8] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-xl bg-[#C4CBD8] text-[#0F1628] font-bold hover:bg-[#A8B0C0] transition-colors disabled:opacity-50">
              {loading ? 'Guardando…' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal: Verificación Manual ───────────────────────────────────────────────

function ScreenModal({ onClose }) {
  const [form, setForm]       = useState({ firstName: '', lastName: '', documentNumber: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState(null)

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await request('POST', '/admin/sanctions/screen', form)
      setResult(data)
    } catch (err) {
      setError(err.message || 'Error en el screening.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F162899] backdrop-blur-sm p-4">
      <div className="bg-[#1A2340] rounded-2xl w-full max-w-md border border-[#263050]">
        <div className="flex items-center justify-between p-6 border-b border-[#263050]">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-[#C4CBD8]" />
            Verificación manual
          </h2>
          <button onClick={onClose} className="text-[#8A96B8] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-[#8A96B8] mb-1">Nombre</label>
            <input name="firstName" value={form.firstName} onChange={handleChange}
              placeholder="Nombre"
              className="w-full bg-[#0F1628] border border-[#263050] rounded-xl text-white px-3 py-2.5 text-sm placeholder-[#4E5A7A] focus:border-[#C4CBD8] focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-[#8A96B8] mb-1">Apellido</label>
            <input name="lastName" value={form.lastName} onChange={handleChange}
              placeholder="Apellido"
              className="w-full bg-[#0F1628] border border-[#263050] rounded-xl text-white px-3 py-2.5 text-sm placeholder-[#4E5A7A] focus:border-[#C4CBD8] focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-[#8A96B8] mb-1">Número de documento</label>
            <input name="documentNumber" value={form.documentNumber} onChange={handleChange}
              placeholder="CI / Pasaporte / RUT"
              className="w-full bg-[#0F1628] border border-[#263050] rounded-xl text-white px-3 py-2.5 text-sm placeholder-[#4E5A7A] focus:border-[#C4CBD8] focus:outline-none" />
          </div>

          {error && (
            <p className="text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </p>
          )}

          {result && (
            <div className={`rounded-xl p-4 ${result.isClean ? 'bg-green-900/30 border border-green-800/40' : 'bg-red-900/30 border border-red-800/40'}`}>
              <div className="flex items-center gap-2 mb-2">
                {result.isClean
                  ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                  : <AlertCircle className="w-5 h-5 text-red-400" />
                }
                <span className={`font-bold ${result.isClean ? 'text-green-400' : 'text-red-400'}`}>
                  {result.isClean ? 'SIN COINCIDENCIAS' : `${result.hits.length} COINCIDENCIA(S) ENCONTRADA(S)`}
                </span>
              </div>
              {!result.isClean && result.hits.map((hit, i) => (
                <div key={i} className="mt-2 pl-4 border-l-2 border-red-700">
                  <p className="text-white text-sm font-semibold">{hit.fullName}</p>
                  <p className="text-[#8A96B8] text-xs">{LIST_SOURCE_LABELS[hit.listSource] ?? hit.listSource} — {hit.reason ?? 'Sin motivo'}</p>
                  <p className="text-[#4E5A7A] text-xs">ID: {hit.entryId}</p>
                </div>
              ))}
              <p className="text-[#4E5A7A] text-xs mt-2">
                Verificado: {new Date(result.screenedAt).toLocaleString('es-BO')}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-[#263050] text-white font-semibold hover:border-[#C4CBD8] hover:text-[#C4CBD8] transition-colors">
              Cerrar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-xl bg-[#C4CBD8] text-[#0F1628] font-bold hover:bg-[#A8B0C0] transition-colors disabled:opacity-50">
              {loading ? 'Verificando…' : 'Verificar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function SanctionsPage() {
  const [entries, setEntries]       = useState([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [loading, setLoading]       = useState(false)
  const [showAdd, setShowAdd]       = useState(false)
  const [showScreen, setShowScreen] = useState(false)

  // Filtros
  const [search, setSearch]         = useState('')
  const [listSource, setListSource] = useState('')
  const [type, setType]             = useState('')
  const [activeFilter, setActive]   = useState('true')

  const LIMIT = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: LIMIT })
      if (search)      params.set('search',     search)
      if (listSource)  params.set('listSource', listSource)
      if (type)        params.set('type',       type)
      if (activeFilter !== '') params.set('active', activeFilter)

      const data = await request('GET', `/admin/sanctions?${params}`)
      setEntries(data.entries ?? [])
      setTotal(data.pagination?.total ?? 0)
    } catch (err) {
      console.error('[SanctionsPage] Error cargando lista:', err.message)
    } finally {
      setLoading(false)
    }
  }, [page, search, listSource, type, activeFilter])

  useEffect(() => { load() }, [load])

  async function handleRemove(entryId, fullName) {
    if (!window.confirm(`¿Desactivar la entrada "${fullName}"? La operación es reversible desde la base de datos.`)) return
    try {
      await request('DELETE', `/admin/sanctions/${entryId}`)
      load()
    } catch (err) {
      alert(err.message || 'Error al desactivar.')
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="min-h-screen bg-[#0F1628] text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-[#C4CBD8]" />
              Sanciones AML
            </h1>
            <p className="text-[#8A96B8] text-sm mt-1">
              Lista local OFAC / ONU / UIF Bolivia / PEPs — {total} entrada{total !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowScreen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#263050] text-[#C4CBD8] font-semibold hover:border-[#C4CBD8] transition-colors text-sm">
              <ScanLine className="w-4 h-4" />
              Verificar
            </button>
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#C4CBD8] text-[#0F1628] font-bold hover:bg-[#A8B0C0] transition-colors text-sm">
              <Plus className="w-4 h-4" />
              Agregar
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-[#1A2340] rounded-2xl p-4 mb-6 border border-[#263050] flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4E5A7A]" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar por nombre, alias…"
              className="w-full bg-[#0F1628] border border-[#263050] rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-[#4E5A7A] focus:border-[#C4CBD8] focus:outline-none" />
          </div>
          <select value={listSource} onChange={e => { setListSource(e.target.value); setPage(1) }}
            className="bg-[#0F1628] border border-[#263050] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#C4CBD8] focus:outline-none">
            <option value="">Todas las fuentes</option>
            {Object.entries(LIST_SOURCE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select value={type} onChange={e => { setType(e.target.value); setPage(1) }}
            className="bg-[#0F1628] border border-[#263050] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#C4CBD8] focus:outline-none">
            <option value="">Todos los tipos</option>
            <option value="individual">Persona</option>
            <option value="entity">Entidad</option>
          </select>
          <select value={activeFilter} onChange={e => { setActive(e.target.value); setPage(1) }}
            className="bg-[#0F1628] border border-[#263050] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#C4CBD8] focus:outline-none">
            <option value="true">Solo activas</option>
            <option value="false">Solo inactivas</option>
            <option value="">Todas</option>
          </select>
          <button onClick={load} className="p-2.5 rounded-xl border border-[#263050] text-[#8A96B8] hover:text-[#C4CBD8] hover:border-[#C4CBD8] transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Tabla */}
        <div className="bg-[#1A2340] rounded-2xl border border-[#263050] overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#C4CBD8] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-16">
              <ShieldAlert className="w-10 h-10 text-[#4E5A7A] mx-auto mb-3" />
              <p className="text-[#8A96B8]">No se encontraron entradas.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#263050] text-[#8A96B8] text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium">Fuente</th>
                  <th className="text-left px-4 py-3 font-medium">Motivo</th>
                  <th className="text-left px-4 py-3 font-medium">Documentos</th>
                  <th className="text-left px-4 py-3 font-medium">Estado</th>
                  <th className="text-left px-4 py-3 font-medium">Agregado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#263050]">
                {entries.map(e => (
                  <tr key={e._id} className="hover:bg-[#1F2B4D] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-semibold text-sm">{e.fullName}</p>
                      {e.aliases?.length > 0 && (
                        <p className="text-[#8A96B8] text-xs mt-0.5">
                          Alias: {e.aliases.slice(0, 2).join(', ')}{e.aliases.length > 2 ? ` +${e.aliases.length - 2}` : ''}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[#8A96B8] text-sm">{TYPE_LABELS[e.type] ?? e.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${LIST_SOURCE_COLORS[e.listSource] ?? LIST_SOURCE_COLORS.custom}`}>
                        {LIST_SOURCE_LABELS[e.listSource] ?? e.listSource}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[180px]">
                      <p className="text-[#8A96B8] text-xs truncate">{e.reason ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[#8A96B8] text-xs">
                        {e.documentNumbers?.length > 0 ? e.documentNumbers.slice(0, 2).join(', ') : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {e.isActive
                        ? <span className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle2 className="w-3.5 h-3.5" />Activa</span>
                        : <span className="flex items-center gap-1 text-[#4E5A7A] text-xs"><X className="w-3.5 h-3.5" />Inactiva</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-[#4E5A7A] text-xs whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleDateString('es-BO')}
                    </td>
                    <td className="px-4 py-3">
                      {e.isActive && (
                        <button onClick={() => handleRemove(e.entryId, e.fullName)}
                          className="p-1.5 rounded-lg text-[#4E5A7A] hover:text-red-400 hover:bg-red-900/20 transition-colors"
                          title="Desactivar entrada">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 rounded-xl border border-[#263050] text-sm text-[#8A96B8] hover:text-white hover:border-[#C4CBD8] disabled:opacity-40 transition-colors">
              Anterior
            </button>
            <span className="px-4 py-2 text-sm text-[#8A96B8]">
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-4 py-2 rounded-xl border border-[#263050] text-sm text-[#8A96B8] hover:text-white hover:border-[#C4CBD8] disabled:opacity-40 transition-colors">
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* Modales */}
      {showAdd    && <AddSanctionModal onClose={() => setShowAdd(false)}    onAdded={load} />}
      {showScreen && <ScreenModal       onClose={() => setShowScreen(false)} />}
    </div>
  )
}
