/**
 * CorporateView.jsx — Plataforma Institucional B2B (AV Finance LLC)
 *
 * Vista exclusiva para clientes corporativos que operan On-Ramp
 * institucional vía OwlPay Harbor sobre la red Stellar.
 *
 * Terminología aplicada (CLAUDE.md):
 *   ✓ cross-border payment, on-ramp, liquidación, pay-in institucional
 *   ✗ remesa, remittance (PROHIBIDO)
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Plus,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Wallet,
  DollarSign,
  Globe,
  TrendingUp,
} from 'lucide-react'
import { initiateCorporateOnRamp } from '../services/api'

// ── Mock: historial de liquidaciones institucionales ─────────────────────────
const MOCK_LIQUIDATIONS = [
  {
    id: 'ALY-A-1773800001-KX9M',
    owlPayId: 'owp_harbor_882a',
    date: '18 mar 2026, 14:32',
    amountUSD: 250000,
    asset: 'USDC',
    destination: 'GBVH...7KQP',
    stellarTxId: 'a3f9...c821',
    status: 'completed',
    entity: 'LLC',
  },
  {
    id: 'ALY-A-1773750002-RT4N',
    owlPayId: 'owp_harbor_771b',
    date: '17 mar 2026, 09:15',
    amountUSD: 500000,
    asset: 'USDC',
    destination: 'GCMR...2VWX',
    stellarTxId: 'b7e1...d453',
    status: 'completed',
    entity: 'LLC',
  },
  {
    id: 'ALY-A-1773600003-PL2W',
    owlPayId: 'owp_harbor_660c',
    date: '15 mar 2026, 16:48',
    amountUSD: 125000,
    asset: 'USDC',
    destination: 'GDSP...8NFA',
    stellarTxId: null,
    status: 'in_transit',
    entity: 'LLC',
  },
  {
    id: 'ALY-A-1773500004-BQ5E',
    owlPayId: 'owp_harbor_559d',
    date: '14 mar 2026, 11:20',
    amountUSD: 80000,
    asset: 'USDC',
    destination: 'GBKL...3YMZ',
    stellarTxId: 'c2a8...f917',
    status: 'completed',
    entity: 'LLC',
  },
  {
    id: 'ALY-A-1773400005-HJ8R',
    owlPayId: 'owp_harbor_448e',
    date: '12 mar 2026, 08:05',
    amountUSD: 320000,
    asset: 'USDC',
    destination: 'GCWT...1QPB',
    stellarTxId: null,
    status: 'failed',
    entity: 'LLC',
  },
]

const STATS = [
  { label: 'Liquidado (30d)',   value: '$1.275.000',  sub: 'USD · OwlPay Harbor',   icon: DollarSign, color: '#22C55E', bg: '#22C55E1A' },
  { label: 'En Tránsito',      value: '$125.000',    sub: 'Stellar Network',        icon: Globe,      color: '#C4CBD8', bg: '#C4CBD81A' },
  { label: 'Operaciones (30d)', value: '5',           sub: '4 completadas · 1 fallo', icon: TrendingUp, color: '#3B82F6', bg: '#3B82F61A' },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatusChip({ status }) {
  const map = {
    completed:  { label: 'Completado', color: '#22C55E', bg: '#22C55E1A' },
    in_transit: { label: 'En tránsito', color: '#C4CBD8', bg: '#C4CBD81A' },
    failed:     { label: 'Fallido',    color: '#EF4444', bg: '#EF44441A' },
    pending:    { label: 'Pendiente',  color: '#C4CBD8', bg: '#C4CBD81A' },
  }
  const s = map[status] ?? map.pending
  return (
    <span
      className="text-[0.6875rem] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  )
}

function StatCard({ icon: Icon, label, value, sub, color, bg }) {
  return (
    <div className="flex-1 min-w-0 rounded-2xl p-4" style={{ background: '#1A2340' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
          <Icon size={15} style={{ color }} />
        </div>
        <p className="text-[0.6875rem] font-semibold text-[#8A96B8] uppercase tracking-[0.08em] leading-tight">{label}</p>
      </div>
      <p className="text-[1.375rem] font-extrabold text-white leading-none mb-1">{value}</p>
      <p className="text-[0.6875rem] text-[#4E5A7A]">{sub}</p>
    </div>
  )
}

// ── Modal: Nueva Operación B2B ────────────────────────────────────────────────

/**
 * ESTRUCTURA DE DATOS ENVIADA A OWLPAY (vía backend):
 *
 * POST /api/v1/institutional/onramp/owlpay
 * {
 *   "amountUSD":         number,   // Monto en USD (mín. $1,000)
 *   "destinationWallet": string,   // Stellar public key (G... 56 chars)
 *   "userId":            string    // ID del cliente corporativo (MongoDB ObjectId)
 * }
 *
 * El backend enriquece con:
 *   legalEntity: "LLC"
 *   operationType: "crossBorderPayment"
 *   provider: "owlpay_harbor"
 *   asset: "USDC"
 *   network: "stellar"
 */
