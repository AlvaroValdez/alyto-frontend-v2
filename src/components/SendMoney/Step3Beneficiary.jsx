/**
 * Step3Beneficiary.jsx — "¿A quién le envías?"
 *
 * Formulario 100% dinámico basado en las reglas reales de Vita Wallet.
 * Los campos se cargan desde GET /api/v1/payments/withdrawal-rules/:countryCode
 * y varían según el país destino seleccionado en el Step 1.
 *
 * Para corredores manuales Bolivia (isManualCorridor === true) se muestra
 * un formulario con toggle banco/QR:
 *   - bank_data: identidad + banco boliviano + N° cuenta + tipo cuenta
 *   - qr_image:  identidad + subida de imagen QR del beneficiario
 *
 * Características:
 *   - Skeleton de carga mientras llegan las reglas (solo flujo Vita)
 *   - Manejo de campos condicionales (campo "when")
 *   - Campos fc_* ocultos — se añaden automáticamente al submit
 *   - Validación onBlur por campo (required + min/max de longitud)
 *   - Botón "Continuar" deshabilitado hasta que todos los campos requeridos
 *     visibles sean válidos
 */

import { useState, useMemo, useRef, useEffect } from 'react'
import { useWithdrawalRules } from '../../hooks/useWithdrawalRules'
import { useAuth }             from '../../context/AuthContext'
import { Upload, Paperclip, X, Building2, QrCode } from 'lucide-react'

// ── Prefijos de teléfono por país ─────────────────────────────────────────────

const PHONE_PREFIXES = {
  CO: '+57', PE: '+51', AR: '+54', BO: '+591',
  MX: '+52', BR: '+55', CL: '+56', EC: '+593',
}

// ── Utilidades RUT chileno ────────────────────────────────────────────────────

/**
 * Formatea dígitos brutos a formato RUT: "12.345.678-9"
 * Acepta cualquier input mientras el usuario escribe.
 */
function formatRUT(input) {
  const raw = input.replace(/[^0-9kK]/g, '').toUpperCase()
  if (raw.length === 0) return ''
  if (raw.length === 1) return raw

  const verifier = raw.slice(-1)
  const body     = raw.slice(0, -1)

  let formatted = ''
  for (let i = 0; i < body.length; i++) {
    if (i > 0 && (body.length - i) % 3 === 0) formatted += '.'
    formatted += body[i]
  }
  return `${formatted}-${verifier}`
}

/**
 * Valida un RUT chileno con el algoritmo Módulo 11.
 * Acepta "12.345.678-9" o "12345678-9".
 */
function validateRUT(formatted) {
  const raw      = formatted.replace(/\./g, '').replace(/-/g, '').toUpperCase()
  if (raw.length < 2) return false
  const body     = raw.slice(0, -1)
  const verifier = raw.slice(-1)
  if (!/^\d+$/.test(body)) return false

  let sum = 0, mult = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum  += parseInt(body[i]) * mult
    mult  = mult === 7 ? 2 : mult + 1
  }
  const rem      = sum % 11
  const expected = rem === 0 ? '0' : rem === 1 ? 'K' : String(11 - rem)
  return verifier === expected
}

// ── Esqueleto de carga ────────────────────────────────────────────────────────

function FieldSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-3 w-24 rounded bg-[#1A2340] animate-pulse" />
      <div className="h-12 w-full rounded-xl bg-[#1A2340] animate-pulse" />
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <div>
        <div className="h-5 w-40 rounded bg-[#1A2340] animate-pulse mb-2" />
        <div className="h-3 w-56 rounded bg-[#1A2340] animate-pulse" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => <FieldSkeleton key={i} />)}
      <div className="h-14 w-full rounded-2xl bg-[#1A2340] animate-pulse mt-2" />
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

// ── Campo de opción única (select con 1 sola opción → textbox) ────────────────
// Emite el valor correcto al montar sin necesitar interacción del usuario.

