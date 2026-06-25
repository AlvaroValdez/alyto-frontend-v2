/**
 * BankMonitorPage.jsx — Monitoreo Bancario & Tesorería (Admin, bank-agnostic)
 *
 * Fase 1 read-only. Visibilidad de todo lo bancario (BANECO hoy):
 *   - Cobertura de tesorería: banco BOB + Stellar USDC vs Σ saldos de usuarios.
 *   - Saldo del banco en vivo (§8) + extracto de movimientos normalizado.
 *   - Resumen por usuario (saldos + acumulados + movimientos).
 *
 * Diseñado para escalar a otros bancos (un selector de cuenta los lista a todos).
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Landmark, RefreshCw, Loader, Search, ShieldCheck, AlertTriangle,
  ArrowDownLeft, ArrowUpRight, Wallet, TrendingUp, User, FlaskConical,
} from 'lucide-react'
import {
  getBanks, getBankBalance, getBankMovements, getTreasuryCoverage, getUserWalletSummary,
} from '../../../services/adminService'

// ── Helpers ─────────────────────────────────────────────────────────────────────

function fmt(n, dec = 2) {
  if (n == null || isNaN(n)) return '—'
  return Number(n).toLocaleString('es-CL', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function isoDay(d) { return d.toISOString().slice(0, 10) }

// ── Subcomponente: card de cobertura por activo ──────────────────────────────────

function CoverageCard({ title, flag, treasury, liabilities, ratio, surplus, dec = 2, asset }) {
  // Semáforo de cobertura: ≥1 cubierto, <1 sub-colateralizado, null sin pasivo.
  const covered = ratio == null ? null : ratio >= 1
  const tone = covered === null
    ? { color: '#8A96B8', bg: '#1A2340', border: '#263050', badge: 'Sin pasivo' }
    : covered
      ? { color: '#22C55E', bg: '#22C55E0A', border: '#22C55E40', badge: '✅ Cubierto' }
      : { color: '#EF4444', bg: '#EF44441A', border: '#EF444440', badge: '⚠️ Sub-colateralizado' }

  return (
    <div className="rounded-2xl p-5" style={{ background: tone.bg, border: `1px solid ${tone.border}` }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{flag}</span>
          <h3 className="text-[0.9375rem] font-bold text-white">{title}</h3>
        </div>
        <span className="text-[0.7rem] font-semibold px-2.5 py-1 rounded-full" style={{ background: `${tone.color}1A`, color: tone.color }}>
          {tone.badge}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3" style={{ background: '#0F1628', border: '1px solid #263050' }}>
          <p className="text-[0.65rem] uppercase tracking-wide text-[#8A96B8] mb-1">Tesorería</p>
          <p className="text-[1.25rem] font-extrabold text-white leading-none">
            {fmt(treasury?.available, dec)} <span className="text-[0.7rem] font-semibold text-[#8A96B8]">{asset}</span>
          </p>
          <p className="text-[0.65rem] text-[#4E5A7A] mt-1">fuente: {treasury?.source ?? '—'}{treasury?.mock ? ' · mock' : ''}</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: '#0F1628', border: '1px solid #263050' }}>
          <p className="text-[0.65rem] uppercase tracking-wide text-[#8A96B8] mb-1">Pasivo a usuarios</p>
          <p className="text-[1.25rem] font-extrabold text-white leading-none">
            {fmt(liabilities?.balance, dec)} <span className="text-[0.7rem] font-semibold text-[#8A96B8]">{asset}</span>
          </p>
          <p className="text-[0.65rem] text-[#4E5A7A] mt-1">{liabilities?.wallets ?? 0} wallets · congelado {fmt(liabilities?.frozen, dec)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid #263050' }}>
        <div>
          <p className="text-[0.65rem] text-[#8A96B8]">Cobertura</p>
          <p className="text-[1.05rem] font-bold" style={{ color: tone.color }}>
            {ratio == null ? '—' : `${(ratio * 100).toFixed(1)}%`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[0.65rem] text-[#8A96B8]">Excedente</p>
          <p className="text-[1.05rem] font-bold" style={{ color: surplus >= 0 ? '#22C55E' : '#EF4444' }}>
            {surplus == null ? '—' : `${surplus >= 0 ? '+' : ''}${fmt(surplus, dec)}`}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export default function BankMonitorPage() {
  const [banks, setBanks]       = useState([])
  const [activeCode, setActiveCode] = useState(null)
  const [coverage, setCoverage] = useState(null)
  const [balance, setBalance]   = useState(null)
  const [movements, setMovements] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError]       = useState(null)

  const today = new Date()
  const weekAgo = new Date(Date.now() - 7 * 86_400_000)
  const [from, setFrom] = useState(isoDay(weekAgo))
  const [to, setTo]     = useState(isoDay(today))

  // User lookup
  const [userId, setUserId]   = useState('')
  const [userSummary, setUserSummary] = useState(null)
  const [userLoading, setUserLoading] = useState(false)
  const [userError, setUserError] = useState(null)

  const loadAll = useCallback(async (code) => {
    try {
      const [cov, bal, mov] = await Promise.all([
        getTreasuryCoverage('SRL'),
        getBankBalance(code, true),
        getBankMovements(code, { from, to }),
      ])
      setCoverage(cov); setBalance(bal); setMovements(mov); setError(null)
    } catch (e) { setError(e.message) }
  }, [from, to])

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const { banks: list } = await getBanks()
        setBanks(list ?? [])
        const code = list?.[0]?.code ?? null
        setActiveCode(code)
        if (code) await loadAll(code)
      } catch (e) { setError(e.message) }
      finally { setLoading(false) }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refresh = async () => {
    if (!activeCode) return
    setRefreshing(true)
    await loadAll(activeCode)
    setRefreshing(false)
  }

  const lookupUser = async () => {
    if (!userId.trim()) return
    setUserLoading(true); setUserError(null); setUserSummary(null)
    try {
      const data = await getUserWalletSummary(userId.trim(), 25)
      setUserSummary(data)
    } catch (e) { setUserError(e.message) }
    finally { setUserLoading(false) }
  }

  const activeBank = banks.find(b => b.code === activeCode)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F1628' }}>
        <Loader className="animate-spin text-[#C4CBD8]" size={28} />
      </div>
    )
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-6" style={{ background: '#0F1628' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#1A2340', border: '1px solid #263050' }}>
              <Landmark size={20} className="text-[#C4CBD8]" />
            </div>
            <div>
              <h1 className="text-[1.35rem] font-bold text-white">Bancos & Tesorería</h1>
              <p className="text-[0.8125rem] text-[#8A96B8]">Saldos, movimientos y cobertura por usuario</p>
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.8125rem] font-semibold text-white transition-colors"
            style={{ background: '#1A2340', border: '1px solid #263050' }}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 mb-5 flex items-center gap-2" style={{ background: '#EF44441A', border: '1px solid #EF444440' }}>
            <AlertTriangle size={16} className="text-[#F87171]" />
            <p className="text-[0.8125rem] text-[#F87171]">{error}</p>
          </div>
        )}

        {/* Cobertura de tesorería */}
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={16} className="text-[#C4CBD8]" />
          <h2 className="text-[0.9375rem] font-bold text-white">Cobertura de tesorería</h2>
          <span className="text-[0.7rem] text-[#4E5A7A]">· actualizado {fmtDateTime(coverage?.checkedAt)}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">
          <CoverageCard title="BOB · Banco" flag="🇧🇴" asset="BOB" dec={2}
            treasury={coverage?.bob?.treasury} liabilities={coverage?.bob?.liabilities}
            ratio={coverage?.bob?.coverageRatio} surplus={coverage?.bob?.surplus} />
          <CoverageCard title="USDC · Stellar" flag="⭐" asset="USDC" dec={2}
            treasury={coverage?.usdc?.treasury} liabilities={coverage?.usdc?.liabilities}
            ratio={coverage?.usdc?.coverageRatio} surplus={coverage?.usdc?.surplus} />
        </div>

        {/* Selector de banco + saldo en vivo */}
        <div className="flex items-center gap-2 mb-3">
          <Wallet size={16} className="text-[#C4CBD8]" />
          <h2 className="text-[0.9375rem] font-bold text-white">Cuenta bancaria</h2>
          {banks.length > 1 && (
            <select
              value={activeCode ?? ''}
              onChange={(e) => { setActiveCode(e.target.value); loadAll(e.target.value) }}
              className="ml-2 text-[0.8125rem] rounded-lg px-3 py-1.5 text-white"
              style={{ background: '#1A2340', border: '1px solid #263050' }}
            >
              {banks.map(b => <option key={b.code} value={b.code}>{b.bankName} · {b.accountNumber}</option>)}
            </select>
          )}
        </div>

        <div className="rounded-2xl p-5 mb-7" style={{ background: '#1A2340', border: '1px solid #263050' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[1rem] font-bold text-white flex items-center gap-2">
                {activeBank?.bankName ?? '—'}
                {balance?.mock && (
                  <span className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: '#C4CBD81A', color: '#C4CBD8' }}>
                    <FlaskConical size={11} /> mock
                  </span>
                )}
              </p>
              <p className="text-[0.75rem] text-[#8A96B8]">Cuenta {activeBank?.accountNumber} · {balance?.status ?? '—'}</p>
            </div>
            <div className="flex gap-1.5">
              {(activeBank?.roles ?? []).map(r => (
                <span key={r} className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#263050', color: '#8A96B8' }}>{r}</span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Disponible', value: balance?.available, color: '#22C55E' },
              { label: 'Saldo', value: balance?.balance, color: '#FFFFFF' },
              { label: 'Reservado', value: balance?.reserved, color: '#FBBF24' },
              { label: 'Retenido', value: balance?.retained, color: '#8A96B8' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3" style={{ background: '#0F1628', border: '1px solid #263050' }}>
                <p className="text-[0.65rem] uppercase tracking-wide text-[#8A96B8] mb-1">{s.label}</p>
                <p className="text-[1.15rem] font-extrabold leading-none" style={{ color: s.color }}>
                  {fmt(s.value)} <span className="text-[0.65rem] font-semibold text-[#8A96B8]">{balance?.currency}</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Extracto de movimientos */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-[#C4CBD8]" />
            <h2 className="text-[0.9375rem] font-bold text-white">Extracto de movimientos</h2>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="text-[0.75rem] rounded-lg px-2.5 py-1.5 text-white" style={{ background: '#1A2340', border: '1px solid #263050' }} />
            <span className="text-[#4E5A7A] text-[0.75rem]">→</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="text-[0.75rem] rounded-lg px-2.5 py-1.5 text-white" style={{ background: '#1A2340', border: '1px solid #263050' }} />
            <button onClick={refresh} className="text-[0.75rem] font-semibold px-3 py-1.5 rounded-lg text-[#0F1628]" style={{ background: '#C4CBD8' }}>Ver</button>
          </div>
        </div>

        {movements?.totals && (
          <div className="flex gap-3 mb-3">
            <span className="text-[0.75rem] px-3 py-1.5 rounded-lg font-semibold" style={{ background: '#22C55E1A', color: '#22C55E' }}>
              ↓ {movements.totals.creditCount} créditos · {fmt(movements.totals.credits)}
            </span>
            <span className="text-[0.75rem] px-3 py-1.5 rounded-lg font-semibold" style={{ background: '#EF44441A', color: '#F87171' }}>
              ↑ {movements.totals.debitCount} débitos · {fmt(movements.totals.debits)}
            </span>
          </div>
        )}

        <div className="rounded-2xl overflow-hidden mb-8" style={{ background: '#1A2340', border: '1px solid #263050' }}>
          {(!movements?.movements?.length) ? (
            <div className="px-5 py-8 text-center text-[0.8125rem] text-[#8A96B8]">Sin movimientos en el rango.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid #263050' }}>
                  {['Fecha', 'Tipo', 'Monto', 'Documento', 'Descripción'].map(h => (
                    <th key={h} className="px-4 py-3 text-[0.7rem] uppercase tracking-wide text-[#8A96B8] font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.movements.map((m, i) => {
                  const credit = m.direction === 'credit'
                  return (
                    <tr key={m.externalTxId ?? i} style={{ borderBottom: '1px solid #1A2340' }} className="hover:bg-[#1F2B4D] transition-colors">
                      <td className="px-4 py-3 text-[0.8125rem] text-white whitespace-nowrap">{m.date} <span className="text-[#4E5A7A]">{m.time}</span></td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-[0.75rem] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: credit ? '#22C55E1A' : '#EF44441A', color: credit ? '#22C55E' : '#F87171' }}>
                          {credit ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                          {credit ? 'Crédito' : 'Débito'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[0.875rem] font-bold whitespace-nowrap" style={{ color: credit ? '#22C55E' : '#F87171' }}>
                        {credit ? '+' : '−'}{fmt(m.amount)} <span className="text-[0.65rem] text-[#8A96B8]">{m.currency}</span>
                      </td>
                      <td className="px-4 py-3 text-[0.75rem] text-[#8A96B8] whitespace-nowrap">{m.documentNumber ?? '—'}</td>
                      <td className="px-4 py-3 text-[0.8125rem] text-[#C4CBD8] max-w-xs truncate" title={m.note ?? ''}>{m.description ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Resumen por usuario */}
        <div className="flex items-center gap-2 mb-3">
          <User size={16} className="text-[#C4CBD8]" />
          <h2 className="text-[0.9375rem] font-bold text-white">Resumen por usuario</h2>
        </div>
        <div className="rounded-2xl p-5" style={{ background: '#1A2340', border: '1px solid #263050' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: '#0F1628', border: '1px solid #263050' }}>
              <Search size={15} className="text-[#4E5A7A]" />
              <input
                value={userId}
                onChange={e => setUserId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && lookupUser()}
                placeholder="ID de usuario (ObjectId)"
                className="flex-1 bg-transparent text-[0.8125rem] text-white outline-none placeholder:text-[#4E5A7A]"
              />
            </div>
            <button onClick={lookupUser} disabled={userLoading}
              className="px-4 py-2.5 rounded-xl text-[0.8125rem] font-bold text-[#0F1628]" style={{ background: '#C4CBD8' }}>
              {userLoading ? <Loader size={15} className="animate-spin" /> : 'Buscar'}
            </button>
          </div>

          {userError && <p className="text-[0.8125rem] text-[#F87171] mb-3">{userError}</p>}

          {userSummary && (
            <div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {['bob', 'usdc'].map(cur => {
                  const b = userSummary.balances?.[cur]
                  return (
                    <div key={cur} className="rounded-xl p-3" style={{ background: '#0F1628', border: '1px solid #263050' }}>
                      <p className="text-[0.65rem] uppercase tracking-wide text-[#8A96B8] mb-1">{cur.toUpperCase()}</p>
                      {b ? (
                        <>
                          <p className="text-[1.15rem] font-extrabold text-white leading-none">{fmt(b.balance, cur === 'usdc' ? 2 : 2)}</p>
                          <p className="text-[0.65rem] text-[#4E5A7A] mt-1">congelado {fmt(b.frozen)} · reservado {fmt(b.reserved)} · {b.status}</p>
                        </>
                      ) : <p className="text-[0.8125rem] text-[#4E5A7A]">sin wallet</p>}
                    </div>
                  )
                })}
              </div>

              {!!userSummary.movements?.length && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #263050' }}>
                  <table className="w-full text-left">
                    <thead>
                      <tr style={{ background: '#0F1628', borderBottom: '1px solid #263050' }}>
                        {['Fecha', 'Tipo', 'Moneda', 'Monto', 'Estado'].map(h => (
                          <th key={h} className="px-3 py-2 text-[0.65rem] uppercase tracking-wide text-[#8A96B8] font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {userSummary.movements.map((m, i) => (
                        <tr key={m._id ?? i} style={{ borderBottom: '1px solid #1A2340' }}>
                          <td className="px-3 py-2 text-[0.75rem] text-white whitespace-nowrap">{fmtDateTime(m.createdAt)}</td>
                          <td className="px-3 py-2 text-[0.75rem] text-[#C4CBD8]">{m.type}</td>
                          <td className="px-3 py-2 text-[0.75rem] text-[#8A96B8]">{m.currency}</td>
                          <td className="px-3 py-2 text-[0.8125rem] font-bold text-white whitespace-nowrap">{fmt(m.amount)}</td>
                          <td className="px-3 py-2">
                            <span className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: m.status === 'completed' ? '#22C55E1A' : '#C4CBD81A', color: m.status === 'completed' ? '#22C55E' : '#C4CBD8' }}>
                              {m.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
