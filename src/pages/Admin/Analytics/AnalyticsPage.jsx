/**
 * AnalyticsPage.jsx — Dashboard de rentabilidad global Alyto Finance
 *
 * Fase 18C: KPIs globales, desglose por entidad legal y top corredores.
 * Consume GET /admin/analytics?period=7d|30d|90d
 */

import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp, DollarSign, Activity, Percent,
  Loader, AlertCircle, RefreshCw,
} from 'lucide-react'
import { getGlobalAnalytics } from '../../../services/adminService'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PERIODS = [
  { value: '7d',  label: '7 días'  },
  { value: '30d', label: '30 días' },
  { value: '90d', label: '90 días' },
]

function fmt(n) {
  return n != null ? n.toLocaleString('es-CL') : '—'
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, color = '#C4CBD8' }) {
  return (
    <div className="bg-[#1A2340] border border-[#263050] rounded-2xl px-5 py-5">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
        style={{ background: `${color}18` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <p className="text-[1.625rem] font-extrabold text-white tabular-nums leading-none mb-1">{value}</p>
      <p className="text-[0.8125rem] font-semibold text-white">{label}</p>
      {sub && <p className="text-[0.75rem] text-[#4E5A7A] mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Entity card ──────────────────────────────────────────────────────────────

function EntityCard({ label, flag, txns, volume, tag, color }) {
  return (
    <div
      className="bg-[#1A2340] rounded-2xl px-5 py-5 border"
      style={{ borderColor: `${color}40` }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{flag}</span>
        <p className="text-[0.875rem] font-bold text-white flex-1">{label}</p>
        <span
          className="text-[0.625rem] font-semibold px-1.5 py-0.5 rounded-full border"
          style={{ background: `${color}14`, color, borderColor: `${color}40` }}
        >
          {tag}
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[0.75rem] text-[#4E5A7A]">Transacciones</span>
          <span className="text-[0.875rem] font-bold text-white tabular-nums">
            {txns != null ? txns : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[0.75rem] text-[#4E5A7A]">Volumen</span>
          <span className="text-[0.875rem] font-bold text-white tabular-nums">
            {volume != null ? `$${fmt(volume)}` : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── AnalyticsPage ────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [period,  setPeriod]  = useState('30d')
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getGlobalAnalytics({ period })
      setData(res)
    } catch (err) {
      setError(err.message || 'Error al cargar analytics')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [load])

  const global       = data?.global       ?? {}
  const byEntity     = data?.byEntity     ?? {}
  const topCorridors = data?.topCorridors ?? []

  return (
    <div className="max-w-[1200px]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[1.375rem] font-extrabold text-white">Analytics — Alyto Finance</h1>
          <p className="text-[0.8125rem] text-[#4E5A7A] mt-0.5">Dashboard de rentabilidad global</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="w-8 h-8 rounded-full bg-[#1A2340] border border-[#263050] flex items-center justify-center hover:border-[#C4CBD833] disabled:opacity-40 transition-colors"
        >
          <RefreshCw size={13} className={`text-[#8A96B8] ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Selector de período ── */}
      <div className="flex gap-2 mb-6">
        {PERIODS.map(p => (
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

      {/* ── Error ── */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-[#EF44441A] rounded-2xl border border-[#EF444433] mb-5">
          <AlertCircle size={16} className="text-[#F87171] flex-shrink-0" />
          <p className="text-[0.875rem] text-[#F87171]">{error}</p>
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <Loader size={28} className="text-[#C4CBD8] animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Row 1: KPIs globales ── */}
          <div className="grid grid-cols-4 gap-4">
            <KpiCard
              icon={Activity}
              label="Transacciones"
              value={global.totalTransactions ?? '—'}
              sub="completadas"
              color="#8AB4F8"
            />
            <KpiCard
              icon={DollarSign}
              label="Volumen total"
              value={global.totalVolume != null ? `$${fmt(global.totalVolume)}` : '—'}
              sub="CLP"
              color="#C4CBD8"
            />
            <KpiCard
              icon={TrendingUp}
              label="Ganancia total"
              value={global.totalProfit != null ? `$${fmt(global.totalProfit)}` : '—'}
              sub="CLP"
              color="#22C55E"
            />
            <KpiCard
              icon={Percent}
              label="Fee efectivo promedio"
              value={global.avgFeePercent != null ? `${global.avgFeePercent.toFixed(2)}%` : '—'}
              sub="sobre volumen"
              color="#FBBF24"
            />
          </div>

          {/* ── Row 2: Por entidad ── */}
          <div>
            <h2 className="text-[0.875rem] font-bold text-white mb-3">Por entidad</h2>
            <div className="grid grid-cols-3 gap-4">
              <EntityCard
                label="AV Finance SpA"
                flag="🇨🇱"
                txns={byEntity.SpA?.transactions}
                volume={byEntity.SpA?.volume}
                tag="SpA · Chile"
                color="#8AB4F8"
              />
              <EntityCard
                label="AV Finance LLC"
                flag="🇺🇸"
                txns={byEntity.LLC?.transactions}
                volume={byEntity.LLC?.volume}
                tag="LLC · EE.UU."
                color="#C4CBD8"
              />
              <EntityCard
                label="AV Finance SRL"
                flag="🇧🇴"
                txns={byEntity.SRL?.transactions}
                volume={byEntity.SRL?.volume}
                tag="SRL · Bolivia"
                color="#22C55E"
              />
            </div>
          </div>

          {/* ── Row 3: Top corredores ── */}
          <div>
            <h2 className="text-[0.875rem] font-bold text-white mb-3">Top corredores por volumen</h2>
            <div className="bg-[#1A2340] border border-[#263050] rounded-2xl overflow-hidden">
              {topCorridors.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <p className="text-[0.875rem] text-[#4E5A7A]">Sin datos para este período.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#263050]">
                      {['Corredor', 'Transacciones', 'Volumen', 'Ganancia', 'Fee efectivo'].map(h => (
                        <th
                          key={h}
                          className="text-left text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider px-5 py-3 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#26305040]">
                    {topCorridors.slice(0, 3).map((row, i) => (
                      <tr key={row.corridorId ?? i} className="hover:bg-[#1F2B4D20] transition-colors">
                        <td className="px-5 py-4">
                          <p className="text-[0.8125rem] font-mono text-[#C4CBD8]">{row.corridorId}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-[0.8125rem] font-semibold text-white tabular-nums">
                            {row.transactions ?? '—'}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-[0.8125rem] font-semibold text-white tabular-nums">
                            {row.volume != null ? `$${fmt(row.volume)}` : '—'}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-[0.8125rem] font-semibold text-[#22C55E] tabular-nums">
                            {row.profit != null ? `$${fmt(row.profit)}` : '—'}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-[0.8125rem] font-semibold text-[#FBBF24] tabular-nums">
                            {row.avgFeePercent != null ? `${row.avgFeePercent.toFixed(2)}%` : '—'}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
