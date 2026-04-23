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
import { LEGAL_VERSION, LEGAL_DOCS } from '../../legal/terms'

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

// ── Metadata de entidad por país (header del modal de T&C) ───────────────────

function getTermsMeta(country) {
  if (country === 'CL') {
    return { entity: 'AV Finance SpA', regulation: 'AV Finance SpA — Chile',          badge: '🇨🇱 Chile',         lang: 'es' }
  }
  if (country === 'BO') {
    return { entity: 'AV Finance SRL', regulation: 'AV Finance SRL — Bolivia (PSAV)', badge: '🇧🇴 Bolivia',       lang: 'es' }
  }
  return   { entity: 'AV Finance LLC', regulation: 'AV Finance LLC — Delaware, USA',  badge: '🌐 International',  lang: 'en' }
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
              ? password.length >= 12 ? '#1D9E75'
                : password.length >= 8  ? '#94A3B8'
                : '#EF4444'
              : 'var(--color-border)',
          }}
        />
      ))}
    </div>
  )
}

// ── Input estándar ────────────────────────────────────────────────────────────

const INPUT_CLASS = `
  w-full rounded-xl px-4 py-3.5 text-[0.9375rem] text-[#0D1F3C]
  bg-white border border-[#E2E8F0]
  placeholder:text-[#94A3B8]
  focus:outline-none focus:border-[#1D9E75] focus:shadow-[0_0_0_2px_rgba(29,158,117,0.12)]
  transition-colors duration-150
`

const LABEL_CLASS = 'text-[0.75rem] font-semibold text-[#94A3B8] uppercase tracking-[0.08em]'

// ── Modal de Términos de Servicio ─────────────────────────────────────────────

