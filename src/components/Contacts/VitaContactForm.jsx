/**
 * VitaContactForm.jsx — Formulario dinámico de contacto reutilizable.
 *
 * Usa los mismos campos que retorna GET /payments/withdrawal-rules/:country
 * (tanto Vita Wallet como OwlPay Harbor), garantizando que las claves del
 * beneficiaryData coincidan exactamente con lo que espera el backend al crear
 * la transacción.
 *
 * Props:
 *   initialDestinationCountry — string ISO-2 | null  (null = el usuario elige)
 *   initialNickname           — string
 *   initialValues             — object con keys de beneficiaryData
 *   onSave(data)              — callback con { nickname, firstName, lastName,
 *                               destinationCountry, destinationCurrency,
 *                               formType, beneficiaryData }
 *   onCancel                  — callback (muestra botón Cancelar)
 *   saving                    — boolean
 *   saveError                 — string
 *   submitLabel               — string (default "Guardar contacto")
 */

import { useState, useMemo } from 'react'
import { AlertCircle, Loader2, X, Search, Check } from 'lucide-react'
import { useWithdrawalRules } from '../../hooks/useWithdrawalRules'

// ── Constantes ────────────────────────────────────────────────────────────────

const PHONE_PREFIXES = {
  CO: '+57', PE: '+51', AR: '+54', BO: '+591',
  MX: '+52', BR: '+55', CL: '+56', EC: '+593',
  VE: '+58', GT: '+502', SV: '+503', ES: '+34',
  PL: '+48', HK: '+852', HT: '+509', PA: '+507',
  DO: '+1', CR: '+506', PY: '+595', UY: '+598',
  US: '+1', GB: '+44', CN: '+86', NG: '+234',
}

const COUNTRY_META = {
  CO: { name: 'Colombia',        currency: 'COP', flagCode: 'co' },
  PE: { name: 'Perú',            currency: 'PEN', flagCode: 'pe' },
  BO: { name: 'Bolivia',         currency: 'BOB', flagCode: 'bo' },
  AR: { name: 'Argentina',       currency: 'ARS', flagCode: 'ar' },
  MX: { name: 'México',          currency: 'MXN', flagCode: 'mx' },
  BR: { name: 'Brasil',          currency: 'BRL', flagCode: 'br' },
  CL: { name: 'Chile',           currency: 'CLP', flagCode: 'cl' },
  EC: { name: 'Ecuador',         currency: 'USD', flagCode: 'ec' },
  VE: { name: 'Venezuela',       currency: 'USD', flagCode: 've' },
  PY: { name: 'Paraguay',        currency: 'PYG', flagCode: 'py' },
  UY: { name: 'Uruguay',         currency: 'UYU', flagCode: 'uy' },
  CR: { name: 'Costa Rica',      currency: 'CRC', flagCode: 'cr' },
  PA: { name: 'Panamá',          currency: 'USD', flagCode: 'pa' },
  DO: { name: 'Rep. Dominicana', currency: 'DOP', flagCode: 'do' },
  GT: { name: 'Guatemala',       currency: 'GTQ', flagCode: 'gt' },
  SV: { name: 'El Salvador',     currency: 'USD', flagCode: 'sv' },
  HT: { name: 'Haití',           currency: 'USD', flagCode: 'ht' },
  US: { name: 'Estados Unidos',  currency: 'USD', flagCode: 'us' },
  GB: { name: 'Reino Unido',     currency: 'GBP', flagCode: 'gb' },
  ES: { name: 'España',          currency: 'EUR', flagCode: 'es' },
  PL: { name: 'Polonia',         currency: 'PLN', flagCode: 'pl' },
  HK: { name: 'Hong Kong',       currency: 'HKD', flagCode: 'hk' },
  CN: { name: 'China',           currency: 'CNY', flagCode: 'cn' },
  NG: { name: 'Nigeria',         currency: 'NGN', flagCode: 'ng' },
}

const COUNTRY_LIST = Object.entries(COUNTRY_META).map(([code, m]) => ({ code, ...m }))

function flagUrl(flagCode) {
  return `https://flagcdn.com/w80/${flagCode}.png`
}

// ── Validación ────────────────────────────────────────────────────────────────

function validateField(field, value) {
  const v = (value ?? '').toString().trim()
  if (field.required && v === '') return 'Campo requerido'
  if (v !== '') {
    if (field.min && v.length < field.min) return `Mínimo ${field.min} caracteres`
    if (field.max && v.length > field.max) return `Máximo ${field.max} caracteres`
    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
      return 'Correo electrónico inválido'
    if (field.type === 'phone' && !/^[+\d\s\-() ]{5,25}$/.test(v))
      return 'Número de teléfono inválido'
  }
  return null
}

