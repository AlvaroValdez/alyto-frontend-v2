/**
 * KybPage.jsx — Página principal de Cuenta Business (KYB) de Alyto V2.0
 *
 * Muestra contenido diferente según el estado KYB del usuario:
 *   not_started   → Card informativa + botón para solicitar
 *   pending / under_review → Estado en revisión
 *   more_info     → Solicitud de información adicional + modal de subida
 *   approved      → Cuenta activa con límites operativos
 *   rejected      → Rechazo con motivo + contacto soporte
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, FileText,
  Building2, CheckCircle2, Clock, AlertTriangle,
  XCircle, Upload, X, Loader2,
} from 'lucide-react'
import { getKybStatus, uploadMoreInfo } from '../../services/kybService'

// ── Constantes ─────────────────────────────────────────────────────────────

const WHATSAPP_SUPPORT = `https://wa.me/${import.meta.env.VITE_SUPPORT_WHATSAPP ?? ''}?text=${encodeURIComponent('Hola, necesito ayuda con mi solicitud Business en Alyto.')}`

// ── Skeleton ───────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="px-4 animate-pulse">
      <div className="rounded-2xl bg-white p-5">
        <div className="h-5 w-32 bg-[#E2E8F0] rounded-full mb-4" />
        <div className="h-3.5 w-full bg-[#E2E8F0] rounded-full mb-2" />
        <div className="h-3.5 w-3/4 bg-[#E2E8F0] rounded-full mb-6" />
        <div className="h-10 w-full bg-[#E2E8F0] rounded-xl" />
      </div>
    </div>
  )
}

// ── Estado: not_started ────────────────────────────────────────────────────

function NotStartedState({ navigate }) {
  const benefits = [
    'Spread preferencial business: 4% vs 6.5% de cuenta personal (corredores estándar)',
    'Corredores globales: USD, EUR, CNY, BRL, MXN, AED',
    'Factura B2B formal en cada transferencia — sin cargos ocultos',
    'Límites empresariales conforme a normativa ASFI (Bolivia)',
    'Atención Business prioritaria',
  ]
  const requirements = [
    'NIT de la empresa',
    'Escritura de constitución',
    'CI del representante legal',
  ]

  return (
    <div className="px-4 space-y-4">
      {/* Hero card */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 24px rgba(15,23,42,0.08)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#1D34610D] border border-[#E2E8F0] flex items-center justify-center">
            <Building2 size={20} className="text-[#1D3461]" />
          </div>
          <div>
            <h2 className="text-[1rem] font-bold text-[#0F172A]">Cuenta Business</h2>
            <p className="text-[0.75rem] text-[#64748B]">Pagos institucionales globales</p>
          </div>
        </div>

        <p className="text-[0.875rem] text-[#64748B] mb-5 leading-relaxed">
          Pagos internacionales con{' '}
          <span className="text-[#1D3461] font-semibold">spread preferencial</span> y límites
          empresariales conforme a la normativa vigente. El detalle exacto de comisiones se
          muestra en cada cotización.
        </p>

        <button
          onClick={() => navigate('/kyb/apply')}
          className="w-full py-3.5 rounded-xl text-[0.9375rem] font-bold text-white transition-colors"
          style={{
            background: '#1D3461',
            boxShadow: '0 4px 16px rgba(29,52,97,0.25)',
          }}
        >
          Solicitar cuenta Business →
        </button>
      </div>

      {/* Beneficios */}
      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5">
        <h3 className="text-[0.75rem] font-bold text-[#94A3B8] uppercase tracking-wider mb-3">
          Beneficios
        </h3>
        <ul className="space-y-2.5">
          {benefits.map(b => (
            <li key={b} className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-[#22C55E] mt-0.5 flex-shrink-0" />
              <span className="text-[0.875rem] text-[#64748B] leading-snug">{b}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Requisitos */}
      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5">
        <h3 className="text-[0.75rem] font-bold text-[#94A3B8] uppercase tracking-wider mb-3">
          Documentos requeridos
        </h3>
        <ul className="space-y-2.5">
          {requirements.map(r => (
            <li key={r} className="flex items-center gap-2.5">
              <FileText size={15} className="text-[#1D3461] flex-shrink-0" />
              <span className="text-[0.875rem] text-[#64748B]">{r}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── Helpers de presentación ─────────────────────────────────────────────────

function SummaryRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[0.75rem] text-[#64748B]">{label}</span>
      <span className="text-[0.8125rem] text-[#0F172A] font-medium text-right break-all ml-3">{value}</span>
    </div>
  )
}

function fmtFecha(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return null }
}

function BusinessSummary({ kybData }) {
  const b = kybData?.business
  if (!b?.legalName && !kybData?.businessId) return null
  return (
    <div
      className="w-full mt-3 rounded-xl px-4 py-3 text-left"
      style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
    >
      <p className="text-[0.625rem] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
        Resumen de tu postulación
      </p>
      <SummaryRow label="Razón social" value={b?.legalName} />
      <SummaryRow label="Nombre comercial" value={b?.tradeName} />
      <SummaryRow label="NIT / Tax ID" value={b?.taxId} />
      <SummaryRow label="Documentos" value={kybData?.documents?.length ? `${kybData.documents.length} subido(s)` : null} />
      <SummaryRow label="Enviada" value={fmtFecha(kybData?.submittedAt)} />
    </div>
  )
}

// ── Estado: pending / under_review ─────────────────────────────────────────

function PendingState({ kybData }) {
  return (
    <div className="px-4">
      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6 flex flex-col items-center text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ background: '#1D34610D', border: '1px solid #E2E8F0' }}
        >
          <Clock size={26} className="text-[#1D3461]" />
        </div>
        <h2 className="text-[1.0625rem] font-bold text-[#0F172A] mb-2">
          Tu solicitud está en revisión
        </h2>
        <p className="text-[0.875rem] text-[#64748B] leading-relaxed mb-4">
          Revisaremos tu documentación en{' '}
          <span className="text-[#0F172A] font-semibold">24–72 horas hábiles</span>.
          Te notificaremos por email cuando esté lista.
        </p>
        {kybData?.businessId && (
          <div
            className="w-full rounded-xl px-4 py-3 text-left"
            style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1' }}
          >
            <p className="text-[0.625rem] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
              ID de solicitud
            </p>
            <p className="text-[0.8125rem] font-mono text-[#1D3461] break-all">
              {kybData.businessId}
            </p>
          </div>
        )}
        <BusinessSummary kybData={kybData} />
      </div>
    </div>
  )
}

// ── Estado: more_info ──────────────────────────────────────────────────────

function MoreInfoState({ kybData, onOpenModal }) {
  return (
    <div className="px-4">
      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6 flex flex-col items-center text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ background: '#F59E0B1A', border: '1px solid #F59E0B33' }}
        >
          <AlertTriangle size={26} className="text-[#F59E0B]" />
        </div>
        <h2 className="text-[1.0625rem] font-bold text-[#0F172A] mb-2">
          Necesitamos más información
        </h2>
        {kybData?.kybNote && (
          <div
            className="w-full rounded-xl px-4 py-3 mb-5 text-left"
            style={{ background: '#F59E0B0D', border: '1px solid #F59E0B33' }}
          >
            <p className="text-[0.625rem] font-bold text-[#F59E0B] uppercase tracking-wider mb-1.5">
              Mensaje del revisor
            </p>
            <p className="text-[0.875rem] text-[#64748B] leading-relaxed">{kybData.kybNote}</p>
          </div>
        )}
        <button
          onClick={onOpenModal}
          className="w-full py-3.5 rounded-xl text-[0.9375rem] font-bold text-white"
          style={{ background: '#1D3461', boxShadow: '0 4px 16px rgba(29,52,97,0.25)' }}
        >
          Subir documentos adicionales
        </button>
      </div>
    </div>
  )
}

