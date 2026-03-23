/**
 * Step2PayinMethod.jsx — "¿Cómo pagas?"
 *
 * Para V2.0 inicial: solo Fintoc activo para CL.
 * Otros países/métodos muestran badge "Próximamente".
 */

import { useState } from 'react'
import { Check, Zap, Clock } from 'lucide-react'

// País origen hardcodeado CL en V2.0
const ORIGIN_COUNTRY = 'CL'

const PAYIN_METHODS = {
  CL: [
    {
      id: 'fintoc',
      name: 'Fintoc',
      description: 'Transferencia bancaria instantánea A2A',
      badge: 'Instantáneo',
      badgeType: 'instant',
      available: true,
      logo: '🏦',
    },
  ],
  AR: [
    { id: 'khipu',     name: 'Khipu',     description: 'Pago en línea Argentina',     badge: '1-2 hrs',   badgeType: 'slow', available: false, logo: '💳' },
    { id: 'bind',      name: 'Bind',      description: 'Transferencia bancaria AR',   badge: 'Próximamente', badgeType: 'soon', available: false, logo: '🏦' },
  ],
  CO: [
    { id: 'pse',       name: 'PSE',       description: 'Débito bancario Colombia',    badge: 'Próximamente', badgeType: 'soon', available: false, logo: '🏦' },
    { id: 'nequi',     name: 'Nequi',     description: 'Billetera digital Colombia',  badge: 'Próximamente', badgeType: 'soon', available: false, logo: '📱' },
    { id: 'daviplata', name: 'Daviplata', description: 'Billetera digital Davivienda',badge: 'Próximamente', badgeType: 'soon', available: false, logo: '💜' },
  ],
  BR: [
    { id: 'pix',   name: 'PIX QR',   description: 'Pago instantáneo Brasil',      badge: 'Próximamente', badgeType: 'soon', available: false, logo: '⚡' },
  ],
  MX: [
    { id: 'clabe', name: 'CLABE',    description: 'Transferencia bancaria México',  badge: 'Próximamente', badgeType: 'soon', available: false, logo: '🏦' },
  ],
}

function BadgeIcon({ type }) {
  if (type === 'instant') return <Zap size={11} />
  if (type === 'slow')    return <Clock size={11} />
  return null
}

function MethodCard({ method, selected, onSelect }) {
  const isDisabled = !method.available

  return (
    <button
      onClick={() => !isDisabled && onSelect(method)}
      disabled={isDisabled}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-150 text-left ${
        isDisabled
          ? 'bg-[#1A2340] border-[#1A2340] opacity-50 cursor-not-allowed'
          : selected
            ? 'bg-[#C4CBD81A] border-[#C4CBD8] shadow-[0_0_0_1px_#C4CBD833]'
            : 'bg-[#1A2340] border-[#263050] hover:border-[#C4CBD833] hover:bg-[#1F2B4D] cursor-pointer'
      }`}
    >
      {/* Logo */}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
        selected ? 'bg-[#C4CBD820]' : 'bg-[#263050]'
      }`}>
        {method.logo}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[0.9375rem] font-semibold ${isDisabled ? 'text-[#4E5A7A]' : 'text-white'}`}>
            {method.name}
          </span>
          <span className={`inline-flex items-center gap-1 text-[0.625rem] font-semibold px-2 py-0.5 rounded-full ${
            method.badgeType === 'instant'
              ? 'bg-[#22C55E1A] text-[#22C55E]'
              : method.badgeType === 'soon'
                ? 'bg-[#C4CBD81A] text-[#8A96B8]'
                : 'bg-[#C4CBD81A] text-[#C4CBD8]'
          }`}>
            <BadgeIcon type={method.badgeType} />
            {method.badge}
          </span>
        </div>
        <p className="text-[0.75rem] text-[#8A96B8] truncate">
          {method.description}
        </p>
      </div>

      {/* Check circle */}
      <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
        selected
          ? 'bg-[#C4CBD8] border-[#C4CBD8]'
          : 'border-[#263050] bg-transparent'
      }`}>
        {selected && <Check size={12} className="text-[#0F1628]" strokeWidth={3} />}
      </div>
    </button>
  )
}

export default function Step2PayinMethod({ onNext }) {
  const [selected, setSelected] = useState(null)

  const methods = PAYIN_METHODS[ORIGIN_COUNTRY] || []

  function handleNext() {
    if (!selected) return
    onNext({ payinMethod: selected.id })
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-4">

      {/* ── Título ── */}
      <div>
        <h2 className="text-[1.125rem] font-bold text-white">¿Cómo pagas?</h2>
        <p className="text-[0.8125rem] text-[#8A96B8] mt-0.5">
          Selecciona el método de pago en Chile
        </p>
      </div>

      {/* ── Métodos disponibles ── */}
      <div className="flex flex-col gap-3">
        {methods.map(method => (
          <MethodCard
            key={method.id}
            method={method}
            selected={selected?.id === method.id}
            onSelect={setSelected}
          />
        ))}
      </div>

      {/* Nota informativa */}
      <div className="bg-[#1A2340] rounded-xl px-4 py-3">
        <p className="text-[0.75rem] text-[#8A96B8] leading-relaxed">
          El débito se realizará desde tu cuenta bancaria chilena en tiempo real.
          El monto será reservado durante el proceso del pago.
        </p>
      </div>

      {/* ── Botón continuar ── */}
      <button
        onClick={handleNext}
        disabled={!selected}
        className={`w-full py-4 rounded-2xl text-[0.9375rem] font-bold transition-all duration-150 ${
          selected
            ? 'bg-[#C4CBD8] text-[#0F1628] shadow-[0_4px_20px_rgba(196,203,216,0.3)] active:scale-[0.98]'
            : 'bg-[#C4CBD840] text-[#4E5A7A] cursor-not-allowed'
        }`}
      >
        Continuar
      </button>
    </div>
  )
}
