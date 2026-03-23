/**
 * VitaPayoutView.jsx — Retiro Bancario Internacional (Vita Wallet Off-ramp)
 *
 * Flujo:
 *  1. Usuario selecciona el país de destino
 *  2. Frontend llama a /regional/withdrawal-rules y filtra las reglas del país
 *  3. Se renderizan dinámicamente los campos bancarios (text / select / email)
 *  4. Campos con `when` se muestran solo cuando la condición se cumple
 *  5. Al confirmar → POST /regional/payout
 *
 * Escenario D del Multi-Entity Router (Vita Wallet — LatAm General)
 */

import { useState, useEffect, useCallback } from 'react'
import { ArrowLeft, Send, ChevronDown, AlertCircle, CheckCircle, Loader } from 'lucide-react'
import { fetchWithdrawalRules, createVitaPayout } from '../services/api'

// ─── Países soportados ────────────────────────────────────────────────────────

const COUNTRIES = [
  { iso: 'AR', name: 'Argentina',  flag: '🇦🇷', currency: 'ARS' },
  { iso: 'BO', name: 'Bolivia',    flag: '🇧🇴', currency: 'BOB' },
  { iso: 'BR', name: 'Brasil',     flag: '🇧🇷', currency: 'BRL' },
  { iso: 'CL', name: 'Chile',      flag: '🇨🇱', currency: 'CLP' },
  { iso: 'CO', name: 'Colombia',   flag: '🇨🇴', currency: 'COP' },
  { iso: 'EC', name: 'Ecuador',    flag: '🇪🇨', currency: 'USD' },
  { iso: 'MX', name: 'México',     flag: '🇲🇽', currency: 'MXN' },
  { iso: 'PE', name: 'Perú',       flag: '🇵🇪', currency: 'PEN' },
  { iso: 'PY', name: 'Paraguay',   flag: '🇵🇾', currency: 'PYG' },
  { iso: 'UY', name: 'Uruguay',    flag: '🇺🇾', currency: 'UYU' },
]

const PURPOSE_OPTIONS = [
  { value: 'ISSAVG', label: 'Ahorro / Inversión' },
  { value: 'ISPAYR', label: 'Pago de Nómina' },
  { value: 'ISGDDS', label: 'Compra de Bienes' },
  { value: 'EPIVST', label: 'Pago de Inversión' },
  { value: 'ISSTDY', label: 'Estudios / Matrícula' },
  { value: 'ISMDCS', label: 'Servicios de Salud' },
  { value: 'EPTOUR', label: 'Turismo' },
  { value: 'EPFAMT', label: 'Manutención Familiar' },
]

// ─── Componente DynamicField ──────────────────────────────────────────────────

/**
 * Renderiza un campo de formulario dinámico según las reglas de Vita Wallet.
 * Soporta tipos: text, select, email.
 * Aplica condición `when` para visibilidad condicional.
 */
