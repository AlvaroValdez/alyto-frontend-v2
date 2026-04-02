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
  XCircle, ShieldCheck, ChevronRight, Info,
} from 'lucide-react'
import { getKybStatus } from '../../services/kybService'

// ── Constantes ─────────────────────────────────────────────────────────────

const WHATSAPP_SUPPORT = `https://wa.me/${import.meta.env.VITE_SUPPORT_WHATSAPP ?? ''}?text=${encodeURIComponent('Hola, necesito ayuda con mi solicitud Business en Alyto.')}`

// ── Aviso regulatorio BOB ──────────────────────────────────────────────────

function BobRegulatoryNotice() {
  return (
    <div
      className="flex items-start gap-3 rounded-2xl px-4 py-3.5 mt-3"
      style={{ background: '#FFFBEB', border: '1px solid #F59E0B33' }}
    >
      <Info size={15} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-[0.8125rem] font-semibold text-[#F59E0B] mb-1">
          Límites regulatorios vigentes — Bolivia
        </p>
        <p className="text-[0.75rem] text-[#64748B] leading-relaxed">
          Conforme a la <span className="text-[#0F172A]">RND 102400000021</span> (Bancarización, Bolivia),
          operamos hasta <span className="text-[#0F172A]">Bs 49.999 por transacción</span> y{' '}
          <span className="text-[#0F172A]">Bs 300.000 mensuales</span> mientras AV Finance SRL tramita
          su licencia ETF/PSAV ante ASFI. Los límites se actualizarán automáticamente al obtener
          la habilitación regulatoria.
        </p>
      </div>
    </div>
  )
}

// ── Estado: not_started ────────────────────────────────────────────────────

function NotStartedCard({ navigate, isSRL }) {
  const benefits = isSRL
    ? [
        'Hasta Bs 49.999 por transacción (límite regulatorio BOB)',
        'Corredores: CO, PE, AR, CL, MX, BR',
        'FX transparente · Soporte prioritario',
      ]
    : [
        'Tickets hasta $50.000 USD por transacción',
        'Corredores globales: USD, EUR, CNY, BRL',
        'FX transparente · Soporte prioritario',
      ]

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'linear-gradient(135deg, #F0FDF9 0%, #FFFFFF 60%, #F8FAFC 100%)',
          border: '1px solid #E2E8F0',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#233E581A] border border-[#233E5833] flex items-center justify-center">
            <Building2 size={20} className="text-[#233E58]" />
          </div>
          <div>
            <h3 className="text-[0.9375rem] font-bold text-[#0F172A]">Cuenta Business</h3>
            <p className="text-[0.75rem] text-[#64748B]">Comisiones desde 0.5%</p>
          </div>
        </div>

        <ul className="space-y-2 mb-5">
          {benefits.map(b => (
            <li key={b} className="flex items-start gap-2 text-[0.8125rem] text-[#64748B]">
              <CheckCircle2 size={14} className="text-[#233E58] mt-0.5 flex-shrink-0" />
              {b}
            </li>
          ))}
        </ul>

        <button
          onClick={() => navigate('/kyb')}
          className="w-full py-3 rounded-xl text-[0.875rem] font-bold text-white flex items-center justify-center gap-2"
          style={{ background: '#233E58', boxShadow: '0 4px 20px rgba(35,62,88,0.3)' }}
        >
          Solicitar cuenta Business <ChevronRight size={16} />
        </button>
      </div>

      {isSRL && <BobRegulatoryNotice />}
    </div>
  )
}

// ── Estado: pending / under_review ─────────────────────────────────────────

function PendingCard({ kybData, navigate }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col items-center text-center"
      style={{ background: 'white', border: '1px solid #E2E8F0' }}
    >
      <Clock size={28} className="text-[#64748B] mb-3" />
      <p className="text-[0.9375rem] font-bold text-[#0F172A] mb-1">Solicitud en revisión</p>
      <p className="text-[0.8125rem] text-[#64748B] mb-4">
        Revisaremos tu documentación en 24–72 horas hábiles.
      </p>
      {kybData?.businessId && (
        <p className="text-[0.75rem] font-mono text-[#94A3B8] mb-4 break-all">
          Ref: {kybData.businessId}
        </p>
      )}
      <button
        onClick={() => navigate('/kyb')}
        className="text-[0.8125rem] font-medium text-[#233E58] flex items-center gap-1"
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
      style={{ background: 'white', border: '1px solid #F59E0B33' }}
    >
      <AlertTriangle size={28} className="text-[#F59E0B] mb-3" />
      <p className="text-[0.9375rem] font-bold text-[#0F172A] mb-1">Se requiere más información</p>
      <p className="text-[0.8125rem] text-[#64748B] mb-4">
        El revisor solicita documentos o información adicional.
      </p>
      <button
        onClick={() => navigate('/kyb')}
        className="w-full py-3 rounded-xl text-[0.875rem] font-bold text-white"
        style={{ background: '#233E58', boxShadow: '0 4px 20px rgba(35,62,88,0.3)' }}
      >
        Subir documentos
      </button>
    </div>
  )
}

