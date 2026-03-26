/**
 * CorporateView.jsx — Plataforma Institucional B2B (AV Finance LLC)
 *
 * Vista exclusiva para clientes corporativos LLC que ejecutan on-ramp
 * institucional fiat→USDC vía OwlPay Harbor sobre la red Stellar.
 *
 * Terminología aplicada (CLAUDE.md):
 *   ✓ cross-border payment, on-ramp, liquidación, pay-in institucional
 *   ✗ remesa, remittance (PROHIBIDO)
 */

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Wallet,
  FileText,
  CheckCircle2,
  ExternalLink,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { useAuth }                from '../context/AuthContext'
import { initiateCorporateOnRamp } from '../services/api'

// ── Badge de entorno ──────────────────────────────────────────────────────────

const IS_PROD    = import.meta.env.PROD
const ENV_LABEL  = IS_PROD ? 'Harbor Live' : 'Harbor Sandbox'
const ENV_COLOR  = '#22C55E'
const ENV_BG     = '#22C55E1A'
const ENV_BORDER = '#22C55E33'

// ── Validación de wallet Stellar ──────────────────────────────────────────────

function isValidStellarKey(key) {
  return /^G[A-Z2-7]{55}$/.test(key.trim())
}

// ── Card resultado exitoso ────────────────────────────────────────────────────

function SuccessCard({ result, onReset }) {
  const { alytoTransactionId, owlPayOrderId, estimatedUSDC, paymentUrl } = result

  return (
    <div className="rounded-2xl border border-[#22C55E33] bg-[#22C55E0D] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[#22C55E1A]">
        <div className="w-9 h-9 rounded-xl bg-[#22C55E1A] flex items-center justify-center flex-shrink-0">
          <CheckCircle2 size={18} className="text-[#22C55E]" />
        </div>
        <div>
          <p className="text-[0.9375rem] font-bold text-white leading-tight">On-ramp iniciado correctamente</p>
          <p className="text-[0.6875rem] text-[#8A96B8]">AV Finance LLC · OwlPay Harbor</p>
        </div>
      </div>

      {/* Datos */}
      <div className="px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[0.75rem] text-[#8A96B8]">ID Alyto</span>
          <span className="text-[0.8125rem] font-mono font-semibold text-[#C4CBD8]">
            {alytoTransactionId ?? '—'}
          </span>
        </div>
        {owlPayOrderId && (
          <div className="flex items-center justify-between">
            <span className="text-[0.75rem] text-[#8A96B8]">ID Harbor</span>
            <span className="text-[0.8125rem] font-mono font-semibold text-[#C4CBD8]">
              {owlPayOrderId}
            </span>
          </div>
        )}
        {estimatedUSDC != null && (
          <div className="flex items-center justify-between">
            <span className="text-[0.75rem] text-[#8A96B8]">USDC estimado</span>
            <span className="text-[0.9375rem] font-bold text-[#22C55E]">
              {Number(estimatedUSDC).toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC
            </span>
          </div>
        )}
      </div>

      {/* CTA + nota */}
      <div className="px-4 pb-4 flex flex-col gap-3">
        {paymentUrl && (
          <a
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] no-underline transition-all"
            style={{ background: '#22C55E', color: '#0F1628', boxShadow: '0 4px 20px rgba(34,197,94,0.3)' }}
          >
            Ver instrucciones de pago
            <ExternalLink size={15} />
          </a>
        )}
        <p className="text-center text-[0.6875rem] text-[#4E5A7A] leading-relaxed">
          El USDC llegará a tu wallet Stellar en 1–2 días hábiles tras confirmar el wire transfer.
        </p>
        <button
          onClick={onReset}
          className="text-center text-[0.75rem] font-medium text-[#8A96B8] hover:text-[#C4CBD8] transition-colors py-1"
        >
          Iniciar nueva operación
        </button>
      </div>
    </div>
  )
}

// ── Vista principal ───────────────────────────────────────────────────────────