function NewOperationModal({ onClose, onSuccess }) {
  const [amountUSD, setAmountUSD]               = useState('')
  const [destinationWallet, setDestinationWallet] = useState('')
  const [loading, setLoading]                   = useState(false)
  const [error, setError]                       = useState(null)
  const [userId, setUserId]                     = useState(null)

  useEffect(() => {
    fetch('http://localhost:3000/api/v1/dev/test-user')
      .then(r => r.json())
      .then(d => setUserId(d.userId))
      .catch(() => setError('No se pudo conectar con el servidor.'))
  }, [])

  const usdValue = parseFloat(amountUSD.replace(/,/g, '')) || 0
  const isValidWallet = /^G[A-Z2-7]{55}$/.test(destinationWallet.trim())
  const canSubmit = usdValue >= 1000 && isValidWallet && !loading && userId

  function handleAmountChange(e) {
    const raw = e.target.value.replace(/[^0-9.]/g, '')
    setAmountUSD(raw)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (usdValue < 1000) { setError('El monto mínimo para operaciones institucionales es $1,000 USD.'); return }
    if (!isValidWallet)  { setError('La billetera Stellar de destino no es válida. Debe comenzar con G y tener 56 caracteres.'); return }

    setLoading(true)
    try {
      const result = await initiateCorporateOnRamp(usdValue, destinationWallet.trim(), userId)
      onSuccess(result)
    } catch (err) {
      setError(err.message || 'Error al procesar la operación. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: '#0F162899', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-[480px] rounded-3xl overflow-hidden"
        style={{ background: '#1A2340', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
      >
        {/* Header del modal */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#263050]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#3B82F61A] flex items-center justify-center">
              <Building2 size={17} className="text-[#3B82F6]" />
            </div>
            <div>
              <p className="text-[0.9375rem] font-bold text-white leading-tight">Nueva Operación B2B</p>
              <p className="text-[0.6875rem] text-[#4E5A7A]">AV Finance LLC · OwlPay Harbor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#263050] flex items-center justify-center hover:bg-[#2E3A5E] transition-colors"
          >
            <X size={15} className="text-[#8A96B8]" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">

          {/* Monto USD */}
          <div>
            <label className="block text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-[0.08em] mb-2">
              Monto en USD
            </label>
            <div
              className="flex items-center gap-2 rounded-2xl px-4 py-3.5 border transition-all"
              style={{ background: '#0F1628', borderColor: amountUSD ? '#3B82F6' : '#263050',
                boxShadow: amountUSD ? '0 0 0 2px #3B82F620' : 'none' }}
            >
              <span className="text-[#4E5A7A] font-bold text-lg">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amountUSD}
                onChange={handleAmountChange}
                placeholder="0.00"
                className="flex-1 bg-transparent text-white text-[1.125rem] font-bold outline-none placeholder-[#263050]"
              />
              <span className="text-[0.75rem] font-semibold text-[#4E5A7A]">USD</span>
            </div>
            {usdValue > 0 && usdValue < 1000 && (
              <p className="text-[0.75rem] text-[#EF4444] mt-1.5 ml-1">Mínimo $1,000 USD para operaciones institucionales.</p>
            )}
            {usdValue >= 1000 && (
              <p className="text-[0.75rem] text-[#22C55E] mt-1.5 ml-1">
                ≈ {usdValue.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC en Stellar
              </p>
            )}
          </div>

          {/* Billetera Stellar de Destino */}
          <div>
            <label className="block text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-[0.08em] mb-2">
              Billetera Stellar de Destino
            </label>
            <div
              className="flex items-start gap-2 rounded-2xl px-4 py-3.5 border transition-all"
              style={{
                background: '#0F1628',
                borderColor: destinationWallet ? (isValidWallet ? '#22C55E' : '#EF4444') : '#263050',
                boxShadow: destinationWallet ? (isValidWallet ? '0 0 0 2px #22C55E20' : '0 0 0 2px #EF444420') : 'none',
              }}
            >
              <Wallet size={16} className="text-[#4E5A7A] mt-0.5 flex-shrink-0" />
              <input
                type="text"
                value={destinationWallet}
                onChange={e => setDestinationWallet(e.target.value)}
                placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                className="flex-1 bg-transparent text-white text-[0.8125rem] font-mono outline-none placeholder-[#263050] break-all"
                spellCheck={false}
              />
            </div>
            {destinationWallet && !isValidWallet && (
              <p className="text-[0.75rem] text-[#EF4444] mt-1.5 ml-1">
                Dirección inválida — debe comenzar con G y tener 56 caracteres.
              </p>
            )}
          </div>

          {/* Ruta de la operación */}
          <div className="rounded-2xl px-4 py-3 bg-[#0F1628] border border-[#1A2340]">
            <p className="text-[0.6875rem] font-semibold text-[#4E5A7A] uppercase tracking-[0.08em] mb-2">
              Ruta de la operación
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full bg-[#3B82F61A] text-[#3B82F6] text-[0.6875rem] font-semibold">AV Finance LLC</span>
              <span className="text-[#4E5A7A] text-xs">→</span>
              <span className="px-2.5 py-1 rounded-full bg-[#C4CBD81A] text-[#C4CBD8] text-[0.6875rem] font-semibold">OwlPay Harbor</span>
              <span className="text-[#4E5A7A] text-xs">→</span>
              <span className="px-2.5 py-1 rounded-full bg-[#22C55E1A] text-[#22C55E] text-[0.6875rem] font-semibold">Stellar USDC</span>
              <span className="text-[#4E5A7A] text-xs">→</span>
              <span className="px-2.5 py-1 rounded-full bg-[#22C55E1A] text-[#22C55E] text-[0.6875rem] font-semibold">Wallet Destino</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-[#EF44441A] border border-[#EF444430]">
              <AlertCircle size={15} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
              <p className="text-[0.8125rem] text-[#F87171]">{error}</p>
            </div>
          )}

          {/* Botón — Azul Alyto institucional */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-4 rounded-2xl font-bold text-[0.9375rem] flex items-center justify-center gap-2 transition-all"
            style={{
              background: canSubmit ? '#1D3461' : '#1D346140',
              color:      canSubmit ? '#FFFFFF'  : '#FFFFFF60',
              boxShadow:  canSubmit ? '0 4px 20px rgba(29,52,97,0.5)' : 'none',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Procesando liquidación…
              </>
            ) : (
              <>
                <Building2 size={17} />
                Ejecutar On-Ramp Institucional
              </>
            )}
          </button>

          <p className="text-center text-[0.6875rem] text-[#4E5A7A]">
            Operación sujeta a verificación KYB. Liquidación T+0 vía Stellar.
          </p>
        </form>
      </div>
    </div>
  )
}

// ── Vista de éxito post-operación ─────────────────────────────────────────────

function SuccessBanner({ result, onDismiss }) {
  return (
    <div className="mx-4 mb-4 rounded-2xl p-4 border border-[#22C55E30] bg-[#22C55E0D] flex items-start gap-3">
      <CheckCircle2 size={18} className="text-[#22C55E] flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[0.875rem] font-semibold text-white mb-0.5">Operación iniciada correctamente</p>
        <p className="text-[0.75rem] text-[#8A96B8]">
          ID: <span className="text-[#C4CBD8] font-mono">{result?.alytoTransactionId ?? '—'}</span>
        </p>
        {result?.owlPayOrderId && (
          <p className="text-[0.75rem] text-[#8A96B8]">
            OwlPay: <span className="text-[#C4CBD8] font-mono">{result.owlPayOrderId}</span>
          </p>
        )}
      </div>
      <button onClick={onDismiss} className="text-[#4E5A7A] hover:text-[#8A96B8]">
        <X size={15} />
      </button>
    </div>
  )
}

// ── Card de liquidación institucional ─────────────────────────────────────────

function LiquidationCard({ tx }) {
  return (
    <div className="rounded-2xl bg-[#1A2340] p-4 flex flex-col gap-3">
      {/* Fila 1: ID + estado */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[0.8125rem] font-bold text-white font-mono truncate">{tx.id}</p>
          <p className="text-[0.6875rem] text-[#4E5A7A] mt-0.5">{tx.date}</p>
        </div>
        <StatusChip status={tx.status} />
      </div>

      {/* Fila 2: monto + asset */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#3B82F61A] flex items-center justify-center flex-shrink-0">
          <DollarSign size={16} className="text-[#3B82F6]" />
        </div>
        <div>
          <p className="text-[1.0625rem] font-extrabold text-white">
            ${tx.amountUSD.toLocaleString('en-US')} <span className="text-[0.75rem] font-semibold text-[#8A96B8]">USD</span>
          </p>
          <p className="text-[0.6875rem] text-[#8A96B8]">→ {tx.amountUSD.toLocaleString('en-US')} {tx.asset} · Stellar</p>
        </div>
      </div>

      {/* Fila 3: destino + txid */}
      <div className="border-t border-[#263050] pt-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[0.6875rem] text-[#4E5A7A]">Destino</span>
          <span className="text-[0.75rem] font-mono text-[#C4CBD8]">{tx.destination}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[0.6875rem] text-[#4E5A7A]">OwlPay ID</span>
          <span className="text-[0.75rem] font-mono text-[#8A96B8]">{tx.owlPayId}</span>
        </div>
        {tx.stellarTxId && (
          <div className="flex items-center justify-between">
            <span className="text-[0.6875rem] text-[#4E5A7A]">Stellar TXID</span>
            <button className="flex items-center gap-1 text-[0.75rem] font-mono text-[#22C55E] hover:underline">
              {tx.stellarTxId}
              <ExternalLink size={10} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Vista Principal ───────────────────────────────────────────────────────────

export default function CorporateView() {
  const navigate = useNavigate()
  const [showModal, setShowModal]     = useState(false)
  const [successResult, setSuccess]   = useState(null)
  const [activeFilter, setFilter]     = useState('all')

  const filters = [
    { key: 'all',        label: 'Todas'       },
    { key: 'completed',  label: 'Completadas' },
    { key: 'in_transit', label: 'En tránsito' },
    { key: 'failed',     label: 'Fallidas'    },
  ]

  const filtered = activeFilter === 'all'
    ? MOCK_LIQUIDATIONS
    : MOCK_LIQUIDATIONS.filter(t => t.status === activeFilter)

  function handleSuccess(result) {
    setShowModal(false)
    setSuccess(result)
  }

  return (
    <div className="min-h-screen bg-[#0F1628] font-sans flex flex-col max-w-[430px] mx-auto relative">
      <div className="flex-1 overflow-y-auto pb-10">

        {/* ── HEADER ──────────────────────────────────────────────── */}
        <header className="px-4 pt-14 pb-5">
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-full bg-[#1A2340] flex items-center justify-center border border-[#263050] flex-shrink-0 hover:border-[#C4CBD833] transition-colors"
            >
              <ArrowLeft size={18} className="text-[#8A96B8]" />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[1.0625rem] font-bold text-white">Plataforma Institucional</p>
                <span className="text-[0.625rem] font-bold px-2 py-0.5 rounded border border-[#3B82F633] text-[#3B82F6] bg-[#3B82F61A] tracking-wide flex-shrink-0">
                  LLC
                </span>
              </div>
              <p className="text-[0.75rem] text-[#4E5A7A]">AV Finance LLC · OwlPay Harbor · Stellar Network</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-3">
            {STATS.map(s => <StatCard key={s.label} {...s} />)}
          </div>
        </header>

        {/* ── BANNER ÉXITO ────────────────────────────────────────── */}
        {successResult && (
          <SuccessBanner result={successResult} onDismiss={() => setSuccess(null)} />
        )}

        {/* ── HISTORIAL ───────────────────────────────────────────── */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-base font-bold text-white">Historial de Liquidaciones</p>
            {/* Botón nueva operación — Azul Alyto institucional */}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-[0.8125rem] transition-all"
              style={{ background: '#1D3461', color: '#FFFFFF', boxShadow: '0 2px 12px rgba(29,52,97,0.5)' }}
            >
              <Plus size={15} />
              Nueva
            </button>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide pb-1">
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="px-3 py-1.5 rounded-full text-[0.75rem] font-medium border whitespace-nowrap transition-all flex-shrink-0"
                style={activeFilter === f.key
                  ? { background: '#3B82F61A', borderColor: '#3B82F633', color: '#3B82F6' }
                  : { background: 'transparent', borderColor: '#263050', color: '#4E5A7A' }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Cards de liquidaciones */}
          <div className="flex flex-col gap-3">
            {filtered.length === 0 ? (
              <div className="rounded-2xl bg-[#1A2340] p-8 text-center">
                <Clock size={28} className="text-[#4E5A7A] mx-auto mb-2" />
                <p className="text-[#8A96B8] text-sm">No hay operaciones en este estado.</p>
              </div>
            ) : (
              filtered.map(tx => <LiquidationCard key={tx.id} tx={tx} />)
            )}
          </div>
        </div>

      </div>

      {/* ── MODAL NUEVA OPERACIÓN ────────────────────────────────── */}
      {showModal && (
        <NewOperationModal
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
