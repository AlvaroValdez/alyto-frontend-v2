/**
 * VitaContactForm.jsx — Formulario dinámico de contacto reutilizable.
 *
 * Soporta ambos proveedores:
 *   - Vita Wallet: campos dinámicos desde GET /payments/withdrawal-rules/:country
 *   - OwlPay Harbor: formularios estáticos desde owlPayForms.js (por país)
 *
 * Props:
 *   initialDestinationCountry — string ISO-2 | null  (null = el usuario elige)
 *   initialNickname           — string
 *   initialValues             — object con keys de beneficiaryData
 *   onSave(data)              — { nickname, firstName, lastName,
 *                               destinationCountry, destinationCurrency,
 *                               formType, beneficiaryData }
 *   onCancel                  — callback (muestra botón Cancelar)
 *   saving                    — boolean
 *   saveError                 — string
 *   submitLabel               — string (default "Guardar contacto")
 */

import { useState, useMemo, useEffect } from 'react'
import { AlertCircle, Loader2, X, Search, Check, Globe, Zap } from 'lucide-react'
import { useWithdrawalRules } from '../../hooks/useWithdrawalRules'
import { OWLPAY_FORMS, GENERIC_OWLPAY_FORM } from '../SendMoney/owlPayForms'
import { runFieldValidator, ibanCountry } from '../SendMoney/formValidators'

// ── Prefijos de teléfono ──────────────────────────────────────────────────────

const PHONE_PREFIXES = {
  CO: '+57', PE: '+51', AR: '+54', BO: '+591',
  MX: '+52', BR: '+55', CL: '+56', EC: '+593',
  VE: '+58', GT: '+502', SV: '+503', ES: '+34',
  PL: '+48', HK: '+852', HT: '+509', PA: '+507',
  DO: '+1',  CR: '+506', PY: '+595', UY: '+598',
  US: '+1',  GB: '+44',  CN: '+86',  NG: '+234',
  IN: '+91', AE: '+971', JP: '+81',  SG: '+65',
  AU: '+61', EU: '+',
}

// ── Metadatos de países (Vita LatAm + OwlPay Global) ─────────────────────────

export const COUNTRY_META = {
  // LatAm — Vita Wallet
  CO: { name: 'Colombia',         currency: 'COP', flagCode: 'co' },
  PE: { name: 'Perú',             currency: 'PEN', flagCode: 'pe' },
  BO: { name: 'Bolivia',          currency: 'BOB', flagCode: 'bo' },
  AR: { name: 'Argentina',        currency: 'ARS', flagCode: 'ar' },
  MX: { name: 'México',           currency: 'MXN', flagCode: 'mx' },
  BR: { name: 'Brasil',           currency: 'BRL', flagCode: 'br' },
  CL: { name: 'Chile',            currency: 'CLP', flagCode: 'cl' },
  EC: { name: 'Ecuador',          currency: 'USD', flagCode: 'ec' },
  VE: { name: 'Venezuela',        currency: 'USD', flagCode: 've' },
  PY: { name: 'Paraguay',         currency: 'PYG', flagCode: 'py' },
  UY: { name: 'Uruguay',          currency: 'UYU', flagCode: 'uy' },
  CR: { name: 'Costa Rica',       currency: 'CRC', flagCode: 'cr' },
  PA: { name: 'Panamá',           currency: 'USD', flagCode: 'pa' },
  DO: { name: 'Rep. Dominicana',  currency: 'DOP', flagCode: 'do' },
  GT: { name: 'Guatemala',        currency: 'GTQ', flagCode: 'gt' },
  SV: { name: 'El Salvador',      currency: 'USD', flagCode: 'sv' },
  HT: { name: 'Haití',            currency: 'USD', flagCode: 'ht' },
  // OwlPay Global
  US: { name: 'Estados Unidos',   currency: 'USD', flagCode: 'us' },
  GB: { name: 'Reino Unido',      currency: 'GBP', flagCode: 'gb' },
  EU: { name: 'Europa (SEPA)',    currency: 'EUR', flagCode: 'eu',
        keywords: 'españa spain alemania germany francia france italia italy portugal paises bajos netherlands irlanda austria belgica sepa euro' },
  ES: { name: 'España',           currency: 'EUR', flagCode: 'es' },
  PL: { name: 'Polonia',          currency: 'PLN', flagCode: 'pl' },
  HK: { name: 'Hong Kong',        currency: 'HKD', flagCode: 'hk' },
  CN: { name: 'China',            currency: 'CNY', flagCode: 'cn' },
  NG: { name: 'Nigeria',          currency: 'NGN', flagCode: 'ng' },
  IN: { name: 'India',            currency: 'INR', flagCode: 'in' },
  AE: { name: 'Emiratos Árabes',  currency: 'AED', flagCode: 'ae' },
  JP: { name: 'Japón',            currency: 'JPY', flagCode: 'jp' },
  SG: { name: 'Singapur',         currency: 'SGD', flagCode: 'sg' },
  AU: { name: 'Australia',        currency: 'AUD', flagCode: 'au' },
}

