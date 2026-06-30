/**
 * SwapsDashboardPage.jsx — Dashboard dedicado de conversiones Swap (BOB ⇄ USDC)
 *
 * Reúne en un solo lugar:
 *   1. Ganancia por spread (acumulada + por dirección + verificación)
 *   2. Spreads editables (compra / venta)
 *   3. Cola de conversiones pendientes (confirmar / rechazar) — ambas direcciones
 *   4. Historial global de conversiones (filtros + paginación)
 *
 * Tema admin oscuro. Consume:
 *   GET  /admin/wallet/swap-revenue
 *   GET  /admin/wallet-fees          (PUT para spreads)
 *   GET  /admin/wallet/usdc|bob/conversions/pending  (+ confirm/reject)
 *   GET  /admin/wallet/conversions   (historial)
 */

import { useState, useEffect, useCallback } from 'react'
import {
  ArrowRightLeft, TrendingUp, Percent, RefreshCw, Save, Loader2,
  CheckCircle2, AlertCircle, X, Clock, User, History, Check,
} from 'lucide-react'
import {
  getSwapRevenue, getWalletFees, updateWalletFees,
  listPendingConversions, confirmConversion, rejectConversion,
  listPendingUSDCtoBOB, confirmUSDCtoBOB, rejectUSDCtoBOB,
  listAllConversions,
} from '../../../services/adminService'

// ── Tema admin ──────────────────────────────────────────────────────────────
const BG_CARD    = '#1A2340'
const BG_DEEP    = '#0F1628'
const BORDER     = '#263050'
const TEXT_SEC   = '#8A96B8'
const TEXT_MUTED = '#4E5A7A'
const SILVER     = '#C4CBD8'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtBOB  = n => `Bs. ${new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n ?? 0))}`
const fmtUSDC = n => `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n ?? 0))} USDC`
const fmtDate = d => d ? new Date(d).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

function DirBadge({ direction }) {
  const buy = direction === 'buy'
  return (
    <span className="text-[0.625rem] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={buy
        ? { background: '#22C55E1A', color: '#22C55E' }
        : { background: '#3B82F61A', color: '#60A5FA' }}>
      {buy ? 'BOB → USDC' : 'USDC → BOB'}
    </span>
  )
}

function StatusBadge({ status }) {
  const map = {
    pending:   { bg: '#C4CBD81A', text: '#C4CBD8', label: 'Pendiente' },
    completed: { bg: '#22C55E1A', text: '#22C55E', label: 'Completada' },
    failed:    { bg: '#EF44441A', text: '#F87171', label: 'Rechazada' },
  }
  const s = map[status] ?? { bg: '#4E5A7A1A', text: TEXT_SEC, label: status ?? '—' }
  return (
    <span className="text-[0.625rem] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.text }}>{s.label}</span>
  )
}

