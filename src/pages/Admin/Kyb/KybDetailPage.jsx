/**
 * KybDetailPage.jsx — Vista detallada y panel de decisión KYB (Admin)
 *
 * Secciones:
 *   1. Datos de la empresa
 *   2. Representante legal
 *   3. Documentos (viewer inline)
 *   4. Usuario asociado
 *   5. Panel de decisión: Aprobar / Rechazar / Más información
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Building2, User, FileText, ExternalLink,
  CheckCircle2, XCircle, AlertTriangle, Loader2, ChevronRight,
} from 'lucide-react'
import { getKybDetail, decideKyb } from '../../../services/kybService'

// ── Catálogos ──────────────────────────────────────────────────────────────

const STATUS_META = {
  not_started:  { label: 'Sin iniciar',   color: '#4E5A7A'  },
  pending:      { label: 'Pendiente',     color: '#C4CBD8'  },
  under_review: { label: 'En revisión',   color: '#F59E0B'  },
  more_info:    { label: 'Más info',      color: '#F59E0B'  },
  approved:     { label: 'Aprobado',      color: '#22C55E'  },
  rejected:     { label: 'Rechazado',     color: '#EF4444'  },
}

const COUNTRIES = {
  BO: 'Bolivia', CL: 'Chile', PE: 'Perú', AR: 'Argentina',
  CO: 'Colombia', BR: 'Brasil', MX: 'México', US: 'EEUU',
  ES: 'España', CN: 'China', AE: 'Emiratos', OTHER: 'Otro',
}

const DOC_LABELS = {
  docTaxId:         'RUT/NIT',
  docConstitution:  'Escritura de constitución',
  docRepId:         'CI representante legal',
  docDomicile:      'Comprobante de domicilio',
  docBankStatement: 'Estado de cuenta bancaria',
}

// ── Clases ─────────────────────────────────────────────────────────────────

const labelCls   = 'block text-[0.625rem] font-bold text-[#4E5A7A] uppercase tracking-wider mb-1'
const valueCls   = 'text-[0.9375rem] font-medium text-white'
const inputCls   = 'w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white border border-[#263050] bg-[#0F1628] focus:outline-none focus:border-[#C4CBD8] focus:shadow-[0_0_0_2px_#C4CBD820] placeholder-[#4E5A7A]'
const sectionCls = 'rounded-2xl p-5 space-y-4'

// ── Sub-components ─────────────────────────────────────────────────────────

function InfoRow({ label, value }) {
  return (
    <div>
      <p className={labelCls}>{label}</p>
      <p className={valueCls}>{value || '—'}</p>
    </div>
  )
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <div
      className={sectionCls}
      style={{ background: '#1A2340', border: '1px solid #263050' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className="text-[#C4CBD8]" />
        <h2 className="text-[0.875rem] font-bold text-white">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {children}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.not_started
  return (
    <span
      className="inline-block text-[0.75rem] font-bold px-3 py-1 rounded-full"
      style={{
        background: `${meta.color}1A`,
        border: `1px solid ${meta.color}33`,
        color: meta.color,
      }}
    >
      {meta.label}
    </span>
  )
}

// ── Document viewer ────────────────────────────────────────────────────────

function DocViewer({ url, label }) {
  const [open, setOpen] = useState(false)
  const isPdf = url?.toLowerCase().includes('.pdf')

  if (!url) return (
    <div
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
      style={{ background: '#0F1628', border: '1px dashed #263050' }}
    >
      <FileText size={14} className="text-[#4E5A7A]" />
      <span className="text-[0.8125rem] text-[#4E5A7A]">{label} — no disponible</span>
    </div>
  )

  return (
    <div>
      <div
        className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer hover:bg-[#1F2B4D] transition-colors"
        style={{ background: '#0F1628', border: '1px solid #263050' }}
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-[#C4CBD8]" />
          <span className="text-[0.8125rem] font-medium text-white">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-[#4E5A7A] hover:text-[#C4CBD8] transition-colors"
          >
            <ExternalLink size={13} />
          </a>
          <ChevronRight
            size={14}
            className={`text-[#4E5A7A] transition-transform ${open ? 'rotate-90' : ''}`}
          />
        </div>
      </div>
      {open && (
        <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid #263050' }}>
          {isPdf ? (
            <iframe
              src={url}
              title={label}
              className="w-full"
              style={{ height: '400px' }}
            />
          ) : (
            <img
              src={url}
              alt={label}
              className="w-full object-contain max-h-96"
              style={{ background: '#0F1628' }}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── Decision panel ─────────────────────────────────────────────────────────

function DecisionPanel({ businessId, currentStatus, onDecision }) {
  const [decision,      setDecision]      = useState('approved')
  const [note,          setNote]          = useState('')
  const [rejReason,     setRejReason]     = useState('')
  const [maxTx,         setMaxTx]         = useState(50000)
  const [maxMonthly,    setMaxMonthly]    = useState(80000)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState(null)
  const [success,       setSuccess]       = useState(false)

  async function handleConfirm() {
    if (decision === 'rejected' && !rejReason.trim()) {
      setError('El motivo de rechazo es requerido')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await decideKyb(businessId, {
        decision,
        note:              note.trim() || undefined,
        rejectionReason:   decision === 'rejected'  ? rejReason.trim() : undefined,
        maxTransactionUsd: decision === 'approved'  ? Number(maxTx)    : undefined,
        maxMonthlyUsd:     decision === 'approved'  ? Number(maxMonthly) : undefined,
      })
      setSuccess(true)
      onDecision()
    } catch (err) {
      setError(err.message || 'Error al registrar la decisión')
    } finally {
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div
        className="rounded-2xl p-5 flex flex-col items-center text-center"
        style={{ background: '#1A2340', border: '1px solid #22C55E33' }}
      >
        <CheckCircle2 size={32} className="text-[#22C55E] mb-3" />
        <p className="text-white font-bold mb-1">Decisión registrada</p>
        <p className="text-[0.875rem] text-[#8A96B8]">
          El usuario será notificado por email.
        </p>
      </div>
    )
  }

  const OPTIONS = [
    { value: 'approved',  icon: CheckCircle2,   color: '#22C55E', label: 'Aprobar'                    },
    { value: 'rejected',  icon: XCircle,        color: '#EF4444', label: 'Rechazar'                   },
    { value: 'more_info', icon: AlertTriangle,  color: '#F59E0B', label: 'Solicitar más información'  },
  ]

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{ background: '#1A2340', border: '1px solid #263050' }}
    >
      <h2 className="text-[0.875rem] font-bold text-white">Decisión KYB</h2>

      {/* Radio options */}
      <div className="space-y-2">
        {OPTIONS.map(opt => {
          const selected = decision === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setDecision(opt.value)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
              style={{
                background: selected ? `${opt.color}0D` : '#0F1628',
                border: `1.5px solid ${selected ? opt.color : '#263050'}`,
              }}
            >
              <div
                className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={{ borderColor: selected ? opt.color : '#4E5A7A' }}
              >
                {selected && (
                  <div className="w-2 h-2 rounded-full" style={{ background: opt.color }} />
                )}
              </div>
              <opt.icon size={15} style={{ color: selected ? opt.color : '#8A96B8' }} />
              <span
                className="text-[0.875rem] font-medium"
                style={{ color: selected ? opt.color : '#8A96B8' }}
              >
                {opt.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Límites — solo si approved */}
      {decision === 'approved' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Límite por transacción (USD)</label>
            <input
              type="number"
              className={inputCls}
              value={maxTx}
              onChange={e => setMaxTx(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Límite mensual (USD)</label>
            <input
              type="number"
              className={inputCls}
              value={maxMonthly}
              onChange={e => setMaxMonthly(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Motivo de rechazo — solo si rejected */}
      {decision === 'rejected' && (
        <div>
          <label className={labelCls}>Motivo del rechazo *</label>
          <textarea
            className={`${inputCls} resize-none`}
            rows={3}
            placeholder="Explique el motivo del rechazo…"
            value={rejReason}
            onChange={e => setRejReason(e.target.value)}
          />
        </div>
      )}

      {/* Nota para el usuario */}
      <div>
        <label className={labelCls}>Nota para el usuario</label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={3}
          placeholder={
            decision === 'more_info'
              ? 'Indique qué documentos o información adicional se requiere…'
              : 'Mensaje opcional para el usuario…'
          }
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </div>

      {/* Error */}
      {error && (
        <div
          className="px-4 py-3 rounded-xl text-[0.875rem] text-[#EF4444]"
          style={{ background: '#EF44441A', border: '1px solid #EF444433' }}
        >
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleConfirm}
        disabled={saving}
        className="w-full py-3.5 rounded-xl text-[0.9375rem] font-bold text-[#0F1628] flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
        style={{ background: '#C4CBD8', boxShadow: '0 4px 20px rgba(196,203,216,0.3)' }}
      >
        {saving && <Loader2 size={16} className="animate-spin" />}
        {saving ? 'Registrando…' : 'Confirmar decisión'}
      </button>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function KybDetailPage() {
  const { businessId }        = useParams()
  const navigate              = useNavigate()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  async function fetchDetail() {
    setLoading(true)
    setError(null)
    try {
      const d = await getKybDetail(businessId)
      setData(d)
    } catch (err) {
      setError(err.message || 'Error al cargar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDetail() }, [businessId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-[#8A96B8]">
        <Loader2 size={20} className="animate-spin" />
        Cargando solicitud…
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="px-4 py-3 rounded-xl text-[0.875rem] text-[#EF4444]"
        style={{ background: '#EF44441A', border: '1px solid #EF444433' }}
      >
        {error}
      </div>
    )
  }

  if (!data) return null

  const docs = data.documents ?? {}

  return (
    <div className="max-w-4xl space-y-6">

      {/* ── Back + header ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/kyb')}
          className="flex items-center gap-2 text-[#8A96B8] hover:text-white transition-colors text-[0.875rem]"
        >
          <ArrowLeft size={16} />
          Solicitudes KYB
        </button>
        <div className="h-4 w-px bg-[#263050]" />
        <h1 className="text-[1.0625rem] font-bold text-white flex-1 truncate">
          {data.legalName ?? '—'}
        </h1>
        <StatusBadge status={data.kybStatus} />
      </div>

      <div className="grid grid-cols-[1fr_360px] gap-6 items-start">

        {/* ── Left column ── */}
        <div className="space-y-5">

          {/* 1. Datos de la empresa */}
          <SectionCard icon={Building2} title="Datos de la empresa">
            <InfoRow label="Razón social"        value={data.legalName}                              />
            <InfoRow label="Nombre comercial"    value={data.tradeName}                              />
            <InfoRow label="RUT / NIT"           value={data.taxId}                                  />
            <InfoRow label="País"                value={COUNTRIES[data.country] ?? data.country}     />
            <InfoRow label="Tipo de empresa"     value={data.companyType}                            />
            <InfoRow label="Industria"           value={data.industry}                               />
            <InfoRow label="Sitio web"           value={data.website}                                />
            <InfoRow label="Teléfono"            value={data.phone}                                  />
            <InfoRow label="Dirección"           value={data.address}                                />
          </SectionCard>

          {/* 2. Representante legal */}
          <SectionCard icon={User} title="Representante legal">
            <InfoRow label="Nombre completo"     value={data.repName}                                />
            <InfoRow label="Tipo de documento"   value={data.repDocType}                             />
            <InfoRow label="N° de documento"     value={data.repDocNumber}                           />
            <InfoRow label="Email"               value={data.repEmail}                               />
            <InfoRow label="Teléfono"            value={data.repPhone}                               />
          </SectionCard>

          {/* 3. Documentos */}
          <div
            className="rounded-2xl p-5"
            style={{ background: '#1A2340', border: '1px solid #263050' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <FileText size={16} className="text-[#C4CBD8]" />
              <h2 className="text-[0.875rem] font-bold text-white">Documentos</h2>
            </div>
            <div className="space-y-2">
              {Object.entries(DOC_LABELS).map(([key, label]) => (
                <DocViewer key={key} url={docs[key]} label={label} />
              ))}
            </div>
          </div>

          {/* 4. Usuario asociado */}
          {data.user && (
            <div
              className="rounded-2xl p-5"
              style={{ background: '#1A2340', border: '1px solid #263050' }}
            >
              <div className="flex items-center gap-2 mb-4">
                <User size={16} className="text-[#C4CBD8]" />
                <h2 className="text-[0.875rem] font-bold text-white">Usuario asociado</h2>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.9375rem] font-semibold text-white">
                    {[data.user.firstName, data.user.lastName].filter(Boolean).join(' ')}
                  </p>
                  <p className="text-[0.8125rem] text-[#8A96B8]">{data.user.email}</p>
                  <p className="text-[0.75rem] text-[#4E5A7A] mt-0.5">
                    KYC: <span className="text-[#C4CBD8]">{data.user.kycStatus ?? '—'}</span>
                  </p>
                </div>
                <Link
                  to={`/admin/users/${data.user._id ?? data.userId}`}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[0.75rem] font-medium text-[#C4CBD8] hover:bg-[#C4CBD81A] transition-colors"
                >
                  Ver perfil <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── Right column: decisión ── */}
        <div className="sticky top-8">
          <DecisionPanel
            businessId={businessId}
            currentStatus={data.kybStatus}
            onDecision={fetchDetail}
          />
        </div>

      </div>

    </div>
  )
}
