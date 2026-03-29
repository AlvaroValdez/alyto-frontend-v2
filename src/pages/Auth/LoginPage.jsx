/**
 * LoginPage.jsx — Pantalla de inicio de sesión
 *
 * Mejoras sobre LoginView:
 *  - rememberMe (sessionStorage vs localStorage)
 *  - Link "¿Olvidaste tu contraseña?" → /forgot-password
 *  - Redirect a location.state.from tras login exitoso
 *  - Redirect a /kyc si kycStatus !== 'approved'
 *  - Banner de sesión expirada si ?expired=1 en URL
 */

import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, Clock, CheckCircle } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

// Mensajes de error normalizados (no revelan si el email existe)
function normalizeError(err) {
  const msg = err?.message ?? ''
  if (msg.toLowerCase().includes('demasiados') || err?.status === 429) {
    return 'Demasiados intentos. Espera 15 minutos antes de intentar de nuevo.'
  }
  return 'Email o contraseña incorrectos.'
}

export default function LoginPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { login } = useAuth()

  const expired       = new URLSearchParams(location.search).get('expired') === '1'
  const loggedOut     = new URLSearchParams(location.search).get('logout') === '1'
  const stateMessage  = location.state?.message ?? null

  const [form, setForm] = useState({ email: '', password: '', rememberMe: true })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  function handleChange(e) {
    setError('')
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password) {
      setError('Completa todos los campos.')
      return
    }
    setLoading(true)
    try {
      const { user } = await login({
        email:      form.email.trim(),
        password:   form.password,
        rememberMe: form.rememberMe,
      })

      // KYC no completado → siempre va a /kyc primero
      if (user.kycStatus !== 'approved') {
        navigate('/kyc', { replace: true })
        return
      }

      // Redirigir a la ruta que intentaba acceder, o al dashboard
      const from = location.state?.from?.pathname ?? '/dashboard'
      navigate(from, { replace: true })

    } catch (err) {
      setError(normalizeError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="w-full max-w-[400px] rounded-3xl p-7"
      style={{
        background:  '#1A2340',
        boxShadow:   '0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <h1 className="text-[1.375rem] font-bold text-white mb-1">Bienvenido de nuevo</h1>
      <p className="text-[0.8125rem] text-[#8A96B8] mb-6">Accede a tu cuenta Alyto</p>

      {/* Banner sesión cerrada correctamente */}
      {loggedOut && !error && (
        <div className="flex items-center gap-2.5 bg-[#22C55E1A] border border-[#22C55E33] rounded-2xl px-4 py-3 mb-5">
          <CheckCircle size={15} className="text-[#22C55E] flex-shrink-0" />
          <p className="text-[0.8125rem] text-[#22C55E]">Sesión cerrada correctamente.</p>
        </div>
      )}

      {/* Banner mensaje desde redirect (ej. /kyc/return con sesión perdida) */}
      {stateMessage && !expired && !error && (
        <div className="flex items-center gap-2.5 bg-[#C4CBD81A] border border-[#C4CBD833] rounded-2xl px-4 py-3 mb-5">
          <Clock size={15} className="text-[#C4CBD8] flex-shrink-0" />
          <p className="text-[0.8125rem] text-[#C4CBD8]">{stateMessage}</p>
        </div>
      )}

      {/* Banner sesión expirada */}
      {expired && !error && (
        <div className="flex items-center gap-2.5 bg-[#C4CBD81A] border border-[#C4CBD833] rounded-2xl px-4 py-3 mb-5">
          <Clock size={15} className="text-[#C4CBD8] flex-shrink-0" />
          <p className="text-[0.8125rem] text-[#C4CBD8]">Tu sesión expiró. Vuelve a iniciar sesión.</p>
        </div>
      )}

      {/* Error banner */}
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
          />
        </div>

        {/* Contraseña */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-[0.08em]">
              Contraseña
            </label>
            <Link
              to="/forgot-password"
              className="text-[0.75rem] text-[#C4CBD8] hover:text-white transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
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

        {/* Recordarme */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            className={`w-5 h-5 rounded-md flex items-center justify-center border-2 flex-shrink-0 transition-all duration-150
              ${form.rememberMe ? 'bg-[#C4CBD8] border-[#C4CBD8]' : 'bg-transparent border-[#4E5A7A]'}`}
            onClick={() => setForm(prev => ({ ...prev, rememberMe: !prev.rememberMe }))}
          >
            {form.rememberMe && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="#0F1628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <input
            type="checkbox"
            name="rememberMe"
            className="hidden"
            checked={form.rememberMe}
            onChange={handleChange}
          />
          <span className="text-[0.8125rem] text-[#8A96B8]">Recordarme</span>
        </label>

        {/* CTA */}
        <button
          type="submit"
          disabled={loading}
          className="
            w-full mt-1 rounded-2xl py-4 text-[0.9375rem] font-bold
            bg-[#C4CBD8] text-[#0F1628]
            hover:bg-[#A8B0C0]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
          "
          style={{ boxShadow: '0 4px 20px rgba(196,203,216,0.25)' }}
        >
          {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
        </button>
      </form>

      {/* Footer */}
      <p className="text-center text-[0.8125rem] text-[#4E5A7A] mt-6">
        ¿No tienes cuenta?{' '}
        <Link to="/register" className="text-[#C4CBD8] font-semibold hover:text-white transition-colors">
          Regístrate
        </Link>
      </p>
    </div>
  )
}
