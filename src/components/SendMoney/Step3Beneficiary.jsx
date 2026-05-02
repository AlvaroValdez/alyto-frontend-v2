/**
 * Step3Beneficiary.jsx — "¿A quién le envías?"
 *
 * Dos rutas según el proveedor de payout del corredor:
 *
 *   vitaWallet — formulario dinámico desde GET /payments/withdrawal-rules/:countryCode
 *                Los campos los devuelve Vita Wallet, varían por país.
 *
 *   owlPay    — formulario estático definido en owlPayForms.js (por país de destino).
 *               NO se llama a Harbor para obtener el schema — eso es responsabilidad
 *               del backend en buildOwlPayBeneficiary().
 */

import { useState, useMemo, useEffect } from 'react'
import { useWithdrawalRules }       from '../../hooks/useWithdrawalRules'
import { useHarborRequirements }    from '../../hooks/useHarborRequirements'
import { useAuth }                  from '../../context/AuthContext'
import { createContact }            from '../../services/api'
import ContactPicker                from '../Contacts/ContactPicker'
import { OWLPAY_FORMS, GENERIC_OWLPAY_FORM } from './owlPayForms'

// ── Prefijos de teléfono por país ─────────────────────────────────────────────

const PHONE_PREFIXES = {
  CO: '+57', PE: '+51', AR: '+54', BO: '+591',
  MX: '+52', BR: '+55', CL: '+56', EC: '+593',
}

// ── Corredores OwlPay con selector de método (Harbor) ────────────────────────
//
// Para estos países llamamos GET /payments/harbor/requirements y mostramos
// el selector de método (CIPS/WIRE/etc.) antes del formulario.

const HARBOR_DEST_CURRENCY = {
  CN: 'CNY',
}

// Fallback si el endpoint Harbor falla (para que el flujo no se rompa en dev)
const FALLBACK_HARBOR_METHODS = {
  CN: [
    { method: 'CIPS', rate: 6.54, deliveryLabel: '1 día hábil', recommended: true },
    { method: 'WIRE', rate: 5.10, deliveryLabel: '1-3 días',    recommended: false },
  ],
}

const METHOD_DISPLAY_NAMES = {
  CIPS: 'CIPS',
  WIRE: 'International Wire',
}

// ── Traducción de nombres de campo Vita → español (solo para formularios Vita) ──

const FIELD_LABELS = {
  beneficiary_name:          'Nombre completo del beneficiario',
  beneficiary_dob:           'Fecha de nacimiento',
  beneficiary_id_doc_number: 'Número de documento',
  street:                    'Dirección',
  city:                      'Ciudad',
  state_province:            'Provincia / Estado',
  postal_code:               'Código postal',
  account_holder_name:       'Nombre del titular de la cuenta',
  bank_name:                 'Nombre del banco',
  account_number:            'Número de cuenta',
  swift_code:                'Código SWIFT / BIC',
  transfer_purpose:          'Propósito de la transferencia',
  is_self_transfer:          '¿Transferencia a cuenta propia?',
}

// Opciones para transfer_purpose en formularios Vita (OwlPay usa las opciones del form config)
const TRANSFER_PURPOSE_OPTIONS = [
  { value: 'FAMILY_MAINTENANCE',    label: 'Manutención familiar' },
  { value: 'TRANSFER_TO_OWN_ACCOUNT', label: 'Transferencia a cuenta propia' },
  { value: 'SALARY',                label: 'Salario' },
  { value: 'DONATIONS',             label: 'Donaciones' },
  { value: 'EDUCATION',             label: 'Educación' },
  { value: 'MEDICAL_TREATMENT',     label: 'Gastos médicos' },
  { value: 'TRAVEL',                label: 'Viaje' },
  { value: 'INVESTMENT_SHARES',     label: 'Inversión' },
  { value: 'ADVERTISING',           label: 'Publicidad' },
  { value: 'EXPORTED_GOODS',        label: 'Bienes exportados' },
  { value: 'GENERAL_GOODS_OFFLINE', label: 'Bienes generales' },
]

