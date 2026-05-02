/**
 * SettlementView.jsx — Liquidaciones Corredor Bolivia (AV Finance SRL)
 *
 * Gestiona el off-ramp manual de activos digitales a BOB y la descarga del
 * Comprobante Oficial de Transacción exigido por compliance boliviano.
 *
 * Máquina de estados por tarjeta:
 *   idle      → botón "Procesar Liquidación Local"  (Amarillo #C4A84F)
 *   loading   → botón "Procesando…"                 (deshabilitado)
 *   completed → botón "Descargar Comprobante"        (Azul Navy #1D3461)
 *   error     → mensaje de error + botón reseteable  (Amarillo)
 *
 * COMPLIANCE (CLAUDE.md): cero uso de "remesa/remittance".
 * Terminología: liquidación, off-ramp, activo digital, comprobante.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Landmark,
  RefreshCw,
} from 'lucide-react'
import { processBoliviaPayout, request } from '../services/api'

// ── Helpers ──────────────────────────────────────────────────────────────────

// Tasa fallback — se sobreescribe con valor dinámico del backend
let _cachedBobRate = null

async function fetchBOBRate() {
  if (_cachedBobRate) return _cachedBobRate
  try {
    const data = await request('/payments/exchange-rates/USDC-BOB')
    if (data?.rate) { _cachedBobRate = data.rate; return data.rate }
  } catch { /* fallback silencioso */ }
  return parseFloat(import.meta.env.VITE_BOB_RATE || '6.96')
}

const BOB_RATE_FALLBACK = parseFloat(import.meta.env.VITE_BOB_RATE || '6.96')

