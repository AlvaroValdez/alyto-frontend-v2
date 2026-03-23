/**
 * ModernKycView.jsx — Verificación de Identidad con Stripe Identity SDK
 *
 * Flujo de usuario:
 *  1. La pantalla muestra un diseño minimalista de marca con ícono de seguridad
 *  2. El usuario acepta los Términos de Servicio de su entidad legal (SpA / SRL / LLC)
 *  3. Al hacer clic en "Iniciar verificación", el frontend obtiene la client_secret del backend
 *  4. loadStripe().verifyIdentity(clientSecret) abre el modal nativo de Stripe:
 *     cámara en vivo → captura de documento → selfie biométrica
 *  5. Stripe notifica el resultado al backend vía webhook → kycStatus actualizado
 */

import { useState }        from 'react'
import { useNavigate }     from 'react-router-dom'
import { loadStripe }      from '@stripe/stripe-js'
import {
  ShieldCheck,
  ScanFace,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
  FileText,
  Clock,
} from 'lucide-react'
import { useAuth }                                     from '../context/AuthContext'
import { LEGAL_TERMS, ENTITY_NAMES, ENTITY_JURISDICTIONS } from '../utils/legalTerms'
import { createIdentitySession }                       from '../services/api'

// Inicializar Stripe una sola vez fuera del componente
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

// ── Success screen ────────────────────────────────────────────────────────────

function SuccessScreen({ entityName, onBack }) {
  return (
    <div className="min-h-screen bg-[#0F1628] font-sans flex flex-col items-center justify-center px-6 max-w-[430px] mx-auto">
      {/* Glow circle */}
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center mb-8"
        style={{
          background: 'radial-gradient(circle, #22C55E1A 0%, #22C55E06 100%)',
          border:     '2px solid #22C55E33',
          boxShadow:  '0 0 40px rgba(34,197,94,0.15)',
        }}
      >
        <ShieldCheck size={40} className="text-[#22C55E]" />
      </div>

      <h2 className="text-[1.5rem] font-bold text-white text-center mb-3">
        Verificación enviada
      </h2>
      <p className="text-[0.875rem] text-[#8A96B8] text-center leading-relaxed mb-8 px-2">
        Tu identidad está siendo procesada por{' '}
        <span className="text-[#C4CBD8] font-semibold">{entityName}</span>.
        Recibirás una confirmación cuando el proceso finalice.
      </p>

      {/* Status card */}
      <div
        className="w-full rounded-2xl p-4 mb-8 flex items-center gap-3"
        style={{ background: '#1A2340', border: '1px solid #263050' }}
      >
        <div className="w-10 h-10 rounded-xl bg-[#C4CBD81A] flex items-center justify-center flex-shrink-0">
          <Clock size={18} className="text-[#C4CBD8]" />
        </div>
        <div>
          <p className="text-[0.8125rem] font-semibold text-white">Tiempo estimado</p>
          <p className="text-[0.75rem] text-[#8A96B8]">Revisión automática en minutos</p>
        </div>
      </div>

      <button
        onClick={onBack}
        className="w-full py-4 rounded-2xl font-bold text-[0.9375rem] text-[#0F1628]"
        style={{
          background: '#C4CBD8',
          boxShadow:  '0 4px 20px rgba(196,203,216,0.3)',
        }}
      >
        Volver al inicio
      </button>
    </div>
  )
}

// ── Main View ─────────────────────────────────────────────────────────────────

