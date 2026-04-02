/**
 * ForgotPasswordPage.jsx — Recuperación de contraseña
 *
 * Tema: Alyto Arctic Light
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
          background: '#FFFFFF',
          border:     '1px solid #E2E8F0',
          boxShadow:  '0 8px 40px rgba(15,23,42,0.08), 0 2px 8px rgba(15,23,42,0.04)',
        }}
      >
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-[#1D9E751A] border border-[#1D9E7533]">
          <CheckCircle2 size={32} className="text-[#1D9E75]" />
        </div>
        <h2 className="text-[1.25rem] font-bold text-[#0F172A] mb-3">Instrucciones enviadas</h2>
        <p className="text-[0.875rem] text-[#64748B] leading-relaxed mb-6">
          Si ese email está registrado, recibirás las instrucciones en tu bandeja de entrada.
          Revisa también la carpeta de spam.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-[0.875rem] font-semibold text-[#1D9E75] hover:text-[#18876A] transition-colors"
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
        background: '#FFFFFF',
        border:     '1px solid #E2E8F0',
        boxShadow:  '0 8px 40px rgba(15,23,42,0.08), 0 2px 8px rgba(15,23,42,0.04)',
      }}
    >
      {/* Ícono */}
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 bg-[#1D9E751A] border border-[#1D9E7533]">
        <Mail size={22} className="text-[#1D9E75]" />
      </div>

      <h1 className="text-[1.375rem] font-bold text-[#0F172A] mb-1">¿Olvidaste tu contraseña?</h1>
      <p className="text-[0.8125rem] text-[#64748B] mb-6">
        Ingresa tu email y te enviaremos un enlace para restablecerla.
      </p>

      {error && (
        <div className="flex items-center gap-2.5 bg-[#EF44441A] border border-[#EF444433] rounded-2xl px-4 py-3 mb-5">
          <AlertCircle size={15} className="text-[#EF4444] flex-shrink-0" />
          <p className="text-[0.8125rem] text-[#EF4444]">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.75rem] font-semibold text-[#94A3B8] uppercase tracking-[0.08em]">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => { setError(''); setEmail(e.target.value) }}
            placeholder="tu@email.com"
            autoComplete="email"
            className="w-full rounded-xl px-4 py-3.5 text-[0.9375rem] text-[#0F172A] bg-white border border-[#E2E8F0] placeholder:text-[#CBD5E1] focus:outline-none focus:border-[#1D9E75] focus:shadow-[0_0_0_3px_#1D9E7520] transition-all duration-150"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl py-4 text-[0.9375rem] font-bold text-white bg-[#1D9E75] hover:bg-[#18876A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
          style={{ boxShadow: '0 4px 20px rgba(29,158,117,0.25)' }}
        >
          {loading ? 'Enviando…' : 'Enviar instrucciones'}
        </button>
      </form>

      <div className="text-center mt-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-[0.8125rem] text-[#64748B] hover:text-[#1D9E75] transition-colors"
        >
          <ArrowLeft size={14} />
          Volver al login
        </Link>
      </div>
    </div>
  )
}
