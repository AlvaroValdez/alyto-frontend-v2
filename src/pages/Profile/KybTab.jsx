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
        <p className="text-[0.75rem] text-[#4A5568] leading-relaxed">
          Conforme a la <span className="text-[#0D1F3C]">RND 102400000021</span> (Bancarización, Bolivia),
          operamos hasta <span className="text-[#0D1F3C]">Bs 49.999 por transacción</span> y{' '}
          <span className="text-[#0D1F3C]">Bs 300.000 mensuales</span> mientras AV Finance SRL tramita
          su licencia ETF/PSAV ante ASFI. Los límites se actualizarán automáticamente al obtener
          la habilitación regulatoria.
        </p>
      </div>
    </div>
  )
}

// ── Constantes premium ─────────────────────────────────────────────────────

const GOLD        = '#E8B84B'
const GOLD_DIM    = 'rgba(232,184,75,0.14)'
const GOLD_BORDER = 'rgba(232,184,75,0.28)'
const GOLD_GLOW   = 'rgba(232,184,75,0.32)'

// ── Estado: not_started ────────────────────────────────────────────────────

function NotStartedCard({ navigate }) {
  const benefits = [
    'Spread desde 0.5% — vs 2% en cuenta personal',
    'Factura B2B formal en cada transferencia',
    'Atención Business prioritaria — tus transferencias se procesan primero',
    'Acceso a todos los corredores disponibles',
    'FX transparente — sin costos ocultos',
  ]

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #0D1F3C 0%, #162D4E 55%, #0A1525 100%)',
          border: `1px solid ${GOLD_BORDER}`,
          boxShadow: `0 8px 36px rgba(13,31,60,0.50), 0 0 0 1px ${GOLD_BORDER}`,
        }}
      >
        {/* Gold radial glow at top */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% -10%, rgba(232,184,75,0.14) 0%, transparent 55%)',
          }}
        />
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Decorative corner circle */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 140, height: 140,
            borderRadius: '50%',
            border: `1px solid ${GOLD_BORDER}`,
            top: -50, right: -50,
            opacity: 0.6,
          }}
        />

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: GOLD_DIM, border: `1px solid ${GOLD_BORDER}` }}
            >
              <Building2 size={20} style={{ color: GOLD }} />
            </div>
            <div>
              <h3
                className="text-[0.9375rem] font-bold tracking-tight"
                style={{ color: GOLD }}
              >
                Cuenta Business
              </h3>
              <p className="text-[0.75rem]" style={{ color: 'rgba(232,184,75,0.60)' }}>
                Spread desde 0.5% · Factura B2B · Atención prioritaria
              </p>
            </div>
          </div>

          <ul className="space-y-2.5 mb-5">
            {benefits.map(b => (
              <li key={b} className="flex items-start gap-2.5 text-[0.8125rem]" style={{ color: 'rgba(255,255,255,0.78)' }}>
                <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" style={{ color: GOLD }} />
                {b}
              </li>
            ))}
          </ul>

          <button
            onClick={() => navigate('/kyb')}
            className="w-full py-3 rounded-xl text-[0.875rem] font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-150"
            style={{
              background: `linear-gradient(135deg, ${GOLD} 0%, #D4A33A 100%)`,
              color: '#0D1F3C',
              boxShadow: `0 4px 20px ${GOLD_GLOW}`,
            }}
          >
            Solicitar cuenta Business <ChevronRight size={16} />
          </button>
        </div>
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
      style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
    >
      <Clock size={28} className="text-[#4A5568] mb-3" />
      <p className="text-[0.9375rem] font-bold text-[#0D1F3C] mb-1">Solicitud en revisión</p>
      <p className="text-[0.8125rem] text-[#4A5568] mb-4">
        Revisaremos tu documentación en 24–72 horas hábiles.
      </p>
      {kybData?.businessId && (
        <p className="text-[0.75rem] font-mono text-[#94A3B8] mb-4 break-all">
          Ref: {kybData.businessId}
        </p>
      )}
      <button
        onClick={() => navigate('/kyb')}
        className="text-[0.8125rem] font-medium text-[#1D3461] flex items-center gap-1"
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
      style={{ background: 'var(--color-bg-secondary)', border: '1px solid #F59E0B33' }}
    >
      <AlertTriangle size={28} className="text-[#F59E0B] mb-3" />
      <p className="text-[0.9375rem] font-bold text-[#0D1F3C] mb-1">Se requiere más información</p>
      <p className="text-[0.8125rem] text-[#4A5568] mb-4">
        El revisor solicita documentos o información adicional.
      </p>
      <button
        onClick={() => navigate('/kyb')}
        className="w-full py-3 rounded-xl text-[0.875rem] font-bold text-[#0D1F3C]"
        style={{ background: '#1D3461', boxShadow: '0 4px 20px rgba(35,62,88,0.3)' }}
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
        style={{ background: 'var(--color-bg-secondary)', border: '1px solid #233E5833' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 size={20} className="text-[#1D3461]" />
          <p className="text-[0.9375rem] font-bold text-[#0D1F3C]">Cuenta Business activa</p>
        </div>
        <div className="space-y-2 mb-4">
          {limits.map(l => (
            <div
              key={l.label}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}
            >
              <span className="text-[0.8125rem] text-[#4A5568]">{l.label}</span>
              <span className="text-[0.8125rem] font-bold text-[#0D1F3C]">{l.value}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => navigate('/send')}
          className="w-full py-3 rounded-xl text-[0.875rem] font-bold text-[#0D1F3C] flex items-center justify-center gap-2"
          style={{ background: '#1D3461', boxShadow: '0 4px 20px rgba(35,62,88,0.3)' }}
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
      style={{ background: 'var(--color-bg-secondary)', border: '1px solid #EF444433' }}
    >
      <XCircle size={28} className="text-[#EF4444] mb-3" />
      <p className="text-[0.9375rem] font-bold text-[#0D1F3C] mb-1">Solicitud rechazada</p>
      {kybData?.kybRejectionReason && (
        <p className="text-[0.8125rem] text-[#4A5568] mb-4 leading-relaxed">
          {kybData.kybRejectionReason}
        </p>
      )}
      <a
        href={WHATSAPP_SUPPORT}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-3 rounded-xl text-[0.875rem] font-bold text-[#0D1F3C] text-center block"
        style={{ background: '#1D3461', boxShadow: '0 4px 20px rgba(35,62,88,0.3)' }}
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
          style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
            style={{ background: '#233E581A', border: '1px solid #233E5833' }}
          >
            <ShieldCheck size={22} className="text-[#1D3461]" />
          </div>
          <p className="text-[0.9375rem] font-bold text-[#0D1F3C] mb-2">
            Verifica tu identidad primero
          </p>
          <p className="text-[0.8125rem] text-[#4A5568] mb-5 leading-relaxed">
            Completa tu verificación personal (KYC) antes de solicitar una cuenta Business.
          </p>
          <button
            onClick={() => navigate('/kyc')}
            className="w-full py-3 rounded-xl text-[0.875rem] font-bold text-[#0D1F3C]"
            style={{ background: '#1D3461', boxShadow: '0 4px 20px rgba(35,62,88,0.3)' }}
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
        <div className="rounded-2xl bg-[#F0F2F7] h-48" />
      </div>
    )
  }

  const isPending = kybStatus === 'pending' || kybStatus === 'under_review'

  return (
    <div className="px-4 py-2">
      {kybStatus === 'not_started' && <NotStartedCard navigate={navigate} />}
      {isPending                   && <PendingCard   kybData={kybData} navigate={navigate} />}
      {kybStatus === 'more_info'   && <MoreInfoCard  navigate={navigate} />}
      {kybStatus === 'approved'    && <ApprovedCard  kybData={kybData} navigate={navigate} isSRL={isSRL} />}
      {kybStatus === 'rejected'    && <RejectedCard  kybData={kybData} />}
    </div>
  )
}