// ── Estado: approved ───────────────────────────────────────────────────────

function ApprovedState({ kybData, navigate }) {
  // Límites REALES desde transactionLimits del backend (moneda incluida).
  // SRL: Bs (BOB); LLC/SpA: USD. Nunca inventar defaults.
  const tl  = kybData?.transactionLimits ?? {}
  const cur = tl.currency ?? 'USD'
  const fmtMoney = (n) =>
    n == null ? '—' : `${cur === 'USD' ? '$' : ''}${Number(n).toLocaleString('es-BO')} ${cur}`
  const limits = [
    { label: 'Máximo por transacción', value: fmtMoney(tl.maxSingleTransaction) },
    { label: 'Volumen mensual',         value: fmtMoney(tl.maxMonthlyVolume) },
  ]
  return (
    <div className="px-4">
      <div className="rounded-2xl bg-white border border-[#22C55E33] p-6 flex flex-col items-center text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ background: '#22C55E1A', border: '1px solid #22C55E33' }}
        >
          <CheckCircle2 size={26} className="text-[#22C55E]" />
        </div>
        <h2 className="text-[1.0625rem] font-bold text-[#0F172A] mb-1">
          ¡Cuenta Business activa!
        </h2>
        <p className="text-[0.875rem] text-[#64748B] mb-5">
          Tu empresa está verificada y lista para operar.
        </p>

        <div className="w-full space-y-2 mb-5">
          {limits.map(l => (
            <div
              key={l.label}
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
            >
              <span className="text-[0.8125rem] text-[#64748B]">{l.label}</span>
              <span className="text-[0.8125rem] font-bold text-[#0F172A]">{l.value}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/send')}
          className="w-full py-3.5 rounded-xl text-[0.9375rem] font-bold text-white"
          style={{ background: '#1D3461', boxShadow: '0 4px 16px rgba(29,52,97,0.25)' }}
        >
          Empezar a operar →
        </button>
      </div>
    </div>
  )
}

// ── Estado: rejected ───────────────────────────────────────────────────────

function RejectedState({ kybData }) {
  return (
    <div className="px-4">
      <div className="rounded-2xl bg-white border border-[#EF444433] p-6 flex flex-col items-center text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ background: '#EF44441A', border: '1px solid #EF444433' }}
        >
          <XCircle size={26} className="text-[#EF4444]" />
        </div>
        <h2 className="text-[1.0625rem] font-bold text-[#0F172A] mb-2">
          Solicitud rechazada
        </h2>
        {kybData?.kybRejectionReason && (
          <div
            className="w-full rounded-xl px-4 py-3 mb-5 text-left"
            style={{ background: '#EF44440D', border: '1px solid #EF444433' }}
          >
            <p className="text-[0.625rem] font-bold text-[#EF4444] uppercase tracking-wider mb-1.5">
              Motivo
            </p>
            <p className="text-[0.875rem] text-[#64748B] leading-relaxed">
              {kybData.kybRejectionReason}
            </p>
          </div>
        )}
        <a
          href={WHATSAPP_SUPPORT}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3.5 rounded-xl text-[0.9375rem] font-bold text-white text-center block"
          style={{ background: '#1D3461', boxShadow: '0 4px 16px rgba(29,52,97,0.25)' }}
        >
          Contactar soporte
        </a>
      </div>
    </div>
  )
}

// ── Modal: subir docs adicionales ──────────────────────────────────────────

function MoreInfoModal({ onClose }) {
  const [files, setFiles]     = useState([])
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)
  const [done, setDone]       = useState(false)
  const inputRef              = useRef()

  async function handleSubmit() {
    if (!files.length) return
    setSaving(true)
    setError(null)
    try {
      const fd = new FormData()
      // El backend espera el campo 'documentos' (upload.array('documentos', 10)).
      files.forEach(f => fd.append('documentos', f))
      // Tipos de documento por archivo (backend los mapea por índice).
      fd.append('documentTypes', JSON.stringify(files.map(() => 'other')))
      await uploadMoreInfo(fd)
      setDone(true)
    } catch (err) {
      setError(err.message || 'Error al subir documentos')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: '#0F162899' }}>
      <div
        className="w-full max-w-[430px] rounded-t-3xl p-6"
        style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[1rem] font-bold text-[#0F172A]">Documentos adicionales</h3>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172A] transition-colors">
            <X size={20} />
          </button>
        </div>

        {done ? (
          <div className="text-center py-4">
            <CheckCircle2 size={40} className="text-[#22C55E] mx-auto mb-3" />
            <p className="text-[#0F172A] font-semibold mb-1">Documentos enviados</p>
            <p className="text-[#64748B] text-[0.875rem] mb-5">
              Revisaremos tus documentos en las próximas horas.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl text-[0.875rem] font-bold text-white"
              style={{ background: '#1D3461' }}
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div
              className="border-2 border-dashed border-[#E2E8F0] rounded-xl p-6 flex flex-col items-center gap-3 mb-4 cursor-pointer hover:border-[#1D3461] transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={24} className="text-[#64748B]" />
              <p className="text-[0.875rem] text-[#64748B] text-center">
                Toca para seleccionar archivos
              </p>
              <p className="text-[0.75rem] text-[#94A3B8]">PDF, JPG, PNG — máx. 10 MB c/u</p>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={e => setFiles(Array.from(e.target.files))}
              />
            </div>

            {files.length > 0 && (
              <ul className="space-y-2 mb-4">
                {files.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
                  >
                    <FileText size={14} className="text-[#1D3461] flex-shrink-0" />
                    <span className="text-[0.8125rem] text-[#64748B] truncate flex-1">{f.name}</span>
                    <button
                      onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                      className="text-[#94A3B8] hover:text-[#EF4444] transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {error && (
              <p className="text-[0.8125rem] text-[#EF4444] mb-3">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={saving || !files.length}
              className="w-full py-3.5 rounded-xl text-[0.9375rem] font-bold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
              style={{ background: '#1D3461', boxShadow: '0 4px 16px rgba(29,52,97,0.25)' }}
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? 'Enviando…' : 'Enviar documentos'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Estado: error de carga ─────────────────────────────────────────────────

function ErrorState({ onRetry, message }) {
  return (
    <div className="px-4">
      <div className="rounded-2xl bg-white border border-[#EF444433] p-6 flex flex-col items-center text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ background: '#EF44441A', border: '1px solid #EF444433' }}
        >
          <AlertTriangle size={26} className="text-[#EF4444]" />
        </div>
        <h2 className="text-[1.0625rem] font-bold text-[#0F172A] mb-1">
          No pudimos cargar el estado
        </h2>
        <p className="text-[0.875rem] text-[#64748B] mb-5">
          {message ?? 'Hubo un problema al consultar tu postulación. Reintenta en unos segundos.'}
        </p>
        <button
          onClick={onRetry}
          className="w-full py-3.5 rounded-xl text-[0.9375rem] font-bold text-white"
          style={{ background: '#1D3461', boxShadow: '0 4px 16px rgba(29,52,97,0.25)' }}
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function KybPage() {
  const navigate              = useNavigate()
  const [status, setStatus]   = useState(null)
  const [kybData, setKybData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [showModal, setShowModal] = useState(false)

  function loadStatus() {
    setLoading(true)
    setError(false)
    getKybStatus()
      .then(data => {
        setStatus(data.kybStatus ?? 'not_started')
        setKybData(data)
      })
      // Distinguir error de red/servidor de "not_started" — antes un 500 hacía
      // que un postulante existente viera la pantalla de "solicitar cuenta".
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadStatus() }, [])

  const isPending = status === 'pending' || status === 'under_review'

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans flex flex-col max-w-[430px] mx-auto relative">

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-8">

        {/* ── Header ── */}
        <div className="px-5 pt-8 pb-4">
          <button
            onClick={() => navigate(-1)}
            className="mb-5 flex items-center gap-2 text-[#64748B] text-[0.875rem] hover:text-[#0F172A] transition-colors"
          >
            <ArrowLeft size={16} />
            Volver
          </button>
          <p className="text-[0.75rem] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Cuenta Business
          </p>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <SkeletonCard />
        ) : error ? (
          <ErrorState onRetry={loadStatus} />
        ) : status === 'not_started' ? (
          <NotStartedState navigate={navigate} />
        ) : isPending ? (
          <PendingState kybData={kybData} />
        ) : status === 'more_info' ? (
          <MoreInfoState kybData={kybData} onOpenModal={() => setShowModal(true)} />
        ) : status === 'approved' ? (
          <ApprovedState kybData={kybData} navigate={navigate} />
        ) : status === 'rejected' ? (
          <RejectedState kybData={kybData} />
        ) : (
          // Fallback: estado desconocido/parcial — nunca pantalla en blanco.
          <ErrorState onRetry={loadStatus} message={`Estado no reconocido: ${status ?? '—'}`} />
        )}

      </div>

      {/* La navegación inferior (mobile) y el sidebar (desktop) los provee
          AppLayout — KybPage NO debe renderizar su propio bottom nav, o se
          duplicaría en mobile y aparecería indebidamente en desktop. */}

      {/* ── Modal documentos adicionales ── */}
      {showModal && <MoreInfoModal onClose={() => setShowModal(false)} />}

    </div>
  )
}
