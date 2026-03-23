/**
 * VitaPayinView.jsx — Depósito / Recarga de Saldo (Vita Wallet On-ramp)
 *
 * Flujo:
 *  1. Usuario selecciona el país de origen (AR, BR, CO, MX)
 *  2. Frontend llama a /regional/payment-methods/:countryIso
 *  3. Se renderizan dinámicamente los métodos disponibles (PIX, PSE, Nequi, etc.)
 *  4. Usuario selecciona el método e ingresa el monto
 *  5. POST /regional/payin → devuelve URL de pago o datos de pago directo
 *
 * ⚠️  REGLA DE ENRUTAMIENTO — Escenario B (Multi-Entity Router):
 *      Chile (CL) usa Fintoc DIRECTO de AV Finance SpA (sin comisión Vita).
 *      Chile NO aparece aquí — va por /transfer (TransferView → Fintoc Alyto).
 *
 * Países soportados: AR, BR, CO, MX  (CL excluido → flujo propio SpA)
 */

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Download, ChevronRight, AlertCircle, CheckCircle, Loader, RefreshCw } from 'lucide-react'
import { fetchPaymentMethods, createVitaPayin } from '../services/api'

// ─── Países soportados para Pay-in vía Vita ──────────────────────────────────
// CL excluido: usa Fintoc propio de AV Finance SpA (TransferView → /transfer)

const PAYIN_COUNTRIES = [
  { iso: 'AR', name: 'Argentina', flag: '🇦🇷', currency: 'ARS', methods: 'Khipu, Bind' },
  { iso: 'BR', name: 'Brasil',    flag: '🇧🇷', currency: 'BRL', methods: 'PIX QR' },
  { iso: 'CO', name: 'Colombia',  flag: '🇨🇴', currency: 'COP', methods: 'PSE, Nequi, TDC' },
  { iso: 'MX', name: 'México',    flag: '🇲🇽', currency: 'MXN', methods: 'CLABE Bitso' },
]

// Métodos de Vita que Alyto integra directamente — se filtran para evitar
// duplicados con comisión adicional de intermediario
const ALYTO_NATIVE_METHODS = ['fintoc']

// ─── Íconos por método de pago ────────────────────────────────────────────────

const METHOD_ICONS = {
  pix:       '⚡',
  pse:       '🏦',
  nequi:     '💜',
  daviplata: '🔴',
  bancolombia: '💛',
  khipu:     '🔵',
  webpay:    '💳',
  fintoc:    '🏛️',
  tdc:       '💳',
  bnpl:      '💰',
  bitso:     '₿',
  bind:      '🔗',
}

function getMethodIcon(name = '') {
  const lower = name.toLowerCase()
  for (const [key, icon] of Object.entries(METHOD_ICONS)) {
    if (lower.includes(key)) return icon
  }
  return '💳'
}

// ─── Componente PaymentMethodCard ─────────────────────────────────────────────

