/**
 * KycPage.jsx — Verificación de identidad con Stripe Identity
 *
 * 4 estados según user.kycStatus:
 *  - null / 'pending' → Intro: botón para iniciar
 *  - 'in_review'      → Procesando con polling (cada 3s, timeout 5min)
 *  - 'approved'       → Verificado ✅
 *  - 'rejected'       → Rechazado ❌ con opción de reintentar
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import {
  ShieldCheck,
  ScanFace,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  MessageCircle,
  Lock,
} from 'lucide-react'
import { useAuth }            from '../../context/AuthContext'
import { createKycSession, getKycStatus } from '../../services/api'
import { LEGAL_TERMS, ENTITY_NAMES, ENTITY_JURISDICTIONS } from '../../utils/legalTerms'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

const WHATSAPP_SUPPORT = 'https://wa.me/56912345678?text=Necesito%20ayuda%20con%20mi%20verificaci%C3%B3n%20Alyto'

// ── Estado: Intro ─────────────────────────────────────────────────────────────

function IntroState({ entName, entJuris, entity, terms, onStart, loading, error, tosAccepted, setTosAccepted }) {
  return (
    <div className="flex flex-col gap-5">
      {/* Hero */}
      <div className="flex flex-col items-center py-6">
        <div
          className="w-20 h-20 rounded-[22px] flex items-center justify-center mb-5"
          style={{
            background: 'linear-gradient(135deg, #F0FDF9 0%, #FFFFFF 100%)',
            border:     '1.5px solid #1D9E7533',
            boxShadow:  '0 8px 32px rgba(29,158,117,0.12), inset 0 1px 0 rgba(29,158,117,0.1)',
          }}
        >
          <ScanFace size={36} className="text-[#1D9E75]" />
        </div>
        <h2 className="text-[1.375rem] font-bold text-[#0F172A] text-center mb-2">Verifica tu identidad</h2>
        <p className="text-[0.875rem] text-[#64748B] text-center leading-relaxed px-2">
          Necesitamos verificar tu identidad para cumplir con las regulaciones financieras.
          El proceso toma menos de 2 minutos.
        </p>
      </div>

      {/* Qué necesitas */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'white', border: '1px solid #E2E8F0' }}
      >
        <p className="text-[0.75rem] font-semibold text-[#64748B] uppercase tracking-wider mb-3">
          Lo que necesitas
        </p>
        {[
          'Documento de identidad vigente (cédula, pasaporte o licencia)',
          'Cámara frontal del dispositivo',
          'Buena iluminación',
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-2.5 mb-2 last:mb-0">
            <CheckCircle2 size={14} className="text-[#1D9E75] flex-shrink-0 mt-0.5" />
            <p className="text-[0.8125rem] text-[#64748B]">{item}</p>
          </div>
        ))}
      </div>

      {/* Trust badges */}
      <div className="flex gap-3">
        {[
          { icon: Lock,        label: 'Cifrado E2E' },
          { icon: ShieldCheck, label: 'ISO 27001' },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex-1 flex items-center gap-2 rounded-2xl px-3 py-3"
            style={{ background: 'white', border: '1px solid #E2E8F0' }}
          >
            <Icon size={14} className="text-[#1D9E75] flex-shrink-0" />
            <p className="text-[0.6875rem] font-medium text-[#64748B]">{label}</p>
          </div>
        ))}
      </div>

      {/* ToS */}
      <label
        className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all duration-150
          ${tosAccepted ? 'border-[#1D9E7533] bg-[#1D9E7508]' : 'border-[#E2E8F0] bg-white hover:border-[#1D9E7533]'}`}
      >
        <div
          className={`w-5 h-5 rounded-md flex items-center justify-center border-2 flex-shrink-0 mt-0.5 transition-all duration-150
            ${tosAccepted ? 'bg-[#1D9E75] border-[#1D9E75]' : 'bg-transparent border-[#CBD5E1]'}`}
          onClick={() => setTosAccepted(v => !v)}
        >
          {tosAccepted && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <input type="checkbox" className="hidden" checked={tosAccepted} onChange={e => setTosAccepted(e.target.checked)} />
        <div>
          <p className="text-[0.8125rem] font-semibold text-[#0F172A] leading-snug">
            He leído y acepto los Términos de Servicio de{' '}
            <span className="text-[#1D9E75]">{entName}</span>
          </p>
          <p className="text-[0.6875rem] text-[#94A3B8] mt-1">
            {entity} · {entJuris}
          </p>
        </div>
      </label>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#EF44441A] border border-[#EF444433]">
          <AlertCircle size={16} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
          <p className="text-[0.8125rem] text-[#EF4444]">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={onStart}
        disabled={!tosAccepted || loading}
        className="w-full py-4 rounded-2xl font-bold text-[0.9375rem] flex items-center justify-center gap-2.5 transition-all duration-150"
        style={{
          background: tosAccepted && !loading ? '#1D9E75' : 'transparent',
          color:      tosAccepted && !loading ? 'white' : '#94A3B8',
          boxShadow:  tosAccepted && !loading ? '0 4px 20px rgba(29,158,117,0.3)' : 'none',
          border:     tosAccepted && !loading ? 'none' : '2px dashed #CBD5E1',
          cursor:     tosAccepted && !loading ? 'pointer' : 'not-allowed',
        }}
      >
        {loading ? (
          <><Loader2 size={18} className="animate-spin" /> Iniciando verificación…</>
        ) : (
          <><ScanFace size={18} /> {tosAccepted ? 'Comenzar verificación' : 'Acepta los términos para continuar'}</>
        )}
      </button>

      <p className="text-[0.625rem] text-[#94A3B8] text-center leading-relaxed">
        Verificación procesada por{' '}
        <span className="text-[#64748B]">Stripe Identity</span>. Tus datos biométricos no se almacenan en Alyto.
      </p>
    </div>
  )
}

// ── Estado: En proceso (polling) ──────────────────────────────────────────────

function PendingState({ onDashboard, timedOut, onManualCheck }) {
  return (
    <div className="flex flex-col items-center py-10 gap-6">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: '#F8FAFC', border: '2px solid #E2E8F0' }}
      >
        {timedOut
          ? <AlertCircle size={36} className="text-[#64748B]" />
          : <Loader2 size={36} className="text-[#1D9E75] animate-spin" />
        }
      </div>
      <div className="text-center">
        {timedOut ? (
          <>
            <h2 className="text-[1.375rem] font-bold text-[#0F172A] mb-2">
              La verificación está tomando más tiempo de lo esperado
            </h2>
            <p className="text-[0.875rem] text-[#64748B] leading-relaxed">
              Te notificaremos por email cuando esté lista. Puedes cerrar esta pantalla con seguridad.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-[1.375rem] font-bold text-[#0F172A] mb-2">Verificando tu identidad…</h2>
            <p className="text-[0.875rem] text-[#64748B] leading-relaxed">
              Estamos revisando tu documentación. Esto puede tomar unos minutos.
            </p>
            <p className="text-[0.875rem] text-[#64748B] mt-2">
              Te notificaremos por email cuando esté lista tu verificación.
            </p>
          </>
        )}
      </div>
      <div className="w-full flex flex-col gap-3">
        <button
          onClick={onManualCheck}
          className="w-full py-3.5 rounded-2xl font-semibold text-[0.875rem] transition-colors"
          style={{ background: '#1D9E75', color: 'white', boxShadow: '0 4px 20px rgba(29,158,117,0.25)' }}
        >
          ¿Ya completaste la verificación? Verificar estado
        </button>
        <button
          onClick={onDashboard}
          className="w-full py-3.5 rounded-2xl font-semibold text-[0.9375rem] text-[#0F172A] transition-colors"
          style={{ background: 'white', border: '1px solid #E2E8F0' }}
        >
          Ir al dashboard
        </button>
      </div>
    </div>
  )
}

// ── Estado: Aprobado ──────────────────────────────────────────────────────────

function ApprovedState({ onSend }) {
  return (
    <div className="flex flex-col items-center py-10 gap-6">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{
          background: 'radial-gradient(circle, #1D9E751A 0%, #1D9E7506 100%)',
          border:     '2px solid #1D9E7533',
          boxShadow:  '0 0 40px rgba(29,158,117,0.15)',
        }}
      >
        <ShieldCheck size={36} className="text-[#1D9E75]" />
      </div>
      <div className="text-center">
        <h2 className="text-[1.5rem] font-bold text-[#0F172A] mb-2">¡Identidad verificada!</h2>
        <p className="text-[0.875rem] text-[#64748B]">
          Ya puedes enviar dinero con Alyto.
        </p>
      </div>
      <button
        onClick={onSend}
        className="w-full py-4 rounded-2xl font-bold text-[0.9375rem] text-white"
        style={{
          background: '#1D9E75',
          boxShadow:  '0 4px 20px rgba(29,158,117,0.3)',
        }}
      >
        Empezar a enviar
      </button>
    </div>
  )
}

// ── Estado: Rechazado ─────────────────────────────────────────────────────────

function RejectedState({ onRetry }) {
  return (
    <div className="flex flex-col items-center py-8 gap-5">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center"
        style={{ background: '#EF44441A', border: '2px solid #EF444433' }}
      >
        <XCircle size={36} className="text-[#EF4444]" />
      </div>
      <div className="text-center">
        <h2 className="text-[1.375rem] font-bold text-[#0F172A] mb-3">No pudimos verificar tu identidad</h2>
        <p className="text-[0.875rem] text-[#64748B] mb-3">Esto puede ocurrir por:</p>
        <ul className="text-[0.875rem] text-[#64748B] space-y-1 text-left">
          {[
            'Documento borroso o con reflejos',
            'Documento vencido',
            'Iluminación insuficiente',
          ].map(item => (
            <li key={item} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#CBD5E1] flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="w-full flex flex-col gap-3">
        <button
          onClick={onRetry}
          className="w-full py-4 rounded-2xl font-bold text-[0.9375rem] text-white"
          style={{ background: '#1D9E75', boxShadow: '0 4px 20px rgba(29,158,117,0.3)' }}
        >
          Intentar de nuevo
        </button>
        <a
          href={WHATSAPP_SUPPORT}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-4 rounded-2xl font-semibold text-[0.9375rem] text-[#0F172A] flex items-center justify-center gap-2 transition-colors"
          style={{ background: 'white', border: '1px solid #E2E8F0' }}
        >
          <MessageCircle size={18} />
          Contactar soporte
        </a>
      </div>
    </div>
  )
}

// ── KycPage principal ─────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 3000
const POLL_MAX_ATTEMPTS = 100  // 100 × 3s = 5 minutos

/** Detecta dispositivos móviles para usar redirect en vez del modal de Stripe */
const isMobileDevice = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

export default function KycPage() {
  const navigate             = useNavigate()
  const location             = useLocation()
  const { user, updateUser } = useAuth()

  const entity   = user?.legalEntity ?? 'LLC'
  const entName  = ENTITY_NAMES?.[entity]   ?? 'AV Finance LLC'
  const entJuris = ENTITY_JURISDICTIONS?.[entity] ?? 'Delaware, EE.UU.'
  const terms    = LEGAL_TERMS?.[entity]    ?? ''

  // kycStatus local (puede diferir del user.kycStatus si fue actualizado por webhook)
  const [kycStatus,        setKycStatus]        = useState(user?.kycStatus ?? 'pending')
  const [tosAccepted,      setTosAccepted]      = useState(false)
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState('')
  const [pollTimedOut,     setPollTimedOut]      = useState(false)
  const pollAttemptRef                          = useRef(0)

  // Bloquear scroll del body mientras el modal de Stripe está abierto
  // para evitar que el overlay fixed se desplace en iOS Safari
  useEffect(() => {
    if (loading) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [loading])

  // Banner de bienvenida si viene desde /register
  const welcomeMsg = location.state?.message ?? null

  // ── Polling de estado KYC ─────────────────────────────────────────────────
  const pollRef = useRef(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    stopPolling()
    pollAttemptRef.current = 0
    setPollTimedOut(false)

    pollRef.current = setInterval(async () => {
      pollAttemptRef.current += 1
      const attempt = pollAttemptRef.current

      if (attempt > POLL_MAX_ATTEMPTS) {
        stopPolling()
        setPollTimedOut(true)
        console.warn('[KYC Polling] Timeout alcanzado sin cambio de estado.')
        return
      }

      try {
        const data = await getKycStatus()
        console.log(`[KYC Polling] intento ${attempt} — kycStatus: ${data.kycStatus}`)

        if (data.kycStatus === 'approved' || data.kycStatus === 'rejected') {
          setKycStatus(data.kycStatus)
          updateUser({ kycStatus: data.kycStatus })
          stopPolling()
        }
        // 'pending' o 'in_review' → seguir esperando (webhook puede tardar ~30s)
      } catch {
        // Ignorar errores de red — seguir intentando
      }
    }, POLL_INTERVAL_MS)
  }, [stopPolling, updateUser])

  /** Fuerza un chequeo inmediato de estado sin esperar el intervalo */
  async function handleManualCheck() {
    try {
      const data = await getKycStatus()
      console.log('[KYC Manual Check] kycStatus:', data.kycStatus)
      if (data.kycStatus === 'approved' || data.kycStatus === 'rejected') {
        setKycStatus(data.kycStatus)
        updateUser({ kycStatus: data.kycStatus })
        stopPolling()
      }
    } catch {
      // silencioso
    }
  }

  // Iniciar polling si el status ya es in_review al montar
  useEffect(() => {
    if (user?.kycStatus === 'in_review') {
      startPolling()
    }
    return stopPolling
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Iniciar verificación con Stripe Identity ──────────────────────────────
  async function handleStart() {
    if (!tosAccepted || loading) return
    setError('')
    setLoading(true)

    try {
      const { clientSecret, url } = await createKycSession()

      // En dispositivos móviles, Stripe Identity requiere redirect completo
      // (el modal nativo no funciona bien en mobile browsers — el botón de
      // cámara queda oculto). El return_url en /kyc/return retoma el flujo.
      if (isMobileDevice()) {
        if (!url) throw new Error('No se recibió URL de verificación del servidor.')
        // La redirección desmonta el componente — no hace falta setLoading(false)
        window.location.href = url
        return
      }

      // Desktop: usar el modal SDK nativo de Stripe
      const stripe = await stripePromise
      if (!stripe) throw new Error('No se pudo cargar el módulo de verificación.')

      const { error: stripeError } = await stripe.verifyIdentity(clientSecret)

      if (stripeError) {
        setError(
          stripeError.code === 'session_cancelled'
            ? 'Verificación cancelada. Puedes intentarlo nuevamente cuando quieras.'
            : (stripeError.message ?? 'Error en la verificación. Intenta nuevamente.')
        )
        return
      }

      // Modal completado → in_review + polling
      setKycStatus('in_review')
      updateUser({ kycStatus: 'in_review' })
      startPolling()

    } catch (err) {
      setError(err.message || 'Error al iniciar la verificación. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  // ── Reintentar (estado rejected) ──────────────────────────────────────────
  function handleRetry() {
    setKycStatus('pending')
    updateUser({ kycStatus: 'pending' })
    setError('')
    setTosAccepted(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-dvh bg-[#F8FAFC] font-sans flex flex-col max-w-[430px] mx-auto">

      {/* Header */}
      <header className="flex items-center gap-3 px-5 pt-8 pb-2">
        <button
          onClick={() => navigate('/dashboard')}
          className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center flex-shrink-0"
        >
          <ArrowLeft size={18} className="text-[#64748B]" />
        </button>
        <div className="flex-1">
          <p className="text-[0.75rem] text-[#64748B]">Onboarding</p>
          <h1 className="text-[1.0625rem] font-bold text-[#0F172A] leading-tight">Activar cuenta</h1>
        </div>
      </header>

      {/* Banner de bienvenida (viene desde /register) */}
      {welcomeMsg && (
        <div className="mx-5 mt-4 flex items-start gap-3 p-4 rounded-2xl bg-[#1D9E7508] border border-[#1D9E7533]">
          <CheckCircle2 size={16} className="text-[#1D9E75] flex-shrink-0 mt-0.5" />
          <p className="text-[0.8125rem] text-[#1D9E75]">{welcomeMsg}</p>
        </div>
      )}

      {/* KYC banner si vino de una ruta protegida */}
      {location.state?.kycBanner && kycStatus !== 'approved' && (
        <div className="mx-5 mt-4 flex items-start gap-3 p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
          <AlertCircle size={16} className="text-[#64748B] flex-shrink-0 mt-0.5" />
          <p className="text-[0.8125rem] text-[#64748B]">{location.state.kycBanner}</p>
        </div>
      )}

      {/* Contenido según estado */}
      <div className="flex-1 overflow-y-auto px-5 pb-10">
        {(kycStatus === 'pending' || !kycStatus) && (
          <IntroState
            entName={entName} entJuris={entJuris} entity={entity} terms={terms}
            onStart={handleStart} loading={loading} error={error}
            tosAccepted={tosAccepted} setTosAccepted={setTosAccepted}
          />
        )}
        {kycStatus === 'in_review' && (
          <PendingState
            onDashboard={() => navigate('/dashboard')}
            timedOut={pollTimedOut}
            onManualCheck={handleManualCheck}
          />
        )}
        {kycStatus === 'approved' && (
          <ApprovedState onSend={() => navigate('/send')} />
        )}
        {kycStatus === 'rejected' && (
          <RejectedState onRetry={handleRetry} />
        )}
      </div>
    </div>
  )
}
