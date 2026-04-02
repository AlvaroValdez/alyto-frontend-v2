/**
 * Step5PaymentWidget.jsx — Widget de pago del proveedor.
 *
 * Tres modos según payinMethod:
 *   • fintoc / vita / url → abre redirect_url en nueva pestaña + polling
 *   • manual             → muestra instrucciones de transferencia bancaria
 *                          sin polling (admin confirma manualmente)
 *
 * Polling cada 5s a GET /payments/:transactionId/status.
 * Avanza automáticamente cuando status ∈ FINAL_STATUSES.
 * Timeout de 15 minutos con pantalla de soporte.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, ExternalLink, AlertCircle, MessageCircle,
  Copy, CheckCheck, Clock, Download, Paperclip, Upload, CheckCircle2,
} from 'lucide-react'
import { getTransactionStatus, getPaymentQR, uploadComprobante } from '../../services/paymentsService'
import Sentry from '../../services/sentry.js'

const POLL_INTERVAL_MS = 5_000
const TIMEOUT_MS       = 15 * 60 * 1000
const FINAL_STATUSES   = new Set(['payin_confirmed', 'payin_completed', 'completed', 'in_transit'])

function formatTransactionId(id) {
  if (!id) return ''
  return `${id.slice(0, 8)}...${id.slice(-6)}`
}

// ── InfoRow — fila de datos de la cuenta bancaria ─────────────────────────────

function InfoRow({ label, value, mono = false, highlight = false }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-[#E2E8F060] last:border-0">
      <span className="text-[0.75rem] text-[#94A3B8] flex-shrink-0">{label}</span>
      <span className={`text-[0.875rem] text-right break-all ${
        highlight ? 'font-bold text-[#1D9E75]' :
        mono      ? 'font-mono text-[#64748B]' :
                    'text-[#0F172A] font-semibold'
      }`}>
        {value}
      </span>
    </div>
  )
}

// ── QR helpers ────────────────────────────────────────────────────────────────

function toQrSrc(raw) {
  if (!raw) return null
  if (raw.startsWith('data:') || raw.startsWith('http')) return raw
  return `data:image/png;base64,${raw}`
}

// ── ManualPayinScreen — instrucciones bancarias Bolivia con QR ────────────────

function ManualPayinScreen({ stepData }) {
  const navigate = useNavigate()
  const { transactionId, originAmount, originCurrency, payinInstructions, paymentQR, paymentQRStatic } = stepData
  const bank       = payinInstructions ?? {}
  const currency   = originCurrency ?? 'BOB'
  const staticQRs  = Array.isArray(paymentQRStatic) ? paymentQRStatic.filter(q => q.imageBase64) : []

  const [copiedRef,    setCopiedRef]    = useState(false)
  const [qrSrc,        setQrSrc]        = useState(() => toQrSrc(paymentQR))
  const [qrLoading,    setQrLoading]    = useState(!paymentQR && !!transactionId)
  const [proofFile,    setProofFile]    = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [uploading,    setUploading]    = useState(false)
  const [uploadDone,   setUploadDone]   = useState(false)
  const [uploadError,  setUploadError]  = useState(null)

  // Cargar QR del backend si no vino en stepData
  useEffect(() => {
    if (paymentQR || !transactionId) return
    let cancelled = false
    getPaymentQR(transactionId)
      .then(res => {
        if (cancelled) return
        const raw = res.qrDataUrl ?? res.qrUrl ?? res.qr ?? res.qrBase64
        if (raw) setQrSrc(toQrSrc(raw))
      })
      .catch(() => {}) // QR es opcional — no bloquea el flujo
      .finally(() => { if (!cancelled) setQrLoading(false) })
    return () => { cancelled = true }
  }, [transactionId, paymentQR])

  const copyRef = () => {
    if (!transactionId) return
    navigator.clipboard.writeText(transactionId)
    setCopiedRef(true)
    setTimeout(() => setCopiedRef(false), 2000)
  }

  const downloadQR = () => {
    if (!qrSrc) return
    const a = document.createElement('a')
    a.download = `qr-alyto-${transactionId ?? 'pago'}.png`
    a.href = qrSrc
    a.click()
  }

  const handleDone = () => {
    if (transactionId) navigate(`/transactions/${transactionId}`)
    else navigate('/transactions')
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('El archivo supera el límite de 5MB.')
      return
    }
    setProofFile(file)
    setUploadError(null)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setProofPreview(ev.target.result)
      reader.readAsDataURL(file)
    } else {
      setProofPreview(null)
    }
  }

  const handleUpload = async () => {
    if (!proofFile || !transactionId) return
    setUploading(true)
    setUploadError(null)
    try {
      await uploadComprobante(transactionId, proofFile)
      setUploadDone(true)
    } catch (err) {
      setUploadError(err.message || 'Error al subir el comprobante.')
    } finally {
      setUploading(false)
    }
  }

  const showQRSection = qrLoading || !!qrSrc || staticQRs.length > 0

  return (
    <div className="flex flex-col gap-5 px-4 pb-4">

      {/* Título */}
      <div>
        <h2 className="text-[1.125rem] font-bold text-[#0F172A]">Instrucciones de pago</h2>
        <p className="text-[0.8125rem] text-[#64748B] mt-0.5">
          Escanea el QR o realiza una transferencia bancaria.
        </p>
      </div>

      {/* ── Sección QR ── */}
      {showQRSection && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📱</span>
            <p className="text-[0.875rem] font-bold text-[#0F172A]">Paga con QR</p>
          </div>

          {/* QR estáticos subidos por admin (Tigo Money, Banco Bisa, etc.) */}
          {staticQRs.length > 0 && (
            <div className={`w-full ${staticQRs.length > 1 ? 'grid grid-cols-2 gap-3' : 'flex justify-center'}`}>
              {staticQRs.map((qr, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <img
                    src={qr.imageBase64}
                    alt={qr.label}
                    className="w-[160px] h-[160px] rounded-xl bg-white p-1.5 object-contain"
                  />
                  <span className="text-[0.75rem] text-[#8A96B8] font-medium">{qr.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* QR dinámico (datos de transferencia bancaria) — solo si no hay estáticos */}
          {staticQRs.length === 0 && (
            qrLoading ? (
              <div className="w-[200px] h-[200px] rounded-2xl bg-[#E2E8F0] animate-pulse" />
            ) : qrSrc ? (
              <>
                <img
                  src={qrSrc}
                  alt="Código QR de pago"
                  className="w-[200px] h-[200px] rounded-2xl bg-white p-2 object-contain"
                />
                <button
                  onClick={downloadQR}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E2E8F0] text-[0.8125rem] text-[#64748B] hover:text-[#1D9E75] hover:border-[#1D9E7533] transition-colors"
                >
                  <Download size={13} />
                  Descargar QR
                </button>
              </>
            ) : null
          )}

          <p className="text-[0.75rem] text-[#64748B] text-center">
            Escanea desde tu app bancaria o billetera digital
          </p>
        </div>
      )}

      {/* Separador "O transfiere manualmente" */}
      {showQRSection && (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[#E2E8F0]" />
          <span className="text-[0.75rem] text-[#94A3B8] flex-shrink-0">O transfiere manualmente</span>
          <div className="h-px flex-1 bg-[#E2E8F0]" />
        </div>
      )}

      {/* ── Card de datos bancarios ── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[#E2E8F0]">
          <span className="text-xl">🏦</span>
          <p className="text-[0.875rem] font-bold text-[#0F172A]">Transferencia bancaria</p>
        </div>
        <div className="px-5 py-1">
          <InfoRow label="Banco"   value={bank.bankName     ?? 'Banco Bisa'} />
          <InfoRow label="Titular" value={bank.accountHolder ?? bank.holder ?? 'AV Finance SRL'} />
          <InfoRow label="Cuenta"  value={bank.accountNumber ?? '—'} mono />
          <InfoRow label="Tipo"    value={bank.accountType   ?? 'Cuenta Corriente'} />
          <InfoRow
            label="Monto"
            value={`Bs ${Number(originAmount ?? 0).toLocaleString('es-CL')} ${currency}`}
            highlight
          />
        </div>

        {/* Referencia copiable */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#E2E8F0]">
          <div className="min-w-0">
            <p className="text-[0.625rem] font-semibold text-[#94A3B8] uppercase tracking-wider mb-0.5">
              Referencia (copiar en el concepto)
            </p>
            <p className="text-[0.75rem] font-mono font-semibold text-[#64748B] truncate">
              {transactionId ?? '—'}
            </p>
          </div>
          <button
            onClick={copyRef}
            className="ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] hover:border-[#1D9E7533] transition-colors text-[0.75rem] text-[#64748B] hover:text-[#1D9E75] flex-shrink-0"
          >
            {copiedRef
              ? <><CheckCheck size={12} className="text-[#1D9E75]" /> Copiado</>
              : <><Copy size={12} /> Copiar</>
            }
          </button>
        </div>
      </div>

      {/* Warning referencia */}
      <div className="flex items-start gap-2.5 px-4 py-3.5 rounded-2xl bg-[#F59E0B0F] border border-[#F59E0B33]">
        <span className="text-base flex-shrink-0 leading-none mt-0.5">⚠️</span>
        <div>
          <p className="text-[0.8125rem] font-semibold text-[#FBBF24] leading-tight">
            Incluye el número de referencia
          </p>
          <p className="text-[0.75rem] text-[#8A96B8] mt-0.5">
            Escribe el ID de transacción en el concepto de tu transferencia para que podamos identificar tu pago.
          </p>
        </div>
      </div>

      {/* Tiempo de verificación */}
      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
        <Clock size={14} className="text-[#64748B] flex-shrink-0" />
        <p className="text-[0.8125rem] text-[#64748B]">
          Tu pago será verificado en{' '}
          <span className="text-[#0F172A] font-semibold">2–4 horas hábiles</span>.
          Te notificaremos cuando sea confirmado.
        </p>
      </div>

      {/* ── Subir comprobante ── */}
      {uploadDone ? (
        <div className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-[#1D9E751A] border border-[#1D9E7533]">
          <CheckCircle2 size={28} className="text-[#1D9E75]" />
          <div className="text-center">
            <p className="text-[0.9375rem] font-bold text-[#1D9E75]">
              ✅ Comprobante recibido
            </p>
            <p className="text-[0.8125rem] text-[#64748B] mt-1">
              Verificaremos tu pago en 2–4 horas hábiles.
            </p>
          </div>
          <button
            onClick={handleDone}
            className="mt-1 px-5 py-2.5 rounded-xl bg-[#1D9E75] text-white text-[0.875rem] font-bold shadow-[0_4px_20px_rgba(29,158,117,0.25)] active:scale-[0.98] transition-all"
          >
            Ver estado de mi transferencia →
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-[#E2E8F0] overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[#E2E8F0]">
            <Paperclip size={15} className="text-[#64748B] flex-shrink-0" />
            <p className="text-[0.875rem] font-bold text-[#0F172A]">¿Ya realizaste el pago?</p>
          </div>

          <div className="px-5 py-4 flex flex-col gap-3">
            <p className="text-[0.8125rem] text-[#64748B]">
              Sube tu comprobante para agilizar la verificación.
            </p>

            {/* Preview si es imagen */}
            {proofPreview && (
              <div className="rounded-xl overflow-hidden border border-[#E2E8F0]">
                <img
                  src={proofPreview}
                  alt="Vista previa del comprobante"
                  className="w-full max-h-48 object-contain bg-[#F8FAFC]"
                />
              </div>
            )}

            {/* Nombre del archivo PDF */}
            {proofFile && !proofPreview && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <Paperclip size={14} className="text-[#64748B] flex-shrink-0" />
                <span className="text-[0.8125rem] text-[#64748B] truncate">{proofFile.name}</span>
              </div>
            )}

            {/* Selector de archivo */}
            <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-[#94A3B8] text-[0.875rem] text-[#64748B] hover:text-[#1D9E75] hover:border-[#1D9E7533] transition-colors cursor-pointer">
              <Upload size={15} />
              {proofFile ? 'Cambiar archivo' : 'Seleccionar archivo'}
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            <p className="text-[0.6875rem] text-[#94A3B8] -mt-1">JPG, PNG o PDF — máx. 5MB</p>

            {uploadError && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
                <AlertCircle size={13} className="text-[#F87171] flex-shrink-0" />
                <p className="text-[0.8125rem] text-[#F87171]">{uploadError}</p>
              </div>
            )}

            <button
              onClick={handleUpload}
              disabled={!proofFile || uploading}
              className="w-full py-3 rounded-xl text-[0.875rem] font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background:  proofFile && !uploading ? '#1D9E75' : '#E2E8F0',
                color:       proofFile && !uploading ? '#FFFFFF' : '#94A3B8',
                boxShadow:   proofFile && !uploading ? '0 4px 20px rgba(29,158,117,0.25)' : 'none',
              }}
            >
              {uploading
                ? <><Loader2 size={14} className="animate-spin" /> Enviando...</>
                : <><Upload size={14} /> Enviar comprobante</>
              }
            </button>
          </div>
        </div>
      )}

      {/* Botón CTA — solo si aún no subió comprobante */}
      {!uploadDone && (
        <button
          onClick={handleDone}
          className="w-full py-4 rounded-2xl bg-transparent border border-[#E2E8F0] text-[#64748B] text-[0.875rem] font-semibold hover:border-[#1D9E7533] hover:text-[#0F172A] active:scale-[0.98] transition-all"
        >
          Ya realicé el pago, lo verifico después →
        </button>
      )}

      <p className="text-center text-[0.6875rem] text-[#94A3B8]">
        ID de referencia: <span className="font-mono">{formatTransactionId(transactionId)}</span>
      </p>
    </div>
  )
}

// ── Step5PaymentWidget ────────────────────────────────────────────────────────

export default function Step5PaymentWidget({ stepData, onNext }) {
  const { transactionId, payinUrl, payinMethod } = stepData

  // ── Payin manual — sin polling, sin URL ──────────────────────────────────

  if (payinMethod === 'manual') {
    return <ManualPayinScreen stepData={stepData} />
  }

  // ── Resto de modos: fintoc / vita / url (con redirect + polling) ─────────

  return <PollingPayinScreen stepData={stepData} onNext={onNext} />
}

// ── PollingPayinScreen — flujo con URL + polling ──────────────────────────────

function PollingPayinScreen({ stepData, onNext }) {
  const { transactionId, payinUrl, payinMethod } = stepData

  const [widgetOpened, setWidgetOpened] = useState(false)
  const [polling,      setPolling]      = useState(false)
  const [timedOut,     setTimedOut]     = useState(false)
  const [pollError,    setPollError]    = useState(null)

  const pollTimer    = useRef(null)
  const timeoutTimer = useRef(null)

  const stopPolling = useCallback(() => {
    setPolling(false)
    if (pollTimer.current)    clearInterval(pollTimer.current)
    if (timeoutTimer.current) clearTimeout(timeoutTimer.current)
  }, [])

  const startPolling = useCallback(() => {
    setPolling(true)

    const doPoll = async () => {
      try {
        const data = await getTransactionStatus(transactionId)
        if (FINAL_STATUSES.has(data.status)) {
          stopPolling()
          onNext({ completedAt: data.updatedAt || new Date().toISOString() })
        }
      } catch (err) {
        setPollError(err.message)
      }
    }

    doPoll()
    pollTimer.current = setInterval(doPoll, POLL_INTERVAL_MS)

    timeoutTimer.current = setTimeout(() => {
      stopPolling()
      setTimedOut(true)
      Sentry.captureMessage('Payment polling timeout', {
        level: 'warning',
        extra: { transactionId },
      })
    }, TIMEOUT_MS)
  }, [transactionId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => stopPolling(), [stopPolling])

  useEffect(() => {
    console.log('[Step5] payinMethod:', payinMethod)
    console.log('[Step5] payinUrl:', payinUrl)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleOpenWidget() {
    if (!payinUrl) return
    window.open(payinUrl, '_blank', 'noopener,noreferrer')
    setWidgetOpened(true)
    if (!polling && !timedOut) startPolling()
  }

  // ── Sin URL ─────────────────────────────────────────────────────────────

  if (!payinUrl) {
    return (
      <div className="flex flex-col gap-5 px-4 pb-4">
        <div className="bg-[#EF44441A] border border-[#EF444433] rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-[0.9375rem] font-bold text-[#0F172A] mb-1">
                No se pudo obtener el enlace de pago
              </h3>
              <p className="text-[0.8125rem] text-[#64748B]">
                La transacción fue registrada pero el proveedor no retornó la URL.
                Contacta a soporte con tu ID de transacción.
              </p>
            </div>
          </div>
        </div>
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4">
          <p className="text-[0.75rem] text-[#64748B] mb-1">ID de transacción</p>
          <p className="text-[0.8125rem] font-mono font-semibold text-[#0F172A] break-all">
            {transactionId || '—'}
          </p>
        </div>
        <a
          href={`mailto:soporte@alyto.com?subject=URL%20de%20pago%20no%20disponible%20-%20${transactionId}`}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white border border-[#E2E8F0] text-[#0F172A] text-[0.9375rem] font-semibold no-underline hover:border-[#1D9E7533] transition-colors"
        >
          <MessageCircle size={18} className="text-[#64748B]" />
          Contactar soporte
        </a>
      </div>
    )
  }

  // ── Timeout ─────────────────────────────────────────────────────────────

  if (timedOut) {
    return (
      <div className="flex flex-col gap-5 px-4 pb-4">
        <div className="bg-[#EF44441A] border border-[#EF444433] rounded-2xl p-5 text-center">
          <AlertCircle size={32} className="text-[#EF4444] mx-auto mb-3" />
          <h3 className="text-[1rem] font-bold text-[#0F172A] mb-1">Tiempo agotado</h3>
          <p className="text-[0.8125rem] text-[#64748B]">
            No recibimos confirmación del pago en 15 minutos.
          </p>
        </div>
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4">
          <p className="text-[0.75rem] text-[#64748B] mb-1">Referencia de tu operación</p>
          <p className="text-[0.8125rem] font-mono font-semibold text-[#0F172A]">{transactionId}</p>
        </div>
        <a
          href={`mailto:soporte@alyto.com?subject=Pago%20pendiente%20${transactionId}`}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white border border-[#E2E8F0] text-[#0F172A] text-[0.9375rem] font-semibold no-underline hover:border-[#1D9E7533] transition-colors"
        >
          <MessageCircle size={18} className="text-[#64748B]" />
          Contactar soporte
        </a>
      </div>
    )
  }

  // ── Principal ────────────────────────────────────────────────────────────

  const isFintoc = payinMethod === 'fintoc'

  return (
    <div className="flex flex-col gap-5 px-4 pb-4">

      <div>
        <h2 className="text-[1.125rem] font-bold text-[#0F172A]">Completa tu pago</h2>
        <p className="text-[0.8125rem] text-[#64748B] mt-0.5">
          {isFintoc
            ? 'Se abrirá una nueva ventana para que autorices la transferencia desde tu banco.'
            : 'Se abrirá la ventana de pago de tu proveedor.'}
        </p>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-4 text-3xl">
          🏦
        </div>
        <h3 className="text-[1rem] font-semibold text-[#0F172A] mb-1">
          {isFintoc ? 'Fintoc — Pago bancario directo' : 'Widget de pago'}
        </h3>
        <p className="text-[0.8125rem] text-[#64748B] mb-4">
          {isFintoc
            ? 'Serás redirigido a la página de tu banco para autorizar la transferencia. Esta pantalla avanzará automáticamente al confirmar.'
            : 'Se abrirá en una nueva pestaña. Una vez que completes el pago, esta pantalla se actualizará automáticamente.'}
        </p>
        <button
          onClick={handleOpenWidget}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1D9E75] text-white font-bold text-[0.9375rem] shadow-[0_4px_20px_rgba(29,158,117,0.25)] active:scale-[0.98] transition-all"
        >
          <ExternalLink size={16} />
          {widgetOpened ? 'Abrir de nuevo' : (isFintoc ? 'Ir a pagar con mi banco →' : 'Ir a pagar')}
        </button>
      </div>

      {widgetOpened && (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="flex items-center gap-2.5">
            <Loader2 size={16} className="text-[#1D9E75] animate-spin flex-shrink-0" />
            <span className="text-[0.8125rem] text-[#64748B]">Esperando confirmación de pago...</span>
          </div>
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 w-full">
            <p className="text-[0.6875rem] text-[#94A3B8] mb-0.5">ID de transacción (para soporte)</p>
            <p className="text-[0.8125rem] font-mono font-semibold text-[#64748B]">
              {formatTransactionId(transactionId)}
            </p>
          </div>
          {pollError && <p className="text-[0.75rem] text-[#EF4444]">{pollError}</p>}
        </div>
      )}

      <p className="text-[0.6875rem] text-[#94A3B8] text-center">
        No cierres esta pantalla hasta recibir la confirmación.
        Tienes hasta 15 minutos para completar el pago.
      </p>
    </div>
  )
}
