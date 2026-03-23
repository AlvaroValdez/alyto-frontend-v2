/**
 * NotFoundPage.jsx — Página 404
 *
 * Redirige al dashboard si autenticado, a /login si no.
 */

import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function NotFoundPage() {
  const { isAuth } = useAuth()

  return (
    <div className="min-h-screen bg-[#0F1628] font-sans flex flex-col items-center justify-center px-6 text-center">

      {/* Número 404 decorativo */}
      <div className="relative mb-8">
        <p
          className="text-[8rem] font-black leading-none select-none"
          style={{
            background:           'linear-gradient(135deg, #1A2340 0%, #263050 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor:  'transparent',
            backgroundClip:       'text',
          }}
        >
          404
        </p>
        {/* Ícono superpuesto */}
        <div
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="text-[2rem] select-none">🔍</span>
        </div>
      </div>

      {/* Texto */}
      <h1 className="text-[1.5rem] font-bold text-white mb-3">Esta página no existe</h1>
      <p className="text-[0.9375rem] text-[#8A96B8] leading-relaxed max-w-[300px] mb-8">
        La página que buscas no se encontró o fue movida.
      </p>

      {/* CTA */}
      <Link
        to={isAuth ? '/dashboard' : '/login'}
        className="
          px-8 py-4 rounded-2xl text-[0.9375rem] font-bold
          text-[#0F1628] transition-colors duration-150
        "
        style={{
          background: '#C4CBD8',
          boxShadow:  '0 4px 20px rgba(196,203,216,0.25)',
        }}
      >
        {isAuth ? 'Volver al inicio' : 'Ir al login'}
      </Link>

      {/* Decoración */}
      <p className="mt-10 text-[0.75rem] text-[#4E5A7A]">
        Alyto Wallet · V2.0
      </p>
    </div>
  )
}
