/**
 * StepReview.jsx — Paso 2 del flujo v1.0 (spec §2.2).
 *
 * Vista colapsada por defecto con "Ver detalles" para expandir el desglose.
 * Reglas del spec §2.2:
 *   - NO exponer "tasa de mercado"; solo la tasa efectiva aplicada.
 *   - NO mencionar USDC, Stellar, Vita ni corridor IDs.
 *   - Fee mostrada en moneda origen + equivalente USD.
 *   - Botones: [Editar] vuelve a /send/details, [Confirmar] crea la tx
 *     y avanza a /send/payment/:txId.
 *
 * Confirmar SIEMPRE llama a POST /payments/crossborder. El backend crea la
 * transacción en status: payin_pending sin comprobante; el comprobante se
 * sube en Step 3 vía POST /payments/:txId/comprobante (spec §2.3).
 *
 * El proveedor de payin determina solo qué renderiza Step 3:
 *   - manual (SRL Bolivia)  → instrucciones bancarias + upload comprobante.
 *   - fintoc / vita / …     → widget externo + polling de estado.
 */

import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2, AlertCircle, ChevronDown, ChevronUp, Pencil, ArrowRight,
} from 'lucide-react'

import { useAuth }        from '../../context/AuthContext'
import { initPayment }    from '../../services/paymentsService'
import { getDeliveryTime } from '../../utils/deliveryTime'

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

function maskAccount(accountNumber) {
  if (!accountNumber) return '—'
  const s = String(accountNumber)
  return s.length <= 4 ? s : `****${s.slice(-4)}`
}

function fmtMoney(n, currency) {
  if (n === null || n === undefined) return '—'
  return `${Number(n).toLocaleString('es-CL')} ${currency}`
}

export default function StepReview({ flowData, updateFlow }) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const { quote, originAmount, destinationCountry, beneficiaryData, payinMethod } = flowData

  const [expanded, setExpanded]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]         = useState(null)
  const submittingRef = useRef(false)

  useEffect(() => {
    if (!quote || !beneficiaryData || !destinationCountry) {
      navigate('/send/details', { replace: true })
    }
  }, [quote, beneficiaryData, destinationCountry, navigate])

  if (!quote || !beneficiaryData) return null

  const originCurrency = quote.originCurrency
    ?? ENTITY_ORIGIN_CURRENCY[user?.legalEntity]
    ?? 'USD'

  const fees = quote.fees || {}
  const costoEnvio =
    (fees.alytoCSpread || 0) +
    (fees.fixedFee     || 0) +
    (fees.payinFee     || 0) +
    (fees.payoutFee    || 0)

  // USD equivalent per spec §2.2 (fee shown in origin currency AND USD)
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
      if (!newTxId) {
        throw new Error('El servidor no devolvió el ID de transacción.')
      }
      sessionStorage.setItem('lastTransactionId', newTxId)
      updateFlow({
        transactionId:       newTxId,
        payinUrl:            res.payinUrl || res.widgetUrl || res.widgetToken || null,
        paymentInstructions: res.paymentInstructions || null,
      })
      navigate(`/send/payment/${newTxId}`)
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

      {/* De ti */}
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

      {/* Para beneficiario — nombre destacado (spec §2.2 prominencia) */}
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

      {/* Llega en */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
        <span className="text-[0.8125rem] text-[#64748B]">⏱ Llega en</span>
        <span className="text-[0.8125rem] font-semibold text-[#0F172A]">{deliveryText}</span>
      </div>

      {/* Ver detalles */}
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
          onClick={() => navigate('/send/details')}
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
