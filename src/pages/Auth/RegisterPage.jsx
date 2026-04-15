/**
 * RegisterPage.jsx — Registro de nuevo usuario (2 pasos)
 *
 * Paso 1: Datos personales (nombre, apellido, email, teléfono, país)
 * Paso 2: Contraseña + confirmación + checkboxes legales
 *
 * Al registrarse → auto-login → redirect a /kyc con mensaje de bienvenida.
 */

import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft, X, FileText } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import LegalModal from '../../components/Legal/LegalModal'
import { LEGAL_VERSION } from '../../legal/terms'

// ── Países disponibles ────────────────────────────────────────────────────────

const COUNTRIES = [
  { value: 'CL',    label: '🇨🇱  Chile',     entity: 'SpA' },
  { value: 'BO',    label: '🇧🇴  Bolivia',    entity: 'SRL' },
  { value: 'OTHER', label: '🌐  Otro país',  entity: 'LLC' },
]

const ENTITY_INFO = {
  SpA: { label: 'AV Finance SpA',  detail: 'Chile',   currency: 'CLP', flag: '🇨🇱' },
  SRL: { label: 'AV Finance SRL',  detail: 'Bolivia', currency: 'BOB', flag: '🇧🇴' },
  LLC: { label: 'AV Finance LLC',  detail: 'Global',  currency: 'USD', flag: '🌐'  },
}

// Prefijos de países más comunes
const PHONE_PREFIXES = [
  { code: '+56', flag: '🇨🇱', label: 'CL' },
  { code: '+591', flag: '🇧🇴', label: 'BO' },
  { code: '+1',  flag: '🇺🇸', label: 'US' },
  { code: '+54', flag: '🇦🇷', label: 'AR' },
  { code: '+57', flag: '🇨🇴', label: 'CO' },
  { code: '+52', flag: '🇲🇽', label: 'MX' },
  { code: '+55', flag: '🇧🇷', label: 'BR' },
  { code: '+51', flag: '🇵🇪', label: 'PE' },
]

// ── Contenido de términos por país ────────────────────────────────────────────

