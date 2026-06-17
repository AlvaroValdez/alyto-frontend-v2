/**
 * EmailVerifyPage.jsx — Verificación de email con código de 6 dígitos.
 *
 * Paso 1 del onboarding (post-registro): el usuario confirma su correo antes de
 * pasar al formulario de cumplimiento y a la biometría.
 *
 * Flujo: /register → /verify-email → /kyc
 *  - Si el email ya está verificado, redirige a /kyc.
 *  - Al verificar con éxito, actualiza el contexto y navega a /kyc.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MailCheck, AlertCircle, CheckCircle2, Loader2, RotateCw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { verifyEmail, resendVerification } from '../../services/api'

const CODE_LEN = 6

export default function EmailVerifyPage() {
  const navigate             = useNavigate()
  const { user, updateUser } = useAuth()

  const [digits,    setDigits]    = useState(Array(CODE_LEN).fill(''))
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown,  setCooldown]  = useState(0)   // segundos hasta poder reenviar
  const [resentMsg, setResentMsg] = useState('')

  const inputsRef = useRef([])

  // Si el email ya está verificado, saltar este paso.
  useEffect(() => {
    if (user?.emailVerified) navigate('/kyc', { replace: true })
  }, [user?.emailVerified, navigate])

  // Foco inicial en el primer dígito.
  useEffect(() => { inputsRef.current[0]?.focus() }, [])

  // Countdown de reenvío.
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown(c => (c <= 1 ? 0 : c - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  const code = digits.join('')

  const submit = useCallback(async (value) => {
    if (value.length !== CODE_LEN || loading) return
    setLoading(true)
    setError('')
    try {
      await verifyEmail(value)
      setSuccess(true)
      updateUser({ emailVerified: true })
      setTimeout(() => navigate('/kyc', { replace: true }), 900)
    } catch (err) {
      setError(err?.data?.error || err.message || 'No pudimos verificar el código.')
      setDigits(Array(CODE_LEN).fill(''))
      inputsRef.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }, [loading, navigate, updateUser])

  function setDigitAt(idx, char) {
    setError('')
    setDigits(prev => {
      const next = [...prev]
      next[idx] = char
      return next
    })
  }

  function handleChange(idx, e) {
    const raw = e.target.value.replace(/\D/g, '')
    if (!raw) { setDigitAt(idx, ''); return }
    // Si pegan varios dígitos en un solo input, distribuir.
    if (raw.length > 1) { handlePasteValue(raw, idx); return }
    setDigitAt(idx, raw)
    if (idx < CODE_LEN - 1) inputsRef.current[idx + 1]?.focus()
    else {
      const full = digits.slice(0, idx).join('') + raw
      if (full.length === CODE_LEN) submit(full)
    }
  }

  function handleKeyDown(idx, e) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus()
      setDigitAt(idx - 1, '')
    }
  }

  function handlePasteValue(raw, startIdx = 0) {
    const clean = raw.replace(/\D/g, '').slice(0, CODE_LEN)
    if (!clean) return
    setError('')
    setDigits(prev => {
      const next = [...prev]
      for (let i = 0; i < clean.length && startIdx + i < CODE_LEN; i++) {
        next[startIdx + i] = clean[i]
      }
      return next
    })
    const lastIdx = Math.min(startIdx + clean.length, CODE_LEN) - 1
    inputsRef.current[lastIdx]?.focus()
    if (clean.length === CODE_LEN) submit(clean)
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return
    setResending(true)
    setError('')
    setResentMsg('')
    try {
      await resendVerification()
      setResentMsg('Te enviamos un código nuevo.')
      setCooldown(60)
    } catch (err) {
      const wait = err?.data?.retryAfter
      if (wait) { setCooldown(wait); setError(`Espera ${wait}s antes de pedir otro código.`) }
      else setError(err?.data?.error || err.message || 'No pudimos reenviar el código.')
    } finally {
      setResending(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans flex flex-col max-w-[430px] mx-auto">
      {/* Sub-header */}
      <div className="px-5 pt-4 pb-2">
        <p className="text-[0.75rem] text-[#64748B]">Onboarding · Paso 1 de 3</p>
        <h1 className="text-[1.0625rem] font-bold text-[#0D1F3C] leading-tight">Verifica tu email</h1>
      </div>

      <div className="flex-1 px-5 pb-10">
        <div className="flex flex-col gap-6">
          {/* Hero */}
          <div className="flex flex-col items-center py-4">
            <div
              className="w-20 h-20 rounded-[22px] flex items-center justify-center mb-5"
              style={{
                background: success
                  ? 'radial-gradient(circle, #1D9E7522 0%, #1D9E7508 100%)'
                  : 'linear-gradient(135deg, #F0FDF9 0%, #FFFFFF 100%)',
                border:    success ? '1.5px solid #1D9E7544' : '1.5px solid #233E5833',
                boxShadow: '0 8px 32px rgba(35,62,88,0.12), inset 0 1px 0 rgba(35,62,88,0.1)',
              }}
            >
              {success
                ? <CheckCircle2 size={36} className="text-[#1D9E75]" />
                : <MailCheck    size={34} className="text-[#233E58]" />}
            </div>
            <h2 className="text-[1.375rem] font-bold text-[#0F172A] text-center mb-2">
              {success ? '¡Email verificado!' : 'Revisa tu correo'}
            </h2>
            <p className="text-[0.875rem] text-[#64748B] text-center leading-relaxed px-2">
              {success
                ? 'Continuemos con tu información de cumplimiento.'
                : <>Enviamos un código de 6 dígitos a{' '}
                    <span className="font-semibold text-[#0F172A]">{user?.email}</span></>}
            </p>
          </div>

          {!success && (
            <>
              {/* OTP boxes */}
              <div className="flex justify-center gap-2.5" onPaste={e => {
                e.preventDefault()
                handlePasteValue(e.clipboardData.getData('text'))
              }}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => (inputsRef.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    value={d}
                    disabled={loading}
                    onChange={e => handleChange(i, e)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    className="text-center font-bold transition-all duration-150"
                    style={{
                      width:        '48px',
                      height:       '56px',
                      borderRadius: '14px',
                      border:       `1.5px solid ${error ? '#EF4444' : d ? '#233E58' : '#E2E8F0'}`,
                      background:   d ? '#233E5808' : '#FFFFFF',
                      color:        '#0D1F3C',
                      fontSize:     '1.5rem',
                      outline:      'none',
                      boxShadow:    d ? '0 2px 8px rgba(35,62,88,0.08)' : 'none',
                    }}
                  />
                ))}
              </div>

              {error && (
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#EF44441A] border border-[#EF444433]">
                  <AlertCircle size={16} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
                  <p className="text-[0.8125rem] text-[#EF4444]">{error}</p>
                </div>
              )}

              {resentMsg && !error && (
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#1D9E751A] border border-[#1D9E7533]">
                  <CheckCircle2 size={16} className="text-[#1D9E75] flex-shrink-0 mt-0.5" />
                  <p className="text-[0.8125rem] text-[#178A65]">{resentMsg}</p>
                </div>
              )}

              {/* Verify button */}
              <button
                type="button"
                onClick={() => submit(code)}
                disabled={code.length !== CODE_LEN || loading}
                className="w-full py-4 rounded-2xl font-bold text-[0.9375rem] flex items-center justify-center gap-2.5 transition-all duration-150"
                style={{
                  background: code.length === CODE_LEN && !loading ? '#233E58' : 'transparent',
                  color:      code.length === CODE_LEN && !loading ? 'white' : '#94A3B8',
                  boxShadow:  code.length === CODE_LEN && !loading ? '0 4px 20px rgba(35,62,88,0.3)' : 'none',
                  border:     code.length === CODE_LEN && !loading ? 'none' : '2px dashed #CBD5E1',
                  cursor:     code.length === CODE_LEN && !loading ? 'pointer' : 'not-allowed',
                }}
              >
                {loading
                  ? <><Loader2 size={18} className="animate-spin" /> Verificando…</>
                  : 'Verificar'}
              </button>

              {/* Resend */}
              <div className="text-center">
                <span className="text-[0.8125rem] text-[#94A3B8]">¿No recibiste el código? </span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || resending}
                  className="text-[0.8125rem] font-semibold inline-flex items-center gap-1"
                  style={{
                    color:  cooldown > 0 || resending ? '#94A3B8' : '#233E58',
                    cursor: cooldown > 0 || resending ? 'not-allowed' : 'pointer',
                  }}
                >
                  {resending && <RotateCw size={13} className="animate-spin" />}
                  {cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Reenviar código'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
