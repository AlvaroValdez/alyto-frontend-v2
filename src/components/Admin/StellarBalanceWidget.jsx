/**
 * StellarBalanceWidget.jsx — Saldo USDC wallet Stellar SRL en tiempo real
 *
 * Muestra el balance USDC de la wallet corporativa SRL consultando Horizon,
 * la dirección pública con botón de copia, y link directo a Stellar Expert.
 * Polling automático cada 5 minutos (igual que VitaBalanceWidget).
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  RefreshCw, Copy, CheckCircle2, AlertCircle,
  ExternalLink, Zap,
} from 'lucide-react'
import { request } from '../../services/api'

const USDC_THRESHOLD = 500

function timeAgo(isoStr) {
  if (!isoStr) return ''
  const diff = Math.floor((Date.now() - new Date(isoStr)) / 1000)
  if (diff < 60)   return 'hace menos de 1 min'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  return `hace ${Math.floor(diff / 3600)} h`
}

function formatUSDC(n) {
  return new Intl.NumberFormat('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0)
}

function truncateKey(key) {
  if (!key || key.length < 12) return key
  return `${key.slice(0, 6)}...${key.slice(-6)}`
}

export default function StellarBalanceWidget({ entity = 'SRL', compact = false }) {
  const [data,     setData]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [spinning, setSpinning] = useState(false)
  const [copied,   setCopied]   = useState(false)
  const intervalRef = useRef(null)

  const load = useCallback(async (manual = false) => {
    if (manual) setSpinning(true)
    setError(null)
    try {
      const res = await request(`/admin/stellar/balance?entity=${entity}`)
      setData(res)
    } catch (err) {
      setError(err.message || 'No se pudo conectar con Stellar Horizon')
    } finally {
      setLoading(false)
      if (manual) setTimeout(() => setSpinning(false), 600)
    }
  }, [entity])

  useEffect(() => {
    load()
    intervalRef.current = setInterval(() => load(), 5 * 60 * 1000)
    return () => clearInterval(intervalRef.current)
  }, [load])

  const handleCopy = () => {
    if (!data?.publicKey) return
    navigator.clipboard.writeText(data.publicKey).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const usdc      = data?.balance?.usdc ?? 0
  const isOk      = usdc >= USDC_THRESHOLD
  const isWarn    = !isOk && usdc >= USDC_THRESHOLD * 0.5
  const barColor  = isOk ? '#22C55E' : isWarn ? '#F59E0B' : '#EF4444'
  const barPct    = USDC_THRESHOLD > 0 ? Math.min((usdc / USDC_THRESHOLD) * 100, 100) : 100

  // ── Skeleton ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-2xl p-5" style={{ background: '#111827', border: '1px solid #1A2340' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-40 rounded bg-[#1A2340] animate-pulse" />
          <div className="h-4 w-16 rounded bg-[#1A2340] animate-pulse" />
        </div>
        <div className="h-20 rounded-xl bg-[#1A2340] animate-pulse" />
      </div>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-2xl p-5" style={{ background: '#111827', border: '1px solid #EF444433' }}>
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle size={16} className="text-[#F87171]" />
          <p className="text-[0.875rem] font-semibold text-[#F87171]">Stellar Wallet — Sin conexión</p>
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

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1A2340' }}>

      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid #1A2340' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#1A2340' }}>
            <Zap size={15} className="text-[#8AB4F8]" />
          </div>
          <div>
            <p className="text-[0.875rem] font-bold text-white">Saldo Stellar {entity}</p>
            <p className="text-[0.6875rem] text-[#4E5A7A]">
              Wallet USDC corporativa · Horizon live
              {data?.checkedAt && <> · {timeAgo(data.checkedAt)}</>}
            </p>
          </div>
        </div>
        <button
          onClick={() => load(true)}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-[#1A2340] active:scale-90"
          title="Actualizar saldo"
        >
          <RefreshCw size={14} className={`text-[#8A96B8] ${spinning ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Balance USDC */}
      <div className="px-5 pt-5 pb-4">
        <div
          className="rounded-xl p-4 flex flex-col gap-3"
          style={{ background: '#1A2340', border: `1px solid ${isOk ? '#263050' : barColor + '33'}` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[0.6875rem] font-bold px-2 py-0.5 rounded-full" style={{ background: '#263050', color: '#8A96B8' }}>
              USDC
            </span>
            {isOk
              ? <CheckCircle2 size={14} color="#22C55E" />
              : <AlertCircle  size={14} color={barColor} />
            }
          </div>

          <p className="text-[1.875rem] font-extrabold leading-none tabular-nums" style={{ color: isOk ? '#C4CBD8' : barColor }}>
            {formatUSDC(usdc)}
            <span className="text-[0.75rem] font-medium ml-2" style={{ color: '#4E5A7A' }}>USDC</span>
          </p>

          {/* Barra de progreso */}
          <div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#263050' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barPct}%`, background: barColor }} />
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-[0.6875rem] text-[#4E5A7A]">Mínimo recomendado</span>
              <span className="text-[0.6875rem]" style={{ color: isOk ? '#4E5A7A' : barColor }}>
                {formatUSDC(USDC_THRESHOLD)} USDC
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dirección pública + links */}
      <div className="px-5 pb-5 flex flex-col gap-3">

        {/* Dirección pública */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: '#1A2340', border: '1px solid #263050' }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-0.5">
              Dirección pública · {data?.network ?? 'testnet'}
            </p>
            <p className="text-[0.8125rem] font-mono text-[#C4CBD8] truncate" title={data?.publicKey}>
              {data?.publicKey ?? '—'}
            </p>
          </div>
          <button
            onClick={handleCopy}
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
            style={{ background: copied ? '#22C55E1A' : '#0F1628', border: `1px solid ${copied ? '#22C55E40' : '#263050'}` }}
            title="Copiar dirección"
          >
            {copied
              ? <CheckCircle2 size={13} className="text-[#22C55E]" />
              : <Copy         size={13} className="text-[#8A96B8]" />
            }
          </button>
        </div>

        {/* Links */}
        <div className="flex gap-2">
          {data?.stellarExpertUrl && (
            <a
              href={data.stellarExpertUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[0.75rem] font-semibold transition-all hover:opacity-80 active:scale-95"
              style={{ background: '#1A2340', border: '1px solid #263050', color: '#8AB4F8' }}
            >
              <ExternalLink size={12} />
              Stellar Expert
            </a>
          )}
          {data?.publicKey && (
            <a
              href={`https://laboratory.stellar.org/account?accountId=${data.publicKey}&network=${data?.network ?? 'testnet'}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[0.75rem] font-semibold transition-all hover:opacity-80 active:scale-95"
              style={{ background: '#1A2340', border: '1px solid #263050', color: '#C4CBD8' }}
            >
              <ExternalLink size={12} />
              Stellar Lab
            </a>
          )}
        </div>

        {/* Alerta si bajo */}
        {!isOk && (
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: barColor + '0D', border: `1px solid ${barColor}33` }}
          >
            <AlertCircle size={13} style={{ color: barColor, flexShrink: 0 }} />
            <p className="text-[0.8125rem] font-medium" style={{ color: barColor }}>
              {usdc === 0
                ? 'Wallet sin USDC — fondea antes del próximo payout.'
                : `Saldo bajo (${formatUSDC(usdc)} USDC). Fondea la wallet SRL.`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