// No seleccionables para contactos nuevos (siguen en COUNTRY_META para
// renderizar contactos ya guardados con esos países):
//   AU — corredor bo-au inactivo: withdrawal-rules devuelve 404
//   ES — cubierto por EU (SEPA): el corredor bo-es usa destinationCountry='EU'
const NON_SELECTABLE_COUNTRIES = new Set(['AU', 'ES'])

const COUNTRY_LIST = Object.entries(COUNTRY_META)
  .filter(([code]) => !NON_SELECTABLE_COUNTRIES.has(code))
  .map(([code, m]) => ({ code, ...m }))

function flagUrl(flagCode) {
  return `https://flagcdn.com/w80/${flagCode}.png`
}

// ── Labels en español para campos Vita (OwlPay ya los tiene en config) ────────

const FIELD_LABELS = {
  beneficiary_name:            'Nombre completo del beneficiario',
  beneficiary_first_name:      'Nombre',
  beneficiary_last_name:       'Apellidos',
  company_name:                'Nombre de empresa',
  beneficiary_dob:             'Fecha de nacimiento',
  beneficiary_id_doc_number:   'Número de documento',
  beneficiary_document_type:   'Tipo de documento',
  beneficiary_document_number: 'Número de documento',
  beneficiary_email:           'Correo electrónico',
  beneficiary_address:         'Dirección',
  beneficiary_type:            'Tipo de beneficiario',
  street:                      'Calle y número',
  city:                        'Ciudad',
  state:                       'Estado / Provincia',
  state_province:              'Provincia / Estado',
  postal_code:                 'Código postal',
  zipcode:                     'Código postal',
  phone:                       'Teléfono',
  account_holder_name:         'Nombre del titular de la cuenta',
  account_type_bank:           'Tipo de cuenta',
  account_bank:                'Número de cuenta',
  bank_name:                   'Nombre del banco',
  account_number:              'Número de cuenta',
  routing_number:              'Número de ruta (ABA)',
  swift_code:                  'Código SWIFT / BIC',
  swift_bic:                   'Código SWIFT / BIC',
  transfer_purpose:            'Propósito de la transferencia',
  purpose:                     'Propósito del pago',
  purpose_comentary:           'Comentario',
  is_self_transfer:            '¿Transferencia a cuenta propia?',
}

const PURPOSE_CODE_LABELS = {
  ISSAVG: 'Ahorros personales',    ISGDDS: 'Pago de bienes',
  ISSCVE: 'Pago de servicios',     EPDISP: 'Disposición de fondos',
  ISSTDY: 'Estudios',              EPPROP: 'Compra de propiedad',
  EPFAMT: 'Transferencia familiar', EPREMT: 'Transferencia internacional',
  ISTAXS: 'Pago de impuestos',     EPIVST: 'Inversión',
  ISPAYR: 'Nómina / salario',      ISSUPP: 'Pago a proveedor',
  ISMDCS: 'Gastos médicos',        EPTOUR: 'Turismo y viajes',
}

const TRANSFER_PURPOSE_OPTIONS = [
  { value: 'FAMILY_MAINTENANCE',      label: 'Manutención familiar' },
  { value: 'TRANSFER_TO_OWN_ACCOUNT', label: 'Transferencia a cuenta propia' },
  { value: 'SALARY',                  label: 'Salario' },
  { value: 'DONATIONS',               label: 'Donaciones' },
  { value: 'EDUCATION',               label: 'Educación' },
  { value: 'MEDICAL_TREATMENT',       label: 'Gastos médicos' },
  { value: 'TRAVEL',                  label: 'Viaje' },
  { value: 'INVESTMENT_SHARES',       label: 'Inversión' },
  { value: 'ADVERTISING',             label: 'Publicidad' },
  { value: 'EXPORTED_GOODS',          label: 'Bienes exportados' },
  { value: 'GENERAL_GOODS_OFFLINE',   label: 'Bienes generales' },
]