const CN_PROVINCE_OPTIONS = [
  { value: 'AH', label: 'Anhui' },        { value: 'BJ', label: 'Beijing' },
  { value: 'CQ', label: 'Chongqing' },    { value: 'FJ', label: 'Fujian' },
  { value: 'GD', label: 'Guangdong' },    { value: 'GS', label: 'Gansu' },
  { value: 'GX', label: 'Guangxi' },      { value: 'GZ', label: 'Guizhou' },
  { value: 'HA', label: 'Henan' },        { value: 'HB', label: 'Hubei' },
  { value: 'HE', label: 'Hebei' },        { value: 'HI', label: 'Hainan' },
  { value: 'HL', label: 'Heilongjiang' }, { value: 'HN', label: 'Hunan' },
  { value: 'JL', label: 'Jilin' },        { value: 'JS', label: 'Jiangsu' },
  { value: 'JX', label: 'Jiangxi' },      { value: 'LN', label: 'Liaoning' },
  { value: 'NM', label: 'Mongolia Interior' }, { value: 'NX', label: 'Ningxia' },
  { value: 'QH', label: 'Qinghai' },      { value: 'SC', label: 'Sichuan' },
  { value: 'SD', label: 'Shandong' },     { value: 'SH', label: 'Shanghai' },
  { value: 'SN', label: 'Shaanxi' },      { value: 'SX', label: 'Shanxi' },
  { value: 'TJ', label: 'Tianjin' },      { value: 'XJ', label: 'Xinjiang' },
  { value: 'XZ', label: 'Tibet' },        { value: 'YN', label: 'Yunnan' },
  { value: 'ZJ', label: 'Zhejiang' },
]

// ── Skeleton de carga ─────────────────────────────────────────────────────────

function FieldSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-3 w-24 rounded bg-white animate-pulse" />
      <div className="h-12 w-full rounded-xl bg-white animate-pulse" />
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <div>
        <div className="h-5 w-40 rounded bg-white animate-pulse mb-2" />
        <div className="h-3 w-56 rounded bg-white animate-pulse" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => <FieldSkeleton key={i} />)}
      <div className="h-14 w-full rounded-2xl bg-white animate-pulse mt-2" />
    </div>
  )
}

// ── Validación por campo ──────────────────────────────────────────────────────

function validateField(field, value) {
  // Normalise: booleans stringify to 'true'/'false' which are never empty
  const raw = value === true ? 'true' : value === false ? 'false' : (value ?? '')
  const v   = String(raw).trim()

  if (field.required && v === '') return 'Campo requerido'

  if (v !== '') {
    const maxLen = field.max ?? field.maxLength
    if (field.min && v.length < field.min) return `Mínimo ${field.min} caracteres`
    if (maxLen    && v.length > maxLen)    return `Máximo ${maxLen} caracteres`

    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      return 'Correo electrónico inválido'
    }
    if (field.type === 'phone' && !/^[+\d\s\-() ]{5,25}$/.test(v)) {
      return 'Número de teléfono inválido'
    }
    // Pattern validation (owlPay forms may specify a regex)
    if (field.pattern) {
      try {
        if (!new RegExp(field.pattern).test(v)) return field.hint ?? 'Formato inválido'
      } catch { /* invalid regex in config — skip */ }
    }
  }

  return null
}

// ── Campo individual ──────────────────────────────────────────────────────────