function TermsModal({ country, onAccept, onClose }) {
  const meta                                        = getTermsMeta(country)
  // Contenido canónico viene de LEGAL_DOCS (terms.js) — fuente única de verdad
  // para T&C v2.1. Fallback a español si el idioma del país no tiene traducción.
  const doc                                         = LEGAL_DOCS.terms[meta.lang] ?? LEGAL_DOCS.terms.es
  const terms                                       = { ...meta, title: doc.title, sections: doc.sections }
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
          background: 'var(--color-bg-secondary)',
          boxShadow:  '0 8px 40px rgba(15,23,42,0.08), 0 2px 8px rgba(15,23,42,0.04)',
          height:     '90dvh',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[#E2E8F0] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--color-accent-teal-dim)' }}
            >
              <FileText size={18} className="text-[#1D9E75]" />
            </div>
            <div>
              <h2 className="text-[1.0625rem] font-bold text-[#0D1F3C]">{terms.title}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[0.6875rem] font-semibold text-[#1D9E75] bg-[#1D9E751A] px-2 py-0.5 rounded-full">
                  {terms.badge}
                </span>
                <span className="text-[0.6875rem] text-[#4A5568]">{terms.entity}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#4A5568] hover:text-[#0D1F3C] hover:bg-white transition-all flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Regulación badge */}
        <div className="px-6 pt-4 pb-2 flex-shrink-0">
          <div
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl"
            style={{ background: 'var(--color-accent-teal-dim)', border: '1px solid rgba(35,62,88,0.20)' }}
          >
            <CheckCircle2 size={13} className="text-[#1D9E75] flex-shrink-0" />
            <p className="text-[0.8125rem] text-[#4A5568]">
              Regulado bajo{' '}
              <span className="text-[#1D9E75] font-semibold">{terms.regulation}</span>
              {' '}· <span className="text-[#0D1F3C] font-semibold">{terms.entity}</span>
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
              <h3 className="text-[0.875rem] font-bold text-[#0D1F3C]">{sec.title}</h3>
              <div className="flex flex-col gap-1.5">
                {sec.content.split('\n').map((line, j) => (
                  line.trim()
                    ? <p key={j} className="text-[0.875rem] text-[#0D1F3C] leading-[1.65] whitespace-pre-line">{line}</p>
                    : <div key={j} className="h-1" />
                ))}
              </div>
            </div>
          ))}

          {/* Cierre legal */}
          <div className="border-t border-[#E2E8F0] pt-4 pb-2">
            <p className="text-[0.8125rem] text-[#4A5568] leading-relaxed">
              Al hacer clic en <strong className="text-[#0D1F3C]">«Acepto»</strong>, confirmas haber leído
              y comprendido los presentes Términos de Servicio y manifiestas tu consentimiento libre e
              informado para vincularte contractualmente con{' '}
              <strong className="text-[#0D1F3C]">{terms.entity}</strong>.
            </p>
          </div>
        </div>

        {/* Scroll hint — desaparece al llegar al final */}
        {showScrollHint && !hasScrolled && (
          <div
            className="flex items-center justify-center gap-2 py-2 flex-shrink-0"
            style={{ background: 'linear-gradient(to top, var(--color-bg-elevated) 60%, transparent)' }}
          >
            <span className="text-[0.6875rem] text-[#94A3B8] animate-bounce">↓</span>
            <span className="text-[0.6875rem] text-[#94A3B8]">Desplázate para leer todo el contenido</span>
            <span className="text-[0.6875rem] text-[#94A3B8] animate-bounce">↓</span>
          </div>
        )}

        {/* Botones */}
        <div
          className="flex gap-3 px-6 py-5 flex-shrink-0"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl py-3.5 text-[0.875rem] font-semibold text-[#4A5568] border border-[#E2E8F0] hover:border-[#1D9E7540] hover:text-[#0D1F3C] transition-colors"
          >
            Rechazar
          </button>
          <button
            onClick={hasScrolled ? onAccept : undefined}
            disabled={!hasScrolled}
            className="flex-1 rounded-2xl py-3.5 text-[0.9375rem] font-bold transition-all"
            style={{
              background: hasScrolled ? '#1D9E75' : 'var(--color-border)',
              color:      hasScrolled ? '#0F1628'  : '#94A3B8',
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
          background: 'var(--color-bg-secondary)',
          border:     '1px solid var(--color-border)',
          boxShadow:  '0 8px 40px rgba(15,23,42,0.08), 0 2px 8px rgba(15,23,42,0.04)',
        }}
      >
        {/* Header con indicador de paso */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[1.375rem] font-bold text-[#0D1F3C]">Crear cuenta</h1>
            <p className="text-[0.8125rem] text-[#4A5568]">Paso {step} de 2</p>
          </div>
          {/* Barra de progreso */}
          <div className="flex gap-2">
            <div className={`h-1.5 w-10 rounded-full ${step >= 1 ? 'bg-[#1D9E75]' : 'bg-[var(--color-border)]'}`} />
            <div className={`h-1.5 w-10 rounded-full ${step >= 2 ? 'bg-[#1D9E75]' : 'bg-[var(--color-border)]'}`} />
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2.5 bg-[#EF44441A] border border-[rgba(239,68,68,0.25)] rounded-2xl px-4 py-3 mb-5">
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
                  className="rounded-xl px-3 py-3.5 text-[0.9375rem] text-[#0D1F3C] bg-white border border-[#E2E8F0] focus:outline-none focus:border-[#1D9E75] transition-colors cursor-pointer appearance-none min-w-[90px]"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
                >
                  {PHONE_PREFIXES.map(p => (
                    <option key={p.code} value={p.code} style={{ background: 'var(--color-bg-secondary)' }}>
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
                className="w-full rounded-xl px-4 py-3.5 text-[0.9375rem] text-[#0D1F3C] bg-white border border-[#E2E8F0] focus:outline-none focus:border-[#1D9E75] transition-colors cursor-pointer appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}
              >
                <option value="" disabled style={{ color: '#94A3B8' }}>Selecciona tu país</option>
                {COUNTRIES.map(c => (
                  <option key={c.value} value={c.value} style={{ background: 'var(--color-bg-secondary)' }}>{c.label}</option>
                ))}
              </select>

              {selectedCountry && (() => {
                const ei = ENTITY_INFO[selectedCountry.entity] ?? ENTITY_INFO.LLC
                return (
                  <div
                    className="flex items-start gap-3 mt-2 px-3.5 py-3 rounded-xl border"
                    style={{ background: 'var(--color-accent-teal-dim)', borderColor: 'var(--color-accent-teal-border)' }}
                  >
                    <span className="text-xl leading-none flex-shrink-0">{ei.flag}</span>
                    <div>
                      <p className="text-[0.8125rem] font-semibold text-[#1D9E75] leading-tight">
                        Operarás con {ei.label} ({ei.detail}) · {ei.currency}
                      </p>
                      <p className="text-[0.6875rem] text-[#4A5568] mt-0.5">
                        Tu moneda de origen será <span className="text-[#1D9E75] font-semibold">{ei.currency}</span>
                      </p>
                    </div>
                  </div>
                )
              })()}
            </div>

            <button
              type="submit"
              className="w-full mt-2 rounded-2xl py-4 text-[0.9375rem] font-bold bg-[#1D9E75] text-white hover:bg-[#178A64] transition-colors"
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#4A5568] transition-colors">
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#4A5568] transition-colors">
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
              Tengo <span className="text-[#1D9E75] font-semibold">18 años o más</span>
            </CheckboxItem>

            {/* Botones */}
            <div className="flex gap-3 mt-1">
              <button
                type="button"
                onClick={() => { setStep(1); setError('') }}
                className="flex items-center gap-2 px-5 py-4 rounded-2xl text-[0.875rem] font-semibold text-[#4A5568] border border-[#E2E8F0] hover:border-[#1D9E75] hover:text-[#0D1F3C] transition-colors"
              >
                <ArrowLeft size={16} />
                Volver
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-2xl py-4 text-[0.9375rem] font-bold bg-[#1D9E75] text-white hover:bg-[#178A64] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ boxShadow: '0 4px 20px rgba(35,62,88,0.25)' }}
              >
                {loading ? 'Creando cuenta…' : 'Crear cuenta'}
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <p className="text-center text-[0.8125rem] text-[#4A5568] mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-[#1D9E75] font-semibold hover:text-[#178a65] transition-colors">
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
        ${checked ? 'border-[#1D9E7533] bg-[#1D9E750A]' : 'border-[#E2E8F0] bg-white hover:border-[#1D9E7540]'}`}
    >
      {/* Checkbox visual */}
      <div
        className={`w-5 h-5 rounded-md flex items-center justify-center border-2 flex-shrink-0 mt-0.5 transition-all duration-150
          ${checked ? 'bg-[#1D9E75] border-[#1D9E75]' : 'bg-transparent border-[#94A3B8]'}`}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      {/* Texto — label dinámico por país (BO requiere disclosure PSAV explícito) */}
      <span className="text-[0.8125rem] text-[#4A5568] leading-snug">
        He leído y acepto los{' '}
        <span
          className="text-[#1D9E75] font-semibold underline underline-offset-2 decoration-[#1D9E7533]"
          onClick={e => { e.stopPropagation(); onRequestOpen() }}
        >
          Términos de Servicio
        </span>
        {isBolivia ? (
          <>
            , incluyendo la{' '}
            <strong className="text-[#0D1F3C] font-semibold">
              custodia transitoria de fondos BOB y activos USDC por AV Finance SRL
            </strong>
            {' '}(PSAV bajo DS 5384)
          </>
        ) : (
          <>
            {' '}y la{' '}
            <span
              className="text-[#1D9E75] font-semibold underline underline-offset-2 decoration-[#1D9E7533]"
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
        ${checked ? 'border-[#1D9E7533] bg-[#1D9E750A]' : 'border-[#E2E8F0] bg-white hover:border-[#1D9E7540]'}`}
    >
      <div
        className={`w-5 h-5 rounded-md flex items-center justify-center border-2 flex-shrink-0 mt-0.5 transition-all duration-150
          ${checked ? 'bg-[#1D9E75] border-[#1D9E75]' : 'bg-transparent border-[#94A3B8]'}`}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <input type="checkbox" name={name} className="hidden" checked={checked} onChange={onChange} />
      <span className="text-[0.8125rem] text-[#4A5568] leading-snug">{children}</span>
    </label>
  )
}
