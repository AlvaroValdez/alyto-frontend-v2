/**
 * AuthLayout.jsx — Layout para páginas públicas de autenticación
 *
 * Centra el contenido verticalmente con el logo de Alyto arriba.
 * Usado en: /login, /register, /forgot-password, /reset-password
 */

import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-[#0F1628] flex flex-col items-center justify-center px-5 py-10 font-sans">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <img
          src="/assets/logo-alyto.png"
          alt="Alyto"
          className="h-9 w-auto object-contain"
        />
        <p className="text-[0.8125rem] text-[#8A96B8] tracking-wide">
          Plataforma Financiera Multi-Entidad
        </p>
      </div>

      {/* Contenido de la ruta (LoginPage, RegisterPage, etc.) */}
      <Outlet />

      {/* Footer legal */}
      <p className="mt-6 text-center text-[0.6875rem] text-[#4E5A7A] max-w-[320px] leading-relaxed">
        Al acceder aceptas los Términos de Servicio de AV Finance LLC, SpA y SRL
        según la jurisdicción correspondiente a tu cuenta.
      </p>
    </div>
  )
}
