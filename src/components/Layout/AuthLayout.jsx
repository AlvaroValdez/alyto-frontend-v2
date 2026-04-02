/**
 * AuthLayout.jsx — Layout para páginas públicas de autenticación
 *
 * Tema: Alyto Arctic Light
 * Usado en: /login, /register, /forgot-password, /reset-password
 */

import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10 font-sans"
      style={{ background: 'linear-gradient(160deg, #F8FAFC 0%, #EEF2F7 100%)' }}
    >
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <img
          src="/assets/LogoAlyto.png"
          alt="Alyto"
          className="h-10 w-auto object-contain"
          style={{ filter: 'drop-shadow(0 2px 8px rgba(35,62,88,0.08))' }}
        />
        <p className="text-[0.75rem] font-medium text-[#94A3B8] tracking-widest uppercase">
          Plataforma Financiera
        </p>
      </div>

      {/* Contenido de la ruta (LoginPage, RegisterPage, etc.) */}
      <Outlet />

      {/* Footer legal */}
      <p className="mt-6 text-center text-[0.6875rem] text-[#94A3B8] max-w-[320px] leading-relaxed">
        Al acceder aceptas los Términos de Servicio de AV Finance LLC, SpA y SRL
        según la jurisdicción correspondiente a tu cuenta.
      </p>
    </div>
  )
}
