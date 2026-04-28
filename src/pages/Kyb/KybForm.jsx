/**
 * KybForm.jsx — Formulario de solicitud KYB en 3 pasos para Alyto V2.0
 *
 * Paso 1 — Datos de la empresa
 * Paso 2 — Representante legal
 * Paso 3 — Operativa + documentos
 *
 * Al enviar → POST /api/v1/kyb/apply (multipart) → redirect a /kyb/status
 */

import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, CheckCircle2, Upload,
  X, FileText, Loader2, Building2, User, Globe,
} from 'lucide-react'
import { applyKyb } from '../../services/kybService'
import { useAuth } from '../../context/AuthContext'

// ── Catálogos ──────────────────────────────────────────────────────────────

const COUNTRIES = [
  { value: 'BO', label: 'Bolivia' },
  { value: 'CL', label: 'Chile' },
  { value: 'PE', label: 'Perú' },
  { value: 'AR', label: 'Argentina' },
  { value: 'CO', label: 'Colombia' },
  { value: 'BR', label: 'Brasil' },
  { value: 'MX', label: 'México' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'ES', label: 'España' },
  { value: 'CN', label: 'China' },
  { value: 'AE', label: 'Emiratos Árabes Unidos' },
  { value: 'OTHER', label: 'Otro' },
]

const COMPANY_TYPES = [
  { value: 'SRL', label: 'Sociedad de Responsabilidad Limitada (SRL)' },
  { value: 'SA',  label: 'Sociedad Anónima (SA)' },
  { value: 'SpA', label: 'Sociedad por Acciones (SpA)' },
  { value: 'LLC', label: 'Limited Liability Company (LLC)' },
  { value: 'LLP', label: 'Limited Liability Partnership (LLP)' },
  { value: 'IND', label: 'Empresa Individual' },
  { value: 'OTHER', label: 'Otro' },
]

const INDUSTRIES = [
  { value: 'trade',     label: 'Comercio internacional' },
  { value: 'import',    label: 'Importación / Exportación' },
  { value: 'tech',      label: 'Tecnología' },
  { value: 'finance',   label: 'Servicios financieros' },
  { value: 'mining',    label: 'Minería' },
  { value: 'agro',      label: 'Agricultura / Agroindustria' },
  { value: 'construct', label: 'Construcción' },
  { value: 'manuf',     label: 'Manufactura' },
  { value: 'transport', label: 'Transporte / Logística' },
  { value: 'retail',    label: 'Comercio minorista' },
  { value: 'health',    label: 'Salud' },
  { value: 'education', label: 'Educación' },
  { value: 'other',     label: 'Otro' },
]

const DOC_TYPES = [
  { value: 'CI',       label: 'Cédula de identidad' },
  { value: 'PASSPORT', label: 'Pasaporte' },
  { value: 'DNI',      label: 'DNI' },
  { value: 'OTHER',    label: 'Otro' },
]

const VOLUMES = [
  { value: '0-10k',     label: 'Menos de $10.000 USD' },
  { value: '10k-50k',   label: '$10.000 – $50.000 USD' },
  { value: '50k-100k',  label: '$50.000 – $100.000 USD' },
  { value: '100k-500k', label: '$100.000 – $500.000 USD' },
  { value: '500k+',     label: 'Más de $500.000 USD' },
]

const SRL_CORRIDORS = [
  { value: 'bo-us',  label: 'Bolivia → EEUU' },
  { value: 'bo-cn',  label: 'Bolivia → China' },
  { value: 'bo-cl',  label: 'Bolivia → Chile' },
  { value: 'bo-pa',  label: 'Bolivia → Panamá' },
  { value: 'bo-pe',  label: 'Bolivia → Perú' },
  { value: 'bo-eu',  label: 'Bolivia → Europa' },
  { value: 'bo-ar',  label: 'Bolivia → Argentina' },
  { value: 'bo-br',  label: 'Bolivia → Brasil' },
  { value: 'bo-co',  label: 'Bolivia → Colombia' },
  { value: 'bo-mx',  label: 'Bolivia → México' },
  { value: 'bo-ae',  label: 'Bolivia → Emiratos' },
  { value: 'bo-ng',  label: 'Bolivia → Nigeria' },
  { value: 'global', label: 'Global' },
]

