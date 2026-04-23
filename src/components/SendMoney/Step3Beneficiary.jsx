/**
 * Step3Beneficiary.jsx — "¿A quién le envías?"
 *
 * Formulario 100% dinámico basado en las reglas reales de Vita Wallet.
 * Los campos se cargan desde GET /api/v1/payments/withdrawal-rules/:countryCode
 * y varían según el país destino seleccionado en el Step 1.
 *
 * Características:
 *   - Skeleton de carga mientras llegan las reglas
 *   - Manejo de campos condicionales (campo "when")
 *   - Campos fc_* ocultos — se añaden automáticamente al submit
 *   - Validación onBlur por campo (required + min/max de longitud)
 *   - Botón "Continuar" deshabilitado hasta que todos los campos requeridos
 *     visibles sean válidos
 */

import { useState, useMemo, useEffect } from 'react'
import { useWithdrawalRules } from '../../hooks/useWithdrawalRules'
import { useAuth }             from '../../context/AuthContext'
import { createContact }       from '../../services/api'
import ContactPicker           from '../Contacts/ContactPicker'

// ── Prefijos de teléfono por país ─────────────────────────────────────────────

const PHONE_PREFIXES = {
  CO: '+57', PE: '+51', AR: '+54', BO: '+591',
  MX: '+52', BR: '+55', CL: '+56', EC: '+593',
}

// ── Esqueleto de carga ────────────────────────────────────────────────────────

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
  const v = (value ?? '').toString().trim()

  if (field.required && v === '') return 'Campo requerido'

  if (v !== '') {
    if (field.min && v.length < field.min) return `Mínimo ${field.min} caracteres`
    if (field.max && v.length > field.max) return `Máximo ${field.max} caracteres`

    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      return 'Correo electrónico inválido'
    }
    if (field.type === 'phone' && !/^[+\d\s\-()\u00A0]{5,25}$/.test(v)) {
      return 'Número de teléfono inválido'
    }
  }

  return null
}

// ── Campo individual ──────────────────────────────────────────────────────────

function DynamicField({ field, value, error, onChange, onBlur, countryCode }) {
  const { key, label, type, required, options, placeholder } = field

  const baseInput = `w-full bg-white border rounded-xl px-4 py-3.5 text-[0.9375rem] text-[#0D1F3C]
    placeholder:text-[#94A3B8] focus:outline-none transition-all`
  const borderOk  = 'border-[#E2E8F0] focus:border-[#1D3461] focus:shadow-[0_0_0_2px_#1D346120]'
  const borderErr = 'border-[#EF4444] shadow-[0_0_0_2px_#EF44441A]'

  return (
    <div>
      <label className="block text-[0.75rem] font-semibold text-[#4A5568] uppercase tracking-wide mb-2">
        {label}
        {!required && (
          <span className="ml-1 text-[0.625rem] normal-case font-normal text-[#94A3B8]">(opcional)</span>
        )}
      </label>

      {type === 'select' ? (
        <select
          value={value}
          onChange={e => onChange(key, e.target.value)}
          onBlur={() => onBlur(key)}
          className={`${baseInput} appearance-none ${error ? borderErr : borderOk}`}
        >
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
          <input
            type="tel"
            value={value}
            onChange={e => onChange(key, e.target.value)}
            onBlur={() => onBlur(key)}
            placeholder={placeholder || 'Número sin prefijo'}
            className={`${baseInput} flex-1 ${error ? borderErr : borderOk}`}
          />
        </div>

      ) : (
        <input
          type={type === 'email' ? 'email' : 'text'}
          value={value}
          onChange={e => onChange(key, e.target.value)}
          onBlur={() => onBlur(key)}
          placeholder={placeholder}
          className={`${baseInput} ${error ? borderErr : borderOk}`}
        />
      )}

      {error && (
        <p className="mt-1 text-[0.6875rem] text-[#EF4444]">{error}</p>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Step3Beneficiary({ destinationCountry, onNext }) {
  const { rules, payoutMethod, loading, error: loadError, refetch } = useWithdrawalRules(destinationCountry)
  const { user } = useAuth()

  const [values,  setValues]  = useState({})
  const [touched, setTouched] = useState({})

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

  // ── Campos visibles (aplicar lógica "when") ───────────────────────────────
  const visibleRules = useMemo(() => {
    // Excluir campos fc_* — son internos y se añaden al submit
    return rules.filter(field => {
      if (field.key.startsWith('fc_')) return false
      if (!field.when) return true
      // Mostrar solo si el campo referenciado tiene el valor indicado
      const refValue = values[field.when.key] ?? ''
      const expected = field.when.value
      if (Array.isArray(expected)) return expected.includes(refValue)
      return refValue === expected
    })
  }, [rules, values])

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

  // El formulario es válido cuando todos los campos requeridos visibles tienen valor correcto
  const allValid = useMemo(() =>
    visibleRules.every(f => !validateField(f, values[f.key])),
  [visibleRules, values])

  async function handleNext() {
    if (!allValid) {
      const allTouched = Object.fromEntries(visibleRules.map(f => [f.key, true]))
      setTouched(prev => ({ ...prev, ...allTouched }))
      return
    }

    const beneficiaryData = Object.fromEntries(
      visibleRules
        .filter(f => (values[f.key] ?? '').trim() !== '')
        .map(f => [f.key, values[f.key].trim()]),
    )

    // Save contact (non-blocking — never fails the transfer)
    if (saveAsContact && !isSavedContact) {
      try {
        const firstName = beneficiaryData.beneficiary_first_name ?? ''
        const lastName  = beneficiaryData.beneficiary_last_name  ?? ''
        const alias     = contactAlias.trim() || `${firstName} ${lastName}`.trim()
        await createContact({
          nickname:            alias,
          firstName,
          lastName,
          destinationCountry:  destinationCountry,
          destinationCurrency: '',
          formType:            payoutMethod === 'owlPay' ? 'owlpay' : 'vita',
          beneficiaryData,
        })
      } catch (err) {
        console.warn('[Contacts] Failed to save contact:', err.message)
      }
    }

    onNext({ beneficiaryData, contactId })
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

  // ── Formulario dinámico ───────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">

      {/* Título */}
      <div>
        <h2 className="text-[1.125rem] font-bold text-[#0D1F3C]">¿A quién le envías?</h2>
        <p className="text-[0.8125rem] text-[#4A5568] mt-0.5">
          Ingresa los datos bancarios del beneficiario
        </p>
      </div>

      {/* Contactos guardados — picker inline, hidden once a contact is selected */}
      {!prefillName && (
        <ContactPicker
          destinationCountry={destinationCountry}
          selectedId={contactId}
          onSelect={handleContactPick}
        />
      )}

      {/* Prefill banner — shown when coming from Contacts page or ContactPicker */}
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

      {/* Campos dinámicos */}
      {visibleRules.map(field => (
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

      {/* Guardar como contacto — hidden if prefill already loaded a saved contact */}
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

            {/* Pill toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={saveAsContact}
              onClick={() => setSaveAsContact(v => !v)}
              style={{
                flexShrink:  0,
                width:       44,
                height:      24,
                borderRadius: 12,
                background:  saveAsContact ? 'var(--color-primary)' : '#CBD5E1',
                border:      'none',
                cursor:      'pointer',
                position:    'relative',
                transition:  'background 0.2s',
                padding:     0,
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
                  `${values['beneficiary_first_name'] ?? ''} ${values['beneficiary_last_name'] ?? ''}`.trim() ||
                  'Ej: Marina Colombia'
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
