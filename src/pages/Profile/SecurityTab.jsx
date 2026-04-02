/**
 * SecurityTab.jsx — Cambio de contraseña, dispositivos y sesión actual.
 *
 * Sección 1: Cambiar contraseña con indicador de fortaleza en tiempo real.
 * Sección 2: Desvincular dispositivo FCM actual.
 * Sección 3: IP + user agent + botón cerrar sesión.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Smartphone, LogOut, Loader2, Check, X, Shield } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

// ── Helpers ───────────────────────────────────────────────────────────────────

function checkPassword(pw) {
  return {
    length:    pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    number:    /[0-9]/.test(pw),
    symbol:    /[^A-Za-z0-9]/.test(pw),
  }
}

function strengthLabel(checks) {
  const passed = Object.values(checks).filter(Boolean).length
  if (passed <= 1) return { label: 'Débil',   color: '#EF4444' }
  if (passed <= 3) return { label: 'Media',   color: '#64748B' }
  return               { label: 'Fuerte',  color: '#1D9E75' }
}

function formatUserAgent(ua) {
  if (!ua) return 'Dispositivo desconocido'
  const browsers = [
    [/Chrome\/[\d.]+/,  'Chrome'],
    [/Firefox\/[\d.]+/, 'Firefox'],
    [/Safari\/[\d.]+/,  'Safari'],
    [/Edge\/[\d.]+/,    'Edge'],
  ]
  const oses = [
    [/Windows NT/,     'Windows'],
    [/Mac OS X/,       'macOS'],
    [/Linux/,          'Linux'],
    [/Android/,        'Android'],
    [/iPhone|iPad/,    'iOS'],
  ]
  const browser = browsers.find(([re]) => re.test(ua))?.[1] ?? 'Navegador'
  const os      = oses.find(([re]) => re.test(ua))?.[1] ?? 'Sistema desconocido'
  return `${browser} en ${os}`
}

// ── Requirement row ───────────────────────────────────────────────────────────

function Req({ ok, label }) {
  return (
    <div className="flex items-center gap-2">
      {ok
        ? <Check size={12} className="text-[#1D9E75] flex-shrink-0" />
        : <X     size={12} className="text-[#94A3B8] flex-shrink-0" />
      }
      <span className={`text-[0.75rem] ${ok ? 'text-[#1D9E75]' : 'text-[#94A3B8]'}`}>{label}</span>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <p className="text-[0.75rem] font-semibold text-[#64748B] uppercase tracking-wider px-4 mb-3">
        {title}
      </p>
      <div className="mx-4 bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        {children}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SecurityTab({ profile, saving, onChangePassword, onRemoveDevice }) {
  const { logout } = useAuth()
  const navigate    = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login?logout=1', { replace: true })
  }

  // Password form
  const [current,  setCurrent]  = useState('')
  const [newPw,    setNewPw]    = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [showCur,  setShowCur]  = useState(false)
  const [showNew,  setShowNew]  = useState(false)
  const [showCon,  setShowCon]  = useState(false)
  const [pwError,  setPwError]  = useState(null)
  const [pwOk,     setPwOk]     = useState(false)

  // Device
  const [devLoading, setDevLoading] = useState(false)
  const [devOk,      setDevOk]      = useState(false)

  const checks   = checkPassword(newPw)
  const strength = strengthLabel(checks)
  const allOk    = Object.values(checks).every(Boolean)
  const match    = newPw === confirm && newPw.length > 0

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwError(null)
    setPwOk(false)

    if (!allOk) {
      setPwError('La contraseña no cumple todos los requisitos.')
      return
    }
    if (!match) {
      setPwError('Las contraseñas no coinciden.')
      return
    }

    try {
      await onChangePassword({ currentPassword: current, newPassword: newPw })
      setPwOk(true)
      setCurrent('')
      setNewPw('')
      setConfirm('')
      setTimeout(() => setPwOk(false), 4000)
    } catch (err) {
      setPwError(err.message ?? 'Error al cambiar la contraseña')
    }
  }

  async function handleRemoveDevice() {
    const token = localStorage.getItem('alyto_fcm_token')
    if (!token) return
    setDevLoading(true)
    try {
      await onRemoveDevice(token)
      setDevOk(true)
    } catch {
      // silencio — el error se muestra en el padre
    } finally {
      setDevLoading(false)
    }
  }

  return (
    <div className="py-4">

      {/* ── SECCIÓN 1 — Cambiar contraseña ──────────────────────────── */}
      <Section title="Cambiar contraseña">
        <form onSubmit={handleChangePassword} className="divide-y divide-[#E2E8F0]">

          {/* Contraseña actual */}
          <div className="px-4 py-3">
            <label className="text-[0.6875rem] font-medium text-[#64748B] uppercase tracking-wide block mb-1.5">
              Contraseña actual
            </label>
            <div className="relative">
              <input
                type={showCur ? 'text' : 'password'}
                value={current}
                onChange={e => setCurrent(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3 pr-10 py-2.5 text-[0.9375rem] text-[#0F172A] placeholder:text-[#CBD5E1] focus:border-[#1D9E75] focus:shadow-[0_0_0_2px_#1D9E7520] outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowCur(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
              >
                {showCur ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Nueva contraseña */}
          <div className="px-4 py-3">
            <label className="text-[0.6875rem] font-medium text-[#64748B] uppercase tracking-wide block mb-1.5">
              Nueva contraseña
            </label>
            <div className="relative mb-2">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3 pr-10 py-2.5 text-[0.9375rem] text-[#0F172A] placeholder:text-[#CBD5E1] focus:border-[#1D9E75] focus:shadow-[0_0_0_2px_#1D9E7520] outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Indicador de fortaleza */}
            {newPw.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[0.6875rem] text-[#64748B]">Fortaleza</span>
                  <span className="text-[0.6875rem] font-semibold" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map(i => {
                    const filled = Object.values(checks).filter(Boolean).length > i
                    return (
                      <div
                        key={i}
                        className="flex-1 h-1 rounded-full transition-all"
                        style={{ background: filled ? strength.color : '#E2E8F0' }}
                      />
                    )
                  })}
                </div>
              </div>
            )}

            {/* Requisitos */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
              <Req ok={checks.length}    label="Mínimo 8 caracteres" />
              <Req ok={checks.uppercase} label="Una mayúscula" />
              <Req ok={checks.number}    label="Un número" />
              <Req ok={checks.symbol}    label="Un símbolo" />
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div className="px-4 py-3">
            <label className="text-[0.6875rem] font-medium text-[#64748B] uppercase tracking-wide block mb-1.5">
              Confirmar nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showCon ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                className={`w-full bg-white border rounded-xl px-3 pr-10 py-2.5 text-[0.9375rem] text-[#0F172A] placeholder:text-[#CBD5E1] focus:shadow-[0_0_0_2px_#1D9E7520] outline-none transition-all ${
                  confirm.length > 0 && !match
                    ? 'border-[#EF4444] focus:border-[#EF4444]'
                    : 'border-[#E2E8F0] focus:border-[#1D9E75]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowCon(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
              >
                {showCon ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {confirm.length > 0 && !match && (
              <p className="text-[0.75rem] text-[#EF4444] mt-1.5">Las contraseñas no coinciden</p>
            )}
          </div>

          {/* Feedback + botón */}
          <div className="px-4 py-3">
            {pwError && (
              <div className="mb-3 bg-[#EF44441A] border border-[#EF444433] rounded-xl px-3 py-2.5 flex items-center gap-2">
                <X size={13} className="text-[#EF4444] flex-shrink-0" />
                <span className="text-[0.8125rem] text-[#EF4444]">{pwError}</span>
              </div>
            )}
            {pwOk && (
              <div className="mb-3 bg-[#1D9E751A] border border-[#1D9E7533] rounded-xl px-3 py-2.5 flex items-center gap-2">
                <Check size={13} className="text-[#1D9E75] flex-shrink-0" />
                <span className="text-[0.8125rem] text-[#1D9E75]">Contraseña actualizada correctamente</span>
              </div>
            )}
            <button
              type="submit"
              disabled={saving || !current || !allOk || !match}
              className="w-full flex items-center justify-center gap-2 bg-[#1D9E75] text-white font-bold text-[0.9375rem] rounded-xl py-3 disabled:opacity-40 transition-all hover:bg-[#178A63] shadow-[0_4px_20px_rgba(29,158,117,0.3)]"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />}
              Cambiar contraseña
            </button>
          </div>
        </form>
      </Section>

      {/* ── SECCIÓN 2 — Dispositivos vinculados ─────────────────────── */}
      <Section title="Dispositivos vinculados">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] flex items-center justify-center flex-shrink-0">
              <Smartphone size={18} className="text-[#64748B]" />
            </div>
            <div>
              <p className="text-[0.9375rem] font-semibold text-[#0F172A]">
                {formatUserAgent(profile?.sessions?.[0]?.userAgent ?? navigator.userAgent)}
              </p>
              <p className="text-[0.75rem] text-[#64748B]">Dispositivo actual</p>
            </div>
          </div>

          {devOk ? (
            <div className="bg-[#1D9E751A] border border-[#1D9E7533] rounded-xl px-3 py-2.5 flex items-center gap-2">
              <Check size={13} className="text-[#1D9E75]" />
              <span className="text-[0.8125rem] text-[#1D9E75]">Dispositivo desvinculado</span>
            </div>
          ) : (
            <button
              onClick={handleRemoveDevice}
              disabled={devLoading || !localStorage.getItem('alyto_fcm_token')}
              className="w-full flex items-center justify-center gap-2 border border-[#EF444433] bg-[#EF44441A] text-[#EF4444] rounded-xl py-2.5 text-[0.875rem] font-semibold disabled:opacity-40 transition-all hover:bg-[#EF444433]"
            >
              {devLoading ? <Loader2 size={14} className="animate-spin" /> : <Smartphone size={14} />}
              Desvincular este dispositivo
            </button>
          )}
        </div>
      </Section>

      {/* ── SECCIÓN 3 — Sesión actual ────────────────────────────────── */}
      <Section title="Sesión actual">
        <div className="px-4 py-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] flex items-center justify-center flex-shrink-0">
              <Shield size={18} className="text-[#64748B]" />
            </div>
            <div>
              <p className="text-[0.9375rem] font-semibold text-[#0F172A]">
                {formatUserAgent(navigator.userAgent)}
              </p>
              {profile?.sessions?.[0]?.ip && (
                <p className="text-[0.75rem] text-[#94A3B8] mt-0.5 font-mono">
                  {profile.sessions[0].ip}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 border border-[#E2E8F0] bg-transparent text-[#64748B] rounded-xl py-2.5 text-[0.875rem] font-semibold transition-all hover:border-[#EF444433] hover:text-[#EF4444] hover:bg-[#EF44441A]"
          >
            <LogOut size={14} />
            Cerrar sesión
          </button>
        </div>
      </Section>

    </div>
  )
}
