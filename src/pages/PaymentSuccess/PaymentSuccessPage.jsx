/**
 * PaymentSuccessPage.jsx — Pantalla post-pago Fintoc
 *
 * Fintoc redirige aquí tras completar el pago en el widget.
 * Muestra un spinner por 2s, luego hace polling al estado
 * de la transacción hasta confirmar o agotar los intentos.
 *
 * sessionStorage.getItem('lastTransactionId') → guardado en Step4Confirm
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle2, Clock } from 'lucide-react'
import { getTransactionStatus } from '../../services/paymentsService'

const MAX_ATTEMPTS     = 10
const POLL_INTERVAL_MS = 3000   // 3s entre intentos
const INITIAL_DELAY_MS = 2000   // 2s de spinner antes del primer check

// ─── Estados de la página ─────────────────────────────────────────────────────
// 'loading'   → spinner inicial / polling en curso
// 'confirmed' → payin_confirmed o completed
// 'timeout'   → 10 intentos sin confirmación

export default function PaymentSuccessPage() {
  const navigate    = useNavigate()
  const [phase, setPhase]               = useState('loading')
  const [transactionId, setTransactionId] = useState(null)
  const attemptsRef = useRef(0)
  const timerRef    = useRef(null)

  useEffect(() => {
    const txId = sessionStorage.getItem('lastTransactionId')
    setTransactionId(txId)

    if (!txId) {
      setPhase('timeout')
      return
    }

    // Spinner por 2s antes de la primera consulta
    const init = setTimeout(() => poll(txId), INITIAL_DELAY_MS)
    return () => {
      clearTimeout(init)
      clearTimeout(timerRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function poll(txId) {
    if (attemptsRef.current >= MAX_ATTEMPTS) {
      setPhase('timeout')
      return
    }

    attemptsRef.current += 1

    try {
      const data = await getTransactionStatus(txId)
      if (data.status === 'payin_confirmed' || data.status === 'completed') {
        setPhase('confirmed')
        return
      }
    } catch {
      // Continuar polling si hay error de red
    }

    timerRef.current = setTimeout(() => poll(txId), POLL_INTERVAL_MS)
  }

  // ─── Render según fase ────────────────────────────────────────────────────

  if (phase === 'loading') {
    return <LoadingScreen />
  }

  if (phase === 'confirmed') {
    return (
      <ConfirmedScreen
        transactionId={transactionId}
        navigate={navigate}
      />
    )
  }

  return <TimeoutScreen navigate={navigate} />
}

// ─── Sub-pantallas ────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0F1628] flex flex-col items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6">
        {/* Logo mark */}
        <div className="w-16 h-16 rounded-2xl bg-[#1A2340] border border-[#263050] flex items-center justify-center">
          <span className="text-[1.5rem] font-extrabold text-[#C4CBD8]">❯</span>
        </div>

        {/* Spinner */}
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-[#C4CBD8] animate-spin" />
          <p className="text-[1rem] font-semibold text-white">Verificando tu pago</p>
          <p className="text-[0.8125rem] text-[#8A96B8] text-center">
            Estamos confirmando la transferencia con tu banco
          </p>
        </div>

        {/* Dots progress */}
        <div className="flex gap-2 mt-2">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-[#263050]"
              style={{ animation: `pulse 1.2s ease-in-out ${i * 0.3}s infinite` }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { background: #263050; transform: scale(1); }
          50%       { background: #C4CBD8; transform: scale(1.3); }
        }
      `}</style>
    </div>
  )
}

function ConfirmedScreen({ transactionId, navigate }) {
  return (
    <div className="min-h-screen bg-[#0F1628] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-[430px] mx-auto w-full">

        {/* Ícono de éxito */}
        <div className="relative mb-6">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center"
            style={{ background: 'radial-gradient(circle, #22C55E25 0%, #22C55E08 60%, transparent 75%)' }}
          >
            <div
              className="w-24 h-24 rounded-full bg-[#22C55E1A] border-2 border-[#22C55E33] flex items-center justify-center"
              style={{ animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="11" stroke="#22C55E" strokeWidth="1.5" />
                <path
                  d="M7.5 12L10.5 15L16.5 9"
                  stroke="#22C55E"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 20,
                    strokeDashoffset: 0,
                    animation: 'draw 0.4s ease-out 0.25s both',
                  }}
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Mensaje principal */}
        <div className="text-center mb-8">
          <h1 className="text-[1.5rem] font-extrabold text-white mb-2">
            ¡Pago recibido!
          </h1>
          <p className="text-[0.9375rem] text-[#8A96B8]">
            Estamos procesando tu transferencia
          </p>
        </div>

        {/* Card de estado */}
        <div className="w-full bg-[#1A2340] border border-[#263050] rounded-2xl overflow-hidden mb-6">
          <div
            className="px-5 py-4"
            style={{ background: 'linear-gradient(135deg, #1D346120 0%, #22C55E10 100%)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#22C55E1A] flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={20} className="text-[#22C55E]" />
              </div>
              <div>
                <p className="text-[0.8125rem] font-semibold text-white">Pago confirmado</p>
                <p className="text-[0.75rem] text-[#8A96B8]">Tu banco procesó la transferencia</p>
              </div>
            </div>
          </div>

          {transactionId && (
            <div className="px-5 py-3 border-t border-[#263050]">
              <p className="text-[0.6875rem] text-[#4E5A7A] mb-1">Número de referencia</p>
              <p className="text-[0.8125rem] font-mono font-semibold text-[#C4CBD8]">
                {transactionId.slice(0, 12)}...{transactionId.slice(-6)}
              </p>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={() => navigate(`/transactions/${transactionId}`)}
            className="w-full py-4 rounded-2xl bg-[#C4CBD8] text-[#0F1628] text-[0.9375rem] font-bold shadow-[0_4px_20px_rgba(196,203,216,0.3)] active:scale-[0.98] transition-all"
          >
            Ver estado
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3.5 rounded-2xl bg-transparent border border-[#263050] text-white text-[0.9375rem] font-semibold hover:border-[#C4CBD833] hover:text-[#C4CBD8] transition-all"
          >
            Ir al inicio
          </button>
        </div>
      </div>

      <style>{`
        @keyframes popIn {
          from { transform: scale(0.7); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        @keyframes draw {
          from { stroke-dashoffset: 20; }
          to   { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  )
}

function TimeoutScreen({ navigate }) {
  return (
    <div className="min-h-screen bg-[#0F1628] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-[430px] mx-auto w-full">

        {/* Ícono de pendiente */}
        <div className="relative mb-6">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center"
            style={{ background: 'radial-gradient(circle, #C4CBD825 0%, #C4CBD808 60%, transparent 75%)' }}
          >
            <div className="w-24 h-24 rounded-full bg-[#C4CBD81A] border-2 border-[#C4CBD833] flex items-center justify-center">
              <Clock size={40} className="text-[#C4CBD8]" />
            </div>
          </div>
        </div>

        {/* Mensaje */}
        <div className="text-center mb-8">
          <h1 className="text-[1.375rem] font-extrabold text-white mb-2">
            Tu pago está siendo procesado
          </h1>
          <p className="text-[0.875rem] text-[#8A96B8] leading-relaxed">
            Te notificaremos cuando esté confirmado
          </p>
        </div>

        {/* Aviso informativo */}
        <div className="w-full bg-[#1A2340] border border-[#263050] rounded-2xl px-5 py-4 mb-6">
          <p className="text-[0.8125rem] text-[#8A96B8] leading-relaxed">
            Las transferencias bancarias pueden demorar hasta <span className="text-[#C4CBD8] font-semibold">30 minutos</span> en
            confirmarse. Recibirás una notificación cuando el pago sea verificado.
          </p>
        </div>

        {/* Acciones */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-4 rounded-2xl bg-[#C4CBD8] text-[#0F1628] text-[0.9375rem] font-bold shadow-[0_4px_20px_rgba(196,203,216,0.3)] active:scale-[0.98] transition-all"
          >
            Ir al inicio
          </button>
          <button
            onClick={() => navigate('/transactions')}
            className="w-full py-3.5 rounded-2xl bg-transparent border border-[#263050] text-white text-[0.9375rem] font-semibold hover:border-[#C4CBD833] hover:text-[#C4CBD8] transition-all"
          >
            Ver mis transacciones
          </button>
        </div>
      </div>
    </div>
  )
}
