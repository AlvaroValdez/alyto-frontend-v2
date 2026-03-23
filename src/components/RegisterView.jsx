/**
 * RegisterView.jsx — Pantalla de Registro Multi-Entidad
 *
 * El campo `country` es crítico: el backend lo usa para asignar
 * automáticamente legalEntity (CL → SpA, BO → SRL, US/otros → LLC).
 *
 * Diseño: dark premium fintech — consistente con LoginView y el
 * sistema de diseño Alyto (fondo #0F1628, card #1A2340, CTA plateado).
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// ── Países disponibles y su mapeo a entidad ────────────────────────────────

const COUNTRIES = [
  { value: 'CL', label: '🇨🇱  Chile',         entity: 'SpA' },
  { value: 'BO', label: '🇧🇴  Bolivia',        entity: 'SRL' },
  { value: 'US', label: '🇺🇸  Estados Unidos', entity: 'LLC' },
  { value: 'AR', label: '🇦🇷  Argentina',      entity: 'LLC' },
  { value: 'PE', label: '🇵🇪  Perú',           entity: 'LLC' },
  { value: 'CO', label: '🇨🇴  Colombia',       entity: 'LLC' },
  { value: 'MX', label: '🇲🇽  México',         entity: 'LLC' },
  { value: 'BR', label: '🇧🇷  Brasil',         entity: 'LLC' },
  { value: 'OTHER', label: '🌐  Otro país',    entity: 'LLC' },
]

const ENTITY_LABELS = {
  SpA: 'AV Finance SpA — Chile',
  SRL: 'AV Finance SRL — Bolivia',
  LLC: 'AV Finance LLC — Delaware',
}

export default function RegisterView() {
  const navigate     = useNavigate()
  const { register } = useAuth()

  const [form, setForm] = useState({
    firstName: '',
    lastName:  '',
    email:     '',
    password:  '',
    country:   '',
  })
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const selectedCountry = COUNTRIES.find(c => c.value === form.country)

  function handleChange(e) {
    setError('')
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!form.firstName || !form.email || !form.password || !form.country) {
      setError('Completa todos los campos obligatorios.')
      return
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setLoading(true)
    try {
      await register({
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim() || undefined,
        email:     form.email.trim(),
        password:  form.password,
        country:   form.country,
      })
      navigate('/')
    } catch (err) {
      setError(err.message || 'Error al crear la cuenta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F1628] flex flex-col items-center justify-center px-5 py-10 font-sans">

      {/* ── Logo ── */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <img
          src="/assets/logo-alyto.png"
          alt="Alyto"
          className="h-9 w-auto object-contain"
        />
        <p className="text-[0.8125rem] text-[#8A96B8] tracking-wide">
          Crea tu cuenta en segundos
        </p>
      </div>

      {/* ── Card ── */}
      <div
        className="w-full max-w-[400px] rounded-3xl p-7"
        style={{
          background: '#1A2340',
          boxShadow:  '0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <h1 className="text-[1.375rem] font-bold text-white mb-1">Crear cuenta</h1>
        <p className="text-[0.8125rem] text-[#8A96B8] mb-7">
          La entidad legal se asigna automáticamente según tu país.
        </p>

        {/* ── Error Banner ── */}
        {error && (
          <div className="flex items-center gap-2.5 bg-[#EF44441A] border border-[#EF444433] rounded-2xl px-4 py-3 mb-5">
            <AlertCircle size={15} className="text-[#EF4444] flex-shrink-0" />
            <p className="text-[0.8125rem] text-[#F87171]">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Nombre + Apellido */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-[0.08em]">
                Nombre <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                placeholder="Juan"
                className="
                  w-full rounded-xl px-4 py-3.5 text-[0.9375rem] text-white
                  bg-[#0F1628] border border-[#263050]
                  placeholder:text-[#4E5A7A]
                  focus:outline-none focus:border-[#C4CBD8]
                  transition-colors duration-150
                "
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-[0.08em]">
                Apellido
              </label>
              <input
                type="text"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                placeholder="Pérez"
                className="
                  w-full rounded-xl px-4 py-3.5 text-[0.9375rem] text-white
                  bg-[#0F1628] border border-[#263050]
                  placeholder:text-[#4E5A7A]
                  focus:outline-none focus:border-[#C4CBD8]
                  transition-colors duration-150
                "
              />
            </div>
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-[0.08em]">
              Email <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              autoComplete="email"
              className="
                w-full rounded-xl px-4 py-3.5 text-[0.9375rem] text-white
                bg-[#0F1628] border border-[#263050]
                placeholder:text-[#4E5A7A]
                focus:outline-none focus:border-[#C4CBD8]
                transition-colors duration-150
              "
            />
          </div>

          {/* Contraseña */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-[0.08em]">
              Contraseña <span className="text-[#EF4444]">*</span>
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                className="
                  w-full rounded-xl px-4 py-3.5 pr-12 text-[0.9375rem] text-white
                  bg-[#0F1628] border border-[#263050]
                  placeholder:text-[#4E5A7A]
                  focus:outline-none focus:border-[#C4CBD8]
                  transition-colors duration-150
                "
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4E5A7A] hover:text-[#8A96B8] transition-colors"
                tabIndex={-1}
              >
                {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {/* Indicador de fuerza */}
            {form.password.length > 0 && (
              <div className="flex gap-1 mt-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full transition-colors duration-200"
                    style={{
                      background: form.password.length >= (i + 1) * 3
                        ? form.password.length >= 12 ? '#22C55E'
                          : form.password.length >= 8 ? '#C4CBD8'
                          : '#EF4444'
                        : '#263050',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* País — campo crítico para asignación de entidad legal */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-[0.08em]">
              País de residencia <span className="text-[#EF4444]">*</span>
            </label>
            <select
              name="country"
              value={form.country}
              onChange={handleChange}
              className="
                w-full rounded-xl px-4 py-3.5 text-[0.9375rem] text-white
                bg-[#0F1628] border border-[#263050]
                focus:outline-none focus:border-[#C4CBD8]
                transition-colors duration-150 cursor-pointer
                appearance-none
              "
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%234E5A7A' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}
            >
              <option value="" disabled style={{ color: '#4E5A7A' }}>Selecciona tu país</option>
              {COUNTRIES.map(c => (
                <option key={c.value} value={c.value} style={{ background: '#1A2340' }}>
                  {c.label}
                </option>
              ))}
            </select>

            {/* Chip de entidad legal asignada */}
            {selectedCountry && (
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle2 size={13} className="text-[#22C55E] flex-shrink-0" />
                <p className="text-[0.75rem] text-[#8A96B8]">
                  Tu cuenta operará bajo{' '}
                  <span className="text-[#C4CBD8] font-semibold">
                    {ENTITY_LABELS[selectedCountry.entity]}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* CTA */}
          <button
            type="submit"
            disabled={loading}
            className="
              w-full mt-2 rounded-2xl py-4 text-[0.9375rem] font-bold
              bg-[#C4CBD8] text-[#0F1628]
              hover:bg-[#A8B0C0]
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-150
            "
            style={{ boxShadow: '0 4px 20px rgba(196,203,216,0.25)' }}
          >
            {loading ? 'Creando cuenta…' : 'Crear Cuenta'}
          </button>
        </form>

        {/* ── Footer ── */}
        <p className="text-center text-[0.8125rem] text-[#4E5A7A] mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-[#C4CBD8] font-semibold hover:text-white transition-colors">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