// ── Campo individual ──────────────────────────────────────────────────────────

function DynamicField({ field, value, error, onChange, onBlur, countryCode }) {
  const { key, label, type, required, options, placeholder } = field

  const base = `w-full bg-white border rounded-xl px-4 py-3.5 text-[0.9375rem] text-[#0D1F3C]
    placeholder:text-[#94A3B8] focus:outline-none transition-all font-[inherit]`
  const ok  = 'border-[#E2E8F0] focus:border-[#1D3461] focus:shadow-[0_0_0_2px_#1D346120]'
  const err = 'border-[#EF4444] shadow-[0_0_0_2px_#EF44441A]'

  return (
    <div>
      <label className="block text-[0.75rem] font-semibold text-[#4A5568] uppercase tracking-wide mb-2">
        {label}
        {!required && (
          <span className="ml-1 text-[0.625rem] normal-case font-normal text-[#94A3B8]">(opcional)</span>
        )}
      </label>

      {type === 'select' ? (
        <select value={value} onChange={e => onChange(key, e.target.value)} onBlur={() => onBlur(key)}
          className={`${base} appearance-none cursor-pointer ${error ? err : ok}`}>
          <option value="">Seleccionar...</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

      ) : type === 'phone' ? (
        <div className="flex gap-2">
          <span className="flex items-center px-3 bg-white border border-[#E2E8F0] rounded-xl
            text-[0.875rem] text-[#4A5568] flex-shrink-0 min-w-[64px] justify-center">
            {PHONE_PREFIXES[countryCode] ?? ''}
          </span>
          <input type="tel" value={value} onChange={e => onChange(key, e.target.value)}
            onBlur={() => onBlur(key)} placeholder={placeholder || 'Número sin prefijo'}
            className={`${base} flex-1 ${error ? err : ok}`} />
        </div>

      ) : (
        <input type={type === 'email' ? 'email' : 'text'} value={value}
          onChange={e => onChange(key, e.target.value)} onBlur={() => onBlur(key)}
          placeholder={placeholder}
          className={`${base} ${error ? err : ok}`} />
      )}

      {error && <p className="mt-1 text-[0.6875rem] text-[#EF4444]">{error}</p>}
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
        c.code.toLowerCase().includes(query.toLowerCase()))
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
                  <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: isActive ? 700 : 600,
                    color: '#0D1F3C' }}>{c.name}</p>
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

  const visibleRules = useMemo(() => rules.filter(field => {
    if (field.key.startsWith('fc_')) return false
    if (!field.when) return true
    const refValue = values[field.when.key] ?? ''
    const expected = field.when.value
    if (Array.isArray(expected)) return expected.includes(refValue)
    return refValue === expected
  }), [rules, values])

  const allValid = useMemo(() =>
    !!country && visibleRules.every(f => !validateField(f, values[f.key]))
  , [country, visibleRules, values])

  function handleChange(key, val) {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  function handleBlur(key) {
    setTouched(prev => ({ ...prev, [key]: true }))
  }

  function getError(field) {
    if (!touched[field.key]) return null
    return validateField(field, values[field.key])
  }

  function handleSubmit() {
    if (!allValid) {
      const allTouched = Object.fromEntries(visibleRules.map(f => [f.key, true]))
      setTouched(prev => ({ ...prev, ...allTouched }))
      return
    }

    const beneficiaryData = Object.fromEntries(
      visibleRules
        .filter(f => (values[f.key] ?? '').trim() !== '')
        .map(f => [f.key, values[f.key].trim()])
    )

    const firstName    = beneficiaryData['beneficiary_first_name'] ?? ''
    const lastName     = beneficiaryData['beneficiary_last_name']  ?? ''
    const formType     = payoutMethod === 'owlPay' ? 'owlpay' : 'vita'
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

  return (
    <div className="flex flex-col gap-4">

      {/* País — selector o pill locked */}
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

      {/* Alias */}
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

      {/* Skeleton de carga */}
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

      {/* Error de carga de reglas */}
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

      {/* Campos dinámicos */}
      {!rulesLoading && visibleRules.map(field => (
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
          onSelect={setCountry}
          onClose={() => setShowCountryModal(false)}
        />
      )}
    </div>
  )
}
