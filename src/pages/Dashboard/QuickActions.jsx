/**
 * QuickActions.jsx — Grid 2×2 de acciones rápidas
 *
 * Acciones:
 *  💸 Enviar dinero  →  /send         (deshabilitado si kycStatus !== 'approved')
 *  📋 Historial      →  /transactions
 *  👤 Mi perfil      →  /profile
 *  ❓ Soporte        →  wa.me/{VITE_SUPPORT_WHATSAPP}
 */

import { useNavigate } from 'react-router-dom'
import { Send, List, User, MessageCircle } from 'lucide-react'

const WHATSAPP_NUMBER = import.meta.env.VITE_SUPPORT_WHATSAPP ?? ''

const ACTIONS = [
  {
    id:      'send',
    emoji:   null,
    icon:    Send,
    label:   'Enviar dinero',
    primary: true,
    requiresKyc: true,
    route:   '/send',
  },
  {
    id:      'history',
    emoji:   null,
    icon:    List,
    label:   'Historial',
    primary: false,
    requiresKyc: false,
    route:   '/transactions',
  },
  {
    id:      'profile',
    emoji:   null,
    icon:    User,
    label:   'Mi perfil',
    primary: false,
    requiresKyc: false,
    route:   '/profile',
  },
  {
    id:      'support',
    emoji:   null,
    icon:    MessageCircle,
    label:   'Soporte',
    primary: false,
    requiresKyc: false,
    route:   null, // manejo especial — abre WhatsApp
  },
]

function ActionCard({ action, kycApproved, onNavigate, onSupport }) {
  const Icon       = action.icon
  const isDisabled = action.requiresKyc && !kycApproved

  function handleClick() {
    if (isDisabled) return
    if (action.id === 'support') {
      onSupport()
    } else {
      onNavigate(action.route)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      title={isDisabled ? 'Disponible tras verificar tu identidad' : undefined}
      className={`flex flex-col items-start gap-3 p-4 rounded-2xl border transition-all text-left w-full ${
        isDisabled
          ? 'bg-white border-[#E2E8F0] opacity-40 cursor-not-allowed'
          : action.primary
            ? 'bg-[#1D9E75] border-[#1D9E75] cursor-pointer hover:bg-[#18876A]'
            : 'bg-white border-[#E2E8F0] cursor-pointer hover:bg-[#F8FAFC] hover:border-[#1D9E7533]'
      }`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
          action.primary
            ? 'bg-white/20'
            : 'bg-[#F1F5F9]'
        }`}
      >
        <Icon
          size={17}
          className={
            isDisabled
              ? 'text-[#94A3B8]'
              : action.primary
                ? 'text-white'
                : 'text-[#64748B]'
          }
        />
      </div>
      <span
        className={`text-[0.8125rem] font-semibold ${
          isDisabled
            ? 'text-[#94A3B8]'
            : action.primary
              ? 'text-white'
              : 'text-[#0F172A]'
        }`}
      >
        {action.label}
      </span>
    </button>
  )
}

export default function QuickActions({ kycStatus }) {
  const navigate    = useNavigate()
  const kycApproved = kycStatus === 'approved'

  function handleSupport() {
    if (WHATSAPP_NUMBER) {
      window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="px-4 mb-2">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-[#0F172A]">Acciones rápidas</p>
      </div>

      {/* Grid 2×2 */}
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map((action) => (
          <ActionCard
            key={action.id}
            action={action}
            kycApproved={kycApproved}
            onNavigate={navigate}
            onSupport={handleSupport}
          />
        ))}
      </div>
    </div>
  )
}
