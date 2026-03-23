/**
 * ForgotPasswordPage.jsx — Recuperación de contraseña
 *
 * Envía el email de recuperación. Respuesta siempre positiva para
 * no revelar si el email existe en el sistema (seguridad).
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, ArrowLeft, Mail } from 'lucide-react'
import { forgotPassword } from '../../services/api'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) {
      setError('Ingresa tu email.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await forgotPassword(email.trim())
      setSent(true)
    } catch {
      // Mostrar el mismo mensaje de éxito incluso si hay error (seguridad)
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  // ── Estado: enviado ───────────────────────────────────────────────────────
  if (sent) {
    return (
      <div
        className="w-full max-w-[400px] rounded-3xl p-7 text-center"
        style={{
          background: '#1A2340',
          boxShadow:  '0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{
            background: '#22C55E1A',
            border:     '1px solid #22C55E33',
          }}
        >
          <CheckCircle2 size={32} className="text-[#22C55E]" />
        </div>
        <h2 className="text-[1.25rem] font-bold text-white mb-3">Instrucciones enviadas</h2>
        <p className="text-[0.875rem] text-[#8A96B8] leading-relaxed mb-6">
          Si ese email está registrado, recibirás las instrucciones en tu bandeja de entrada.
          Revisa también la carpeta de spam.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-[0.875rem] font-semibold text-[#C4CBD8] hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Volver al login
        </Link>
      </div>
    )
  }

  // ── Estado: formulario ────────────────────────────────────────────────────
  return (
    <div
      className="w-full max-w-[400px] rounded-3xl p-7"
      style={{
        background: '#1A2340',
        boxShadow:  '0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {/* Ícono */}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: '#C4CBD81A', border: '1px solid #C4CBD833' }}
      >
        <Mail size={22} className="text-[#C4CBD8]" />
      </div>

      <h1 className="text-[1.375rem] font-bold text-white mb-1">¿Olvidaste tu contraseña?</h1>
      <p className="text-[0.8125rem] text-[#8A96B8] mb-6">
        Ingresa tu email y te enviaremos un enlace para restablecerla.
      </p>

      {error && (
        <div className="flex items-center gap-2.5 bg-[#EF44441A] border border-[#EF444433] rounded-2xl px-4 py-3 mb-5">
          <AlertCircle size={15} className="text-[#EF4444] flex-shrink-0" />
          <p className="text-[0.8125rem] text-[#F87171]">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-[0.08em]">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => { setError(''); setEmail(e.target.value) }}
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

        <button
          type="submit"
          disabled={loading}
          className="
            w-full rounded-2xl py-4 text-[0.9375rem] font-bold
            bg-[#C4CBD8] text-[#0F1628]
            hover:bg-[#A8B0C0]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
          "
          style={{ boxShadow: '0 4px 20px rgba(196,203,216,0.25)' }}
        >
          {loading ? 'Enviando…' : 'Enviar instrucciones'}
        </button>
      </form>

      <div className="text-center mt-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-[0.8125rem] text-[#8A96B8] hover:text-[#C4CBD8] transition-colors"
        >
          <ArrowLeft size={14} />
          Volver al login
        </Link>
      </div>
    </div>
  )
}