function SingleOptionField({ fieldKey, label, value: fixedValue, currentValue, baseInput, borderOk, onChange, onBlur }) {
  useEffect(() => {
    if (currentValue !== fixedValue) {
      onChange(fieldKey, fixedValue)
      onBlur(fieldKey)
    }
  // Solo al montar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <input
      type="text"
      readOnly
      value={label}
      className={`${baseInput} cursor-default ${borderOk} opacity-80`}
    />
  )
}

// ── Campo RUT chileno ─────────────────────────────────────────────────────────

function RutField({ fieldKey, value, error, required, onChange, onBlur, baseInput, borderOk, borderErr }) {
  function handleChange(e) {
    onChange(fieldKey, formatRUT(e.target.value))
  }
  return (
    <div>
      <label className="block text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-wide mb-2">
        RUT
        {!required && (
          <span className="ml-1 text-[0.625rem] normal-case font-normal text-[#4E5A7A]">(opcional)</span>
        )}
      </label>
      <input
        type="text"
        inputMode="text"
        value={value}
        onChange={handleChange}
        onBlur={() => onBlur(fieldKey)}
        placeholder="12.345.678-9"
        maxLength={12}
        className={`${baseInput} ${error ? borderErr : borderOk}`}
      />
      {error && (
        <p className="mt-1 text-[0.6875rem] text-[#EF4444]">{error}</p>
      )}
    </div>
  )
}

// ── Campo individual ──────────────────────────────────────────────────────────

function DynamicField({ field, value, error, onChange, onBlur, countryCode }) {
  const { key, label, type, required, options, placeholder } = field

  const baseInput = `w-full bg-[#1A2340] border rounded-xl px-4 py-3.5 text-[0.9375rem] text-white
    placeholder:text-[#4E5A7A] focus:outline-none transition-all`
  const borderOk  = 'border-[#263050] focus:border-[#C4CBD8] focus:shadow-[0_0_0_2px_#C4CBD820]'
  const borderErr = 'border-[#EF4444] shadow-[0_0_0_2px_#EF44441A]'

  // Chile — tipo documento: campo único "rut" → ocultar visualmente pero mantener el auto-set
  if (key === 'beneficiary_document_type' && type === 'select' && options?.length === 1 && countryCode === 'CL') {
    return (
      <div className="hidden">
        <SingleOptionField
          fieldKey={key}
          label={options[0].label}
          value={options[0].value}
          currentValue={value}
          baseInput={baseInput}
          borderOk={borderOk}
          onChange={onChange}
          onBlur={onBlur}
        />
      </div>
    )
  }

  // Chile — número de documento: campo RUT con formato XX.XXX.XXX-X
  if (key === 'beneficiary_document_number' && countryCode === 'CL') {
    return (
      <RutField
        fieldKey={key}
        value={value}
        error={error}
        required={required}
        onChange={onChange}
        onBlur={onBlur}
        baseInput={baseInput}
        borderOk={borderOk}
        borderErr={borderErr}
      />
    )
  }

  return (
    <div>
      <label className="block text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-wide mb-2">
        {label}
        {!required && (
          <span className="ml-1 text-[0.625rem] normal-case font-normal text-[#4E5A7A]">(opcional)</span>
        )}
      </label>

      {type === 'select' && options?.length === 1 ? (
        // Un solo valor posible — mostrar como campo de texto no editable.
        // El valor real (options[0].value) se emite en onChange al renderizar.
        <SingleOptionField
          fieldKey={key}
          label={options[0].label}
          value={options[0].value}
          currentValue={value}
          baseInput={baseInput}
          borderOk={borderOk}
          onChange={onChange}
          onBlur={onBlur}
        />

      ) : type === 'select' ? (
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
          <span className="flex items-center px-3 bg-[#1A2340] border border-[#263050] rounded-xl
            text-[0.875rem] text-[#8A96B8] flex-shrink-0 min-w-[64px] justify-center">
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

// ── Campos fijos para corredor manual Bolivia ─────────────────────────────────

const BOLIVIA_FIELDS = [
  { key: 'beneficiary_first_name', label: 'Nombre',     type: 'text',  required: true,  placeholder: 'Ej: Carlos',    min: 2, max: 50 },
  { key: 'beneficiary_last_name',  label: 'Apellido',   type: 'text',  required: true,  placeholder: 'Ej: García',    min: 2, max: 50 },
  { key: 'beneficiary_document',   label: 'CI Bolivia', type: 'text',  required: true,  placeholder: 'Ej: 12345678',  min: 5, max: 15 },
  { key: 'beneficiary_phone',      label: 'Teléfono',   type: 'phone', required: false, placeholder: '70000000' },
]

const BOLIVIA_BANK_FIELDS = [
  {
    key: 'beneficiary_bank', label: 'Banco', type: 'select', required: true,
    options: [
      { value: 'Banco Bisa',              label: 'Banco Bisa' },
      { value: 'Banco Mercantil Santa Cruz', label: 'Banco Mercantil Santa Cruz' },
      { value: 'Banco Nacional de Bolivia', label: 'Banco Nacional de Bolivia' },
      { value: 'Banco Unión',             label: 'Banco Unión' },
      { value: 'Banco FIE',               label: 'Banco FIE' },
      { value: 'Banco Ganadero',          label: 'Banco Ganadero' },
      { value: 'Banco Económico',         label: 'Banco Económico' },
      { value: 'Banco Sol',               label: 'Banco Sol' },
      { value: 'Banco de Crédito de Bolivia', label: 'Banco de Crédito de Bolivia' },
      { value: 'Banco Fortaleza',          label: 'Banco Fortaleza' },
      { value: 'BancoSol',                label: 'BancoSol' },
      { value: 'Banco Prodem',            label: 'Banco Prodem' },
    ],
  },
  {
    key: 'beneficiary_account_type', label: 'Tipo de cuenta', type: 'select', required: true,
    options: [
      { value: 'Caja de Ahorro',   label: 'Caja de Ahorro' },
      { value: 'Cuenta Corriente', label: 'Cuenta Corriente' },
    ],
  },
  { key: 'beneficiary_account_number', label: 'N° de cuenta', type: 'text', required: true, placeholder: 'Ej: 1234567890', min: 5, max: 25 },
]

// ── Toggle banco / QR ────────────────────────────────────────────────────────

function PayoutTypeToggle({ value, onChange }) {
  const opts = [
    { id: 'bank_data',  icon: Building2, label: 'Cuenta bancaria' },
    { id: 'qr_image',   icon: QrCode,    label: 'QR de cobro' },
  ]
  return (
    <div className="flex gap-2">
      {opts.map(o => {
        const active = value === o.id
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-[0.875rem] font-semibold transition-all ${
              active
                ? 'bg-[#C4CBD81A] border-[#C4CBD8] text-white'
                : 'bg-[#1A2340] border-[#263050] text-[#8A96B8] hover:border-[#C4CBD833]'
            }`}
          >
            <o.icon size={16} />
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// ── QR upload ────────────────────────────────────────────────────────────────

function QRUpload({ qrBase64, onQrChange }) {
  const inputRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return
    const reader = new FileReader()
    reader.onload = (ev) => onQrChange(ev.target.result)
    reader.readAsDataURL(file)
  }

  function handleRemove() {
    onQrChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-3">
      <label className="block text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-wide">
        QR del beneficiario
      </label>

      {qrBase64 ? (
        <div className="relative inline-block">
          <img
            src={qrBase64}
            alt="QR beneficiario"
            className="w-[180px] h-[180px] rounded-xl bg-white p-1.5 object-contain border border-[#263050]"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#EF4444] flex items-center justify-center text-white"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-2 w-full py-8 rounded-xl border border-dashed border-[#C4CBD833] text-[#8A96B8] hover:text-white hover:border-[#C4CBD850] transition-colors cursor-pointer">
          <Upload size={20} />
          <span className="text-[0.875rem]">Subir imagen del QR</span>
          <span className="text-[0.6875rem] text-[#4E5A7A]">JPG o PNG — máx. 5MB</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={handleFile}
          />
        </label>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Step3Beneficiary({ destinationCountry, onNext, isManualCorridor = false }) {
  // Para corredores manuales Bolivia se pasa null al hook para evitar la llamada
  // a la API de Vita (hook maneja null devolviendo rules:[], loading:false).
  const { rules, loading, error: loadError, refetch } = useWithdrawalRules(
    isManualCorridor ? null : destinationCountry,
  )
  const { user } = useAuth()

  // Bolivia manual: toggle between bank_data and qr_image payout types
  const [payoutType, setPayoutType] = useState('bank_data')
  const [qrBase64, setQrBase64]     = useState(null)

  // Campos activos: Bolivia simplificado + bank fields (if bank_data) o solo identidad (if qr_image)
  const activeFields = isManualCorridor
    ? (payoutType === 'bank_data'
        ? [...BOLIVIA_FIELDS, ...BOLIVIA_BANK_FIELDS]
        : BOLIVIA_FIELDS)
    : rules

  const [values,  setValues]  = useState({})
  const [touched, setTouched] = useState({})

  // ── Campos visibles (aplicar lógica "when" — solo flujo Vita) ───────────────
  const visibleFields = useMemo(() => {
    // Bolivia: mostrar todos los campos estáticos (no tienen lógica "when" ni fc_*)
    if (isManualCorridor) return activeFields
    // Vita: excluir fc_* y aplicar condicionales "when"
    return activeFields.filter(field => {
      if (field.key.startsWith('fc_')) return false
      if (!field.when) return true
      const refValue = values[field.when.key] ?? ''
      const expected = field.when.value
      if (Array.isArray(expected)) return expected.includes(refValue)
      return refValue === expected
    })
  }, [activeFields, isManualCorridor, values])

  function handleChange(key, value) {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  function handleBlur(key) {
    setTouched(prev => ({ ...prev, [key]: true }))
  }

  function getError(field) {
    if (!touched[field.key]) return null
    // Chile: validación RUT con Módulo 11
    if (destinationCountry === 'CL' && field.key === 'beneficiary_document_number') {
      const v = (values[field.key] ?? '').trim()
      if (field.required && v === '') return 'Campo requerido'
      if (v !== '' && !validateRUT(v)) return 'RUT inválido'
      return null
    }
    return validateField(field, values[field.key])
  }

  // El formulario es válido cuando todos los campos requeridos visibles tienen valor correcto
  const fieldsValid = useMemo(() =>
    visibleFields.every(f => {
      if (destinationCountry === 'CL' && f.key === 'beneficiary_document_number') {
        const v = (values[f.key] ?? '').trim()
        if (f.required && v === '') return false
        if (v !== '' && !validateRUT(v)) return false
        return true
      }
      return !validateField(f, values[f.key])
    }),
  [visibleFields, values, destinationCountry])

  // For qr_image type, also require the QR to be uploaded
  const allValid = isManualCorridor && payoutType === 'qr_image'
    ? fieldsValid && !!qrBase64
    : fieldsValid

  function handleNext() {
    if (!allValid) {
      const allTouched = Object.fromEntries(visibleFields.map(f => [f.key, true]))
      setTouched(prev => ({ ...prev, ...allTouched }))
      return
    }

    const beneficiaryData = Object.fromEntries(
      visibleFields
        .filter(f => (values[f.key] ?? '').trim() !== '')
        .map(f => {
          let val = values[f.key].trim()
          // Chile: enviar RUT sin puntos → "12345678-9" (Vita no requiere el formato con puntos)
          if (destinationCountry === 'CL' && f.key === 'beneficiary_document_number') {
            val = val.replace(/\./g, '')
          }
          return [f.key, val]
        }),
    )

    // Guardar el label legible del banco para mostrarlo en Step4 (no se envía a Vita)
    visibleFields.forEach(f => {
      if (f.type === 'select' && f.options && values[f.key]) {
        const opt = f.options.find(o => o.value === values[f.key])
        if (opt) beneficiaryData[`${f.key}_label`] = opt.label
      }
    })

    // Bolivia manual: include payout type and QR image if applicable
    if (isManualCorridor) {
      beneficiaryData.type = payoutType
      if (payoutType === 'qr_image' && qrBase64) {
        beneficiaryData.qr_image = qrBase64
      }
    }

    console.log('[Step3] beneficiaryData enviado:', JSON.stringify({
      ...beneficiaryData,
      qr_image: beneficiaryData.qr_image ? '[base64]' : undefined,
    }))
    onNext({ beneficiaryData })
  }

  // ── Estados de carga y error ──────────────────────────────────────────────

  if (loading) return <LoadingSkeleton />

  if (loadError) {
    return (
      <div className="flex flex-col gap-4 px-4 pb-4">
        <div>
          <h2 className="text-[1.125rem] font-bold text-white">¿A quién le envías?</h2>
          <p className="text-[0.8125rem] text-[#8A96B8] mt-0.5">Ingresa los datos bancarios del beneficiario</p>
        </div>

        <div className="bg-[#EF44441A] border border-[#EF44441A] rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-[0.875rem] text-[#F87171]">
            No se pudieron cargar los campos del formulario.
          </p>
          <p className="text-[0.75rem] text-[#8A96B8]">{loadError}</p>
          <button
            onClick={refetch}
            className="self-start px-4 py-2 rounded-xl border border-[#C4CBD833] text-[0.875rem]
              font-semibold text-[#C4CBD8] hover:bg-[#C4CBD81A] transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // ── Formulario ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">

      {/* Título */}
      <div>
        <h2 className="text-[1.125rem] font-bold text-white">¿A quién le envías?</h2>
        <p className="text-[0.8125rem] text-[#8A96B8] mt-0.5">
          {isManualCorridor
            ? 'Ingresa los datos del beneficiario en Bolivia'
            : 'Ingresa los datos bancarios del beneficiario'}
        </p>
      </div>

      {/* Toggle banco / QR (solo Bolivia manual) */}
      {isManualCorridor && (
        <div className="space-y-2">
          <label className="block text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-wide">
            ¿Cómo recibe el pago?
          </label>
          <PayoutTypeToggle value={payoutType} onChange={setPayoutType} />
        </div>
      )}

      {/* Campos */}
      {visibleFields.map(field => (
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

      {/* QR upload (solo si payoutType === 'qr_image') */}
      {isManualCorridor && payoutType === 'qr_image' && (
        <QRUpload qrBase64={qrBase64} onQrChange={setQrBase64} />
      )}

      {/* Nota de seguridad */}
      <div className="flex items-start gap-2.5 bg-[#1A2340] rounded-xl px-3.5 py-3">
        <span className="text-base flex-shrink-0">🔒</span>
        <p className="text-[0.6875rem] text-[#8A96B8] leading-relaxed">
          Tus datos están cifrados y protegidos. Solo los usamos para procesar este pago.
        </p>
      </div>

      {/* Botón continuar */}
      <button
        onClick={handleNext}
        disabled={!allValid}
        className={`w-full py-4 rounded-2xl text-[0.9375rem] font-bold transition-all duration-150 ${
          allValid
            ? 'bg-[#C4CBD8] text-[#0F1628] shadow-[0_4px_20px_rgba(196,203,216,0.3)] active:scale-[0.98]'
            : 'bg-[#C4CBD840] text-[#4E5A7A] cursor-not-allowed'
        }`}
      >
        Continuar
      </button>
    </div>
  )
}