export default function ModernKycView() {
  const navigate             = useNavigate()
  const { user, updateUser } = useAuth()

  const entity   = user?.legalEntity ?? 'LLC'
  const terms    = LEGAL_TERMS[entity]    ?? LEGAL_TERMS.LLC
  const entName  = ENTITY_NAMES[entity]   ?? 'AV Finance LLC'
  const entJuris = ENTITY_JURISDICTIONS[entity] ?? 'Delaware, EE.UU.'

  const [tosAccepted, setTosAccepted] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [success,     setSuccess]     = useState(false)

  if (success) {
    return <SuccessScreen entityName={entName} onBack={() => navigate('/')} />
  }

  const handleVerify = async () => {
    if (!tosAccepted || loading) return
    setError('')
    setLoading(true)

    try {
      // 1. Obtener client_secret del backend
      const { clientSecret } = await createIdentitySession()

      // 2. Cargar Stripe y abrir el modal nativo de verificación biométrica
      const stripe = await stripePromise

      if (!stripe) {
        throw new Error('No se pudo cargar el módulo de verificación.')
      }

      const { error: stripeError } = await stripe.verifyIdentity(clientSecret)

      if (stripeError) {
        // Usuario canceló el modal o hubo un error en el flujo de Stripe
        if (stripeError.code === 'session_cancelled') {
          setError('Verificación cancelada. Puedes intentarlo nuevamente cuando quieras.')
        } else {
          setError(stripeError.message ?? 'Error en la verificación. Intenta nuevamente.')
        }
        return
      }

      // 3. Modal completado exitosamente — el webhook de Stripe actualizará el estado
      // Optimistic update para UI inmediata
      updateUser({ ...user, kycStatus: 'in_review' })
      setSuccess(true)

    } catch (err) {
      setError(err.message || 'Error al iniciar la verificación. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0F1628] font-sans flex flex-col max-w-[430px] mx-auto">

      {/* ── STATUS BAR ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-1">
        <span className="text-[0.8125rem] font-semibold text-white">9:41</span>
        <div className="flex items-center gap-1.5 text-white">
          <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor" opacity="0.9">
            <rect x="0" y="3" width="3" height="9" rx="1"/>
            <rect x="4.5" y="2" width="3" height="10" rx="1"/>
            <rect x="9" y="0.5" width="3" height="11.5" rx="1"/>
            <rect x="13.5" y="0" width="3" height="12" rx="1" opacity="0.3"/>
          </svg>
          <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
            <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="currentColor" strokeOpacity="0.35"/>
            <rect x="2" y="2" width="17" height="8" rx="2" fill="currentColor"/>
            <path d="M23 4.5V7.5C23.8 7.2 24.5 6.4 24.5 6C24.5 5.6 23.8 4.8 23 4.5Z" fill="currentColor" fillOpacity="0.4"/>
          </svg>
        </div>
      </div>

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-5 pt-4 pb-2">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-xl bg-[#1A2340] border border-[#263050] flex items-center justify-center flex-shrink-0"
        >
          <ArrowLeft size={18} className="text-[#8A96B8]" />
        </button>
        <div className="flex-1">
          <p className="text-[0.75rem] text-[#8A96B8]">Onboarding</p>
          <h1 className="text-[1.0625rem] font-bold text-white leading-tight">Activar cuenta</h1>
        </div>
      </header>

      {/* ── SCROLL AREA ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-10">

        {/* ── HERO: ícono + título ──────────────────────────────────── */}
        <div className="flex flex-col items-center py-8 mb-2">
          {/* Shield glow */}
          <div
            className="w-20 h-20 rounded-[22px] flex items-center justify-center mb-5"
            style={{
              background: 'linear-gradient(135deg, #1D3461 0%, #0F1628 100%)',
              border:     '1.5px solid #C4CBD833',
              boxShadow:  '0 8px 32px rgba(196,203,216,0.12), inset 0 1px 0 rgba(196,203,216,0.1)',
            }}
          >
            <ScanFace size={36} className="text-[#C4CBD8]" />
          </div>

          <h2 className="text-[1.375rem] font-bold text-white text-center mb-2">
            Verificación de Identidad Segura
          </h2>
          <p className="text-[0.875rem] text-[#8A96B8] text-center leading-relaxed px-4">
            Proceso biométrico automático con captura en vivo.
            Toma menos de 2 minutos.
          </p>
        </div>

        {/* ── TRUST BADGES ─────────────────────────────────────────── */}
        <div className="flex gap-3 mb-6">
          {[
            { icon: Lock,       label: 'Cifrado extremo a extremo' },
            { icon: ShieldCheck, label: 'Norma ISO 27001' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex-1 flex items-center gap-2 rounded-2xl px-3 py-3"
              style={{ background: '#1A2340', border: '1px solid #263050' }}
            >
              <Icon size={14} className="text-[#C4CBD8] flex-shrink-0" />
              <p className="text-[0.6875rem] font-medium text-[#8A96B8] leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* ── PASOS del proceso ────────────────────────────────────── */}
        <div
          className="rounded-2xl p-4 mb-6"
          style={{ background: '#1A2340', border: '1px solid #263050' }}
        >
          <p className="text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-wider mb-3">
            Cómo funciona
          </p>
          {[
            { n: '1', label: 'Acepta los términos de tu entidad legal' },
            { n: '2', label: 'Fotografía tu documento de identidad en vivo' },
            { n: '3', label: 'Tómate una selfie biométrica de verificación' },
            { n: '4', label: 'Stripe verifica automáticamente en segundos' },
          ].map(({ n, label }) => (
            <div key={n} className="flex items-center gap-3 mb-2.5 last:mb-0">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-[0.6875rem] font-bold text-[#0F1628]"
                style={{ background: '#C4CBD8' }}
              >
                {n}
              </div>
              <p className="text-[0.8125rem] text-[#8A96B8]">{label}</p>
            </div>
          ))}
        </div>

        {/* ── ENTITY CARD ─────────────────────────────────────────── */}
        <div
          className="rounded-2xl px-4 py-3 mb-5 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, #1D3461 0%, #162035 100%)',
            border:     '1px solid #C4CBD820',
          }}
        >
          <div className="w-10 h-10 rounded-xl bg-[#C4CBD81A] flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={18} className="text-[#C4CBD8]" />
          </div>
          <div className="flex-1">
            <p className="text-[0.8125rem] font-bold text-white">{entName}</p>
            <p className="text-[0.6875rem] text-[#8A96B8]">
              {entity} · {entJuris}
            </p>
          </div>
          <span
            className="text-[0.625rem] font-bold px-2 py-1 rounded-lg"
            style={{ background: '#C4CBD81A', color: '#C4CBD8', border: '1px solid #C4CBD833' }}
          >
            {entity}
          </span>
        </div>

        {/* ── TÉRMINOS DE SERVICIO ─────────────────────────────────── */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-[#C4CBD81A] flex items-center justify-center">
              <FileText size={13} className="text-[#C4CBD8]" />
            </div>
            <p className="text-[0.9375rem] font-bold text-white">Términos de Servicio</p>
          </div>

          {/* Scroll box del contrato */}
          <div
            className="rounded-2xl overflow-y-auto mb-3"
            style={{
              height:     '160px',
              background: '#0A101F',
              border:     '1px solid #263050',
            }}
          >
            <pre className="p-4 text-[0.6875rem] text-[#8A96B8] leading-relaxed whitespace-pre-wrap font-sans">
              {terms}
            </pre>
          </div>

          {/* Checkbox ToS */}
          <label
            className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all duration-200
              ${tosAccepted
                ? 'border-[#22C55E33] bg-[#22C55E08]'
                : 'border-[#263050] bg-[#1A2340] hover:border-[#C4CBD833]'
              }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all duration-200
                  ${tosAccepted
                    ? 'bg-[#22C55E] border-[#22C55E]'
                    : 'bg-transparent border-[#4E5A7A]'
                  }`}
              >
                {tosAccepted && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#0F1628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-[0.8125rem] font-semibold text-white leading-snug">
                He leído y acepto los Términos de Servicio y la Política de Privacidad de{' '}
                <span className="text-[#C4CBD8]">{entName}</span>
              </p>
              <p className="text-[0.6875rem] text-[#4E5A7A] mt-1">
                Jurisdicción: {entJuris} · Versión: 19 mar 2026
              </p>
            </div>
            <input
              type="checkbox"
              className="hidden"
              checked={tosAccepted}
              onChange={(e) => setTosAccepted(e.target.checked)}
            />
          </label>
        </div>

        {/* ── ERROR BANNER ─────────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#EF44441A] border border-[#EF444433] mb-5">
            <AlertCircle size={16} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
            <p className="text-[0.8125rem] text-[#F87171]">{error}</p>
          </div>
        )}

        {/* ── CTA PRINCIPAL ────────────────────────────────────────── */}
        <button
          type="button"
          onClick={handleVerify}
          disabled={!tosAccepted || loading}
          className={`w-full py-4 rounded-2xl font-bold text-[0.9375rem] flex items-center justify-center gap-2.5 transition-all duration-200
            ${tosAccepted && !loading
              ? 'text-[#0F1628] hover:opacity-90 active:scale-[0.98]'
              : 'text-[#4E5A7A] cursor-not-allowed'
            }`}
          style={{
            background: tosAccepted && !loading ? '#C4CBD8' : '#1A2340',
            boxShadow:  tosAccepted && !loading ? '0 4px 20px rgba(196,203,216,0.3)' : 'none',
            border:     tosAccepted && !loading ? 'none' : '1px solid #263050',
          }}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Iniciando verificación…</span>
            </>
          ) : (
            <>
              <ScanFace size={18} />
              <span>
                {tosAccepted ? 'Iniciar verificación biométrica' : 'Acepta los términos para continuar'}
              </span>
            </>
          )}
        </button>

        {/* ── LEGAL FOOTER ────────────────────────────────────────── */}
        <p className="text-[0.625rem] text-[#4E5A7A] text-center mt-4 leading-relaxed px-2">
          Verificación procesada de forma segura por{' '}
          <span className="text-[#8A96B8]">Stripe Identity</span> bajo los estándares
          KYC/AML de <span className="text-[#8A96B8]">{entName}</span>.
          Tus datos biométricos no se almacenan en los servidores de Alyto.
        </p>

        {/* Indicador de sesión activa */}
        {loading && (
          <div className="flex items-center justify-center gap-2 mt-3">
            <CheckCircle2 size={13} className="text-[#22C55E]" />
            <p className="text-[0.6875rem] text-[#22C55E]">Sesión segura activa</p>
          </div>
        )}

      </div>
    </div>
  )
}