function PaymentMethodCard({ method, selected, onSelect }) {
  const name   = method?.name ?? method?.payment_method ?? 'Método de pago'
  const fields = method?.required_fields ?? method?.fields ?? []

  return (
    <button
      onClick={() => onSelect(method)}
      className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-150 ${
        selected
          ? 'bg-[#C4CBD81A] border-[#C4CBD833]'
          : 'bg-[#1A2340] border-[#263050] hover:border-[#C4CBD820]'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
        selected ? 'bg-[#C4CBD820]' : 'bg-[#263050]'
      }`}>
        {getMethodIcon(name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${selected ? 'text-white' : 'text-[#8A96B8]'}`}>
          {name}
        </p>
        {fields.length > 0 && (
          <p className="text-[11px] text-[#4E5A7A] mt-0.5 truncate">
            Requiere: {fields.map(f => f.label ?? f.name ?? f).join(', ')}
          </p>
        )}
      </div>
      <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
        selected ? 'border-[#C4CBD8] bg-[#C4CBD8]' : 'border-[#263050]'
      }`}>
        {selected && <div className="w-2 h-2 rounded-full bg-[#0F1628]" />}
      </div>
    </button>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function VitaPayinView({ onBack }) {
  const [step, setStep]             = useState(1) // 1=país, 2=método+monto, 3=resultado
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [paymentMethods, setPaymentMethods]   = useState([])
  const [selectedMethod, setSelectedMethod]   = useState(null)
  const [amount, setAmount]         = useState('')
  const [issue, setIssue]           = useState('Recarga de saldo Alyto')
  const [currencyDestiny]           = useState('USD')

  const [loading, setLoading]       = useState(false)
  const [methodsLoading, setMethodsLoading] = useState(false)
  const [error, setError]           = useState(null)
  const [result, setResult]         = useState(null)

  // ── Cargar métodos al seleccionar país ────────────────────────────────────
  const loadPaymentMethods = useCallback(async (countryIso) => {
    setMethodsLoading(true)
    setError(null)
    setPaymentMethods([])
    setSelectedMethod(null)
    try {
      const res = await fetchPaymentMethods(countryIso)
      // Vita retorna: { methods: { payment_methods: [...] }, country: "CL" }
      // Necesitamos desanidar dos niveles hasta llegar al array
      let raw = Array.isArray(res) ? res : (res.methods ?? res.data ?? res ?? [])
      const methods = Array.isArray(raw)
        ? raw
        : (raw.payment_methods ?? raw.data ?? Object.values(raw)[0] ?? [])
      const normalised = Array.isArray(methods) ? methods : []
      // Filtrar métodos que Alyto integra directamente para evitar doble comisión
      const filtered = normalised.filter(
        m => !ALYTO_NATIVE_METHODS.includes((m.name ?? '').toLowerCase())
      )
      setPaymentMethods(filtered)
    } catch (err) {
      setError('No se pudieron cargar los métodos de pago. Verifica tu conexión e intenta nuevamente.')
    } finally {
      setMethodsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedCountry) loadPaymentMethods(selectedCountry.iso)
  }, [selectedCountry, loadPaymentMethods])

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await createVitaPayin({
        amount:           Number(amount),
        country_iso_code: selectedCountry.iso,
        issue,
        currency_destiny: currencyDestiny,
        is_receive:       false,
      })
      setResult(res.paymentOrder ?? res)
      setStep(3)
    } catch (err) {
      setError(err.message ?? 'Error al crear la orden de pago. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = `
    w-full bg-[#1A2340] border border-[#263050] text-white placeholder-[#4E5A7A]
    rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#C4CBD8]
    focus:ring-1 focus:ring-[#C4CBD820] transition-colors
  `

  // ── Pantalla de resultado ─────────────────────────────────────────────────
  if (step === 3 && result) {
    const paymentUrl = result?.data?.attributes?.url ?? result?.url ?? null
    const orderId    = result?.data?.id ?? result?.id ?? '—'

    return (
      <div className="min-h-screen bg-[#0F1628] flex items-center justify-center p-4">
        <div className="bg-[#1A2340] rounded-2xl p-8 max-w-sm w-full text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-[#22C55E1A] flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-[#22C55E]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Orden creada</h2>
            <p className="text-sm text-[#8A96B8] mt-1">
              Tu orden de depósito en{' '}
              <span className="text-white font-medium">
                {selectedCountry?.flag} {selectedCountry?.name}
              </span>{' '}
              fue generada.
            </p>
          </div>

          <div className="bg-[#0F1628] rounded-xl p-4 text-left space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-[#4E5A7A]">Monto</span>
              <span className="text-white font-semibold">
                {Number(amount).toLocaleString('es')} {selectedCountry?.currency}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#4E5A7A]">Método</span>
              <span className="text-white">
                {getMethodIcon(selectedMethod?.name ?? '')} {selectedMethod?.name ?? selectedMethod?.payment_method ?? '—'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#4E5A7A]">ID Orden</span>
              <span className="text-[#8A96B8] font-mono text-xs">{orderId}</span>
            </div>
          </div>

          {paymentUrl && (
            <a
              href={paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#C4CBD8] text-[#0F1628] font-bold rounded-xl py-3.5 text-sm
                         hover:bg-[#A8B0C0] transition-colors flex items-center justify-center gap-2"
            >
              <ChevronRight className="w-4 h-4" />
              Ir a pagar
            </a>
          )}

          <button
            onClick={onBack}
            className="w-full border border-[#263050] text-white font-semibold rounded-xl py-3.5 text-sm
                       hover:border-[#C4CBD8] hover:text-[#C4CBD8] transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F1628] text-white">

      {/* Header */}
      <div className="sticky top-0 bg-[#0F1628] border-b border-[#1A2340] z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={step > 1 ? () => setStep(s => s - 1) : onBack}
            className="w-9 h-9 rounded-full bg-[#1A2340] flex items-center justify-center
                       hover:bg-[#1F2B4D] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#8A96B8]" />
          </button>
          <div>
            <h1 className="text-base font-bold">Depósito Local</h1>
            <p className="text-xs text-[#4E5A7A]">Paso {step} de 2 · Vita Wallet On-ramp</p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="flex gap-1 px-4 pb-3">
          {[1, 2].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              s <= step ? 'bg-[#C4CBD8]' : 'bg-[#263050]'
            }`} />
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 bg-[#EF44441A] border border-[#EF444430] rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-[#F87171]">{error}</p>
              {selectedCountry && (
                <button
                  onClick={() => loadPaymentMethods(selectedCountry.iso)}
                  className="flex items-center gap-1.5 text-xs text-[#C4CBD8] mt-2 hover:underline"
                >
                  <RefreshCw className="w-3 h-3" /> Reintentar
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── PASO 1: Selección de país ─────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-bold">¿Desde qué país depositas?</h2>
              <p className="text-sm text-[#8A96B8]">
                Selecciona tu país para ver los métodos de pago locales disponibles.
              </p>
            </div>

            <div className="space-y-2">
              {PAYIN_COUNTRIES.map(c => (
                <button
                  key={c.iso}
                  onClick={() => { setSelectedCountry(c); setStep(2) }}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-150 ${
                    selectedCountry?.iso === c.iso
                      ? 'bg-[#C4CBD81A] border-[#C4CBD833]'
                      : 'bg-[#1A2340] border-[#263050] hover:border-[#C4CBD820]'
                  }`}
                >
                  <span className="text-3xl">{c.flag}</span>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-white">{c.name}</p>
                    <p className="text-xs text-[#4E5A7A] mt-0.5">{c.methods}</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-[#0F1628] rounded-lg px-2.5 py-1">
                    <span className="text-xs font-mono text-[#8A96B8]">{c.currency}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#4E5A7A]" />
                </button>
              ))}
            </div>

            {/* Info box */}
            <div className="bg-[#1A2340] border border-[#263050] rounded-xl p-4 flex gap-3">
              <Download className="w-5 h-5 text-[#C4CBD8] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-white mb-1">¿Cómo funciona?</p>
                <p className="text-xs text-[#8A96B8] leading-relaxed">
                  Pagas en tu moneda local usando el método de tu país. Los fondos se
                  convierten a USD y se acreditan en tu cuenta Alyto en tiempo real.
                </p>
              </div>
            </div>

            {/* Aviso Chile */}
            <div className="bg-[#C4CBD81A] border border-[#C4CBD820] rounded-xl p-4 flex gap-3">
              <span className="text-lg shrink-0">🇨🇱</span>
              <div>
                <p className="text-sm font-semibold text-white mb-1">¿Estás en Chile?</p>
                <p className="text-xs text-[#8A96B8] leading-relaxed">
                  Chile usa Fintoc directo de AV Finance SpA con mejores comisiones.{' '}
                  <a href="/transfer" className="text-[#C4CBD8] underline underline-offset-2">
                    Ir al depósito Chile →
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── PASO 2: Métodos + Monto ───────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-bold">
                Métodos disponibles en {selectedCountry?.flag} {selectedCountry?.name}
              </h2>
              <p className="text-sm text-[#8A96B8]">
                Selecciona cómo quieres pagar y el monto.
              </p>
            </div>

            {/* Lista de métodos */}
            {methodsLoading && (
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader className="w-5 h-5 text-[#C4CBD8] animate-spin" />
                <span className="text-sm text-[#8A96B8]">Cargando métodos de pago...</span>
              </div>
            )}

            {!methodsLoading && paymentMethods.length > 0 && (
              <div className="space-y-2">
                {paymentMethods.map((method, i) => (
                  <PaymentMethodCard
                    key={method?.id ?? method?.name ?? i}
                    method={method}
                    selected={selectedMethod === method}
                    onSelect={setSelectedMethod}
                  />
                ))}
              </div>
            )}

            {!methodsLoading && paymentMethods.length === 0 && !error && (
              <div className="bg-[#C4CBD81A] border border-[#C4CBD820] rounded-xl p-4 text-center">
                <p className="text-sm text-[#8A96B8]">
                  No hay métodos disponibles para {selectedCountry?.name} en este momento.
                </p>
              </div>
            )}

            {/* Monto e instrucción */}
            {(paymentMethods.length > 0 || !methodsLoading) && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#8A96B8] uppercase tracking-wide">
                    Monto a depositar ({selectedCountry?.currency})
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0"
                    min="1"
                    className={inputClass}
                  />
                  {amount && (
                    <p className="text-xs text-[#4E5A7A]">
                      Recibirás en USD según el tipo de cambio vigente al momento del pago.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#8A96B8] uppercase tracking-wide">
                    Concepto
                  </label>
                  <input
                    type="text"
                    value={issue}
                    onChange={e => setIssue(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            <button
              disabled={(!selectedMethod && paymentMethods.length > 0) || !amount || Number(amount) <= 0 || loading}
              onClick={handleSubmit}
              className="w-full bg-[#C4CBD8] text-[#0F1628] font-bold rounded-xl py-3.5 text-sm
                         hover:bg-[#A8B0C0] disabled:opacity-30 disabled:cursor-not-allowed
                         transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Creando orden...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Crear orden de depósito
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
