// StepConfirm.jsx — Step 3 of Send Money Flow v1.1 (spec §2.3)
// Route: /send/confirm
//
// Single screen with two internal states:
//   State A (review):  summary + [Editar] + [Confirmar] — creates tx on Confirmar
//   State B (payment): bank details + proof upload (manual/SRL only)
//
// For non-manual corridors (Fintoc/SpA): after State A [Confirmar],
// navigates to /send/payment/:txId (existing WidgetPayment path).
//
// Rules:
//   - Transaction created on first [Confirmar] in State A (spec §2.3)
//   - No route change between State A and State B (spec §2.3 "same screen")
//   - Proof uploaded via POST /payments/:txId/comprobante (anti-pattern #12)
//   - broadcastToAdmins fires in uploadPaymentProof, never here

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, AlertCircle, ChevronDown, ChevronUp, Pencil, ArrowRight,
  Paperclip, Upload, Clock, AlertTriangle, FileCheck2, Copy,
} from 'lucide-react'

import { useAuth }          from '../../context/AuthContext'
import { initPayment, getSRLPayinInstructions, uploadComprobante } from '../../services/paymentsService'
import { getDeliveryTime }  from '../../utils/deliveryTime'
import Sentry               from '../../services/sentry.js'

const ENTITY_ORIGIN_CURRENCY = { SpA: 'CLP', LLC: 'USD', SRL: 'BOB' }

const COUNTRY_FLAGS = {
  CO: '🇨🇴', PE: '🇵🇪', BO: '🇧🇴', AR: '🇦🇷', MX: '🇲🇽',
  BR: '🇧🇷', US: '🇺🇸', EC: '🇪🇨', VE: '🇻🇪', PY: '🇵🇾',
  UY: '🇺🇾', CL: '🇨🇱', GT: '🇬🇹', SV: '🇸🇻', PA: '🇵🇦',
  ES: '🇪🇸', PL: '🇵🇱', GB: '🇬🇧', CA: '🇨🇦', AU: '🇦🇺',
  CN: '🇨🇳', NG: '🇳🇬', HT: '🇭🇹', DO: '🇩🇴', CR: '🇨🇷',
  HK: '🇭🇰', JP: '🇯🇵', SG: '🇸🇬', ZA: '🇿🇦', AE: '🇦🇪',
  EU: '🇪🇺', IN: '🇮🇳',
}
const COUNTRY_NAMES = {
  CO: 'Colombia', PE: 'Perú', BO: 'Bolivia', AR: 'Argentina', MX: 'México',
  BR: 'Brasil',   US: 'Estados Unidos', EC: 'Ecuador', VE: 'Venezuela',
  PY: 'Paraguay', UY: 'Uruguay', CL: 'Chile', GT: 'Guatemala',
  SV: 'El Salvador', PA: 'Panamá', ES: 'España', PL: 'Polonia',
  GB: 'Reino Unido', CA: 'Canadá', AU: 'Australia', CN: 'China',
  NG: 'Nigeria', HT: 'Haití', DO: 'Rep. Dominicana', CR: 'Costa Rica',
  HK: 'Hong Kong', JP: 'Japón', SG: 'Singapur', ZA: 'Sudáfrica',
  AE: 'Emiratos Árabes', EU: 'Europa', IN: 'India',
}

function maskAccount(n) {
  if (!n) return '—'
  const s = String(n)
  return s.length <= 4 ? s : `****${s.slice(-4)}`
}

function fmtMoney(n, currency) {
  if (n === null || n === undefined) return '—'
  return `${Number(n).toLocaleString('es-CL')} ${currency}`
}

function showToast({ title, body }) {
  window.dispatchEvent(new CustomEvent('alyto:show-toast', {
    detail: { notification: { title, body } },
  }))
}

function InfoRow({ label, value, highlight = false }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-[#E2E8F060] last:border-0">
      <span className="text-[0.75rem] text-[#94A3B8] flex-shrink-0">{label}</span>
      <span className={`text-[0.875rem] text-right break-all ${
        highlight ? 'font-bold text-[#233E58]' : 'text-[#0F172A] font-semibold'
      }`}>
        {value}
      </span>
    </div>
  )
}

// ─── State A: Review ──────────────────────────────────────────────────────────

