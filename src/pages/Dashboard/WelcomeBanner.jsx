/**
 * WelcomeBanner.jsx — Saludo personalizado + alertas contextuales
 *
 * Muestra:
 *  1. Saludo según hora del día ("Buenos días / tardes / noches, {firstName}")
 *  2. Banner amarillo-plata si kycStatus !== 'approved' → botón "Verificar ahora"
 *  3. Banner azul si hay activeTransactions > 0 → botón "Ver estado"
 */

import { Link } from 'react-router-dom'
import { ShieldAlert, Clock } from 'lucide-react'

export default function WelcomeBanner({ firstName, kycStatus, activeTransactions }) {
  const kycApproved = kycStatus === 'approved'

  return (
    <div className="px-4 mb-1">

      {/* ── Saludo ──────────────────────────────────────────────────── */}
      <p className="text-[1.125rem] font-bold text-white mb-4">
        Hola de nuevo, {firstName} 👋
      </p>

      {/* ── Banner KYC pendiente ─────────────────────────────────────── */}
      {!kycApproved && (
        <Link
          to="/kyc"
          className="flex items-start gap-3 rounded-2xl px-4 py-3.5 mb-3 no-underline transition-all hover:border-[#C4CBD866]"
          style={{
            background: '#C4CBD80D',
            border:     '1px solid #C4CBD833',
          }}
        >
          <div className="w-8 h-8 rounded-xl bg-[#C4CBD81A] flex items-center justify-center flex-shrink-0 mt-0.5">
            <ShieldAlert size={15} className="text-[#C4CBD8]" />
          </div>
          <div className="flex-1">
            <p className="text-[0.875rem] font-semibold text-[#C4CBD8] mb-0.5">
              Completa tu verificación de identidad
            </p>
            <p className="text-[0.75rem] text-[#8A96B8] leading-relaxed">
              Para comenzar a enviar dinero necesitas verificar tu identidad.
            </p>
          </div>
          <div className="flex-shrink-0 mt-1">
            <span className="text-[0.6875rem] font-semibold text-[#C4CBD8] border border-[#C4CBD833] bg-[#C4CBD81A] px-2 py-0.5 rounded-full whitespace-nowrap">
              Verificar ahora
            </span>
          </div>
        </Link>
      )}

      {/* ── Banner transferencias activas ─────────────────────────────── */}
      {activeTransactions > 0 && (
        <Link
          to="/transactions"
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5 mb-3 no-underline transition-all hover:border-[#1D346166]"
          style={{
            background: '#1D34611A',
            border:     '1px solid #1D346133',
          }}
        >
          <div className="w-8 h-8 rounded-xl bg-[#1D34611A] flex items-center justify-center flex-shrink-0">
            <Clock size={15} className="text-[#8A96B8]" />
          </div>
          <div className="flex-1">
            <p className="text-[0.875rem] font-semibold text-white">
              {activeTransactions === 1
                ? 'Tienes 1 transferencia en proceso'
                : `Tienes ${activeTransactions} transferencias en proceso`}
            </p>
          </div>
          <span className="text-[0.6875rem] font-semibold text-[#8A96B8] border border-[#263050] px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
            Ver estado
          </span>
        </Link>
      )}

    </div>
  )
}