export default function CorporateView() {
  const navigate          = useNavigate()
  const { user }          = useAuth()

  // Form state
  const [amount,      setAmount]      = useState('')
  const [wallet,      setWallet]      = useState('')
  const [memo,        setMemo]        = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [result,      setResult]      = useState(null)   // respuesta exitosa del backend

  // Derived
  const numAmount      = parseFloat(amount.replace(/,/g, '')) || 0
  const walletTrimmed  = wallet.trim()
  const walletValid    = isValidStellarKey(walletTrimmed)
  const canSubmit      = numAmount >= 1000 && numAmount <= 500000 && walletValid && !loading

  function handleAmountChange(e) {
    setAmount(e.target.value.replace(/[^0-9.]/g, ''))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (numAmount < 1000)    { setError('El monto mínimo es $1,000 USD.'); return }
    if (numAmount > 500000)  { setError('El monto máximo es $500,000 USD.'); return }
    if (!walletValid)        { setError('Wallet Stellar inválida — debe comenzar con G y tener 56 caracteres.'); return }

    setLoading(true)
    try {
      const data = await initiateCorporateOnRamp({
        userId:            user?._id ?? user?.id,
        amount:            numAmount,
        destinationWallet: walletTrimmed,
        memo:              memo.trim() || undefined,
      })
      setResult(data)
    } catch (err) {
      setError(err.message || 'Error al procesar la operación. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setResult(null)
    setAmount('')
    setWallet('')
    setMemo('')
    setError(null)
  }

  return (
    <div className="min-h-screen bg-[#0F1628] font-sans flex flex-col max-w-[430px] mx-auto">
      <div className="flex-1 overflow-y-auto pb-12">

        {/* ── SECCIÓN 1 — HEADER ───────────────────────────────────── */}
        <header className="px-4 pt-14 pb-6">
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-[#1A2340] flex items-center justify-center border border-[#263050] flex-shrink-0 hover:border-[#C4CBD833] transition-colors"
            >
              <ArrowLeft size={18} className="text-[#8A96B8]" />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <h1 className="text-[1.0625rem] font-bold text-white leading-tight">
                  Plataforma Institucional B2B
                </h1>
                {/* Badge entorno */}
                <span
                  className="text-[0.625rem] font-bold px-2 py-0.5 rounded border tracking-wide flex-shrink-0"
                  style={{ color: ENV_COLOR, background: ENV_BG, borderColor: ENV_BORDER }}
                >
                  {ENV_LABEL}
                </span>
              </div>
              <p className="text-[0.75rem] text-[#4E5A7A]">
                On-ramp fiat → USDC vía OwlPay Harbor · AV Finance LLC
              </p>
            </div>
          </div>
        </header>

        <div className="px-4 flex flex-col gap-5">

          {/* ── SECCIÓN 2 — FORMULARIO / RESULTADO ───────────────────── */}
          {result ? (
            <SuccessCard result={result} onReset={handleReset} />
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl bg-[#1A2340] border border-[#263050] overflow-hidden"
            >
              <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-[#263050]">
                <div className="w-8 h-8 rounded-xl bg-[#C4CBD81A] flex items-center justify-center">
                  <Building2 size={15} className="text-[#C4CBD8]" />
                </div>
                <p className="text-[0.9375rem] font-bold text-white">Nueva liquidación</p>
              </div>

              <div className="px-4 py-4 flex flex-col gap-4">

                {/* Monto USD */}
                <div>
                  <label className="block text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-[0.08em] mb-2">
                    Monto USD
                  </label>
                  <div
                    className="flex items-center gap-2 rounded-2xl px-4 py-3.5 border transition-all"
                    style={{
                      background:   '#0F1628',
                      borderColor:  amount ? (numAmount >= 1000 && numAmount <= 500000 ? '#22C55E' : '#EF4444') : '#263050',
                      boxShadow:    amount ? (numAmount >= 1000 && numAmount <= 500000 ? '0 0 0 2px #22C55E15' : '0 0 0 2px #EF444415') : 'none',
                    }}
                  >
                    <span className="text-[#4E5A7A] font-bold text-lg">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={handleAmountChange}
                      placeholder="0.00"
                      className="flex-1 bg-transparent text-white text-[1.125rem] font-bold outline-none placeholder-[#263050]"
                    />
                    <span className="text-[0.75rem] font-semibold text-[#4E5A7A]">USD</span>
                  </div>
                  {amount && numAmount > 0 && numAmount < 1000 && (
                    <p className="text-[0.6875rem] text-[#EF4444] mt-1.5 ml-1">Monto mínimo: $1,000 USD</p>
                  )}
                  {amount && numAmount > 500000 && (
                    <p className="text-[0.6875rem] text-[#EF4444] mt-1.5 ml-1">Monto máximo: $500,000 USD</p>
                  )}
                  {numAmount >= 1000 && numAmount <= 500000 && (
                    <p className="text-[0.6875rem] text-[#22C55E] mt-1.5 ml-1">
                      ≈ {numAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC en Stellar
                    </p>
                  )}
                </div>

                {/* Stellar Wallet destino */}
                <div>
                  <label className="block text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-[0.08em] mb-2">
                    Stellar Wallet Destino
                  </label>
                  <div
                    className="flex items-start gap-2 rounded-2xl px-4 py-3.5 border transition-all"
                    style={{
                      background:   '#0F1628',
                      borderColor:  wallet ? (walletValid ? '#22C55E' : '#EF4444') : '#263050',
                      boxShadow:    wallet ? (walletValid ? '0 0 0 2px #22C55E15' : '0 0 0 2px #EF444415') : 'none',
                    }}
                  >
                    <Wallet size={16} className="text-[#4E5A7A] mt-0.5 flex-shrink-0" />
                    <input
                      type="text"
                      value={wallet}
                      onChange={e => setWallet(e.target.value)}
                      placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                      className="flex-1 bg-transparent text-white text-[0.8125rem] font-mono outline-none placeholder-[#263050] break-all"
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </div>
                  {wallet && !walletValid && (
                    <p className="text-[0.6875rem] text-[#EF4444] mt-1.5 ml-1">
                      Dirección inválida — debe comenzar con G y tener 56 caracteres
                    </p>
                  )}
                </div>

                {/* Memo (opcional) */}
                <div>
                  <label className="block text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-[0.08em] mb-2">
                    Memo <span className="text-[#4E5A7A] normal-case tracking-normal font-normal">(opcional)</span>
                  </label>
                  <div
                    className="flex items-center gap-2 rounded-2xl px-4 py-3.5 border transition-all"
                    style={{
                      background:  '#0F1628',
                      borderColor: memo ? '#C4CBD833' : '#263050',
                    }}
                  >
                    <FileText size={15} className="text-[#4E5A7A] flex-shrink-0" />
                    <input
                      type="text"
                      value={memo}
                      onChange={e => setMemo(e.target.value)}
                      placeholder="OP-YYYYMMDD"
                      maxLength={64}
                      className="flex-1 bg-transparent text-white text-[0.875rem] outline-none placeholder-[#4E5A7A]"
                    />
                  </div>
                </div>

                {/* Ruta */}
                <div className="rounded-xl px-4 py-3 bg-[#0F1628] border border-[#1A2340]">
                  <p className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-[0.08em] mb-2">
                    Ruta de la operación
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: 'AV Finance LLC', style: { color: '#C4CBD8', background: '#C4CBD81A' } },
                      { label: 'OwlPay Harbor',  style: { color: '#C4CBD8', background: '#C4CBD81A' } },
                      { label: 'USDC · Stellar', style: { color: '#22C55E', background: '#22C55E1A' } },
                    ].map((node, i, arr) => (
                      <span key={node.label} className="flex items-center gap-1.5">
                        <span
                          className="px-2 py-0.5 rounded-full text-[0.625rem] font-semibold"
                          style={node.style}
                        >
                          {node.label}
                        </span>
                        {i < arr.length - 1 && (
                          <ChevronRight size={10} className="text-[#4E5A7A] flex-shrink-0" />
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-[#EF44441A] border border-[#EF444430]">
                    <AlertCircle size={15} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
                    <p className="text-[0.8125rem] text-[#F87171]">{error}</p>
                  </div>
                )}

                {/* Botón */}
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full py-4 rounded-2xl font-bold text-[0.9375rem] flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: canSubmit ? '#C4CBD8' : '#C4CBD81A',
                    color:      canSubmit ? '#0F1628' : '#4E5A7A',
                    boxShadow:  canSubmit ? '0 4px 20px rgba(196,203,216,0.3)' : 'none',
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Procesando…
                    </>
                  ) : (
                    'Iniciar on-ramp →'
                  )}
                </button>

                <p className="text-center text-[0.6875rem] text-[#4E5A7A]">
                  Sujeto a verificación KYB · Liquidación T+0 vía Stellar
                </p>
              </div>
            </form>
          )}

          {/* ── SECCIÓN 3 — HISTORIAL DE LIQUIDACIONES ───────────────── */}
          <div className="rounded-2xl bg-[#1A2340] border border-[#263050] overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-[#263050]">
              <Clock size={14} className="text-[#4E5A7A]" />
              <p className="text-[0.9375rem] font-bold text-white">Historial de liquidaciones</p>
            </div>
            {/* Estado vacío — historial se implementa en fase posterior */}
            <div className="px-4 py-8 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#263050] flex items-center justify-center">
                <Clock size={22} className="text-[#4E5A7A]" />
              </div>
              <p className="text-[0.875rem] text-[#8A96B8]">
                Las liquidaciones completadas aparecerán aquí
              </p>
              <p className="text-[0.75rem] text-[#4E5A7A]">
                Las operaciones confirmadas se sincronizan automáticamente
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