function ReviewState({ flowData, updateFlow, onConfirmed }) {
  const navigate   = useNavigate()
  const { user }   = useAuth()

  const { quote, originAmount, destinationCountry, beneficiaryData, payinMethod } = flowData

  const [expanded,   setExpanded]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState(null)
  const submittingRef = useRef(false)

  const originCurrency = quote.originCurrency
    ?? ENTITY_ORIGIN_CURRENCY[user?.legalEntity]
    ?? 'USD'

  const fees = quote.fees || {}
  const costoEnvio =
    (fees.alytoCSpread || 0) +
    (fees.fixedFee     || 0) +
    (fees.payinFee     || 0) +
    (fees.payoutFee    || 0)

  const costoUSD = quote.usdcTransitAmount && originAmount
    ? Number(costoEnvio) * (quote.usdcTransitAmount / (originAmount - costoEnvio))
    : null

  const beneficiaryName =
    beneficiaryData.fullName ||
    [beneficiaryData.beneficiary_first_name, beneficiaryData.beneficiary_last_name]
      .filter(Boolean).join(' ').trim() ||
    '—'

  const bankLabel =
    beneficiaryData.beneficiary_bank_label ||
    beneficiaryData.bank_code_label ||
    beneficiaryData.bankName ||
    beneficiaryData.beneficiary_bank ||
    beneficiaryData.bank_name ||
    null

  const accountMasked = maskAccount(
    beneficiaryData.accountNumber ||
    beneficiaryData.beneficiary_account_number ||
    beneficiaryData.account_bank,
  )

  const deliveryText = quote.estimatedDelivery
    || getDeliveryTime(destinationCountry, quote.payoutMethod)

  async function handleConfirm() {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setError(null)

    try {
      const res = await initPayment({
        corridorId:        quote.corridorId,
        originAmount,
        payinMethod,
        beneficiaryData,
        destinationAmount: quote.destinationAmount ?? null,
        exchangeRate:      quote.exchangeRate      ?? null,
        usdcTransitAmount: quote.usdcTransitAmount ?? null,
      })
      const newTxId = res.transactionId ?? res.alytoTransactionId
      if (!newTxId) throw new Error('El servidor no devolvió el ID de transacción.')

      sessionStorage.setItem('lastTransactionId', newTxId)
      updateFlow({
        transactionId:       newTxId,
        payinUrl:            res.payinUrl || res.widgetUrl || res.widgetToken || null,
        paymentInstructions: res.paymentInstructions || res.payinInstructions || null,
        ...(res.payinMethod ? { payinMethod: res.payinMethod } : {}),
      })

      const resolvedPayinMethod = res.payinMethod ?? payinMethod
      const isManual = resolvedPayinMethod === 'manual' ||
        (!res.payinUrl && !res.widgetUrl && (res.paymentInstructions || res.payinInstructions))

      if (isManual) {
        onConfirmed(newTxId)
      } else {
        navigate(`/send/payment/${newTxId}`)
      }
    } catch (err) {
      setError(err.message || 'Error al procesar el pago. Intenta nuevamente.')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">

      <div>
        <p className="text-[0.8125rem] text-[#64748B]">
          Verifica que todo esté correcto antes de confirmar.
        </p>
      </div>

      <section className="bg-white border border-[#E2E8F0] rounded-2xl p-4">
        <p className="text-[0.6875rem] font-semibold text-[#94A3B8] uppercase tracking-wide mb-2">
          De ti
        </p>
        <p className="text-[0.9375rem] font-semibold text-[#0F172A]">
          {user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || '—'}
        </p>
        <p className="text-[0.8125rem] text-[#64748B] mt-0.5">
          Envías: <span className="font-semibold text-[#0F172A]">
            {fmtMoney(originAmount, originCurrency)}
          </span>
        </p>
      </section>

      <section className="bg-white border border-[#E2E8F0] rounded-2xl p-4">
        <p className="text-[0.6875rem] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5">
          Beneficiario
        </p>
        <h3 className="text-[1.125rem] font-extrabold text-[#0F172A] leading-tight break-words">
          {beneficiaryName}
        </h3>
        <p className="text-[0.8125rem] font-medium text-[#0F172A] mt-2 flex items-center gap-1.5">
          <span>{COUNTRY_FLAGS[destinationCountry] ?? '🌎'}</span>
          <span>{COUNTRY_NAMES[destinationCountry] ?? destinationCountry}</span>
        </p>
        {bankLabel && (
          <p className="text-[0.8125rem] text-[#64748B] mt-0.5">
            {bankLabel}{accountMasked !== '—' ? ` · ${accountMasked}` : ''}
          </p>
        )}
        <p className="text-[0.8125rem] text-[#64748B] mt-2">
          Recibe: <span className="font-extrabold text-[#233E58] text-[1rem]">
            {fmtMoney(quote.destinationAmount, quote.destinationCurrency)}
          </span>
        </p>
      </section>

      <div className="flex items-center justify-between px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
        <span className="text-[0.8125rem] text-[#64748B]">⏱ Llega en</span>
        <span className="text-[0.8125rem] font-semibold text-[#0F172A]">{deliveryText}</span>
      </div>

      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-[#E2E8F0] rounded-xl transition-colors hover:border-[#233E5833]"
      >
        <span className="text-[0.8125rem] font-semibold text-[#233E58]">
          {expanded ? 'Ocultar detalles' : 'Ver detalles'}
        </span>
        {expanded
          ? <ChevronUp   size={14} className="text-[#233E58]" />
          : <ChevronDown size={14} className="text-[#233E58]" />
        }
      </button>

      {expanded && (
        <section className="bg-white border border-[#E2E8F0] rounded-2xl p-4 space-y-2.5">
          <div className="flex justify-between">
            <span className="text-[0.8125rem] text-[#64748B]">Envías</span>
            <span className="text-[0.8125rem] font-semibold text-[#0F172A]">
              {fmtMoney(originAmount, originCurrency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[0.8125rem] text-[#64748B]">Comisión Alyto</span>
            <span className="text-[0.8125rem] font-semibold text-[#0F172A]">
              {fmtMoney(costoEnvio, originCurrency)}
              {costoUSD ? (
                <span className="ml-1 text-[0.75rem] font-normal text-[#94A3B8]">
                  (${costoUSD.toFixed(2)} USD)
                </span>
              ) : null}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[0.8125rem] text-[#64748B]">Tasa aplicada</span>
            <span className="text-[0.8125rem] font-semibold text-[#0F172A]">
              1 {originCurrency} = {Number(quote.exchangeRate || 0).toFixed(4)} {quote.destinationCurrency}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[0.8125rem] text-[#64748B]">Beneficiario recibe</span>
            <span className="text-[0.8125rem] font-extrabold text-[#233E58]">
              {fmtMoney(quote.destinationAmount, quote.destinationCurrency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[0.8125rem] text-[#64748B]">Tiempo estimado</span>
            <span className="text-[0.8125rem] font-semibold text-[#0F172A]">{deliveryText}</span>
          </div>
        </section>
      )}

      {error && (
        <div className="flex items-start gap-2.5 bg-[#EF44441A] border border-[#EF444433] rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
          <p className="text-[0.8125rem] text-[#EF4444]">{error}</p>
        </div>
      )}

      <div className="flex gap-3 mt-2">
        <button
          onClick={() => navigate('/send/beneficiary')}
          disabled={submitting}
          className="flex-1 py-4 rounded-2xl text-[0.9375rem] font-semibold bg-white border border-[#E2E8F0] text-[#0F172A] hover:border-[#233E5833] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Pencil size={15} />
          Editar
        </button>
        <button
          onClick={handleConfirm}
          disabled={submitting}
          className={`flex-1 py-4 rounded-2xl text-[0.9375rem] font-bold transition-all duration-150 flex items-center justify-center gap-2 ${
            submitting
              ? 'bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
              : 'bg-[#233E58] text-white shadow-[0_4px_20px_rgba(35,62,88,0.25)] active:scale-[0.98]'
          }`}
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={15} />}
          {submitting ? 'Procesando…' : 'Confirmar'}
        </button>
      </div>
    </div>
  )
}

// ─── State B: Manual payment + proof upload (SRL Bolivia) ─────────────────────

function PaymentState({ flowData, txId }) {
  const navigate = useNavigate()
  const { quote, originAmount } = flowData

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
    let cancelled = false
    getSRLPayinInstructions()
      .then(res => { if (!cancelled) setInstructions(res) })
      .catch(err => { if (!cancelled) setInstrError(err.message || 'No se pudieron cargar las instrucciones.') })
      .finally(() => { if (!cancelled) setLoadingInstr(false) })
    return () => { cancelled = true }
  }, [])

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
      showToast({ title: 'Falta el comprobante', body: 'Debes adjuntar el comprobante antes de confirmar.' })
      proofSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (!txId) {
      setSubmitError('No se pudo identificar la transacción. Vuelve atrás y reintenta.')
      return
    }
    if (submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await uploadComprobante(txId, proofFile)
      showToast({ title: '¡Comprobante recibido!', body: 'Verificaremos tu transferencia en pocas horas.' })
      navigate(`/transactions/${txId}`)
    } catch (err) {
      setSubmitError(err?.message || 'No se pudo subir el comprobante. Intenta nuevamente.')
      Sentry.captureException?.(err, {
        tags:  { component: 'StepConfirm.PaymentState' },
        extra: { txId },
      })
    } finally {
      setSubmitting(false)
    }
  }

  function copyToClipboard(value) {
    if (!value) return
    try {
      navigator.clipboard?.writeText(String(value))
      showToast({ title: 'Copiado', body: String(value) })
    } catch { /* silent */ }
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

      <div className="flex items-center gap-2.5 px-4 py-3 bg-[#233E581A] border border-[#233E5833] rounded-xl">
        <span className="text-base flex-shrink-0">✓</span>
        <div>
          <p className="text-[0.8125rem] font-bold text-[#233E58]">Transferencia creada</p>
          {txId && (
            <p className="text-[0.75rem] text-[#64748B] font-mono mt-0.5">{txId}</p>
          )}
        </div>
      </div>

      <p className="text-[0.8125rem] text-[#64748B]">
        Transfiere el monto exacto a la cuenta de AV Finance SRL y sube el comprobante.
      </p>

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
          <InfoRow label="Banco"    value={bank.bankName      ?? 'Banco Bisa'} />
          <InfoRow label="Titular"  value={bank.accountHolder ?? 'AV Finance SRL'} />
          <InfoRow
            label="Cuenta"
            value={
              <span className="inline-flex items-center gap-1.5">
                <span className="font-mono">{bank.accountNumber ?? '—'}</span>
                {bank.accountNumber && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(bank.accountNumber)}
                    className="text-[#233E58] hover:text-[#0F172A]"
                    aria-label="Copiar cuenta"
                  >
                    <Copy size={12} />
                  </button>
                )}
              </span>
            }
          />
          <InfoRow label="Tipo"     value={bank.accountType   ?? 'Cuenta Corriente'} />
          <InfoRow
            label="Monto"
            value={`${Number(originAmount ?? 0).toLocaleString('es-CL')} ${currency}`}
            highlight
          />
          {txId && (
            <InfoRow
              label="Referencia"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-mono">{txId}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(txId)}
                    className="text-[#233E58] hover:text-[#0F172A]"
                    aria-label="Copiar referencia"
                  >
                    <Copy size={12} />
                  </button>
                </span>
              }
            />
          )}
        </div>
        {txId && (
          <p className="px-5 pb-3 text-[0.75rem] text-[#64748B]">
            Usa la referencia en la descripción de tu transferencia bancaria.
          </p>
        )}
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

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export default function StepConfirm({ flowData, updateFlow }) {
  const navigate = useNavigate()

  const [internalState, setInternalState] = useState('review') // 'review' | 'payment'
  const [confirmedTxId, setConfirmedTxId] = useState(null)

  useEffect(() => {
    if (!flowData.quote || !flowData.beneficiaryData || !flowData.destinationCountry) {
      navigate('/send/amount', { replace: true })
    }
  }, [flowData.quote, flowData.beneficiaryData, flowData.destinationCountry, navigate])

  if (!flowData.quote || !flowData.beneficiaryData) return null

  function handleConfirmed(txId) {
    setConfirmedTxId(txId)
    setInternalState('payment')
  }

  if (internalState === 'payment') {
    return (
      <PaymentState
        flowData={flowData}
        txId={confirmedTxId ?? flowData.transactionId}
      />
    )
  }

  return (
    <ReviewState
      flowData={flowData}
      updateFlow={updateFlow}
      onConfirmed={handleConfirmed}
    />
  )
}