function fmtUSDC(val) {
  return `${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`
}
function fmtBOB(val) {
  return `Bs. ${Number(val).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ── Tarjeta de liquidación ────────────────────────────────────────────────────
/**
 * Estado del botón:
 *
 *  cardState.status === 'idle'
 *    → <button style={AMARILLO}>Procesar Liquidación Local</button>
 *    → onClick: llama processBoliviaPayout(tx._id) → POST /api/v1/payouts/bolivia/manual
 *
 *  cardState.status === 'loading'
 *    → <button disabled>Procesando liquidación…</button>
 *
 *  cardState.status === 'completed'
 *    → cardState.blob (Blob PDF) + cardState.filename disponibles
 *    → <button style={AZUL NAVY}>Descargar Comprobante</button>
 *    → onClick: URL.createObjectURL(blob) → anchor click → revokeObjectURL
 *
 *  cardState.status === 'error'
 *    → cardState.error (string) visible
 *    → <button style={AMARILLO}>Reintentar</button>
 */
function SettlementCard({ tx, cardState, onProcess, bobRate }) {
  const bobEquiv = fmtBOB((tx.digitalAssetAmount ?? tx.originalAmount) * (tx.exchangeRate ?? bobRate))
  const isIdle      = !cardState || cardState.status === 'idle'
  const isLoading   = cardState?.status === 'loading'
  const isCompleted = cardState?.status === 'completed'
  const isError     = cardState?.status === 'error'

  function handleDownload() {
    if (!cardState?.blob) return
    const url = URL.createObjectURL(cardState.blob)
    const a   = document.createElement('a')
    a.href     = url
    a.download = cardState.filename ?? 'comprobante.pdf'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background:  '#1A2340',
        boxShadow:   isCompleted
          ? '0 0 0 1.5px #1D346150, 0 4px 24px rgba(0,0,0,0.3)'
          : '0 4px 24px rgba(0,0,0,0.3)',
      }}
    >
      {/* Encabezado de la tarjeta */}
      <div className="px-5 pt-5 pb-4 border-b border-[#263050]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="text-[0.75rem] font-mono font-bold text-[#C4CBD8] truncate">
                {tx.alytoTransactionId}
              </p>
              {isCompleted && (
                <span className="flex items-center gap-1 text-[0.625rem] font-bold px-2 py-0.5 rounded-full bg-[#22C55E1A] text-[#22C55E]">
                  <CheckCircle2 size={9} /> Completado
                </span>
              )}
              {(isIdle || isError) && (
                <span className="flex items-center gap-1 text-[0.625rem] font-bold px-2 py-0.5 rounded-full bg-[#C4CBD81A] text-[#C4CBD8]">
                  <Clock size={9} /> En tránsito
                </span>
              )}
              {isLoading && (
                <span className="flex items-center gap-1 text-[0.625rem] font-bold px-2 py-0.5 rounded-full bg-[#C4A84F1A] text-[#C4A84F]">
                  <Loader2 size={9} className="animate-spin" /> Procesando
                </span>
              )}
            </div>
            <p className="text-[0.6875rem] text-[#4E5A7A]">
              {new Date(tx.createdAt).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </div>
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: isCompleted ? '#1D346120' : '#C4A84F1A' }}
          >
            <Landmark size={17} style={{ color: isCompleted ? '#6B9EF4' : '#C4A84F' }} />
          </div>
        </div>
      </div>

      {/* Desglose financiero */}
      <div className="px-5 py-4 flex flex-col gap-2.5">

        <div className="flex justify-between items-center">
          <span className="text-[0.75rem] text-[#4E5A7A]">Activo en tránsito</span>
          <span className="text-[0.875rem] font-bold text-white">{fmtUSDC(tx.digitalAssetAmount ?? tx.originalAmount)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[0.75rem] text-[#4E5A7A]">Equiv. BOB <span className="text-[#263050]">(× {tx.exchangeRate ?? bobRate})</span></span>
          <span className="text-[0.875rem] font-semibold text-[#C4CBD8]">{bobEquiv}</span>
        </div>

        {tx.stellarTxId && (
          <div className="flex justify-between items-center gap-2">
            <span className="text-[0.75rem] text-[#4E5A7A] flex-shrink-0">Stellar TXID</span>
            <span className="text-[0.625rem] font-mono text-[#8A96B8] truncate text-right">
              {tx.stellarTxId.slice(0, 16)}…{tx.stellarTxId.slice(-8)}
            </span>
          </div>
        )}

        {/* Mensaje de error */}
        {isError && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#EF44441A] border border-[#EF444430] mt-1">
            <AlertCircle size={14} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
            <p className="text-[0.75rem] text-[#F87171] leading-snug">{cardState.error}</p>
          </div>
        )}

        {/* ── BOTÓN PRINCIPAL — máquina de estados ── */}
        {isCompleted ? (
          /* ESTADO COMPLETADO → Azul Navy institucional */
          <button
            onClick={handleDownload}
            className="w-full mt-2 py-3.5 rounded-2xl font-bold text-[0.875rem] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{
              background: '#1D3461',
              color:      '#FFFFFF',
              boxShadow:  '0 4px 16px rgba(29,52,97,0.5)',
            }}
          >
            <Download size={16} />
            Descargar Comprobante
          </button>
        ) : (
          /* ESTADO IDLE / LOADING / ERROR → Amarillo Alyto */
          <button
            onClick={() => onProcess(tx._id)}
            disabled={isLoading}
            className="w-full mt-2 py-3.5 rounded-2xl font-bold text-[0.875rem] flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{
              background: isLoading ? '#C4A84F40' : '#C4A84F',
              color:      isLoading ? '#C4A84F80' : '#0F1628',
              boxShadow:  isLoading ? 'none'      : '0 4px 16px rgba(196,168,79,0.4)',
            }}
          >
            {isLoading ? (
              <><Loader2 size={16} className="animate-spin" />Procesando liquidación…</>
            ) : isError ? (
              <><RefreshCw size={16} />Reintentar</>
            ) : (
              <><FileText size={16} />Procesar Liquidación Local</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Vista Principal ───────────────────────────────────────────────────────────

export default function SettlementView() {
  const navigate = useNavigate()

  // Transacciones cargadas desde el endpoint dev (IDs reales de Mongo)
  const [transactions, setTransactions] = useState([])
  const [loadingTxs, setLoadingTxs]     = useState(true)
  const [fetchError, setFetchError]     = useState(null)
  const [bobRate, setBobRate]           = useState(BOB_RATE_FALLBACK)

  // Cargar tasa BOB dinámica del backend
  useEffect(() => { fetchBOBRate().then(setBobRate) }, [])

  // Estado independiente por tarjeta: { [txId]: { status, blob, filename, error } }
  const [cardStates, setCardStates] = useState({})

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL ?? ''}/dev/srl-transactions`)
      .then(r => r.json())
      .then(d => setTransactions(d.transactions ?? []))
      .catch(() => setFetchError('No se pudo conectar con el servidor de desarrollo.'))
      .finally(() => setLoadingTxs(false))
  }, [])

  // Estadísticas derivadas
  const pending   = transactions.filter(t => !cardStates[t._id] || cardStates[t._id]?.status !== 'completed')
  const completed = transactions.filter(t => cardStates[t._id]?.status === 'completed')
  const totalBOB  = transactions.reduce((acc, t) =>
    acc + (t.digitalAssetAmount ?? t.originalAmount) * (t.exchangeRate ?? BOB_RATE), 0)

  async function handleProcess(txId) {
    // Marca como loading
    setCardStates(prev => ({ ...prev, [txId]: { status: 'loading' } }))

    try {
      const { blob, filename } = await processBoliviaPayout(txId)
      // Éxito: guarda blob, cambia estado a completed
      setCardStates(prev => ({ ...prev, [txId]: { status: 'completed', blob, filename } }))
    } catch (err) {
      setCardStates(prev => ({ ...prev, [txId]: { status: 'error', error: err.message } }))
    }
  }

  return (
    <div className="min-h-screen bg-[#0F1628] font-sans flex flex-col max-w-[430px] mx-auto">
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
                <p className="text-[1.0625rem] font-bold text-white">Liquidaciones Bolivia</p>
                <span className="text-[0.625rem] font-bold px-2 py-0.5 rounded border border-[#C4A84F33] text-[#C4A84F] bg-[#C4A84F1A] tracking-wide flex-shrink-0">
                  SRL
                </span>
              </div>
              <p className="text-[0.75rem] text-[#4E5A7A]">AV Finance SRL · Anchor Manual · Corredor Bolivia</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-3">
            <StatPill label="Pendientes"  value={pending.length}      color="#C4A84F" />
            <StatPill label="Liquidadas"  value={completed.length}    color="#22C55E" />
            <StatPill label="Total est."  value={fmtBOB(totalBOB)}    color="#C4CBD8" small />
          </div>
        </header>

        {/* ── CONTENIDO ───────────────────────────────────────────── */}
        <div className="px-4 flex flex-col gap-4">

          {loadingTxs && (
            <div className="flex items-center justify-center py-16 gap-3 text-[#4E5A7A]">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-sm">Cargando transacciones…</span>
            </div>
          )}

          {fetchError && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-[#EF44441A] border border-[#EF444430]">
              <AlertCircle size={16} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
              <p className="text-[0.8125rem] text-[#F87171]">{fetchError}</p>
            </div>
          )}

          {!loadingTxs && !fetchError && transactions.length === 0 && (
            <div className="rounded-2xl bg-[#1A2340] p-10 text-center">
              <CheckCircle2 size={28} className="text-[#22C55E] mx-auto mb-2" />
              <p className="text-white font-semibold text-sm">Sin pendientes</p>
              <p className="text-[#8A96B8] text-xs mt-1">Todas las transacciones están liquidadas.</p>
            </div>
          )}

          {transactions.map(tx => (
            <SettlementCard
              key={tx._id}
              tx={tx}
              cardState={cardStates[tx._id]}
              onProcess={handleProcess}
              bobRate={bobRate}
            />
          ))}

        </div>
      </div>
    </div>
  )
}

function StatPill({ label, value, color, small }) {
  return (
    <div className="flex-1 rounded-2xl bg-[#1A2340] px-4 py-3">
      <p className="text-[0.6875rem] text-[#4E5A7A] mb-1">{label}</p>
      <p
        className={`font-extrabold leading-none ${small ? 'text-[0.875rem]' : 'text-[1.25rem]'}`}
        style={{ color }}
      >
        {value}
      </p>
    </div>
  )
}
