/**
 * KybTab.jsx — Tab "Business" embebido en ProfilePage
 *
 * Si kycStatus !== 'approved': muestra aviso de completar verificación personal.
 * Si kycStatus === 'approved': muestra estado KYB compacto con CTA.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2, CheckCircle2, Clock, AlertTriangle,
  XCircle, ShieldCheck, ChevronRight,
} from 'lucide-react'
import { getKybStatus } from '../../services/kybService'

// ── Constantes ─────────────────────────────────────────────────────────────

const WHATSAPP_SUPPORT = `https://wa.me/${import.meta.env.VITE_SUPPORT_WHATSAPP ?? ''}?text=${encodeURIComponent('Hola, necesito ayuda con mi solicitud Business en Alyto.')}`

// ── Estado: not_started ────────────────────────────────────────────────────

function NotStartedCard({ navigate }) {
  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'linear-gradient(135deg, #1D3461 0%, #0F1628 60%, #1A2030 100%)',
          border: '1px solid #C4CBD833',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#C4CBD81A] border border-[#C4CBD833] flex items-center justify-center">
            <Building2 size={20} className="text-[#C4CBD8]" />
          </div>
          <div>
            <h3 className="text-[0.9375rem] font-bold text-white">Cuenta Business</h3>
            <p className="text-[0.75rem] text-[#8A96B8]">Comisiones desde 0.5%</p>
          </div>
        </div>

        <ul className="space-y-2 mb-5">
          {[
            'Tickets hasta $50.000 USD por transacción',
            'Corredores globales: USD, EUR, CNY, BRL',
            'FX transparente · Soporte prioritario',
          ].map(b => (
            <li key={b} className="flex items-start gap-2 text-[0.8125rem] text-[#8A96B8]">
              <CheckCircle2 size={14} className="text-[#22C55E] mt-0.5 flex-shrink-0" />
              {b}
            </li>
          ))}
        </ul>

        <button
          onClick={() => navigate('/kyb')}
          className="w-full py-3 rounded-xl text-[0.875rem] font-bold text-[#0F1628] flex items-center justify-center gap-2"
          style={{ background: '#C4CBD8', boxShadow: '0 4px 20px rgba(196,203,216,0.3)' }}
        >
          Solicitar cuenta Business <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

// ── Estado: pending / under_review ─────────────────────────────────────────

function PendingCard({ kybData, navigate }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col items-center text-center"
      style={{ background: '#1A2340', border: '1px solid #263050' }}
    >
      <Clock size={28} className="text-[#C4CBD8] mb-3" />
      <p className="text-[0.9375rem] font-bold text-white mb-1">Solicitud en revisión</p>
      <p className="text-[0.8125rem] text-[#8A96B8] mb-4">
        Revisaremos tu documentación en 24–72 horas hábiles.
      </p>
      {kybData?.businessId && (
        <p className="text-[0.75rem] font-mono text-[#4E5A7A] mb-4 break-all">
          Ref: {kybData.businessId}
        </p>
      )}
      <button
        onClick={() => navigate('/kyb')}
        className="text-[0.8125rem] font-medium text-[#C4CBD8] flex items-center gap-1"
      >
        Ver detalle <ChevronRight size={13} />
      </button>
    </div>
  )
}

// ── Estado: more_info ──────────────────────────────────────────────────────

function MoreInfoCard({ navigate }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col items-center text-center"
      style={{ background: '#1A2340', border: '1px solid #F59E0B33' }}
    >
      <AlertTriangle size={28} className="text-[#F59E0B] mb-3" />
      <p className="text-[0.9375rem] font-bold text-white mb-1">Se requiere más información</p>
      <p className="text-[0.8125rem] text-[#8A96B8] mb-4">
        El revisor solicita documentos o información adicional.
      </p>
      <button
        onClick={() => navigate('/kyb')}
        className="w-full py-3 rounded-xl text-[0.875rem] font-bold text-[#0F1628]"
        style={{ background: '#C4CBD8', boxShadow: '0 4px 20px rgba(196,203,216,0.3)' }}
      >
        Subir documentos
      </button>
    </div>
  )
}

// ── Estado: approved ───────────────────────────────────────────────────────

function ApprovedCard({ kybData, navigate }) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: '#1A2340', border: '1px solid #22C55E33' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 size={20} className="text-[#22C55E]" />
        <p className="text-[0.9375rem] font-bold text-white">Cuenta Business activa</p>
      </div>
      <div className="space-y-2 mb-4">
        {[
          { label: 'Límite por transacción', value: `$${(kybData?.maxTransactionUsd ?? 50000).toLocaleString('en-US')} USD` },
          { label: 'Volumen mensual',        value: `$${(kybData?.maxMonthlyUsd ?? 80000).toLocaleString('en-US')} USD` },
        ].map(l => (
          <div
            key={l.label}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl"
            style={{ background: '#0F1628', border: '1px solid #263050' }}
          >
            <span className="text-[0.8125rem] text-[#8A96B8]">{l.label}</span>
            <span className="text-[0.8125rem] font-bold text-white">{l.value}</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => navigate('/send')}
        className="w-full py-3 rounded-xl text-[0.875rem] font-bold text-[#0F1628] flex items-center justify-center gap-2"
        style={{ background: '#C4CBD8', boxShadow: '0 4px 20px rgba(196,203,216,0.3)' }}
      >
        Empezar a operar →
      </button>
    </div>
  )
}

// ── Estado: rejected ───────────────────────────────────────────────────────

function RejectedCard({ kybData }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col items-center text-center"
      style={{ background: '#1A2340', border: '1px solid #EF444433' }}
    >
      <XCircle size={28} className="text-[#EF4444] mb-3" />
      <p className="text-[0.9375rem] font-bold text-white mb-1">Solicitud rechazada</p>
      {kybData?.kybRejectionReason && (
        <p className="text-[0.8125rem] text-[#8A96B8] mb-4 leading-relaxed">
          {kybData.kybRejectionReason}
        </p>
      )}
      <a
        href={WHATSAPP_SUPPORT}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-3 rounded-xl text-[0.875rem] font-bold text-[#0F1628] text-center block"
        style={{ background: '#C4CBD8', boxShadow: '0 4px 20px rgba(196,203,216,0.3)' }}
      >
        Contactar soporte
      </a>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function KybTab({ kycStatus }) {
  const navigate              = useNavigate()
  const [kybStatus, setKybStatus] = useState(null)
  const [kybData,   setKybData]   = useState(null)
  const [loading,   setLoading]   = useState(false)

  const kycApproved = kycStatus === 'approved'

  useEffect(() => {
    if (!kycApproved) return
    setLoading(true)
    getKybStatus()
      .then(data => {
        setKybStatus(data.kybStatus ?? 'not_started')
        setKybData(data)
      })
      .catch(() => setKybStatus('not_started'))
      .finally(() => setLoading(false))
  }, [kycApproved])

  // KYC no completado
  if (!kycApproved) {
    return (
      <div className="px-4 py-2">
        <div
          className="rounded-2xl p-5 flex flex-col items-center text-center"
          style={{ background: '#1A2340', border: '1px solid #263050' }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
            style={{ background: '#C4CBD81A', border: '1px solid #C4CBD833' }}
          >
            <ShieldCheck size={22} className="text-[#C4CBD8]" />
          </div>
          <p className="text-[0.9375rem] font-bold text-white mb-2">
            Verifica tu identidad primero
          </p>
          <p className="text-[0.8125rem] text-[#8A96B8] mb-5 leading-relaxed">
            Completa tu verificación personal (KYC) antes de solicitar una cuenta Business.
          </p>
          <button
            onClick={() => navigate('/kyc')}
            className="w-full py-3 rounded-xl text-[0.875rem] font-bold text-[#0F1628]"
            style={{ background: '#C4CBD8', boxShadow: '0 4px 20px rgba(196,203,216,0.3)' }}
          >
            Completar verificación →
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="px-4 py-2 animate-pulse">
        <div className="rounded-2xl bg-[#1A2340] h-48" />
      </div>
    )
  }

  const isPending = kybStatus === 'pending' || kybStatus === 'under_review'

  return (
    <div className="px-4 py-2">
      {kybStatus === 'not_started' && <NotStartedCard navigate={navigate} />}
      {isPending                   && <PendingCard   kybData={kybData} navigate={navigate} />}
      {kybStatus === 'more_info'   && <MoreInfoCard  navigate={navigate} />}
      {kybStatus === 'approved'    && <ApprovedCard  kybData={kybData} navigate={navigate} />}
      {kybStatus === 'rejected'    && <RejectedCard  kybData={kybData} />}
    </div>
  )
}
