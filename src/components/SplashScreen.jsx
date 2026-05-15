/**
 * SplashScreen.jsx — Pantalla de carga animada con logo Alyto.
 *
 * Se muestra mientras AuthContext verifica la sesión guardada.
 * Dura al menos MIN_DURATION ms para suavizar la transición.
 *
 * Animación:
 *   1. Logo aparece con fade + scale-in (0.4s)
 *   2. Anillo teal giratorio bajo el logo
 *   3. Fade-out completo al terminar la carga
 */

import { useState, useEffect } from 'react'

const MIN_DURATION = 1200  // ms mínimos de splash (evita parpadeo en sesión cacheada)

export default function SplashScreen({ isLoading }) {
  const [visible, setVisible]   = useState(true)
  const [fadeOut, setFadeOut]   = useState(false)

  useEffect(() => {
    if (isLoading) return  // aún cargando — mantener pantalla

    // Auth resuelto: esperar el mínimo y luego fade-out
    const timer = setTimeout(() => {
      setFadeOut(true)
      // Dejar que el fade-out CSS termine antes de desmontar
      setTimeout(() => setVisible(false), 400)
    }, MIN_DURATION)

    return () => clearTimeout(timer)
  }, [isLoading])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{
        background:  '#FFFFFF',
        transition:  'opacity 0.4s ease',
        opacity:     fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? 'none' : 'auto',
      }}
    >
      {/* ── Logo + versión ── */}
      <div
        style={{
          animation: 'splashLogoIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        }}
      >
        <img
          src="/assets/LogoAlyto.png"
          alt="Alyto Wallet 2.0"
          style={{ height: 48, width: 'auto', objectFit: 'contain' }}
        />
        <span
          style={{
            fontSize:      '0.6875rem',
            fontWeight:    700,
            color:         '#1D3461',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            opacity:       0.55,
          }}
        >
          Wallet 2.0
        </span>
      </div>

      {/* ── Anillo teal animado ── */}
      <div
        className="mt-10 relative"
        style={{ width: 40, height: 40 }}
      >
        {/* Pista (track) */}
        <div
          style={{
            position:     'absolute',
            inset:        0,
            borderRadius: '50%',
            border:       '3px solid #E2E8F0',
          }}
        />
        {/* Arco giratorio */}
        <div
          style={{
            position:     'absolute',
            inset:        0,
            borderRadius: '50%',
            border:       '3px solid transparent',
            borderTopColor:  '#233E58',
            borderRightColor: '#233E5866',
            animation:    'splashSpin 0.9s linear infinite',
          }}
        />
      </div>

      {/* ── Tagline ── */}
      <p
        style={{
          marginTop:   20,
          fontSize:    '0.75rem',
          fontWeight:  500,
          color:       '#94A3B8',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          animation:   'splashFadeIn 0.6s ease 0.3s both',
          fontFamily:  'Manrope, Inter, sans-serif',
        }}
      >
        Plataforma Financiera Multi-Entidad
      </p>

      <style>{`
        @keyframes splashLogoIn {
          from { opacity: 0; transform: scale(0.82) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes splashSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes splashFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  )
}