function getTermsContent(country) {
  if (country === 'CL') {
    return {
      entity:     'AV Finance SpA',
      regulation: 'AV Finance SpA — Chile',
      badge:      '🇨🇱 Chile',
      title:      'Términos y Condiciones de Uso',
      sections: [
        {
          title: '1. Naturaleza del Servicio',
          body:  'AV Finance SpA, a través de su plataforma Alyto, provee exclusivamente servicios de infraestructura tecnológica, interfaces de software y herramientas algorítmicas de análisis de mercado. Alyto NO es un banco, NO es una institución financiera de captación, NO es una cámara de compensación y NO actúa como custodio de los fondos de los Usuarios.',
        },
        {
          title: '2. Arquitectura Tecnológica No-Custodia',
          body:  'El Usuario reconoce y acepta que los servicios de Alyto operan bajo una arquitectura tecnológica No-Custodia sobre redes descentralizadas. El Usuario mantiene, en todo momento, el control exclusivo, la propiedad y la administración de sus credenciales de acceso y activos digitales. AV Finance SpA no tiene acceso técnico ni legal para mover, retener, congelar o confiscar los activos digitales o fondos del Usuario.',
        },
        {
          title: '3. Ejecución de Operaciones y Responsabilidad',
          body:  'Toda sugerencia o notificación emitida por la plataforma tiene carácter estrictamente informativo y de asesoría analítica. La decisión final de ejecutar, firmar o rechazar cualquier transferencia de valor transfronteriza recae única y exclusivamente en el Usuario. Toda transacción confirmada por el Usuario en su dispositivo es final e irreversible, no existiendo responsabilidad de AV Finance SpA por errores de tipeo, envíos a destinatarios incorrectos o fluctuaciones del mercado durante la ejecución.',
        },
        {
          title: '4. Interacción con Proveedores de Pago',
          body:  'Para facilitar la conexión entre el dinero fiduciario y la red tecnológica, Alyto integra interfaces de programación de proveedores de pago independientes. AV Finance SpA no es responsable por demoras, rechazos de cumplimiento normativo o bloqueos ejercidos de manera independiente por estos proveedores externos sobre los flujos de capital. AV Finance SpA responde por el correcto funcionamiento de su plataforma tecnológica, no por las operaciones de los proveedores de pago.',
        },
        {
          title: '5. Cumplimiento Normativo y Origen de Fondos',
          body:  'El Usuario declara que los fondos utilizados en la plataforma Alyto provienen de actividades lícitas y comerciales legítimas. AV Finance SpA se reserva el derecho de suspender el acceso a la interfaz de software — sin que esto implique retención de fondos, dado el modelo No-Custodia — en caso de detectar comportamientos transaccionales anómalos, cooperando activamente con la Unidad de Análisis Financiero (UAF) de Chile cuando la ley lo requiera.',
        },
        {
          title: '6. Propiedad Intelectual',
          body:  'El código fuente, algoritmos y arquitectura de la plataforma Alyto son propiedad de AV Finance LLC (Delaware, EE.UU.), licenciados para su operación en Chile a través de AV Finance SpA.',
        },
        {
          title: '7. Ley Aplicable',
          body:  'Estos términos se rigen por las leyes de la República de Chile. Cualquier disputa será sometida a los tribunales competentes de la ciudad de Santiago de Chile.',
        },
        {
          title: '8. Modificaciones',
          body:  'AV Finance SpA se reserva el derecho de modificar estos términos con previo aviso de 30 días al email registrado por el Usuario.',
        },
      ],
    }
  }

  if (country === 'BO') {
    return {
      entity:     'AV Finance SRL',
      regulation: 'AV Finance SRL — Bolivia',
      badge:      '🇧🇴 Bolivia',
      title:      'Términos y Condiciones de Uso',
      sections: [
        {
          title: '1. Naturaleza del Servicio',
          body:  'AV Finance SRL, a través de su plataforma Alyto, provee exclusivamente servicios de infraestructura tecnológica e interfaces de software para pagos transfronterizos. Alyto NO es un banco, NO es una institución financiera de captación y NO actúa como custodio de los fondos de los Usuarios.',
        },
        {
          title: '2. Arquitectura Tecnológica No-Custodia',
          body:  'El Usuario reconoce que los servicios de Alyto operan bajo una arquitectura tecnológica No-Custodia. El Usuario mantiene en todo momento el control exclusivo de sus credenciales y activos. AV Finance SRL no tiene acceso para mover, retener o confiscar los fondos del Usuario.',
        },
        {
          title: '3. Ejecución de Operaciones y Responsabilidad',
          body:  'La decisión final de ejecutar cualquier transferencia recae única y exclusivamente en el Usuario. Toda transacción confirmada por el Usuario es final e irreversible. AV Finance SRL no es responsable por errores de tipeo, envíos incorrectos o fluctuaciones del mercado durante la ejecución.',
        },
        {
          title: '4. Interacción con Proveedores de Pago',
          body:  'Para facilitar la liquidación local de pagos, Alyto integra interfaces de proveedores de pago y corresponsales financieros independientes. AV Finance SRL no es responsable por demoras o bloqueos ejercidos por estos proveedores. Los tiempos de acreditación dependen de los procesos internos de cada institución financiera local.',
        },
        {
          title: '5. Cumplimiento Normativo y Origen de Fondos',
          body:  'El Usuario declara que los fondos utilizados provienen de actividades lícitas. AV Finance SRL se reserva el derecho de suspender el acceso a la plataforma — sin retención de fondos, dado el modelo No-Custodia — ante comportamientos anómalos, cooperando con la Autoridad de Supervisión del Sistema Financiero (ASFI) de Bolivia cuando la ley lo requiera.',
        },
        {
          title: '6. Ley Aplicable',
          body:  'Estos términos se rigen por las leyes del Estado Plurinacional de Bolivia.',
        },
        {
          title: '7. Modificaciones',
          body:  'AV Finance SRL se reserva el derecho de modificar estos términos con previo aviso de 30 días al email registrado por el Usuario.',
        },
      ],
    }
  }

  // Default: LLC (usuarios internacionales — AR, BR, CO, MX, PE y resto del mundo)
  return {
    entity:     'AV Finance LLC',
    regulation: 'AV Finance LLC — Delaware, USA',
    badge:      '🌐 International',
    title:      'Terms and Conditions of Use',
    sections: [
      {
        title: '1. Nature of Service',
        body:  'AV Finance LLC provides exclusively technological infrastructure services, software interfaces and algorithmic market analysis tools through the Alyto platform. Alyto is NOT a bank, NOT a financial institution, NOT a clearing house and does NOT act as custodian of User funds.',
      },
      {
        title: '2. Non-Custody Technological Architecture',
        body:  'The User acknowledges that Alyto services operate under a Non-Custody technological architecture over decentralized networks. The User maintains, at all times, exclusive control, ownership and administration of their access credentials and digital assets. AV Finance LLC has no technical or legal access to move, retain, freeze or confiscate the User\'s digital assets or funds.',
      },
      {
        title: '3. Execution of Operations and Liability',
        body:  'Any suggestion or notification issued by the platform is strictly informational and analytical in nature. The final decision to execute, sign or reject any cross-border value transfer rests solely and exclusively with the User. Any transaction confirmed by the User on their device is final and irreversible. AV Finance LLC is not responsible for typing errors, transfers to incorrect recipients or market fluctuations during execution.',
      },
      {
        title: '4. Interaction with Payment Providers',
        body:  'To facilitate the connection between fiat money and the technological network, Alyto integrates programming interfaces from independent payment providers. AV Finance LLC is not responsible for delays, regulatory compliance rejections or blocks independently exercised by these external providers over capital flows.',
      },
      {
        title: '5. Regulatory Compliance and Source of Funds',
        body:  'The User declares that funds used on the Alyto platform originate from lawful and legitimate commercial activities. AV Finance LLC reserves the right to suspend access to the software interface — without implying fund retention, given the Non-Custody model — upon detecting anomalous transactional behavior, cooperating with competent authorities when required by law.',
      },
      {
        title: '6. Intellectual Property',
        body:  'All intellectual property rights to the Alyto platform, including source code, algorithms and architecture, are owned by AV Finance LLC.',
      },
      {
        title: '7. Governing Law',
        body:  'These terms are governed by the laws of the State of Delaware, United States.',
      },
      {
        title: '8. Modifications',
        body:  'AV Finance LLC reserves the right to modify these terms with 30 days prior notice to the User\'s registered email.',
      },
    ],
  }
}

