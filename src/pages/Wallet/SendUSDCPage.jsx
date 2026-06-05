/**
 * SendUSDCPage.jsx — Enviar USDC por alias (P2P instantáneo)
 *
 * Flujo de 4 pasos:
 *   1. Destinatario — input @alias
 *   2. Monto — input USDC + equivalente BOB informativo
 *   3. Confirmar — desglose de quote (Envías / Comisión / Total)
 *   4. Éxito — confirmación con saldo actualizado
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, AtSign, AlertCircle,
  CheckCircle2, Loader2, QrCode, ArrowRightLeft, Info,
} from 'lucide-react'
import { request } from '../../services/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatUSDC(amount) {
  if (amount == null) return '0.00 USDC'
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)} USDC`
}

function formatBOBNum(amount) {
  if (amount == null) return 'Bs. 0,00'
  return `Bs. ${new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`
}

const ALIAS_RE = /^[a-z0-9_]{3,20}$/

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ step }) {
  const steps = ['Destinatario', 'Monto', 'Confirmar']
  return (
    <div className="flex items-center px-5 py-3 gap-1">
      {steps.map((label, i) => {
        const idx     = i + 1
        const done    = idx < step
        const current = idx === step
        return (
          <div key={label} className="flex items-center gap-1.5 flex-1 last:flex-none">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.625rem] font-bold flex-shrink-0 ${
              done    ? 'bg-[#22C55E] text-white'    :
              current ? 'bg-[#0D6E52] text-white'    :
                        'bg-[#E2E8F0] text-[#94A3B8]'
            }`}>
              {done ? '✓' : idx}
            </div>
            <span className={`text-[0.6875rem] font-semibold whitespace-nowrap ${
              current ? 'text-[#0D6E52]' : done ? 'text-[#22C55E]' : 'text-[#94A3B8]'
            }`}>{label}</span>
            {i < steps.length - 1 && (
              <div className="flex-1 h-px mx-1" style={{ background: done ? '#22C55E' : '#E2E8F0' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── SendUSDCPage ──────────────────────────────────────────────────────────────

export default function SendUSDCPage() {
  const navigate = useNavigate()

  const [step,        setStep]        = useState(1)
  const [alias,       setAlias]       = useState('')
  const [amount,      setAmount]      = useState('')
  const [description, setDescription] = useState('')
  const [quote,       setQuote]       = useState(null)
  const [result,      setResult]      = useState(null)
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [rate,        setRate]        = useState(null)

  // One idempotency key per confirm-screen visit; reused on retry
  const idempKey = useRef(null)

  const fetchRate = useCallback(async () => {
    try {
      const data = await request('/wallet/usdc/rate')
      const r    = data?.bobPerUsdc ?? data?.rate
      const n    = Number(r)
      if (Number.isFinite(n) && n > 0) setRate(n)
    } catch { /* silencioso */ }
  }, [])

  useEffect(() => { fetchRate() }, [fetchRate])

  const aliasClean = alias.trim().toLowerCase().replace(/^@/, '')

  // ── Step 1: validate format ───────────────────────────────────────────────

  function handleStep1(e) {
    e.preventDefault()
    setError('')
    if (!ALIAS_RE.test(aliasClean)) {
      setError('El alias debe tener 3-20 caracteres: letras minúsculas, números o _')
      return
    }
    setStep(2)
  }

  // ── Step 2: fetch quote (validates recipient + fee) ───────────────────────

  async function handleStep2(e) {
    e.preventDefault()
    setError('')
    const n = Number(amount)
    if (!n || n < 1) { setError('El monto mínimo es 1 USDC.'); return }
    setLoading(true)
    try {
      const q = await request(
        `/wallet/usdc/transfer-quote?alias=${encodeURIComponent(aliasClean)}&amount=${n}`
      )
      setQuote(q)
      idempKey.current = crypto.randomUUID()
      setStep(3)
    } catch (err) {
      if (err.status === 404) setError('Alias no encontrado. Verifica el destinatario.')
      else setError(err.message || 'Error al obtener el desglose. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 3: send ──────────────────────────────────────────────────────────

  async function handleConfirm() {
    setError('')
    setLoading(true)
    try {
      const data = await request('/wallet/usdc/send', {
        method: 'POST',
        body: JSON.stringify({
          recipientAlias: aliasClean,
          amount: Number(amount),
          ...(description ? { description } : {}),
        }),
        headers: { 'Idempotency-Key': idempKey.current },
      })
      setResult(data)
      setStep(4)
    } catch (err) {
      const msg = err.data?.error || err.data?.message || err.message || ''
      if (err.status === 400 && msg.toLowerCase().includes('insuficiente')) {
        setError('Saldo USDC insuficiente para completar esta transferencia.')
      } else if (err.status === 400 && msg.toLowerCase().includes('self')) {
        setError('No puedes enviarte USDC a ti mismo.')
      } else if (err.status === 404) {
        setError('El destinatario ya no existe. Vuelve al paso 1.')
      } else {
        setError(msg || 'Error al procesar la transferencia. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  const bobEquiv = rate && amount ? (Number(amount) * rate) : null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-4 border-b border-[#E2E8F0] bg-white">
        <button
          onClick={() => (step === 1 || step === 4) ? navigate('/wallet') : setStep(s => s - 1)}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#F1F5F9] border border-[#E2E8F0]"
        >
          <ArrowLeft size={18} className="text-[#64748B]" />
        </button>
        <div>
          <h1 className="text-[1rem] font-bold text-[#0F172A]">Enviar USDC</h1>
          <p className="text-[0.75rem] text-[#94A3B8]">Transferencia P2P instantánea</p>
        </div>
      </div>

      {/* Step indicator */}
      {step < 4 && (
        <div className="bg-white border-b border-[#E2E8F0]">
          <StepIndicator step={step} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto">

        {/* ── Step 1: Destinatario ─────────────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="px-5 py-6 flex flex-col gap-5">
            <div>
              <p className="text-[0.9375rem] font-semibold text-[#0F172A] mb-1">¿A quién envías?</p>
              <p className="text-[0.8125rem] text-[#64748B]">Ingresa el alias Alyto del destinatario.</p>
            </div>

            <div>
              <label className="block text-[0.75rem] font-semibold text-[#94A3B8] uppercase tracking-wide mb-2">
                Alias Alyto
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-[#0D6E521A] flex items-center justify-center flex-shrink-0">
                  <AtSign size={15} className="text-[#0D6E52]" />
                </div>
                <input
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  value={alias}
                  onChange={e => { setAlias(e.target.value); setError('') }}
                  placeholder="usuarioalyto"
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl pl-14 pr-4 py-4 text-[#0F172A] text-[1.125rem] font-semibold focus:outline-none focus:border-[#0D6E52] focus:shadow-[0_0_0_3px_#0D6E521A] transition-all placeholder:text-[#CBD5E1]"
                />
              </div>
              <p className="text-[0.6875rem] text-[#94A3B8] mt-1.5">
                3-20 caracteres: letras minúsculas, números o _
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
                <AlertCircle size={14} className="text-[#EF4444] flex-shrink-0" />
                <p className="text-[0.8125rem] text-[#EF4444]">{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={!aliasClean}
                className="w-full py-4 rounded-2xl text-[0.9375rem] font-bold text-white transition-all disabled:opacity-40"
                style={{ background: '#0D6E52', boxShadow: aliasClean ? '0 4px 20px rgba(13,110,82,0.25)' : 'none' }}
              >
                Continuar
              </button>
              <button
                type="button"
                onClick={() => navigate('/wallet/qr?tab=pagar')}
                className="w-full py-3.5 rounded-2xl text-[0.875rem] font-semibold text-[#64748B] bg-white border border-[#E2E8F0] flex items-center justify-center gap-2 hover:border-[#CBD5E1] transition-colors"
              >
                <QrCode size={16} /> Escanear QR
              </button>
            </div>
          </form>
        )}

        {/* ── Step 2: Monto ─────────────────────────────────────────────── */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="px-5 py-6 flex flex-col gap-5">
            {/* Recipient chip */}
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-[#E2E8F0]">
              <div className="w-10 h-10 rounded-full bg-[#0D6E521A] flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-[#0D6E52]" />
              </div>
              <div>
                <p className="text-[0.6875rem] text-[#94A3B8]">Destinatario</p>
                <p className="text-[0.9375rem] font-bold text-[#0F172A]">@{aliasClean}</p>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-[0.75rem] font-semibold text-[#94A3B8] uppercase tracking-wide mb-2">
                Monto en USDC
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] font-bold">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={e => { setAmount(e.target.value); setError('') }}
                  placeholder="0.00"
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl pl-9 pr-20 py-4 text-[#0F172A] text-[1.5rem] font-bold focus:outline-none focus:border-[#0D6E52] focus:shadow-[0_0_0_3px_#0D6E521A] transition-all placeholder:text-[#CBD5E1]"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] font-semibold text-[0.875rem]">USDC</span>
              </div>
              {bobEquiv != null && (
                <div className="mt-2 flex items-center gap-1.5">
                  <ArrowRightLeft size={11} className="text-[#94A3B8]" />
                  <p className="text-[0.75rem] text-[#64748B]">
                    ≈ {formatBOBNum(bobEquiv)}{' '}
                    <span className="text-[#94A3B8]">(referencial)</span>
                  </p>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-[0.75rem] font-semibold text-[#94A3B8] uppercase tracking-wide mb-2">
                Descripción (opcional)
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={100}
                placeholder="Ej: pago servicio, alquiler..."
                className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0F172A] text-[0.9375rem] focus:outline-none focus:border-[#0D6E52] focus:shadow-[0_0_0_3px_#0D6E521A] transition-all placeholder:text-[#CBD5E1]"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
                <AlertCircle size={14} className="text-[#EF4444] flex-shrink-0" />
                <p className="text-[0.8125rem] text-[#EF4444]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !amount || Number(amount) < 1}
              className="w-full py-4 rounded-2xl text-[0.9375rem] font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: '#0D6E52', boxShadow: '0 4px 20px rgba(13,110,82,0.25)' }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Ver resumen'}
            </button>
          </form>
        )}

        {/* ── Step 3: Confirmar ─────────────────────────────────────────── */}
        {step === 3 && quote && (
          <div className="px-5 py-6 flex flex-col gap-5">
            {/* Recipient confirmed */}
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-[#E2E8F0]">
              <div className="w-10 h-10 rounded-full bg-[#0D6E521A] flex items-center justify-center flex-shrink-0">
                <User size={18} className="text-[#0D6E52]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[0.6875rem] text-[#94A3B8]">Destinatario</p>
                <p className="text-[0.9375rem] font-bold text-[#0F172A]">
                  {quote.recipient?.name || `@${aliasClean}`}
                </p>
                <p className="text-[0.75rem] text-[#64748B]">@{quote.recipient?.alias || aliasClean}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#22C55E1A] flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={16} className="text-[#22C55E]" />
              </div>
            </div>

            {/* Fee breakdown */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#F1F5F9]">
                <p className="text-[0.75rem] font-semibold text-[#94A3B8] uppercase tracking-wide">Desglose</p>
              </div>
              <div className="px-4 py-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[0.875rem] text-[#64748B]">Envías</span>
                  <span className="text-[0.9375rem] font-bold text-[#0F172A]">{formatUSDC(quote.amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[0.875rem] text-[#64748B]">Comisión</span>
                  <span className={`text-[0.9375rem] font-semibold ${
                    Number(quote.fee) === 0 ? 'text-[#22C55E]' : 'text-[#0F172A]'
                  }`}>
                    {Number(quote.fee) === 0 ? 'Gratis' : formatUSDC(quote.fee)}
                  </span>
                </div>
                <div className="h-px bg-[#F1F5F9]" />
                <div className="flex justify-between items-center">
                  <span className="text-[0.9375rem] font-bold text-[#0F172A]">Total debitado</span>
                  <span className="text-[1.0625rem] font-extrabold text-[#0D6E52]">{formatUSDC(quote.total)}</span>
                </div>
              </div>
            </div>

            {/* BOB equivalent info */}
            {bobEquiv != null && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <Info size={14} className="text-[#94A3B8] mt-0.5 flex-shrink-0" />
                <p className="text-[0.75rem] text-[#64748B]">
                  Equivalente referencial ≈ {formatBOBNum(bobEquiv)} BOB.
                  La liquidación es en USDC en la red Stellar.
                </p>
              </div>
            )}

            {description && (
              <div className="px-4 py-3 rounded-xl bg-white border border-[#E2E8F0]">
                <p className="text-[0.6875rem] text-[#94A3B8] mb-0.5">Descripción</p>
                <p className="text-[0.875rem] text-[#0F172A]">{description}</p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
                <AlertCircle size={14} className="text-[#EF4444] flex-shrink-0" />
                <p className="text-[0.8125rem] text-[#EF4444]">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setStep(2); setError('') }}
                className="flex-1 py-3.5 rounded-2xl text-[0.9375rem] font-semibold text-[#64748B] bg-white border border-[#E2E8F0]"
              >
                Volver
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 py-3.5 rounded-2xl text-[0.9375rem] font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ background: '#0D6E52', boxShadow: '0 4px 20px rgba(13,110,82,0.25)' }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar envío'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Éxito ─────────────────────────────────────────────── */}
        {step === 4 && result && (
          <div className="px-5 py-10 flex flex-col items-center gap-6 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: '#22C55E1A', border: '2px solid #22C55E33' }}>
              <CheckCircle2 size={36} className="text-[#22C55E]" />
            </div>
            <div>
              <p className="text-[1.5rem] font-extrabold text-[#0F172A]">{formatUSDC(result.amount)}</p>
              <p className="text-[0.9375rem] text-[#64748B] mt-1">
                enviados a{' '}
                <span className="font-semibold text-[#0F172A]">
                  @{result.recipient?.alias || aliasClean}
                </span>
              </p>
              {result.recipient?.name && (
                <p className="text-[0.8125rem] text-[#94A3B8] mt-0.5">{result.recipient.name}</p>
              )}
            </div>

            <div className="w-full bg-white rounded-2xl border border-[#E2E8F0] px-4 py-3 space-y-2 text-left">
              {result.fee != null && (
                <div className="flex justify-between">
                  <span className="text-[0.8125rem] text-[#64748B]">Comisión</span>
                  <span className="text-[0.8125rem] font-semibold text-[#0F172A]">
                    {Number(result.fee) === 0 ? 'Gratis' : formatUSDC(result.fee)}
                  </span>
                </div>
              )}
              {result.balanceAfter != null && (
                <div className="flex justify-between">
                  <span className="text-[0.8125rem] text-[#64748B]">Tu saldo USDC</span>
                  <span className="text-[0.8125rem] font-bold text-[#0D6E52]">{formatUSDC(result.balanceAfter)}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/wallet')}
              className="w-full py-4 rounded-2xl text-[0.9375rem] font-bold text-white"
              style={{ background: '#0D6E52', boxShadow: '0 4px 20px rgba(13,110,82,0.25)' }}
            >
              Volver a mi wallet
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