const CN_PROVINCE_OPTIONS = [
  { value: 'AH', label: 'Anhui' },         { value: 'BJ', label: 'Beijing' },
  { value: 'CQ', label: 'Chongqing' },     { value: 'FJ', label: 'Fujian' },
  { value: 'GD', label: 'Guangdong' },     { value: 'GS', label: 'Gansu' },
  { value: 'GX', label: 'Guangxi' },       { value: 'GZ', label: 'Guizhou' },
  { value: 'HA', label: 'Henan' },         { value: 'HB', label: 'Hubei' },
  { value: 'HE', label: 'Hebei' },         { value: 'HI', label: 'Hainan' },
  { value: 'HL', label: 'Heilongjiang' },  { value: 'HN', label: 'Hunan' },
  { value: 'JL', label: 'Jilin' },         { value: 'JS', label: 'Jiangsu' },
  { value: 'JX', label: 'Jiangxi' },       { value: 'LN', label: 'Liaoning' },
  { value: 'NM', label: 'Mongolia Interior' }, { value: 'NX', label: 'Ningxia' },
  { value: 'QH', label: 'Qinghai' },       { value: 'SC', label: 'Sichuan' },
  { value: 'SD', label: 'Shandong' },      { value: 'SH', label: 'Shanghai' },
  { value: 'SN', label: 'Shaanxi' },       { value: 'SX', label: 'Shanxi' },
  { value: 'TJ', label: 'Tianjin' },       { value: 'XJ', label: 'Xinjiang' },
  { value: 'XZ', label: 'Tibet' },         { value: 'YN', label: 'Yunnan' },
  { value: 'ZJ', label: 'Zhejiang' },
]

// ── Validación de campo (versión robusta: patrón + validators avanzados) ──────

function validateField(field, value, ctx = {}) {
  const raw = value === true ? 'true' : value === false ? 'false' : (value ?? '')
  const v   = String(raw).trim()

  if (field.required && v === '') return 'Campo requerido'

  if (v !== '') {
    const maxLen = field.max ?? field.maxLength
    if (field.min && v.length < field.min) return `Mínimo ${field.min} caracteres`
    if (maxLen    && v.length > maxLen)    return `Máximo ${maxLen} caracteres`

    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
      return 'Correo electrónico inválido'
    if (field.type === 'phone' && !/^[+\d\s\-() ]{5,25}$/.test(v))
      return 'Número de teléfono inválido'

    if (field.pattern) {
      try {
        if (!new RegExp(field.pattern).test(v)) return field.hint ?? 'Formato inválido'
      } catch { /* regex inválida en config — ignorar */ }
    }

    // Validators avanzados: IBAN, CPF, CLABE, SWIFT, postal, etc.
    const enrichedCtx = {
      country:         ctx.country,
      addressCountry:  ibanCountry(ctx.values?.iban) ?? ctx.country,
      expectedCountry: ctx.country && ctx.country !== 'EU' ? ctx.country : null,
    }
    const customErr = runFieldValidator(field.key, v, enrichedCtx)
    if (customErr) return customErr
  }

  return null
}

// ── Campo individual ──────────────────────────────────────────────────────────

