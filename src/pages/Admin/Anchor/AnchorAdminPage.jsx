/**
 * AnchorAdminPage.jsx — AnchorAdmin, Fase 1 (observabilidad, solo lectura)
 *
 * Panel interno del Stellar Anchor. Responde en pantalla las tres preguntas del
 * módulo: ¿está sano el anchor? ¿cuadran las cuentas? Cubre los módulos:
 *   4.2 listener de Horizon · 4.3 tesorería on-chain · 4.4 reconciliación · 4.5 solvencia
 *
 * Solo lectura. Requiere ANCHOR_ADMIN_ENABLED=true en el backend (si está apagado
 * los endpoints devuelven 404 y la página lo indica). Nunca muestra secretKeys.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Radio, RefreshCw, Loader, AlertTriangle, Activity, Coins, Scale,
  Fuel, ExternalLink, CheckCircle2, ShieldCheck,
} from 'lucide-react'
import {
  getAnchorListener, getAnchorTreasury, getAnchorReconciliation, getAnchorSolvency,
} from '../../../services/adminService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n, dec = 2) {
  if (n == null || isNaN(n)) return '—'
  return Number(n).toLocaleString('es-CL', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-BO', { timeZone: 'America/La_Paz', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function shortKey(k) {
  if (!k) return '—'
  return `${k.slice(0, 6)}…${k.slice(-6)}`
}

// Semáforo de salud (verde/ámbar/rojo/desconocido)
const HEALTH = {
  green:   { color: '#22C55E', bg: '#22C55E0A', border: '#22C55E40', label: 'Operativo' },
  amber:   { color: '#FBBF24', bg: '#F59E0B0F', border: '#FBBF2440', label: 'Con retraso' },
  red:     { color: '#EF4444', bg: '#EF44441A', border: '#EF444440', label: 'Caído' },
  unknown: { color: '#8A96B8', bg: '#1A2340',   border: '#263050',   label: 'Sin dato' },
}

function StatDot({ tone }) {
  return <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: tone.color, boxShadow: `0 0 8px ${tone.color}` }} />
}

function Card({ children, style }) {
  return <div className="rounded-2xl p-5" style={{ background: '#1A2340', border: '1px solid #263050', ...style }}>{children}</div>
}

function Metric({ label, value, unit, color = '#FFFFFF', sub }) {
  return (
    <div className="rounded-xl p-3" style={{ background: '#0F1628', border: '1px solid #263050' }}>
      <p className="text-[0.65rem] uppercase tracking-wide text-[#8A96B8] mb-1">{label}</p>
      <p className="text-[1.15rem] font-extrabold leading-none" style={{ color }}>
        {value} {unit && <span className="text-[0.65rem] font-semibold text-[#8A96B8]">{unit}</span>}
      </p>
      {sub && <p className="text-[0.6rem] text-[#4E5A7A] mt-1">{sub}</p>}
    </div>
  )
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

// ── Página ──────────────────────────────────────────────────────────────────────

export default function AnchorAdminPage() {
  const [listener, setListener] = useState(null)
  const [treasury, setTreasury] = useState(null)
  const [solvency, setSolvency] = useState(null)
  const [recon, setRecon]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [reconLoading, setReconLoading] = useState(false)
  const [error, setError]       = useState(null)
  const [disabled, setDisabled] = useState(false)   // ANCHOR_ADMIN_ENABLED apagado

  const loadCore = useCallback(async () => {
    try {
      const [l, t, s] = await Promise.all([getAnchorListener(), getAnchorTreasury(), getAnchorSolvency()])
      setListener(l); setTreasury(t); setSolvency(s); setError(null); setDisabled(false)
    } catch (e) {
      // 404 = el módulo está apagado en el backend (feature flag off)
      if (/404|not found/i.test(e.message)) setDisabled(true)
      else setError(e.message)
    }
  }, [])

  const loadRecon = useCallback(async () => {
    setReconLoading(true)
    try { setRecon(await getAnchorReconciliation(500)) }
    catch (e) { if (!/404/i.test(e.message)) setError(e.message) }
    finally { setReconLoading(false) }
  }, [])

  useEffect(() => {
    (async () => { setLoading(true); await loadCore(); setLoading(false) })()
  }, [loadCore])

  const refresh = async () => { setRefreshing(true); await loadCore(); setRefreshing(false) }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F1628' }}>
        <Loader className="animate-spin text-[#C4CBD8]" size={28} />
      </div>
    )
  }

  const lt = HEALTH[listener?.health] ?? HEALTH.unknown
  const channel = treasury?.channelAccount
  const srl = treasury?.srl

  return (
    <div className="min-h-screen px-4 md:px-8 py-6" style={{ background: '#0F1628' }}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#1A2340', border: '1px solid #263050' }}>
              <Radio size={20} className="text-[#C4CBD8]" />
            </div>
            <div>
              <h1 className="text-[1.35rem] font-bold text-white">Anchor · Salud & Cuadre</h1>
              <p className="text-[0.8125rem] text-[#8A96B8]">Listener, tesorería on-chain, reconciliación y solvencia</p>
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing || disabled}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.8125rem] font-semibold text-white transition-colors"
            style={{ background: '#1A2340', border: '1px solid #263050' }}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>

        {/* Módulo apagado en el backend */}
        {disabled && (
          <div className="rounded-xl px-4 py-3 mb-5 flex items-start gap-2.5" style={{ background: '#F59E0B0F', border: '1px solid #FBBF2440' }}>
            <AlertTriangle size={18} className="text-[#FBBF24] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[0.8125rem] font-bold text-[#FBBF24]">AnchorAdmin deshabilitado en el backend</p>
              <p className="text-[0.75rem] text-[#C4CBD8]">Habilitar con la variable de entorno ANCHOR_ADMIN_ENABLED=true y redesplegar.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl px-4 py-3 mb-5 flex items-center gap-2" style={{ background: '#EF44441A', border: '1px solid #EF444440' }}>
            <AlertTriangle size={16} className="text-[#F87171]" />
            <p className="text-[0.8125rem] text-[#F87171]">{error}</p>
          </div>
        )}

        {!disabled && (
          <>
            {/* 4.2 — Listener */}
            <SectionTitle icon={Activity} right={
              <span className="text-[0.7rem] text-[#4E5A7A]">último ciclo {fmtDateTime(listener?.lastCycle?.at)}</span>
            }>Listener de pagos (Horizon)</SectionTitle>

            <div className="rounded-2xl p-5 mb-7" style={{ background: lt.bg, border: `1px solid ${lt.border}` }}>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <StatDot tone={lt} />
                  <span className="text-[1rem] font-bold text-white">{lt.label}</span>
                  <span className="text-[0.7rem] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#26305080', color: '#8A96B8' }}>
                    modo {listener?.mode ?? '—'}
                  </span>
                </div>
                {listener?.horizon?.reachable === false && (
                  <span className="text-[0.75rem] font-semibold text-[#F87171]">Horizon inalcanzable</span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Metric label="Sin latido hace" value={listener?.secondsSinceHeartbeat ?? '—'} unit="s"
                  color={lt.color} sub={`${listener?.missedCycles ?? 0} ciclos perdidos`} />
                <Metric label="Intervalo" value={Math.round((listener?.intervalMs ?? 0) / 1000)} unit="s" />
                <Metric label="Último ledger" value={listener?.horizon?.latestLedger ?? '—'}
                  sub={listener?.horizon?.secondsBehind != null ? `${listener.horizon.secondsBehind}s atrás` : null} />
                <Metric label="Direcciones vigiladas" value={listener?.watchedCustodialAddresses ?? '—'} />
              </div>
              {listener?.lastCycle?.stats && (
                <p className="text-[0.65rem] text-[#4E5A7A] mt-3">
                  último ciclo: {listener.lastCycle.stats.credited ?? 0} acreditados · {listener.lastCycle.stats.skipped ?? 0} idempotentes · {listener.lastCycle.stats.errors ?? 0} errores
                </p>
              )}
            </div>

            {/* 4.3 — Tesorería on-chain */}
            <SectionTitle icon={Coins}>Tesorería on-chain</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">
              {/* SRL */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⭐</span>
                    <h3 className="text-[0.9375rem] font-bold text-white">Cuenta SRL</h3>
                  </div>
                  {srl?.usdcTrustline != null && (
                    <span className="text-[0.7rem] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1"
                      style={{ background: srl.usdcTrustline ? '#22C55E1A' : '#EF44441A', color: srl.usdcTrustline ? '#22C55E' : '#F87171' }}>
                      {srl.usdcTrustline ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                      trustline USDC
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="USDC" value={fmt(srl?.usdcBalance)} unit="USDC" />
                  <Metric label="XLM" value={fmt(srl?.xlmBalance, 4)} unit="XLM"
                    color={srl?.xlmLow ? '#FBBF24' : '#FFFFFF'} sub={srl?.xlmLow ? 'saldo bajo' : null} />
                </div>
                <p className="text-[0.6rem] text-[#4E5A7A] mt-3 font-mono">{shortKey(srl?.publicKey)}</p>
              </Card>

              {/* Channel account */}
              <Card style={channel?.critical ? { background: '#EF44441A', border: '1px solid #EF444440' } : undefined}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Fuel size={17} className={channel?.critical ? 'text-[#F87171]' : 'text-[#C4CBD8]'} />
                    <h3 className="text-[0.9375rem] font-bold text-white">Channel account (Fee Bump)</h3>
                  </div>
                  {channel?.critical && (
                    <span className="text-[0.7rem] font-bold px-2.5 py-1 rounded-full" style={{ background: '#EF44441A', color: '#F87171' }}>
                      🚨 XLM crítico
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="XLM" value={fmt(channel?.xlmBalance, 4)} unit="XLM"
                    color={channel?.xlmLow ? '#EF4444' : '#22C55E'} />
                  <Metric label="Umbral" value={fmt(channel?.lowThreshold, 0)} unit="XLM" />
                </div>
                <p className="text-[0.6rem] text-[#4E5A7A] mt-3">
                  Punto único de falla: si se agota, el Fee Bump falla y todos los pagos se detienen.
                </p>
                <p className="text-[0.6rem] text-[#4E5A7A] mt-1 font-mono">{shortKey(channel?.publicKey)}</p>
              </Card>
            </div>

            {/* 4.5 — Solvencia */}
            <SectionTitle icon={Scale} right={
              <span className="text-[0.7rem] text-[#4E5A7A]">corte {fmtDateTime(solvency?.cutAt)}</span>
            }>Reservas vs pasivos (solvencia)</SectionTitle>
            <div className="rounded-2xl p-5 mb-7"
              style={{
                background: solvency?.status === 'covered' ? '#22C55E0A' : '#EF44441A',
                border: `1px solid ${solvency?.status === 'covered' ? '#22C55E40' : '#EF444440'}`,
              }}>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <span className="text-[0.7rem] font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1"
                  style={{ background: solvency?.status === 'covered' ? '#22C55E1A' : '#EF44441A', color: solvency?.status === 'covered' ? '#22C55E' : '#F87171' }}>
                  <ShieldCheck size={12} />
                  {solvency?.status === 'covered' ? 'Cubierto' : 'Sub-colateralizado'}
                </span>
                {solvency?.reliable === false && (
                  <span className="text-[0.7rem] text-[#FBBF24]">⚠️ reserva subestimada ({solvency?.reserveFetchErrors} errores de fetch)</span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Metric label="Pasivo (saldos usuarios)" value={fmt(solvency?.liabilitiesUSDC)} unit="USDC" />
                <Metric label="Reserva (USDC on-chain)" value={fmt(solvency?.reservesUSDC)} unit="USDC" />
                <Metric label={solvency?.differenceUSDC >= 0 ? 'Excedente' : 'Déficit'}
                  value={`${solvency?.differenceUSDC >= 0 ? '+' : ''}${fmt(solvency?.differenceUSDC)}`} unit="USDC"
                  color={solvency?.differenceUSDC >= 0 ? '#22C55E' : '#EF4444'} />
              </div>
              <p className="text-[0.6rem] text-[#4E5A7A] mt-3">
                {solvency?.custodialAddresses ?? 0} direcciones custodiales · {solvency?.walletCount ?? 0} wallets. Identidad contable (pasivo = balance + congelado) pendiente de confirmar antes de cablear alertas.
              </p>
            </div>

            {/* 4.4 — Reconciliación (bajo demanda: O(wallets) contra Horizon) */}
            <SectionTitle icon={ShieldCheck} right={
              <button onClick={loadRecon} disabled={reconLoading}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[0.75rem] font-bold text-[#0F1628]" style={{ background: '#C4CBD8' }}>
                {reconLoading ? <Loader size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                {recon ? 'Re-ejecutar' : 'Ejecutar reconciliación'}
              </button>
            }>Reconciliación del dual ledger</SectionTitle>

            <div className="rounded-2xl p-5 mb-8" style={{ background: '#1A2340', border: '1px solid #263050' }}>
              {!recon ? (
                <p className="text-[0.8125rem] text-[#8A96B8]">
                  Compara el saldo espejo (MongoDB) contra el on-chain (Stellar) por wallet custodial. Se ejecuta bajo demanda porque consulta Horizon por cada dirección.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    <Metric label="Wallets revisadas" value={recon.walletsChecked ?? 0} />
                    <Metric label="Descuadres" value={recon.discrepancyCount ?? 0}
                      color={recon.discrepancyCount > 0 ? '#EF4444' : '#22C55E'} />
                    <Metric label="Total en discrepancia" value={fmt(recon.totalMismatchUSDC)} unit="USDC"
                      color={recon.totalMismatchUSDC > 0 ? '#EF4444' : '#22C55E'} />
                  </div>

                  {recon.discrepancyCount === 0 ? (
                    <div className="flex items-center gap-2 text-[0.8125rem] text-[#22C55E]">
                      <CheckCircle2 size={16} /> Todo cuadra. Espejo y on-chain coinciden.
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #263050' }}>
                      <table className="w-full text-left">
                        <thead>
                          <tr style={{ background: '#0F1628', borderBottom: '1px solid #263050' }}>
                            {['Usuario', 'Tipo', 'Espejo', 'On-chain', 'Δ USDC', ''].map(h => (
                              <th key={h} className="px-3 py-2 text-[0.65rem] uppercase tracking-wide text-[#8A96B8] font-semibold">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {recon.discrepancies.map((d, i) => (
                            <tr key={d.stellarAddress ?? i} style={{ borderBottom: '1px solid #1A2340' }}>
                              <td className="px-3 py-2 text-[0.7rem] text-[#C4CBD8] font-mono">{shortKey(d.userId)}</td>
                              <td className="px-3 py-2">
                                <span className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#EF44441A', color: '#F87171' }}>
                                  {d.type}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-[0.75rem] text-white whitespace-nowrap">{fmt(d.mirrorUSDC)}</td>
                              <td className="px-3 py-2 text-[0.75rem] text-white whitespace-nowrap">{fmt(d.onChainUSDC)}</td>
                              <td className="px-3 py-2 text-[0.75rem] font-bold whitespace-nowrap" style={{ color: '#F87171' }}>{d.deltaUSDC != null ? fmt(d.deltaUSDC) : '—'}</td>
                              <td className="px-3 py-2">
                                {d.stellarExpert && (
                                  <a href={d.stellarExpert} target="_blank" rel="noreferrer" className="text-[#C4CBD8] hover:text-white inline-flex">
                                    <ExternalLink size={14} />
                                  </a>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {recon.coverageNote && (
                    <p className="text-[0.6rem] text-[#4E5A7A] mt-3">{recon.coverageNote}</p>
                  )}
                  <p className="text-[0.6rem] text-[#4E5A7A] mt-1">ejecutado {fmtDateTime(recon.ranAt)}</p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