const SPA_CORRIDORS = [
  { value: 'cl-us',  label: 'Chile → EEUU' },
  { value: 'cl-cn',  label: 'Chile → China' },
  { value: 'cl-eu',  label: 'Chile → Europa' },
  { value: 'cl-ar',  label: 'Chile → Argentina' },
  { value: 'cl-br',  label: 'Chile → Brasil' },
  { value: 'cl-co',  label: 'Chile → Colombia' },
  { value: 'cl-mx',  label: 'Chile → México' },
  { value: 'cl-pe',  label: 'Chile → Perú' },
  { value: 'global', label: 'Global' },
]

const DOCS_SCHEMA = [
  { key: 'docTaxId',          label: 'RUT/NIT de la empresa',     required: true  },
  { key: 'docConstitution',   label: 'Escritura de constitución', required: true  },
  { key: 'docRepId',          label: 'CI del representante legal', required: true  },
  { key: 'docDomicile',       label: 'Comprobante de domicilio',  required: false },
  { key: 'docBankStatement',  label: 'Estado de cuenta bancaria', required: false },
]

// ── Clases reutilizables ───────────────────────────────────────────────────

const inputCls = 'w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white border border-[#263050] bg-[#1A2340] focus:outline-none focus:border-[#C4CBD8] focus:shadow-[0_0_0_2px_#C4CBD820] placeholder-[#4E5A7A]'
const labelCls = 'block text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-1.5'
const selectCls = `${inputCls} appearance-none`

// ── Step indicator ─────────────────────────────────────────────────────────

