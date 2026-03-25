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
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  ArrowLeft, Home, BarChart2, FileText, User,
  Building2, CheckCircle2, Clock, AlertTriangle,
  XCircle, ChevronRight, Upload, X, Loader2,
} from 'lucide-react'
import { getKybStatus, uploadMoreInfo } from '../../services/kybService'

// ── Constantes ─────────────────────────────────────────────────────────────

const WHATSAPP_SUPPORT = `https://wa.me/${import.meta.env.VITE_SUPPORT_WHATSAPP ?? ''}?text=${encodeURIComponent('Hola, necesito ayuda con mi solicitud Business en Alyto.')}`

// ── Skeleton ───────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="px-4 animate-pulse">
      <div className="rounded-2xl bg-[#1A2340] p-5">
        <div className="h-5 w-32 bg-[#263050] rounded-full mb-4" />
        <div className="h-3.5 w-full bg-[#263050] rounded-full mb-2" />
        <div className="h-3.5 w-3/4 bg-[#263050] rounded-full mb-6" />
        <div className="h-10 w-full bg-[#263050] rounded-xl" />
      </div>
    </div>
  )
}

// ── Estado: not_started ────────────────────────────────────────────────────

function NotStartedState({ navigate }) {
  const benefits = [
    'Tickets hasta $50.000 USD por transacción',
    'Corredores globales: USD, EUR, CNY, BRL, MXN, AED',
    'Tasa FX transparente sin márgenes ocultos',
    'Soporte prioritario dedicado',
  ]
  const requirements = [
    'RUT/NIT de la empresa',
    'Escritura de constitución',
    'CI del representante legal',
  ]

  return (
    <div className="px-4 space-y-4">
      {/* Hero card */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'linear-gradient(135deg, #1D3461 0%, #0F1628 60%, #1A2030 100%)',
          border: '1px solid #C4CBD833',
          boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(196,203,216,0.06)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#C4CBD81A] border border-[#C4CBD833] flex items-center justify-center">
            <Building2 size={20} className="text-[#C4CBD8]" />
          </div>
          <div>
            <h2 className="text-[1rem] font-bold text-white">Cuenta Business</h2>
            <p className="text-[0.75rem] text-[#8A96B8]">Pagos institucionales globales</p>
          </div>
        </div>

        <p className="text-[0.875rem] text-[#8A96B8] mb-5 leading-relaxed">
          Accede a pagos internacionales con comisiones desde{' '}
          <span className="text-[#C4CBD8] font-semibold">0.5%</span> y sin límites operativos restrictivos.
        </p>

        <button
          onClick={() => navigate('/kyb/apply')}
          className="w-full py-3.5 rounded-xl text-[0.9375rem] font-bold text-[#0F1628] transition-colors"
          style={{
            background: '#C4CBD8',
            boxShadow: '0 4px 20px rgba(196,203,216,0.3)',
          }}
        >
          Solicitar cuenta Business →
        </button>
      </div>

      {/* Beneficios */}
      <div className="rounded-2xl bg-[#1A2340] border border-[#263050] p-5">
        <h3 className="text-[0.75rem] font-bold text-[#4E5A7A] uppercase tracking-wider mb-3">
          Beneficios
        </h3>
        <ul className="space-y-2.5">
          {benefits.map(b => (
            <li key={b} className="flex items-start gap-2.5">
              <CheckCircle2 size={16} className="text-[#22C55E] mt-0.5 flex-shrink-0" />
              <span className="text-[0.875rem] text-[#8A96B8] leading-snug">{b}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Requisitos */}
      <div className="rounded-2xl bg-[#1A2340] border border-[#263050] p-5">
        <h3 className="text-[0.75rem] font-bold text-[#4E5A7A] uppercase tracking-wider mb-3">
          Documentos requeridos
        </h3>
        <ul className="space-y-2.5">
          {requirements.map(r => (
            <li key={r} className="flex items-center gap-2.5">
              <FileText size={15} className="text-[#C4CBD8] flex-shrink-0" />
              <span className="text-[0.875rem] text-[#8A96B8]">{r}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── Estado: pending / under_review ─────────────────────────────────────────

function PendingState({ kybData }) {
  return (
    <div className="px-4">
      <div className="rounded-2xl bg-[#1A2340] border border-[#263050] p-6 flex flex-col items-center text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ background: '#C4CBD81A', border: '1px solid #C4CBD833' }}
        >
          <Clock size={26} className="text-[#C4CBD8]" />
        </div>
        <h2 className="text-[1.0625rem] font-bold text-white mb-2">
          Tu solicitud está en revisión
        </h2>
        <p className="text-[0.875rem] text-[#8A96B8] leading-relaxed mb-4">
          Revisaremos tu documentación en{' '}
          <span className="text-white font-semibold">24–72 horas hábiles</span>.
          Te notificaremos por email cuando esté lista.
        </p>
        {kybData?.businessId && (
          <div
            className="w-full rounded-xl px-4 py-3 text-left"
            style={{ background: '#0F1628', border: '1px dashed #263050' }}
          >
            <p className="text-[0.625rem] font-bold text-[#4E5A7A] uppercase tracking-wider mb-1">
              ID de solicitud
            </p>
            <p className="text-[0.8125rem] font-mono text-[#C4CBD8] break-all">
              {kybData.businessId}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Estado: more_info ──────────────────────────────────────────────────────

function MoreInfoState({ kybData, onOpenModal }) {
  return (
    <div className="px-4">
      <div className="rounded-2xl bg-[#1A2340] border border-[#263050] p-6 flex flex-col items-center text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ background: '#F59E0B1A', border: '1px solid #F59E0B33' }}
        >
          <AlertTriangle size={26} className="text-[#F59E0B]" />
        </div>
        <h2 className="text-[1.0625rem] font-bold text-white mb-2">
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
            <p className="text-[0.875rem] text-[#8A96B8] leading-relaxed">{kybData.kybNote}</p>
          </div>
        )}
        <button
          onClick={onOpenModal}
          className="w-full py-3.5 rounded-xl text-[0.9375rem] font-bold text-[#0F1628]"
          style={{ background: '#C4CBD8', boxShadow: '0 4px 20px rgba(196,203,216,0.3)' }}
        >
          Subir documentos adicionales
        </button>
      </div>
    </div>
  )
}

// ── Estado: approved ───────────────────────────────────────────────────────

function ApprovedState({ kybData, navigate }) {
  const limits = [
    { label: 'Máximo por transacción', value: `$${(kybData?.maxTransactionUsd ?? 50000).toLocaleString('en-US')} USD` },
    { label: 'Volumen mensual',         value: `$${(kybData?.maxMonthlyUsd ?? 80000).toLocaleString('en-US')} USD` },
  ]
  return (
    <div className="px-4">
      <div className="rounded-2xl bg-[#1A2340] border border-[#22C55E33] p-6 flex flex-col items-center text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ background: '#22C55E1A', border: '1px solid #22C55E33' }}
        >
          <CheckCircle2 size={26} className="text-[#22C55E]" />
        </div>
        <h2 className="text-[1.0625rem] font-bold text-white mb-1">
          ¡Cuenta Business activa!
        </h2>
        <p className="text-[0.875rem] text-[#8A96B8] mb-5">
          Tu empresa está verificada y lista para operar.
        </p>

        <div className="w-full space-y-2 mb-5">
          {limits.map(l => (
            <div
              key={l.label}
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: '#0F1628', border: '1px solid #263050' }}
            >
              <span className="text-[0.8125rem] text-[#8A96B8]">{l.label}</span>
              <span className="text-[0.8125rem] font-bold text-white">{l.value}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/send')}
          className="w-full py-3.5 rounded-xl text-[0.9375rem] font-bold text-[#0F1628]"
          style={{ background: '#C4CBD8', boxShadow: '0 4px 20px rgba(196,203,216,0.3)' }}
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
      <div className="rounded-2xl bg-[#1A2340] border border-[#EF444433] p-6 flex flex-col items-center text-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ background: '#EF44441A', border: '1px solid #EF444433' }}
        >
          <XCircle size={26} className="text-[#EF4444]" />
        </div>
        <h2 className="text-[1.0625rem] font-bold text-white mb-2">
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
            <p className="text-[0.875rem] text-[#8A96B8] leading-relaxed">
              {kybData.kybRejectionReason}
            </p>
          </div>
        )}
        <a
          href={WHATSAPP_SUPPORT}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3.5 rounded-xl text-[0.9375rem] font-bold text-[#0F1628] text-center block"
          style={{ background: '#C4CBD8', boxShadow: '0 4px 20px rgba(196,203,216,0.3)' }}
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
      files.forEach(f => fd.append('documents', f))
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
        style={{ background: '#1A2340', border: '1px solid #263050' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[1rem] font-bold text-white">Documentos adicionales</h3>
          <button onClick={onClose} className="text-[#4E5A7A] hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {done ? (
          <div className="text-center py-4">
            <CheckCircle2 size={40} className="text-[#22C55E] mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">Documentos enviados</p>
            <p className="text-[#8A96B8] text-[0.875rem] mb-5">
              Revisaremos tus documentos en las próximas horas.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl text-[0.875rem] font-bold text-[#0F1628]"
              style={{ background: '#C4CBD8' }}
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div
              className="border-2 border-dashed border-[#263050] rounded-xl p-6 flex flex-col items-center gap-3 mb-4 cursor-pointer hover:border-[#C4CBD8] transition-colors"
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={24} className="text-[#8A96B8]" />
              <p className="text-[0.875rem] text-[#8A96B8] text-center">
                Toca para seleccionar archivos
              </p>
              <p className="text-[0.75rem] text-[#4E5A7A]">PDF, JPG, PNG — máx. 10 MB c/u</p>
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
                    style={{ background: '#0F1628', border: '1px solid #263050' }}
                  >
                    <FileText size={14} className="text-[#C4CBD8] flex-shrink-0" />
                    <span className="text-[0.8125rem] text-[#8A96B8] truncate flex-1">{f.name}</span>
                    <button
                      onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                      className="text-[#4E5A7A] hover:text-[#EF4444] transition-colors"
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
              className="w-full py-3.5 rounded-xl text-[0.9375rem] font-bold text-[#0F1628] flex items-center justify-center gap-2 transition-opacity disabled:opacity-50"
              style={{ background: '#C4CBD8', boxShadow: '0 4px 20px rgba(196,203,216,0.3)' }}
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

// ── Main ───────────────────────────────────────────────────────────────────

export default function KybPage() {
  const navigate              = useNavigate()
  const location              = useLocation()
  const [status, setStatus]   = useState(null)
  const [kybData, setKybData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    getKybStatus()
      .then(data => {
        setStatus(data.kybStatus ?? 'not_started')
        setKybData(data)
      })
      .catch(() => setStatus('not_started'))
      .finally(() => setLoading(false))
  }, [])

  const isPending = status === 'pending' || status === 'under_review'

  return (
    <div className="min-h-screen bg-[#0F1628] font-sans flex flex-col max-w-[430px] mx-auto relative">

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-24">

        {/* ── Header ── */}
        <div className="px-5 pt-8 pb-4">
          <button
            onClick={() => navigate(-1)}
            className="mb-5 flex items-center gap-2 text-[#8A96B8] text-[0.875rem] hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Volver
          </button>
          <p className="text-[0.75rem] font-semibold text-[#4E5A7A] uppercase tracking-wider">
            Cuenta Business
          </p>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <SkeletonCard />
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
        ) : null}

      </div>

      {/* ── Bottom nav ── */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#0F1628] border-t border-[#1A2340] flex justify-around px-2 pt-2.5 pb-6 z-40">
        {[
          { icon: Home,      label: 'Inicio',          to: '/dashboard'    },
          { icon: BarChart2, label: 'Activos',          to: '/assets'       },
          { icon: FileText,  label: 'Transferencias',   to: '/transactions' },
          { icon: User,      label: 'Perfil',           to: '/profile'      },
        ].map(({ icon: Icon, label, to }) => {
          const active = location.pathname.startsWith(to)
          return (
            <Link
              key={label}
              to={to}
              className="flex flex-col items-center gap-1 min-w-[56px] no-underline"
            >
              <Icon size={20} className={active ? 'text-[#C4CBD8]' : 'text-[#4E5A7A]'} />
              <span className={`text-[0.625rem] font-medium ${active ? 'text-[#C4CBD8]' : 'text-[#4E5A7A]'}`}>
                {label}
              </span>
              {active && <span className="w-1 h-1 rounded-full bg-[#C4CBD8]" />}
            </Link>
          )
        })}
      </nav>

      {/* ── Modal documentos adicionales ── */}
      {showModal && <MoreInfoModal onClose={() => setShowModal(false)} />}

    </div>
  )
}
