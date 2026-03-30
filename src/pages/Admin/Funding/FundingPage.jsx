/**
 * FundingPage.jsx — Gestión de Fondeo Manual
 *
 * Sección 0: Panel de tasas de cambio activas (BOB/USDT, CLP/USD, etc.)
 * Sección 1: Cards de balance USDC disponible por entidad (SRL/SpA/LLC)
 * Sección 2: Botón "Registrar fondeo +" → modal con formulario completo
 * Sección 3: Historial de fondeos con filtros
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, RefreshCw, X, AlertTriangle, CheckCircle2,
  Loader, Filter, TrendingUp, Wallet, Calendar,
  Edit2, BarChart3, ArrowRight,
} from 'lucide-react'
import {
  getFundingBalances,
  registerFunding,
  listFundings,
  getExchangeRates,
  updateExchangeRate,
  getCLPBOBRate,
  updateCLPBOBRate,
} from '../../../services/adminService'

// ── Constantes ────────────────────────────────────────────────────────────────

const ENTITIES = ['SRL', 'SpA', 'LLC']

const ENTITY_META = {
  SRL: { label: 'AV Finance SRL', flag: '🇧🇴', currency: 'BOB', color: '#22C55E' },
  SpA: { label: 'AV Finance SpA', flag: '🇨🇱', currency: 'CLP', color: '#C4CBD8' },
  LLC: { label: 'AV Finance LLC', flag: '🌐',  currency: 'USD', color: '#8AB4F8' },
}

const FUNDING_TYPES = ['Binance P2P', 'Transferencia bancaria', 'Stellar', 'Otro']
const FUNDING_TYPE_TO_DB = {
  'Binance P2P':           'binance_p2p',
  'Transferencia bancaria': 'bank_transfer',
  'Stellar':                'internal',
  'Otro':                   'other',
}
const ASSETS        = ['USDC', 'USDT', 'USD']
const CURRENCIES    = ['BOB', 'CLP', 'USD']
const RATE_SOURCES  = [
  { value: 'binance_p2p', label: 'Binance P2P' },
  { value: 'manual',      label: 'Manual' },
]

// Pares de tasas que el sistema gestiona
const RATE_PAIRS = [
  { pair: 'BOB/USDT', label: 'Bolivia · Binance P2P',  flag: '🇧🇴' },
  { pair: 'CLP/USD',  label: 'Chile · cambio oficial',  flag: '🇨🇱' },
  { pair: 'BOB/USDC', label: 'Bolivia · corredor USDC', flag: '🇧🇴' },
  { pair: 'CLP/USDT', label: 'CL→BO · CLP por USDT',   flag: '🇨🇱', clpBob: true },
  { pair: 'USDT/BOB', label: 'CL→BO · BOB por USDT',   flag: '🇧🇴', clpBob: true },
  { pair: 'CLP/BOB',  label: 'CL→BO · tasa efectiva',   flag: '🔄', clpBob: true, auto: true },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAmount(n) {
  if (n == null) return '—'
  return Number(n).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function timeAgo(iso) {
  if (!iso) return null
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return 'justo ahora'
  if (mins  < 60) return `hace ${mins} min`
  if (hours < 24) return `hace ${hours}h`
  return days === 1 ? 'hace 1 día' : `hace ${days} días`
}

function isStaleRate(iso, maxHours = 24) {
  if (!iso) return true
  return (Date.now() - new Date(iso).getTime()) > maxHours * 3_600_000
}

function statusForBalance(balance) {
  if (balance < 100)  return { color: '#EF4444', bg: '#EF44441A', border: '#EF444440', badge: '⚠️ Fondear'    }
  if (balance < 300)  return { color: '#FBBF24', bg: '#F59E0B0F', border: '#FBBF2440', badge: '⚠️ Saldo bajo' }
  return               { color: '#22C55E', bg: '#22C55E0A', border: '#22C55E40', badge: '✅ OK'           }
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, onHide }) {
  useEffect(() => {
    const t = setTimeout(onHide, 4000)
    return () => clearTimeout(t)
  }, [onHide])

  return (
    <div
      className="fixed bottom-6 right-6 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-2xl"
      style={{ background: '#1A2340', border: '1px solid #22C55E40', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
    >
      <CheckCircle2 size={18} className="text-[#22C55E] flex-shrink-0" />
      <p className="text-[0.875rem] font-semibold text-white">{message}</p>
    </div>
  )
}

// ── RateUpdateModal ───────────────────────────────────────────────────────────

function RateUpdateModal({ rateEntry, onClose, onSaved }) {
  const { pair, rate: prevRate } = rateEntry

  const [newRate, setNewRate] = useState('')
  const [source,  setSource]  = useState('binance_p2p')
  const [note,    setNote]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  const handleSave = async () => {
    const val = parseFloat(newRate)
    if (!val || val <= 0) { setError('Introduce una tasa válida mayor que 0.'); return }
    setSaving(true)
    setError(null)
    try {
      await updateExchangeRate(pair, val, source, note)
      onSaved(`Tasa ${pair} actualizada: ${prevRate ?? '—'} → ${val} ✅`)
    } catch (err) {
      setError(err.message || 'Error al actualizar la tasa.')
      setSaving(false)
    }
  }

  const inputCls  = 'w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white border border-[#263050] bg-[#1A2340] focus:outline-none focus:border-[#C4CBD8] focus:shadow-[0_0_0_2px_#C4CBD820] placeholder-[#4E5A7A] transition-colors'
  const labelCls  = 'block text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-1.5'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: '#0F162899', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#0F1628', border: '1px solid #263050' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid #263050', background: 'linear-gradient(180deg, #1A2340 0%, #0F1628 100%)' }}
        >
          <div>
            <p className="text-[0.75rem] text-[#4E5A7A] uppercase tracking-wider font-semibold">Actualizar tasa</p>
            <h3 className="text-[1.0625rem] font-bold text-white mt-0.5">{pair}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1A2340] border border-[#263050] flex items-center justify-center hover:border-[#C4CBD833] transition-colors"
          >
            <X size={14} className="text-[#8A96B8]" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 flex flex-col gap-4">

          {/* Tasa anterior */}
          {prevRate != null && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#1A2340] border border-[#263050]">
              <span className="text-[0.75rem] text-[#4E5A7A]">Tasa anterior:</span>
              <span className="text-[0.875rem] font-bold text-[#C4CBD8] tabular-nums">{prevRate}</span>
              <ArrowRight size={12} className="text-[#4E5A7A] mx-1" />
              <span className="text-[0.75rem] text-[#4E5A7A]">Nueva →</span>
            </div>
          )}

          {/* Nueva tasa */}
          <div>
            <label className={labelCls}>
              Nueva tasa <span className="text-[#EF4444]">*</span>
              <span className="text-[#4E5A7A] normal-case font-normal ml-1">
                ({pair.split('/')[1]}/{pair.split('/')[0]})
              </span>
            </label>
            <input
              type="number"
              min="0"
              step="0.0001"
              placeholder={String(prevRate ?? '0.00')}
              value={newRate}
              onChange={e => setNewRate(e.target.value)}
              className={inputCls}
              autoFocus
            />
          </div>

          {/* Fuente */}
          <div>
            <label className={labelCls}>Fuente</label>
            <div className="flex gap-3">
              {RATE_SOURCES.map(s => (
                <label key={s.value} className="flex items-center gap-2 cursor-pointer group">
                  <div
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors"
                    style={{
                      borderColor: source === s.value ? '#C4CBD8' : '#263050',
                      background:  source === s.value ? '#C4CBD8' : 'transparent',
                    }}
                    onClick={() => setSource(s.value)}
                  >
                    {source === s.value && <div className="w-1.5 h-1.5 rounded-full bg-[#0F1628]" />}
                  </div>
                  <span
                    className="text-[0.8125rem] transition-colors"
                    style={{ color: source === s.value ? '#FFFFFF' : '#8A96B8' }}
                    onClick={() => setSource(s.value)}
                  >
                    {s.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Nota */}
          <div>
            <label className={labelCls}>Nota <span className="text-[#4E5A7A] normal-case font-normal">(opcional)</span></label>
            <input
              type="text"
              placeholder='Ej: "compra orden #12345"'
              value={note}
              onChange={e => setNote(e.target.value)}
              className={inputCls}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
              <AlertTriangle size={12} className="text-[#F87171] flex-shrink-0" />
              <p className="text-[0.8125rem] text-[#F87171]">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex gap-3 px-5 py-4"
          style={{ borderTop: '1px solid #263050' }}
        >
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[#263050] text-[#8A96B8] text-[0.875rem] font-semibold hover:text-white hover:border-[#C4CBD833] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !newRate}
            className="flex-1 py-2.5 rounded-xl text-[#0F1628] text-[0.875rem] font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            style={{
              background:  saving || !newRate ? '#C4CBD840' : '#C4CBD8',
              boxShadow:   saving || !newRate ? 'none' : '0 4px 20px rgba(196,203,216,0.3)',
            }}
          >
            {saving
              ? <><Loader size={13} className="animate-spin" /> Guardando...</>
              : 'Guardar tasa'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ExchangeRatesPanel (Sección 0) ────────────────────────────────────────────

function ExchangeRatesPanel({ onToast }) {
  const [rates,      setRates]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [editEntry,  setEditEntry]  = useState(null)   // { pair, rate } | null

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getExchangeRates()
      // Normalizar: combinar pares conocidos con datos del backend
      // DB usa "-" (BOB-USDT), frontend usa "/" (BOB/USDT) — normalize to "/"
      const byPair = {}
      ;(data.rates ?? data ?? []).forEach(r => {
        byPair[r.pair] = r
        byPair[r.pair.replace('-', '/')] = r
      })
      setRates(RATE_PAIRS.filter(p => !p.clpBob).map(p => ({ ...p, ...(byPair[p.pair] ?? {}) })))
    } catch {
      setRates(RATE_PAIRS.map(p => ({ ...p })))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSaved = (msg) => {
    setEditEntry(null)
    onToast(msg)
    load()
  }

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: '#1A2340', border: '1px solid #263050' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid #263050' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-[#C4CBD81A] border border-[#C4CBD833] flex items-center justify-center">
              <BarChart3 size={13} className="text-[#C4CBD8]" />
            </div>
            <div>
              <p className="text-[0.9375rem] font-bold text-white">Tasas de cambio activas</p>
              <p className="text-[0.6875rem] text-[#4E5A7A]">Usadas en cotizaciones y fondeos</p>
            </div>
          </div>
          <button
            onClick={load}
            className="w-7 h-7 rounded-xl bg-[#1F2B4D] border border-[#263050] flex items-center justify-center hover:border-[#C4CBD833] text-[#4E5A7A] hover:text-white transition-colors"
            title="Refrescar tasas"
          >
            <RefreshCw size={12} />
          </button>
        </div>

        {/* Lista de tasas */}
        <div className="divide-y divide-[#26305040]">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5">
                <div className="h-4 bg-[#263050] rounded w-24 animate-pulse" />
                <div className="h-4 bg-[#263050] rounded w-16 animate-pulse" />
              </div>
            ))
          ) : (
            rates.map(r => {
              const stale  = isStaleRate(r.updatedAt)
              const ago    = timeAgo(r.updatedAt)

              return (
                <div
                  key={r.pair}
                  className="flex items-center gap-3 px-5 py-3.5"
                >
                  {/* Par */}
                  <span className="text-base leading-none flex-shrink-0">{r.flag}</span>
                  <div className="min-w-[80px]">
                    <p className="text-[0.8125rem] font-bold text-white">{r.pair}</p>
                    <p className="text-[0.625rem] text-[#4E5A7A]">{r.label}</p>
                  </div>

                  {/* Tasa */}
                  <div className="flex-1">
                    {r.rate != null ? (
                      <span className="text-[1.0625rem] font-extrabold tabular-nums text-[#C4CBD8]">
                        {Number(r.rate).toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-[0.875rem] text-[#4E5A7A]">Sin configurar</span>
                    )}
                  </div>

                  {/* Meta: fuente + tiempo */}
                  <div className="flex items-center gap-2 mr-3">
                    {r.source && (
                      <span className="text-[0.6875rem] text-[#8A96B8] hidden sm:block">
                        {r.source}
                      </span>
                    )}
                    {ago && (
                      <span
                        className="text-[0.6875rem] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          background: stale ? '#F59E0B0F' : '#22C55E0A',
                          color:      stale ? '#FBBF24'   : '#22C55E',
                          border:     `1px solid ${stale ? '#FBBF2430' : '#22C55E30'}`,
                        }}
                      >
                        {stale ? `⚠️ ${ago}` : ago}
                      </span>
                    )}
                  </div>

                  {/* Botón editar */}
                  <button
                    onClick={() => setEditEntry(r)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#263050] text-[0.75rem] text-[#8A96B8] hover:text-white hover:border-[#C4CBD833] transition-colors flex-shrink-0"
                  >
                    <Edit2 size={12} />
                    Actualizar
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Mini modal actualizar tasa */}
      {editEntry && (
        <RateUpdateModal
          rateEntry={editEntry}
          onClose={() => setEditEntry(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}

// ── CLPBOBRatePanel — Gestión de tasa CLP→BOB ────────────────────────────────

function CLPBOBRatePanel({ onToast }) {
  const [clpPerUsdt, setClpPerUsdt] = useState('')
  const [bobPerUsdt, setBobPerUsdt] = useState('')
  const [note, setNote]             = useState('')
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  const clpPerBob = clpPerUsdt && bobPerUsdt && +bobPerUsdt > 0
    ? (+clpPerUsdt / +bobPerUsdt).toFixed(4)
    : null

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getCLPBOBRate()
      if (data.clpPerUsdt) setClpPerUsdt(String(data.clpPerUsdt))
      if (data.bobPerUsdt) setBobPerUsdt(String(data.bobPerUsdt))
      // Find most recent update
      const dates = Object.values(data.pairs ?? {}).map(p => p?.updatedAt).filter(Boolean)
      if (dates.length) setLastUpdate(dates.sort().pop())
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    const a = parseFloat(clpPerUsdt)
    const b = parseFloat(bobPerUsdt)
    if (!a || a <= 0 || !b || b <= 0) {
      setError('Ambas tasas deben ser mayores a 0.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await updateCLPBOBRate(a, b, note)
      onToast(`Tasa CLP→BOB actualizada: ${res.clpPerBob} CLP/BOB ✅`)
      setNote('')
      load()
    } catch (err) {
      setError(err.message || 'Error al actualizar.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white border border-[#263050] bg-[#0F1628] focus:outline-none focus:border-[#C4CBD8] focus:shadow-[0_0_0_2px_#C4CBD820] placeholder-[#4E5A7A] transition-colors tabular-nums'
  const labelCls = 'block text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-1.5'

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#1A2340', border: '1px solid #263050' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid #263050' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-[#22C55E1A] border border-[#22C55E33] flex items-center justify-center">
            <TrendingUp size={13} className="text-[#22C55E]" />
          </div>
          <div>
            <p className="text-[0.9375rem] font-bold text-white">Tasa CLP → BOB</p>
            <p className="text-[0.6875rem] text-[#4E5A7A]">Corredor manual Chile→Bolivia · sincroniza SpAConfig</p>
          </div>
        </div>
        {lastUpdate && (
          <span
            className="text-[0.6875rem] font-medium px-2 py-0.5 rounded-full"
            style={{
              background: isStaleRate(lastUpdate) ? '#F59E0B0F' : '#22C55E0A',
              color:      isStaleRate(lastUpdate) ? '#FBBF24'   : '#22C55E',
              border:     `1px solid ${isStaleRate(lastUpdate) ? '#FBBF2430' : '#22C55E30'}`,
            }}
          >
            {isStaleRate(lastUpdate) ? '⚠️ ' : ''}{timeAgo(lastUpdate)}
          </span>
        )}
      </div>

      {loading ? (
        <div className="px-5 py-6 flex gap-4">
          <div className="h-10 bg-[#263050] rounded-xl w-1/3 animate-pulse" />
          <div className="h-10 bg-[#263050] rounded-xl w-1/3 animate-pulse" />
          <div className="h-10 bg-[#263050] rounded-xl w-1/3 animate-pulse" />
        </div>
      ) : (
        <div className="px-5 py-5 flex flex-col gap-4">
          {/* Rate inputs row */}
          <div className="grid grid-cols-3 gap-4">
            {/* CLP/USDT */}
            <div>
              <label className={labelCls}>
                🇨🇱 CLP / USDT
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="927.17"
                value={clpPerUsdt}
                onChange={e => setClpPerUsdt(e.target.value)}
                className={inputCls}
              />
              <p className="text-[0.625rem] text-[#4E5A7A] mt-1">CLP por 1 USDT</p>
            </div>

            {/* BOB/USDT */}
            <div>
              <label className={labelCls}>
                🇧🇴 BOB / USDT
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="9.31"
                value={bobPerUsdt}
                onChange={e => setBobPerUsdt(e.target.value)}
                className={inputCls}
              />
              <p className="text-[0.625rem] text-[#4E5A7A] mt-1">BOB por 1 USDT</p>
            </div>

            {/* CLP/BOB — calculated, read-only */}
            <div>
              <label className={labelCls}>
                🔄 CLP / BOB
                <span className="ml-1.5 text-[0.5625rem] font-semibold px-1.5 py-0.5 rounded-full bg-[#C4CBD81A] text-[#8A96B8]">
                  Auto
                </span>
              </label>
              <div
                className="w-full rounded-xl px-3 py-2.5 text-[0.875rem] border border-[#263050] bg-[#0F162880] tabular-nums"
                style={{ color: clpPerBob ? '#22C55E' : '#4E5A7A' }}
              >
                {clpPerBob ?? '—'}
              </div>
              <p className="text-[0.625rem] text-[#4E5A7A] mt-1">CLP por 1 BOB (= CLP÷BOB)</p>
            </div>
          </div>

          {/* Live calculation preview */}
          {clpPerBob && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#22C55E08] border border-[#22C55E20]">
              <span className="text-[0.8125rem] text-[#8A96B8]">Ejemplo:</span>
              <span className="text-[0.875rem] text-white font-semibold tabular-nums">
                100.000 CLP
              </span>
              <ArrowRight size={12} className="text-[#4E5A7A]" />
              <span className="text-[0.875rem] text-[#22C55E] font-bold tabular-nums">
                {(100000 / +clpPerBob).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BOB
              </span>
              <span className="text-[0.625rem] text-[#4E5A7A] ml-auto">(sin fees)</span>
            </div>
          )}

          {/* Note */}
          <input
            type="text"
            placeholder='Nota opcional — ej. "Binance P2P orden #456"'
            value={note}
            onChange={e => setNote(e.target.value)}
            className={inputCls}
          />

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
              <AlertTriangle size={12} className="text-[#F87171] flex-shrink-0" />
              <p className="text-[0.8125rem] text-[#F87171]">{error}</p>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || !clpPerUsdt || !bobPerUsdt}
            className="w-full py-3 rounded-xl text-[0.875rem] font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            style={{
              background: saving || !clpPerUsdt || !bobPerUsdt ? '#C4CBD840' : '#C4CBD8',
              color:      '#0F1628',
              boxShadow:  saving || !clpPerUsdt || !bobPerUsdt ? 'none' : '0 4px 20px rgba(196,203,216,0.3)',
            }}
          >
            {saving
              ? <><Loader size={13} className="animate-spin" /> Guardando...</>
              : 'Actualizar tasa CLP→BOB'
            }
          </button>
        </div>
      )}
    </div>
  )
}

// ── BalanceCard ───────────────────────────────────────────────────────────────

function BalanceCard({ entity, balance, loading }) {
  const meta   = ENTITY_META[entity]
  const status = statusForBalance(balance ?? 0)

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 transition-all"
      style={{ background: '#1A2340', border: `1px solid ${loading ? '#263050' : status.border}` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{meta.flag}</span>
          <div>
            <p className="text-[0.75rem] font-bold text-white">{entity}</p>
            <p className="text-[0.625rem] text-[#4E5A7A]">{meta.label}</p>
          </div>
        </div>
        <span
          className="text-[0.6875rem] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: status.bg, color: status.color }}
        >
          {status.badge}
        </span>
      </div>

      {loading ? (
        <div className="h-9 rounded-xl bg-[#263050] animate-pulse w-3/4" />
      ) : (
        <div>
          <p className="text-[1.875rem] font-extrabold tabular-nums leading-none" style={{ color: status.color }}>
            ${formatAmount(balance ?? 0)}
          </p>
          <p className="text-[0.75rem] text-[#8A96B8] mt-1">USDC disponible</p>
        </div>
      )}
    </div>
  )
}

// ── EntityBadge ───────────────────────────────────────────────────────────────

function EntityBadge({ entity }) {
  const meta = ENTITY_META[entity] ?? {}
  return (
    <span
      className="text-[0.6875rem] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: '#1F2B4D', color: meta.color ?? '#8A96B8', border: `1px solid ${meta.color ?? '#263050'}33` }}
    >
      {meta.flag} {entity}
    </span>
  )
}

// ── FundingModal ──────────────────────────────────────────────────────────────

function FundingModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    entity:          'SRL',
    type:            'Binance P2P',
    asset:           'USDC',
    amount:          '',
    originCurrency:  'BOB',
    originAmount:    '',
    exchangeRate:    '',
    binanceOrderId:  '',
    stellarTxId:     '',
    bankReference:   '',
    note:            '',
  })
  const [updateRateToo, setUpdateRateToo] = useState(true)  // checkbox — default ON
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState(null)

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const showOriginAmount = form.originCurrency !== 'USD'
  const showBinanceId    = form.type === 'Binance P2P'
  const showStellarTxId  = form.type === 'Stellar'
  const showBankRef      = form.type === 'Transferencia bancaria'

  // Par de tasa inferido de la compra actual
  const ratePair = form.originCurrency !== 'USD'
    ? `${form.originCurrency}/${form.asset}`
    : null

  const handleSave = async () => {
    if (!form.amount || !form.exchangeRate) {
      setError('Monto recibido y tasa de cambio son requeridos.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      // 1. Registrar fondeo
      await registerFunding({
        entity:         form.entity,
        type:           FUNDING_TYPE_TO_DB[form.type] || form.type,
        asset:          form.asset,
        amount:         Number(form.amount),
        sourceCurrency: form.originCurrency,
        sourceAmount:   showOriginAmount && form.originAmount ? Number(form.originAmount) : null,
        exchangeRate:   Number(form.exchangeRate),
        binanceOrderId: form.binanceOrderId || null,
        stellarTxId:    form.stellarTxId    || null,
        bankReference:  form.bankReference  || null,
        note:           form.note           || null,
      })

      // 2. Actualizar tasa si checkbox activo y hay par válido
      if (updateRateToo && ratePair && form.exchangeRate) {
        try {
          await updateExchangeRate(
            ratePair,
            Number(form.exchangeRate),
            form.type === 'Binance P2P' ? 'binance_p2p' : 'manual',
            form.note || `Actualizado al registrar fondeo ${form.type}`,
          )
        } catch { /* no bloquear el fondeo si falla actualizar tasa */ }
      }

      onSuccess()
    } catch (err) {
      setError(err.message || 'Error al registrar el fondeo.')
      setSaving(false)
    }
  }

  const inputCls  = 'w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white border border-[#263050] bg-[#1A2340] focus:outline-none focus:border-[#C4CBD8] focus:shadow-[0_0_0_2px_#C4CBD820] placeholder-[#4E5A7A] transition-colors'
  const selectCls = inputCls + ' appearance-none'
  const labelCls  = 'block text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-1.5'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: '#0F162899', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#0F1628', border: '1px solid #263050', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid #263050', background: 'linear-gradient(180deg, #1A2340 0%, #0F1628 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#C4CBD81A] border border-[#C4CBD833] flex items-center justify-center">
              <TrendingUp size={15} className="text-[#C4CBD8]" />
            </div>
            <div>
              <h2 className="text-[1rem] font-bold text-white">Registrar fondeo</h2>
              <p className="text-[0.75rem] text-[#4E5A7A]">Operación de fondeo manual</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1A2340] border border-[#263050] flex items-center justify-center hover:border-[#C4CBD833] transition-colors"
          >
            <X size={14} className="text-[#8A96B8]" />
          </button>
        </div>

        {/* Body scrolleable */}
        <div className="overflow-y-auto px-6 py-5 flex flex-col gap-4">

          {/* Fila 1: Entidad + Tipo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Entidad <span className="text-[#EF4444]">*</span></label>
              <select className={selectCls} value={form.entity} onChange={e => set('entity', e.target.value)}>
                {ENTITIES.map(e => <option key={e} value={e}>{e} — {ENTITY_META[e].label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Tipo <span className="text-[#EF4444]">*</span></label>
              <select className={selectCls} value={form.type} onChange={e => set('type', e.target.value)}>
                {FUNDING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Fila 2: Activo + Monto recibido */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Activo recibido <span className="text-[#EF4444]">*</span></label>
              <select className={selectCls} value={form.asset} onChange={e => set('asset', e.target.value)}>
                {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Monto recibido <span className="text-[#EF4444]">*</span></label>
              <input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form.amount} onChange={e => set('amount', e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Fila 3: Moneda origen + Monto origen */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Moneda origen</label>
              <select className={selectCls} value={form.originCurrency} onChange={e => set('originCurrency', e.target.value)}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {showOriginAmount && (
              <div>
                <label className={labelCls}>Monto origen</label>
                <input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.originAmount} onChange={e => set('originAmount', e.target.value)}
                  className={inputCls}
                />
              </div>
            )}
          </div>

          {/* Tasa de cambio usada en esta compra */}
          <div>
            <label className={labelCls}>
              Tasa usada en esta compra <span className="text-[#EF4444]">*</span>
              <span className="text-[#4E5A7A] normal-case font-normal ml-1">
                (ej: 9.31 {form.originCurrency}/{form.asset})
              </span>
            </label>
            <input
              type="number" min="0" step="0.0001" placeholder="9.31"
              value={form.exchangeRate} onChange={e => set('exchangeRate', e.target.value)}
              className={inputCls}
            />

            {/* Checkbox actualizar tasa del sistema */}
            {ratePair && (
              <label className="flex items-center gap-2.5 mt-2.5 cursor-pointer group">
                <div
                  className="w-4 h-4 rounded flex items-center justify-center transition-colors flex-shrink-0"
                  style={{
                    background:  updateRateToo ? '#22C55E' : '#1A2340',
                    border:      `1.5px solid ${updateRateToo ? '#22C55E' : '#263050'}`,
                  }}
                  onClick={() => setUpdateRateToo(v => !v)}
                >
                  {updateRateToo && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="#0F1628" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span
                  className="text-[0.8125rem] transition-colors"
                  style={{ color: updateRateToo ? '#FFFFFF' : '#8A96B8' }}
                  onClick={() => setUpdateRateToo(v => !v)}
                >
                  ✅ Actualizar tasa{' '}
                  <span className="font-bold text-[#C4CBD8]">{ratePair}</span>
                  {' '}con este valor
                </span>
              </label>
            )}
          </div>

          {/* Referencias condicionales */}
          {showBinanceId && (
            <div>
              <label className={labelCls}>ID orden Binance</label>
              <input type="text" placeholder="P2P-XXXXXX"
                value={form.binanceOrderId} onChange={e => set('binanceOrderId', e.target.value)}
                className={inputCls} />
            </div>
          )}
          {showStellarTxId && (
            <div>
              <label className={labelCls}>TXID Stellar</label>
              <input type="text" placeholder="a1b2c3d4..."
                value={form.stellarTxId} onChange={e => set('stellarTxId', e.target.value)}
                className={inputCls} />
            </div>
          )}
          {showBankRef && (
            <div>
              <label className={labelCls}>Referencia bancaria</label>
              <input type="text" placeholder="Nro. de transferencia"
                value={form.bankReference} onChange={e => set('bankReference', e.target.value)}
                className={inputCls} />
            </div>
          )}

          {/* Nota */}
          <div>
            <label className={labelCls}>Nota</label>
            <textarea rows={2} placeholder='Ej: "Fondeo mensual para liquidar payouts Bolivia"'
              value={form.note} onChange={e => set('note', e.target.value)}
              className={inputCls + ' resize-none'} />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
              <AlertTriangle size={13} className="text-[#F87171] flex-shrink-0" />
              <p className="text-[0.8125rem] text-[#F87171]">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid #263050' }}>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[#263050] text-[#8A96B8] text-[0.875rem] font-semibold hover:text-white hover:border-[#C4CBD833] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl text-[#0F1628] text-[0.875rem] font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ background: saving ? '#C4CBD840' : '#C4CBD8', boxShadow: saving ? 'none' : '0 4px 20px rgba(196,203,216,0.3)' }}
          >
            {saving ? <><Loader size={14} className="animate-spin" /> Guardando...</> : '✅ Registrar fondeo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── FundingHistoryTable ───────────────────────────────────────────────────────

function sourceDisplay(f) {
  if (f.binanceOrderId) return { icon: '🟡', text: f.binanceOrderId }
  if (f.stellarTxId)    return { icon: '🌐', text: `${f.stellarTxId.slice(0, 10)}...` }
  if (f.bankReference)  return { icon: '🏦', text: f.bankReference }
  return { icon: '—', text: '—' }
}

function FundingHistoryTable({ fundings, loading }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl bg-[#1A2340] animate-pulse" />)}
      </div>
    )
  }

  if (!fundings.length) {
    return (
      <div className="text-center py-16">
        <Wallet size={32} className="text-[#263050] mx-auto mb-3" />
        <p className="text-[0.875rem] text-[#4E5A7A]">Sin fondeos registrados para los filtros seleccionados.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ borderBottom: '1px solid #263050' }}>
            {['Fecha', 'Entidad', 'Tipo', 'Activo', 'Monto', 'USD equiv.', 'Fuente', 'Registrado por', 'Nota'].map(h => (
              <th key={h} className="text-left pb-3 pr-4 text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {fundings.map((f, i) => {
            const src = sourceDisplay(f)
            return (
              <tr key={f._id ?? i} className="border-b border-[#26305040] hover:bg-[#1A234020] transition-colors">
                <td className="py-3 pr-4 text-[0.8125rem] text-[#8A96B8] whitespace-nowrap">{formatDate(f.createdAt)}</td>
                <td className="py-3 pr-4"><EntityBadge entity={f.entity} /></td>
                <td className="py-3 pr-4 text-[0.8125rem] text-white whitespace-nowrap">{f.type}</td>
                <td className="py-3 pr-4">
                  <span className="text-[0.75rem] font-bold px-2 py-0.5 rounded-full bg-[#C4CBD81A] text-[#C4CBD8]">{f.asset}</span>
                </td>
                <td className="py-3 pr-4 text-[0.9rem] font-bold text-[#22C55E] tabular-nums whitespace-nowrap">${formatAmount(f.amount)}</td>
                <td className="py-3 pr-4 text-[0.8125rem] text-white tabular-nums whitespace-nowrap">
                  {f.usdEquivalent != null ? `$${formatAmount(f.usdEquivalent)}` : '—'}
                </td>
                <td className="py-3 pr-4 text-[0.75rem] text-[#8A96B8] max-w-[120px] truncate">
                  <span className="mr-1">{src.icon}</span>
                  <span title={src.text}>{src.text}</span>
                </td>
                <td className="py-3 pr-4 text-[0.8125rem] text-[#8A96B8] whitespace-nowrap">
                  {f.registeredBy?.email ?? f.registeredBy ?? '—'}
                </td>
                <td className="py-3 pr-4 text-[0.8125rem] text-[#4E5A7A] max-w-[160px] truncate" title={f.note}>
                  {f.note ?? '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── FundingPage ───────────────────────────────────────────────────────────────

export default function FundingPage() {
  const [balances,     setBalances]     = useState({ SRL: null, SpA: null, LLC: null })
  const [balLoading,   setBalLoading]   = useState(true)
  const [fundings,     setFundings]     = useState([])
  const [funLoading,   setFunLoading]   = useState(true)
  const [modalOpen,    setModalOpen]    = useState(false)
  const [toast,        setToast]        = useState(null)

  const [filterEntity, setFilterEntity] = useState('')
  const [filterAsset,  setFilterAsset]  = useState('')
  const [filterStart,  setFilterStart]  = useState('')
  const [filterEnd,    setFilterEnd]    = useState('')

  const loadBalances = useCallback(async () => {
    setBalLoading(true)
    try {
      const data = await getFundingBalances()
      setBalances(data)
    } catch { /* silencioso */ } finally { setBalLoading(false) }
  }, [])

  const loadFundings = useCallback(async () => {
    setFunLoading(true)
    try {
      const params = {}
      if (filterEntity) params.entity    = filterEntity
      if (filterAsset)  params.asset     = filterAsset
      if (filterStart)  params.startDate = filterStart
      if (filterEnd)    params.endDate   = filterEnd
      const data = await listFundings(params)
      setFundings(data.fundings ?? data ?? [])
    } catch { setFundings([]) } finally { setFunLoading(false) }
  }, [filterEntity, filterAsset, filterStart, filterEnd])

  useEffect(() => { loadBalances() }, [loadBalances])
  useEffect(() => { loadFundings() }, [loadFundings])

  const handleFundingSuccess = () => {
    setModalOpen(false)
    setToast('Fondeo registrado ✅')
    loadBalances()
    loadFundings()
  }

  const selectCls = 'rounded-xl px-3 py-2 text-[0.8125rem] text-white border border-[#263050] bg-[#1A2340] focus:outline-none focus:border-[#C4CBD8] transition-colors appearance-none cursor-pointer'

  return (
    <div className="space-y-7">

      {/* ── Título + acciones ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[1.5rem] font-bold text-white">Gestión de Fondeo</h1>
          <p className="text-[0.875rem] text-[#8A96B8] mt-0.5">
            Tasas activas, balances disponibles y registro de fondeos manuales
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { loadBalances(); loadFundings() }}
            className="w-9 h-9 rounded-xl bg-[#1A2340] border border-[#263050] flex items-center justify-center hover:border-[#C4CBD833] text-[#8A96B8] hover:text-white transition-colors"
            title="Actualizar todo"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.875rem] font-bold text-[#0F1628] hover:opacity-90 active:scale-[0.98] transition-all"
            style={{ background: '#C4CBD8', boxShadow: '0 4px 20px rgba(196,203,216,0.3)' }}
          >
            <Plus size={16} />
            Registrar fondeo
          </button>
        </div>
      </div>

      {/* ── SECCIÓN 0: Tasas de cambio activas ── */}
      <ExchangeRatesPanel onToast={setToast} />

      {/* ── SECCIÓN 0B: Tasa CLP→BOB (corredor manual) ── */}
      <CLPBOBRatePanel onToast={setToast} />

      {/* ── SECCIÓN 1: Balance cards ── */}
      <div>
        <p className="text-[0.75rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-3">
          Balance disponible por entidad
        </p>
        <div className="grid grid-cols-3 gap-4">
          {ENTITIES.map(entity => (
            <BalanceCard key={entity} entity={entity} balance={balances[entity]} loading={balLoading} />
          ))}
        </div>
      </div>

      {/* ── SECCIÓN 3: Historial ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: '#1A2340', border: '1px solid #263050' }}>
        <div className="flex flex-wrap items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid #263050' }}>
          <div className="flex items-center gap-2 mr-auto">
            <Filter size={15} className="text-[#C4CBD8]" />
            <h2 className="text-[0.9375rem] font-bold text-white">Historial de fondeos</h2>
          </div>
          <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} className={selectCls}>
            <option value="">Todas las entidades</option>
            {ENTITIES.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select value={filterAsset} onChange={e => setFilterAsset(e.target.value)} className={selectCls}>
            <option value="">Todos los activos</option>
            {ASSETS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-[#4E5A7A] flex-shrink-0" />
            <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className={selectCls + ' w-36'} />
            <span className="text-[#4E5A7A] text-sm">—</span>
            <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className={selectCls + ' w-36'} />
          </div>
          {(filterEntity || filterAsset || filterStart || filterEnd) && (
            <button
              onClick={() => { setFilterEntity(''); setFilterAsset(''); setFilterStart(''); setFilterEnd('') }}
              className="text-[0.75rem] text-[#8A96B8] hover:text-white transition-colors flex items-center gap-1"
            >
              <X size={12} /> Limpiar
            </button>
          )}
        </div>

        <div className="px-6 py-4">
          <FundingHistoryTable fundings={fundings} loading={funLoading} />
        </div>

        {!funLoading && fundings.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '1px solid #263050' }}>
            <p className="text-[0.75rem] text-[#4E5A7A]">
              {fundings.length} operación{fundings.length !== 1 ? 'es' : ''}
            </p>
            <p className="text-[0.75rem] text-[#8A96B8]">
              Total fondeado:{' '}
              <span className="text-[#22C55E] font-bold">
                ${formatAmount(fundings.reduce((acc, f) => acc + (Number(f.amount) || 0), 0))} USDC
              </span>
            </p>
          </div>
        )}
      </div>

      {modalOpen && <FundingModal onClose={() => setModalOpen(false)} onSuccess={handleFundingSuccess} />}
      {toast     && <Toast message={toast} onHide={() => setToast(null)} />}
    </div>
  )
}
