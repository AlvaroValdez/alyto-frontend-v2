/**
 * Step6Success.jsx — "¡Tu dinero está en camino!" ✅
 *
 * Pantalla de confirmación con ícono animado, resumen y acciones.
 */

import { useNavigate } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

const COUNTRY_NAMES = { CO: 'Colombia', PE: 'Perú', BO: 'Bolivia' }

function formatTransactionId(id) {
  if (!id) return '—'
  return `${id.slice(0, 8)}...${id.slice(-6)}`
}

export default function Step6Success({ stepData, onReset }) {
  const navigate = useNavigate()
  const { transactionId, originAmount, destinationCountry, beneficiary, quote } = stepData

  return (
    <div className="flex flex-col items-center gap-6 px-4 pb-6 pt-4">

      {/* ── Ícono de éxito animado ── */}
      <div className="relative">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: 'radial-gradient(circle, #22C55E25 0%, #22C55E08 60%, transparent 75%)' }}
        >
          <div className="w-20 h-20 rounded-full bg-[#22C55E1A] border-2 border-[#22C55E33] flex items-center justify-center animate-[bounce_0.5s_ease-out]">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
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
                  animation: 'draw 0.4s ease-out 0.2s forwards',
                }}
              />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Mensaje principal ── */}
      <div className="text-center">
        <h2 className="text-[1.375rem] font-extrabold text-white mb-1">
          ¡Tu dinero está en camino!
        </h2>
        <p className="text-[0.875rem] text-[#8A96B8]">
          El pago fue iniciado exitosamente
        </p>
      </div>

      {/* ── Resumen de la operación ── */}
      <div className="w-full bg-[#1A2340] border border-[#263050] rounded-2xl overflow-hidden">

        {/* Monto destacado */}
        <div
          className="px-5 py-4 text-center"
          style={{ background: 'linear-gradient(135deg, #1D346120 0%, #22C55E10 100%)' }}
        >
          <p className="text-[0.6875rem] font-semibold text-[#8A96B8] uppercase tracking-wide mb-1">
            Monto enviado
          </p>
          <p className="text-[1.75rem] font-extrabold text-white">
            ${Number(originAmount || 0).toLocaleString('es-CL')} CLP
          </p>
          {quote?.destinationAmount && (
            <p className="text-[0.875rem] font-semibold text-[#22C55E] mt-0.5">
              ≈ {Number(quote.destinationAmount).toLocaleString('es-CL')} {quote.destinationCurrency}
            </p>
          )}
        </div>

        {/* Detalles */}
        <div className="px-5 py-3 divide-y divide-[#263050]">
          {[
            { label: 'Beneficiario',  value: beneficiary?.fullName },
            { label: 'Banco',         value: beneficiary?.bankName },
            { label: 'País destino',  value: COUNTRY_NAMES[destinationCountry] || destinationCountry },
            { label: 'Tiempo est.',   value: quote?.estimatedDelivery || '1 día hábil' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-2.5">
              <span className="text-[0.8125rem] text-[#8A96B8]">{label}</span>
              <span className="text-[0.8125rem] font-semibold text-white">{value || '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── ID de comprobante ── */}
      <div className="w-full bg-[#1A2340] rounded-xl px-4 py-3">
        <p className="text-[0.6875rem] text-[#4E5A7A] mb-1">
          Número de comprobante
        </p>
        <p className="text-[0.8125rem] font-mono font-semibold text-[#C4CBD8]">
          {formatTransactionId(transactionId)}
        </p>
      </div>

      {/* ── Acciones ── */}
      <div className="w-full flex flex-col gap-3">
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#C4CBD8] text-[#0F1628] text-[0.9375rem] font-bold shadow-[0_4px_20px_rgba(196,203,216,0.3)] active:scale-[0.98] transition-all"
        >
          <ArrowUpRight size={18} />
          Ver mis transacciones
        </button>

        <button
          onClick={onReset}
          className="w-full py-3.5 rounded-2xl bg-transparent border border-[#263050] text-white text-[0.9375rem] font-semibold hover:border-[#C4CBD833] hover:text-[#C4CBD8] transition-all"
        >
          Enviar otro pago
        </button>
      </div>

      <style>{`
        @keyframes draw {
          from { stroke-dashoffset: 20; }
          to   { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  )
}