function StepIndicator({ step, total }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1
        const done   = n < step
        const active = n === step
        return (
          <div key={n} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[0.75rem] font-bold transition-all"
              style={{
                background: done ? '#22C55E1A' : active ? '#C4CBD8' : '#1A2340',
                border: `1.5px solid ${done ? '#22C55E' : active ? '#C4CBD8' : '#263050'}`,
                color: done ? '#22C55E' : active ? '#0F1628' : '#4E5A7A',
              }}
            >
              {done ? <CheckCircle2 size={14} /> : n}
            </div>
            {n < total && (
              <div
                className="w-8 h-px"
                style={{ background: done ? '#22C55E66' : '#263050' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Paso 1 — Datos de la empresa ───────────────────────────────────────────

function Step1({ form, onChange }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Building2 size={18} className="text-[#C4CBD8]" />
        <h2 className="text-[1rem] font-bold text-white">Datos de la empresa</h2>
      </div>

      <div>
        <label className={labelCls}>Razón social *</label>
        <input
          className={inputCls}
          placeholder="AV Finance SRL"
          value={form.legalName}
          onChange={e => onChange('legalName', e.target.value)}
        />
      </div>

      <div>
        <label className={labelCls}>Nombre comercial</label>
        <input
          className={inputCls}
          placeholder="Alyto"
          value={form.tradeName}
          onChange={e => onChange('tradeName', e.target.value)}
        />
      </div>

      <div>
        <label className={labelCls}>RUT / NIT *</label>
        <input
          className={inputCls}
          placeholder="123456789"
          value={form.taxId}
          onChange={e => onChange('taxId', e.target.value)}
        />
      </div>

      <div>
        <label className={labelCls}>País de constitución *</label>
        <select
          className={selectCls}
          value={form.country}
          onChange={e => onChange('country', e.target.value)}
        >
          <option value="">Seleccionar país</option>
          {COUNTRIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Tipo de empresa *</label>
        <select
          className={selectCls}
          value={form.companyType}
          onChange={e => onChange('companyType', e.target.value)}
        >
          <option value="">Seleccionar tipo</option>
          {COMPANY_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Industria / Rubro *</label>
        <select
          className={selectCls}
          value={form.industry}
          onChange={e => onChange('industry', e.target.value)}
        >
          <option value="">Seleccionar industria</option>
          {INDUSTRIES.map(i => (
            <option key={i.value} value={i.value}>{i.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Sitio web</label>
        <input
          className={inputCls}
          placeholder="https://empresa.com"
          type="url"
          value={form.website}
          onChange={e => onChange('website', e.target.value)}
        />
      </div>

      <div>
        <label className={labelCls}>Teléfono corporativo *</label>
        <input
          className={inputCls}
          placeholder="+591 2 123 4567"
          type="tel"
          value={form.phone}
          onChange={e => onChange('phone', e.target.value)}
        />
      </div>

      <div>
        <label className={labelCls}>Dirección de la empresa *</label>
        <input
          className={inputCls}
          placeholder="Calle Comercio 123, La Paz"
          value={form.address}
          onChange={e => onChange('address', e.target.value)}
        />
      </div>
    </div>
  )
}

// ── Paso 2 — Representante legal ───────────────────────────────────────────

function Step2({ form, onChange }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <User size={18} className="text-[#C4CBD8]" />
        <h2 className="text-[1rem] font-bold text-white">Representante legal</h2>
      </div>

      <div>
        <label className={labelCls}>Nombre completo *</label>
        <input
          className={inputCls}
          placeholder="Juan Pérez López"
          value={form.repName}
          onChange={e => onChange('repName', e.target.value)}
        />
      </div>

      <div>
        <label className={labelCls}>Tipo de documento *</label>
        <select
          className={selectCls}
          value={form.repDocType}
          onChange={e => onChange('repDocType', e.target.value)}
        >
          <option value="">Seleccionar tipo</option>
          {DOC_TYPES.map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Número de documento *</label>
        <input
          className={inputCls}
          placeholder="12345678"
          value={form.repDocNumber}
          onChange={e => onChange('repDocNumber', e.target.value)}
        />
      </div>

      <div>
        <label className={labelCls}>Email corporativo *</label>
        <input
          className={inputCls}
          placeholder="juan.perez@empresa.com"
          type="email"
          value={form.repEmail}
          onChange={e => onChange('repEmail', e.target.value)}
        />
      </div>

      <div>
        <label className={labelCls}>Teléfono del representante *</label>
        <input
          className={inputCls}
          placeholder="+591 71234567"
          type="tel"
          value={form.repPhone}
          onChange={e => onChange('repPhone', e.target.value)}
        />
      </div>
    </div>
  )
}

// ── Paso 3 — Operativa + documentos ───────────────────────────────────────

function Step3({ form, onChange, files, onFileChange, corridorOptions }) {
  const inputRefs = useRef({})

  function toggleCorridor(val) {
    const current = form.corridors ?? []
    const updated = current.includes(val)
      ? current.filter(c => c !== val)
      : [...current, val]
    onChange('corridors', updated)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <Globe size={18} className="text-[#C4CBD8]" />
        <h2 className="text-[1rem] font-bold text-white">Operativa y documentos</h2>
      </div>

      {/* Volumen mensual */}
      <div>
        <label className={labelCls}>Volumen mensual estimado *</label>
        <select
          className={selectCls}
          value={form.estimatedVolume}
          onChange={e => onChange('estimatedVolume', e.target.value)}
        >
          <option value="">Seleccionar rango</option>
          {VOLUMES.map(v => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Corredores */}
      <div>
        <label className={labelCls}>Corredores de interés *</label>
        <div className="grid grid-cols-2 gap-2">
          {corridorOptions.map(c => {
            const selected = (form.corridors ?? []).includes(c.value)
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => toggleCorridor(c.value)}
                className="px-3 py-2 rounded-xl text-[0.8125rem] font-medium text-left transition-all"
                style={{
                  background: selected ? '#C4CBD81A' : '#1A2340',
                  border: `1px solid ${selected ? '#C4CBD8' : '#263050'}`,
                  color: selected ? '#C4CBD8' : '#8A96B8',
                }}
              >
                {selected && <span className="mr-1">✓</span>}
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Descripción del negocio */}
      <div>
        <label className={labelCls}>Descripción del negocio *</label>
        <textarea
          className={`${inputCls} resize-none`}
          rows={4}
          placeholder="Describa brevemente la actividad principal de su empresa y el propósito de los pagos internacionales…"
          value={form.businessDescription}
          onChange={e => onChange('businessDescription', e.target.value)}
        />
      </div>

      {/* Documentos */}
      <div>
        <label className={labelCls}>Documentos</label>
        <div className="space-y-2">
          {DOCS_SCHEMA.map(doc => {
            const file = files[doc.key]
            return (
              <div
                key={doc.key}
                className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer"
                style={{ background: '#1A2340', border: `1px solid ${file ? '#22C55E33' : '#263050'}` }}
                onClick={() => inputRefs.current[doc.key]?.click()}
              >
                <input
                  ref={el => (inputRefs.current[doc.key] = el)}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={e => onFileChange(doc.key, e.target.files[0] ?? null)}
                />
                {file ? (
                  <CheckCircle2 size={16} className="text-[#22C55E] flex-shrink-0" />
                ) : (
                  <Upload size={16} className="text-[#4E5A7A] flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[0.8125rem] font-medium text-white truncate">
                    {file ? file.name : doc.label}
                  </p>
                  {!file && (
                    <p className="text-[0.6875rem] text-[#4E5A7A]">
                      {doc.required ? 'Requerido' : 'Opcional'} · PDF, JPG, PNG
                    </p>
                  )}
                </div>
                {file && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); onFileChange(doc.key, null) }}
                    className="text-[#4E5A7A] hover:text-[#EF4444] transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────

const INITIAL_FORM = {
  // Step 1
  legalName: '', tradeName: '', taxId: '', country: '',
  companyType: '', industry: '', website: '', phone: '', address: '',
  // Step 2
  repName: '', repDocType: '', repDocNumber: '', repEmail: '', repPhone: '',
  // Step 3
  estimatedVolume: '', corridors: [], businessDescription: '',
}

const INITIAL_FILES = {
  docTaxId: null, docConstitution: null, docRepId: null,
  docDomicile: null, docBankStatement: null,
}

export default function KybForm() {
  const navigate          = useNavigate()
  const { user }          = useAuth()
  const [step, setStep]   = useState(1)
  const [form, setForm]   = useState(INITIAL_FORM)
  const [files, setFiles] = useState(INITIAL_FILES)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const corridorOptions = user?.legalEntity === 'SpA'
    ? SPA_CORRIDORS
    : SRL_CORRIDORS

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleFileChange(key, file) {
    setFiles(prev => ({ ...prev, [key]: file }))
  }

  // ── Validación por paso ───────────────────────────────────────────────────

  function validateStep(n) {
    if (n === 1) {
      if (!form.legalName.trim()) return 'La razón social es requerida'
      if (!form.taxId.trim())     return 'El RUT/NIT es requerido'
      if (!form.country)          return 'Selecciona el país de constitución'
      if (!form.companyType)      return 'Selecciona el tipo de empresa'
      if (!form.industry)         return 'Selecciona la industria'
      if (!form.phone.trim())     return 'El teléfono corporativo es requerido'
      if (!form.address.trim())   return 'La dirección es requerida'
    }
    if (n === 2) {
      if (!form.repName.trim())      return 'El nombre del representante es requerido'
      if (!form.repDocType)          return 'Selecciona el tipo de documento'
      if (!form.repDocNumber.trim()) return 'El número de documento es requerido'
      if (!form.repEmail.trim())     return 'El email del representante es requerido'
      if (!form.repPhone.trim())     return 'El teléfono del representante es requerido'
    }
    if (n === 3) {
      if (!form.estimatedVolume)           return 'Selecciona el volumen mensual estimado'
      if (!form.corridors?.length)         return 'Selecciona al menos un corredor de interés'
      if (!form.businessDescription.trim()) return 'La descripción del negocio es requerida'
      if (!files.docTaxId)                 return 'El documento RUT/NIT es requerido'
      if (!files.docConstitution)          return 'La escritura de constitución es requerida'
      if (!files.docRepId)                 return 'La CI del representante legal es requerida'
    }
    return null
  }

  function handleNext() {
    const err = validateStep(step)
    if (err) { setError(err); return }
    setError(null)
    setStep(s => s + 1)
    window.scrollTo(0, 0)
  }

  async function handleSubmit() {
    const err = validateStep(3)
    if (err) { setError(err); return }
    setError(null)
    setSaving(true)

    try {
      const fd = new FormData()

      // Construir businessData JSON con nombres que espera el backend
      const fileEntries = Object.entries(files).filter(([, v]) => v)
      const businessData = {
        legalName:              form.legalName,
        tradeName:              form.tradeName,
        taxId:                  form.taxId,
        countryOfIncorporation: form.country,
        businessType:           form.companyType,
        industry:               form.industry,
        website:                form.website,
        phone:                  form.phone,
        address:                form.address,
        legalRepresentative: {
          name:      form.repName,
          docType:   form.repDocType,
          docNumber: form.repDocNumber,
          email:     form.repEmail,
          phone:     form.repPhone,
        },
        estimatedMonthlyVolume: form.estimatedVolume,
        mainCorridors:          form.corridors,
        businessDescription:    form.businessDescription,
        documentTypes:          fileEntries.map(([key]) => key),
      }
      fd.append('businessData', JSON.stringify(businessData))

      // Archivos — todos bajo el campo 'documentos' (multer upload.array)
      fileEntries.forEach(([, file]) => {
        fd.append('documentos', file, file.name)
      })

      await applyKyb(fd)
      navigate('/kyb/status')
    } catch (err) {
      setError(err.message || 'Error al enviar la solicitud')
    } finally {
      setSaving(false)
    }
  }

  const STEP_LABELS = ['Empresa', 'Representante', 'Operativa']
  const isLastStep  = step === 3

  return (
    <div className="min-h-screen bg-[#0F1628] font-sans flex flex-col max-w-[430px] mx-auto">
      <div className="flex-1 overflow-y-auto scrollbar-hide pb-8">

        {/* ── Header ── */}
        <div className="px-5 pt-8 pb-4">
          <button
            onClick={() => step > 1 ? (setStep(s => s - 1), setError(null)) : navigate('/kyb')}
            className="mb-5 flex items-center gap-2 text-[#8A96B8] text-[0.875rem] hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            {step > 1 ? 'Paso anterior' : 'Volver'}
          </button>
          <p className="text-[0.75rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-1">
            Solicitud Business — Paso {step} de 3
          </p>
          <h1 className="text-[1.125rem] font-bold text-white">{STEP_LABELS[step - 1]}</h1>
        </div>

        {/* ── Step indicator ── */}
        <div className="px-5">
          <StepIndicator step={step} total={3} />
        </div>

        {/* ── Form content ── */}
        <div className="px-5">
          {step === 1 && <Step1 form={form} onChange={handleChange} />}
          {step === 2 && <Step2 form={form} onChange={handleChange} />}
          {step === 3 && (
            <Step3
              form={form}
              onChange={handleChange}
              files={files}
              onFileChange={handleFileChange}
              corridorOptions={corridorOptions}
            />
          )}

          {/* Error */}
          {error && (
            <div
              className="mt-4 px-4 py-3 rounded-xl text-[0.875rem] text-[#EF4444]"
              style={{ background: '#EF44441A', border: '1px solid #EF444433' }}
            >
              {error}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={isLastStep ? handleSubmit : handleNext}
            disabled={saving}
            className="mt-6 w-full py-3.5 rounded-xl text-[0.9375rem] font-bold text-[#0F1628] flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
            style={{
              background: '#C4CBD8',
              boxShadow: '0 4px 20px rgba(196,203,216,0.3)',
            }}
          >
            {saving ? (
              <><Loader2 size={16} className="animate-spin" /> Enviando…</>
            ) : isLastStep ? (
              <><CheckCircle2 size={16} /> Enviar solicitud</>
            ) : (
              <>Siguiente <ArrowRight size={16} /></>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
