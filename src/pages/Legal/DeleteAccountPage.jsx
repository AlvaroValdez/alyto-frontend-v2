/**
 * DeleteAccountPage.jsx — Página pública de eliminación de cuenta.
 *
 * Requisito de Google Play: las apps con creación de cuenta deben ofrecer un
 * mecanismo de borrado dentro de la app Y una URL web pública que explique el
 * proceso y qué datos se eliminan vs. se retienen. Esta página cubre la URL web.
 *
 * Borrado in-app: Perfil → Eliminar cuenta → DELETE /api/v1/auth/account.
 * Ruta: /eliminar-cuenta (y alias /delete-account).
 */

import { Link } from 'react-router-dom'
import { Trash2, Mail, ShieldCheck } from 'lucide-react'

const SUPPORT_EMAIL = 'soporte@alyto.app'
const SUPPORT_WHATSAPP = import.meta.env.VITE_SUPPORT_WHATSAPP ?? ''

export default function DeleteAccountPage() {
  const mailto =
    `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Solicitud de eliminación de cuenta')}` +
    `&body=${encodeURIComponent(
      'Solicito la eliminación de mi cuenta Alyto.\n\nEmail registrado: \nNombre: \n',
    )}`

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="px-6 pt-8 pb-5" style={{ background: '#233E58' }}>
        <div className="max-w-[760px] mx-auto flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              <Trash2 size={18} className="text-white" />
            </div>
            <div>
              <p className="text-[0.6875rem] font-bold text-[#FCD34D] tracking-[0.12em] uppercase leading-none">
                Alyto
              </p>
              <h1 className="text-[1.125rem] font-bold text-white mt-1 leading-tight">
                Eliminar tu cuenta
              </h1>
            </div>
          </div>
          <Link
            to="/login"
            className="px-4 py-2 rounded-xl text-[0.8125rem] font-bold text-[#233E58] bg-white hover:bg-white/90 transition-colors flex-shrink-0"
          >
            Volver
          </Link>
        </div>
      </header>

      <main className="max-w-[760px] mx-auto px-6 py-8 flex flex-col gap-6 text-[#334155]">
        <p className="text-[0.9375rem] leading-[1.7]">
          Puedes solicitar la eliminación de tu cuenta Alyto y de tus datos
          personales en cualquier momento. Hay dos formas de hacerlo:
        </p>

        {/* Método 1: in-app */}
        <section className="rounded-2xl bg-white p-5 shadow-sm flex flex-col gap-2">
          <h2 className="text-[1rem] font-bold text-[#0F172A]">Desde la app (recomendado)</h2>
          <ol className="list-decimal list-inside text-[0.9375rem] leading-[1.8]">
            <li>Abre Alyto e inicia sesión.</li>
            <li>Ve a <span className="font-semibold">Perfil</span>.</li>
            <li>Toca <span className="font-semibold">Eliminar cuenta</span> y confirma con tu contraseña.</li>
          </ol>
          <p className="text-[0.8125rem] text-[#64748B] leading-[1.6]">
            Antes de eliminar, retira cualquier saldo de tu wallet y espera a que
            finalicen tus operaciones en curso.
          </p>
        </section>

        {/* Método 2: solicitud por email */}
        <section className="rounded-2xl bg-white p-5 shadow-sm flex flex-col gap-3">
          <h2 className="text-[1rem] font-bold text-[#0F172A]">Por solicitud</h2>
          <p className="text-[0.9375rem] leading-[1.7]">
            Si no puedes acceder a la app, escríbenos desde el correo asociado a tu cuenta:
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={mailto}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.875rem] font-bold text-white"
              style={{ background: '#233E58' }}
            >
              <Mail size={16} /> {SUPPORT_EMAIL}
            </a>
            {SUPPORT_WHATSAPP && (
              <a
                href={`https://wa.me/${SUPPORT_WHATSAPP.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.875rem] font-bold text-[#233E58] border"
                style={{ borderColor: '#CBD5E1' }}
              >
                WhatsApp
              </a>
            )}
          </div>
        </section>

        {/* Qué se elimina vs se retiene */}
        <section className="rounded-2xl bg-white p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#233E58]" />
            <h2 className="text-[1rem] font-bold text-[#0F172A]">Qué pasa con tus datos</h2>
          </div>
          <div>
            <p className="text-[0.875rem] font-semibold text-[#0F172A] mb-1">Se eliminan / anonimizan:</p>
            <ul className="list-disc list-inside text-[0.9375rem] leading-[1.8]">
              <li>Acceso a la cuenta (queda desactivada y se cierran tus sesiones).</li>
              <li>Datos de contacto no esenciales (teléfono, foto de perfil, alias).</li>
              <li>Notificaciones y dispositivos vinculados.</li>
            </ul>
          </div>
          <div>
            <p className="text-[0.875rem] font-semibold text-[#0F172A] mb-1">Se conservan por obligación legal:</p>
            <p className="text-[0.9375rem] leading-[1.7]">
              Como entidad financiera regulada, AV Finance debe conservar durante el
              plazo que exige la normativa de prevención de lavado de activos
              (ASFI/UIF y equivalentes) ciertos registros de identidad (KYC) y de
              tus transacciones. Estos datos se mantienen protegidos y no se usan
              con fines comerciales; se eliminan de forma definitiva al cumplirse el
              plazo de retención legal.
            </p>
          </div>
        </section>

        <nav className="flex gap-4 text-[0.8125rem] font-semibold text-[#233E58]">
          <Link to="/terms" className="hover:underline">Términos</Link>
          <Link to="/privacy" className="hover:underline">Privacidad</Link>
        </nav>
      </main>
    </div>
  )
}
