/**
 * AccountingPage.jsx — Libro Mayor / Contabilidad (Fase 3)
 *
 * Reportes contables derivados del GL: reconciliación (GL vs wallets vs on-chain),
 * balance de comprobación, balance general, estado de resultados (P&L) y estado de
 * cuenta de tesorería con saldo corriente. Distinto del Ledger de transacciones
 * (/admin/ledger) — este es la capa contable de doble entrada.
 *
 * Requiere LEDGER_POSTING_ENABLED en el backend; si está apagado los endpoints
 * devuelven 404 y la página lo indica. Solo lectura salvo el botón "Sincronizar".
 */

import { useState, useEffect, useCallback } from 'react'
import {
  BookText, RefreshCw, Loader, AlertTriangle, Scale, ClipboardCheck,
  TrendingUp, Landmark, CheckCircle2, PlayCircle, Lock,
} from 'lucide-react'
import {
  getLedgerReconciliation, getLedgerTrialBalance, getLedgerBalanceSheet,
  getLedgerPnl, getLedgerTreasury, runLedgerSync,
  getLedgerClosedThrough, closeLedgerPeriod,
} from '../../../services/adminService'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n, dec = 2) {
  if (n == null || isNaN(n)) return '—'
  return Number(n).toLocaleString('es-BO', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function monthStart() {
  const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}
function todayStr() { return new Date().toISOString().slice(0, 10) }

const OK = '#22C55E', BAD = '#EF4444', SILVER = '#C4CBD8'

function Card({ children, style }) {
  return <div className="rounded-2xl p-5" style={{ background: '#1A2340', border: '1px solid #263050', ...style }}>{children}</div>
}
function SectionTitle({ icon: Icon, children, right }) {
  return (
    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-[#C4CBD8]" />
        <h2 className="text-[0.9375rem] font-bold text-white">{children}</h2>
      </div>
      {right}
    </div>
  )
}
function Pill({ ok, okLabel = 'Cuadrado', badLabel = 'Descuadre' }) {
  return (
    <span className="text-[0.7rem] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1"
      style={{ background: ok ? '#22C55E1A' : '#EF44441A', color: ok ? OK : '#F87171' }}>
      {ok ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}{ok ? okLabel : badLabel}
    </span>
  )
}
const th = 'px-3 py-2 text-[0.65rem] uppercase tracking-wide text-[#8A96B8] font-semibold whitespace-nowrap'
const td = 'px-3 py-2 text-[0.75rem] text-white whitespace-nowrap'

// Cuentas ofrecidas en el estado de cuenta (tesorería + pasivos de usuarios).
const STATEMENT_ACCOUNTS = [
  ['1010', 'Tesorería USDC on-chain'], ['1020', 'Custodia USDC usuarios'],
  ['1030', 'Caja/Banco BOB'], ['1040', 'Vita Wallet (USD)'],
  ['1050', 'USDC en tránsito Harbor'], ['1090', 'Clearing de conversión'],
  ['2010', 'Saldos BOB usuarios'], ['2020', 'Saldos USDC usuarios'],
]

export default function AccountingPage() {
  const [recon, setRecon]     = useState(null)
  const [trial, setTrial]     = useState(null)
  const [balance, setBalance] = useState(null)
  const [pnl, setPnl]         = useState(null)
  const [stmt, setStmt]       = useState(null)
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError]     = useState(null)
  const [disabled, setDisabled] = useState(false)

  const [pnlFrom, setPnlFrom] = useState(monthStart())
  const [pnlTo, setPnlTo]     = useState(todayStr())
  const [stmtAcct, setStmtAcct] = useState('1030')
  const [closedThrough, setClosedThrough] = useState(null)
  const [closing, setClosing] = useState(false)

  const loadCore = useCallback(async () => {
    try {
      const [r, t, b, c] = await Promise.all([
        getLedgerReconciliation(), getLedgerTrialBalance(), getLedgerBalanceSheet(), getLedgerClosedThrough(),
      ])
      setRecon(r); setTrial(t); setBalance(b); setClosedThrough(c?.closedThrough ?? null); setError(null); setDisabled(false)
    } catch (e) {
      if (e.status === 404) setDisabled(true)
      else setError(e.message)
    }
  }, [])

  const doClose = async () => {
    const asOf = todayStr()
    if (!window.confirm(`¿Cerrar el período contable al ${asOf}? El resultado (ingreso − gasto) se traslada a Resultados acumulados y se bloquea el retro-posteo con fecha ≤ ${asOf}. Esta acción no se deshace.`)) return
    setClosing(true)
    try { await closeLedgerPeriod(asOf); await refresh() }
    catch (e) { setError(e.message) }
    finally { setClosing(false) }
  }

  const loadPnl = useCallback(async (from, to) => {
    try { setPnl(await getLedgerPnl(from, to)) } catch (e) { if (e.status !== 404) setError(e.message) }
  }, [])
  const loadStmt = useCallback(async (acct) => {
    try { setStmt(await getLedgerTreasury(acct)) } catch (e) { if (e.status !== 404) setError(e.message) }
  }, [])

  useEffect(() => {
    (async () => {
      setLoading(true)
      await loadCore()
      await Promise.all([loadPnl(pnlFrom, pnlTo), loadStmt(stmtAcct)])
      setLoading(false)
    })()
  }, [loadCore, loadPnl, loadStmt]) // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = async () => {
    setRefreshing(true)
    await Promise.all([loadCore(), loadPnl(pnlFrom, pnlTo), loadStmt(stmtAcct)])
    setRefreshing(false)
  }
  const doSync = async () => {
    setSyncing(true)
    try { await runLedgerSync(); await refresh() }
    catch (e) { setError(e.message) }
    finally { setSyncing(false) }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F1628' }}>
      <Loader className="animate-spin text-[#C4CBD8]" size={28} />
    </div>
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-6" style={{ background: '#0F1628' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#1A2340', border: '1px solid #263050' }}>
              <BookText size={20} className="text-[#C4CBD8]" />
            </div>
            <div>
              <h1 className="text-[1.35rem] font-bold text-white">Libro Mayor · Contabilidad</h1>
              <p className="text-[0.8125rem] text-[#8A96B8]">Reconciliación, balance general, resultados y estados de cuenta</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={doSync} disabled={syncing || disabled}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.8125rem] font-semibold text-[#0F1628]"
              style={{ background: SILVER }}>
              {syncing ? <Loader size={15} className="animate-spin" /> : <PlayCircle size={15} />}Sincronizar
            </button>
            <button onClick={refresh} disabled={refreshing || disabled}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.8125rem] font-semibold text-white"
              style={{ background: '#1A2340', border: '1px solid #263050' }}>
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />Actualizar
            </button>
          </div>
        </div>

        {disabled && (
          <div className="rounded-xl px-4 py-3 mb-5 flex items-start gap-2.5" style={{ background: '#F59E0B0F', border: '1px solid #FBBF2440' }}>
            <AlertTriangle size={18} className="text-[#FBBF24] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[0.8125rem] font-bold text-[#FBBF24]">Libro Mayor deshabilitado en el backend</p>
              <p className="text-[0.75rem] text-[#C4CBD8]">Habilitar con LEDGER_POSTING_ENABLED y postear el asiento de apertura (ledger:opening).</p>
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-xl px-4 py-3 mb-5 flex items-center gap-2" style={{ background: '#EF44441A', border: '1px solid #EF444440' }}>
            <AlertTriangle size={16} className="text-[#F87171]" /><p className="text-[0.8125rem] text-[#F87171]">{error}</p>
          </div>
        )}

        {!disabled && (
          <>
            {/* Cierre de período */}
            <div className="rounded-xl px-4 py-3 mb-6 flex items-center justify-between flex-wrap gap-3"
              style={{ background: '#1A2340', border: '1px solid #263050' }}>
              <div className="flex items-center gap-2.5">
                <Lock size={16} className="text-[#C4CBD8]" />
                <span className="text-[0.8125rem] text-[#C4CBD8]">
                  Período cerrado hasta:{' '}
                  <span className="font-bold text-white">{closedThrough ? new Date(closedThrough).toISOString().slice(0, 10) : '— (abierto)'}</span>
                </span>
              </div>
              <button onClick={doClose} disabled={closing}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[0.8125rem] font-semibold text-white"
                style={{ background: '#0F1628', border: '1px solid #263050' }}>
                {closing ? <Loader size={14} className="animate-spin" /> : <Lock size={14} />}Cerrar período al {todayStr()}
              </button>
            </div>

            {/* Reconciliación */}
            <SectionTitle icon={ClipboardCheck} right={<Pill ok={recon?.controlOk} okLabel="Reconciliado" badLabel="Con desvíos" />}>
              Reconciliación (GL vs wallets vs on-chain)
            </SectionTitle>
            <Card style={{ marginBottom: 28 }}>
              <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid #263050' }}>
                <table className="w-full text-left">
                  <thead><tr style={{ background: '#0F1628', borderBottom: '1px solid #263050' }}>
                    {['Cuenta', 'Campo', 'GL', 'Real', 'Δ', ''].map((h, i) => <th key={i} className={th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {(recon?.control ?? []).map((c) => (
                      <tr key={c.account + c.field} style={{ borderBottom: '1px solid #1A2340' }}>
                        <td className={td}>{c.account} <span className="text-[#8A96B8]">{c.currency}</span></td>
                        <td className={`${td} text-[#C4CBD8]`}>{c.field}</td>
                        <td className={td}>{fmt(c.gl)}</td>
                        <td className={td}>{fmt(c.actual)}</td>
                        <td className={td} style={{ color: c.ok ? OK : BAD }}>{fmt(c.delta)}</td>
                        <td className={td}>{c.ok ? <CheckCircle2 size={14} className="text-[#22C55E]" /> : <AlertTriangle size={14} className="text-[#F87171]" />}</td>
                      </tr>
                    ))}
                    {(recon?.onchain ?? []).map((o) => (
                      <tr key={o.account} style={{ borderBottom: '1px solid #1A2340', background: '#0F162880' }}>
                        <td className={td}>{o.account} <span className="text-[#8A96B8]">{o.currency}</span></td>
                        <td className={`${td} text-[#C4CBD8]`}>on-chain</td>
                        <td className={td}>{fmt(o.gl)}</td>
                        <td className={td}>{o.actual == null ? '—' : fmt(o.actual)}</td>
                        <td className={td} style={{ color: o.ok == null ? '#8A96B8' : (o.ok ? OK : BAD) }}>{o.delta == null ? '—' : fmt(o.delta)}</td>
                        <td className={td}>{o.ok == null ? <span className="text-[#4E5A7A] text-[0.65rem]">s/dato</span> : (o.ok ? <CheckCircle2 size={14} className="text-[#22C55E]" /> : <AlertTriangle size={14} className="text-[#F87171]" />)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Balance de comprobación */}
            <SectionTitle icon={Scale} right={<Pill ok={trial?.allBalanced} />}>Balance de comprobación</SectionTitle>
            <Card style={{ marginBottom: 28 }}>
              <div className="flex flex-wrap gap-3 mb-4">
                {(trial?.balanced ?? []).map((b) => (
                  <div key={b.currency} className="rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: '#0F1628', border: '1px solid #263050' }}>
                    <span className="text-[0.75rem] font-bold text-white">{b.currency}</span>
                    <span className="text-[0.7rem] text-[#8A96B8]">D {fmt(b.debit)} · H {fmt(b.credit)}</span>
                    {b.ok ? <CheckCircle2 size={13} className="text-[#22C55E]" /> : <span className="text-[#F87171] text-[0.7rem]">Δ {fmt(b.diff)}</span>}
                  </div>
                ))}
              </div>
              <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid #263050' }}>
                <table className="w-full text-left">
                  <thead><tr style={{ background: '#0F1628', borderBottom: '1px solid #263050' }}>
                    {['Cuenta', 'Moneda', 'Débito', 'Crédito', 'Saldo'].map((h) => <th key={h} className={th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {(trial?.rows ?? []).map((r) => (
                      <tr key={r.account + r.currency} style={{ borderBottom: '1px solid #1A2340' }}>
                        <td className={td}>{r.account}</td>
                        <td className={`${td} text-[#8A96B8]`}>{r.currency}</td>
                        <td className={td}>{fmt(r.debit)}</td>
                        <td className={td}>{fmt(r.credit)}</td>
                        <td className={`${td} font-bold`}>{fmt(r.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Balance general */}
            <SectionTitle icon={Scale}>Balance general</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">
              {Object.entries(balance?.byCurrency ?? {}).map(([cur, bs]) => (
                <Card key={cur}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[0.9375rem] font-bold text-white">{cur}</h3>
                    <Pill ok={bs.balanced} />
                  </div>
                  <p className="text-[0.65rem] uppercase tracking-wide text-[#8A96B8] mb-1">Activo</p>
                  {bs.assets.map((a) => (
                    <div key={a.account} className="flex justify-between text-[0.75rem] text-[#C4CBD8]">
                      <span>{a.account} {a.name}</span><span className="text-white font-semibold">{fmt(a.balance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-[0.75rem] font-bold text-white border-t mt-1 pt-1" style={{ borderColor: '#263050' }}>
                    <span>Total activo</span><span>{fmt(bs.totalAssets)}</span>
                  </div>
                  <p className="text-[0.65rem] uppercase tracking-wide text-[#8A96B8] mb-1 mt-3">Pasivo + Patrimonio</p>
                  {bs.liabilities.map((l) => (
                    <div key={l.account} className="flex justify-between text-[0.75rem] text-[#C4CBD8]">
                      <span>{l.account} {l.name}</span><span className="text-white font-semibold">{fmt(l.balance)}</span>
                    </div>
                  ))}
                  {bs.equity.map((e) => (
                    <div key={e.account} className="flex justify-between text-[0.75rem] text-[#C4CBD8]">
                      <span>{e.account} {e.name}</span><span className="text-white font-semibold">{fmt(e.balance)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-[0.75rem] text-[#C4CBD8]">
                    <span>Resultado del período</span>
                    <span className="font-semibold" style={{ color: bs.result >= 0 ? OK : BAD }}>{fmt(bs.result)}</span>
                  </div>
                  <div className="flex justify-between text-[0.75rem] font-bold text-white border-t mt-1 pt-1" style={{ borderColor: '#263050' }}>
                    <span>Total pasivo + patrimonio</span><span>{fmt(bs.liabPlusEquity)}</span>
                  </div>
                </Card>
              ))}
            </div>

            {/* Estado de resultados (P&L) */}
            <SectionTitle icon={TrendingUp} right={
              <div className="flex items-center gap-2">
                <input type="date" value={pnlFrom} onChange={(e) => setPnlFrom(e.target.value)}
                  className="text-[0.7rem] rounded-lg px-2 py-1" style={{ background: '#1A2340', border: '1px solid #263050', color: '#C4CBD8' }} />
                <input type="date" value={pnlTo} onChange={(e) => setPnlTo(e.target.value)}
                  className="text-[0.7rem] rounded-lg px-2 py-1" style={{ background: '#1A2340', border: '1px solid #263050', color: '#C4CBD8' }} />
                <button onClick={() => loadPnl(pnlFrom, pnlTo)}
                  className="text-[0.7rem] font-bold px-2.5 py-1 rounded-lg text-[#0F1628]" style={{ background: SILVER }}>Aplicar</button>
              </div>
            }>Estado de resultados (P&amp;L)</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">
              {Object.keys(pnl?.byCurrency ?? {}).length === 0 ? (
                <Card><p className="text-[0.8125rem] text-[#8A96B8]">Sin ingresos ni gastos en el período seleccionado.</p></Card>
              ) : Object.entries(pnl?.byCurrency ?? {}).map(([cur, p]) => (
                <Card key={cur}>
                  <h3 className="text-[0.9375rem] font-bold text-white mb-2">{cur}</h3>
                  <p className="text-[0.65rem] uppercase tracking-wide text-[#8A96B8] mb-1">Ingresos</p>
                  {p.income.map((i) => (
                    <div key={i.account} className="flex justify-between text-[0.75rem] text-[#C4CBD8]"><span>{i.name}</span><span className="text-white">{fmt(i.amount)}</span></div>
                  ))}
                  <p className="text-[0.65rem] uppercase tracking-wide text-[#8A96B8] mb-1 mt-2">Gastos</p>
                  {p.expense.map((x) => (
                    <div key={x.account} className="flex justify-between text-[0.75rem] text-[#C4CBD8]"><span>{x.name}</span><span className="text-white">{fmt(x.amount)}</span></div>
                  ))}
                  <div className="flex justify-between text-[0.8125rem] font-bold border-t mt-2 pt-2" style={{ borderColor: '#263050' }}>
                    <span className="text-white">Resultado neto</span>
                    <span style={{ color: p.netResult >= 0 ? OK : BAD }}>{fmt(p.netResult)}</span>
                  </div>
                </Card>
              ))}
            </div>

            {/* Estado de cuenta */}
            <SectionTitle icon={Landmark} right={
              <select value={stmtAcct} onChange={(e) => { setStmtAcct(e.target.value); loadStmt(e.target.value) }}
                className="text-[0.75rem] font-semibold rounded-lg px-2.5 py-1.5"
                style={{ background: '#1A2340', border: '1px solid #263050', color: '#C4CBD8', outline: 'none' }}>
                {STATEMENT_ACCOUNTS.map(([code, name]) => <option key={code} value={code}>{code} — {name}</option>)}
              </select>
            }>Estado de cuenta {stmt?.currency ? `(${stmt.currency})` : ''}</SectionTitle>
            <Card style={{ marginBottom: 32 }}>
              {!(stmt?.movements?.length) ? (
                <p className="text-[0.8125rem] text-[#8A96B8]">Sin movimientos en {stmt?.name ?? 'esta cuenta'}.</p>
              ) : (
                <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid #263050' }}>
                  <table className="w-full text-left">
                    <thead><tr style={{ background: '#0F1628', borderBottom: '1px solid #263050' }}>
                      {['Fecha', 'Descripción', 'Débito', 'Crédito', 'Saldo'].map((h) => <th key={h} className={th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {stmt.movements.map((m, i) => (
                        <tr key={m.entryId + i} style={{ borderBottom: '1px solid #1A2340' }}>
                          <td className={`${td} text-[#8A96B8]`}>{fmtDateTime(m.date)}</td>
                          <td className={`${td} text-[#C4CBD8] max-w-[240px] whitespace-normal`}>{m.description || '—'}</td>
                          <td className={td}>{m.debit ? fmt(m.debit) : '—'}</td>
                          <td className={td}>{m.credit ? fmt(m.credit) : '—'}</td>
                          <td className={`${td} font-bold`}>{fmt(m.running)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