function DynamicField({ rule, value, onChange, formValues }) {
  // Evaluar visibilidad condicional (campo `when`)
  if (rule.when) {
    const { key: whenKey, value: whenValue } = rule.when
    const currentVal = formValues[whenKey]
    const required   = Array.isArray(whenValue) ? whenValue : [whenValue]
    if (!required.includes(currentVal)) return null
  }

  const baseInput = `
    w-full bg-[#1A2340] border border-[#263050] text-white placeholder-[#4E5A7A]
    rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#C4CBD8]
    focus:ring-1 focus:ring-[#C4CBD820] transition-colors
  `

  if (rule.type === 'select') {
    // Filtrar opciones por condición `visible`
    const visibleOptions = (rule.options ?? []).filter((opt) => {
      if (!opt.visible) return true
      const depVal = formValues[opt.visible.key]
      const allowed = Array.isArray(opt.visible.value) ? opt.visible.value : [opt.visible.value]
      return allowed.includes(depVal)
    })

    return (
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-[#8A96B8] uppercase tracking-wide">
          {rule.name}
        </label>
        <div className="relative">
          <select
            value={value ?? ''}
            onChange={(e) => onChange(rule.key, e.target.value)}
            className={`${baseInput} appearance-none pr-10 cursor-pointer`}
          >
            <option value="">Seleccionar...</option>
            {visibleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4E5A7A] pointer-events-none" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-[#8A96B8] uppercase tracking-wide">
        {rule.name}
      </label>
      <input
        type={rule.type === 'email' ? 'email' : 'text'}
        value={value ?? ''}
        onChange={(e) => onChange(rule.key, e.target.value)}
        placeholder={rule.name}
        minLength={rule.min}
        maxLength={rule.max}
        className={baseInput}
      />
      {(rule.min || rule.max) && (
        <p className="text-[10px] text-[#4E5A7A]">
          {rule.min && rule.max ? `${rule.min}–${rule.max} caracteres` :
           rule.min ? `Mínimo ${rule.min} caracteres` : `Máximo ${rule.max} caracteres`}
        </p>
      )}
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function VitaPayoutView({ onBack }) {
  const [step, setStep]               = useState(1) // 1=país+monto, 2=datos bancarios, 3=confirmación
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [amount, setAmount]           = useState('')
  const [currency, setCurrency]       = useState('usd')
  const [purpose, setPurpose]         = useState('ISSAVG')

  // Datos del beneficiario
  const [beneficiary, setBeneficiary] = useState({
    firstName: '', lastName: '', email: '', address: '',
    docType: '', docNumber: '',
  })

  // Campos dinámicos del formulario bancario
  const [dynamicValues, setDynamicValues] = useState({})
  const [countryRules, setCountryRules]   = useState([])

  const [loading, setLoading]  = useState(false)
  const [rulesLoading, setRulesLoading] = useState(false)
  const [error, setError]      = useState(null)
  const [success, setSuccess]  = useState(null)

  // ── Cargar reglas al seleccionar país ─────────────────────────────────────
  const loadRulesForCountry = useCallback(async (countryIso) => {
    if (!countryIso) return
    setRulesLoading(true)
    setError(null)
    setDynamicValues({})
    try {
      const res  = await fetchWithdrawalRules()
      const data = res.rules ?? res

      // Las reglas vienen como un objeto con claves por país o como array
      // Vita puede retornar distintas estructuras; normalizamos aquí
      let rules = []
      if (Array.isArray(data)) {
        // Array de objetos { country, forms: [...] }
        const match = data.find(r => r.country?.toUpperCase() === countryIso.toUpperCase())
        rules = match?.forms ?? match?.rules ?? []
      } else if (data[countryIso]) {
        rules = data[countryIso]
      } else if (data[countryIso.toLowerCase()]) {
        rules = data[countryIso.toLowerCase()]
      } else {
        // La API puede retornar directamente un array de reglas globales
        rules = Array.isArray(data) ? data : []
      }

      setCountryRules(rules)
    } catch (err) {
      console.error('[VitaPayoutView] Error cargando reglas:', err.message)
      setError('No se pudieron cargar los campos bancarios. Inténtalo nuevamente.')
      setCountryRules([])
    } finally {
      setRulesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedCountry) loadRulesForCountry(selectedCountry.iso)
  }, [selectedCountry, loadRulesForCountry])

  const handleDynamicChange = (key, value) => {
    setDynamicValues(prev => ({ ...prev, [key]: value }))
  }

  const handleBeneficiaryChange = (key, value) => {
    setBeneficiary(prev => ({ ...prev, [key]: value }))
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      const order = `ALY-${Date.now()}`
      const result = await createVitaPayout({
        country:  selectedCountry.iso,
        currency,
        amount:   Number(amount),
        order,
        beneficiary_first_name:      beneficiary.firstName,
        beneficiary_last_name:       beneficiary.lastName,
        beneficiary_email:           beneficiary.email,
        beneficiary_address:         beneficiary.address,
        beneficiary_document_type:   beneficiary.docType,
        beneficiary_document_number: beneficiary.docNumber,
        purpose,
        ...dynamicValues,
      })
      setSuccess(result)
      setStep(4)
    } catch (err) {
      setError(err.message ?? 'Error al procesar el retiro. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = `
    w-full bg-[#1A2340] border border-[#263050] text-white placeholder-[#4E5A7A]
    rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#C4CBD8]
    focus:ring-1 focus:ring-[#C4CBD820] transition-colors
  `

  // ── Pantalla de éxito ─────────────────────────────────────────────────────
  if (step === 4 && success) {
    return (
      <div className="min-h-screen bg-[#0F1628] flex items-center justify-center p-4">
        <div className="bg-[#1A2340] rounded-2xl p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#22C55E1A] flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-[#22C55E]" />
          </div>
          <h2 className="text-xl font-bold text-white">Retiro iniciado</h2>
          <p className="text-[#8A96B8] text-sm">
            Tu retiro a <span className="text-white font-semibold">{selectedCountry?.name}</span> fue
            enviado exitosamente. Recibirás una notificación cuando se acredite.
          </p>
          <div className="bg-[#0F1628] rounded-xl p-4 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#4E5A7A]">Monto</span>
              <span className="text-white font-semibold">{amount} {currency.toUpperCase()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#4E5A7A]">Destino</span>
              <span className="text-white">{selectedCountry?.flag} {selectedCountry?.name}</span>
            </div>
          </div>
          <button
            onClick={onBack}
            className="w-full bg-[#C4CBD8] text-[#0F1628] font-bold rounded-xl py-3.5 text-sm
                       hover:bg-[#A8B0C0] transition-colors"
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
            <h1 className="text-base font-bold">Retiro Internacional</h1>
            <p className="text-xs text-[#4E5A7A]">Paso {step} de 3 · Vita Wallet LatAm</p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="flex gap-1 px-4 pb-3">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              s <= step ? 'bg-[#C4CBD8]' : 'bg-[#263050]'
            }`} />
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Error global */}
        {error && (
          <div className="flex items-start gap-3 bg-[#EF44441A] border border-[#EF444430] rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
            <p className="text-sm text-[#F87171]">{error}</p>
          </div>
        )}

        {/* ── PASO 1: País y Monto ───────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-bold">¿A dónde envías?</h2>
              <p className="text-sm text-[#8A96B8]">
                Selecciona el país de destino y el monto a retirar.
              </p>
            </div>

            {/* Selector de país */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#8A96B8] uppercase tracking-wide">
                País de destino
              </label>
              <div className="grid grid-cols-2 gap-2">
                {COUNTRIES.map(c => (
                  <button
                    key={c.iso}
                    onClick={() => setSelectedCountry(c)}
                    className={`flex items-center gap-2.5 p-3.5 rounded-xl border text-left
                                transition-all duration-150 ${
                      selectedCountry?.iso === c.iso
                        ? 'bg-[#C4CBD81A] border-[#C4CBD833] text-white'
                        : 'bg-[#1A2340] border-[#263050] text-[#8A96B8] hover:border-[#C4CBD820]'
                    }`}
                  >
                    <span className="text-xl">{c.flag}</span>
                    <div>
                      <p className="text-xs font-semibold leading-none">{c.name}</p>
                      <p className="text-[10px] text-[#4E5A7A] mt-0.5">{c.currency}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Monto */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#8A96B8] uppercase tracking-wide">
                Monto a enviar
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="1"
                  className={`${inputClass} flex-1`}
                />
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className={`${inputClass} w-28`}
                >
                  <option value="usd">USD</option>
                  <option value="clp">CLP</option>
                  <option value="cop">COP</option>
                </select>
              </div>
            </div>

            {/* Propósito */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#8A96B8] uppercase tracking-wide">
                Propósito del envío
              </label>
              <div className="relative">
                <select
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  className={`${inputClass} appearance-none pr-10 cursor-pointer`}
                >
                  {PURPOSE_OPTIONS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4E5A7A] pointer-events-none" />
              </div>
            </div>

            <button
              disabled={!selectedCountry || !amount || Number(amount) <= 0}
              onClick={() => setStep(2)}
              className="w-full bg-[#C4CBD8] text-[#0F1628] font-bold rounded-xl py-3.5 text-sm
                         hover:bg-[#A8B0C0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Continuar
            </button>
          </div>
        )}

        {/* ── PASO 2: Datos del beneficiario + campos bancarios dinámicos ──────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-bold">Datos del beneficiario</h2>
              <p className="text-sm text-[#8A96B8]">
                Información bancaria para{' '}
                <span className="text-white font-medium">
                  {selectedCountry?.flag} {selectedCountry?.name}
                </span>
              </p>
            </div>

            {/* Datos fijos del beneficiario */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#8A96B8] uppercase tracking-wide">Nombre</label>
                  <input
                    type="text"
                    value={beneficiary.firstName}
                    onChange={e => handleBeneficiaryChange('firstName', e.target.value)}
                    placeholder="Juan"
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#8A96B8] uppercase tracking-wide">Apellido</label>
                  <input
                    type="text"
                    value={beneficiary.lastName}
                    onChange={e => handleBeneficiaryChange('lastName', e.target.value)}
                    placeholder="García"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#8A96B8] uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={beneficiary.email}
                  onChange={e => handleBeneficiaryChange('email', e.target.value)}
                  placeholder="juan@email.com"
                  className={inputClass}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#8A96B8] uppercase tracking-wide">Dirección</label>
                <input
                  type="text"
                  value={beneficiary.address}
                  onChange={e => handleBeneficiaryChange('address', e.target.value)}
                  placeholder="Calle 123, Ciudad"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#8A96B8] uppercase tracking-wide">Tipo de Doc.</label>
                  <select
                    value={beneficiary.docType}
                    onChange={e => handleBeneficiaryChange('docType', e.target.value)}
                    className={`${inputClass} appearance-none cursor-pointer`}
                  >
                    <option value="">Seleccionar</option>
                    <option value="DNI">DNI</option>
                    <option value="CI">CI</option>
                    <option value="CC">Cédula (CC)</option>
                    <option value="RUT">RUT</option>
                    <option value="PASSPORT">Pasaporte</option>
                    <option value="NIT">NIT</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#8A96B8] uppercase tracking-wide">Nro. Documento</label>
                  <input
                    type="text"
                    value={beneficiary.docNumber}
                    onChange={e => handleBeneficiaryChange('docNumber', e.target.value)}
                    placeholder="12345678"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Separador campos dinámicos */}
            {rulesLoading && (
              <div className="flex items-center gap-3 py-4">
                <Loader className="w-4 h-4 text-[#C4CBD8] animate-spin" />
                <span className="text-sm text-[#8A96B8]">Cargando campos bancarios...</span>
              </div>
            )}

            {!rulesLoading && countryRules.length > 0 && (
              <>
                <div className="border-t border-[#263050] pt-4">
                  <p className="text-xs font-medium text-[#8A96B8] uppercase tracking-wide mb-4">
                    Datos bancarios · {selectedCountry?.name}
                  </p>
                  <div className="space-y-4">
                    {countryRules.map((rule, i) => (
                      <DynamicField
                        key={rule.key ?? i}
                        rule={rule}
                        value={dynamicValues[rule.key] ?? ''}
                        onChange={handleDynamicChange}
                        formValues={dynamicValues}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {!rulesLoading && countryRules.length === 0 && !error && (
              <div className="bg-[#C4CBD81A] border border-[#C4CBD820] rounded-xl p-4">
                <p className="text-sm text-[#8A96B8]">
                  No se encontraron campos adicionales para este país. Los datos del beneficiario son suficientes.
                </p>
              </div>
            )}

            <button
              disabled={!beneficiary.firstName || !beneficiary.lastName}
              onClick={() => setStep(3)}
              className="w-full bg-[#C4CBD8] text-[#0F1628] font-bold rounded-xl py-3.5 text-sm
                         hover:bg-[#A8B0C0] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Revisar retiro
            </button>
          </div>
        )}

        {/* ── PASO 3: Confirmación ──────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-bold">Confirmar retiro</h2>
              <p className="text-sm text-[#8A96B8]">Revisa los detalles antes de enviar.</p>
            </div>

            <div className="bg-[#1A2340] rounded-2xl p-5 space-y-4">
              {/* Monto destacado */}
              <div
                className="rounded-xl p-5 text-center"
                style={{ background: 'linear-gradient(135deg, #1D3461 0%, #0F1628 60%, #1A2030 100%)' }}
              >
                <p className="text-xs text-[#8A96B8] uppercase tracking-wide mb-1">Envías</p>
                <p className="text-3xl font-extrabold text-white">
                  {Number(amount).toLocaleString('es')} <span className="text-[#C4CBD8]">{currency.toUpperCase()}</span>
                </p>
                <p className="text-sm text-[#8A96B8] mt-1">
                  a {selectedCountry?.flag} {selectedCountry?.name}
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                {[
                  ['Beneficiario', `${beneficiary.firstName} ${beneficiary.lastName}`],
                  ['Email',        beneficiary.email || '—'],
                  ['Propósito',    PURPOSE_OPTIONS.find(p => p.value === purpose)?.label ?? purpose],
                  ...Object.entries(dynamicValues).map(([k, v]) => [k.replace(/_/g, ' '), v]),
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between text-sm border-b border-[#263050] pb-2.5">
                    <span className="text-[#4E5A7A] capitalize">{label}</span>
                    <span className="text-white font-medium text-right max-w-[55%] truncate">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#C4CBD81A] border border-[#C4CBD820] rounded-xl p-4">
              <p className="text-xs text-[#8A96B8] leading-relaxed">
                Al confirmar, autorizas a <strong className="text-white">AV Finance LLC</strong> a
                procesar esta transferencia internacional vía Vita Wallet. El tiempo de acreditación
                puede ser de hasta 1 día hábil.
              </p>
            </div>

            <button
              disabled={loading}
              onClick={handleSubmit}
              className="w-full bg-[#C4CBD8] text-[#0F1628] font-bold rounded-xl py-3.5 text-sm
                         hover:bg-[#A8B0C0] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Confirmar retiro
                </>
              )}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