// ── Modal rechazar ──────────────────────────────────────────────────────────────
function RejectModal({ open, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget && !loading) onClose() }}>
      <div className="w-full max-w-[420px] rounded-2xl p-6 space-y-4"
        style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between">
          <h3 className="text-[1rem] font-bold text-white">Rechazar conversión</h3>
          {!loading && <button onClick={onClose} className="text-[#64748B] hover:text-white"><X size={18} /></button>}
        </div>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Motivo del rechazo (opcional)"
          rows={3}
          className="w-full text-white text-[0.875rem] rounded-xl px-3 py-2.5 resize-none focus:outline-none"
          style={{ background: BG_DEEP, border: `1px solid ${BORDER}` }}
        />
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-[0.875rem] font-bold text-white"
            style={{ background: BG_DEEP, border: `1px solid ${BORDER}` }}>
            Cancelar
          </button>
          <button onClick={() => onConfirm(reason)} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-[0.875rem] font-bold text-white flex items-center justify-center gap-2"
            style={{ background: '#EF4444' }}>
            {loading ? <Loader2 size={15} className="animate-spin" /> : 'Rechazar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────
export default function SwapsDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [toast, setToast]     = useState(null)

  const [swapRev, setSwapRev] = useState(null)

  // Spreads
  const [spread, setSpread]   = useState({ buy: '', sell: '', effBuy: null, effSell: null })
  const [savingSpread, setSavingSpread] = useState(false)

  // Cola pendientes (unificada)
  const [pending, setPending] = useState([])
  const [processing, setProcessing] = useState(null)   // wtxId en proceso
  const [rejectTarget, setRejectTarget] = useState(null) // { wtxId, direction }

  // Historial
  const [history, setHistory] = useState(null)
  const [filters, setFilters] = useState({ direction: '', status: '', from: '', to: '' })
  const [page, setPage] = useState(1)
  const limit = 25

  const showToast = (message, type = 'success') => {
    setToast({ message, type }); setTimeout(() => setToast(null), 3000)
  }

  const fetchHistory = useCallback(async (opts) => {
    const res = await listAllConversions({ ...opts, limit }).catch(() => null)
    if (res) setHistory(res)
  }, [])

  const fetchCore = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [rev, fees, pBuy, pSell] = await Promise.all([
        getSwapRevenue().catch(() => null),
        getWalletFees().catch(() => null),
        listPendingConversions().catch(() => ({ conversions: [] })),
        listPendingUSDCtoBOB().catch(() => ({ conversions: [] })),
      ])
      if (rev) setSwapRev(rev)
      if (fees) {
        setSpread({
          buy:  fees.convertBuySpreadPct  ?? '',
          sell: fees.convertSellSpreadPct ?? '',
          effBuy:  fees.effectiveConvertBuySpreadPct  ?? null,
          effSell: fees.effectiveConvertSellSpreadPct ?? null,
        })
      }
      const buy  = (pBuy?.conversions  ?? []).map(c => ({ ...c, _direction: 'buy' }))
      const sell = (pSell?.conversions ?? []).map(c => ({ ...c, _direction: 'sell' }))
      setPending([...buy, ...sell].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
    } catch (err) {
      setError(err.message || 'Error al cargar el dashboard de swaps.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCore(); fetchHistory({ page: 1 }) }, [fetchCore, fetchHistory])
  useEffect(() => { fetchHistory({ ...filters, page }) /* eslint-disable-next-line */ }, [page])

  async function saveSpread() {
    setSavingSpread(true)
    try {
      const payload = {
        convertBuySpreadPct:  spread.buy  === '' ? null : Number(spread.buy),
        convertSellSpreadPct: spread.sell === '' ? null : Number(spread.sell),
      }
      const updated = await updateWalletFees(payload)
      setSpread(s => ({
        ...s,
        buy:  updated.convertBuySpreadPct  ?? '',
        sell: updated.convertSellSpreadPct ?? '',
      }))
      showToast('Spreads actualizados.')
      getSwapRevenue().then(r => r && setSwapRev(r)).catch(() => {})
    } catch (err) {
      showToast(err.message || 'Error al guardar los spreads.', 'error')
    } finally {
      setSavingSpread(false)
    }
  }

  async function handleConfirm(c) {
    setProcessing(c.wtxId)
    try {
      if (c._direction === 'buy') await confirmConversion(c.wtxId)
      else                        await confirmUSDCtoBOB(c.wtxId)
      showToast('Conversión confirmada.')
      await Promise.all([fetchCore(), fetchHistory({ ...filters, page })])
    } catch (err) {
      showToast(err.data?.error || err.message || 'Error al confirmar.', 'error')
    } finally {
      setProcessing(null)
    }
  }

  async function handleReject(reason) {
    const c = rejectTarget
    setProcessing(c.wtxId)
    try {
      if (c.direction === 'buy') await rejectConversion(c.wtxId, reason)
      else                       await rejectUSDCtoBOB(c.wtxId, reason)
      setRejectTarget(null)
      showToast('Conversión rechazada.')
      await Promise.all([fetchCore(), fetchHistory({ ...filters, page })])
    } catch (err) {
      showToast(err.data?.error || err.message || 'Error al rechazar.', 'error')
    } finally {
      setProcessing(null)
    }
  }

  function applyFilters(e) {
    e?.preventDefault()
    if (page === 1) fetchHistory({ ...filters, page: 1 })
    else setPage(1)
  }

  const inputCls = 'text-white text-[0.875rem] rounded-xl px-3 py-2.5 focus:outline-none'
  const inputStyle = { background: BG_DEEP, border: `1px solid ${BORDER}` }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={26} className="animate-spin" style={{ color: SILVER }} />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowRightLeft size={22} style={{ color: SILVER }} />
          <h1 className="text-[1.25rem] font-bold text-white">Swaps BOB ⇄ USDC</h1>
        </div>
        <button onClick={() => { fetchCore(); fetchHistory({ ...filters, page }) }}
          className="flex items-center gap-2 text-[0.8125rem] font-semibold px-3 py-2 rounded-xl text-white"
          style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-[0.8125rem] rounded-xl px-4 py-3"
          style={{ background: '#EF44441A', color: '#F87171' }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* 1 — Ganancia */}
      <div className="rounded-2xl p-6 space-y-4" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2">
          <TrendingUp size={18} style={{ color: SILVER }} />
          <h2 className="text-[0.9375rem] font-bold text-white">Ganancia por spread</h2>
        </div>
        {swapRev ? (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="rounded-xl px-5 py-4" style={{ background: BG_DEEP, border: `1px solid ${BORDER}` }}>
                <p className="text-[0.75rem] font-medium mb-1" style={{ color: TEXT_MUTED }}>Ganancia total acumulada</p>
                <p className="text-[2rem] font-extrabold text-white tabular-nums leading-none">
                  {fmtBOB(swapRev.swapRevenueAccruedBob)}
                </p>
                <p className="text-[0.75rem] mt-1.5" style={{ color: TEXT_MUTED }}>
                  {swapRev.totals?.conversions ?? 0} conversiones
                </p>
              </div>
              {swapRev.verification && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.8125rem] font-semibold"
                  style={swapRev.verification.matches
                    ? { background: '#22C55E1A', color: '#22C55E' }
                    : { background: '#EF44441A', color: '#F87171' }}>
                  {swapRev.verification.matches
                    ? <><CheckCircle2 size={15} /> Integridad verificada</>
                    : <><AlertCircle size={15} /> Desajuste — revisar</>}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl px-4 py-3" style={{ background: BG_DEEP, border: `1px solid ${BORDER}` }}>
                <p className="text-[0.75rem] font-semibold mb-1" style={{ color: TEXT_SEC }}>Compra (BOB → USDC)</p>
                <p className="text-[1.25rem] font-extrabold text-white tabular-nums leading-none">{fmtBOB(swapRev.byDirection?.buy?.revenueBob)}</p>
                <p className="text-[0.75rem] mt-1" style={{ color: TEXT_MUTED }}>{swapRev.byDirection?.buy?.conversions ?? 0} conversiones</p>
              </div>
              <div className="rounded-xl px-4 py-3" style={{ background: BG_DEEP, border: `1px solid ${BORDER}` }}>
                <p className="text-[0.75rem] font-semibold mb-1" style={{ color: TEXT_SEC }}>Venta (USDC → BOB)</p>
                <p className="text-[1.25rem] font-extrabold text-white tabular-nums leading-none">{fmtBOB(swapRev.byDirection?.sell?.revenueBob)}</p>
                <p className="text-[0.75rem] mt-1" style={{ color: TEXT_MUTED }}>{swapRev.byDirection?.sell?.conversions ?? 0} conversiones</p>
              </div>
            </div>
          </div>
        ) : <p className="text-[0.8125rem]" style={{ color: TEXT_MUTED }}>Sin datos de ganancia aún.</p>}
      </div>

      {/* 2 — Spreads editables */}
      <div className="rounded-2xl p-6 space-y-4" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2">
          <Percent size={18} style={{ color: SILVER }} />
          <h2 className="text-[0.9375rem] font-bold text-white">Spreads de conversión</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[0.8125rem] font-medium" style={{ color: TEXT_SEC }}>Spread compra — BOB → USDC (%)</label>
            <input type="number" step="0.01" min="0" value={spread.buy}
              onChange={e => setSpread(s => ({ ...s, buy: e.target.value }))}
              placeholder="(usar default de entorno)"
              className={`w-full ${inputCls}`} style={inputStyle} />
            <p className="text-[0.6875rem]" style={{ color: TEXT_MUTED }}>
              Aplicado actual: {spread.effBuy != null ? `${spread.effBuy}%` : '—'} · vacío = default de entorno
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-[0.8125rem] font-medium" style={{ color: TEXT_SEC }}>Spread venta — USDC → BOB (%)</label>
            <input type="number" step="0.01" min="0" value={spread.sell}
              onChange={e => setSpread(s => ({ ...s, sell: e.target.value }))}
              placeholder="(usar default de entorno)"
              className={`w-full ${inputCls}`} style={inputStyle} />
            <p className="text-[0.6875rem]" style={{ color: TEXT_MUTED }}>
              Aplicado actual: {spread.effSell != null ? `${spread.effSell}%` : '—'} · vacío = default de entorno
            </p>
          </div>
        </div>
        <button onClick={saveSpread} disabled={savingSpread}
          className="flex items-center gap-2 text-[0.875rem] font-bold px-4 py-2.5 rounded-xl disabled:opacity-60"
          style={{ background: SILVER, color: '#0F1628' }}>
          {savingSpread ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Guardar spreads
        </button>
      </div>

      {/* 3 — Cola de pendientes */}
      <div className="rounded-2xl p-6 space-y-4" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2">
          <Clock size={18} style={{ color: SILVER }} />
          <h2 className="text-[0.9375rem] font-bold text-white">Conversiones pendientes</h2>
          <span className="text-[0.75rem] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: '#C4CBD81A', color: SILVER }}>
            {pending.length}
          </span>
        </div>
        {pending.length === 0 ? (
          <p className="text-[0.8125rem]" style={{ color: TEXT_MUTED }}>No hay conversiones pendientes.</p>
        ) : (
          <div className="space-y-3">
            {pending.map(c => {
              const m = c.metadata ?? {}
              const u = c.userId
              const busy = processing === c.wtxId
              return (
                <div key={c.wtxId} className="rounded-xl p-4" style={{ background: BG_DEEP, border: `1px solid ${BORDER}` }}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <DirBadge direction={c._direction} />
                      <span className="text-[0.6875rem] font-mono" style={{ color: TEXT_MUTED }}>{c.wtxId}</span>
                    </div>
                    <p className="text-[1rem] font-extrabold text-white tabular-nums">
                      {c._direction === 'buy'
                        ? `${fmtBOB(m.bobAmount ?? c.amount)} → ${fmtUSDC(m.usdcAmount)}`
                        : `${fmtUSDC(m.usdcAmount ?? c.amount)} → ${fmtBOB(m.bobAmount)}`}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[0.8125rem]" style={{ color: TEXT_SEC }}>
                      <span className="inline-flex items-center gap-1"><User size={12} />{u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email : '—'}</span>
                      <span className="mx-2" style={{ color: TEXT_MUTED }}>·</span>
                      <span style={{ color: TEXT_MUTED }}>{fmtDate(c.createdAt)}</span>
                      {m.bobPerUsdc ? <span style={{ color: TEXT_MUTED }}> · {Number(m.bobPerUsdc).toFixed(4)} BOB/USDC</span> : null}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleConfirm(c)} disabled={busy}
                        className="flex items-center gap-1.5 text-[0.75rem] font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
                        style={{ background: '#22C55E', color: '#0F1628' }}>
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Confirmar
                      </button>
                      <button onClick={() => setRejectTarget({ wtxId: c.wtxId, direction: c._direction })} disabled={busy}
                        className="flex items-center gap-1.5 text-[0.75rem] font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
                        style={{ background: '#EF44441A', color: '#F87171', border: '1px solid #EF444433' }}>
                        <X size={13} /> Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 4 — Historial */}
      <div className="rounded-2xl p-6 space-y-4" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2">
          <History size={18} style={{ color: SILVER }} />
          <h2 className="text-[0.9375rem] font-bold text-white">Historial de conversiones</h2>
          {history?.total != null && (
            <span className="text-[0.75rem] font-semibold px-2.5 py-0.5 rounded-full" style={{ background: '#C4CBD81A', color: SILVER }}>
              {history.total} total
            </span>
          )}
        </div>

        <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[0.6875rem] uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Dirección</label>
            <select value={filters.direction} onChange={e => setFilters(f => ({ ...f, direction: e.target.value }))} className={inputCls} style={inputStyle}>
              <option value="">Todas</option>
              <option value="buy">BOB → USDC</option>
              <option value="sell">USDC → BOB</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[0.6875rem] uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Estado</label>
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className={inputCls} style={inputStyle}>
              <option value="">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="completed">Completada</option>
              <option value="failed">Rechazada</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[0.6875rem] uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Desde</label>
            <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} className={inputCls} style={inputStyle} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[0.6875rem] uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Hasta</label>
            <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} className={inputCls} style={inputStyle} />
          </div>
          <button type="submit" className="text-[0.875rem] font-bold px-4 py-2.5 rounded-xl" style={{ background: SILVER, color: '#0F1628' }}>Filtrar</button>
        </form>

        {(history?.conversions?.length ?? 0) === 0 ? (
          <p className="text-[0.8125rem]" style={{ color: TEXT_MUTED }}>No hay conversiones para los filtros seleccionados.</p>
        ) : (
          <div className="space-y-2">
            {history.conversions.map(c => (
              <div key={c.wtxId} className="rounded-xl p-3 flex items-center justify-between gap-3"
                style={{ background: BG_DEEP, border: `1px solid ${BORDER}` }}>
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <DirBadge direction={c.direction} />
                  <StatusBadge status={c.status} />
                  <span className="text-[0.8125rem] font-semibold text-white truncate">
                    {c.direction === 'buy'
                      ? `${fmtBOB(c.bobAmount)} → ${fmtUSDC(c.usdcAmount)}`
                      : `${fmtUSDC(c.usdcAmount)} → ${fmtBOB(c.bobAmount)}`}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[0.75rem]" style={{ color: TEXT_SEC }}>
                    {c.usuario?.nombre || c.usuario?.email || '—'}
                  </p>
                  <p className="text-[0.6875rem]" style={{ color: TEXT_MUTED }}>{fmtDate(c.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {history?.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="text-[0.8125rem] font-semibold px-3 py-1.5 rounded-lg disabled:opacity-40"
              style={{ background: BG_DEEP, color: SILVER, border: `1px solid ${BORDER}` }}>Anterior</button>
            <span className="text-[0.8125rem]" style={{ color: TEXT_SEC }}>Página {page} de {history.totalPages}</span>
            <button onClick={() => setPage(p => Math.min(history.totalPages, p + 1))} disabled={page >= history.totalPages}
              className="text-[0.8125rem] font-semibold px-3 py-1.5 rounded-lg disabled:opacity-40"
              style={{ background: BG_DEEP, color: SILVER, border: `1px solid ${BORDER}` }}>Siguiente</button>
          </div>
        )}
      </div>

      <RejectModal
        open={!!rejectTarget}
        loading={!!processing}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[110] flex items-center gap-2 px-4 py-3 rounded-xl text-[0.875rem] font-semibold text-white shadow-lg"
          style={{ background: toast.type === 'error' ? '#EF4444' : '#22C55E' }}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {toast.message}
        </div>
      )}
    </div>
  )
}
