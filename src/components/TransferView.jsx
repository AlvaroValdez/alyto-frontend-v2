import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, AlertCircle, Loader2 } from 'lucide-react'
import { initiatePayin } from '../services/api'

// Tipo de cambio referencial CLP → USDC (se actualizará desde backend)
const CLP_TO_USDC = 0.00108

export default function TransferView() {
  const navigate = useNavigate()
  const [amount, setAmount]     = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)
  const [userId, setUserId]     = useState(null)

  // En desarrollo obtiene el userId del usuario de prueba sembrado en el backend.
  // En producción esto vendrá del contexto de autenticación real.
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/v1/dev/test-user`)
      .then(r => r.json())
      .then(d => setUserId(d.userId))
      .catch(() => setError('No se pudo conectar con el servidor de desarrollo.'))
  }, [])

  const clpValue   = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0
  const usdcValue  = (clpValue * CLP_TO_USDC).toFixed(2)
  const feeClp     = Math.round(clpValue * 0.012)          // 1.2% de fee referencial
  const totalClp   = clpValue + feeClp

  function handleAmountChange(e) {
    // Solo dígitos; insertar separadores de miles al vuelo
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) { setAmount(''); return }
    setAmount(Number(raw).toLocaleString('es-CL'))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (clpValue < 5000) {
      setError('El monto mínimo es $5.000 CLP')
      return
    }

    setLoading(true)
    try {
      /**
       * El backend de Fintoc devuelve { widget_url, payment_intent_id }.
       * Redirigimos al usuario directamente a widget_url — Fintoc finaliza
       * el flujo y redirige de vuelta a nuestro callback configurado en el
       * backend (redirect_to en la creación del payment_intent).
       */
      const data = await initiatePayin(clpValue, userId)

      if (data.widgetUrl) {
        window.location.href = data.widgetUrl
      } else {
        setError('Respuesta inesperada del servidor. Intenta de nuevo.')
      }
    } catch (err) {
      setError(err.message || 'No se pudo conectar con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F1628] font-sans flex flex-col max-w-[430px] mx-auto">

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 pt-14 pb-6">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-full bg-[#1A2340] flex items-center justify-center border border-[#263050] flex-shrink-0 hover:border-[#C4CBD833] transition-colors"
        >
          <ArrowLeft size={18} className="text-[#8A96B8]" />
        </button>
        <div>
          <p className="text-[0.75rem] text-[#8A96B8]">AV Finance SpA · Corredor Chile</p>
          <h1 className="text-[1.125rem] font-bold text-white leading-tight">Nueva Transferencia</h1>
        </div>
      </header>

      {/* ── SCROLL BODY ────────────────────────────────────────────── */}
      <div className="flex-1 px-4 flex flex-col gap-4 pb-10">

        {/* ── AMOUNT CARD ─────────────────────────────────────────── */}
        <div
          className="rounded-3xl p-6"
          style={{
            background: '#1A2340',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          }}
        >
          <p className="text-[0.6875rem] font-semibold text-[#8A96B8] uppercase tracking-[0.1em] mb-4">
            Monto a enviar
          </p>

          {/* Input principal */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[1.25rem] font-bold text-[#4E5A7A]">$</span>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0"
              className="flex-1 bg-transparent text-[2.5rem] font-extrabold text-white leading-none tracking-tight outline-none placeholder-[#263050] caret-[#C4A84F]"
              style={{ minWidth: 0 }}
            />
            <span className="text-[0.875rem] font-semibold text-[#4E5A7A] self-center">CLP</span>
          </div>

          {/* Equivalencia USDC */}
          {clpValue > 0 && (
            <p className="text-[0.8125rem] text-[#8A96B8] mb-0">
              ≈ <span className="text-[#C4CBD8] font-semibold">{usdcValue} USDC</span> en Stellar
            </p>
          )}

          {/* Divisor */}
          <div className="border-t border-[#263050] mt-5 mb-4" />

          {/* Montos rápidos */}
          <div className="flex gap-2">
            {[50000, 100000, 250000, 500000].map((preset) => (
              <button
                key={preset}
                onClick={() => setAmount(preset.toLocaleString('es-CL'))}
                className="flex-1 py-1.5 rounded-xl bg-[#263050] text-[#8A96B8] text-[0.6875rem] font-medium hover:bg-[#2E3A5E] hover:text-[#C4CBD8] transition-colors"
              >
                ${(preset / 1000).toFixed(0)}k
              </button>
            ))}
          </div>
        </div>

        {/* ── DESTINATION CARD ────────────────────────────────────── */}
        <div className="rounded-3xl p-5 bg-[#1A2340]" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
          <p className="text-[0.6875rem] font-semibold text-[#8A96B8] uppercase tracking-[0.1em] mb-4">
            Destino
          </p>

          {/* Selector de país (simulado) */}
          <button className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[#0F1628] border border-[#263050] hover:border-[#C4CBD833] transition-colors">
            <span className="text-2xl">🇧🇴</span>
            <div className="flex-1 text-left">
              <p className="text-[0.9375rem] font-semibold text-white">Bolivia</p>
              <p className="text-[0.75rem] text-[#8A96B8]">AV Finance SRL · Anchor Manual BO</p>
            </div>
            <ChevronDown size={16} className="text-[#4E5A7A]" />
          </button>

          {/* Ruta del pago */}
          <div className="mt-4 flex items-center gap-2 text-[0.75rem] text-[#4E5A7A]">
            <span className="px-2 py-0.5 rounded-full bg-[#22C55E1A] text-[#22C55E] font-medium">Fintoc A2A</span>
            <span>→</span>
            <span className="px-2 py-0.5 rounded-full bg-[#C4CBD81A] text-[#C4CBD8] font-medium">Stellar USDC</span>
            <span>→</span>
            <span className="px-2 py-0.5 rounded-full bg-[#C4CBD81A] text-[#C4CBD8] font-medium">BOB</span>
          </div>
        </div>

        {/* ── FEE SUMMARY ─────────────────────────────────────────── */}
        {clpValue > 0 && (
          <div className="rounded-3xl px-5 py-4 bg-[#1A2340]" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
            <p className="text-[0.6875rem] font-semibold text-[#8A96B8] uppercase tracking-[0.1em] mb-3">
              Resumen
            </p>
            <div className="flex flex-col gap-2">
              <SummaryRow label="Monto"        value={`$${clpValue.toLocaleString('es-CL')} CLP`} />
              <SummaryRow label="Fee (1.2%)"   value={`$${feeClp.toLocaleString('es-CL')} CLP`}   muted />
              <div className="border-t border-[#263050] pt-2 mt-1">
                <SummaryRow label="Total a debitar" value={`$${totalClp.toLocaleString('es-CL')} CLP`} bold />
              </div>
            </div>
          </div>
        )}

        {/* ── ERROR ───────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-[#EF44441A] border border-[#EF444430]">
            <AlertCircle size={16} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
            <p className="text-[0.8125rem] text-[#F87171]">{error}</p>
          </div>
        )}

        {/* ── CTA BUTTON ──────────────────────────────────────────── */}
        <button
          onClick={handleSubmit}
          disabled={loading || clpValue < 1 || !userId}
          className="w-full py-4 rounded-2xl font-bold text-[0.9375rem] transition-all flex items-center justify-center gap-2"
          style={{
            background: loading || clpValue < 1 || !userId ? '#C4A84F40' : '#C4A84F',
            color:      loading || clpValue < 1 || !userId ? '#C4A84F80' : '#0F1628',
            boxShadow:  loading || clpValue < 1 || !userId ? 'none'      : '0 4px 20px rgba(196,168,79,0.35)',
          }}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Conectando con Fintoc…
            </>
          ) : (
            'Continuar al pago →'
          )}
        </button>

        {/* Nota legal */}
        <p className="text-center text-[0.6875rem] text-[#4E5A7A] px-4">
          Al continuar serás redirigido al widget de Fintoc para autorizar el débito bancario.
          Operación procesada por AV Finance SpA.
        </p>

      </div>
    </div>
  )
}

function SummaryRow({ label, value, muted, bold }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-[0.8125rem] ${muted ? 'text-[#4E5A7A]' : 'text-[#8A96B8]'}`}>{label}</span>
      <span className={`text-[0.8125rem] ${bold ? 'font-bold text-white' : muted ? 'text-[#4E5A7A]' : 'text-[#C4CBD8] font-semibold'}`}>{value}</span>
    </div>
  )
}
