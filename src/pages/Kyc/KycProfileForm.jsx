/**
 * KycProfileForm.jsx — Información de cumplimiento (CDD) previa a la biometría.
 *
 * Recolecta los elementos que Stripe Identity no provee y que Harbor/anchors
 * exigen para reusar nuestro KYC (evita el doble KYC):
 *   fecha de nacimiento · nacionalidad · documento (CI/RUT) · teléfono ·
 *   domicilio · origen de fondos
 *
 * El número de documento DECLARADO es la fuente primaria para el Comprobante
 * Oficial ASFI — Stripe Identity no devuelve id_number de forma confiable
 * para CI boliviano.
 *
 * Se renderiza dentro de KycPage cuando emailVerified && !kycProfileCompleted.
 * Al guardar con éxito, llama onComplete() para avanzar a la verificación Stripe.
 */

import { useState, useEffect } from 'react'
import { ClipboardCheck, AlertCircle, Loader2 } from 'lucide-react'
import Input  from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import { useAuth } from '../../context/AuthContext'
import { getUserProfile, updateKycProfile, declararPep, RELACIONES_PEP } from '../../services/api'
import { COUNTRIES, SOURCE_OF_FUNDS } from '../../utils/kycOptions'

const SectionLabel = ({ children }) => (
  <p className="text-[0.6875rem] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1 mt-1">
    {children}
  </p>
)

