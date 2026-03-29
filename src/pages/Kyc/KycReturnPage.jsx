/**
 * KycReturnPage.jsx — Página de retorno post-verificación móvil
 *
 * Stripe Identity en móvil usa redirect (window.location.href = session.url).
 * Cuando el usuario completa (o cancela) la verificación, Stripe redirige aquí
 * via el return_url configurado en el backend: /kyc/return
 *
 * Esta página:
 *  1. Muestra spinner "Procesando verificación…"
 *  2. Hace polling a GET /api/v1/kyc/status cada 3 segundos
 *  3. Cuando kycStatus cambia a approved/rejected → navega a /kyc
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate }  from 'react-router-dom'
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react'
import { useAuth }      from '../../context/AuthContext'
import { getKycStatus } from '../../services/api'

const POLL_INTERVAL_MS  = 3000
const POLL_MAX_ATTEMPTS = 100  // 5 minutos

export default function KycReturnPage() {
  const navigate             = useNavigate()
  const { updateUser }       = useAuth()
  const pollRef              = useRef(null)
  const attemptRef           = useRef(0)
  const [timedOut, setTimedOut] = useState(false)
  const [status,   setStatus]   = useState('checking') // 'checking' | 'approved' | 'rejected' | 'timeout'

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => {
    attemptRef.current = 0

    pollRef.current = setInterval(async () => {
      attemptRef.current += 1
      const attempt = attemptRef.current

      if (attempt > POLL_MAX_ATTEMPTS) {
        stopPolling()
        setTimedOut(true)
        setStatus('timeout')
        console.warn('[KYC Return] Timeout alcanzado sin cambio de estado.')
        return
      }

      try {
        const data = await getKycStatus()
        console.log(`[KYC Return] intento ${attempt} — kycStatus: ${data.kycStatus}`)

        if (data.kycStatus === 'approved' || data.kycStatus === 'rejected') {
          stopPolling()
          setStatus(data.kycStatus)
          updateUser({ kycStatus: data.kycStatus })

          // Breve pausa para que el usuario vea el estado antes de navegar
          setTimeout(() => navigate('/kyc', { replace: true }), 1500)
        }
      } catch (err) {
        // 401: sesión perdida (edge case post-redirect) → redirigir a login
        if (err?.status === 401) {
          stopPolling()
          console.warn('[KYC Return] Sesión no encontrada post-redirect. Redirigiendo a login.')
          navigate('/login', { replace: true, state: { message: 'Inicia sesión para completar tu verificación.' } })
          return
        }
        // Error de red transitorio — seguir intentando
      }
    }, POLL_INTERVAL_MS)

    return stopPolling
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="h-dvh flex flex-col items-center justify-center bg-[#0F1628] px-6"
      style={{ fontFamily: 'Inter, ui-sans-serif, system-ui' }}
    >
      {/* Icono de estado */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={
          status === 'approved'
            ? { background: '#22C55E1A', border: '2px solid #22C55E33' }
            : status === 'rejected'
            ? { background: '#EF44441A', border: '2px solid #EF444433' }
            : { background: '#C4CBD81A', border: '2px solid #C4CBD833' }
        }
      >
        {status === 'approved' && <ShieldCheck size={36} className="text-[#22C55E]" />}
        {status === 'rejected' && <AlertCircle size={36} className="text-[#EF4444]" />}
        {(status === 'checking' || status === 'timeout') && (
          <Loader2 size={36} className={`text-[#C4CBD8] ${status === 'checking' ? 'animate-spin' : ''}`} />
        )}
      </div>

      {/* Texto de estado */}
      <div className="text-center mb-8">
        {status === 'checking' && (
          <>
            <h1 className="text-[1.25rem] font-bold text-white mb-2">Procesando verificación…</h1>
            <p className="text-[0.875rem] text-[#8A96B8] leading-relaxed">
              Estamos confirmando tu identidad con Stripe.<br />
              Esto puede tomar hasta 30 segundos.
            </p>
          </>
        )}
        {status === 'approved' && (
          <>
            <h1 className="text-[1.25rem] font-bold text-white mb-2">¡Identidad verificada!</h1>
            <p className="text-[0.875rem] text-[#8A96B8]">Redirigiendo…</p>
          </>
        )}
        {status === 'rejected' && (
          <>
            <h1 className="text-[1.25rem] font-bold text-white mb-2">Verificación no aprobada</h1>
            <p className="text-[0.875rem] text-[#8A96B8]">Redirigiendo para ver los detalles…</p>
          </>
        )}
        {status === 'timeout' && (
          <>
            <h1 className="text-[1.25rem] font-bold text-white mb-2">Tomando más tiempo de lo esperado</h1>
            <p className="text-[0.875rem] text-[#8A96B8] leading-relaxed">
              Te notificaremos por email cuando esté lista.<br />
              Puedes volver a la app con seguridad.
            </p>
          </>
        )}
      </div>

      {/* Botón para ir manualmente si hay timeout */}
      {status === 'timeout' && (
        <button
          onClick={() => navigate('/kyc', { replace: true })}
          className="w-full max-w-[320px] py-4 rounded-2xl font-bold text-[0.9375rem] text-[#0F1628]"
          style={{ background: '#C4CBD8', boxShadow: '0 4px 20px rgba(196,203,216,0.25)' }}
        >
          Ir a mi verificación
        </button>
      )}

      {/* Dots de carga */}
      {status === 'checking' && (
        <div className="flex gap-1.5 mt-4">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#4E5A7A]"
              style={{ animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