// ── Estado: approved ───────────────────────────────────────────────────────

function ApprovedCard({ kybData, navigate, isSRL }) {
  const currency = kybData?.limitsCurrency ?? (isSRL ? 'BOB' : 'USD')
  const symbol   = currency === 'BOB' ? 'Bs' : '$'
  const locale   = currency === 'BOB' ? 'es-BO' : 'en-US'

  const singleDefault = isSRL ? 49_999 : 50_000
  const monthlyDefault = isSRL ? 300_000 : 80_000

  const limits = [
    {
      label: 'Límite por transacción',
      value: `${symbol} ${(kybData?.maxTransactionUsd ?? singleDefault).toLocaleString(locale)} ${currency}`,
    },
    {
      label: 'Volumen mensual',
      value: `${symbol} ${(kybData?.maxMonthlyUsd ?? monthlyDefault).toLocaleString(locale)} ${currency}`,
    },
  ]

  return (
    <div className="space-y-3">
      <div
        className="rounded-2xl p-5"
        style={{ background: 'white', border: '1px solid #233E5833' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 size={20} className="text-[#233E58]" />
          <p className="text-[0.9375rem] font-bold text-[#0F172A]">Cuenta Business activa</p>
        </div>
        <div className="space-y-2 mb-4">
          {limits.map(l => (
            <div
              key={l.label}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
            >
              <span className="text-[0.8125rem] text-[#64748B]">{l.label}</span>
              <span className="text-[0.8125rem] font-bold text-[#0F172A]">{l.value}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => navigate('/send')}
          className="w-full py-3 rounded-xl text-[0.875rem] font-bold text-white flex items-center justify-center gap-2"
          style={{ background: '#233E58', boxShadow: '0 4px 20px rgba(35,62,88,0.3)' }}
        >
          Empezar a operar →
        </button>
      </div>

      {isSRL && <BobRegulatoryNotice />}
    </div>
  )
}

// ── Estado: rejected ───────────────────────────────────────────────────────

function RejectedCard({ kybData }) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col items-center text-center"
      style={{ background: 'white', border: '1px solid #EF444433' }}
    >
      <XCircle size={28} className="text-[#EF4444] mb-3" />
      <p className="text-[0.9375rem] font-bold text-[#0F172A] mb-1">Solicitud rechazada</p>
      {kybData?.kybRejectionReason && (
        <p className="text-[0.8125rem] text-[#64748B] mb-4 leading-relaxed">
          {kybData.kybRejectionReason}
        </p>
      )}
      <a
        href={WHATSAPP_SUPPORT}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-3 rounded-xl text-[0.875rem] font-bold text-white text-center block"
        style={{ background: '#233E58', boxShadow: '0 4px 20px rgba(35,62,88,0.3)' }}
      >
        Contactar soporte
      </a>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function KybTab({ kycStatus, legalEntity }) {
  const navigate              = useNavigate()
  const [kybStatus, setKybStatus] = useState(null)
  const [kybData,   setKybData]   = useState(null)
  const [loading,   setLoading]   = useState(false)

  const kycApproved = kycStatus === 'approved'
  const isSRL       = legalEntity === 'SRL'

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
          style={{ background: 'white', border: '1px solid #E2E8F0' }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
            style={{ background: '#233E581A', border: '1px solid #233E5833' }}
          >
            <ShieldCheck size={22} className="text-[#233E58]" />
          </div>
          <p className="text-[0.9375rem] font-bold text-[#0F172A] mb-2">
            Verifica tu identidad primero
          </p>
          <p className="text-[0.8125rem] text-[#64748B] mb-5 leading-relaxed">
            Completa tu verificación personal (KYC) antes de solicitar una cuenta Business.
          </p>
          <button
            onClick={() => navigate('/kyc')}
            className="w-full py-3 rounded-xl text-[0.875rem] font-bold text-white"
            style={{ background: '#233E58', boxShadow: '0 4px 20px rgba(35,62,88,0.3)' }}
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
        <div className="rounded-2xl bg-[#F8FAFC] h-48" />
      </div>
    )
  }

  const isPending = kybStatus === 'pending' || kybStatus === 'under_review'

  return (
    <div className="px-4 py-2">
      {kybStatus === 'not_started' && <NotStartedCard navigate={navigate} isSRL={isSRL} />}
      {isPending                   && <PendingCard   kybData={kybData} navigate={navigate} />}
      {kybStatus === 'more_info'   && <MoreInfoCard  navigate={navigate} />}
      {kybStatus === 'approved'    && <ApprovedCard  kybData={kybData} navigate={navigate} isSRL={isSRL} />}
      {kybStatus === 'rejected'    && <RejectedCard  kybData={kybData} />}
    </div>
  )
}