function DynamicField({ field, value, error, onChange, onBlur, countryCode }) {
  const { key, label, type, required, options, placeholder } = field

  // OwlPay forms already have Spanish labels; Vita forms use FIELD_LABELS translations
  const displayLabel = FIELD_LABELS[key] ?? label

  const baseInput = `w-full bg-white border rounded-xl px-4 py-3.5 text-[0.9375rem] text-[#0D1F3C]
    placeholder:text-[#94A3B8] focus:outline-none transition-all`
  const borderOk  = 'border-[#E2E8F0] focus:border-[#1D3461] focus:shadow-[0_0_0_2px_#1D346120]'
  const borderErr = 'border-[#EF4444] shadow-[0_0_0_2px_#EF44441A]'

  // For OwlPay forms: options come from the config (non-empty arrays).
  // For Vita forms: fall back to hardcoded lists for known special keys.
  const resolvedOptions =
    (Array.isArray(options) && options.length > 0)
      ? options
      : (key === 'transfer_purpose'                        ? TRANSFER_PURPOSE_OPTIONS :
         key === 'state_province' && countryCode === 'CN'  ? CN_PROVINCE_OPTIONS      : null)

  return (
    <div>
      <label className="block text-[0.75rem] font-semibold text-[#4A5568] uppercase tracking-wide mb-2">
        {displayLabel}
        {!required && (
          <span className="ml-1 text-[0.625rem] normal-case font-normal text-[#94A3B8]">(opcional)</span>
        )}
      </label>

      {/* Boolean toggle for is_self_transfer */}
      {key === 'is_self_transfer' ? (
        <button
          type="button"
          role="switch"
          aria-checked={value === 'true' || value === true}
          onClick={() => onChange(key, value === 'true' || value === true ? false : true)}
          className="flex items-center gap-3 text-[0.9375rem] text-[#0D1F3C]"
        >
          <span style={{
            display: 'inline-block', width: 44, height: 24, borderRadius: 12,
            background: (value === 'true' || value === true) ? '#1D3461' : '#CBD5E1',
            position: 'relative', flexShrink: 0, transition: 'background 0.2s',
          }}>
            <span style={{
              position: 'absolute', top: 3,
              left: (value === 'true' || value === true) ? 23 : 3,
              width: 18, height: 18, borderRadius: '50%', background: '#FFF',
              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.20)',
            }} />
          </span>
          <span>{(value === 'true' || value === true) ? 'Sí' : 'No'}</span>
        </button>

      ) : (type === 'select' || resolvedOptions) ? (
        <select
          value={value ?? ''}
          onChange={e => onChange(key, e.target.value)}
          onBlur={() => onBlur(key)}
          className={`${baseInput} appearance-none ${error ? borderErr : borderOk}`}
        >
          <option value="">Seleccionar...</option>
          {(resolvedOptions ?? []).map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

      ) : type === 'phone' ? (
        <div className="flex gap-2">
          <span className="flex items-center px-3 bg-white border border-[#E2E8F0] rounded-xl
            text-[0.875rem] text-[#4A5568] flex-shrink-0 min-w-[64px] justify-center">
            {PHONE_PREFIXES[countryCode] ?? ''}
          </span>
          <input
            type="tel"
            value={value ?? ''}
            onChange={e => onChange(key, e.target.value)}
            onBlur={() => onBlur(key)}
            placeholder={placeholder || 'Número sin prefijo'}
            className={`${baseInput} flex-1 ${error ? borderErr : borderOk}`}
          />
        </div>

      ) : (
        <input
          type={type === 'email' ? 'email' : type === 'date' ? 'date' : 'text'}
          value={value ?? ''}
          onChange={e => onChange(key, e.target.value)}
          onBlur={() => onBlur(key)}
          placeholder={placeholder}
          maxLength={type === 'date' ? undefined : (field.maxLength ?? field.max ?? undefined)}
          className={`${baseInput} ${error ? borderErr : borderOk}`}
        />
      )}

      {error && (
        <p className="mt-1 text-[0.6875rem] text-[#EF4444]">{error}</p>
      )}
      {field.hint && !error && (
        <p className="mt-1 text-[0.6875rem] text-[#94A3B8]">{field.hint}</p>
      )}
    </div>
  )
}

// ── Selector de método de pago (CIPS / WIRE) para corredores Harbor ─────────

function PaymentMethodSelector({
  destCurrency, methods, selected, onSelect, loading, error,
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        <div className="h-3 w-44 rounded bg-white animate-pulse" />
        <div className="h-20 w-full rounded-2xl bg-white animate-pulse" />
        <div className="h-20 w-full rounded-2xl bg-white animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[0.75rem] font-semibold text-[#4A5568] uppercase tracking-wide">
        Método de pago en destino
      </p>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F59E0B0F] border border-[#F59E0B33]">
          <span className="text-base flex-shrink-0">⚠️</span>
          <p className="text-[0.6875rem] text-[#4A5568]">
            No se pudieron cargar las tasas en vivo. Mostrando valores de referencia.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {methods.map(m => {
          const isSelected = m.method === selected
          const display    = METHOD_DISPLAY_NAMES[m.method] ?? m.method
          return (
            <button
              type="button"
              key={m.method}
              onClick={() => onSelect(m.method)}
              className={`text-left bg-white rounded-2xl px-4 py-3.5 border transition-all ${
                isSelected
                  ? 'border-[#1D3461] shadow-[0_0_0_2px_#1D346120]'
                  : 'border-[#E2E8F0] hover:border-[#1D346155]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[0.9375rem] font-bold text-[#0D1F3C]">
                      {display}
                    </span>
                    {m.recommended && (
                      <span className="text-[0.625rem] font-semibold text-[#0D1F3C]
                        bg-[#FACC15] rounded-full px-2 py-[2px] uppercase tracking-wide">
                        Recomendado
                      </span>
                    )}
                  </div>
                  <p className="text-[0.75rem] text-[#4A5568] mt-1">
                    Tasa: <span className="font-semibold text-[#0D1F3C]">
                      {Number(m.rate).toFixed(2)} {destCurrency}/USDC
                    </span>
                    {' · '}Llegada: {m.deliveryLabel ?? m.delivery ?? '—'}
                  </p>
                </div>
                <span
                  aria-hidden
                  className={`mt-1 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    isSelected ? 'border-[#1D3461]' : 'border-[#CBD5E1]'
                  }`}
                >
                  {isSelected && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1D3461]" />
                  )}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Step3Beneficiary({ destinationCountry, onNext }) {
  const { rules, payoutMethod, loading, error: loadError, refetch } = useWithdrawalRules(destinationCountry)
  const { user } = useAuth()

  // ── OwlPay: form config estático por país ──────────────────────────────────
  const isOwlPay   = payoutMethod === 'owlPay'
  const owlPayForm = isOwlPay
    ? (OWLPAY_FORMS[destinationCountry] ?? GENERIC_OWLPAY_FORM)
    : null

  // ── OwlPay Harbor: corredores con selector de método (CIPS/WIRE) ──────────
  const harborCurrency = isOwlPay ? (HARBOR_DEST_CURRENCY[destinationCountry] ?? null) : null
  const harborCountry  = harborCurrency ? destinationCountry : null
  const usesHarborMethods = !!harborCurrency

  const {
    methods: harborMethodsRaw,
    loading: harborLoading,
    error:   harborError,
  } = useHarborRequirements(harborCountry, harborCurrency)

  const availableMethods = useMemo(() => {
    if (!usesHarborMethods) return []
    if (Array.isArray(harborMethodsRaw) && harborMethodsRaw.length > 0) return harborMethodsRaw
    return FALLBACK_HARBOR_METHODS[destinationCountry] ?? []
  }, [usesHarborMethods, harborMethodsRaw, destinationCountry])

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null)

  // Auto-seleccionar el método recomendado (o el primero) cuando llegan
  useEffect(() => {
    if (!usesHarborMethods) { setSelectedPaymentMethod(null); return }
    if (selectedPaymentMethod) return
    if (availableMethods.length === 0) return
    const rec = availableMethods.find(m => m.recommended) ?? availableMethods[0]
    setSelectedPaymentMethod(rec.method)
  }, [usesHarborMethods, availableMethods, selectedPaymentMethod])

  const [values,  setValues]  = useState({})
  const [touched, setTouched] = useState({})

  // Inicializar defaults de campos OwlPay (ej. is_self_transfer = false)
  useEffect(() => {
    if (!isOwlPay || !owlPayForm) return
    setValues(prev => {
      const defaults = {}
      for (const f of owlPayForm.fields) {
        if (f.default !== undefined && prev[f.key] === undefined) {
          defaults[f.key] = f.default
        }
      }
      return Object.keys(defaults).length > 0 ? { ...prev, ...defaults } : prev
    })
  }, [isOwlPay, owlPayForm])

  // ── Prefill & save-as-contact state ──────────────────────────────────────
  const [isSavedContact, setIsSavedContact] = useState(false)
  const [contactId,      setContactId]      = useState(null)
  const [prefillName,    setPrefillName]    = useState(null)
  const [saveAsContact,  setSaveAsContact]  = useState(false)
  const [contactAlias,   setContactAlias]   = useState('')

  useEffect(() => {
    const raw = sessionStorage.getItem('alyto_prefill_contact')
    if (!raw) return
    try {
      const contact = JSON.parse(raw)
      if (contact.beneficiaryData && typeof contact.beneficiaryData === 'object') {
        setValues(contact.beneficiaryData)
      }
      setIsSavedContact(true)
      setContactId(contact._id ?? null)
      const name = contact.nickname ||
        `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim()
      if (name) setPrefillName(name)
    } catch (e) {
      console.warn('[Step3] Failed to parse prefill contact:', e)
    }
    sessionStorage.removeItem('alyto_prefill_contact')
  }, [])

  function clearPrefill() {
    setPrefillName(null)
    setIsSavedContact(false)
    setContactId(null)
    setValues({})
    setTouched({})
  }

  function handleContactPick(contact) {
    if (contact.beneficiaryData && typeof contact.beneficiaryData === 'object') {
      setValues(contact.beneficiaryData)
    }
    setContactId(contact._id ?? null)
    setIsSavedContact(true)
    const name = contact.nickname ||
      `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim()
    if (name) setPrefillName(name)
    setTouched({})
  }

  // ── Campos activos ─────────────────────────────────────────────────────────
  // OwlPay: usa el config estático
  // Vita:   filtra campos fc_* y aplica lógica "when"
  const vitaVisibleRules = useMemo(() => {
    if (isOwlPay) return []
    return rules.filter(field => {
      if (field.key.startsWith('fc_')) return false
      if (!field.when) return true
      const refValue = values[field.when.key] ?? ''
      const expected = field.when.value
      if (Array.isArray(expected)) return expected.includes(refValue)
      return refValue === expected
    })
  }, [isOwlPay, rules, values])

  const activeFields = isOwlPay ? (owlPayForm?.fields ?? []) : vitaVisibleRules

  function handleChange(key, value) {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  function handleBlur(key) {
    setTouched(prev => ({ ...prev, [key]: true }))
  }

  function getError(field) {
    if (!touched[field.key]) return null
    return validateField(field, values[field.key])
  }

  const allValid = useMemo(() => {
    if (!activeFields.every(f => !validateField(f, values[f.key]))) return false
    if (usesHarborMethods && !selectedPaymentMethod) return false
    return true
  }, [activeFields, values, usesHarborMethods, selectedPaymentMethod])

  async function handleNext() {
    if (!allValid) {
      const allTouched = Object.fromEntries(activeFields.map(f => [f.key, true]))
      setTouched(prev => ({ ...prev, ...allTouched }))
      return
    }

    let beneficiaryData

    if (isOwlPay) {
      beneficiaryData = {}
      for (const f of activeFields) {
        const val = values[f.key]
        if (val === undefined || val === null) continue
        if (f.type === 'toggle') {
          // Persist booleans as booleans (not strings)
          beneficiaryData[f.key] = val === true || val === 'true'
        } else {
          const trimmed = typeof val === 'string' ? val.trim() : val
          if (trimmed !== '') beneficiaryData[f.key] = trimmed
        }
      }
    } else {
      beneficiaryData = Object.fromEntries(
        vitaVisibleRules
          .filter(f => (String(values[f.key] ?? '')).trim() !== '')
          .map(f => [f.key, String(values[f.key]).trim()]),
      )
    }

    // Save contact (non-blocking — never fails the transfer)
    if (saveAsContact && !isSavedContact) {
      try {
        const alias = contactAlias.trim()
          || beneficiaryData.beneficiary_name
          || `${beneficiaryData.beneficiary_first_name ?? ''} ${beneficiaryData.beneficiary_last_name ?? ''}`.trim()
        await createContact({
          nickname:            alias,
          firstName:           beneficiaryData.beneficiary_name?.split(' ')[0]
                            ?? beneficiaryData.beneficiary_first_name ?? '',
          lastName:            beneficiaryData.beneficiary_name?.split(' ').slice(1).join(' ')
                            ?? beneficiaryData.beneficiary_last_name  ?? '',
          destinationCountry:  destinationCountry,
          destinationCurrency: '',
          formType:            isOwlPay ? 'owlpay' : 'vita',
          beneficiaryData,
        })
      } catch (err) {
        console.warn('[Contacts] Failed to save contact:', err.message)
      }
    }

    // Cuando el corredor tiene selector Harbor, adjuntamos owlPayMethod para
    // que tryOwlPayV2 use el quote_id correcto. harborQuoteId solo si vino
    // del backend — el fallback estático no lo incluye.
    const selectedMethodObj = usesHarborMethods
      ? availableMethods.find(m => m.method === selectedPaymentMethod)
      : null
    const harborExtra = usesHarborMethods
      ? {
          owlPayMethod: selectedPaymentMethod,
          ...(selectedMethodObj?.quoteId ? { harborQuoteId: selectedMethodObj.quoteId } : {}),
        }
      : {}

    onNext({ beneficiaryData, contactId, ...harborExtra })
  }

  // ── Estados de carga y error ──────────────────────────────────────────────

  if (loading) return <LoadingSkeleton />

  if (loadError) {
    return (
      <div className="flex flex-col gap-4 px-4 pb-4">
        <div>
          <h2 className="text-[1.125rem] font-bold text-[#0D1F3C]">¿A quién le envías?</h2>
          <p className="text-[0.8125rem] text-[#4A5568] mt-0.5">Ingresa los datos bancarios del beneficiario</p>
        </div>

        <div className="bg-[#EF44441A] border border-[#EF44441A] rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-[0.875rem] text-[#F87171]">
            No se pudieron cargar los campos del formulario.
          </p>
          <p className="text-[0.75rem] text-[#4A5568]">{loadError}</p>
          <button
            onClick={refetch}
            className="self-start px-4 py-2 rounded-xl border border-[#1D346133] text-[0.875rem]
              font-semibold text-[#1D3461] hover:bg-[#1D34611A] transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // ── Formulario ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">

      {/* Título */}
      <div>
        <h2 className="text-[1.125rem] font-bold text-[#0D1F3C]">¿A quién le envías?</h2>
        <p className="text-[0.8125rem] text-[#4A5568] mt-0.5">
          Ingresa los datos bancarios del beneficiario
        </p>
      </div>

      {/* Contactos guardados */}
      {!prefillName && (
        <ContactPicker
          destinationCountry={destinationCountry}
          selectedId={contactId}
          onSelect={handleContactPick}
        />
      )}

      {/* Prefill banner */}
      {prefillName && (
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          8,
          background:   'var(--color-primary-bg)',
          border:       '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding:      '10px 14px',
        }}>
          <span style={{ fontSize: '1rem', flexShrink: 0 }}>👤</span>
          <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
            Datos de <strong>{prefillName}</strong>
          </span>
          <button
            type="button"
            onClick={clearPrefill}
            style={{
              background:   'none',
              border:       'none',
              cursor:       'pointer',
              fontSize:     '0.8125rem',
              color:        'var(--color-text-muted)',
              padding:      '2px 6px',
              borderRadius: 6,
              flexShrink:   0,
            }}
          >
            ✕ Cambiar
          </button>
        </div>
      )}

      {/* Harbor: selector de método de pago (CIPS / WIRE) */}
      {usesHarborMethods && (
        <PaymentMethodSelector
          destCurrency={harborCurrency}
          methods={availableMethods}
          selected={selectedPaymentMethod}
          onSelect={setSelectedPaymentMethod}
          loading={harborLoading}
          error={harborError}
        />
      )}

      {/* OwlPay: form title + static fields agrupados por sección */}
      {isOwlPay && owlPayForm && (
        <>
          <p className="text-[0.8125rem] font-semibold text-[#1D3461] -mb-1">
            {owlPayForm.title}
          </p>
          {owlPayForm.fields.map((field, idx) => {
            const prevSection = idx > 0 ? owlPayForm.fields[idx - 1].section : null
            const showHeader  = field.section && field.section !== prevSection
            return (
              <div key={field.key} className="flex flex-col gap-3">
                {showHeader && (
                  <p className="text-[0.6875rem] font-bold text-[#94A3B8] uppercase tracking-wider mt-1">
                    {field.section}
                  </p>
                )}
                <DynamicField
                  field={field}
                  value={values[field.key] ?? (field.default ?? '')}
                  error={getError(field)}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  countryCode={destinationCountry}
                />
              </div>
            )
          })}
        </>
      )}

      {/* Vita: dynamic fields from backend */}
      {!isOwlPay && vitaVisibleRules.map(field => (
        <DynamicField
          key={field.key}
          field={field}
          value={values[field.key] ?? ''}
          error={getError(field)}
          onChange={handleChange}
          onBlur={handleBlur}
          countryCode={destinationCountry}
        />
      ))}

      {/* Nota de seguridad */}
      <div className="flex items-start gap-2.5 bg-white rounded-xl px-3.5 py-3">
        <span className="text-base flex-shrink-0">🔒</span>
        <p className="text-[0.6875rem] text-[#4A5568] leading-relaxed">
          Tus datos están cifrados y protegidos. Solo los usamos para procesar este pago.
        </p>
      </div>

      {/* Guardar como contacto */}
      {!isSavedContact && (
        <div style={{
          background:   '#FFFFFF',
          border:       '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding:      '14px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.125rem', flexShrink: 0 }}>⭐</span>
              <div>
                <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Guardar como contacto
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Podrás reutilizarlo en futuras transferencias
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={saveAsContact}
              onClick={() => setSaveAsContact(v => !v)}
              style={{
                flexShrink:   0,
                width:        44,
                height:       24,
                borderRadius: 12,
                background:   saveAsContact ? 'var(--color-primary)' : '#CBD5E1',
                border:       'none',
                cursor:       'pointer',
                position:     'relative',
                transition:   'background 0.2s',
                padding:      0,
              }}
            >
              <span style={{
                position:     'absolute',
                top:          3,
                left:         saveAsContact ? 23 : 3,
                width:        18,
                height:       18,
                borderRadius: '50%',
                background:   '#FFFFFF',
                transition:   'left 0.2s',
                boxShadow:    '0 1px 3px rgba(0,0,0,0.20)',
              }} />
            </button>
          </div>

          {saveAsContact && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
              <label className="block text-[0.75rem] font-semibold text-[#4A5568] uppercase tracking-wide mb-2">
                Nombre del contacto{' '}
                <span className="normal-case font-normal text-[0.625rem] text-[#94A3B8]">(opcional)</span>
              </label>
              <input
                type="text"
                value={contactAlias}
                onChange={e => setContactAlias(e.target.value)}
                placeholder={
                  values['beneficiary_name']
                    || `${values['beneficiary_first_name'] ?? ''} ${values['beneficiary_last_name'] ?? ''}`.trim()
                    || 'Ej: Marina Colombia'
                }
                maxLength={50}
                className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3.5 text-[0.9375rem]
                  text-[#0D1F3C] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#0D1F3C]
                  focus:shadow-[0_0_0_2px_rgba(13,31,60,0.12)] transition-all"
              />
              <p className="mt-1.5 text-[0.6875rem] text-[#94A3B8]">
                Si lo dejas vacío usaremos el nombre completo
              </p>
            </div>
          )}
        </div>
      )}

      {/* Botón continuar */}
      <button
        onClick={handleNext}
        disabled={!allValid}
        className={`w-full py-4 rounded-2xl text-[0.9375rem] font-bold transition-all duration-150 ${
          allValid
            ? 'bg-[#1D3461] text-white shadow-[0_4px_20px_rgba(29,52,97,0.25)] active:scale-[0.98]'
            : 'bg-[#1D346140] text-[#94A3B8] cursor-not-allowed'
        }`}
      >
        Continuar
      </button>
    </div>
  )
}
