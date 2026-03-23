/**
 * CorridorsPanel.jsx — Gestión de corredores de pago
 *
 * Tabla con inline editing para spread/fixedFee y toggle de isActive.
 * Cada cambio llama PATCH /admin/corridors/:corridorId.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, CheckCircle2, AlertCircle, Loader,
  Pencil, Check, X,
} from 'lucide-react'
import { listCorridors, updateCorridor } from '../../../services/adminService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function EntityBadge({ entity }) {
  const styles = {
    SpA: { bg: '#1D346114', text: '#8AB4F8',  border: '#1D346140', label: 'SpA' },
    LLC: { bg: '#4E5A7A14', text: '#C4CBD8',  border: '#4E5A7A40', label: 'LLC' },
    SRL: { bg: '#22C55E14', text: '#22C55E',  border: '#22C55E40', label: 'SRL' },
  }
  const s = styles[entity] ?? styles.LLC
  return (
    <span
      className="text-[0.625rem] font-semibold px-1.5 py-0.5 rounded-full border"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {s.label}
    </span>
  )
}

// ── Celda editable (número) ───────────────────────────────────────────────────

function EditableNumberCell({ value, corridorId, field, onSaved }) {
  const [editing,  setEditing]  = useState(false)
  const [draft,    setDraft]    = useState(String(value ?? 0))
  const [saving,   setSaving]   = useState(false)
  const [flashOk,  setFlashOk]  = useState(false)
  const [flashErr, setFlashErr] = useState(false)

  const startEdit = () => {
    setDraft(String(value ?? 0))
    setEditing(true)
  }

  const cancel = () => setEditing(false)

  const save = async () => {
    const parsed = parseFloat(draft)
    if (isNaN(parsed) || parsed < 0) { setFlashErr(true); setTimeout(() => setFlashErr(false), 1500); return }
    setSaving(true)
    try {
      await updateCorridor(corridorId, { [field]: parsed })
      setFlashOk(true)
      setTimeout(() => setFlashOk(false), 1500)
      onSaved?.()
    } catch {
      setFlashErr(true)
      setTimeout(() => setFlashErr(false), 1500)
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter')  save()
    if (e.key === 'Escape') cancel()
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          type="number"
          step="0.01"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          className="w-20 rounded-lg px-2 py-1 text-[0.8125rem] text-white border border-[#C4CBD8] bg-[#0F1628] focus:outline-none"
        />
        <button onClick={save} disabled={saving} className="text-[#22C55E] hover:opacity-80 transition-opacity">
          {saving ? <Loader size={12} className="animate-spin" /> : <Check size={12} />}
        </button>
        <button onClick={cancel} className="text-[#4E5A7A] hover:text-[#F87171] transition-colors">
          <X size={12} />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={startEdit}
      className={`flex items-center gap-1.5 group rounded-lg px-2 py-1 transition-colors hover:bg-[#1F2B4D] ${
        flashOk ? 'text-[#22C55E]' : flashErr ? 'text-[#F87171]' : 'text-white'
      }`}
      title={`Editar ${field}`}
    >
      <span className="text-[0.8125rem] font-semibold tabular-nums">
        {flashOk ? <CheckCircle2 size={14} /> : (value ?? 0)}
      </span>
      <Pencil size={10} className="text-[#4E5A7A] opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}

// ── Toggle isActive ───────────────────────────────────────────────────────────

function ActiveToggle({ value, corridorId, onSaved }) {
  const [active,  setActive]  = useState(value)
  const [saving,  setSaving]  = useState(false)

  const toggle = async () => {
    const next = !active
    setSaving(true)
    try {
      await updateCorridor(corridorId, { isActive: next })
      setActive(next)
      onSaved?.()
    } catch {
      // revertir en error silencioso
    } finally {
      setSaving(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={saving}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 disabled:opacity-40 ${
        active ? 'bg-[#22C55E]' : 'bg-[#263050]'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${
          active ? 'translate-x-4' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// ── CorridorsPanel ─────────────────────────────────────────────────────────────

export default function CorridorsPanel() {
  const [corridors, setCorridors] = useState([])
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listCorridors()
      setCorridors(data.corridors ?? [])
    } catch (err) {
      setError(err.message || 'Error al cargar los corredores.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const TH = ({ children }) => (
    <th className="text-left text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider px-4 py-3 whitespace-nowrap">
      {children}
    </th>
  )

  return (
    <div>
      {/* Sub-header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[0.8125rem] text-[#4E5A7A]">
            {corridors.length} corredor{corridors.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="w-8 h-8 rounded-full bg-[#1A2340] border border-[#263050] flex items-center justify-center transition-colors hover:border-[#C4CBD833] disabled:opacity-40"
        >
          <RefreshCw size={13} className={`text-[#8A96B8] ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-[#EF44441A] rounded-2xl border border-[#EF444433] mb-4">
          <AlertCircle size={16} className="text-[#F87171] flex-shrink-0" />
          <p className="text-[0.875rem] text-[#F87171]">{error}</p>
        </div>
      )}

      {loading && !corridors.length && (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-14 rounded-xl bg-[#1A2340] animate-pulse" />)}
        </div>
      )}

      {!loading && !error && !corridors.length && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-[0.875rem] text-[#4E5A7A]">Sin corredores configurados.</p>
        </div>
      )}

      {corridors.length > 0 && (
        <div className="overflow-x-auto -mx-4">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-[#263050]">
                <TH>Corredor</TH>
                <TH>Ruta</TH>
                <TH>Entidad</TH>
                <TH>Pay-in → Pay-out</TH>
                <TH>Spread %</TH>
                <TH>Fee fijo</TH>
                <TH>Activo</TH>
                <TH>Modificado</TH>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A234080]">
              {corridors.map((c) => (
                <tr key={c._id} className="hover:bg-[#1F2B4D20] transition-colors">

                  {/* Corredor ID */}
                  <td className="px-4 py-3.5">
                    <p className="text-[0.75rem] font-mono text-[#C4CBD8]">{c.corridorId}</p>
                  </td>

                  {/* Ruta */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[0.8125rem] font-semibold text-white">{c.originCurrency}</span>
                      <span className="text-[0.6875rem] text-[#4E5A7A]">{c.originCountry}</span>
                      <span className="text-[#4E5A7A]">→</span>
                      <span className="text-[0.8125rem] font-semibold text-white">{c.destinationCurrency}</span>
                      <span className="text-[0.6875rem] text-[#4E5A7A]">{c.destinationCountry}</span>
                    </div>
                  </td>

                  {/* Entidad */}
                  <td className="px-4 py-3.5">
                    <EntityBadge entity={c.legalEntity} />
                  </td>

                  {/* Métodos */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[0.6875rem] text-[#8A96B8] bg-[#1F2B4D] px-1.5 py-0.5 rounded">{c.payinMethod}</span>
                      <span className="text-[#4E5A7A] text-[0.6875rem]">→</span>
                      <span className="text-[0.6875rem] text-[#8A96B8] bg-[#1F2B4D] px-1.5 py-0.5 rounded">{c.payoutMethod}</span>
                    </div>
                  </td>

                  {/* Spread — editable */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <EditableNumberCell
                        value={c.alytoCSpread}
                        corridorId={c.corridorId}
                        field="alytoCSpread"
                        onSaved={load}
                      />
                      <span className="text-[0.6875rem] text-[#4E5A7A]">%</span>
                    </div>
                  </td>

                  {/* Fee fijo — editable */}
                  <td className="px-4 py-3.5">
                    <EditableNumberCell
                      value={c.fixedFee}
                      corridorId={c.corridorId}
                      field="fixedFee"
                      onSaved={load}
                    />
                  </td>

                  {/* Toggle activo */}
                  <td className="px-4 py-3.5">
                    <ActiveToggle
                      value={c.isActive}
                      corridorId={c.corridorId}
                      onSaved={load}
                    />
                  </td>

                  {/* Última modificación */}
                  <td className="px-4 py-3.5">
                    <p className="text-[0.75rem] text-[#4E5A7A] whitespace-nowrap">
                      {c.updatedAt
                        ? new Date(c.updatedAt).toLocaleString('es-CL', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                          })
                        : '—'
                      }
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
