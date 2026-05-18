/**
 * Step4Confirm.jsx — Resumen de confirmación antes de iniciar el pago.
 *
 * Muestra fees visibles (alytoCSpread + fixedFee + payinFee).
 * NO muestra profitRetention.
 * Llama POST /payments/crossborder al confirmar.
 */

import { useState, useEffect, useRef } from 'react'
import { Loader2, AlertCircle, ChevronDown, ChevronUp, Clock, RefreshCw, Info, CheckCircle2 } from 'lucide-react'
import { initPayment, fetchHarborQuote, getQuote } from '../../services/paymentsService'
import { useAuth } from '../../context/AuthContext'
import Sentry from '../../services/sentry.js'

// Tiempo máximo que consideramos válida una cotización si no viene quoteExpiresAt
const QUOTE_MAX_AGE_MS = 4 * 60 * 1000  // 4 minutos

function formatCountdown(secs) {
  if (!secs || secs <= 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const ENTITY_ORIGIN_CURRENCY = { SpA: 'CLP', LLC: 'USD', SRL: 'BOB' }

const COUNTRY_NAMES = {
  CO: 'Colombia',       PE: 'Perú',     BO: 'Bolivia',
  AR: 'Argentina',      MX: 'México',   BR: 'Brasil',
  US: 'Estados Unidos', EC: 'Ecuador',  VE: 'Venezuela',
  PY: 'Paraguay',       UY: 'Uruguay',
}

function maskAccount(accountNumber) {
  if (!accountNumber) return '—'
  const s = String(accountNumber)
  return `****${s.slice(-4)}`
}

const PIX_KEY_TYPE_LABELS = {
  cpf: 'CPF', email: 'Email', phone: 'Teléfono celular',
  random: 'Chave aleatória', account: 'Cuenta bancaria',
}

function BeneficiaryRows({ beneficiary = {}, destinationCountry }) {
  const get = (key) => beneficiary[key] ?? null

  const bankName = get('bank_name') || get('bankName') || get('bank_code') || null

  switch (destinationCountry) {
    case 'BR': {
      const pixType  = get('pix_key_type')
      const pixKey   = get('br_pix_key')
      return (
        <>
          {pixType && <Row label="Tipo de chave PIX" value={PIX_KEY_TYPE_LABELS[pixType] ?? pixType} />}
          {pixKey  && <Row label="Chave PIX" value={pixKey} />}
          {bankName && <Row label="Banco" value={bankName} />}
        </>
      )
    }
    case 'MX': {
      const clabe = get('mx_clabe')
      return (
        <>
          {clabe    && <Row label="CLABE" value={maskAccount(clabe)} />}
          {bankName && <Row label="Banco" value={bankName} />}
        </>
      )
    }
    case 'GB': {
      const sortCode  = get('sort_code')
      const acctNum   = get('account_number')
      return (
        <>
          {sortCode && <Row label="Sort Code" value={sortCode} />}
          {acctNum  && <Row label="Cuenta" value={maskAccount(acctNum)} />}
          {bankName && <Row label="Banco" value={bankName} />}
        </>
      )
    }
    case 'US': {
      const routing  = get('routing_number')
      const acctNum  = get('account_number')
      const acctType = get('account_type')
      return (
        <>
          {routing  && <Row label="Routing (ABA)" value={maskAccount(routing)} />}
          {acctNum  && <Row label="Cuenta" value={maskAccount(acctNum)} />}
          {acctType && <Row label="Tipo de cuenta" value={acctType === 'checking' ? 'Checking' : 'Savings'} />}
          {bankName && <Row label="Banco" value={bankName} />}
        </>
      )
    }
    case 'AE': {
      const iban = get('iban') || get('account_number')
      return (
        <>
          {iban     && <Row label="IBAN" value={maskAccount(iban)} />}
          {bankName && <Row label="Banco" value={bankName} />}
        </>
      )
    }
    case 'SG':
    case 'JP':
    case 'HK': {
      const acctNum   = get('account_number')
      const swiftCode = get('swift_code')
      return (
        <>
          {acctNum   && <Row label="Cuenta" value={maskAccount(acctNum)} />}
          {swiftCode && <Row label="SWIFT / BIC" value={swiftCode} />}
          {bankName  && <Row label="Banco" value={bankName} />}
        </>
      )
    }
    default: {
      const acctNum   = get('account_number') || get('accountNumber') || get('account_bank')
      const swiftCode = get('swift_code')
      const docType   = get('documentType') || get('beneficiary_document_type') || ''
      const docId     = get('documentId')   || get('beneficiary_document_number') || get('document_number')
      return (
        <>
          {bankName  && <Row label="Banco" value={bankName} />}
          {acctNum   && <Row label="Cuenta" value={maskAccount(acctNum)} />}
          {swiftCode && <Row label="SWIFT / BIC" value={swiftCode} />}
          {docId     && <Row label="Documento" value={`${docType} ${docId}`.trim()} />}
        </>
      )
    }
  }
}

function Row({ label, value, valueClass = 'text-[#0D1F3C] text-[0.9375rem]' }) {
  return (
    <div className="flex justify-between items-center py-2.5">
      <span className="text-[0.8125rem] text-[#4A5568]">{label}</span>
      <span className={`font-semibold ${valueClass}`}>{value}</span>
    </div>
  )
}

export default function Step4Confirm({ stepData, onNext, onRefreshQuote }) {
  const { user } = useAuth()

  const [confirmed, setConfirmed]   = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [feesExpanded, setFeesExpanded] = useState(false)
  const [quoteSecsLeft, setQuoteSecsLeft] = useState(null)

  const [liveQuote, setLiveQuote]       = useState(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError]     = useState(null)
  const quoteFetchedRef                 = useRef(false)

  // Modal que aparece cuando la tasa varió >0.5% al momento de confirmar
  const [rateModal, setRateModal] = useState(null) // { freshQuote, rateDiff } | null

  // Step3 guarda los datos bajo la key "beneficiaryData" (campos dinámicos de Vita)
  const {
    quote, originAmount, destinationCountry, payinMethod,
    beneficiaryData, contactId,
    owlPayMethod, harborQuoteId,
    quoteFetchedAt,
  } = stepData

  // ── Countdown de expiración de cotización ──────────────────────────────────
  const quoteExpiry = quote?.quoteExpiresAt
    ? new Date(quote.quoteExpiresAt).getTime()
    : quoteFetchedAt
      ? quoteFetchedAt + QUOTE_MAX_AGE_MS
      : null

  useEffect(() => {
    if (!quoteExpiry) return
    const tick = () => {
      const secs = Math.max(0, Math.floor((quoteExpiry - Date.now()) / 1000))
      setQuoteSecsLeft(secs)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [quoteExpiry])

  const quoteExpired = quoteSecsLeft !== null && quoteSecsLeft === 0
  const quoteWarning = quoteSecsLeft !== null && quoteSecsLeft > 0 && quoteSecsLeft <= 60

  // ── Fetch Harbor rate real al montar — solo para corredores owlPay ─────────
  useEffect(() => {
    if (quote?.payoutMethod !== 'owlPay') return
    if (!quote?.corridorId || !originAmount)   return
    if (quoteFetchedRef.current)               return
    quoteFetchedRef.current = true

    const ctrl = new AbortController()
    setQuoteLoading(true)
    setQuoteError(null)

    fetchHarborQuote(quote.corridorId, originAmount, ctrl.signal)
      .then(fresh => {
        const freshDest     = fresh?.destinationAmount ?? 0
        const estimatedDest = quote?.destinationAmount ?? 0
        if (freshDest > 0) {
          setLiveQuote(fresh)
          if (estimatedDest > 0 && Math.abs(freshDest - estimatedDest) / estimatedDest > 0.005) {
            console.info('[Step4] Harbor quote difiere del WS estimado:', {
              estimated: estimatedDest,
              harbor:    freshDest,
              diff:      ((freshDest - estimatedDest) / estimatedDest * 100).toFixed(2) + '%',
            })
          }
        }
      })
      .catch(err => {
        if (err?.name === 'AbortError') return
        console.warn('[Step4] Harbor quote falló — usando estimado WS:', err.message)
        setQuoteError('Tasa referencial — se confirmará al procesar')
      })
      .finally(() => setQuoteLoading(false))

    return () => ctrl.abort()
  }, []) // Solo al montar

  const originCurrency = quote?.originCurrency
    ?? ENTITY_ORIGIN_CURRENCY[user?.legalEntity]
    ?? 'CLP'
  // Alias de compatibilidad — puede llegar como "beneficiary" (legado) o "beneficiaryData" (nuevo)
  const beneficiary = beneficiaryData ?? stepData.beneficiary ?? {}
  const fees = quote?.fees || {}

  const effectiveQuote = liveQuote ?? quote
  const rateDiff = liveQuote != null && (quote?.destinationAmount ?? 0) > 0
    ? (liveQuote.destinationAmount - quote.destinationAmount) / quote.destinationAmount
    : 0
  const wasUpdated = Math.abs(rateDiff) > 0.02   // solo mostrar si cambio > 2%

  const costoEnvio =
    (fees.alytoCSpread || 0) +
    (fees.fixedFee     || 0) +
    (fees.payinFee     || 0) +
    (fees.payoutFee    || 0)

  const comisionServicio = (fees.alytoCSpread || 0) + (fees.fixedFee || 0)
  const feeProcesamiento = (fees.payinFee     || 0) + (fees.payoutFee || 0)

  const payinMethodLabel = {
    fintoc:  'Fintoc — Transferencia bancaria',
    vita:    'Vita Wallet',
    manual:  'Transferencia bancaria manual',
    owlpay:  'OwlPay Harbor',
  }[payinMethod] || payinMethod || '—'

  // Ejecuta el pago con la cotización indicada (Vita fresca, Harbor live, o estimado WS)
  async function executePayment(q) {
    setLoading(true)
    setError(null)
    try {
      const res = await initPayment({
        corridorId:        quote.corridorId,
        originAmount,
        payinMethod,
        beneficiaryData:   beneficiary,
        destinationAmount: q.destinationAmount ?? null,
        exchangeRate:      q.exchangeRate      ?? null,
        rateConfidence:    q.rateConfidence    ?? null,
        rateSource:        q.rateSource        ?? null,
        providerQuoteId:   q.providerQuoteId   ?? null,
        rateExpiresAt:     q.rateExpiresAt     ?? null,
        ...(contactId ? { contactId } : {}),
        ...((q.owlPayMethod ?? owlPayMethod) && (q.owlPayMethod ?? owlPayMethod) !== 'null'
          ? { owlPayMethod: q.owlPayMethod ?? owlPayMethod }
          : {}),
        ...(q.harborQuoteId ?? harborQuoteId ? { harborQuoteId: q.harborQuoteId ?? harborQuoteId } : {}),
      })
      if (res.transactionId) {
        sessionStorage.setItem('lastTransactionId', res.transactionId)
      }
      onNext({
        transactionId:     res.transactionId,
        payinUrl:          res.payinUrl || res.widgetUrl || res.widgetToken,
        ...(res.payinMethod ? { payinMethod: res.payinMethod } : {}),
        payinInstructions: res.paymentInstructions ?? null,
        paymentQR:         res.paymentQR           ?? null,
        paymentQRStatic:   res.paymentQRStatic     ?? [],
      })
    } catch (err) {
      Sentry.captureException(err, {
        tags:  { step: 'crossborder_init' },
        extra: { corridorId: quote?.corridorId, originAmount },
      })
      setError(err.message || 'Error al procesar el pago. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    if (!confirmed) return

    const isOwlPay = quote?.payoutMethod === 'owlPay'

    if (!isOwlPay) {
      // Opción C: re-cotizar en el momento de confirmar (corredores Vita)
      setLoading(true)
      setError(null)
      let freshQ = null
      try {
        freshQ = await getQuote(originAmount, destinationCountry)
      } catch {
        // Re-cotización falló — continuar con cotización original para no bloquear al usuario
      }

      if (freshQ) {
        const oldDest = quote?.destinationAmount ?? 0
        const newDest = freshQ.destinationAmount ?? 0
        const diff    = oldDest > 0 ? (newDest - oldDest) / oldDest : 0

        if (Math.abs(diff) > 0.005) {
          // Tasa varió >0.5% — mostrar modal de confirmación
          setLoading(false)
          setRateModal({ freshQuote: freshQ, rateDiff: diff })
          return
        }
      }

      await executePayment(freshQ ?? quote)
      return
    }

    // Harbor: usar liveQuote obtenido al montar el componente
    await executePayment(liveQuote ?? quote)
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-28">

      {/* ── Título ── */}
      <div>
        <h2 className="text-[1.125rem] font-bold text-[#0D1F3C]">Confirma el envío</h2>
        <p className="text-[0.8125rem] text-[#4A5568] mt-0.5">
          Revisa todos los detalles antes de continuar
        </p>
      </div>

      {/* ── Banner: cotización expirada ── */}
      {quoteExpired && (
        <div className="flex items-start gap-3 bg-[#EF44441A] border border-[#EF444433] rounded-2xl px-4 py-3">
          <AlertCircle size={16} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[0.875rem] font-semibold text-[#EF4444]">Cotización vencida</p>
            <p className="text-[0.75rem] text-[#EF4444] mt-0.5">
              La tasa de cambio ha expirado. Actualiza para continuar.
            </p>
          </div>
          {onRefreshQuote && (
            <button
              onClick={onRefreshQuote}
              className="flex items-center gap-1 text-[0.75rem] font-semibold text-[#EF4444] flex-shrink-0"
            >
              <RefreshCw size={13} /> Actualizar
            </button>
          )}
        </div>
      )}

      {/* ── Aviso: cotización por vencer ── */}
      {quoteWarning && (
        <div className="flex items-center gap-2.5 bg-[#F59E0B0F] border border-[#F59E0B33] rounded-xl px-3.5 py-2.5">
          <Clock size={14} className="text-[#F59E0B] flex-shrink-0" />
          <p className="text-[0.8125rem] text-[#F59E0B] flex-1">
            Cotización válida por{' '}
            <span className="font-bold font-mono">{formatCountdown(quoteSecsLeft)}</span>
          </p>
        </div>
      )}

      {/* ── Resumen financiero ── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl px-4 py-1 divide-y divide-[#E2E8F0]">

        <Row
          label="Envías"
          value={`$${Number(originAmount).toLocaleString('es-CL')} ${originCurrency}`}
          valueClass="text-[#0D1F3C] text-[0.9375rem]"
        />
        <Row
          label="Tasa aplicada"
          value={`1 ${originCurrency} = ${Number(quote?.exchangeRate || 0).toFixed(4)} ${quote?.destinationCurrency || ''}`}
          valueClass="text-[#0D1F3C] text-[0.8125rem]"
        />
        {/* Costo del envío — una sola línea con detalle opcional */}
        <div className="py-2.5">
          <button
            onClick={() => setFeesExpanded(v => !v)}
            className="w-full flex justify-between items-center"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[0.8125rem] text-[#4A5568]">Costo del envío</span>
              {feesExpanded
                ? <ChevronUp   size={13} className="text-[#94A3B8]" />
                : <ChevronDown size={13} className="text-[#94A3B8]" />
              }
            </div>
            <span className="text-[0.8125rem] font-semibold text-[#4A5568]">
              {costoEnvio > 0 ? `$${costoEnvio.toLocaleString('es-CL')} ${originCurrency}` : '—'}
            </span>
          </button>

          {feesExpanded && costoEnvio > 0 && (
            <div className="mt-2.5 space-y-1.5 pl-1">
              {comisionServicio > 0 && (
                <div className="flex justify-between">
                  <span className="text-[0.75rem] text-[#94A3B8]">· Comisión de servicio</span>
                  <span className="text-[0.75rem] text-[#94A3B8]">
                    ${comisionServicio.toLocaleString('es-CL')} {originCurrency}
                  </span>
                </div>
              )}
              {feeProcesamiento > 0 && (
                <div className="flex justify-between">
                  <span className="text-[0.75rem] text-[#94A3B8]">· Fee de procesamiento</span>
                  <span className="text-[0.75rem] text-[#94A3B8]">
                    ${feeProcesamiento.toLocaleString('es-CL')} {originCurrency}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider highlight */}
        <div className="py-3">
          <div className="flex justify-between items-start">
            <span className="text-[0.9375rem] font-bold text-[#0D1F3C]">Recibe</span>
            <div className="text-right">
              <div className={`flex items-baseline gap-1 justify-end ${quoteLoading ? 'opacity-50' : ''}`}>
                <span className="text-[1.125rem] font-extrabold text-[#22C55E]">
                  ~{Math.round(effectiveQuote?.destinationAmount || 0).toLocaleString('es-CL')}{' '}
                  {effectiveQuote?.destinationCurrency || ''}
                </span>
                <span className="text-[0.6875rem] font-normal" style={{ color: '#94A3B8' }}>aprox.</span>
              </div>
              <p className="text-[0.6875rem] mt-0.5" style={{ color: '#94A3B8' }}>
                El monto exacto se confirma al procesar tu pago
              </p>
            </div>
          </div>

          {quoteLoading && (
            <div className="flex justify-end mt-1">
              <span className="text-[0.6875rem] text-[#94A3B8] flex items-center gap-1">
                <Loader2 size={11} className="animate-spin" />
                Verificando tasa Harbor...
              </span>
            </div>
          )}

          {wasUpdated && !quoteLoading && (
            <div className="flex items-start gap-1.5 mt-2 p-2.5 rounded-xl"
              style={{ background: '#F59E0B1A', border: '1px solid #F59E0B33' }}>
              <Info size={13} className="mt-0.5 flex-shrink-0" style={{ color: '#F59E0B' }} />
              <div>
                <p className="text-[0.75rem] font-medium" style={{ color: '#92400E' }}>
                  Tasa actualizada ({rateDiff > 0 ? '+' : ''}{(rateDiff * 100).toFixed(1)}% desde tu cotización)
                </p>
                <p className="text-[0.7rem] mt-0.5" style={{ color: '#A16207' }}>
                  El monto que ves arriba ya refleja la tasa vigente — es lo que recibirá el beneficiario.
                </p>
              </div>
            </div>
          )}

          {effectiveQuote?.rateExpiresAt && quoteSecsLeft !== 0 && !quoteLoading && (
            <p className="text-[0.7rem] mt-1.5 flex items-center gap-1" style={{ color: '#94A3B8' }}>
              <Clock size={11} />
              Tasa válida por {formatCountdown(quoteSecsLeft)} · Se reconfirma al procesar tu pago
            </p>
          )}

          {quoteSecsLeft === 0 && (
            <p className="text-[0.7rem] mt-1.5" style={{ color: '#F59E0B' }}>
              ⏱ La tasa se reconfirmará al momento de procesar tu pago
            </p>
          )}

          <div className="flex justify-between items-center mt-1">
            <span className="text-[0.75rem] text-[#94A3B8]">Tiempo estimado</span>
            <span className="text-[0.75rem] text-[#4A5568]">
              {effectiveQuote?.estimatedDelivery || quote?.estimatedDelivery || '1 día hábil'}
            </span>
          </div>

          {/* ── Disclaimer de confianza de la tasa ── */}
          {effectiveQuote?.rateConfidence === 'exact' ? (
            <div className="flex items-center gap-1.5 mt-2">
              <CheckCircle2 size={12} className="text-[#22C55E] flex-shrink-0" />
              <span className="text-[0.6875rem] font-medium text-[#22C55E]">
                Tasa garantizada
              </span>
            </div>
          ) : quoteError ? (
            <div className="flex items-center gap-1.5 mt-2">
              <Info size={12} className="text-[#F59E0B] flex-shrink-0" />
              <span className="text-[0.6875rem] text-[#F59E0B]">{quoteError}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-2">
              <Info size={12} className="text-[#94A3B8] flex-shrink-0" />
              <span className="text-[0.6875rem] text-[#94A3B8]">
                Monto referencial · Se confirma al procesar tu envío
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Datos del beneficiario ── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl px-4 py-1 divide-y divide-[#E2E8F0]">
        <Row
          label="Beneficiario"
          value={
            beneficiary?.fullName ||
            beneficiary?.beneficiary_name ||
            (beneficiary?.beneficiary_first_name
              ? `${beneficiary.beneficiary_first_name} ${beneficiary.beneficiary_last_name ?? ''}`.trim()
              : '—')
          }
        />
        <Row label="País" value={COUNTRY_NAMES[destinationCountry] || destinationCountry} />
        <BeneficiaryRows beneficiary={beneficiary} destinationCountry={destinationCountry} />
        <Row label="Método de pago" value={payinMethodLabel} valueClass="text-[#0D1F3C] text-[0.8125rem]" />
      </div>

      {/* ── Checkbox de confirmación ── */}
      <label className="flex items-start gap-3 cursor-pointer">
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="sr-only"
          />
          <div
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
              confirmed ? 'bg-[#0D1F3C] border-[#0D1F3C]' : 'bg-transparent border-[#E2E8F0]'
            }`}
          >
            {confirmed && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </div>
        <span className="text-[0.8125rem] text-[#4A5568] leading-relaxed">
          Confirmo que los datos del beneficiario son correctos y autorizo este pago.
        </span>
      </label>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 bg-[#EF44441A] border border-[#EF444433] rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
          <p className="text-[0.8125rem] text-[#EF4444]">{error}</p>
        </div>
      )}

      {/* ── Botón confirmar ── */}
      <button
        onClick={handleConfirm}
        disabled={!confirmed || loading || quoteLoading || quoteExpired}
        className={`w-full py-4 rounded-2xl text-[0.9375rem] font-bold transition-all duration-150 flex items-center justify-center gap-2 ${
          confirmed && !loading && !quoteLoading && !quoteExpired
            ? 'bg-[#0D1F3C] text-white shadow-[0_4px_20px_rgba(29,52,97,0.25)] active:scale-[0.98]'
            : 'bg-[#0D1F3C40] text-[#94A3B8] cursor-not-allowed'
        }`}
      >
        {(loading || quoteLoading) && <Loader2 size={18} className="animate-spin" />}
        {loading ? 'Verificando tasa...' : quoteLoading ? 'Verificando tasa...' : quoteExpired ? 'Cotización vencida' : 'Confirmar y pagar'}
      </button>

      {/* ── Modal: tasa cambió >0.5% al confirmar ── */}
      {rateModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setRateModal(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl px-5 pt-6 pb-10"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-[1rem] font-bold text-[#0D1F3C] mb-1">Tasa actualizada</h3>
            <p className="text-[0.8125rem] text-[#4A5568] mb-4">
              La tasa de cambio varió desde tu cotización inicial.
            </p>

            <div className="bg-[#F8FAFC] rounded-xl px-4 py-3 mb-5 space-y-2.5">
              <div className="flex justify-between text-[0.8125rem]">
                <span className="text-[#4A5568]">Cotización anterior</span>
                <span className="text-[#94A3B8] line-through">
                  ~{Math.round(quote?.destinationAmount ?? 0).toLocaleString('es-CL')}{' '}
                  {quote?.destinationCurrency}
                </span>
              </div>
              <div className="flex justify-between text-[0.8125rem]">
                <span className="text-[#4A5568]">Nueva cotización</span>
                <span className="font-bold text-[#0D1F3C]">
                  ~{Math.round(rateModal.freshQuote?.destinationAmount ?? 0).toLocaleString('es-CL')}{' '}
                  {rateModal.freshQuote?.destinationCurrency}
                </span>
              </div>
              <div className="flex justify-between text-[0.75rem]">
                <span className="text-[#94A3B8]">Variación</span>
                <span className={rateModal.rateDiff >= 0 ? 'text-[#22C55E] font-semibold' : 'text-[#EF4444] font-semibold'}>
                  {rateModal.rateDiff >= 0 ? '+' : ''}{(rateModal.rateDiff * 100).toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRateModal(null)}
                className="flex-1 py-3.5 rounded-2xl text-[0.875rem] font-semibold text-[#4A5568] bg-[#F1F5F9] active:scale-[0.98]"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setRateModal(null); executePayment(rateModal.freshQuote) }}
                className="flex-1 py-3.5 rounded-2xl text-[0.875rem] font-bold text-white bg-[#0D1F3C] active:scale-[0.98]"
              >
                Aceptar nueva tasa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
