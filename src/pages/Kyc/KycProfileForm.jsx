/**
 * KycProfileForm.jsx — Información de cumplimiento (CDD) previa a la biometría.
 *
 * Recolecta los elementos que Stripe Identity no provee y que Harbor/anchors
 * exigen para reusar nuestro KYC (evita el doble KYC):
 *   fecha de nacimiento · nacionalidad · teléfono · domicilio · origen de fondos
 *
 * Se renderiza dentro de KycPage cuando emailVerified && !kycProfileCompleted.
 * Al guardar con éxito, llama onComplete() para avanzar a la verificación Stripe.
 */

import { useState, useEffect } from 'react'
import { ClipboardCheck, AlertCircle, Loader2 } from 'lucide-react'
import Input  from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import { useAuth } from '../../context/AuthContext'
import { getUserProfile, updateKycProfile } from '../../services/api'
import { COUNTRIES, SOURCE_OF_FUNDS } from '../../utils/kycOptions'

const SectionLabel = ({ children }) => (
  <p className="text-[0.6875rem] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1 mt-1">
    {children}
  </p>
)

export default function KycProfileForm({ onComplete }) {
  const { updateUser } = useAuth()

  const [form, setForm] = useState({
    dateOfBirth:   '',
    nationality:   '',
    phone:         '',
    sourceOfFunds: '',
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
          dateOfBirth:   dob,
          nationality:   p.nationality   ?? '',
          phone:         p.phone         ?? '',
          sourceOfFunds: p.sourceOfFunds ?? '',
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
    if (!form.phone.trim())  e.phone         = 'Requerido'
    if (!form.sourceOfFunds) e.sourceOfFunds = 'Selecciona una opción'
    if (!form.street.trim()) e.street        = 'Requerido'
    if (!form.city.trim())   e.city          = 'Requerido'
    if (!form.country)       e.country       = 'Selecciona el país'
    return e
  }

  async function handleSubmit() {
    const e = validate()
    if (Object.keys(e).length > 0) {
      setErrors(e)
      setTopError('Revisa los campos marcados.')
      return
    }
    setLoading(true)
    setTopError('')
    try {
      await updateKycProfile({
        dateOfBirth:   form.dateOfBirth,
        nationality:   form.nationality,
        sourceOfFunds: form.sourceOfFunds,
        phone:         form.phone.trim(),
        address: {
          street:  form.street.trim(),
          city:    form.city.trim(),
          state:   form.state.trim(),
          zip:     form.zip.trim(),
          country: form.country,
        },
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
