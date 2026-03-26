/**
 * Step4Confirm.jsx — Resumen de confirmación antes de iniciar el pago.
 *
 * Muestra fees visibles (alytoCSpread + fixedFee + payinFee).
 * NO muestra profitRetention.
 * Llama POST /payments/crossborder al confirmar.
 */

import { useState } from 'react'
import { Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { initPayment } from '../../services/paymentsService'
import { useAuth } from '../../context/AuthContext'

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

function Row({ label, value, valueClass = 'text-white text-[0.9375rem]' }) {
  return (
    <div className="flex justify-between items-center py-2.5">
      <span className="text-[0.8125rem] text-[#8A96B8]">{label}</span>
      <span className={`font-semibold ${valueClass}`}>{value}</span>
    </div>
  )
}

export default function Step4Confirm({ stepData, onNext }) {
  const { user } = useAuth()

  const [confirmed, setConfirmed]   = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [feesExpanded, setFeesExpanded] = useState(false)

  // Step3 guarda los datos bajo la key "beneficiaryData" (campos dinámicos de Vita)
  const { quote, originAmount, destinationCountry, payinMethod, beneficiaryData } = stepData

  const originCurrency = quote?.originCurrency
    ?? ENTITY_ORIGIN_CURRENCY[user?.legalEntity]
    ?? 'CLP'
  // Alias de compatibilidad — puede llegar como "beneficiary" (legado) o "beneficiaryData" (nuevo)
  const beneficiary = beneficiaryData ?? stepData.beneficiary ?? {}
  console.log('[Step4] beneficiary recibido:', JSON.stringify(beneficiary))
  const fees = quote?.fees || {}

  const costoEnvio =
    (fees.alytoCSpread || 0) +
    (fees.fixedFee     || 0) +
    (fees.payinFee     || 0) +
    (fees.payoutFee    || 0)

  const comisionServicio = (fees.alytoCSpread || 0) + (fees.fixedFee || 0)
  const feeProcesamiento = (fees.payinFee     || 0) + (fees.payoutFee || 0)

  const payinMethodLabel = {
    fintoc: 'Fintoc — Transferencia bancaria',
    vita:   'Vita Wallet',
  }[payinMethod] || payinMethod

  async function handleConfirm() {
    if (!confirmed) return
    setLoading(true)
    setError(null)

    try {
      const res = await initPayment({
        corridorId:    quote.corridorId,
        originAmount,
        payinMethod,
        beneficiaryData: beneficiary,  // nombre que espera el backend
      })
      console.log('[initPayment] respuesta completa:', JSON.stringify(res))

      // Guardar transactionId para PaymentSuccessPage (destino del redirect de Fintoc)
      if (res.transactionId) {
        sessionStorage.setItem('lastTransactionId', res.transactionId)
      }

      onNext({
        transactionId: res.transactionId,
        // Algunos backends retornan widgetUrl en lugar de payinUrl (Fintoc)
        payinUrl: res.payinUrl || res.widgetUrl || res.widgetToken,
        // Solo sobreescribir payinMethod si el backend lo retorna explícitamente;
        // de lo contrario preservar el valor ya guardado en stepData (ej. 'fintoc' del skip)
        ...(res.payinMethod ? { payinMethod: res.payinMethod } : {}),
        // Instrucciones y QR para pagos manuales (Bolivia)
        payinInstructions: res.paymentInstructions ?? null,
        paymentQR:         res.paymentQR         ?? null,
        paymentQRStatic:   res.paymentQRStatic   ?? [],
      })
    } catch (err) {
      setError(err.message || 'Error al procesar el pago. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">

      {/* ── Título ── */}
      <div>
        <h2 className="text-[1.125rem] font-bold text-white">Confirma el envío</h2>
        <p className="text-[0.8125rem] text-[#8A96B8] mt-0.5">
          Revisa todos los detalles antes de continuar
        </p>
      </div>

      {/* ── Resumen financiero ── */}
      <div className="bg-[#1A2340] border border-[#263050] rounded-2xl px-4 py-1 divide-y divide-[#263050]">

        <Row
          label="Envías"
          value={`$${Number(originAmount).toLocaleString('es-CL')} ${originCurrency}`}
          valueClass="text-white text-[0.9375rem]"
        />
        <Row
          label="Tasa aplicada"
          value={`1 ${originCurrency} = ${Number(quote?.exchangeRate || 0).toFixed(4)} ${quote?.destinationCurrency || ''}`}
          valueClass="text-[#C4CBD8] text-[0.8125rem]"
        />
        {/* Costo del envío — una sola línea con detalle opcional */}
        <div className="py-2.5">
          <button
            onClick={() => setFeesExpanded(v => !v)}
            className="w-full flex justify-between items-center"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[0.8125rem] text-[#8A96B8]">Costo del envío</span>
              {feesExpanded
                ? <ChevronUp   size={13} className="text-[#4E5A7A]" />
                : <ChevronDown size={13} className="text-[#4E5A7A]" />
              }
            </div>
            <span className="text-[0.8125rem] font-semibold text-[#8A96B8]">
              {costoEnvio > 0 ? `$${costoEnvio.toLocaleString('es-CL')} CLP` : '—'}
            </span>
          </button>

          {feesExpanded && costoEnvio > 0 && (
            <div className="mt-2.5 space-y-1.5 pl-1">
              {comisionServicio > 0 && (
                <div className="flex justify-between">
                  <span className="text-[0.75rem] text-[#4E5A7A]">· Comisión de servicio</span>
                  <span className="text-[0.75rem] text-[#4E5A7A]">
                    ${comisionServicio.toLocaleString('es-CL')} CLP
                  </span>
                </div>
              )}
              {feeProcesamiento > 0 && (
                <div className="flex justify-between">
                  <span className="text-[0.75rem] text-[#4E5A7A]">· Fee de procesamiento</span>
                  <span className="text-[0.75rem] text-[#4E5A7A]">
                    ${feeProcesamiento.toLocaleString('es-CL')} CLP
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Divider highlight */}
        <div className="py-3">
          <div className="flex justify-between items-center">
            <span className="text-[0.9375rem] font-bold text-white">Recibe</span>
            <span className="text-[1.125rem] font-extrabold text-[#22C55E]">
              {Number(quote?.destinationAmount || 0).toLocaleString('es-CL')}{' '}
              {quote?.destinationCurrency || ''}
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-[0.75rem] text-[#4E5A7A]">Tiempo estimado</span>
            <span className="text-[0.75rem] text-[#8A96B8]">
              {quote?.estimatedDelivery || '1 día hábil'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Datos del beneficiario ── */}
      <div className="bg-[#1A2340] border border-[#263050] rounded-2xl px-4 py-1 divide-y divide-[#263050]">
        <Row
          label="Beneficiario"
          value={
            beneficiary?.fullName ||
            (beneficiary?.beneficiary_first_name
              ? `${beneficiary.beneficiary_first_name} ${beneficiary.beneficiary_last_name ?? ''}`.trim()
              : '—')
          }
        />
        <Row label="País" value={COUNTRY_NAMES[destinationCountry] || destinationCountry} />
        <Row
          label="Banco"
          value={
            beneficiary?.bankName ||
            beneficiary?.bank_name ||
            beneficiary?.bank_code ||
            '—'
          }
        />
        {(beneficiary?.accountNumber || beneficiary?.account_bank) && (
          <Row
            label="Cuenta"
            value={maskAccount(beneficiary.accountNumber ?? beneficiary.account_bank)}
          />
        )}
        {(beneficiary?.documentId || beneficiary?.beneficiary_document_number) && (
          <Row
            label="Documento"
            value={`${beneficiary?.documentType ?? beneficiary?.beneficiary_document_type ?? ''} ${beneficiary?.documentId ?? beneficiary?.beneficiary_document_number}`.trim()}
          />
        )}
        <Row label="Método de pago" value={payinMethodLabel} valueClass="text-[#C4CBD8] text-[0.8125rem]" />
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
              confirmed ? 'bg-[#C4CBD8] border-[#C4CBD8]' : 'bg-transparent border-[#263050]'
            }`}
          >
            {confirmed && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="#0F1628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </div>
        <span className="text-[0.8125rem] text-[#8A96B8] leading-relaxed">
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
        disabled={!confirmed || loading}
        className={`w-full py-4 rounded-2xl text-[0.9375rem] font-bold transition-all duration-150 flex items-center justify-center gap-2 ${
          confirmed && !loading
            ? 'bg-[#C4CBD8] text-[#0F1628] shadow-[0_4px_20px_rgba(196,203,216,0.3)] active:scale-[0.98]'
            : 'bg-[#C4CBD840] text-[#4E5A7A] cursor-not-allowed'
        }`}
      >
        {loading && <Loader2 size={18} className="animate-spin" />}
        {loading ? 'Procesando...' : 'Confirmar y pagar'}
      </button>
    </div>
  )
}
