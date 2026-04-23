import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBOB(amount) {
  return `Bs. ${Number(amount).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatUSDC(amount) {
  return `${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDC`
}

function StatusDot({ status }) {
  const config = {
    active:  { color: '#4ADE80', label: 'Activa'     },
    pending: { color: '#FCD34D', label: 'Pendiente'  },
    frozen:  { color: '#F87171', label: 'Bloqueada'  },
  }
  const { color, label } = config[status] ?? config.pending
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: color, boxShadow: `0 0 4px ${color}` }}
      />
      <span className="text-[0.6875rem] font-semibold text-white/70">{label}</span>
    </span>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function WalletCard({ bobBalance = 0, usdcBalance = 0, stellarAddress = null, status = 'pending' }) {
  const [showUSDC, setShowUSDC] = useState(false)

  const truncatedAddress = stellarAddress
    ? `${stellarAddress.slice(0, 6)}...${stellarAddress.slice(-4)}`
    : null

  return (
    <div className="px-4 mb-4">
      <div
        className="relative overflow-hidden rounded-[20px] w-full"
        style={{
          background:    'linear-gradient(135deg, #0D1F3C 0%, #1E3A5F 60%, #233E58 100%)',
          aspectRatio:   '1.6 / 1',
          boxShadow:     '0 8px 32px rgba(13,31,60,0.45), 0 2px 8px rgba(13,31,60,0.25)',
        }}
      >
        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Decorative circles */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: '160px', height: '160px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            top: '-40px', right: '-40px',
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            width: '100px', height: '100px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)',
            bottom: '-20px', left: '20px',
          }}
        />

        {/* Card content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-5">

          {/* Top row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.12)' }}
              >
                <span className="text-[0.625rem] font-black text-white tracking-tight">A</span>
              </div>
              <span className="text-[0.8125rem] font-semibold text-white/80">Alyto Wallet</span>
            </div>
            <span
              className="text-[0.6875rem] font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)' }}
            >
              {showUSDC ? 'USDC' : 'BOB'}
            </span>
          </div>

          {/* Balance */}
          <div>
            <p
              className="font-bold leading-none tracking-tight text-white"
              style={{ fontSize: 'clamp(1.375rem, 5vw, 1.875rem)' }}
            >
              {showUSDC ? formatUSDC(usdcBalance) : formatBOB(bobBalance)}
            </p>
            <p className="text-[0.75rem] text-white/50 mt-1">Saldo disponible</p>
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between">
            {/* Toggle BOB/USDC */}
            <button
              onClick={() => setShowUSDC(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <RefreshCw size={11} className="text-white/70" />
              <span className="text-[0.6875rem] font-semibold text-white/80">
                {showUSDC ? 'Ver en BOB' : 'Ver en USDC'}
              </span>
            </button>

            {/* Stellar + status */}
            <div className="flex flex-col items-end gap-1">
              <StatusDot status={status} />
              {truncatedAddress && (
                <span className="text-[0.5625rem] font-mono text-white/35">{truncatedAddress}</span>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
