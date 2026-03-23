/**
 * Step1Amount.jsx — "¿Cuánto envías y a dónde?"
 *
 * - Input numérico en CLP con separador de miles
 * - Select de país destino (11 países Vita) con banderas
 * - Cotización en tiempo real vía WebSocket (useQuoteSocket)
 * - Desglose de fees colapsable
 * - Contador regresivo de la cotización
 * - Indicadores de estado: En vivo / Actualizando / Desconectado / Error / Caducado
 * - Corredores no disponibles → badge "Próximamente"
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp, Clock, AlertCircle, RefreshCw, WifiOff, Loader2 } from 'lucide-react'
import { useQuoteSocket } from '../../hooks/useQuoteSocket'

const DESTINATION_COUNTRIES = [
  { code: 'CO', name: 'Colombia',        currency: 'COP', flag: '🇨🇴' },
  { code: 'PE', name: 'Perú',            currency: 'PEN', flag: '🇵🇪' },
  { code: 'BO', name: 'Bolivia',         currency: 'BOB', flag: '🇧🇴' },
  { code: 'AR', name: 'Argentina',       currency: 'ARS', flag: '🇦🇷' },
  { code: 'MX', name: 'México',          currency: 'MXN', flag: '🇲🇽' },
  { code: 'BR', name: 'Brasil',          currency: 'BRL', flag: '🇧🇷' },
  { code: 'US', name: 'Estados Unidos',  currency: 'USD', flag: '🇺🇸' },
  { code: 'EC', name: 'Ecuador',         currency: 'USD', flag: '🇪🇨' },
  { code: 'VE', name: 'Venezuela',       currency: 'USD', flag: '🇻🇪' },
  { code: 'PY', name: 'Paraguay',        currency: 'PYG', flag: '🇵🇾' },
  { code: 'UY', name: 'Uruguay',         currency: 'UYU', flag: '🇺🇾' },
]

function formatCLP(value) {
  if (!value) return ''
  const num = parseInt(value.replace(/\D/g, ''), 10)
  if (isNaN(num)) return ''
  return num.toLocaleString('es-CL')
}

function parseCLP(formatted) {
  return parseInt(formatted.replace(/\./g, '').replace(/,/g, ''), 10) || 0
}

function formatDestAmount(amount, currency) {
  if (!amount) return '—'
  return `${Number(amount).toLocaleString('es-CL')} ${currency}`
}

function formatCountdown(secs) {
  if (!secs || secs <= 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── Skeleton shimmer para la cotización en carga ──────────────────────────────

function QuoteSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex justify-between">
          <div className="h-3.5 bg-[#1F2B4D] rounded w-28" />
          <div className="h-3.5 bg-[#1F2B4D] rounded w-20" />
        </div>
      ))}
    </div>
  )
}

// ── Indicador de estado del WebSocket ─────────────────────────────────────────

function StatusBadge({ status }) {
  if (status === 'connected') {
    return (
      <span className="flex items-center gap-1 text-[0.625rem] font-semibold text-[#22C55E]">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#22C55E]" />
        </span>
        En vivo
      </span>
    )
  }
  if (status === 'updating') {
    return (
      <span className="flex items-center gap-1 text-[0.625rem] font-semibold text-[#C4CBD8]">
        <Loader2 size={10} className="animate-spin" />
        Actualizando
      </span>
    )
  }
  return null
}

export default function Step1Amount({ initialData, onNext }) {
  const [rawAmount, setRawAmount]         = useState(initialData?.originAmount || 0)
  const [displayAmount, setDisplayAmount] = useState(
    initialData?.originAmount ? formatCLP(String(initialData.originAmount)) : '',
  )
  const [selectedCountry, setSelectedCountry] = useState(
    DESTINATION_COUNTRIES.find(c => c.code === initialData?.destinationCountry) || null,
  )
  const [feesExpanded, setFeesExpanded] = useState(false)

  const { quote, status, error, isStale, countdown, reconnect } =
    useQuoteSocket(rawAmount || null, selectedCountry?.code || null)

  function handleAmountChange(e) {
    const digits = e.target.value.replace(/\D/g, '')
    const num    = parseInt(digits, 10) || 0
    setRawAmount(num)
    setDisplayAmount(num ? num.toLocaleString('es-CL') : '')
  }

  function handleCountryChange(e) {
    const found = DESTINATION_COUNTRIES.find(c => c.code === e.target.value)
    setSelectedCountry(found || null)
  }

  const isBlocked   = status === 'connecting' || status === 'expired' ||
                      status === 'disconnected' || status === 'error'
  const canContinue = !!quote && !isBlocked && !!rawAmount && !!selectedCountry

  function handleNext() {
    if (!canContinue) return
    onNext({
      originAmount:       rawAmount,
      destinationCountry: selectedCountry.code,
      quote,
    })
  }

  const destCountry = selectedCountry || DESTINATION_COUNTRIES[0]
  const showQuoteBlock = rawAmount > 0 && selectedCountry

  return (
    <div className="flex flex-col gap-5 px-4 pb-4">

      {/* ── Título ── */}
      <div>
        <h2 className="text-[1.125rem] font-bold text-white">¿Cuánto envías?</h2>
        <p className="text-[0.8125rem] text-[#8A96B8] mt-0.5">
          Tu cuenta está en Chile · CLP
        </p>
      </div>

      {/* ── Input de monto ── */}
      <div>
        <label className="block text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-wide mb-2">
          Monto a enviar
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A96B8] font-bold text-[1.125rem]">
            $
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={displayAmount}
            onChange={handleAmountChange}
            placeholder="0"
            className="w-full bg-[#1A2340] border border-[#263050] rounded-xl pl-8 pr-16 py-4 text-white text-[1.5rem] font-bold focus:outline-none focus:border-[#C4CBD8] focus:shadow-[0_0_0_2px_#C4CBD820] transition-all placeholder:text-[#4E5A7A]"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[0.75rem] font-semibold text-[#4E5A7A]">
            CLP
          </span>
        </div>
      </div>

      {/* ── Selector de país destino ── */}
      <div>
        <label className="block text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-wide mb-2">
          País de destino
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl pointer-events-none">
            {selectedCountry?.flag || '🌎'}
          </span>
          <select
            value={selectedCountry?.code || ''}
            onChange={handleCountryChange}
            className="w-full appearance-none bg-[#1A2340] border border-[#263050] rounded-xl pl-11 pr-10 py-4 text-white text-[0.9375rem] font-semibold focus:outline-none focus:border-[#C4CBD8] focus:shadow-[0_0_0_2px_#C4CBD820] transition-all cursor-pointer"
          >
            <option value="" disabled>Selecciona un país</option>
            {DESTINATION_COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.currency})
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4E5A7A] pointer-events-none" />
        </div>
      </div>

      {/* ── Bloque de cotización ── */}
      {showQuoteBlock && (
        <div className="bg-[#1A2340] border border-[#263050] rounded-2xl p-4">

          {/* Esqueleto — conectando */}
          {status === 'connecting' && <QuoteSkeleton />}

          {/* Banner — desconectado con backoff */}
          {status === 'disconnected' && (
            <div className="flex items-center gap-3">
              <WifiOff size={15} className="text-[#F97316] flex-shrink-0" />
              <p className="flex-1 text-[0.8125rem] text-[#F97316] font-medium">
                Reconectando cotización…
              </p>
              <button
                onClick={reconnect}
                className="flex items-center gap-1 text-[0.75rem] text-[#C4CBD8] hover:text-white transition-colors"
              >
                <RefreshCw size={13} /> Reintentar
              </button>
            </div>
          )}

          {/* Banner — error irrecuperable */}
          {status === 'error' && (
            error?.includes('Corredor no disponible') ? (
              /* Corredor sin cobertura → Próximamente */
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(245,158,11,0.12)' }}
                >
                  <Clock size={15} className="text-[#F59E0B]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[0.8125rem] text-white font-semibold">
                      {selectedCountry?.flag} {selectedCountry?.name}
                    </p>
                    <span className="text-[0.625rem] font-bold text-[#F59E0B] bg-[#F59E0B1A] border border-[#F59E0B33] px-2 py-0.5 rounded-full uppercase tracking-wide">
                      Próximamente
                    </span>
                  </div>
                  <p className="text-[0.75rem] text-[#8A96B8] mt-0.5">
                    Este corredor estará disponible pronto.
                  </p>
                </div>
              </div>
            ) : (
              /* Error genérico con reintentar */
              <div className="flex items-start gap-3">
                <AlertCircle size={16} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[0.8125rem] text-[#EF4444] font-medium">
                    Error de cotización
                  </p>
                  <p className="text-[0.75rem] text-[#8A96B8] mt-0.5">{error}</p>
                </div>
                <button
                  onClick={reconnect}
                  className="flex items-center gap-1 text-[0.75rem] text-[#C4CBD8] hover:text-white transition-colors flex-shrink-0"
                >
                  <RefreshCw size={13} /> Reintentar
                </button>
              </div>
            )
          )}

          {/* Cotización disponible (connected / updating / expired) */}
          {quote && status !== 'connecting' && status !== 'disconnected' && status !== 'error' && (
            <>
              {/* Fila principal: recibe */}
              <div className="flex justify-between items-center mb-3">
                <span className="text-[0.8125rem] text-[#8A96B8]">
                  {destCountry.name} recibe
                </span>
                <div className="flex items-center gap-2">
                  {status === 'updating' && (
                    <Loader2 size={13} className="animate-spin text-[#C4CBD8]" />
                  )}
                  <span className="text-[1.125rem] font-bold text-[#22C55E]">
                    {formatDestAmount(quote.destinationAmount, quote.destinationCurrency)}
                  </span>
                </div>
              </div>

              {/* Tasa de cambio + badge de estado */}
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[0.75rem] text-[#8A96B8]">Tasa aplicada</span>
                  {isStale && (
                    <span
                      className="text-[0.5625rem] font-semibold text-[#F59E0B] bg-[#F59E0B1A] px-1.5 py-0.5 rounded"
                      title="La tasa puede haber cambiado — reconectando"
                    >
                      ⚠ Referencial
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={status} />
                  <span className="text-[0.8125rem] font-semibold text-[#C4CBD8]">
                    1 CLP = {Number(quote.exchangeRate).toFixed(4)} {quote.destinationCurrency}
                  </span>
                </div>
              </div>

              {/* Fee total (con toggle) */}
              <button
                onClick={() => setFeesExpanded(v => !v)}
                className="w-full flex justify-between items-center py-1"
              >
                <span className="text-[0.75rem] text-[#8A96B8]">
                  Costo del envío
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[0.8125rem] font-semibold text-white">
                    {quote.fees
                      ? `$${(
                          (quote.fees.alytoCSpread || 0) +
                          (quote.fees.fixedFee     || 0) +
                          (quote.fees.payinFee     || 0)
                        ).toLocaleString('es-CL')} CLP`
                      : '—'}
                  </span>
                  {feesExpanded
                    ? <ChevronUp   size={14} className="text-[#4E5A7A]" />
                    : <ChevronDown size={14} className="text-[#4E5A7A]" />
                  }
                </div>
              </button>

              {/* Desglose de fees (colapsable) */}
              {feesExpanded && quote.fees && (
                <div className="mt-2 pt-3 border-t border-[#263050] space-y-2">
                  {[
                    { label: 'Fee de servicio Alyto', value: quote.fees.alytoCSpread },
                    { label: 'Fee fijo',               value: quote.fees.fixedFee },
                    { label: 'Fee de pago local',      value: quote.fees.payinFee },
                  ].map(({ label, value }) => value > 0 && (
                    <div key={label} className="flex justify-between">
                      <span className="text-[0.6875rem] text-[#4E5A7A]">{label}</span>
                      <span className="text-[0.6875rem] text-[#8A96B8]">
                        ${Number(value).toLocaleString('es-CL')} CLP
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Divider */}
              <div className="my-3 border-t border-[#263050]" />

              {/* Pie: tiempo estimado + countdown / banner caducado */}
              {status === 'expired' ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[#F59E0B]">
                    <AlertCircle size={13} />
                    <span className="text-[0.75rem] font-medium">Cotización caducada</span>
                  </div>
                  <button
                    onClick={reconnect}
                    className="flex items-center gap-1 text-[0.75rem] text-[#C4CBD8] hover:text-white transition-colors"
                  >
                    <RefreshCw size={13} /> Actualizar
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-[#8A96B8]">
                    <Clock size={13} />
                    <span className="text-[0.75rem]">
                      {quote.estimatedDelivery || '1 día hábil'}
                    </span>
                  </div>

                  {countdown !== null && (
                    <div className="flex items-center gap-1 text-[0.6875rem] text-[#4E5A7A]">
                      <span>Cotización válida</span>
                      <span className={`font-mono font-semibold ${countdown <= 30 ? 'text-[#F59E0B]' : 'text-[#C4CBD8]'}`}>
                        {formatCountdown(countdown)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Botón continuar ── */}
      <button
        onClick={handleNext}
        disabled={!canContinue}
        className={`w-full py-4 rounded-2xl text-[0.9375rem] font-bold transition-all duration-150 ${
          canContinue
            ? 'bg-[#C4CBD8] text-[#0F1628] shadow-[0_4px_20px_rgba(196,203,216,0.3)] active:scale-[0.98]'
            : 'bg-[#C4CBD840] text-[#4E5A7A] cursor-not-allowed'
        }`}
      >
        Continuar
      </button>
    </div>
  )
}
