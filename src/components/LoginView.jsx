/**
 * LoginView.jsx — Pantalla de Inicio de Sesión
 *
 * Diseño: dark premium fintech — fondo #0F1628, card #1A2340,
 * inputs con foco plateado, CTA en Alyto Silver (#C4CBD8).
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LoginView() {
  const navigate            = useNavigate()
  const { login }           = useAuth()

  const [form,    setForm]    = useState({ email: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function handleChange(e) {
    setError('')
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password) {
      setError('Completa todos los campos.')
      return
    }
    setLoading(true)
    try {
      await login({ email: form.email, password: form.password })
      navigate('/')
    } catch (err) {
      setError(err.message || 'Credenciales inválidas.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F1628] flex flex-col items-center justify-center px-5 font-sans">

      {/* ── Logo ── */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <img
          src="/assets/logo-alyto.png"
          alt="Alyto"
          className="h-9 w-auto object-contain"
        />
        <p className="text-[0.8125rem] text-[#8A96B8] tracking-wide">
          Plataforma Financiera Multi-Entidad
        </p>
      </div>

      {/* ── Card ── */}
      <div
        className="w-full max-w-[400px] rounded-3xl p-7"
        style={{
          background:  '#1A2340',
          boxShadow:   '0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <h1 className="text-[1.375rem] font-bold text-white mb-1">Bienvenido de nuevo</h1>
        <p className="text-[0.8125rem] text-[#8A96B8] mb-7">Accede a tu cuenta Alyto</p>

        {/* ── Error Banner ── */}
        {error && (
          <div className="flex items-center gap-2.5 bg-[#EF44441A] border border-[#EF444433] rounded-2xl px-4 py-3 mb-5">
            <AlertCircle size={15} className="text-[#EF4444] flex-shrink-0" />
            <p className="text-[0.8125rem] text-[#F87171]">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-[0.08em]">
              Email
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
              style={{ '--tw-ring-shadow': 'none' }}
            />
          </div>

          {/* Contraseña */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-[0.08em]">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                autoComplete="current-password"
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
            {loading ? 'Iniciando sesión…' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* ── Footer ── */}
        <p className="text-center text-[0.8125rem] text-[#4E5A7A] mt-6">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-[#C4CBD8] font-semibold hover:text-white transition-colors">
            Regístrate
          </Link>
        </p>
      </div>

      {/* ── Disclaimer multi-entidad ── */}
      <p className="mt-6 text-center text-[0.6875rem] text-[#4E5A7A] max-w-[320px] leading-relaxed">
        Al acceder aceptas los Términos de Servicio de AV Finance LLC, SpA y SRL según
        la jurisdicción correspondiente a tu cuenta.
      </p>
    </div>
  )
}