function DynamicField({ field, value, error, onChange, onBlur, countryCode }) {
  const { key, label, type, required, options, placeholder } = field

  const displayLabel =
    (key === 'routing_number' && countryCode === 'AU') ? 'Número BSB'
    : (FIELD_LABELS[key] ?? label)

  const base = `w-full bg-white border rounded-xl px-4 py-3.5 text-[0.9375rem] text-[#0D1F3C]
    placeholder:text-[#94A3B8] focus:outline-none transition-all font-[inherit]`
  const ok  = 'border-[#E2E8F0] focus:border-[#1D3461] focus:shadow-[0_0_0_2px_#1D346120]'
  const err = 'border-[#EF4444] shadow-[0_0_0_2px_#EF44441A]'

  const resolvedOptions =
    (Array.isArray(options) && options.length > 0)
      ? key === 'purpose'
          ? options.map(opt => ({ ...opt, label: PURPOSE_CODE_LABELS[opt.value] ?? opt.label }))
          : options
      : (key === 'transfer_purpose'                       ? TRANSFER_PURPOSE_OPTIONS
       : key === 'state_province' && countryCode === 'CN' ? CN_PROVINCE_OPTIONS
       : null)

  return (
    <div>
      <label className="block text-[0.75rem] font-semibold text-[#4A5568] uppercase tracking-wide mb-2">
        {displayLabel}
        {!required && (
          <span className="ml-1 text-[0.625rem] normal-case font-normal text-[#94A3B8]">(opcional)</span>
        )}
      </label>

      {/* Toggle booleano para is_self_transfer */}
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
          className={`${base} appearance-none cursor-pointer ${error ? err : ok}`}
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
          <input type="tel" value={value ?? ''} onChange={e => onChange(key, e.target.value)}
            onBlur={() => onBlur(key)} placeholder={placeholder || 'Número sin prefijo'}
            className={`${base} flex-1 ${error ? err : ok}`} />
        </div>

      ) : (
        <input
          type={type === 'email' ? 'email' : type === 'date' ? 'date' : 'text'}
          value={value ?? ''}
          onChange={e => onChange(key, e.target.value)}
          onBlur={() => onBlur(key)}
          placeholder={placeholder}
          maxLength={type === 'date' ? undefined : (field.maxLength ?? field.max ?? undefined)}
          className={`${base} ${error ? err : ok}`}
        />
      )}

      {error && <p className="mt-1 text-[0.6875rem] text-[#EF4444]">{error}</p>}
      {field.hint && !error && (
        <p className="mt-1 text-[0.6875rem] text-[#94A3B8] leading-relaxed">{field.hint}</p>
      )}
    </div>
  )
}

// ── Selector de país ──────────────────────────────────────────────────────────

