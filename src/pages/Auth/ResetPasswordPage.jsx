/**
 * ResetPasswordPage.jsx — Restablecimiento de contraseña
 *
 * Recibe el token desde los params de la URL (/reset-password/:token).
 * Si el token es inválido/expirado → muestra error con opción de re-solicitar.
 * Si es válido → permite ingresar nueva contraseña.
 *
 * Tema: Alyto Arctic Light
 */

import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react'
import { resetPassword } from '../../services/api'

// ── Indicador de fortaleza ────────────────────────────────────────────────────

function StrengthBar({ password }) {
  if (!password.length) return null
  const colors = [
    password.length >= 4  ? (password.length >= 12 ? '#1D9E75' : password.length >= 8 ? '#F59E0B' : '#EF4444') : '#E2E8F0',
    password.length >= 6  ? (password.length >= 12 ? '#1D9E75' : password.length >= 8 ? '#F59E0B' : '#EF4444') : '#E2E8F0',
    password.length >= 9  ? (password.length >= 12 ? '#1D9E75' : '#F59E0B') : '#E2E8F0',
    password.length >= 12 ? '#1D9E75' : '#E2E8F0',
  ]
  return (
    <div className="flex gap-1 mt-1">
      {colors.map((color, i) => (
        <div key={i} className="h-1 flex-1 rounded-full transition-colors duration-200" style={{ background: color }} />
      ))}
    </div>
  )
}

// ── Token inválido/expirado ───────────────────────────────────────────────────

function InvalidTokenScreen() {
  return (
    <div
      className="w-full max-w-[400px] rounded-3xl p-7 text-center"
      style={{
        background: '#FFFFFF',
        border:     '1px solid #E2E8F0',
        boxShadow:  '0 8px 40px rgba(15,23,42,0.08), 0 2px 8px rgba(15,23,42,0.04)',
      }}
    >
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-[#EF44441A] border border-[#EF444433]">
        <AlertCircle size={32} className="text-[#EF4444]" />
      </div>
      <h2 className="text-[1.25rem] font-bold text-[#0F172A] mb-3">Enlace inválido o expirado</h2>
      <p className="text-[0.875rem] text-[#64748B] leading-relaxed mb-6">
        Este enlace de restablecimiento es inválido o ya venció.
        Los enlaces expiran después de 1 hora.
      </p>
      <Link
        to="/forgot-password"
        className="inline-block w-full py-4 rounded-2xl text-[0.9375rem] font-bold text-white bg-[#1D9E75] hover:bg-[#18876A] transition-colors text-center"
        style={{ boxShadow: '0 4px 20px rgba(29,158,117,0.25)' }}
      >
        Solicitar nuevo enlace
      </Link>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const { token }  = useParams()
  const navigate   = useNavigate()

  const [form, setForm] = useState({ password: '', confirm: '' })
  const [showPwd,    setShowPwd]    = useState(false)
  const [showConf,   setShowConf]   = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [tokenError, setTokenError] = useState(false)
  const [success,    setSuccess]    = useState(false)

  function handleChange(e) {
    setError('')
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.password || !form.confirm) {
      setError('Completa todos los campos.')
      return
    }
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await resetPassword({ token, newPassword: form.password })
      setSuccess(true)
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state:   { toast: 'Contraseña cambiada exitosamente. Ya puedes iniciar sesión.' },
        })
      }, 2000)
    } catch (err) {
      if (err.data?.expired || err.status === 400) {
        setTokenError(true)
      } else {
        setError(err.message || 'Error al cambiar la contraseña. Intenta nuevamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const cardStyle = {
    background: '#FFFFFF',
    border:     '1px solid #E2E8F0',
    boxShadow:  '0 8px 40px rgba(15,23,42,0.08), 0 2px 8px rgba(15,23,42,0.04)',
  }

  if (!token || tokenError) return <InvalidTokenScreen />

  // ── Estado: éxito ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="w-full max-w-[400px] rounded-3xl p-7 text-center" style={cardStyle}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-[#1D9E751A] border border-[#1D9E7533]">
          <CheckCircle2 size={32} className="text-[#1D9E75]" />
        </div>
        <h2 className="text-[1.25rem] font-bold text-[#0F172A] mb-2">¡Contraseña cambiada!</h2>
        <p className="text-[0.875rem] text-[#64748B]">Redirigiendo al login…</p>
      </div>
    )
  }

  // ── Estado: formulario ────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-[400px] rounded-3xl p-7" style={cardStyle}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 bg-[#1D9E751A] border border-[#1D9E7533]">
        <KeyRound size={22} className="text-[#1D9E75]" />
      </div>

      <h1 className="text-[1.375rem] font-bold text-[#0F172A] mb-1">Nueva contraseña</h1>
      <p className="text-[0.8125rem] text-[#64748B] mb-6">
        Elige una contraseña segura para tu cuenta Alyto.
      </p>

      {error && (
        <div className="flex items-center gap-2.5 bg-[#EF44441A] border border-[#EF444433] rounded-2xl px-4 py-3 mb-5">
          <AlertCircle size={15} className="text-[#EF4444] flex-shrink-0" />
          <p className="text-[0.8125rem] text-[#EF4444]">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Nueva contraseña */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.75rem] font-semibold text-[#94A3B8] uppercase tracking-[0.08em]">
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
              className="w-full rounded-xl px-4 py-3.5 pr-12 text-[0.9375rem] text-[#0F172A] bg-white border border-[#E2E8F0] placeholder:text-[#CBD5E1] focus:outline-none focus:border-[#1D9E75] focus:shadow-[0_0_0_3px_#1D9E7520] transition-all duration-150"
            />
            <button type="button" onClick={() => setShowPwd(v => !v)} tabIndex={-1}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors">
              {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          <StrengthBar password={form.password} />
        </div>

        {/* Confirmar */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.75rem] font-semibold text-[#94A3B8] uppercase tracking-[0.08em]">
            Confirmar contraseña
          </label>
          <div className="relative">
            <input
              type={showConf ? 'text' : 'password'}
              name="confirm"
              value={form.confirm}
              onChange={handleChange}
              placeholder="Repite la contraseña"
              autoComplete="new-password"
              className={`w-full rounded-xl px-4 py-3.5 pr-12 text-[0.9375rem] text-[#0F172A] bg-white border placeholder:text-[#CBD5E1] focus:outline-none focus:border-[#1D9E75] focus:shadow-[0_0_0_3px_#1D9E7520] transition-all duration-150 ${
                form.confirm && form.confirm !== form.password ? 'border-[#EF4444]' : 'border-[#E2E8F0]'
              }`}
            />
            <button type="button" onClick={() => setShowConf(v => !v)} tabIndex={-1}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors">
              {showConf ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-1 rounded-2xl py-4 text-[0.9375rem] font-bold text-white bg-[#1D9E75] hover:bg-[#18876A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
          style={{ boxShadow: '0 4px 20px rgba(29,158,117,0.25)' }}
        >
          {loading ? 'Cambiando contraseña…' : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  )
}
