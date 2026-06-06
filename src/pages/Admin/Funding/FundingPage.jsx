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
  Edit2, BarChart3, ArrowRight, Zap, Clock, Copy, ExternalLink,
  QrCode, ChevronLeft, ChevronRight, Ban, Eye,
} from 'lucide-react'
import {
  getFundingBalances,
  registerFunding,
  listFundings,
  getExchangeRates,
  updateExchangeRate,
  getCLPBOBRate,
  updateCLPBOBRate,
  getUSDCForecast,
  getVitaBalance,
  createFundingIntent,
  listFundingIntents,
  cancelFundingIntent,
} from '../../../services/adminService'

// ── Constantes ────────────────────────────────────────────────────────────────

const ENTITIES = ['SRL', 'SpA', 'LLC']

const ENTITY_META = {
  SRL: { label: 'AV Finance SRL', flag: '🇧🇴', currency: 'BOB', digitalCurrency: 'USDC', color: '#22C55E' },
  SpA: { label: 'AV Finance SpA', flag: '🇨🇱', currency: 'CLP', digitalCurrency: 'USD',  color: '#C4CBD8' },
  LLC: { label: 'AV Finance LLC', flag: '🌐',  currency: 'USD', digitalCurrency: 'USD',  color: '#8AB4F8' },
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
// autoRefresh: true  → job backend actualiza cada 30 min (no requiere acción admin)
// isOverride:  true  → override opcional; si no está seteado, se usa tasa live P2P
const RATE_PAIRS = [
  { pair: 'BOB/USDT', label: 'Bolivia · Binance P2P',        flag: '🇧🇴', autoRefresh: true },
  { pair: 'CLP/USD',  label: 'Chile · cambio oficial',        flag: '🇨🇱' },
  { pair: 'BOB/USDC', label: 'Bolivia · override corredor USDC', flag: '🇧🇴', isOverride: true },
  { pair: 'CLP/USDT', label: 'CL→BO · CLP por USDT',         flag: '🇨🇱', clpBob: true },
  { pair: 'USDT/BOB', label: 'CL→BO · BOB por USDT',         flag: '🇧🇴', clpBob: true },
  { pair: 'CLP/BOB',  label: 'CL→BO · tasa efectiva',         flag: '🔄', clpBob: true, auto: true },
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
  const { pair, rate: prevRate, autoRefresh, isOverride } = rateEntry

  const [newRate,   setNewRate]   = useState('')
  const [source,    setSource]    = useState('binance_p2p')
  const [note,      setNote]      = useState('')
  const [saving,    setSaving]    = useState(false)
  const [clearing,  setClearing]  = useState(false)
  const [error,     setError]     = useState(null)

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

  // Limpiar override: guarda rate=0 → getBOBRate lo ignora y usa P2P live
  const handleClearOverride = async () => {
    setClearing(true)
    setError(null)
    try {
      await updateExchangeRate(pair, 0, 'manual', 'override limpiado — usa P2P live')
      onSaved(`Override ${pair} eliminado — el sistema usará la tasa live de Binance P2P ✅`)
    } catch (err) {
      setError(err.message || 'Error al limpiar el override.')
      setClearing(false)
    }
  }

  const inputCls = 'w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white border border-[#263050] bg-[#1A2340] focus:outline-none focus:border-[#C4CBD8] focus:shadow-[0_0_0_2px_#C4CBD820] placeholder-[#4E5A7A] transition-colors'
  const labelCls = 'block text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-1.5'

  const modalTitle = autoRefresh
    ? 'Override temporal'
    : rateEntry.source === 'admin_override'
      ? 'Override corredor USDC'
      : isOverride
        ? 'Setear override USDC'
        : 'Actualizar tasa'

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
            <p className="text-[0.75rem] text-[#4E5A7A] uppercase tracking-wider font-semibold">{modalTitle}</p>
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

          {/* Nota contextual para pares especiales */}
          {autoRefresh && (
            <div
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
              style={{ background: '#22C55E08', border: '1px solid #22C55E20' }}
            >
              <Zap size={13} className="text-[#22C55E] flex-shrink-0 mt-0.5" />
              <p className="text-[0.75rem] text-[#4E5A7A] leading-relaxed">
                Este par se actualiza <span className="text-[#C4CBD8] font-semibold">automáticamente cada 30 min</span> desde Binance P2P.
                Cualquier valor que ingreses aquí será sobreescrito en la siguiente corrida del job.
              </p>
            </div>
          )}
          {isOverride && rateEntry.source === 'admin_override' && (
            <div
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
              style={{ background: '#8AB4F808', border: '1px solid #8AB4F820' }}
            >
              <AlertTriangle size={13} className="text-[#8AB4F8] flex-shrink-0 mt-0.5" />
              <p className="text-[0.75rem] text-[#4E5A7A] leading-relaxed">
                Este override tiene <span className="text-[#C4CBD8] font-semibold">mayor prioridad que la tasa live</span> de Binance P2P.
                Úsalo cuando quieras fijar un margen específico para el corredor USDC.
                Si lo limpias, el sistema usará la tasa P2P de mercado automáticamente.
              </p>
            </div>
          )}
          {isOverride && rateEntry.computed && (
            <div
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
              style={{ background: '#22C55E08', border: '1px solid #22C55E20' }}
            >
              <Zap size={13} className="text-[#22C55E] flex-shrink-0 mt-0.5" />
              <p className="text-[0.75rem] text-[#4E5A7A] leading-relaxed">
                Ahora se usa la <span className="text-[#C4CBD8] font-semibold">tasa automática</span> (mercado × spread {rateEntry.spreadPct ?? 2}%).
                Al ingresar un valor aquí lo fijarás como override manual con prioridad máxima sobre el cálculo automático.
              </p>
            </div>
          )}

          {/* Tasa actual/anterior */}
          {prevRate != null && prevRate > 0 && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#1A2340] border border-[#263050]">
              <span className="text-[0.75rem] text-[#4E5A7A]">
                {rateEntry.computed ? 'Tasa actual (auto):' : 'Tasa anterior:'}
              </span>
              <span className="text-[0.875rem] font-bold text-[#C4CBD8] tabular-nums">{prevRate}</span>
              <ArrowRight size={12} className="text-[#4E5A7A] mx-1" />
              <span className="text-[0.75rem] text-[#4E5A7A]">Override →</span>
            </div>
          )}

          {/* Nueva tasa */}
          <div>
            <label className={labelCls}>
              {isOverride ? 'Override de tasa' : 'Nueva tasa'} <span className="text-[#EF4444]">*</span>
              <span className="text-[#4E5A7A] normal-case font-normal ml-1">
                ({pair.split('/')[1]}/{pair.split('/')[0]})
              </span>
            </label>
            <input
              type="number"
              min="0"
              step="0.0001"
              placeholder={String(prevRate && prevRate > 0 ? prevRate : '0.00')}
              value={newRate}
              onChange={e => setNewRate(e.target.value)}
              className={inputCls}
              autoFocus
            />
          </div>

          {/* Fuente — solo si no es override */}
          {!isOverride && (
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
          )}

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
          className="flex flex-col gap-2 px-5 py-4"
          style={{ borderTop: '1px solid #263050' }}
        >
          {/* Botón limpiar override — solo cuando hay override manual activo */}
          {isOverride && rateEntry.source === 'admin_override' && prevRate != null && prevRate > 0 && (
            <button
              onClick={handleClearOverride}
              disabled={clearing || saving}
              className="w-full py-2.5 rounded-xl border text-[0.8125rem] font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
              style={{ borderColor: '#8AB4F830', color: '#8AB4F8' }}
            >
              {clearing
                ? <><Loader size={13} className="animate-spin" /> Limpiando...</>
                : '↩ Limpiar override (usar P2P live)'
              }
            </button>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#263050] text-[#8A96B8] text-[0.875rem] font-semibold hover:text-white hover:border-[#C4CBD833] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || clearing || !newRate}
              className="flex-1 py-2.5 rounded-xl text-[#0F1628] text-[0.875rem] font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              style={{
                background: saving || clearing || !newRate ? '#C4CBD840' : '#C4CBD8',
                boxShadow:  saving || clearing || !newRate ? 'none' : '0 4px 20px rgba(196,203,216,0.3)',
              }}
            >
              {saving
                ? <><Loader size={13} className="animate-spin" /> Guardando...</>
                : isOverride ? 'Guardar override' : 'Guardar tasa'
              }
            </button>
          </div>
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
              // autoRefresh → stale si no se actualizó en 2h (job corre c/30 min)
              // override/manual → stale si no se actualizó en 24h
              const staleHrs = r.autoRefresh ? 2 : 24
              const stale    = (r.isOverride && !r.computed) ? false : isStaleRate(r.updatedAt, staleHrs)
              const ago      = timeAgo(r.updatedAt)
              const isAuto   = r.autoRefresh || r.computed || r.source === 'binance_p2p+spread'
              const isManualOverride = r.source === 'admin_override'

              return (
                <div
                  key={r.pair}
                  className="flex items-center gap-3 px-5 py-3.5"
                >
                  {/* Par */}
                  <span className="text-base leading-none flex-shrink-0">{r.flag}</span>
                  <div className="min-w-[90px]">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[0.8125rem] font-bold text-white">{r.pair}</p>
                      {isAuto && (
                        <span
                          className="text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full leading-none"
                          style={{ background: '#22C55E15', color: '#22C55E', border: '1px solid #22C55E30' }}
                          title={r.autoRefresh ? 'Actualizado automáticamente por el backend cada 30 min' : 'Calculado automáticamente: tasa de mercado × spread'}
                        >
                          AUTO
                        </span>
                      )}
                      {isManualOverride && (
                        <span
                          className="text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full leading-none"
                          style={{ background: '#F59E0B15', color: '#FBBF24', border: '1px solid #FBBF2430' }}
                          title="Override manual activo. Tiene prioridad sobre la tasa de mercado."
                        >
                          OVERRIDE
                        </span>
                      )}
                    </div>
                    <p className="text-[0.625rem] text-[#4E5A7A]">{r.label}</p>
                  </div>

                  {/* Tasa */}
                  <div className="flex-1">
                    {r.rate != null ? (
                      <div>
                        <span className="text-[1.0625rem] font-extrabold tabular-nums text-[#C4CBD8]">
                          {Number(r.rate).toFixed(4)}
                        </span>
                        {r.computed && r.spreadPct != null && (
                          <p className="text-[0.625rem] text-[#22C55E] mt-0.5">
                            mercado × spread {r.spreadPct}%
                          </p>
                        )}
                      </div>
                    ) : r.isOverride ? (
                      <span className="text-[0.8125rem] text-[#4E5A7A] italic">usa tasa live P2P</span>
                    ) : (
                      <span className="text-[0.875rem] text-[#4E5A7A]">Sin configurar</span>
                    )}
                  </div>

                  {/* Meta: fuente + tiempo */}
                  <div className="flex items-center gap-2 mr-3">
                    {r.source && (!r.isOverride || r.computed) && (
                      <span className="text-[0.6875rem] text-[#8A96B8] hidden sm:block">
                        {r.source === 'binance_p2p_auto' ? 'auto · P2P'
                          : r.source === 'binance_p2p+spread' ? 'P2P + spread'
                          : r.source}
                      </span>
                    )}
                    {ago && (!r.isOverride || r.computed) && (
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
                    {isManualOverride && r.rate != null && ago && (
                      <span
                        className="text-[0.6875rem] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: '#F59E0B0F', color: '#FBBF24', border: '1px solid #FBBF2430' }}
                      >
                        {ago}
                      </span>
                    )}
                  </div>

                  {/* Botón editar */}
                  <button
                    onClick={() => setEditEntry(r)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#263050] text-[0.75rem] text-[#8A96B8] hover:text-white hover:border-[#C4CBD833] transition-colors flex-shrink-0"
                    title={r.autoRefresh ? 'Forzar un valor manualmente (sobreescribe el auto)' : r.computed ? 'Fijar un override manual sobre la tasa calculada' : r.isOverride ? 'Setear override' : 'Actualizar tasa'}
                  >
                    <Edit2 size={12} />
                    {r.autoRefresh ? 'Override' : r.computed ? 'Setear override' : isManualOverride ? 'Actualizar' : r.isOverride ? 'Setear override' : 'Actualizar'}
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

// ── VitaBalanceWidget ─────────────────────────────────────────────────────────

const VITA_CURRENCIES = [
  { key: 'usd',  label: 'USD',  flag: '🇺🇸', threshold: 500,     format: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
  { key: 'clp',  label: 'CLP',  flag: '🇨🇱', threshold: 500000,  format: (v) => `$${Number(v).toLocaleString('es-CL', { minimumFractionDigits: 0,  maximumFractionDigits: 0  })}` },
  { key: 'usdt', label: 'USDT', flag: '💵',   threshold: 500,     format: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
  { key: 'usdc', label: 'USDC', flag: '🔵',   threshold: 500,     format: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
  { key: 'cop',  label: 'COP',  flag: '🇨🇴', threshold: 2000000, format: (v) => `$${Number(v).toLocaleString('es-CO', { minimumFractionDigits: 0,  maximumFractionDigits: 0  })}` },
]

function VitaBalanceWidget() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getVitaBalance()
      setData(res)
    } catch (err) {
      setError(err.message || 'Error consultando saldo Vita')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const balances   = data?.balances ?? {}
  const alertKeys  = new Set((data?.alerts ?? []).map(a => a.currency?.toLowerCase()))
  const hasAlerts  = data?.hasAlerts ?? false

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#1A2340', border: `1px solid ${hasAlerts ? '#FBBF2440' : '#263050'}` }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid #263050' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: '#22C55E1A', border: '1px solid #22C55E33' }}
          >
            <Wallet size={13} className="text-[#22C55E]" />
          </div>
          <div>
            <p className="text-[0.9375rem] font-bold text-white">Vita Wallet — balances live</p>
            <p className="text-[0.6875rem] text-[#4E5A7A]">Cuenta master · fondos para payouts LatAm</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasAlerts && (
            <span
              className="text-[0.6875rem] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: '#F59E0B0F', color: '#FBBF24', border: '1px solid #FBBF2430' }}
            >
              ⚠️ Fondeo requerido
            </span>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="w-7 h-7 rounded-xl bg-[#1F2B4D] border border-[#263050] flex items-center justify-center hover:border-[#C4CBD833] text-[#4E5A7A] hover:text-white transition-colors disabled:opacity-40"
            title="Refrescar"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-5">
        {error ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
            <AlertTriangle size={13} className="text-[#F87171] flex-shrink-0" />
            <p className="text-[0.8125rem] text-[#F87171]">{error}</p>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-5 gap-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-20 rounded-2xl bg-[#263050] animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-3">
              {VITA_CURRENCIES.map(({ key, label, flag, threshold, format }) => {
                const value   = balances[key] ?? 0
                const isLow   = alertKeys.has(key)
                const isCrit  = isLow && value < threshold * 0.5
                const color   = isCrit ? '#EF4444' : isLow ? '#FBBF24' : '#22C55E'
                const bg      = isCrit ? '#EF44441A' : isLow ? '#F59E0B0F' : '#22C55E0A'
                const border  = isCrit ? '#EF444430' : isLow ? '#FBBF2430' : '#22C55E20'
                return (
                  <div
                    key={key}
                    className="rounded-2xl p-4 flex flex-col gap-1.5"
                    style={{ background: isLow ? bg : '#0F1628', border: `1px solid ${isLow ? border : '#263050'}` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base leading-none">{flag}</span>
                      <span className="text-[0.625rem] font-bold text-[#4E5A7A] uppercase">{label}</span>
                    </div>
                    <p
                      className="text-[1.125rem] font-extrabold tabular-nums leading-none mt-1"
                      style={{ color: isLow ? color : '#C4CBD8' }}
                    >
                      {format(value)}
                    </p>
                    <p className="text-[0.5625rem] text-[#4E5A7A]">
                      {isLow ? `mín: ${format(threshold)}` : 'OK'}
                    </p>
                  </div>
                )
              })}
            </div>

            {/* Alertas detalladas */}
            {data?.alerts?.length > 0 && (
              <div className="space-y-1.5">
                {data.alerts.map(alert => (
                  <div
                    key={alert.currency}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                    style={{
                      background: alert.level === 'critical' ? '#EF44441A' : '#F59E0B0F',
                      border:     `1px solid ${alert.level === 'critical' ? '#EF444430' : '#FBBF2430'}`,
                    }}
                  >
                    <span className="text-sm leading-none flex-shrink-0">
                      {alert.level === 'critical' ? '🚨' : '⚠️'}
                    </span>
                    <p
                      className="text-[0.8125rem] font-semibold"
                      style={{ color: alert.level === 'critical' ? '#F87171' : '#FBBF24' }}
                    >
                      {alert.message}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {data?.checkedAt && (
              <p className="text-[0.625rem] text-[#4E5A7A] text-right">
                Consultado {formatDate(data.checkedAt)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── USDCForecastWidget ────────────────────────────────────────────────────────

const ALERT_COLORS = {
  ok:       { border: '#22C55E40', bg: '#22C55E0A', text: '#22C55E', icon: '✅' },
  warning:  { border: '#FBBF2440', bg: '#F59E0B0F', text: '#FBBF24', icon: '⚠️' },
  critical: { border: '#EF444440', bg: '#EF44441A', text: '#EF4444', icon: '🚨' },
}

function USDCForecastWidget() {
  const [entity,   setEntity]   = useState('SRL')
  const [forecast, setForecast] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [copied,   setCopied]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getUSDCForecast(entity)
      setForecast(data)
    } catch (err) {
      setError(err.message || 'Error al cargar forecast USDC')
    } finally {
      setLoading(false)
    }
  }, [entity])

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  useEffect(() => { load() }, [load])

  const alert = ALERT_COLORS[forecast?.alertLevel ?? 'ok']

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#1A2340', border: `1px solid ${loading || !forecast ? '#263050' : alert.border}` }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3.5"
        style={{ borderBottom: '1px solid #263050' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-[#8AB4F81A] border border-[#8AB4F833] flex items-center justify-center">
            <Zap size={13} className="text-[#8AB4F8]" />
          </div>
          <div>
            <p className="text-[0.9375rem] font-bold text-white">Previsión USDC en tiempo real</p>
            <p className="text-[0.6875rem] text-[#4E5A7A]">Balance Stellar live · compromisos · txs en espera</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Selector entidad */}
          <select
            value={entity}
            onChange={e => setEntity(e.target.value)}
            className="rounded-xl px-2.5 py-1.5 text-[0.8125rem] text-white border border-[#263050] bg-[#0F1628] focus:outline-none focus:border-[#C4CBD8] transition-colors appearance-none cursor-pointer"
          >
            <option value="SRL">🇧🇴 SRL</option>
            <option value="LLC">🌐 LLC</option>
          </select>
          <button
            onClick={load}
            disabled={loading}
            className="w-7 h-7 rounded-xl bg-[#1F2B4D] border border-[#263050] flex items-center justify-center hover:border-[#C4CBD833] text-[#4E5A7A] hover:text-white transition-colors disabled:opacity-40"
            title="Refrescar"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-5">
        {error ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
            <AlertTriangle size={13} className="text-[#F87171] flex-shrink-0" />
            <p className="text-[0.8125rem] text-[#F87171]">{error}</p>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-[#263050] animate-pulse" />)}
            </div>
            <div className="h-10 rounded-xl bg-[#263050] animate-pulse" />
          </div>
        ) : forecast ? (
          <div className="space-y-4">

            {/* Tres métricas */}
            <div className="grid grid-cols-3 gap-4">
              {/* Stellar balance */}
              <div className="rounded-2xl p-4 flex flex-col gap-1.5" style={{ background: '#0F1628', border: '1px solid #263050' }}>
                <p className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider">Stellar live</p>
                <p className="text-[1.5rem] font-extrabold tabular-nums text-[#8AB4F8] leading-none">
                  {formatAmount(forecast.stellar?.balance ?? 0)}
                </p>
                <p className="text-[0.6875rem] text-[#4E5A7A]">USDC en wallet</p>
              </div>

              {/* Comprometido */}
              <div className="rounded-2xl p-4 flex flex-col gap-1.5" style={{ background: '#0F1628', border: '1px solid #263050' }}>
                <p className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider">Comprometido</p>
                <p className="text-[1.5rem] font-extrabold tabular-nums text-[#FBBF24] leading-none">
                  {formatAmount(forecast.committed?.amount ?? 0)}
                </p>
                <p className="text-[0.6875rem] text-[#4E5A7A]">
                  {forecast.committed?.count ?? 0} pago{forecast.committed?.count !== 1 ? 's' : ''} in-flight
                </p>
              </div>

              {/* Disponible ahora */}
              <div
                className="rounded-2xl p-4 flex flex-col gap-1.5"
                style={{ background: alert.bg, border: `1px solid ${alert.border}` }}
              >
                <p className="text-[0.625rem] font-semibold uppercase tracking-wider" style={{ color: alert.text }}>
                  Disponible ahora
                </p>
                <p className="text-[1.5rem] font-extrabold tabular-nums leading-none" style={{ color: alert.text }}>
                  {formatAmount(forecast.availableNow ?? 0)}
                </p>
                <p className="text-[0.6875rem]" style={{ color: alert.text, opacity: 0.7 }}>USDC para nuevos pagos</p>
              </div>
            </div>

            {/* Banner de alerta / recomendación */}
            {forecast.recommendation && (
              <div
                className="flex items-start gap-3 px-4 py-3 rounded-xl"
                style={{ background: alert.bg, border: `1px solid ${alert.border}` }}
              >
                <span className="text-base leading-none flex-shrink-0 mt-0.5">{alert.icon}</span>
                <p className="text-[0.8125rem] font-semibold" style={{ color: alert.text }}>
                  {forecast.recommendation}
                </p>
              </div>
            )}

            {/* Tabla de txs en pending_funding */}
            {forecast.pendingFunding?.count > 0 && (
              <div>
                <p className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-2">
                  Pagos bloqueados esperando fondeo ({forecast.pendingFunding.count})
                </p>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #263050' }}>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr style={{ background: '#0F1628', borderBottom: '1px solid #263050' }}>
                        {['Transacción', 'USDC needed', 'País / corredor', 'Esperando'].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {forecast.pendingFunding.transactions.map((tx, i) => (
                        <tr
                          key={tx.id ?? i}
                          className="border-b border-[#26305040] last:border-0 hover:bg-[#0F162840] transition-colors"
                        >
                          <td className="px-4 py-3">
                            <p className="text-[0.8125rem] font-mono text-[#C4CBD8] truncate max-w-[180px]">{tx.id}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-[0.9rem] font-bold tabular-nums text-[#EF4444]">
                              ${formatAmount(tx.usdcNeeded)}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-[0.8125rem] text-white">{tx.country ?? '—'}</p>
                            <p className="text-[0.6875rem] text-[#4E5A7A] truncate max-w-[120px]">{tx.corridor ?? ''}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-[#8A96B8]">
                              <Clock size={11} />
                              <span className="text-[0.75rem]">{timeAgo(tx.waitingSince)}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Totalizador */}
                  <div
                    className="flex items-center justify-between px-4 py-2.5"
                    style={{ borderTop: '1px solid #263050', background: '#0F1628' }}
                  >
                    <p className="text-[0.6875rem] text-[#4E5A7A]">Total necesario</p>
                    <p className="text-[0.875rem] font-bold tabular-nums text-[#EF4444]">
                      ${formatAmount(forecast.pendingFunding.needed)} USDC
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Dirección pública + Stellar Expert + Lab */}
            <div
              className="flex flex-wrap items-center gap-2 px-3 py-2.5 rounded-xl"
              style={{ background: '#0F1628', border: '1px solid #263050' }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-0.5">
                  Wallet Stellar {entity} · {forecast.stellar?.publicKey ? 'dirección para fondear' : 'dirección'}
                </p>
                <p className="text-[0.75rem] font-mono text-[#C4CBD8] truncate" title={forecast.stellar?.publicKey}>
                  {forecast.stellar?.publicKey ?? '—'}
                </p>
              </div>
              {forecast.stellar?.publicKey && (
                <button
                  onClick={() => handleCopy(forecast.stellar.publicKey)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[0.75rem] font-semibold flex-shrink-0 transition-all active:scale-90"
                  style={{
                    background: copied ? '#22C55E1A' : '#1A2340',
                    border: `1px solid ${copied ? '#22C55E40' : '#263050'}`,
                    color: copied ? '#22C55E' : '#8A96B8',
                  }}
                >
                  {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              )}
              {forecast.stellar?.stellarExpertUrl && (
                <a
                  href={forecast.stellar.stellarExpertUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[0.75rem] font-semibold flex-shrink-0 transition-all hover:opacity-80"
                  style={{ background: '#1A2340', border: '1px solid #263050', color: '#8AB4F8' }}
                >
                  <ExternalLink size={12} />
                  Stellar Expert
                </a>
              )}
              {forecast.stellar?.publicKey && (
                <a
                  href={`https://laboratory.stellar.org/account?accountId=${forecast.stellar.publicKey}&network=${forecast.stellar?.network ?? 'testnet'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[0.75rem] font-semibold flex-shrink-0 transition-all hover:opacity-80"
                  style={{ background: '#1A2340', border: '1px solid #263050', color: '#C4CBD8' }}
                >
                  <ExternalLink size={12} />
                  Stellar Lab
                </a>
              )}
            </div>

            {/* Footer: generatedAt */}
            <p className="text-[0.625rem] text-[#4E5A7A] text-right">
              Actualizado {forecast.generatedAt ? formatDate(forecast.generatedAt) : '—'}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ── BalanceCard ───────────────────────────────────────────────────────────────

function BalanceCard({ entity, balanceData, loading }) {
  const meta      = ENTITY_META[entity]
  const available = balanceData?.available ?? null
  const status    = statusForBalance(available ?? 0)
  const fromStellar = balanceData?.source === 'stellar'

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
            {formatAmount(available ?? 0)} {meta.digitalCurrency}
          </p>
          <p className="text-[0.625rem] text-[#4E5A7A] mt-1">
            {fromStellar ? '🔗 Balance Stellar live' : `fondeado: ${formatAmount(balanceData?.totalFundedUSD ?? 0)} · pagado: ${formatAmount(balanceData?.totalPaidOut ?? 0)}`}
          </p>
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

      // 2. Actualizar tasa si checkbox activo
      if (updateRateToo && form.exchangeRate) {
        try {
          if (form.type === 'Binance P2P' && form.originCurrency === 'CLP') {
            // Binance P2P CLP→USDT: obtenemos bobPerUsdt actual y actualizamos
            // de forma atómica CLP-USDT + BOB-USDT + CLP-BOB + SpAConfig.clpPerBob
            const currentRates = await getCLPBOBRate()
            const bobPerUsdt   = currentRates.bobPerUsdt ?? 0
            if (bobPerUsdt > 0) {
              await updateCLPBOBRate(
                Number(form.exchangeRate),
                bobPerUsdt,
                form.note || `Actualizado al registrar fondeo Binance P2P`,
              )
            }
          } else if (ratePair) {
            await updateExchangeRate(
              ratePair,
              Number(form.exchangeRate),
              'manual',
              form.note || `Actualizado al registrar fondeo ${form.type}`,
            )
          }
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
                <td className="py-3 pr-4 text-[0.9rem] font-bold text-[#22C55E] tabular-nums whitespace-nowrap">
                  {formatAmount(f.amount)} <span className="text-[0.75rem] font-semibold text-[#8A96B8]">{f.asset}</span>
                </td>
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

// ════════════════════════════════════════════════════════════════════════════
//  FONDEO DE TESORERÍA — Intents (Camino A)
//  El admin crea un intent → correlativo + dirección de tesorería + memo + QR
//  SEP-7. Retira el USDC del exchange a esa dirección con el memo; se concilia
//  on-chain. NO hay lógica de red/firma aquí: solo consumo de API + mostrar/copiar.
// ════════════════════════════════════════════════════════════════════════════

const STELLAR_NETWORK = import.meta.env.VITE_STELLAR_NETWORK === 'mainnet' ? 'public' : 'testnet'
const stellarExpertTx = hash => `https://stellar.expert/explorer/${STELLAR_NETWORK}/tx/${hash}`

const INTENT_STATUS_META = {
  open:      { label: 'Abierto',    bg: '#F59E0B1A', text: '#F59E0B' },
  matched:   { label: 'Conciliado', bg: '#22C55E1A', text: '#22C55E' },
  cancelled: { label: 'Cancelado',  bg: '#4E5A7A1A', text: '#8A96B8' },
}

function IntentStatusBadge({ status }) {
  const s = INTENT_STATUS_META[status] ?? { label: status, bg: '#4E5A7A1A', text: '#8A96B8' }
  return (
    <span className="text-[0.625rem] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  )
}

function CopyBtn({ text, label = 'Copiar' }) {
  const [copied, setCopied] = useState(false)
  if (!text) return null
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(String(text)); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[0.75rem] font-semibold flex-shrink-0 transition-all active:scale-90"
      style={{ background: copied ? '#22C55E1A' : '#1A2340', border: `1px solid ${copied ? '#22C55E40' : '#263050'}`, color: copied ? '#22C55E' : '#8A96B8' }}
    >
      {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
      {copied ? 'Copiado' : label}
    </button>
  )
}

function IntentFieldRow({ label, value, mono = false }) {
  if (value == null || value === '') return null
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-[0.625rem] text-[#4E5A7A] uppercase tracking-wider mb-0.5">{label}</p>
        <p className={`text-[0.8125rem] text-white break-all ${mono ? 'font-mono' : 'font-semibold'}`}>{value}</p>
      </div>
      <CopyBtn text={value} />
    </div>
  )
}

/** Vista de datos de un intent: QR (si lo hay) + dirección + memo + aviso. */
function IntentDataView({ intent }) {
  return (
    <div className="space-y-3">
      {intent.qr && (
        <div className="flex flex-col items-center gap-2">
          <img src={intent.qr} alt={`QR ${intent.intentId}`}
            className="w-44 h-44 rounded-xl bg-white p-2 object-contain" />
          <span className="text-[0.625rem] text-[#4E5A7A]">Escaneá desde tu wallet/exchange</span>
        </div>
      )}

      <div className="rounded-xl px-3.5 divide-y divide-[#26305060]"
        style={{ background: '#0F1628', border: '1px solid #263050' }}>
        <IntentFieldRow label="Correlativo (intent)"   value={intent.intentId} mono />
        <IntentFieldRow label="Dirección de tesorería" value={intent.treasuryAddress} mono />
        <IntentFieldRow label="Memo (MEMO_TEXT)"        value={intent.memo} mono />
        {intent.expectedAmount != null && (
          <IntentFieldRow label="Monto esperado" value={`${intent.expectedAmount} ${intent.asset ?? 'USDC'}`} />
        )}
      </div>

      <div className="flex items-start gap-2.5 rounded-xl px-3.5 py-3"
        style={{ background: '#F59E0B12', border: '1px solid #F59E0B33' }}>
        <AlertTriangle size={15} className="text-[#F59E0B] mt-0.5 flex-shrink-0" />
        <p className="text-[0.75rem] leading-relaxed" style={{ color: '#E3C892' }}>
          {intent.note
            ?? 'Retirá el USDC del exchange a esta dirección, incluyendo este MEMO. El monto se reconcilia on-chain (no es necesario que el exchange respete el monto del QR).'}
        </p>
      </div>
    </div>
  )
}

const intentModalShell = { background: '#0F1628', border: '1px solid #263050' }
const intentInputCls = 'w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white border border-[#263050] bg-[#0F1628] focus:outline-none focus:border-[#C4CBD8] transition-colors placeholder:text-[#4E5A7A]'

/** Modal para crear un intent. Tras crear, muestra dirección + memo + QR. */
function IntentCreateModal({ onClose, onCreated }) {
  const [entity,         setEntity]         = useState('SRL')
  const [expectedAmount, setExpectedAmount] = useState('')
  const [sourceCurrency, setSourceCurrency] = useState('BOB')
  const [sourceAmount,   setSourceAmount]   = useState('')
  const [binanceOrderId, setBinanceOrderId] = useState('')
  const [note,           setNote]           = useState('')
  const [creating,       setCreating]       = useState(false)
  const [error,          setError]          = useState(null)
  const [result,         setResult]         = useState(null)

  async function submit(e) {
    e?.preventDefault()
    setCreating(true); setError(null)
    try {
      const body = { entity }
      if (expectedAmount !== '') body.expectedAmount = Number(expectedAmount)
      if (sourceCurrency)        body.sourceCurrency = sourceCurrency
      if (sourceAmount !== '')   body.sourceAmount   = Number(sourceAmount)
      if (binanceOrderId.trim()) body.binanceOrderId = binanceOrderId.trim()
      if (note.trim())           body.note           = note.trim()
      const res = await createFundingIntent(body)
      setResult(res)
      onCreated?.()
    } catch (err) {
      setError(err.message || 'No se pudo crear el intent')
    } finally {
      setCreating(false)
    }
  }

  const labelCls = 'text-[0.75rem] font-medium text-[#8A96B8]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: '#0F162899', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={intentModalShell} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #263050' }}>
          <h3 className="text-[0.9375rem] font-bold text-white">
            {result ? `Intent ${result.intentId}` : 'Crear intent de fondeo'}
          </h3>
          <button onClick={onClose} className="text-[#4E5A7A] hover:text-white transition-colors"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-5 py-5">
          {result ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#22C55E]">
                <CheckCircle2 size={16} />
                <span className="text-[0.8125rem] font-semibold">Intent creado</span>
              </div>
              <IntentDataView intent={result} />
              <button onClick={onClose}
                className="w-full py-3 rounded-xl text-[0.875rem] font-bold text-[#0F1628]"
                style={{ background: '#C4CBD8' }}>
                Listo
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className={labelCls}>Entidad</label>
                <select value={entity} onChange={e => setEntity(e.target.value)} className={intentInputCls}>
                  {ENTITIES.map(en => <option key={en} value={en}>{en}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={labelCls}>Monto esperado (USDC)</label>
                  <input type="number" inputMode="decimal" step="0.01" min="0" value={expectedAmount}
                    onChange={e => setExpectedAmount(e.target.value)} placeholder="100" className={intentInputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>Moneda origen</label>
                  <select value={sourceCurrency} onChange={e => setSourceCurrency(e.target.value)} className={intentInputCls}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Monto fiat pagado ({sourceCurrency}) <span className="text-[#4E5A7A]">· opcional</span></label>
                <input type="number" inputMode="decimal" step="0.01" min="0" value={sourceAmount}
                  onChange={e => setSourceAmount(e.target.value)} placeholder="930" className={intentInputCls} />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Orden Binance <span className="text-[#4E5A7A]">· opcional</span></label>
                <input type="text" value={binanceOrderId} onChange={e => setBinanceOrderId(e.target.value)}
                  placeholder="ID de la orden P2P" className={intentInputCls} />
              </div>

              <div className="space-y-1.5">
                <label className={labelCls}>Nota <span className="text-[#4E5A7A]">· opcional</span></label>
                <input type="text" value={note} onChange={e => setNote(e.target.value)}
                  placeholder="Referencia interna" className={intentInputCls} />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                  style={{ background: '#EF44441A', border: '1px solid #EF444433' }}>
                  <AlertTriangle size={14} className="text-[#F87171] flex-shrink-0" />
                  <p className="text-[0.75rem] text-[#F87171]">{error}</p>
                </div>
              )}

              <button type="submit" disabled={creating}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[0.875rem] font-bold text-[#0F1628] disabled:opacity-50"
                style={{ background: '#C4CBD8' }}>
                {creating ? <Loader size={15} className="animate-spin" /> : <Plus size={15} />}
                {creating ? 'Creando...' : 'Crear intent'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

/** Modal de solo-lectura: re-muestra los datos de un intent (sin QR del backend). */
function IntentViewModal({ intent, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: '#0F162899', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={intentModalShell} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #263050' }}>
          <h3 className="text-[0.9375rem] font-bold text-white">Datos del intent {intent.intentId}</h3>
          <button onClick={onClose} className="text-[#4E5A7A] hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-5 py-5">
          <IntentDataView intent={intent} />
        </div>
      </div>
    </div>
  )
}

function TreasuryFundingIntentsPanel() {
  const [intents,      setIntents]      = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [page,         setPage]         = useState(1)
  const [pagination,   setPagination]   = useState({ total: 0, page: 1, limit: 20, totalPages: 1 })
  const [createOpen,   setCreateOpen]   = useState(false)
  const [viewIntent,   setViewIntent]   = useState(null)
  const [cancelling,   setCancelling]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await listFundingIntents({ status: filterStatus, page, limit: 20 })
      setIntents(data.intents ?? [])
      setPagination(data.pagination ?? { total: 0, page: 1, limit: 20, totalPages: 1 })
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los intents')
      setIntents([])
    } finally {
      setLoading(false)
    }
  }, [filterStatus, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [filterStatus])

  async function handleCancel(intentId) {
    if (!window.confirm(`¿Cancelar el intent ${intentId}? Esta acción no se puede deshacer.`)) return
    setCancelling(intentId)
    try {
      await cancelFundingIntent(intentId)
      load()
    } catch (err) {
      setError(err.message || 'No se pudo cancelar el intent')
    } finally {
      setCancelling(null)
    }
  }

  const selectCls = 'rounded-xl px-3 py-2 text-[0.8125rem] text-white border border-[#263050] bg-[#1A2340] focus:outline-none focus:border-[#C4CBD8] transition-colors appearance-none cursor-pointer'

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#1A2340', border: '1px solid #263050' }}>

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid #263050' }}>
        <div className="flex items-center gap-2.5 mr-auto">
          <div className="w-7 h-7 rounded-xl bg-[#C4CBD81A] border border-[#C4CBD833] flex items-center justify-center">
            <QrCode size={13} className="text-[#C4CBD8]" />
          </div>
          <div>
            <h2 className="text-[0.9375rem] font-bold text-white">Fondeo de tesorería</h2>
            <p className="text-[0.6875rem] text-[#4E5A7A]">Intents con correlativo + QR · se concilian on-chain</p>
          </div>
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectCls}>
          <option value="">Todos los estados</option>
          <option value="open">Abiertos</option>
          <option value="matched">Conciliados</option>
          <option value="cancelled">Cancelados</option>
        </select>
        <button onClick={load}
          className="w-9 h-9 rounded-xl bg-[#1F2B4D] border border-[#263050] flex items-center justify-center hover:border-[#C4CBD833] text-[#8A96B8] hover:text-white transition-colors"
          title="Actualizar">
          <RefreshCw size={14} />
        </button>
        <button onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[0.8125rem] font-bold text-[#0F1628] hover:opacity-90 active:scale-[0.98] transition-all"
          style={{ background: '#C4CBD8', boxShadow: '0 4px 20px rgba(196,203,216,0.3)' }}>
          <Plus size={15} />
          Crear intent
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 px-6 py-3" style={{ background: '#EF44440D', borderBottom: '1px solid #263050' }}>
          <AlertTriangle size={15} className="text-[#F87171] flex-shrink-0" />
          <p className="text-[0.8125rem] text-[#F87171]">{error}</p>
        </div>
      )}

      {/* Tabla / estados */}
      {loading ? (
        <div className="p-6 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-[#0F1628] animate-pulse" />
          ))}
        </div>
      ) : intents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#0F1628] border border-[#263050] flex items-center justify-center mb-3">
            <QrCode size={20} className="text-[#4E5A7A]" />
          </div>
          <p className="text-[0.875rem] font-semibold text-white">Sin intents de fondeo</p>
          <p className="text-[0.75rem] text-[#4E5A7A] mt-1">Creá uno para fondear la tesorería con correlativo y QR.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: '#0F1628', borderBottom: '1px solid #263050' }}>
                {['Intent', 'Esperado', 'Estado', 'Conciliado', 'Tx on-chain', 'Creado', ''].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-[0.625rem] font-bold text-[#4E5A7A] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {intents.map(it => (
                <tr key={it.intentId} className="border-b border-[#26305040] last:border-0 hover:bg-[#0F162840] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-[0.8125rem] font-mono text-[#C4CBD8] whitespace-nowrap">{it.intentId}</p>
                    {it.entity && <p className="text-[0.625rem] text-[#4E5A7A] mt-0.5">{it.entity} · {it.asset ?? 'USDC'}</p>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-[0.8125rem] text-white font-semibold">
                      {it.expectedAmount != null ? `${formatAmount(it.expectedAmount)} ${it.asset ?? 'USDC'}` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3"><IntentStatusBadge status={it.status} /></td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-[0.8125rem] text-white">
                      {it.matchedAmount != null ? `${formatAmount(it.matchedAmount)} ${it.asset ?? 'USDC'}` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {it.matchedStellarTxId ? (
                      <a href={stellarExpertTx(it.matchedStellarTxId)} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[0.75rem] font-semibold text-[#8AB4F8] hover:opacity-80">
                        <ExternalLink size={12} />
                        Ver tx
                      </a>
                    ) : <span className="text-[0.75rem] text-[#4E5A7A]">—</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-[0.75rem] text-[#8A96B8]">{formatDate(it.createdAt)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setViewIntent(it)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[0.75rem] font-semibold text-[#8A96B8] hover:text-white transition-colors"
                        style={{ background: '#1A2340', border: '1px solid #263050' }}>
                        <Eye size={12} /> Datos
                      </button>
                      {it.status === 'open' && (
                        <button onClick={() => handleCancel(it.intentId)} disabled={cancelling === it.intentId}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[0.75rem] font-semibold text-[#F87171] hover:bg-[#EF44441A] transition-colors disabled:opacity-50"
                          style={{ border: '1px solid #EF444433' }}>
                          {cancelling === it.intentId ? <Loader size={12} className="animate-spin" /> : <Ban size={12} />}
                          Cancelar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-4" style={{ borderTop: '1px solid #263050' }}>
          <span className="text-[0.75rem] text-[#4E5A7A]">Página {pagination.page} de {pagination.totalPages} · {pagination.total} intents</span>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="w-8 h-8 rounded-lg border border-[#263050] flex items-center justify-center disabled:opacity-40 text-[#8A96B8] hover:text-white">
            <ChevronLeft size={14} />
          </button>
          <button onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}
            className="w-8 h-8 rounded-lg border border-[#263050] flex items-center justify-center disabled:opacity-40 text-[#8A96B8] hover:text-white">
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {createOpen && <IntentCreateModal onClose={() => setCreateOpen(false)} onCreated={load} />}
      {viewIntent && <IntentViewModal intent={viewIntent} onClose={() => setViewIntent(null)} />}
    </div>
  )
}

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
      setBalances(data.balance ?? data)
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
            <BalanceCard key={entity} entity={entity} balanceData={balances[entity]} loading={balLoading} />
          ))}
        </div>
      </div>

      {/* ── SECCIÓN 2A: Vita Wallet balances ── */}
      <VitaBalanceWidget />

      {/* ── SECCIÓN 2B: Previsión USDC live (Harbor/Stellar) ── */}
      <USDCForecastWidget />

      {/* ── SECCIÓN 2C: Fondeo de tesorería — intents (Camino A) ── */}
      <TreasuryFundingIntentsPanel />

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
              Total USD equiv.:{' '}
              <span className="text-[#22C55E] font-bold">
                ${formatAmount(fundings.reduce((acc, f) => acc + (Number(f.usdEquivalent) || 0), 0))}
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
