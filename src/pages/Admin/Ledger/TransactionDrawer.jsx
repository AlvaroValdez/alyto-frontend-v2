/**
 * TransactionDrawer.jsx — Panel lateral de detalle de transacción
 *
 * Se desliza desde la derecha. Muestra todos los datos de la transacción
 * incluyendo ipnLog completo y permite actualizar el status manualmente.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  X, Copy, CheckCheck, ChevronDown, ChevronRight,
  Clock, CheckCircle2, XCircle, AlertCircle, Loader,
  User, Banknote, List, Edit3, ArrowRight, Paperclip, ZoomIn, FileText,
} from 'lucide-react'
import { getTransactionDetail, updateTransactionStatus, getTransactionComprobante, getBusinessInvoice } from '../../../services/adminService'

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  initiated:        { bg: '#1D346140', text: '#8AB4F8',  label: 'Iniciada'         },
  payin_pending:    { bg: '#C4CBD81A', text: '#C4CBD8',  label: 'Pay-in pend.'     },
  payin_confirmed:  { bg: '#22C55E1A', text: '#22C55E',  label: 'Payin confirmado' },
  payin_completed:  { bg: '#22C55E1A', text: '#22C55E',  label: 'Pay-in OK'        },
  in_transit:       { bg: '#C4CBD81A', text: '#C4CBD8',  label: 'En tránsito'      },
  payout_pending:   { bg: '#C4CBD81A', text: '#C4CBD8',  label: 'Payout pend.'     },
  completed:        { bg: '#22C55E1A', text: '#22C55E',  label: 'Completada'       },
  failed:           { bg: '#EF44441A', text: '#F87171',  label: 'Fallida'          },
  refunded:         { bg: '#EF44441A', text: '#F87171',  label: 'Reembolsada'      },
}

const VALID_STATUSES = [
  'initiated', 'payin_pending', 'payin_confirmed', 'payin_completed',
  'in_transit', 'payout_pending', 'completed', 'failed', 'refunded',
]

const STATUS_LABELS = {
  initiated: 'Iniciada', payin_pending: 'Pay-in pendiente',
  payin_confirmed: 'Payin confirmado', payin_completed: 'Pay-in completado',
  in_transit: 'En tránsito', payout_pending: 'Payout pendiente',
  completed: 'Completada', failed: 'Fallida', refunded: 'Reembolsada',
}

// Statuses que requieren confirmación manual (SRL Bolivia o SpA→BO manual)
const MANUAL_PAYIN_PENDING = new Set(['initiated', 'payin_pending'])

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status, size = 'sm' }) {
  const s = STATUS_STYLES[status] ?? { bg: '#4E5A7A1A', text: '#8A96B8', label: status }
  const cls = size === 'lg'
    ? 'text-xs font-semibold px-3 py-1 rounded-full'
    : 'text-[0.625rem] font-semibold px-2 py-0.5 rounded-full'
  return (
    <span className={cls} style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  )
}

function Field({ label, value, mono = false, dim = false }) {
  if (value == null || value === '') return null
  return (
    <div>
      <p className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className={`text-[0.875rem] break-all ${mono ? 'font-mono text-[#C4CBD8]' : dim ? 'text-[#8A96B8]' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-lg bg-[#1F2B4D] flex items-center justify-center flex-shrink-0">
        <Icon size={12} className="text-[#C4CBD8]" />
      </div>
      <h3 className="text-[0.8125rem] font-bold text-white">{children}</h3>
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-[#263050] my-5" />
}

// ── Timeline desde ipnLog ─────────────────────────────────────────────────────

function Timeline({ ipnLog = [] }) {
  if (!ipnLog.length) {
    return <p className="text-[0.8125rem] text-[#4E5A7A]">Sin eventos registrados.</p>
  }
  return (
    <div className="space-y-0">
      {ipnLog.map((entry, i) => {
        const isLast = i === ipnLog.length - 1
        const isManual = entry.eventType === 'manual_status_update'
        return (
          <div key={i} className="flex gap-3">
            {/* Línea vertical */}
            <div className="flex flex-col items-center">
              <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                isManual ? 'bg-[#C4CBD8]' :
                entry.status === 'completed' ? 'bg-[#22C55E]' :
                entry.status === 'failed'    ? 'bg-[#EF4444]' :
                'bg-[#4E5A7A]'
              }`} />
              {!isLast && <div className="w-px flex-1 bg-[#263050] my-1" />}
            </div>
            {/* Contenido */}
            <div className={`pb-4 ${isLast ? '' : ''}`}>
              <p className="text-[0.8125rem] font-semibold text-white leading-tight">
                {entry.eventType ?? '—'}
                {entry.provider && (
                  <span className="text-[#4E5A7A] font-normal ml-1">· {entry.provider}</span>
                )}
              </p>
              {entry.status && (
                <StatusBadge status={entry.status} />
              )}
              <p className="text-[0.6875rem] text-[#4E5A7A] mt-0.5">
                {entry.receivedAt
                  ? new Date(entry.receivedAt).toLocaleString('es-CL', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })
                  : '—'
                }
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── IPN Log expandible ────────────────────────────────────────────────────────

function IpnLogEntry({ entry, index }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-[#263050] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#1F2B4D20] transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[0.625rem] font-bold text-[#4E5A7A] w-4 flex-shrink-0">#{index + 1}</span>
          <span className="text-[0.75rem] font-mono text-[#8A96B8] truncate">{entry.eventType ?? 'event'}</span>
          {entry.provider && (
            <span className="text-[0.625rem] text-[#4E5A7A] flex-shrink-0">· {entry.provider}</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[0.625rem] text-[#4E5A7A]">
            {entry.receivedAt ? new Date(entry.receivedAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : ''}
          </span>
          {open ? <ChevronDown size={12} className="text-[#4E5A7A]" /> : <ChevronRight size={12} className="text-[#4E5A7A]" />}
        </div>
      </button>
      {open && entry.rawPayload != null && (
        <div className="px-3 pb-3 border-t border-[#26305060]">
          <pre className="text-[0.6875rem] text-[#8A96B8] font-mono mt-2 whitespace-pre-wrap break-all leading-relaxed">
            {JSON.stringify(entry.rawPayload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// ── Banner payin manual SRL — formulario inline ───────────────────────────────

function PayinManualBanner({ tx, onConfirmed }) {
  const [bankRef, setBankRef] = useState('')
  const [note,    setNote]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)
  const [success, setSuccess] = useState(false)

  const handleConfirm = async () => {
    if (!bankRef.trim()) { setError('La referencia bancaria es requerida.'); return }
    setSaving(true)
    setError(null)
    try {
      const auditNote = note.trim() || `Confirmado via transferencia bancaria ref. ${bankRef.trim()}`
      await updateTransactionStatus(
        tx.alytoTransactionId,
        'payin_confirmed',
        auditNote,
        { bankReference: bankRef.trim() },
      )
      setSuccess(true)
      onConfirmed()
    } catch (err) {
      setError(err.message || 'Error al confirmar.')
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="mb-5 flex items-center gap-3 p-4 rounded-2xl border border-[#22C55E40] bg-[#22C55E0A]">
        <CheckCircle2 size={20} className="text-[#22C55E] flex-shrink-0" />
        <div>
          <p className="text-[0.875rem] font-bold text-[#22C55E]">
            ✅ Pago confirmado
          </p>
          <p className="text-[0.75rem] text-[#8A96B8] mt-0.5">
            Payout disparado automáticamente a Vita Wallet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-5 p-4 rounded-2xl border border-[#FBBF2440] bg-[#F59E0B0A] space-y-4">

      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none">⏳</span>
        <p className="text-[0.875rem] font-bold text-[#FBBF24]">
          Payin manual pendiente — {tx.legalEntity === 'SRL' ? 'Bolivia' : `${tx.originCountry}→${tx.destinationCountry}`}
        </p>
      </div>

      {/* Resumen */}
      <div className="pl-1 space-y-0.5">
        <p className="text-[0.8125rem] text-[#8A96B8]">El usuario debe transferir:</p>
        <p className="text-[1.125rem] font-extrabold text-white tabular-nums">
          {tx.originCurrency === 'CLP' ? '$ ' :
           tx.originCurrency === 'BOB' ? 'Bs ' :
           tx.originCurrency === 'USD' ? '$ ' :
           tx.originCurrency === 'EUR' ? '€ ' : ''}{tx.originalAmount?.toLocaleString('es-CL')} {tx.originCurrency ?? 'BOB'}
        </p>
        <p className="text-[0.75rem] font-mono text-[#4E5A7A]">
          Ref: {tx.alytoTransactionId}
        </p>
      </div>

      {/* Referencia bancaria */}
      <div>
        <label className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-1.5 block">
          Referencia bancaria <span className="text-[#EF4444]">*</span>
        </label>
        <input
          type="text"
          value={bankRef}
          onChange={e => setBankRef(e.target.value)}
          placeholder="Nro. de transacción del banco"
          className="w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white border border-[#FBBF2430] bg-[#1A2340] focus:outline-none focus:border-[#FBBF24] transition-colors placeholder-[#4E5A7A]"
        />
      </div>

      {/* Nota de confirmación */}
      <div>
        <label className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-1.5 block">
          Nota de confirmación
        </label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          placeholder='Ej: "Confirmado Banco Bisa — transferencia recibida"'
          className="w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white border border-[#FBBF2430] bg-[#1A2340] focus:outline-none focus:border-[#FBBF24] transition-colors resize-none placeholder-[#4E5A7A]"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
          <AlertCircle size={12} className="text-[#F87171] flex-shrink-0" />
          <p className="text-[0.75rem] text-[#F87171]">{error}</p>
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={saving || !bankRef.trim()}
        className="w-full py-2.5 rounded-xl bg-[#22C55E] text-white text-[0.875rem] font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 transition-all"
      >
        {saving && <Loader size={13} className="animate-spin" />}
        {saving ? 'Confirmando…' : '✅ Confirmar pago recibido'}
      </button>
    </div>
  )
}

// ── PaymentProofSection — comprobante subido por el usuario ──────────────────

function PaymentProofSection({ paymentProof }) {
  const [modalOpen,  setModalOpen]  = useState(false)
  const [blobUrl,    setBlobUrl]    = useState(null)

  // paymentProof viene del detalle de transacción ya cargado.
  // El campo mimetype llega en minúsculas desde el modelo MongoDB.
  const mimeType = paymentProof?.mimeType ?? paymentProof?.mimetype ?? 'image/jpeg'

  // Convertir base64 → Blob URL para evitar el límite de ~2MB de los data URLs en <img>
  useEffect(() => {
    if (!paymentProof?.data) return
    try {
      const byteChars = atob(paymentProof.data)
      const bytes = new Uint8Array(byteChars.length)
      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i)
      const blob = new Blob([bytes], { type: mimeType })
      const url  = URL.createObjectURL(blob)
      setBlobUrl(url)
      return () => URL.revokeObjectURL(url)
    } catch {
      // Si el base64 es inválido, no hacer nada
    }
  }, [paymentProof?.data, mimeType])

  const isPdf   = mimeType === 'application/pdf'
  const isImage = !isPdf

  const uploadedLabel = paymentProof?.uploadedAt
    ? new Date(paymentProof.uploadedAt).toLocaleString('es-CL', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <>
      <div className="mb-5 rounded-2xl bg-[#1A2340] border border-[#263050] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#263050]">
          <Paperclip size={13} className="text-[#C4CBD8] flex-shrink-0" />
          <p className="text-[0.8125rem] font-bold text-white">Comprobante del usuario</p>
        </div>

        <div className="px-4 py-4">
          <div className="flex flex-col gap-3">
            {/* Metadata */}
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[0.8125rem] font-semibold text-white truncate">
                  {paymentProof?.filename ?? 'comprobante'}
                </p>
                {uploadedLabel && (
                  <p className="text-[0.6875rem] text-[#4E5A7A] mt-0.5">{uploadedLabel}</p>
                )}
              </div>
            </div>

            {/* Thumbnail imagen — usa Blob URL para evitar el límite de ~2MB de data URLs */}
            {isImage && blobUrl && (
              <button
                onClick={() => setModalOpen(true)}
                className="group relative w-full rounded-xl overflow-hidden border border-[#263050] bg-[#0F1628] hover:border-[#C4CBD833] transition-colors"
                title="Ver imagen completa"
              >
                <img
                  src={blobUrl}
                  alt="Comprobante de pago"
                  className="w-full max-h-48 object-contain"
                />
                <div className="absolute inset-0 bg-[#0F162860] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn size={22} className="text-white" />
                </div>
              </button>
            )}

            {/* Botón PDF */}
            {isPdf && blobUrl && (
              <a
                href={blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#263050] text-[0.8125rem] text-[#8A96B8] hover:text-white hover:border-[#C4CBD833] transition-colors no-underline w-fit"
              >
                <FileText size={14} className="text-[#C4CBD8]" />
                Ver PDF
              </a>
            )}

            {/* Indicador mientras se procesa el blob */}
            {!blobUrl && (
              <div className="flex items-center gap-2">
                <Loader size={13} className="animate-spin text-[#4E5A7A]" />
                <span className="text-[0.8125rem] text-[#4E5A7A]">Cargando vista previa…</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal imagen a pantalla completa */}
      {modalOpen && blobUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: '#0F162899', backdropFilter: 'blur(8px)' }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative max-w-2xl w-full rounded-2xl overflow-hidden border border-[#263050] bg-[#0F1628]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#263050]">
              <p className="text-[0.875rem] font-semibold text-white">{paymentProof?.filename ?? 'Comprobante'}</p>
              <button
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#1A2340] border border-[#263050] flex items-center justify-center hover:border-[#C4CBD833] transition-colors"
              >
                <X size={12} className="text-[#8A96B8]" />
              </button>
            </div>
            <img
              src={blobUrl}
              alt="Comprobante de pago"
              className="w-full max-h-[70vh] object-contain bg-[#0F1628] p-4"
            />
          </div>
        </div>
      )}
    </>
  )
}

// ── TransactionDrawer ─────────────────────────────────────────────────────────

/**
 * @param {{ transactionId: string|null, onClose: () => void, onStatusUpdated: () => void }} props
 */
export default function TransactionDrawer({ transactionId, onClose, onStatusUpdated }) {
  const [tx,          setTx]          = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [copied,      setCopied]      = useState(false)

  // Actualización manual de status
  const [newStatus,   setNewStatus]   = useState('')
  const [note,        setNote]        = useState('')
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState(null)
  const [saveOk,      setSaveOk]      = useState(false)
  const [downloadingB2B, setDownloadingB2B] = useState(false)

  const load = useCallback(async () => {
    if (!transactionId) return
    setLoading(true)
    setError(null)
    setTx(null)
    try {
      const data = await getTransactionDetail(transactionId)
      setTx(data.transaction)
      setNewStatus(data.transaction.status)
    } catch (err) {
      setError(err.message || 'Error al cargar la transacción.')
    } finally {
      setLoading(false)
    }
  }, [transactionId])

  useEffect(() => { load() }, [load])

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const copyId = () => {
    if (!tx?.alytoTransactionId) return
    navigator.clipboard.writeText(tx.alytoTransactionId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStatusUpdate = async () => {
    if (!note.trim()) { setSaveError('La nota es requerida.'); return }
    setSaving(true)
    setSaveError(null)
    setSaveOk(false)
    try {
      await updateTransactionStatus(tx.alytoTransactionId, newStatus, note.trim())
      setSaveOk(true)
      setNote('')
      onStatusUpdated?.()
      await load()
    } catch (err) {
      setSaveError(err.message || 'Error al actualizar.')
    } finally {
      setSaving(false)
    }
  }

  const isOpen = !!transactionId

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: '#0F162880', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className={`fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          width: 'min(520px, 100vw)',
          background: '#0F1628',
          borderLeft: '1px solid #263050',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header del drawer */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0 border-b border-[#263050]"
          style={{ background: 'linear-gradient(180deg, #1A2340 0%, #0F1628 100%)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {tx && (
              <>
                <button
                  onClick={copyId}
                  className="flex items-center gap-1.5 group"
                  title="Copiar ID"
                >
                  <span className="text-[0.75rem] font-mono text-[#C4CBD8] truncate max-w-[200px]">
                    {tx.alytoTransactionId}
                  </span>
                  {copied
                    ? <CheckCheck size={12} className="text-[#22C55E] flex-shrink-0" />
                    : <Copy size={12} className="text-[#4E5A7A] group-hover:text-[#C4CBD8] flex-shrink-0 transition-colors" />
                  }
                </button>
                <StatusBadge status={tx.status} size="lg" />
              </>
            )}
            {loading && <span className="text-[0.8125rem] text-[#4E5A7A]">Cargando...</span>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1A2340] border border-[#263050] flex items-center justify-center hover:border-[#C4CBD833] transition-colors flex-shrink-0 ml-3"
          >
            <X size={14} className="text-[#8A96B8]" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader size={24} className="text-[#4E5A7A] animate-spin" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 bg-[#EF44441A] rounded-2xl border border-[#EF444433]">
              <AlertCircle size={16} className="text-[#F87171] flex-shrink-0" />
              <p className="text-[0.875rem] text-[#F87171]">{error}</p>
            </div>
          )}

          {tx && (
            <div>

              {/* ── Comprobante de pago del usuario ─────────────────────── */}
              {tx.paymentProof?.data && (
                <PaymentProofSection
                  paymentProof={tx.paymentProof}
                />
              )}

              {/* ── Banner payin manual (SRL Bolivia o SpA→BO manual) ── */}
              {MANUAL_PAYIN_PENDING.has(tx.status)
                && (tx.legalEntity === 'SRL' || (tx.legalEntity === 'SpA' && tx.destinationCountry === 'BO'))
                && (
                <PayinManualBanner
                  tx={tx}
                  onConfirmed={() => { load(); onStatusUpdated?.() }}
                />
              )}

              {/* ── 1. Flujo de pago (timeline) ─────────────────────────── */}
              <SectionTitle icon={ArrowRight}>Flujo de pago</SectionTitle>
              <Timeline ipnLog={tx.ipnLog} />

              <Divider />

              {/* ── 2. Datos financieros ──────────────────────────────────── */}
              <SectionTitle icon={Banknote}>Datos financieros</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Monto enviado" value={tx.originalAmount != null ? `${tx.originalAmount?.toLocaleString('es-CL')} ${tx.originCurrency}` : null} />
                <Field label="Monto a recibir" value={tx.destinationAmount != null ? `${tx.destinationAmount?.toLocaleString('es-CL')} ${tx.destinationCurrency}` : null} />
                <Field label="Tasa de cambio" value={tx.exchangeRate != null ? `1 ${tx.originCurrency} = ${tx.exchangeRate} ${tx.destinationCurrency}` : null} dim />
                <Field label="Activo digital" value={tx.digitalAsset ? `${tx.digitalAsset} ${tx.digitalAssetAmount ?? ''}` : null} dim />
                <Field label="País origen" value={tx.originCountry} dim />
                <Field label="País destino" value={tx.destinationCountry} dim />
                <Field label="Entidad" value={tx.legalEntity} dim />
                <Field label="Corredor" value={tx.routingScenario ? `Escenario ${tx.routingScenario}` : null} dim />
              </div>

              {tx.feeBreakdown && (
                <div className="mt-3 p-3 rounded-xl bg-[#1A2340] border border-[#263050] grid grid-cols-2 gap-2">
                  <Field label="Fee proveedor" value={tx.feeBreakdown.providerFee != null ? tx.feeBreakdown.providerFee?.toLocaleString('es-CL') : null} dim />
                  <Field label="Spread Alyto" value={tx.feeBreakdown.alytoFee != null ? tx.feeBreakdown.alytoFee?.toLocaleString('es-CL') : null} dim />
                  <Field label="Fee red" value={tx.feeBreakdown.networkFee != null ? tx.feeBreakdown.networkFee?.toLocaleString('es-CL') : null} dim />
                  <Field label="Fee total" value={tx.feeBreakdown.totalFee != null ? `${tx.feeBreakdown.totalFee?.toLocaleString('es-CL')} ${tx.feeBreakdown.feeCurrency ?? tx.originCurrency}` : null} />
                </div>
              )}

              {tx.stellarTxId && (
                <div className="mt-3">
                  <Field label="Stellar TXID" value={tx.stellarTxId} mono />
                </div>
              )}

              <Divider />

              {/* ── 3. Beneficiario ───────────────────────────────────────── */}
              {tx.beneficiary && Object.keys(tx.beneficiary).length > 0 && (
                <>
                  <SectionTitle icon={User}>Beneficiario</SectionTitle>

                  {/* Bolivia manual beneficiary (bank_data / qr_image) */}
                  {tx.beneficiary.type === 'bank_data' || tx.beneficiary.type === 'qr_image' ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Nombre" value={[tx.beneficiary.beneficiary_first_name, tx.beneficiary.beneficiary_last_name].filter(Boolean).join(' ')} />
                        <Field label="CI Bolivia" value={tx.beneficiary.beneficiary_document} mono />
                        <Field label="Teléfono" value={tx.beneficiary.beneficiary_phone} dim />
                        <Field label="Tipo pago" value={tx.beneficiary.type === 'bank_data' ? 'Cuenta bancaria' : 'QR de cobro'} dim />
                      </div>
                      {tx.beneficiary.type === 'bank_data' && (
                        <div className="p-3 rounded-xl bg-[#1A2340] border border-[#263050] grid grid-cols-2 gap-3">
                          <Field label="Banco" value={tx.beneficiary.beneficiary_bank} />
                          <Field label="Tipo cuenta" value={tx.beneficiary.beneficiary_account_type} dim />
                          <Field label="N° cuenta" value={tx.beneficiary.beneficiary_account_number} mono />
                        </div>
                      )}
                      {tx.beneficiary.type === 'qr_image' && tx.beneficiary.qr_image && (
                        <div className="p-3 rounded-xl bg-[#1A2340] border border-[#263050] flex flex-col items-center gap-2">
                          <p className="text-[0.75rem] text-[#4E5A7A] font-semibold uppercase tracking-wider">QR del beneficiario</p>
                          <img
                            src={tx.beneficiary.qr_image}
                            alt="QR beneficiario"
                            className="w-[180px] h-[180px] rounded-xl bg-white p-1.5 object-contain"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Vita-style beneficiary */
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Nombre" value={[tx.beneficiary.firstName, tx.beneficiary.lastName].filter(Boolean).join(' ')} />
                      <Field label="Email" value={tx.beneficiary.email} dim />
                      <Field label="Banco" value={tx.beneficiary.bankCode} dim />
                      <Field label="Cuenta" value={tx.beneficiary.accountBank} mono />
                      <Field label="Tipo cuenta" value={tx.beneficiary.accountType} dim />
                      <Field label="Documento" value={tx.beneficiary.documentNumber ? `${tx.beneficiary.documentType ?? ''} ${tx.beneficiary.documentNumber}` : null} dim />
                    </div>
                  )}
                  <Divider />
                </>
              )}

              {/* ── 4. Usuario ────────────────────────────────────────────── */}
              {tx.userId && (
                <>
                  <SectionTitle icon={User}>Usuario</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Email" value={tx.userId.email} />
                    <Field label="Nombre" value={[tx.userId.firstName, tx.userId.lastName].filter(Boolean).join(' ')} dim />
                    <Field label="Entidad" value={tx.userId.legalEntity} dim />
                    <Field label="KYC" value={tx.userId.kycStatus} dim />
                  </div>
                  <Divider />
                </>
              )}

              {/* ── 4b. Factura B2B — solo business + completed + SRL ──── */}
              {tx.status === 'completed' && tx.legalEntity === 'SRL' && tx.userId?.accountType === 'business' && (
                <>
                  <div className="flex items-center gap-2">
                    <SectionTitle icon={FileText}>Factura B2B</SectionTitle>
                  </div>
                  <button
                    onClick={async () => {
                      setDownloadingB2B(true)
                      try {
                        await getBusinessInvoice(tx.alytoTransactionId)
                      } catch {
                        // silently handled
                      } finally {
                        setDownloadingB2B(false)
                      }
                    }}
                    disabled={downloadingB2B}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[0.8125rem] font-semibold transition-all active:scale-95 disabled:opacity-50"
                    style={{
                      background: downloadingB2B ? '#C4CBD840' : '#C4CBD8',
                      color: '#0F1628',
                      boxShadow: downloadingB2B ? 'none' : '0 4px 20px rgba(196,203,216,0.3)',
                    }}
                  >
                    {downloadingB2B
                      ? <Loader size={13} className="animate-spin" />
                      : <FileText size={13} />}
                    {downloadingB2B ? 'Generando...' : 'Descargar Comprobante B2B'}
                  </button>
                  <Divider />
                </>
              )}

              {/* ── 5. IPN Log ────────────────────────────────────────────── */}
              <SectionTitle icon={List}>IPN Log ({tx.ipnLog?.length ?? 0} eventos)</SectionTitle>
              {tx.ipnLog?.length > 0 ? (
                <div className="space-y-1.5">
                  {tx.ipnLog.map((entry, i) => (
                    <IpnLogEntry key={i} entry={entry} index={i} />
                  ))}
                </div>
              ) : (
                <p className="text-[0.8125rem] text-[#4E5A7A]">Sin eventos.</p>
              )}

              {/* ── 6. Actualización manual ───────────────────────────────── */}
              {tx.status !== 'completed' && (
                <>
                  <Divider />
                  <SectionTitle icon={Edit3}>Actualizar status manualmente</SectionTitle>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-1.5 block">
                        Nuevo status
                      </label>
                      <select
                        value={newStatus}
                        onChange={e => setNewStatus(e.target.value)}
                        className="w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white border border-[#263050] bg-[#1A2340] focus:outline-none focus:border-[#C4CBD8] focus:shadow-[0_0_0_2px_#C4CBD820]"
                      >
                        {VALID_STATUSES.map(s => (
                          <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-1.5 block">
                        Nota de auditoría <span className="text-[#EF4444]">*</span>
                      </label>
                      <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Razón del cambio manual..."
                        rows={3}
                        className="w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white border border-[#263050] bg-[#1A2340] focus:outline-none focus:border-[#C4CBD8] focus:shadow-[0_0_0_2px_#C4CBD820] resize-none placeholder-[#4E5A7A]"
                      />
                    </div>

                    {saveError && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
                        <AlertCircle size={14} className="text-[#F87171] flex-shrink-0" />
                        <p className="text-[0.8125rem] text-[#F87171]">{saveError}</p>
                      </div>
                    )}
                    {saveOk && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-[#22C55E1A] border border-[#22C55E33]">
                        <CheckCircle2 size={14} className="text-[#22C55E] flex-shrink-0" />
                        <p className="text-[0.8125rem] text-[#22C55E]">Status actualizado correctamente.</p>
                      </div>
                    )}

                    <button
                      onClick={handleStatusUpdate}
                      disabled={saving || !note.trim()}
                      className="w-full py-3 rounded-2xl text-[0.9375rem] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{
                        background: saving || !note.trim() ? '#C4CBD840' : '#C4CBD8',
                        color: '#0F1628',
                        boxShadow: saving || !note.trim() ? 'none' : '0 4px 20px rgba(196,203,216,0.3)',
                      }}
                    >
                      {saving && <Loader size={14} className="animate-spin" />}
                      {saving ? 'Guardando...' : 'Actualizar status'}
                    </button>
                  </div>
                </>
              )}

            </div>
          )}
        </div>
      </aside>
    </>
  )
}