function CountryPickerModal({ selected, onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const filtered = query.trim()
    ? COUNTRY_LIST.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.currency.toLowerCase().includes(query.toLowerCase()) ||
        c.code.toLowerCase().includes(query.toLowerCase()) ||
        (c.keywords ?? '').includes(query.toLowerCase()))
    : COUNTRY_LIST

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end' }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: '#FFFFFF', borderRadius: '24px 24px 0 0',
        maxHeight: '80dvh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 20px 0' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0D1F3C' }}>
            País destino
          </h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%',
            background: '#F4F6FA', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#4A5568" />
          </button>
        </div>

        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: 13,
              top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input autoFocus type="text" placeholder="Buscar país…" value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 38, paddingRight: 12,
                paddingTop: 10, paddingBottom: 10, borderRadius: 12, border: '1px solid #E2E8F0',
                background: '#F4F6FA', fontSize: '0.875rem', color: '#0D1F3C', outline: 'none',
                fontFamily: 'inherit' }} />
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1,
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          {filtered.map(c => {
            const isActive = selected === c.code
            return (
              <button key={c.code} onClick={() => { onSelect(c.code); onClose() }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                  padding: '12px 20px', background: isActive ? '#EEF2FF' : 'transparent',
                  border: 'none', borderBottom: '1px solid #F0F2F7',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                <img src={flagUrl(c.flagCode)} alt={c.name} width={44} height={44}
                  style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover',
                    border: '1px solid rgba(0,0,0,0.08)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.9375rem',
                    fontWeight: isActive ? 700 : 600, color: '#0D1F3C' }}>{c.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#4A5568' }}>
                    {c.currency}
                  </p>
                </div>
                {isActive && (
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1D3461',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={12} color="#fff" strokeWidth={2.5} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function VitaContactForm({
  initialDestinationCountry = null,
  initialNickname = '',
  initialValues = {},
  onSave,
  onCancel,
  saving = false,
  saveError = '',
  submitLabel = 'Guardar contacto',
}) {
  const [country,          setCountry]          = useState(initialDestinationCountry)
  const [showCountryModal, setShowCountryModal] = useState(false)
  const [nickname,         setNickname]         = useState(initialNickname)
  const [values,           setValues]           = useState(initialValues)
  const [touched,          setTouched]          = useState({})

  const countryLocked = !!initialDestinationCountry
  const meta          = COUNTRY_META[country]

  const { rules, payoutMethod, loading: rulesLoading, error: rulesError, refetch } =
    useWithdrawalRules(country)

  // ── Proveedor activo ───────────────────────────────────────────────────────
  const isOwlPay   = payoutMethod === 'owlPay'
  const owlPayForm = isOwlPay ? (OWLPAY_FORMS[country] ?? GENERIC_OWLPAY_FORM) : null

  // ── Campos activos según proveedor ─────────────────────────────────────────
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

  // Inicializar defaults de OwlPay al cambiar de proveedor (ej. is_self_transfer)
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

  // ── Contexto cross-field para validators ───────────────────────────────────
  const validatorCtx = useMemo(() => ({ country, values }), [country, values])

  // ── Validación general ─────────────────────────────────────────────────────
  const allValid = useMemo(() => {
    if (!country) return false
    return activeFields.every(f => !validateField(f, values[f.key], validatorCtx))
  }, [country, activeFields, values, validatorCtx])

  function handleChange(key, val) {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  function handleBlur(key) {
    setTouched(prev => ({ ...prev, [key]: true }))
  }

  function getError(field) {
    if (!touched[field.key]) return null
    return validateField(field, values[field.key], validatorCtx)
  }

  // ── Cambio de país: resetear formulario ───────────────────────────────────
  function handleCountrySelect(code) {
    setCountry(code)
    setValues({})
    setTouched({})
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  function handleSubmit() {
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
        if (f.key === 'is_self_transfer') {
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
          .map(f => [f.key, String(values[f.key]).trim()])
      )
    }

    // Extraer nombre y apellido según el formato del proveedor
    let firstName, lastName
    if (isOwlPay) {
      const fullName = beneficiaryData.beneficiary_name ?? ''
      const parts    = fullName.trim().split(/\s+/)
      firstName      = parts[0] ?? ''
      lastName       = parts.slice(1).join(' ')
    } else {
      firstName = beneficiaryData.beneficiary_first_name ?? ''
      lastName  = beneficiaryData.beneficiary_last_name  ?? ''
    }

    const formType     = isOwlPay ? 'owlpay' : 'vita'
    const destCurrency = meta?.currency ?? ''

    onSave({
      nickname:            nickname.trim() || undefined,
      firstName,
      lastName,
      destinationCountry:  country,
      destinationCurrency: destCurrency,
      formType,
      beneficiaryData,
    })
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">

      {/* País destino */}
      <div>
        <label className="block text-[0.75rem] font-semibold text-[#4A5568] uppercase tracking-wide mb-2">
          País destino *
        </label>
        {countryLocked ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
            background: '#F4F6FA', border: '1px solid #E2E8F0', borderRadius: 12 }}>
            {meta && (
              <img src={flagUrl(meta.flagCode)} alt={meta.name} width={28} height={28}
                style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            )}
            <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0D1F3C', flex: 1 }}>
              {meta?.name ?? country}
            </span>
            <span style={{ fontSize: '0.8125rem', color: '#94A3B8' }}>{meta?.currency}</span>
          </div>
        ) : (
          <button type="button" onClick={() => setShowCountryModal(true)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-[#E2E8F0]
              rounded-xl hover:border-[#1D3461] transition-colors text-left">
            {country && meta ? (
              <>
                <img src={flagUrl(meta.flagCode)} alt={meta.name} width={28} height={28}
                  style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                <span className="flex-1 text-[0.9375rem] font-semibold text-[#0D1F3C]">{meta.name}</span>
                <span className="text-[0.8125rem] text-[#94A3B8]">{meta.currency}</span>
              </>
            ) : (
              <span className="flex-1 text-[0.875rem] text-[#94A3B8]">
                Seleccionar país destino…
              </span>
            )}
          </button>
        )}
      </div>

      {/* Alias del contacto */}
      <div>
        <label className="block text-[0.75rem] font-semibold text-[#4A5568] uppercase tracking-wide mb-2">
          Alias{' '}
          <span className="text-[0.625rem] normal-case font-normal text-[#94A3B8]">(opcional)</span>
        </label>
        <input type="text" value={nickname} onChange={e => setNickname(e.target.value)}
          placeholder="Ej: Mamá, Proveedor Lima, Pedro trabajo"
          maxLength={50}
          className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3.5 text-[0.9375rem]
            text-[#0D1F3C] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1D3461]
            focus:shadow-[0_0_0_2px_#1D346120] transition-all" />
      </div>

      {/* Skeleton mientras carga */}
      {country && rulesLoading && (
        <div className="flex flex-col gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="h-3 w-28 rounded-full bg-[#E2E8F0] animate-pulse" />
              <div className="h-12 w-full rounded-xl bg-[#E2E8F0] animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Error al cargar las reglas */}
      {country && rulesError && !rulesLoading && (
        <div className="flex items-center gap-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3.5">
          <AlertCircle size={15} color="#EF4444" className="flex-shrink-0" />
          <p className="text-[0.8125rem] text-[#EF4444] flex-1">
            No se pudieron cargar los campos del formulario
          </p>
          <button onClick={refetch}
            className="text-[0.8125rem] font-semibold text-[#1D3461] hover:underline flex-shrink-0">
            Reintentar
          </button>
        </div>
      )}

      {/* Badge de proveedor */}
      {!rulesLoading && country && payoutMethod && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: isOwlPay ? '#EFF6FF' : '#F0FDF4',
          border: `1px solid ${isOwlPay ? '#BFDBFE' : '#BBF7D0'}`,
          borderRadius: 10, padding: '8px 12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, borderRadius: '50%',
            background: isOwlPay ? '#DBEAFE' : '#DCFCE7', flexShrink: 0 }}>
            {isOwlPay
              ? <Zap size={12} color="#1D4ED8" />
              : <Globe size={12} color="#15803D" />}
          </div>
          <div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700,
              color: isOwlPay ? '#1D4ED8' : '#15803D' }}>
              {isOwlPay ? 'OwlPay Harbor' : 'Vita Wallet'}
            </span>
            <span style={{ fontSize: '0.6875rem', color: isOwlPay ? '#3B82F6' : '#22C55E',
              marginLeft: 6 }}>
              {isOwlPay ? '· Transferencia internacional' : '· Red Latinoamérica'}
            </span>
          </div>
        </div>
      )}

      {/* ─── OwlPay: formulario estático con secciones ─────────────────────── */}
      {!rulesLoading && isOwlPay && owlPayForm && (
        <>
          {owlPayForm.title && (
            <p className="text-[0.8125rem] font-semibold text-[#1D3461] -mb-1">
              {owlPayForm.title}
            </p>
          )}
          {owlPayForm.fields.map((field, idx) => {
            const prevSection = idx > 0 ? owlPayForm.fields[idx - 1].section : null
            const showHeader  = field.section && field.section !== prevSection
            return (
              <div key={field.key} className="flex flex-col gap-3">
                {showHeader && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <p className="text-[0.6875rem] font-bold text-[#94A3B8] uppercase tracking-wider whitespace-nowrap">
                      {field.section}
                    </p>
                    <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
                  </div>
                )}
                <DynamicField
                  field={field}
                  value={values[field.key] ?? (field.default ?? '')}
                  error={getError(field)}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  countryCode={country}
                />
              </div>
            )
          })}
        </>
      )}

      {/* ─── Vita: campos dinámicos del backend ────────────────────────────── */}
      {!rulesLoading && !isOwlPay && vitaVisibleRules.map(field => (
        <DynamicField
          key={field.key}
          field={field}
          value={values[field.key] ?? ''}
          error={getError(field)}
          onChange={handleChange}
          onBlur={handleBlur}
          countryCode={country}
        />
      ))}

      {/* Error de guardado */}
      {saveError && (
        <div className="flex items-center gap-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3.5">
          <AlertCircle size={15} color="#EF4444" className="flex-shrink-0" />
          <p className="text-[0.8125rem] text-[#EF4444]">{saveError}</p>
        </div>
      )}

      {/* Acciones */}
      <div className={`flex gap-3 pt-1 ${!country ? 'opacity-0 pointer-events-none' : ''}`}>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="flex-1 py-3.5 rounded-2xl border border-[#E2E8F0] text-[0.9375rem] font-semibold
              text-[#4A5568] hover:bg-[#F4F6FA] transition-colors">
            Cancelar
          </button>
        )}
        <button type="button" onClick={handleSubmit}
          disabled={!allValid || saving || rulesLoading}
          className={`flex-1 py-3.5 rounded-2xl text-[0.9375rem] font-bold transition-all ${
            allValid && !saving && !rulesLoading
              ? 'bg-[#1D3461] text-white shadow-[0_4px_16px_rgba(29,52,97,0.25)] active:scale-[0.98]'
              : 'bg-[#1D346140] text-[#94A3B8] cursor-not-allowed'
          }`}
        >
          {saving
            ? <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Guardando…
              </span>
            : submitLabel
          }
        </button>
      </div>

      {showCountryModal && (
        <CountryPickerModal
          selected={country}
          onSelect={handleCountrySelect}
          onClose={() => setShowCountryModal(false)}
        />
      )}
    </div>
  )
}
