/**
 * KybStatusPage.jsx — Confirmación post-envío de solicitud KYB en Alyto V2.0
 *
 * El usuario llega aquí tras enviar el formulario KYB.
 * Muestra confirmación de recepción y referencia de la solicitud.
 */

import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Clock, CheckCircle2, Home, BarChart2, FileText, User } from 'lucide-react'
import { getKybStatus } from '../../services/kybService'

export default function KybStatusPage() {
  const navigate              = useNavigate()
  const [kybData, setKybData] = useState(null)

  useEffect(() => {
    getKybStatus()
      .then(setKybData)
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-[#0F1628] font-sans flex flex-col max-w-[430px] mx-auto relative">

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-24 flex flex-col items-center justify-center px-5">

        {/* ── Confirmation card ── */}
        <div
          className="w-full rounded-2xl p-7 flex flex-col items-center text-center"
          style={{ background: '#1A2340', border: '1px solid #263050' }}
        >
          {/* Icon */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
            style={{ background: '#22C55E1A', border: '1px solid #22C55E33' }}
          >
            <CheckCircle2 size={30} className="text-[#22C55E]" />
          </div>

          {/* Title */}
          <h1 className="text-[1.125rem] font-bold text-white mb-2">
            Solicitud recibida
          </h1>
          <p className="text-[0.875rem] text-[#8A96B8] leading-relaxed mb-6">
            Hemos recibido tu documentación correctamente.
            Revisaremos tu solicitud en{' '}
            <span className="text-white font-semibold">24–72 horas hábiles</span>{' '}
            y te notificaremos por email.
          </p>

          {/* Reference ID */}
          {kybData?.businessId && (
            <div
              className="w-full rounded-xl px-4 py-3 mb-6 text-left"
              style={{ background: '#0F1628', border: '1px dashed #263050' }}
            >
              <p className="text-[0.625rem] font-bold text-[#4E5A7A] uppercase tracking-wider mb-1">
                ID de solicitud
              </p>
              <p className="text-[0.8125rem] font-mono text-[#C4CBD8] break-all">
                {kybData.businessId}
              </p>
            </div>
          )}

          {/* Timeline */}
          <div className="w-full space-y-3 mb-7">
            {[
              { icon: CheckCircle2, color: '#22C55E', label: 'Documentación recibida', done: true  },
              { icon: Clock,        color: '#C4CBD8',  label: 'Revisión interna (24–72 h)', done: false },
              { icon: Clock,        color: '#4E5A7A',  label: 'Notificación por email', done: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-left">
                <item.icon size={16} style={{ color: item.color, flexShrink: 0 }} />
                <span
                  className="text-[0.8125rem]"
                  style={{ color: item.done ? '#FFFFFF' : '#8A96B8' }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <button
            onClick={() => navigate('/kyb')}
            className="w-full py-3.5 rounded-xl text-[0.9375rem] font-bold text-[#0F1628] mb-3"
            style={{ background: '#C4CBD8', boxShadow: '0 4px 20px rgba(196,203,216,0.3)' }}
          >
            Ver estado de mi solicitud
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3.5 rounded-xl text-[0.875rem] font-semibold text-[#8A96B8] transition-colors hover:text-white"
            style={{ background: 'transparent', border: '1px solid #263050' }}
          >
            Ir al inicio
          </button>
        </div>

      </div>

      {/* ── Bottom nav ── */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#0F1628] border-t border-[#1A2340] flex justify-around px-2 pt-2.5 pb-6 z-40">
        {[
          { icon: Home,      label: 'Inicio',        to: '/dashboard'    },
          { icon: BarChart2, label: 'Activos',        to: '/assets'       },
          { icon: FileText,  label: 'Transferencias', to: '/transactions' },
          { icon: User,      label: 'Perfil',         to: '/profile'      },
        ].map(({ icon: Icon, label, to }) => (
          <Link key={label} to={to} className="flex flex-col items-center gap-1 min-w-[56px] no-underline">
            <Icon size={20} className="text-[#4E5A7A]" />
            <span className="text-[0.625rem] font-medium text-[#4E5A7A]">{label}</span>
          </Link>
        ))}
      </nav>

    </div>
  )
}
