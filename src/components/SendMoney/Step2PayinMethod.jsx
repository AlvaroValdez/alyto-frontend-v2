/**
 * Step2PayinMethod.jsx — "¿Cómo pagas?"
 *
 * Para V2.0 inicial: solo Fintoc activo para CL.
 * Otros países/métodos muestran badge "Próximamente".
 */

import { useState } from 'react'
import { Check, Zap, Clock } from 'lucide-react'

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
  BO: [
    {
      id: 'qr',
      name: 'Pago con QR',
      description: 'Escanea el QR desde tu app bancaria',
      badge: 'Fácil',
      badgeType: 'instant',
      available: true,
      logo: '📱',
    },
    {
      id: 'manual',
      name: 'Transferencia bancaria',
      description: 'Transfiere al número de cuenta AV Finance SRL',
      badge: 'Manual',
      badgeType: 'slow',
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
          ? 'bg-white border-[#1A2340] opacity-50 cursor-not-allowed'
          : selected
            ? 'bg-[#1D9E751A] border-[#1D9E75] shadow-[0_0_0_1px_#1D9E7533]'
            : 'bg-white border-[#E2E8F0] hover:border-[#1D9E7533] hover:bg-[#F0F2F7] cursor-pointer'
      }`}
    >
      {/* Logo */}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
        selected ? 'bg-[#1D9E7520]' : 'bg-[#E2E8F0]'
      }`}>
        {method.logo}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[0.9375rem] font-semibold ${isDisabled ? 'text-[#94A3B8]' : 'text-[#0D1F3C]'}`}>
            {method.name}
          </span>
          <span className={`inline-flex items-center gap-1 text-[0.625rem] font-semibold px-2 py-0.5 rounded-full ${
            method.badgeType === 'instant'
              ? 'bg-[#22C55E1A] text-[#22C55E]'
              : method.badgeType === 'soon'
                ? 'bg-[#1D9E751A] text-[#4A5568]'
                : 'bg-[#1D9E751A] text-[#1D9E75]'
          }`}>
            <BadgeIcon type={method.badgeType} />
            {method.badge}
          </span>
        </div>
        <p className="text-[0.75rem] text-[#4A5568] truncate">
          {method.description}
        </p>
      </div>

      {/* Check circle */}
      <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
        selected
          ? 'bg-[#1D9E75] border-[#1D9E75]'
          : 'border-[#E2E8F0] bg-transparent'
      }`}>
        {selected && <Check size={12} className="text-[#0F1628]" strokeWidth={3} />}
      </div>
    </button>
  )
}

// BO usa anchor manual para ambos métodos (qr y manual).
// La diferencia es solo visual en Step5PaymentWidget.
const BO_MANUAL_IDS = new Set(['qr', 'manual'])

const COUNTRY_LABELS = {
  CL: 'Chile',
  BO: 'Bolivia',
}

export default function Step2PayinMethod({ onNext, originCountry = 'CL' }) {
  const [selected, setSelected] = useState(null)

  const methods = PAYIN_METHODS[originCountry] || []

  function handleNext() {
    if (!selected) return
    // Ambos métodos BO mapean a payinMethod: 'manual' en el backend
    const payinMethod = originCountry === 'BO' && BO_MANUAL_IDS.has(selected.id)
      ? 'manual'
      : selected.id
    onNext({ payinMethod, payinVariant: selected.id })
  }

  const countryLabel = COUNTRY_LABELS[originCountry] ?? originCountry

  return (
    <div className="flex flex-col gap-5 px-4 pb-4">

      {/* ── Título ── */}
      <div>
        <h2 className="text-[1.125rem] font-bold text-[#0D1F3C]">¿Cómo pagas?</h2>
        <p className="text-[0.8125rem] text-[#4A5568] mt-0.5">
          Selecciona el método de pago en {countryLabel}
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
      <div className="bg-white rounded-xl px-4 py-3">
        <p className="text-[0.75rem] text-[#4A5568] leading-relaxed">
          {originCountry === 'BO'
            ? 'Tu pago será procesado manualmente por AV Finance SRL. Recibirás una confirmación una vez verificado el depósito.'
            : 'El débito se realizará desde tu cuenta bancaria chilena en tiempo real. El monto será reservado durante el proceso del pago.'
          }
        </p>
      </div>

      {/* ── Botón continuar ── */}
      <button
        onClick={handleNext}
        disabled={!selected}
        className={`w-full py-4 rounded-2xl text-[0.9375rem] font-bold transition-all duration-150 ${
          selected
            ? 'bg-[#1D9E75] text-[#0F1628] shadow-[0_4px_20px_rgba(29,158,117,0.25)] active:scale-[0.98]'
            : 'bg-[#1D9E7540] text-[#94A3B8] cursor-not-allowed'
        }`}
      >
        Continuar
      </button>
    </div>
  )
}
