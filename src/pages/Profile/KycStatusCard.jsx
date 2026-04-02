/**
 * KycStatusCard.jsx — Tarjeta de estado de verificación KYC.
 * Siempre visible en la parte superior de ProfilePage.
 */

import { useNavigate } from 'react-router-dom'
import { CheckCircle, Clock, AlertTriangle, XCircle, MessageCircle, ChevronRight } from 'lucide-react'

const SUPPORT_WHATSAPP = import.meta.env.VITE_SUPPORT_WHATSAPP ?? ''

function openWhatsApp() {
  const url = `https://wa.me/${SUPPORT_WHATSAPP.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, necesito ayuda con mi verificación de identidad en Alyto.')}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

export default function KycStatusCard({ kycStatus }) {
  const navigate = useNavigate()

  // ── approved ──────────────────────────────────────────────────────────────
  if (kycStatus === 'approved') {
    return (
      <div className="mx-4 mb-4 rounded-2xl border border-[#233E5833] bg-[#233E580D] px-4 py-3.5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#233E581A] flex items-center justify-center flex-shrink-0">
          <CheckCircle size={18} className="text-[#233E58]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[0.875rem] font-semibold text-[#233E58] leading-tight">
            Identidad verificada
          </p>
          <p className="text-[0.75rem] text-[#64748B] mt-0.5">
            Tu cuenta está habilitada para enviar dinero
          </p>
        </div>
      </div>
    )
  }

  // ── pending / under_review ─────────────────────────────────────────────────
  if (kycStatus === 'pending' || kycStatus === 'under_review') {
    return (
      <div className="mx-4 mb-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3.5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#E2E8F0] flex items-center justify-center flex-shrink-0">
          <Clock size={18} className="text-[#64748B]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[0.875rem] font-semibold text-[#0F172A] leading-tight">
            Verificación en proceso
          </p>
          <p className="text-[0.75rem] text-[#64748B] mt-0.5">
            Estamos revisando tu documentación
          </p>
        </div>
      </div>
    )
  }

  // ── rejected ───────────────────────────────────────────────────────────────
  if (kycStatus === 'rejected') {
    return (
      <div className="mx-4 mb-4 rounded-2xl border border-[#EF444433] bg-[#EF44441A] px-4 py-3.5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-[#EF44441A] flex items-center justify-center flex-shrink-0">
            <XCircle size={18} className="text-[#EF4444]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[0.875rem] font-semibold text-[#EF4444] leading-tight">
              Verificación rechazada
            </p>
            <p className="text-[0.75rem] text-[#64748B] mt-0.5">
              Contáctanos para más información
            </p>
          </div>
        </div>
        <button
          onClick={openWhatsApp}
          className="w-full flex items-center justify-center gap-2 bg-[#EF44441A] border border-[#EF444433] text-[#EF4444] rounded-xl py-2.5 text-[0.8125rem] font-semibold transition-all hover:bg-[#EF444433]"
        >
          <MessageCircle size={15} />
          Contactar soporte
        </button>
      </div>
    )
  }

  // ── not_started / null / undefined ─────────────────────────────────────────
  return (
    <div className="mx-4 mb-4 rounded-2xl border border-[#F97316]/30 bg-[#F97316]/10 px-4 py-3.5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-[#F97316]/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={18} className="text-[#F97316]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[0.875rem] font-semibold text-[#F97316] leading-tight">
            Verificación pendiente
          </p>
          <p className="text-[0.75rem] text-[#64748B] mt-0.5">
            Completa tu verificación para enviar dinero
          </p>
        </div>
      </div>
      <button
        onClick={() => navigate('/kyc')}
        className="w-full flex items-center justify-center gap-2 bg-[#F97316] text-white rounded-xl py-2.5 text-[0.8125rem] font-semibold transition-all hover:bg-[#EA6C00] shadow-[0_4px_16px_rgba(249,115,22,0.35)]"
      >
        Verificar ahora
        <ChevronRight size={15} />
      </button>
    </div>
  )
}