export default function KycProfileForm({ onComplete }) {
  const { updateUser } = useAuth()

  const [form, setForm] = useState({
    dateOfBirth:    '',
    nationality:    '',
    documentNumber: '',
    phone:          '',
    sourceOfFunds:  '',
    street: '', city: '', state: '', zip: '', country: '',
  })
  const [errors,     setErrors]     = useState({})
  const [topError,   setTopError]   = useState('')
  const [loading,    setLoading]    = useState(false)
  const [prefilling, setPrefilling] = useState(true)

  // Pre-llenar con lo que ya exista en el perfil (reanudar onboarding).
  useEffect(() => {
    let alive = true
    getUserProfile()
      .then(p => {
        if (!alive || !p) return
        const dob = p.dateOfBirth ? String(p.dateOfBirth).slice(0, 10) : ''
        setForm(f => ({
          ...f,
          dateOfBirth:    dob,
          nationality:    p.nationality    ?? '',
          documentNumber: p.documentNumber ?? '',
          phone:          p.phone          ?? '',
          sourceOfFunds:  p.sourceOfFunds  ?? '',
          street:  p.address?.street  ?? '',
          city:    p.address?.city    ?? '',
          state:   p.address?.state   ?? '',
          zip:     p.address?.zip     ?? '',
          country: p.address?.country ?? '',
        }))
      })
      .catch(() => {})
      .finally(() => { if (alive) setPrefilling(false) })
    return () => { alive = false }
  }, [])

  function set(name, value) {
    setForm(f => ({ ...f, [name]: value }))
    if (errors[name]) setErrors(e => ({ ...e, [name]: undefined }))
    setTopError('')
  }
  const onInput = e => set(e.target.name, e.target.value)

  function validate() {
    const e = {}
    if (!form.dateOfBirth) {
      e.dateOfBirth = 'Requerido'
    } else {
      const age = (Date.now() - new Date(form.dateOfBirth).getTime()) / (365.25 * 864e5)
      if (Number.isNaN(age))      e.dateOfBirth = 'Fecha inválida'
      else if (age < 18)          e.dateOfBirth = 'Debes ser mayor de 18 años'
      else if (age > 120)         e.dateOfBirth = 'Fecha inválida'
    }
    if (!form.nationality)   e.nationality   = 'Selecciona tu nacionalidad'
    const doc = form.documentNumber.trim()
    if (!doc)                                e.documentNumber = 'Requerido'
    else if (doc.length < 4 || doc.length > 30) e.documentNumber = 'Entre 4 y 30 caracteres'
    if (!form.phone.trim())  e.phone         = 'Requerido'
    if (!form.sourceOfFunds) e.sourceOfFunds = 'Selecciona una opción'
    if (!form.street.trim()) e.street        = 'Requerido'
    if (!form.city.trim())   e.city          = 'Requerido'
    if (!form.country)       e.country       = 'Selecciona el país'
    return e
  }

  // Declaración PEP. Es obligatoria en el sentido de que hay que RESPONDER,
  // no de que haya que ser PEP: dejarla en blanco deja al usuario en riesgo
  // "desconocido", que no es lo mismo que riesgo bajo.
  const [esPep, setEsPep]       = useState(null)   // null = sin responder
  const [relacionPep, setRelPep] = useState(null)
  const [cargoPep, setCargoPep]  = useState('')

  async function handleSubmit() {
    const e = validate()
    if (esPep === null) e.pep = 'Indica si eres una persona expuesta políticamente.'
    if (esPep === true && !relacionPep) e.pep = 'Indica cuál es tu relación con el cargo.'
    if (Object.keys(e).length > 0) {
      setErrors(e)
      setTopError('Revisa los campos marcados.')
      return
    }
    setLoading(true)
    setTopError('')
    try {
      await updateKycProfile({
        dateOfBirth:    form.dateOfBirth,
        nationality:    form.nationality,
        documentNumber: form.documentNumber.trim(),
        sourceOfFunds:  form.sourceOfFunds,
        phone:          form.phone.trim(),
        address: {
          street:  form.street.trim(),
          city:    form.city.trim(),
          state:   form.state.trim(),
          zip:     form.zip.trim(),
          country: form.country,
        },
      })
      // Va después del perfil y en llamada aparte: si esta fallara, el perfil ya
      // quedó guardado y el usuario no pierde lo escrito. El backend trata la
      // ausencia de declaración como riesgo desconocido, no como riesgo bajo.
      await declararPep({
        esPep,
        relacion: esPep ? relacionPep : undefined,
        cargo:    esPep ? cargoPep.trim() : undefined,
      })

      updateUser({ kycProfileCompleted: true })
      onComplete?.()
    } catch (err) {
      setTopError(err?.data?.error || err.message || 'No pudimos guardar tus datos. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  if (prefilling) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={28} className="text-[#233E58] animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Hero */}
      <div className="flex flex-col items-center py-4">
        <div
          className="w-20 h-20 rounded-[22px] flex items-center justify-center mb-5"
          style={{
            background: 'linear-gradient(135deg, #F0FDF9 0%, #FFFFFF 100%)',
            border:     '1.5px solid #233E5833',
            boxShadow:  '0 8px 32px rgba(35,62,88,0.12), inset 0 1px 0 rgba(35,62,88,0.1)',
          }}
        >
          <ClipboardCheck size={34} className="text-[#233E58]" />
        </div>
        <h2 className="text-[1.375rem] font-bold text-[#0F172A] text-center mb-2">Información de cumplimiento</h2>
        <p className="text-[0.875rem] text-[#64748B] text-center leading-relaxed px-2">
          Necesitamos algunos datos para cumplir con la normativa financiera (CDD).
          Toma menos de un minuto.
        </p>
      </div>

      {/* Datos personales */}
      <SectionLabel>Datos personales</SectionLabel>
      <Input
        label="Fecha de nacimiento" type="date" name="dateOfBirth"
        value={form.dateOfBirth} onChange={onInput} error={errors.dateOfBirth}
      />
      <Select
        label="Nacionalidad" name="nationality" value={form.nationality}
        onChange={onInput} options={COUNTRIES.map(c => ({ value: c.code, label: c.name }))}
        placeholder="Selecciona tu nacionalidad" error={errors.nationality}
      />
      <Input
        label="Número de documento" name="documentNumber"
        placeholder="CI / RUT / Pasaporte" value={form.documentNumber}
        onChange={onInput} error={errors.documentNumber}
      />
      <Input
        label="Teléfono" type="tel" name="phone" inputMode="tel"
        placeholder="+591 70000000" value={form.phone} onChange={onInput}
        error={errors.phone}
      />

      {/* Domicilio */}
      <SectionLabel>Domicilio</SectionLabel>
      <Input
        label="Dirección" name="street" placeholder="Calle y número"
        value={form.street} onChange={onInput} error={errors.street}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Ciudad" name="city" value={form.city} onChange={onInput} error={errors.city} />
        <Input label="Estado / Depto." name="state" value={form.state} onChange={onInput} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input label="Código postal" name="zip" value={form.zip} onChange={onInput} />
        <Select
          label="País" name="country" value={form.country} onChange={onInput}
          options={COUNTRIES.map(c => ({ value: c.code, label: c.name }))}
          placeholder="País" error={errors.country}
        />
      </div>

      {/* Origen de fondos */}
      <SectionLabel>Origen de los fondos</SectionLabel>
      <Select
        label="¿De dónde provienen tus fondos?" name="sourceOfFunds"
        value={form.sourceOfFunds} onChange={onInput} options={SOURCE_OF_FUNDS}
        placeholder="Selecciona una opción" error={errors.sourceOfFunds}
      />

      {topError && (
        <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#EF44441A] border border-[#EF444433]">
          <AlertCircle size={16} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
          <p className="text-[0.8125rem] text-[#EF4444]">{topError}</p>
        </div>
      )}

      {/* ── Declaración de Persona Expuesta Políticamente ──────────────────
          Control primario de identificación de PEP: no hay lista pública fiable
          para Bolivia. Se explica para qué sirve, porque un usuario que no
          entiende la pregunta responde que no por si acaso. */}
      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-white border border-[#E2E8F0]">
        <div>
          <p className="text-[0.9375rem] font-semibold text-[#0D1F3C]">
            ¿Eres una persona expuesta políticamente?
          </p>
          <p className="text-[0.75rem] text-[#64748B] mt-1 leading-relaxed">
            Son quienes ocupan o han ocupado cargos públicos destacados, y sus familiares
            cercanos y allegados. Responder que sí <strong>no limita tu cuenta</strong>:
            solo nos obliga a una revisión adicional, como exige la normativa.
          </p>
        </div>

        <div className="flex gap-2">
          {[{ v: false, t: 'No' }, { v: true, t: 'Sí' }].map(o => (
            <button
              key={String(o.v)}
              type="button"
              onClick={() => { setEsPep(o.v); if (!o.v) { setRelPep(null); setCargoPep('') } }}
              className="flex-1 py-2.5 rounded-xl text-[0.875rem] font-semibold transition-colors"
              style={{
                border:     esPep === o.v ? '1px solid #0D1F3C' : '1px solid #E2E8F0',
                background: esPep === o.v ? '#0D1F3C' : '#FFFFFF',
                color:      esPep === o.v ? '#FFFFFF' : '#0D1F3C',
              }}
            >
              {o.t}
            </button>
          ))}
        </div>

        {esPep === true && (
          <div className="flex flex-col gap-2">
            <p className="text-[0.8125rem] font-medium text-[#0D1F3C]">¿Cuál es tu relación con el cargo?</p>
            {RELACIONES_PEP.map(r => (
              <button
                key={r.clave}
                type="button"
                onClick={() => setRelPep(r.clave)}
                className="text-left px-3 py-2.5 rounded-xl text-[0.8125rem] transition-colors"
                style={{
                  border:     relacionPep === r.clave ? '1px solid #0D1F3C' : '1px solid #E2E8F0',
                  background: relacionPep === r.clave ? '#0D1F3C0D' : '#FFFFFF',
                  color:      '#0D1F3C',
                }}
              >
                {r.etiqueta}
              </button>
            ))}
            <input
              type="text"
              value={cargoPep}
              onChange={(e) => setCargoPep(e.target.value)}
              placeholder="Cargo e institución (opcional)"
              maxLength={300}
              className="w-full px-3 py-2.5 rounded-xl text-[0.8125rem] outline-none"
              style={{ border: '1px solid #E2E8F0', color: '#0D1F3C' }}
            />
          </div>
        )}

        {errors.pep && (
          <p className="text-[0.75rem] text-[#EF4444]">{errors.pep}</p>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="w-full py-4 rounded-2xl font-bold text-[0.9375rem] flex items-center justify-center gap-2.5 transition-all duration-150 mt-1"
        style={{
          background: loading ? '#233E5899' : '#233E58',
          color:      'white',
          boxShadow:  '0 4px 20px rgba(35,62,88,0.3)',
          cursor:     loading ? 'wait' : 'pointer',
        }}
      >
        {loading
          ? <><Loader2 size={18} className="animate-spin" /> Guardando…</>
          : 'Continuar a la verificación'}
      </button>

      <p className="text-[0.625rem] text-[#94A3B8] text-center leading-relaxed">
        Tus datos se usan solo para cumplimiento regulatorio (ASFI / KYC) y nunca se comparten con fines comerciales.
      </p>
    </div>
  )
}
