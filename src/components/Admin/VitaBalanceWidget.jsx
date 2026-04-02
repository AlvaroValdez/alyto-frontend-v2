/**
 * VitaBalanceWidget.jsx — Saldo Vita Wallet + alertas de liquidez
 *
 * Muestra balances por moneda con barra de progreso vs umbral mínimo.
 * Polling automático cada 5 minutos.
 * Se incrusta en AdminDashboard o páginas admin.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
} from 'lucide-react'
import { request } from '../../services/api'

// ── Configuración de monedas ──────────────────────────────────────────────────

const CURRENCY_CONFIG = {
  CLP: { label: 'CLP', decimals: 0,    prefix: '$',  threshold: 500000  },
  USD: { label: 'USD', decimals: 2,    prefix: '$',  threshold: 500     },
  USDT:{ label: 'USDT',decimals: 2,    prefix: '',   threshold: 500     },
  USDC:{ label: 'USDC',decimals: 2,    prefix: '',   threshold: 500     },
  COP: { label: 'COP', decimals: 0,    prefix: '$',  threshold: 2000000 },
}

function formatBalance(amount, currency) {
  const cfg = CURRENCY_CONFIG[currency] ?? { decimals: 2, prefix: '' }
  const num = new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: cfg.decimals,
    maximumFractionDigits: cfg.decimals,
  }).format(amount ?? 0)
  return cfg.prefix ? `${cfg.prefix} ${num}` : num
}

function timeAgo(isoStr) {
  if (!isoStr) return ''
  const diff = Math.floor((Date.now() - new Date(isoStr)) / 1000)
  if (diff < 60)  return 'hace menos de 1 min'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  return `hace ${Math.floor(diff / 3600)} h`
}

// ── Componente de una card de saldo ───────────────────────────────────────────

function BalanceCard({ currency, amount, threshold }) {
  const pct     = threshold > 0 ? Math.min((amount / threshold) * 100, 100) : 100
  const isOk    = amount >= threshold
  const isWarn  = !isOk && amount >= threshold * 0.5
  const isCrit  = !isOk && amount < threshold * 0.5
  const isEmpty = amount === 0

  const barColor = isOk ? '#22C55E' : isWarn ? '#F59E0B' : '#EF4444'
  const textColor = isEmpty ? '#4E5A7A' : isOk ? '#C4CBD8' : isWarn ? '#F59E0B' : '#F87171'

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: '#1A2340', border: `1px solid ${isOk ? '#263050' : barColor + '33'}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span
          className="text-[0.6875rem] font-bold px-2 py-0.5 rounded-full"
          style={{ background: '#263050', color: '#8A96B8' }}
        >
          {currency}
        </span>
        {isCrit && <AlertCircle size={14} color="#F87171" />}
        {isWarn && <AlertTriangle size={14} color="#F59E0B" />}
        {isOk   && <CheckCircle2 size={14} color="#22C55E" />}
      </div>

      {/* Monto */}
      <p
        className="text-[1.125rem] font-bold leading-none"
        style={{ color: textColor }}
      >
        {formatBalance(amount, currency)}
        <span className="text-[0.6875rem] font-medium ml-1.5" style={{ color: '#4E5A7A' }}>
          {currency}
        </span>
      </p>

      {/* Barra de progreso */}
      <div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#263050' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
        <p className="text-[0.625rem] text-[#4E5A7A] mt-1">
          Mínimo: {formatBalance(threshold, currency)} {currency}
        </p>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function VitaBalanceWidget({ compact = false }) {
  const navigate   = useNavigate()
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [spinning, setSpinning] = useState(false)
  const intervalRef = useRef(null)

  const load = useCallback(async (manual = false) => {
    if (manual) setSpinning(true)
    setError(null)
    try {
      const res = await request('/admin/vita/balance')
      setData(res)
    } catch (err) {
      setError(err.message || 'No se pudo conectar con Vita Wallet')
    } finally {
      setLoading(false)
      if (manual) setTimeout(() => setSpinning(false), 600)
    }
  }, [])

  useEffect(() => {
    load()
    intervalRef.current = setInterval(() => load(), 5 * 60 * 1000)
    return () => clearInterval(intervalRef.current)
  }, [load])

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-2xl p-5" style={{ background: '#111827', border: '1px solid #1A2340' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-36 rounded bg-[#1A2340] animate-pulse" />
          <div className="h-4 w-20 rounded bg-[#1A2340] animate-pulse" />
        </div>
        <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-[#1A2340] animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-2xl p-5" style={{ background: '#111827', border: '1px solid #EF444433' }}>
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle size={16} className="text-[#F87171]" />
          <p className="text-[0.875rem] font-semibold text-[#F87171]">Vita Wallet — Sin conexión</p>
        </div>
        <p className="text-[0.8125rem] text-[#4E5A7A] mb-4">{error}</p>
        <button
          onClick={() => load(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[0.8125rem] font-semibold transition-all active:scale-95"
          style={{ background: '#1A2340', border: '1px solid #263050', color: '#C4CBD8' }}
        >
          <RefreshCw size={14} className={spinning ? 'animate-spin' : ''} />
          Reintentar
        </button>
      </div>
    )
  }

  const balances       = data?.balances ?? {}
  const alerts         = data?.alerts   ?? []
  const worstLevel     = alerts.some(a => a.level === 'critical') ? 'critical' : 'warning'
  const shownCurrencies = Object.keys(CURRENCY_CONFIG).filter(
    cur => (balances[cur.toLowerCase()] ?? 0) > 0 || CURRENCY_CONFIG[cur].threshold > 0
  )

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1A2340' }}>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid #1A2340' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#1A2340' }}
          >
            <TrendingUp size={15} className="text-[#C4CBD8]" />
          </div>
          <div>
            <p className="text-[0.875rem] font-bold text-white">Saldo Vita Wallet</p>
            <p className="text-[0.6875rem] text-[#4E5A7A]">
              {data?.isMaster
                ? <span className="text-[#8AB4F8]">Master wallet</span>
                : 'wallet'
              }
              {data?.checkedAt && <> · Actualizado {timeAgo(data.checkedAt)}</>}
            </p>
          </div>
        </div>

        <button
          onClick={() => load(true)}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-[#1A2340] active:scale-90"
          title="Actualizar saldos"
        >
          <RefreshCw size={14} className={`text-[#8A96B8] ${spinning ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Cards de saldo ─────────────────────────────────────────────── */}
      <div className={`p-5 grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
        {shownCurrencies.map(cur => (
          <BalanceCard
            key={cur}
            currency={cur}
            amount={balances[cur.toLowerCase()] ?? 0}
            threshold={CURRENCY_CONFIG[cur].threshold}
          />
        ))}
      </div>

      {/* ── Panel de alertas ───────────────────────────────────────────── */}
      <div className="px-5 pb-5">
        {!data?.hasAlerts ? (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{ background: '#22C55E0D', border: '1px solid #22C55E1A' }}
          >
            <CheckCircle2 size={15} className="text-[#22C55E] flex-shrink-0" />
            <p className="text-[0.8125rem] text-[#22C55E] font-medium">
              Todos los saldos están sobre el mínimo
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {alerts.map((alert, i) => {
              const isCrit = alert.level === 'critical'
              const color  = isCrit ? '#F87171' : '#F59E0B'
              const bg     = isCrit ? '#EF44440D' : '#F59E0B0D'
              const border = isCrit ? '#EF444433' : '#F59E0B33'
              const Icon   = isCrit ? AlertCircle : AlertTriangle
              return (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 px-4 py-3 rounded-xl"
                  style={{ background: bg, border: `1px solid ${border}` }}
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <Icon size={15} style={{ color, flexShrink: 0, marginTop: 1 }} />
                    <p className="text-[0.8125rem] font-medium" style={{ color }}>
                      {alert.message}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/admin/funding')}
                    className="text-[0.75rem] font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 transition-all active:scale-95"
                    style={{ background: '#1A2340', border: `1px solid ${border}`, color }}
                  >
                    Ver fondeo
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
