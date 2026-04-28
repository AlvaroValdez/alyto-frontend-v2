/**
 * CorridorsPanel.jsx — Gestión de corredores de pago
 *
 * Fase 18C: Panel completo con inline editing para todos los campos
 * numéricos, filtros activo/inactivo, modal de creación, modal de
 * analytics por corredor y modal de historial de cambios.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw, CheckCircle2, AlertCircle, Loader,
  Pencil, Check, X, Plus, BarChart2, History, ArrowRight,
} from 'lucide-react'
import {
  listCorridors, updateCorridor, createCorridor, setCorridorRate,
  getCorridorAnalytics, getCorridorChangeLog,
} from '../../../services/adminService'

// ─── Datos de países ──────────────────────────────────────────────────────────

export const COUNTRIES = {
  AR: { name: 'Argentina',         currency: 'ARS', flag: '🇦🇷' },
  AE: { name: 'Emiratos Árabes',   currency: 'AED', flag: '🇦🇪' },
  AU: { name: 'Australia',         currency: 'AUD', flag: '🇦🇺' },
  BO: { name: 'Bolivia',           currency: 'BOB', flag: '🇧🇴' },
  BR: { name: 'Brasil',            currency: 'BRL', flag: '🇧🇷' },
  CA: { name: 'Canadá',            currency: 'CAD', flag: '🇨🇦' },
  CL: { name: 'Chile',             currency: 'CLP', flag: '🇨🇱' },
  CN: { name: 'China',             currency: 'CNY', flag: '🇨🇳' },
  CO: { name: 'Colombia',          currency: 'COP', flag: '🇨🇴' },
  CR: { name: 'Costa Rica',        currency: 'CRC', flag: '🇨🇷' },
  DO: { name: 'Rep. Dominicana',   currency: 'DOP', flag: '🇩🇴' },
  EC: { name: 'Ecuador',           currency: 'USD', flag: '🇪🇨' },
  ES: { name: 'España',            currency: 'EUR', flag: '🇪🇸' },
  EU: { name: 'Europa',            currency: 'EUR', flag: '🇪🇺' },
  GB: { name: 'Reino Unido',       currency: 'GBP', flag: '🇬🇧' },
  GT: { name: 'Guatemala',         currency: 'GTQ', flag: '🇬🇹' },
  HK: { name: 'Hong Kong',         currency: 'HKD', flag: '🇭🇰' },
  HT: { name: 'Haití',             currency: 'HTG', flag: '🇭🇹' },
  MX: { name: 'México',            currency: 'MXN', flag: '🇲🇽' },
  NG: { name: 'Nigeria',           currency: 'NGN', flag: '🇳🇬' },
  PA: { name: 'Panamá',            currency: 'USD', flag: '🇵🇦' },
  PE: { name: 'Perú',              currency: 'PEN', flag: '🇵🇪' },
  PL: { name: 'Polonia',           currency: 'PLN', flag: '🇵🇱' },
  PY: { name: 'Paraguay',          currency: 'PYG', flag: '🇵🇾' },
  SV: { name: 'El Salvador',       currency: 'USD', flag: '🇸🇻' },
  US: { name: 'Estados Unidos',    currency: 'USD', flag: '🇺🇸' },
  UY: { name: 'Uruguay',           currency: 'UYU', flag: '🇺🇾' },
  VE: { name: 'Venezuela',         currency: 'VES', flag: '🇻🇪' },
}

const COUNTRY_ENTRIES = Object.entries(COUNTRIES)
const countryFlag = (code) => COUNTRIES[code]?.flag ?? '🌐'

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onHide }) {
  useEffect(() => {
    const t = setTimeout(onHide, 2500)
    return () => clearTimeout(t)
  }, [onHide])

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#22C55E1A] border border-[#22C55E40] shadow-lg">
        <CheckCircle2 size={15} className="text-[#22C55E] flex-shrink-0" />
        <span className="text-[0.8125rem] font-semibold text-white">{message}</span>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function MethodPill({ value }) {
  return (
    <span className="text-[0.625rem] text-[#8A96B8] bg-[#1F2B4D] px-1.5 py-0.5 rounded font-mono">
      {value ?? '—'}
    </span>
  )
}

function ActionBtn({ icon, title, onClick }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-7 h-7 rounded-lg flex items-center justify-center text-[#4E5A7A] hover:text-[#C4CBD8] hover:bg-[#1F2B4D] transition-all"
    >
      {icon}
    </button>
  )
}

// ─── Celda editable (número) ──────────────────────────────────────────────────

function EditableNumberCell({
  value, corridorId, field, suffix = '', onSaved,
  onSave: customOnSave,
  accent,
  min = 0, max, step = 0.01,
  placeholder,
}) {
  const [editing,  setEditing]  = useState(false)
  const [draft,    setDraft]    = useState(value != null ? String(value) : '')
  const [saving,   setSaving]   = useState(false)
  const [flashOk,  setFlashOk]  = useState(false)
  const [flashErr, setFlashErr] = useState(false)

  const startEdit = () => { setDraft(value != null ? String(value) : ''); setEditing(true) }
  const cancel    = () => setEditing(false)

  const save = async () => {
    const parsed = parseFloat(draft)
    if (isNaN(parsed) || parsed < min || (max != null && parsed > max)) {
      setFlashErr(true); setTimeout(() => setFlashErr(false), 1500); return
    }
    setSaving(true)
    try {
      if (customOnSave) {
        const result = await customOnSave(parsed)
        if (result === false) {
          setFlashErr(true)
          setTimeout(() => setFlashErr(false), 1500)
          return
        }
      } else {
        await updateCorridor(corridorId, { [field]: parsed })
      }
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
          step={step}
          min={min}
          max={max}
          placeholder={placeholder}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          className="w-20 rounded-lg px-2 py-1 text-[0.8125rem] text-white border border-[#C4CBD8] bg-[#0F1628] focus:outline-none"
        />
        <button onClick={save} disabled={saving} className="text-[#22C55E] hover:opacity-80">
          {saving ? <Loader size={12} className="animate-spin" /> : <Check size={12} />}
        </button>
        <button onClick={cancel} className="text-[#4E5A7A] hover:text-[#F87171]">
          <X size={12} />
        </button>
      </div>
    )
  }

  const colorClass = flashOk
    ? 'text-[#22C55E]'
    : flashErr
      ? 'text-[#F87171]'
      : (accent ?? 'text-white')

  return (
    <button
      onClick={startEdit}
      className={`flex items-center gap-1.5 group rounded-lg px-2 py-1 transition-colors hover:bg-[#1F2B4D] ${colorClass}`}
      title={`Editar ${field ?? 'valor'}`}
    >
      <span className="text-[0.8125rem] font-semibold tabular-nums">
        {flashOk
          ? <CheckCircle2 size={14} />
          : (value == null ? '—' : `${value}${suffix}`)
        }
      </span>
      <Pencil size={10} className="text-[#4E5A7A] opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}

// ─── Toggle isActive ──────────────────────────────────────────────────────────

function ActiveToggle({ value, corridorId, onSaved }) {
  const [active, setActive] = useState(value)
  const [saving, setSaving] = useState(false)

  const toggle = async () => {
    const next = !active
    setSaving(true)
    try {
      await updateCorridor(corridorId, { isActive: next })
      setActive(next)
      onSaved?.()
    } catch {
      // revertir silencioso
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
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform duration-200 ${
        active ? 'translate-x-4' : 'translate-x-1'
      }`} />
    </button>
  )
}

// ─── Modal base ───────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative rounded-2xl border border-[#263050] flex flex-col overflow-hidden ${
          wide ? 'w-full max-w-2xl' : 'w-full max-w-lg'
        }`}
        style={{ background: '#111827', maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#263050] flex-shrink-0">
          <h2 className="text-[1rem] font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-[#4E5A7A] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Modal "Nuevo corredor" ───────────────────────────────────────────────────

const EMPTY_FORM = {
  originCountry: 'CL', destinationCountry: 'CO',
  payinMethod: 'fintoc', payoutMethod: 'vita',
  legalEntity: 'SpA',
  alytoCSpread: 2, businessAlytoCSpread: 0.5,
  fixedFee: 300, payinFeePercent: 0.5, profitRetentionPercent: 30,
  isActive: true,
}

function CreateCorridorModal({ onClose, onCreated }) {
  const [form,   setForm]   = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const corridorId          = `${form.originCountry}-${form.destinationCountry}`
  const originCurrency      = COUNTRIES[form.originCountry]?.currency ?? ''
  const destinationCurrency = COUNTRIES[form.destinationCountry]?.currency ?? ''

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createCorridor({
        ...form,
        corridorId,
        originCurrency,
        destinationCurrency,
        alytoCSpread:           Number(form.alytoCSpread),
        businessAlytoCSpread:   Number(form.businessAlytoCSpread),
        fixedFee:               Number(form.fixedFee),
        payinFeePercent:        Number(form.payinFeePercent),
        profitRetentionPercent: Number(form.profitRetentionPercent),
      })
      onCreated()
    } catch (err) {
      setError(err.message || 'Error al crear el corredor')
      setSaving(false)
    }
  }

  const Label    = ({ children }) => (
    <label className="block text-[0.75rem] font-semibold text-[#8A96B8] mb-1.5">{children}</label>
  )
  const NumInput = ({ value, onChange, step = '0.01', min = '0', max }) => (
    <input
      type="number" value={value} step={step} min={min} max={max}
      onChange={onChange}
      className="w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white bg-[#1A2340] border border-[#263050] focus:border-[#C4CBD8] focus:outline-none transition-colors"
    />
  )
  const Sel = ({ value, onChange, children }) => (
    <select
      value={value} onChange={onChange}
      className="w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white bg-[#1A2340] border border-[#263050] focus:border-[#C4CBD8] focus:outline-none transition-colors appearance-none cursor-pointer"
    >
      {children}
    </select>
  )

  return (
    <Modal title="Nuevo corredor" onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

        {/* Preview corridorId */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1A2340] border border-[#263050]">
          <span className="text-[0.75rem] text-[#4E5A7A]">corridorId</span>
          <span className="ml-auto text-[0.875rem] font-mono font-bold text-[#C4CBD8]">
            {corridorId}
          </span>
          <span className="text-[0.75rem] text-[#4E5A7A]">
            {countryFlag(form.originCountry)} {originCurrency}
            {' → '}
            {countryFlag(form.destinationCountry)} {destinationCurrency}
          </span>
        </div>

        {/* País origen / destino */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>País origen</Label>
            <Sel value={form.originCountry} onChange={e => set('originCountry', e.target.value)}>
              {COUNTRY_ENTRIES.map(([code, c]) => (
                <option key={code} value={code}>{c.flag} {c.name} ({c.currency})</option>
              ))}
            </Sel>
          </div>
          <div>
            <Label>País destino</Label>
            <Sel value={form.destinationCountry} onChange={e => set('destinationCountry', e.target.value)}>
              {COUNTRY_ENTRIES.map(([code, c]) => (
                <option key={code} value={code}>{c.flag} {c.name} ({c.currency})</option>
              ))}
            </Sel>
          </div>
        </div>

        {/* Métodos y entidad */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Método payin</Label>
            <Sel value={form.payinMethod} onChange={e => set('payinMethod', e.target.value)}>
              <option value="fintoc">fintoc</option>
              <option value="vita">vita</option>
              <option value="manual">manual</option>
            </Sel>
          </div>
          <div>
            <Label>Método payout</Label>
            <Sel value={form.payoutMethod} onChange={e => set('payoutMethod', e.target.value)}>
              <option value="vita">vita</option>
              <option value="owlPay">owlPay</option>
              <option value="anchor_manual">anchor_manual</option>
              <option value="stellar_direct">stellar_direct</option>
            </Sel>
          </div>
          <div>
            <Label>Entidad</Label>
            <Sel value={form.legalEntity} onChange={e => set('legalEntity', e.target.value)}>
              <option value="SpA">SpA</option>
              <option value="LLC">LLC</option>
              <option value="SRL">SRL</option>
            </Sel>
          </div>
        </div>

        {/* Parámetros financieros */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Spread Alyto (%)</Label>
            <NumInput value={form.alytoCSpread}           step="0.01" onChange={e => set('alytoCSpread', e.target.value)} />
          </div>
          <div>
            <Label>Business spread % (cuenta business)</Label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              placeholder="0.5"
              value={form.businessAlytoCSpread}
              onChange={e => set('businessAlytoCSpread', parseFloat(e.target.value))}
              className="w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white bg-[#1A2340] border border-[#263050] focus:border-[#1D9E75] focus:outline-none transition-colors"
            />
            <p className="mt-1.5 text-[0.6875rem] text-[#4E5A7A]">
              Spread preferencial para cuentas KYB aprobadas. Dejar en 0.5 para nuevos corredores.
            </p>
          </div>
          <div>
            <Label>Fee fijo (moneda origen)</Label>
            <NumInput value={form.fixedFee}               step="1"    onChange={e => set('fixedFee', e.target.value)} />
          </div>
          <div>
            <Label>Fee payin (%)</Label>
            <NumInput value={form.payinFeePercent}        step="0.01" onChange={e => set('payinFeePercent', e.target.value)} />
          </div>
          <div>
            <Label>Profit retention (%)</Label>
            <NumInput value={form.profitRetentionPercent} step="1" max="100" onChange={e => set('profitRetentionPercent', e.target.value)} />
          </div>
        </div>

        {/* Toggle isActive */}
        <div className="flex items-center gap-3">
          <span className="text-[0.75rem] font-semibold text-[#8A96B8]">Activo al crear</span>
          <button
            type="button"
            onClick={() => set('isActive', !form.isActive)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              form.isActive ? 'bg-[#22C55E]' : 'bg-[#263050]'
            }`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              form.isActive ? 'translate-x-4' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
            <AlertCircle size={14} className="text-[#F87171] flex-shrink-0" />
            <p className="text-[0.8125rem] text-[#F87171]">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[#263050] text-[#8A96B8] text-[0.875rem] font-semibold hover:border-[#C4CBD833] hover:text-white transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-[#C4CBD8] text-[#0F1628] text-[0.875rem] font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            {saving && <Loader size={14} className="animate-spin" />}
            Crear corredor
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Modal "Analytics del corredor" ──────────────────────────────────────────

const ANALYTICS_PERIODS = [
  { value: '1d',  label: 'Hoy'    },
  { value: '7d',  label: '7 días' },
  { value: '30d', label: '30 días'},
]

function AnalyticsModal({ corridor, onClose }) {
  const [period,  setPeriod]  = useState('30d')
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getCorridorAnalytics(corridor.corridorId, { period })
      setData(res)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [corridor.corridorId, period])

  useEffect(() => { load() }, [load])

  const fmt = (n) => n != null ? n.toLocaleString('es-CL') : '—'
  const analytics = data?.analytics
  const breakdown = analytics?.breakdown ?? {}

  const title = `${countryFlag(corridor.originCountry)} ${corridor.originCurrency} → ${countryFlag(corridor.destinationCountry)} ${corridor.destinationCurrency} — Rentabilidad`

  return (
    <Modal title={title} onClose={onClose} wide>
      <div className="px-6 py-5 space-y-5">

        {/* Selector período */}
        <div className="flex gap-2">
          {ANALYTICS_PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-1.5 rounded-xl text-[0.8125rem] font-semibold border transition-all ${
                period === p.value
                  ? 'bg-[#C4CBD81A] text-[#C4CBD8] border-[#C4CBD833]'
                  : 'text-[#4E5A7A] border-[#263050] hover:text-[#8A96B8]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader size={24} className="text-[#C4CBD8] animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Transacciones', value: analytics?.count ?? '—',                                      sub: 'completadas'           },
                { label: 'Volumen',       value: analytics?.volume != null ? `$${fmt(analytics.volume)}` : '—', sub: corridor.originCurrency },
                { label: 'Ganancia',      value: analytics?.profit != null ? `$${fmt(analytics.profit)}` : '—', sub: corridor.originCurrency },
              ].map(({ label, value, sub }) => (
                <div key={label} className="bg-[#1A2340] border border-[#263050] rounded-2xl px-4 py-4 text-center">
                  <p className="text-[0.6875rem] text-[#4E5A7A] mb-1">{label}</p>
                  <p className="text-[1.25rem] font-extrabold text-white tabular-nums">{value}</p>
                  <p className="text-[0.625rem] text-[#4E5A7A] mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            {/* Desglose de ganancia */}
            <div className="bg-[#1A2340] border border-[#263050] rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[#263050]">
                <p className="text-[0.8125rem] font-semibold text-white">Desglose de ganancia</p>
              </div>
              <div className="px-5 py-4 space-y-2.5">
                {[
                  { label: `Spread (${corridor.alytoCSpread ?? 0}%)`,                    value: breakdown.spread           },
                  { label: `Fee fijo ($${corridor.fixedFee ?? 0})`,                      value: breakdown.fixedFee         },
                  { label: `Profit retention (${corridor.profitRetentionPercent ?? 0}%)`, value: breakdown.profitRetention  },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-[0.8125rem] text-[#8A96B8]">{label}</span>
                    <span className="text-[0.8125rem] font-semibold text-white tabular-nums">
                      {value != null ? `$${fmt(value)}` : '—'}
                    </span>
                  </div>
                ))}
                <div className="border-t border-[#263050] pt-2.5 flex items-center justify-between">
                  <span className="text-[0.875rem] font-bold text-white">Total</span>
                  <span className="text-[0.875rem] font-extrabold text-[#C4CBD8] tabular-nums">
                    {analytics?.profit != null ? `$${fmt(analytics.profit)}` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {!analytics && (
              <p className="text-center text-[0.8125rem] text-[#4E5A7A] py-2">
                Sin datos para este período.
              </p>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

// ─── Modal "Historial de cambios" ─────────────────────────────────────────────

function ChangelogModal({ corridor, onClose }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getCorridorChangeLog(corridor.corridorId)
      .then(res => { if (!cancelled) setEntries(res.changelog ?? []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [corridor.corridorId])

  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days  = Math.floor(diff / 86400000)
    const hours = Math.floor(diff / 3600000)
    const mins  = Math.floor(diff / 60000)
    if (days  > 0) return `hace ${days} día${days !== 1 ? 's' : ''}`
    if (hours > 0) return `hace ${hours} hora${hours !== 1 ? 's' : ''}`
    if (mins  > 0) return `hace ${mins} min`
    return 'hace un momento'
  }

  return (
    <Modal title={`Historial — ${corridor.corridorId}`} onClose={onClose}>
      <div className="px-6 py-5">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader size={20} className="text-[#C4CBD8] animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[0.875rem] text-[#4E5A7A]">Sin cambios registrados.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-[#4E5A7A] mt-[7px] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[0.8125rem] text-white">
                    <span className="font-mono text-[#8AB4F8]">{entry.field}</span>
                    {': '}
                    <span className="text-[#F87171]">{String(entry.oldValue)}</span>
                    {' → '}
                    <span className="text-[#22C55E]">{String(entry.newValue)}</span>
                  </p>
                  <p className="text-[0.6875rem] text-[#4E5A7A] mt-0.5">
                    {entry.adminEmail ?? 'admin'} · {timeAgo(entry.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── CorridorsPanel ───────────────────────────────────────────────────────────

export default function CorridorsPanel() {
  const [corridors,    setCorridors]    = useState([])
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)
  const [filter,       setFilter]       = useState('all')   // 'all' | 'active' | 'inactive'
  const [toast,        setToast]        = useState(null)
  const [modalCreate,  setModalCreate]  = useState(false)
  const [analyticsFor, setAnalyticsFor] = useState(null)    // corridor | null
  const [changelogFor, setChangelogFor] = useState(null)    // corridor | null

  const showToast = useCallback((msg) => setToast(msg), [])

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

  const onSaved   = useCallback(() => { showToast('Corredor actualizado'); load() }, [load, showToast])
  const onCreated = useCallback(() => { setModalCreate(false); showToast('Corredor creado'); load() }, [load, showToast])

  const filtered = corridors.filter(c => {
    if (filter === 'active')   return  c.isActive
    if (filter === 'inactive') return !c.isActive
    return true
  })

  const TH = ({ children }) => (
    <th className="text-left text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider px-3 py-3 whitespace-nowrap">
      {children}
    </th>
  )

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[1.125rem] font-bold text-white">Gestión de corredores</h1>
          <p className="text-[0.8125rem] text-[#4E5A7A] mt-0.5">
            {corridors.length} corredor{corridors.length !== 1 ? 'es' : ''} configurados
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="w-8 h-8 rounded-full bg-[#1A2340] border border-[#263050] flex items-center justify-center hover:border-[#C4CBD833] disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={13} className={`text-[#8A96B8] ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setModalCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C4CBD8] text-[#0F1628] text-[0.8125rem] font-bold shadow-[0_4px_20px_rgba(196,203,216,0.25)] hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <Plus size={14} />
            Nuevo corredor
          </button>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'all',      label: 'Todos'     },
          { key: 'active',   label: 'Activos'   },
          { key: 'inactive', label: 'Inactivos' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-xl text-[0.8125rem] font-semibold border transition-all ${
              filter === f.key
                ? 'bg-[#C4CBD81A] text-[#C4CBD8] border-[#C4CBD833]'
                : 'text-[#4E5A7A] border-[#263050] hover:text-[#8A96B8]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-[#EF44441A] rounded-2xl border border-[#EF444433] mb-4">
          <AlertCircle size={16} className="text-[#F87171] flex-shrink-0" />
          <p className="text-[0.875rem] text-[#F87171]">{error}</p>
        </div>
      )}

      {/* ── Skeleton ── */}
      {loading && !corridors.length && (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-14 rounded-xl bg-[#1A2340] animate-pulse" />)}
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && !error && !filtered.length && (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-[0.875rem] text-[#4E5A7A]">
            {filter === 'all'
              ? 'Sin corredores configurados.'
              : `Sin corredores ${filter === 'active' ? 'activos' : 'inactivos'}.`}
          </p>
        </div>
      )}

      {/* ── Tabla ── */}
      {filtered.length > 0 && (
        <div className="overflow-x-auto -mx-4">
          <table className="w-full min-w-[1400px]">
            <thead>
              <tr className="border-b border-[#263050]">
                <TH>Corredor</TH>
                <TH>Spread %</TH>
                <TH>B. Spread %</TH>
                <TH>Tasa BOB/USDC</TH>
                <TH>Fee fijo</TH>
                <TH>Fee payin %</TH>
                <TH>Retention %</TH>
                <TH>Payin / Payout</TH>
                <TH>Entidad</TH>
                <TH>Estado</TH>
                <TH>Últ. modificación</TH>
                <TH>Acciones</TH>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A234080]">
              {filtered.map((c) => (
                <tr key={c._id} className="hover:bg-[#1F2B4D20] transition-colors group">

                  {/* Corredor */}
                  <td className="px-3 py-3.5">
                    <p className="text-[0.75rem] font-mono text-[#C4CBD8]">{c.corridorId}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[0.75rem]">{countryFlag(c.originCountry)}</span>
                      <span className="text-[0.6875rem] text-white font-semibold">{c.originCurrency}</span>
                      <ArrowRight size={9} className="text-[#4E5A7A]" />
                      <span className="text-[0.75rem]">{countryFlag(c.destinationCountry)}</span>
                      <span className="text-[0.6875rem] text-white font-semibold">{c.destinationCurrency}</span>
                    </div>
                  </td>

                  {/* Spread % */}
                  <td className="px-3 py-3.5">
                    <EditableNumberCell value={c.alytoCSpread}           corridorId={c.corridorId} field="alytoCSpread"           suffix="%" onSaved={onSaved} />
                  </td>

                  {/* B. Spread % (cuenta business) */}
                  <td className="px-3 py-3.5">
                    <EditableNumberCell
                      value={c.businessAlytoCSpread}
                      corridorId={c.corridorId}
                      field="businessAlytoCSpread"
                      suffix="%"
                      onSaved={onSaved}
                      accent="text-[#1D9E75]"
                      min={0}
                      max={10}
                      step={0.1}
                      placeholder="0.5"
                    />
                  </td>

                  {/* Tasa manual (solo corredores manual) */}
                  <td className="px-3 py-3.5">
                    {c.payinMethod === 'manual' ? (
                      <EditableNumberCell
                        value={c.manualExchangeRate}
                        onSave={async (newRate) => {
                          const note = window.prompt(
                            'Motivo del cambio de tasa (requerido):',
                            'Actualización tasa Binance P2P',
                          )
                          if (!note || note.length < 10) {
                            window.alert('El motivo debe tener al menos 10 caracteres.')
                            return false
                          }
                          await setCorridorRate(c.corridorId, {
                            manualExchangeRate: newRate,
                            note,
                          })
                          return true
                        }}
                        onSaved={onSaved}
                        min={0}
                        step={0.0001}
                        placeholder="9.31"
                      />
                    ) : (
                      <span className="text-[0.8125rem] text-[#4E5A7A]">—</span>
                    )}
                  </td>

                  {/* Fee fijo */}
                  <td className="px-3 py-3.5">
                    <EditableNumberCell value={c.fixedFee}               corridorId={c.corridorId} field="fixedFee"               onSaved={onSaved} />
                  </td>

                  {/* Fee payin % */}
                  <td className="px-3 py-3.5">
                    <EditableNumberCell value={c.payinFeePercent}        corridorId={c.corridorId} field="payinFeePercent"        suffix="%" onSaved={onSaved} />
                  </td>

                  {/* Profit retention % */}
                  <td className="px-3 py-3.5">
                    <EditableNumberCell value={c.profitRetentionPercent} corridorId={c.corridorId} field="profitRetentionPercent" suffix="%" onSaved={onSaved} />
                  </td>

                  {/* Métodos */}
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-1">
                      <MethodPill value={c.payinMethod} />
                      <span className="text-[#4E5A7A] text-[0.625rem]">→</span>
                      <MethodPill value={c.payoutMethod} />
                    </div>
                  </td>

                  {/* Entidad */}
                  <td className="px-3 py-3.5">
                    <EntityBadge entity={c.legalEntity} />
                  </td>

                  {/* Estado */}
                  <td className="px-3 py-3.5">
                    <ActiveToggle value={c.isActive} corridorId={c.corridorId} onSaved={onSaved} />
                  </td>

                  {/* Últ. modificación */}
                  <td className="px-3 py-3.5">
                    <p className="text-[0.6875rem] text-[#4E5A7A] whitespace-nowrap">
                      {c.updatedAt
                        ? new Date(c.updatedAt).toLocaleString('es-CL', {
                            day: '2-digit', month: 'short',
                            hour: '2-digit', minute: '2-digit',
                          })
                        : '—'
                      }
                    </p>
                  </td>

                  {/* Acciones */}
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ActionBtn icon={<BarChart2 size={13} />} title="Analytics" onClick={() => setAnalyticsFor(c)} />
                      <ActionBtn icon={<History    size={13} />} title="Historial" onClick={() => setChangelogFor(c)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modales ── */}
      {modalCreate  && <CreateCorridorModal onClose={() => setModalCreate(false)} onCreated={onCreated} />}
      {analyticsFor && <AnalyticsModal corridor={analyticsFor} onClose={() => setAnalyticsFor(null)} />}
      {changelogFor && <ChangelogModal corridor={changelogFor} onClose={() => setChangelogFor(null)} />}

      {/* ── Toast ── */}
      {toast && <Toast message={toast} onHide={() => setToast(null)} />}
    </div>
  )
}
