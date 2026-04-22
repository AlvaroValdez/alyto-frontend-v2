/**
 * StepPayment.jsx — Paso 3 del flujo v1.0 (spec §2.3).
 *
 * Dos modos según payinMethod:
 *
 *   manual (SRL Bolivia)
 *     - Muestra datos bancarios de AV Finance SRL + QRs estáticos.
 *     - Comprobante OBLIGATORIO (spec §2.3). El botón "Confirmar envío"
 *       queda disabled hasta cargar archivo.
 *     - Al confirmar se crea la transacción vía POST /payments/crossborder
 *       con paymentProofBase64 adjunto.
 *
 *   fintoc / vita / url
 *     - La transacción ya fue creada en StepReview.
 *     - Se abre payinUrl en ventana nueva + polling cada 5s hasta
 *       status final.
 *
 * Ambos modos terminan redirigiendo a /transactions/:txId.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, AlertCircle, Paperclip, Upload, Clock,
  ExternalLink, MessageCircle, AlertTriangle, FileCheck2,
} from 'lucide-react'

import {
  getSRLPayinInstructions,
  initPayment,
  getTransactionStatus,
} from '../../services/paymentsService'
import Sentry from '../../services/sentry.js'

const POLL_INTERVAL_MS = 5_000
const TIMEOUT_MS       = 15 * 60 * 1000
const FINAL_STATUSES   = new Set(['payin_confirmed', 'payin_completed', 'completed', 'in_transit'])

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => {
      const result = reader.result
      resolve(typeof result === 'string' ? (result.split(',')[1] ?? '') : '')
    }
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'))
    reader.readAsDataURL(file)
  })
}

function showToast({ title, body }) {
  window.dispatchEvent(new CustomEvent('alyto:show-toast', {
    detail: { notification: { title, body } },
  }))
}

function InfoRow({ label, value, mono = false, highlight = false }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-[#E2E8F060] last:border-0">
      <span className="text-[0.75rem] text-[#94A3B8] flex-shrink-0">{label}</span>
      <span className={`text-[0.875rem] text-right break-all ${
        highlight ? 'font-bold text-[#233E58]' :
        mono      ? 'font-mono text-[#64748B]' :
                    'text-[#0F172A] font-semibold'
      }`}>
        {value}
      </span>
    </div>
  )
}

export default function StepPayment({ flowData, txId }) {
  const isManual = flowData.payinMethod === 'manual' || txId === 'manual'
  if (isManual) return <ManualPayment flowData={flowData} />
  return <WidgetPayment flowData={flowData} txId={txId} />
}

// ─── Manual (SRL Bolivia) ─────────────────────────────────────────────────────

function ManualPayment({ flowData }) {
  const navigate = useNavigate()
  const {
    quote, originAmount, beneficiaryData,
    destinationAmount, exchangeRate, usdcTransitAmount,
    corridorId,
  } = flowData

  const currency = quote?.originCurrency ?? 'BOB'

  const [instructions, setInstructions] = useState(null)
  const [loadingInstr, setLoadingInstr] = useState(true)
  const [instrError,   setInstrError]   = useState(null)

  const [proofFile,    setProofFile]    = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [uploadError,  setUploadError]  = useState(null)

  const [submitting,   setSubmitting]   = useState(false)
  const [submitError,  setSubmitError]  = useState(null)
  const proofSectionRef = useRef(null)

  useEffect(() => {
    if (!quote || !beneficiaryData) {
      navigate('/send/details', { replace: true })
      return
    }
    let cancelled = false
    getSRLPayinInstructions()
      .then(res => { if (!cancelled) setInstructions(res) })
      .catch(err => { if (!cancelled) setInstrError(err.message || 'No se pudieron cargar las instrucciones.') })
      .finally(() => { if (!cancelled) setLoadingInstr(false) })
    return () => { cancelled = true }
  }, [quote, beneficiaryData, navigate])

  const bank      = instructions ?? {}
  const staticQRs = Array.isArray(instructions?.qrImages)
    ? instructions.qrImages.filter(q => q.imageBase64)
    : []

  function handleFileChange(e) {
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

  async function handleConfirm() {
    if (!proofFile) {
      showToast({
        title: 'Falta el comprobante',
        body:  'Debes adjuntar el comprobante antes de confirmar.',
      })
      proofSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const paymentProofBase64 = await fileToBase64(proofFile)
      const res = await initPayment({
        corridorId:        corridorId ?? quote.corridorId,
        originAmount,
        payinMethod:       'manual',
        beneficiaryData,
        destinationAmount: destinationAmount ?? quote.destinationAmount ?? null,
        exchangeRate:      exchangeRate      ?? quote.exchangeRate      ?? null,
        usdcTransitAmount: usdcTransitAmount ?? quote.usdcTransitAmount ?? null,
        paymentProofBase64,
        paymentProofMimetype: proofFile.type ?? 'image/jpeg',
      })

      showToast({
        title: '¡Transferencia registrada!',
        body:  'Recibimos tu comprobante. Verificaremos tu pago en pocas horas.',
      })

      if (res?.transactionId) navigate(`/transactions/${res.transactionId}`)
      else                    navigate('/transactions')
    } catch (err) {
      const code = err?.response?.data?.code
      setSubmitError(
        code === 'PAYMENT_PROOF_REQUIRED'
          ? 'El comprobante es obligatorio. Adjúntalo e intenta nuevamente.'
          : (err?.message || 'No se pudo confirmar la transferencia.'),
      )
      Sentry.captureException?.(err, {
        tags:  { component: 'StepPayment.ManualPayment' },
        extra: { corridorId },
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingInstr) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 px-4">
        <Loader2 size={24} className="text-[#233E58] animate-spin" />
        <p className="text-[0.8125rem] text-[#64748B]">Cargando instrucciones de pago…</p>
      </div>
    )
  }

  if (instrError) {
    return (
      <div className="flex flex-col gap-4 px-4 pb-4">
        <div className="flex items-start gap-3 bg-[#EF44441A] border border-[#EF444433] rounded-2xl p-4">
          <AlertCircle size={18} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[0.875rem] font-bold text-[#0F172A]">No se pudieron cargar las instrucciones</p>
            <p className="text-[0.8125rem] text-[#64748B] mt-0.5">{instrError}</p>
          </div>
        </div>
      </div>
    )
  }

  const canConfirm = !!proofFile && !submitting

  return (
    <div className="flex flex-col gap-5 px-4 pb-4">
      <div>
        <p className="text-[0.8125rem] text-[#64748B]">
          Transfiere el monto exacto y sube el comprobante para verificar tu pago.
        </p>
      </div>

      {staticQRs.length > 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📱</span>
            <p className="text-[0.875rem] font-bold text-[#0F172A]">Paga con QR</p>
          </div>
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
          <p className="text-[0.75rem] text-[#64748B] text-center">
            Escanea desde tu app bancaria o billetera digital
          </p>
        </div>
      )}

      {staticQRs.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[#E2E8F0]" />
          <span className="text-[0.75rem] text-[#94A3B8] flex-shrink-0">O transfiere manualmente</span>
          <div className="h-px flex-1 bg-[#E2E8F0]" />
        </div>
      )}

      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[#E2E8F0]">
          <span className="text-xl">🏦</span>
          <p className="text-[0.875rem] font-bold text-[#0F172A]">Transferencia bancaria</p>
        </div>
        <div className="px-5 py-1">
          <InfoRow label="Banco"   value={bank.bankName      ?? 'Banco Bisa'} />
          <InfoRow label="Titular" value={bank.accountHolder ?? 'AV Finance SRL'} />
          <InfoRow label="Cuenta"  value={bank.accountNumber ?? '—'} mono />
          <InfoRow label="Tipo"    value={bank.accountType   ?? 'Cuenta Corriente'} />
          <InfoRow
            label="Monto"
            value={`Bs ${Number(originAmount ?? 0).toLocaleString('es-CL')} ${currency}`}
            highlight
          />
        </div>
      </div>

      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
        <Clock size={14} className="text-[#64748B] flex-shrink-0" />
        <p className="text-[0.8125rem] text-[#64748B]">
          Tu pago será verificado en{' '}
          <span className="text-[#0F172A] font-semibold">2–4 horas hábiles</span>{' '}
          una vez recibamos el comprobante.
        </p>
      </div>

      <div
        ref={proofSectionRef}
        className={`rounded-2xl overflow-hidden transition-all ${
          proofFile
            ? 'bg-white border border-[#233E5833]'
            : 'bg-[#233E580A] border-2 border-dashed border-[#233E58] animate-[pulse_2.5s_ease-in-out_infinite]'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <Paperclip size={15} className="text-[#233E58]" />
            <p className="text-[0.875rem] font-bold text-[#0F172A]">Comprobante de pago</p>
          </div>
          <span className="text-[0.625rem] font-bold px-2 py-0.5 rounded-md bg-[#F59E0B] text-white uppercase tracking-wider">
            Obligatorio
          </span>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          <p className="text-[0.8125rem] text-[#64748B]">
            Sube una foto o captura de pantalla de tu transferencia a AV Finance SRL.
            Formatos: JPG, PNG, PDF (máx 5MB).
          </p>

          {proofPreview && (
            <div className="rounded-xl overflow-hidden border border-[#E2E8F0]">
              <img
                src={proofPreview}
                alt="Vista previa del comprobante"
                className="w-full max-h-48 object-contain bg-[#F8FAFC]"
              />
            </div>
          )}

          {proofFile && !proofPreview && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <Paperclip size={14} className="text-[#64748B] flex-shrink-0" />
              <span className="text-[0.8125rem] text-[#64748B] truncate">{proofFile.name}</span>
            </div>
          )}

          <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-dashed border-[#94A3B8] text-[0.875rem] text-[#64748B] hover:text-[#233E58] hover:border-[#233E5833] transition-colors cursor-pointer">
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

          {proofFile && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#233E581A] border border-[#233E5833]">
              <FileCheck2 size={14} className="text-[#233E58] flex-shrink-0" />
              <span className="text-[0.8125rem] text-[#233E58] font-medium truncate">
                Comprobante adjuntado: {proofFile.name}
              </span>
            </div>
          )}

          {uploadError && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
              <AlertCircle size={13} className="text-[#F87171] flex-shrink-0" />
              <p className="text-[0.8125rem] text-[#F87171]">{uploadError}</p>
            </div>
          )}
        </div>
      </div>

      {!proofFile && (
        <div className="flex items-start gap-2.5 px-4 py-3.5 rounded-2xl bg-[#F59E0B0F] border border-[#F59E0B33]">
          <AlertTriangle size={16} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[0.8125rem] font-semibold text-[#0F172A] leading-tight">
              Debes adjuntar el comprobante de pago
            </p>
            <p className="text-[0.75rem] text-[#64748B] mt-0.5">
              Sin el comprobante no podemos verificar tu transferencia bancaria.
            </p>
          </div>
        </div>
      )}

      {submitError && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
          <AlertCircle size={14} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
          <p className="text-[0.8125rem] text-[#EF4444]">{submitError}</p>
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={!canConfirm}
        className="w-full py-4 rounded-2xl text-[0.9375rem] font-bold flex items-center justify-center gap-2 transition-all"
        style={{
          background: canConfirm ? '#233E58' : '#E2E8F0',
          color:      canConfirm ? '#FFFFFF' : '#94A3B8',
          boxShadow:  canConfirm ? '0 4px 20px rgba(35,62,88,0.25)' : 'none',
          cursor:     canConfirm ? 'pointer' : 'not-allowed',
        }}
      >
        {submitting
          ? <><Loader2 size={16} className="animate-spin" /> Enviando…</>
          : 'Confirmar envío'}
      </button>
    </div>
  )
}

// ─── Widget (Fintoc / Vita / url) ─────────────────────────────────────────────

function WidgetPayment({ flowData, txId }) {
  const navigate = useNavigate()
  const { payinUrl, payinMethod } = flowData
  const transactionId = flowData.transactionId ?? txId

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
    if (!transactionId) return
    setPolling(true)
    const doPoll = async () => {
      try {
        const data = await getTransactionStatus(transactionId)
        if (FINAL_STATUSES.has(data.status)) {
          stopPolling()
          navigate(`/transactions/${transactionId}`)
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
      Sentry.captureMessage?.('Payment polling timeout', {
        level: 'warning',
        extra: { transactionId },
      })
    }, TIMEOUT_MS)
  }, [transactionId, stopPolling, navigate])

  useEffect(() => () => stopPolling(), [stopPolling])

  function handleOpenWidget() {
    if (!payinUrl) return
    window.open(payinUrl, '_blank', 'noopener,noreferrer')
    setWidgetOpened(true)
    if (!polling && !timedOut) startPolling()
  }

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
          href={`mailto:soporte@alyto.app?subject=URL%20de%20pago%20no%20disponible%20-%20${transactionId}`}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white border border-[#E2E8F0] text-[#0F172A] text-[0.9375rem] font-semibold no-underline hover:border-[#233E5833] transition-colors"
        >
          <MessageCircle size={18} className="text-[#64748B]" />
          Contactar soporte
        </a>
      </div>
    )
  }

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
        <a
          href={`mailto:soporte@alyto.app?subject=Pago%20pendiente%20${transactionId}`}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-white border border-[#E2E8F0] text-[#0F172A] text-[0.9375rem] font-semibold no-underline hover:border-[#233E5833] transition-colors"
        >
          <MessageCircle size={18} className="text-[#64748B]" />
          Contactar soporte
        </a>
      </div>
    )
  }

  const isFintoc = payinMethod === 'fintoc'

  return (
    <div className="flex flex-col gap-5 px-4 pb-4">
      <div>
        <p className="text-[0.8125rem] text-[#64748B]">
          {isFintoc
            ? 'Se abrirá una nueva ventana para autorizar la transferencia desde tu banco.'
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
            ? 'Serás redirigido a tu banco. Esta pantalla avanzará automáticamente al confirmar.'
            : 'Se abrirá en una nueva pestaña. Al completar el pago, esta pantalla se actualizará.'}
        </p>
        <button
          onClick={handleOpenWidget}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#233E58] text-white font-bold text-[0.9375rem] shadow-[0_4px_20px_rgba(35,62,88,0.25)] active:scale-[0.98] transition-all"
        >
          <ExternalLink size={16} />
          {widgetOpened ? 'Abrir de nuevo' : (isFintoc ? 'Ir a pagar con mi banco' : 'Ir a pagar')}
        </button>
      </div>

      {widgetOpened && (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="flex items-center gap-2.5">
            <Loader2 size={16} className="text-[#233E58] animate-spin flex-shrink-0" />
            <span className="text-[0.8125rem] text-[#64748B]">Esperando confirmación de pago…</span>
          </div>
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2.5 w-full">
            <p className="text-[0.6875rem] text-[#94A3B8] mb-0.5">ID de transacción (para soporte)</p>
            <p className="text-[0.8125rem] font-mono font-semibold text-[#64748B]">
              {transactionId || '—'}
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