// ── Indicador de fortaleza de contraseña ─────────────────────────────────────

function StrengthBar({ password }) {
  if (!password.length) return null
  return (
    <div className="flex gap-1 mt-1">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="h-1 flex-1 rounded-full transition-colors duration-200"
          style={{
            background: password.length >= (i + 1) * 3
              ? password.length >= 12 ? '#233E58'
                : password.length >= 8  ? '#94A3B8'
                : '#EF4444'
              : '#E2E8F0',
          }}
        />
      ))}
    </div>
  )
}

// ── Input estándar ────────────────────────────────────────────────────────────

const INPUT_CLASS = `
  w-full rounded-xl px-4 py-3.5 text-[0.9375rem] text-[#0F172A]
  bg-white border border-[#E2E8F0]
  placeholder:text-[#94A3B8]
  focus:outline-none focus:border-[#233E58]
  transition-colors duration-150
`

const LABEL_CLASS = 'text-[0.75rem] font-semibold text-[#94A3B8] uppercase tracking-[0.08em]'

// ── Modal de Términos de Servicio ─────────────────────────────────────────────

function TermsModal({ country, onAccept, onClose }) {
  const terms                                       = getTermsContent(country)
  const scrollRef                                   = useRef(null)
  const [hasScrolled, setHasScrolled]               = useState(false)
  const [showScrollHint, setShowScrollHint]         = useState(true)

  function handleScroll(e) {
    const el = e.currentTarget
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24
    if (atBottom) {
      setHasScrolled(true)
      setShowScrollHint(false)
    } else {
      setShowScrollHint(true)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full sm:max-w-[480px] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{
          background: '#FFFFFF',
          boxShadow:  '0 8px 40px rgba(15,23,42,0.08), 0 2px 8px rgba(15,23,42,0.04)',
          height:     '90dvh',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[#E2E8F0] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(35,62,88,0.10)' }}
            >
              <FileText size={18} className="text-[#233E58]" />
            </div>
            <div>
              <h2 className="text-[1.0625rem] font-bold text-[#0F172A]">{terms.title}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[0.6875rem] font-semibold text-[#233E58] bg-[#233E581A] px-2 py-0.5 rounded-full">
                  {terms.badge}
                </span>
                <span className="text-[0.6875rem] text-[#64748B]">{terms.entity}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-all flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Regulación badge */}
        <div className="px-6 pt-4 pb-2 flex-shrink-0">
          <div
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl"
            style={{ background: 'rgba(35,62,88,0.07)', border: '1px solid rgba(35,62,88,0.20)' }}
          >
            <CheckCircle2 size={13} className="text-[#233E58] flex-shrink-0" />
            <p className="text-[0.8125rem] text-[#64748B]">
              Regulado bajo{' '}
              <span className="text-[#233E58] font-semibold">{terms.regulation}</span>
              {' '}· <span className="text-[#0F172A] font-semibold">{terms.entity}</span>
            </p>
          </div>
        </div>

        {/* Contenido con scroll — texto a 14px mínimo */}
        <div
          ref={scrollRef}
          className="overflow-y-auto px-6 py-4 flex flex-col gap-5"
          style={{ flex: '1 1 0', overscrollBehavior: 'contain' }}
          onScroll={handleScroll}
        >
          {terms.sections.map((sec, i) => (
            <div key={i} className="flex flex-col gap-2">
              <h3 className="text-[0.875rem] font-bold text-[#0F172A]">{sec.title}</h3>
              <div className="flex flex-col gap-1.5">
                {sec.body.split('\n').map((line, j) => (
                  line.trim()
                    ? <p key={j} className="text-[0.875rem] text-[#0F172A] leading-[1.65]">{line}</p>
                    : null
                ))}
              </div>
            </div>
          ))}

          {/* Cierre legal */}
          <div className="border-t border-[#E2E8F0] pt-4 pb-2">
            <p className="text-[0.8125rem] text-[#64748B] leading-relaxed">
              Al hacer clic en <strong className="text-[#0F172A]">«Acepto»</strong>, confirmas haber leído
              y comprendido los presentes Términos de Servicio y manifiestas tu consentimiento libre e
              informado para vincularte contractualmente con{' '}
              <strong className="text-[#0F172A]">{terms.entity}</strong>.
            </p>
          </div>
        </div>

        {/* Scroll hint — desaparece al llegar al final */}
        {showScrollHint && !hasScrolled && (
          <div
            className="flex items-center justify-center gap-2 py-2 flex-shrink-0"
            style={{ background: 'linear-gradient(to top, #FFFFFF 60%, transparent)' }}
          >
            <span className="text-[0.6875rem] text-[#94A3B8] animate-bounce">↓</span>
            <span className="text-[0.6875rem] text-[#94A3B8]">Desplázate para leer todo el contenido</span>
            <span className="text-[0.6875rem] text-[#94A3B8] animate-bounce">↓</span>
          </div>
        )}

        {/* Botones */}
        <div
          className="flex gap-3 px-6 py-5 flex-shrink-0"
          style={{ borderTop: '1px solid #E2E8F0' }}
        >
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl py-3.5 text-[0.875rem] font-semibold text-[#64748B] border border-[#E2E8F0] hover:border-[#233E5833] hover:text-[#0F172A] transition-colors"
          >
            Rechazar
          </button>
          <button
            onClick={hasScrolled ? onAccept : undefined}
            disabled={!hasScrolled}
            className="flex-1 rounded-2xl py-3.5 text-[0.9375rem] font-bold transition-all"
            style={{
              background: hasScrolled ? '#233E58' : '#E2E8F0',
              color:      hasScrolled ? '#FFFFFF'  : '#94A3B8',
              boxShadow:  hasScrolled ? '0 4px 20px rgba(35,62,88,0.25)' : 'none',
              cursor:     hasScrolled ? 'pointer' : 'not-allowed',
            }}
            title={!hasScrolled ? 'Lee los términos completos para continuar' : undefined}
          >
            {hasScrolled ? 'Acepto' : 'Lee hasta el final'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate      = useNavigate()
  const { register }  = useAuth()

  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    firstName:    '',
    lastName:     '',
    email:        '',
    phonePrefix:  '+56',
    phoneNumber:  '',
    country:      '',
    password:     '',
    confirmPwd:   '',
    termsChecked: false,
    ageChecked:   false,
  })
  const [showPwd,          setShowPwd]          = useState(false)
  const [showConfirm,      setShowConfirm]      = useState(false)
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState('')
  const [termsModalOpen,   setTermsModalOpen]   = useState(false)
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false)

  const selectedCountry = COUNTRIES.find(c => c.value === form.country)

  function handleChange(e) {
    setError('')
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  // El checkbox de términos solo puede activarse a través del modal
  function handleTermsCheckboxClick() {
    if (!form.termsChecked) {
      setTermsModalOpen(true)
    } else {
      setForm(prev => ({ ...prev, termsChecked: false }))
    }
  }

  function handleTermsAccept() {
    setForm(prev => ({ ...prev, termsChecked: true }))
    setTermsModalOpen(false)
    setError('')
  }

  // ── Paso 1: validar y avanzar ─────────────────────────────────────────────
  function handleStep1(e) {
    e.preventDefault()
    if (!form.firstName.trim() || !form.email.trim() || !form.country) {
      setError('Completa los campos obligatorios: nombre, email y país.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Ingresa un email válido.')
      return
    }
    setError('')
    setStep(2)
  }

  // ── Paso 2: registrar ─────────────────────────────────────────────────────
  async function handleStep2(e) {
    e.preventDefault()
    if (!form.password || !form.confirmPwd) {
      setError('Completa los campos de contraseña.')
      return
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (form.password !== form.confirmPwd) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (!form.termsChecked) {
      setError('Debes aceptar los Términos de Servicio para continuar.')
      return
    }
    if (!form.ageChecked) {
      setError('Debes confirmar que tienes 18 años o más.')
      return
    }

    setLoading(true)
    try {
      const phone = form.phoneNumber.trim()
        ? `${form.phonePrefix}${form.phoneNumber.trim()}`
        : undefined

      await register({
        firstName:       form.firstName.trim(),
        lastName:        form.lastName.trim() || undefined,
        email:           form.email.trim(),
        password:        form.password,
        country:         form.country,
        phone,
        termsAccepted:   true,
        termsAcceptedAt: new Date().toISOString(),
        termsVersion:    LEGAL_VERSION,
      })

      navigate('/kyc', {
        replace: true,
        state:   { welcome: true, message: '¡Cuenta creada! Ahora verifica tu identidad para comenzar a enviar dinero.' },
      })
    } catch (err) {
      setError(err.message || 'Error al crear la cuenta. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {termsModalOpen && (
        <TermsModal
          country={form.country}
          onAccept={handleTermsAccept}
          onClose={() => setTermsModalOpen(false)}
        />
      )}

      <LegalModal
        isOpen={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
        docType="privacy"
      />

      <div
        className="w-full max-w-[420px] rounded-3xl p-7"
        style={{
          background: '#FFFFFF',
          border:     '1px solid #E2E8F0',
          boxShadow:  '0 8px 40px rgba(15,23,42,0.08), 0 2px 8px rgba(15,23,42,0.04)',
        }}
      >
        {/* Header con indicador de paso */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[1.375rem] font-bold text-[#0F172A]">Crear cuenta</h1>
            <p className="text-[0.8125rem] text-[#64748B]">Paso {step} de 2</p>
          </div>
          {/* Barra de progreso */}
          <div className="flex gap-2">
            <div className={`h-1.5 w-10 rounded-full ${step >= 1 ? 'bg-[#233E58]' : 'bg-[#E2E8F0]'}`} />
            <div className={`h-1.5 w-10 rounded-full ${step >= 2 ? 'bg-[#233E58]' : 'bg-[#E2E8F0]'}`} />
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2.5 bg-[#EF44441A] border border-[#EF444433] rounded-2xl px-4 py-3 mb-5">
            <AlertCircle size={15} className="text-[#EF4444] flex-shrink-0" />
            <p className="text-[0.8125rem] text-[#F87171]">{error}</p>
          </div>
        )}

        {/* ── PASO 1: Datos personales ───────────────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="flex flex-col gap-4">

            {/* Nombre + Apellido */}
            <div className="flex gap-3">
              <div className="flex flex-col gap-1.5 flex-1">
                <label className={LABEL_CLASS}>Nombre <span className="text-[#EF4444]">*</span></label>
                <input
                  type="text" name="firstName" value={form.firstName}
                  onChange={handleChange} placeholder="Juan"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <label className={LABEL_CLASS}>Apellido</label>
                <input
                  type="text" name="lastName" value={form.lastName}
                  onChange={handleChange} placeholder="Pérez"
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS}>Email <span className="text-[#EF4444]">*</span></label>
              <input
                type="email" name="email" value={form.email}
                onChange={handleChange} placeholder="tu@email.com"
                autoComplete="email" className={INPUT_CLASS}
              />
            </div>

            {/* Teléfono */}
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS}>Teléfono</label>
              <div className="flex gap-2">
                <select
                  name="phonePrefix" value={form.phonePrefix}
                  onChange={handleChange}
                  className="rounded-xl px-3 py-3.5 text-[0.9375rem] text-[#0F172A] bg-white border border-[#E2E8F0] focus:outline-none focus:border-[#233E58] transition-colors cursor-pointer appearance-none min-w-[90px]"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                >
                  {PHONE_PREFIXES.map(p => (
                    <option key={p.code} value={p.code} style={{ background: '#FFFFFF' }}>
                      {p.flag} {p.code}
                    </option>
                  ))}
                </select>
                <input
                  type="tel" name="phoneNumber" value={form.phoneNumber}
                  onChange={handleChange} placeholder="9 1234 5678"
                  className={`${INPUT_CLASS} flex-1`}
                />
              </div>
            </div>

            {/* País */}
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS}>País de residencia <span className="text-[#EF4444]">*</span></label>
              <select
                name="country" value={form.country} onChange={handleChange}
                className="w-full rounded-xl px-4 py-3.5 text-[0.9375rem] text-[#0F172A] bg-white border border-[#E2E8F0] focus:outline-none focus:border-[#233E58] transition-colors cursor-pointer appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}
              >
                <option value="" disabled style={{ color: '#94A3B8' }}>Selecciona tu país</option>
                {COUNTRIES.map(c => (
                  <option key={c.value} value={c.value} style={{ background: '#FFFFFF' }}>{c.label}</option>
                ))}
              </select>

              {selectedCountry && (() => {
                const ei = ENTITY_INFO[selectedCountry.entity] ?? ENTITY_INFO.LLC
                return (
                  <div
                    className="flex items-start gap-3 mt-2 px-3.5 py-3 rounded-xl border"
                    style={{ background: 'rgba(35,62,88,0.06)', borderColor: 'rgba(35,62,88,0.20)' }}
                  >
                    <span className="text-xl leading-none flex-shrink-0">{ei.flag}</span>
                    <div>
                      <p className="text-[0.8125rem] font-semibold text-[#233E58] leading-tight">
                        Operarás con {ei.label} ({ei.detail}) · {ei.currency}
                      </p>
                      <p className="text-[0.6875rem] text-[#64748B] mt-0.5">
                        Tu moneda de origen será <span className="text-[#233E58] font-semibold">{ei.currency}</span>
                      </p>
                    </div>
                  </div>
                )
              })()}
            </div>

            <button
              type="submit"
              className="w-full mt-2 rounded-2xl py-4 text-[0.9375rem] font-bold bg-[#233E58] text-white hover:bg-[#178a65] transition-colors"
              style={{ boxShadow: '0 4px 20px rgba(35,62,88,0.25)' }}
            >
              Continuar →
            </button>
          </form>
        )}

        {/* ── PASO 2: Contraseña + términos ─────────────────────────────────── */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="flex flex-col gap-4">

            {/* Contraseña */}
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS}>Contraseña <span className="text-[#EF4444]">*</span></label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  name="password" value={form.password}
                  onChange={handleChange} placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  className={`${INPUT_CLASS} pr-12`}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)} tabIndex={-1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors">
                  {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <StrengthBar password={form.password} />
            </div>

            {/* Confirmar contraseña */}
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLASS}>Confirmar contraseña <span className="text-[#EF4444]">*</span></label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPwd" value={form.confirmPwd}
                  onChange={handleChange} placeholder="Repite la contraseña"
                  autoComplete="new-password"
                  className={`${INPUT_CLASS} pr-12 ${form.confirmPwd && form.confirmPwd !== form.password ? 'border-[#EF4444]' : ''}`}
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors">
                  {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Checkbox términos — solo activable via modal */}
            <TermsCheckboxItem
              checked={form.termsChecked}
              country={form.country}
              onRequestOpen={() => setTermsModalOpen(true)}
              onOpenPrivacy={() => setPrivacyModalOpen(true)}
              onUncheck={() => setForm(prev => ({ ...prev, termsChecked: false }))}
            />

            {/* Checkbox edad */}
            <CheckboxItem
              name="ageChecked"
              checked={form.ageChecked}
              onChange={handleChange}
            >
              Tengo <span className="text-[#233E58] font-semibold">18 años o más</span>
            </CheckboxItem>

            {/* Botones */}
            <div className="flex gap-3 mt-1">
              <button
                type="button"
                onClick={() => { setStep(1); setError('') }}
                className="flex items-center gap-2 px-5 py-4 rounded-2xl text-[0.875rem] font-semibold text-[#64748B] border border-[#E2E8F0] hover:border-[#233E58] hover:text-[#0F172A] transition-colors"
              >
                <ArrowLeft size={16} />
                Volver
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-2xl py-4 text-[0.9375rem] font-bold bg-[#233E58] text-white hover:bg-[#178a65] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ boxShadow: '0 4px 20px rgba(35,62,88,0.25)' }}
              >
                {loading ? 'Creando cuenta…' : 'Crear cuenta'}
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <p className="text-center text-[0.8125rem] text-[#64748B] mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-[#233E58] font-semibold hover:text-[#178a65] transition-colors">
            Inicia sesión
          </Link>
        </p>
      </div>
    </>
  )
}

// ── TermsCheckboxItem — solo activable a través del modal ─────────────────────

function TermsCheckboxItem({ checked, country, onRequestOpen, onOpenPrivacy, onUncheck }) {
  function handleClick() {
    if (checked) {
      onUncheck()
    } else {
      onRequestOpen()
    }
  }

  const isBolivia = country === 'BO'

  return (
    <div
      onClick={handleClick}
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleClick() } }}
      className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all duration-150 select-none
        ${checked ? 'border-[#233E5833] bg-[#233E5808]' : 'border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#233E5833]'}`}
    >
      {/* Checkbox visual */}
      <div
        className={`w-5 h-5 rounded-md flex items-center justify-center border-2 flex-shrink-0 mt-0.5 transition-all duration-150
          ${checked ? 'bg-[#233E58] border-[#233E58]' : 'bg-transparent border-[#94A3B8]'}`}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      {/* Texto — label dinámico por país (BO requiere disclosure PSAV explícito) */}
      <span className="text-[0.8125rem] text-[#64748B] leading-snug">
        He leído y acepto los{' '}
        <span
          className="text-[#233E58] font-semibold underline underline-offset-2 decoration-[#233E5833]"
          onClick={e => { e.stopPropagation(); onRequestOpen() }}
        >
          Términos de Servicio
        </span>
        {isBolivia ? (
          <>
            , incluyendo la{' '}
            <strong className="text-[#0F172A] font-semibold">
              custodia transitoria de fondos BOB y activos USDC por AV Finance SRL
            </strong>
            {' '}(PSAV bajo DS 5384)
          </>
        ) : (
          <>
            {' '}y la{' '}
            <span
              className="text-[#233E58] font-semibold underline underline-offset-2 decoration-[#233E5833]"
              onClick={(e) => { e.stopPropagation(); onOpenPrivacy?.() }}
            >
              Política de Privacidad
            </span>
          </>
        )}
        {!checked && (
          <span className="block mt-1 text-[0.6875rem] text-[#94A3B8]">
            Haz clic para leer los términos antes de aceptar
          </span>
        )}
      </span>
    </div>
  )
}

// ── CheckboxItem (genérico) ───────────────────────────────────────────────────

function CheckboxItem({ name, checked, onChange, children }) {
  return (
    <label
      className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all duration-150
        ${checked ? 'border-[#233E5833] bg-[#233E5808]' : 'border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#233E5833]'}`}
    >
      <div
        className={`w-5 h-5 rounded-md flex items-center justify-center border-2 flex-shrink-0 mt-0.5 transition-all duration-150
          ${checked ? 'bg-[#233E58] border-[#233E58]' : 'bg-transparent border-[#94A3B8]'}`}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <input type="checkbox" name={name} className="hidden" checked={checked} onChange={onChange} />
      <span className="text-[0.8125rem] text-[#64748B] leading-snug">{children}</span>
    </label>
  )
}
