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

import { useState, useMemo } from 'react'
import { useWithdrawalRules } from '../../hooks/useWithdrawalRules'
import { useAuth }             from '../../context/AuthContext'

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
  const { rules, loading, error: loadError, refetch } = useWithdrawalRules(destinationCountry)
  const { user } = useAuth()

  const [values,  setValues]  = useState({})
  const [touched, setTouched] = useState({})

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

  function handleNext() {
    if (!allValid) {
      // Marcar todos los campos visibles como touched para revelar errores
      const allTouched = Object.fromEntries(visibleRules.map(f => [f.key, true]))
      setTouched(prev => ({ ...prev, ...allTouched }))
      return
    }

    // Construir objeto plano con todos los campos visibles (sin vacíos)
    const beneficiaryData = Object.fromEntries(
      visibleRules
        .filter(f => (values[f.key] ?? '').trim() !== '')
        .map(f => [f.key, values[f.key].trim()]),
    )

    // Los campos fc_* se añaden automáticamente desde el perfil del usuario
    // El backend los incluirá en el withdrawal (fc_customer_type, fc_legal_name, etc.)
    // No se envían desde el frontend para evitar manipulación

    console.log('[Step3] beneficiaryData enviado:', JSON.stringify(beneficiaryData))
    onNext({ beneficiaryData })
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

      {/* Botón continuar */}
      <button
        onClick={handleNext}
        disabled={!allValid}
        className={`w-full py-4 rounded-2xl text-[0.9375rem] font-bold transition-all duration-150 ${
          allValid
            ? 'bg-[#1D3461] text-[#0F1628] shadow-[0_4px_20px_rgba(29,52,97,0.25)] active:scale-[0.98]'
            : 'bg-[#1D346140] text-[#94A3B8] cursor-not-allowed'
        }`}
      >
        Continuar
      </button>
    </div>
  )
}
