/**
 * Step2PayinMethod.jsx — "¿Cómo pagas?"
 *
 * Para V2.0 inicial: solo Fintoc activo para CL.
 * Otros países/métodos muestran badge "Próximamente".
 *
 * Cuando isManualCorridor === true (CL→BO manual), muestra una pantalla
 * informativa con los datos bancarios de AV Finance SpA para transferencia.
 */

import { useState } from 'react'
import { Check, Zap, Clock, Copy, CheckCheck, Building2 } from 'lucide-react'

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

// BO usa anchor manual para ambos métodos (qr y manual).
// La diferencia es solo visual en Step5PaymentWidget.
const BO_MANUAL_IDS = new Set(['qr', 'manual'])

const COUNTRY_LABELS = {
  CL: 'Chile',
  BO: 'Bolivia',
}

// ── BankInfoRow — fila copiable de datos bancarios SpA ──────────────────────

function BankInfoRow({ label, value }) {
  const [copied, setCopied] = useState(false)
  if (!value) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-[#26305050] last:border-0">
      <div className="min-w-0">
        <span className="text-[0.75rem] text-[#4E5A7A] block">{label}</span>
        <span className="text-[0.875rem] text-white font-semibold break-all">{value}</span>
      </div>
      <button
        onClick={handleCopy}
        className="ml-2 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#263050] hover:border-[#C4CBD833] transition-colors text-[0.75rem] text-[#8A96B8] hover:text-white flex-shrink-0"
      >
        {copied
          ? <><CheckCheck size={12} className="text-[#22C55E]" /> Copiado</>
          : <><Copy size={12} /> Copiar</>
        }
      </button>
    </div>
  )
}

// ── ManualCLBOScreen — pantalla informativa para CL→BO transferencia manual ──

function ManualCLBOScreen({ stepData, onNext }) {
  const quote = stepData?.quote ?? {}
  const bank  = quote.payinInstructions ?? {}
  const originAmount  = stepData?.originAmount ?? quote.originAmount ?? 0
  const originCurrency = quote.originCurrency ?? 'CLP'

  const [copiedAll, setCopiedAll] = useState(false)

  const bankFields = [
    { label: 'Banco',           value: bank.bankName },
    { label: 'Tipo de cuenta',  value: bank.accountType },
    { label: 'N° de cuenta',    value: bank.accountNumber },
    { label: 'RUT',             value: bank.rut },
    { label: 'Titular',         value: bank.accountHolder },
    { label: 'Email',           value: bank.bankEmail },
  ].filter(f => f.value)

  function handleCopyAll() {
    const text = bankFields.map(f => `${f.label}: ${f.value}`).join('\n')
    navigator.clipboard.writeText(text)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-4">

      {/* Título */}
      <div>
        <h2 className="text-[1.125rem] font-bold text-white">Transferencia bancaria</h2>
        <p className="text-[0.8125rem] text-[#8A96B8] mt-0.5">
          Pagarás mediante transferencia a la cuenta de AV Finance SpA en Chile.
        </p>
      </div>

      {/* Monto a transferir */}
      <div className="bg-[#22C55E0A] border border-[#22C55E33] rounded-2xl px-5 py-4 text-center">
        <p className="text-[0.75rem] text-[#8A96B8] mb-1">Monto a transferir</p>
        <p className="text-[1.5rem] font-bold text-[#22C55E]">
          {Number(originAmount).toLocaleString('es-CL')} {originCurrency}
        </p>
      </div>

      {/* Datos bancarios SpA */}
      <div className="bg-[#1A2340] border border-[#263050] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#263050]">
          <div className="flex items-center gap-2.5">
            <Building2 size={16} className="text-[#C4CBD8]" />
            <p className="text-[0.875rem] font-bold text-white">Datos de la cuenta</p>
          </div>
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1.5 text-[0.75rem] text-[#8A96B8] hover:text-white transition-colors"
          >
            {copiedAll
              ? <><CheckCheck size={12} className="text-[#22C55E]" /> Copiado</>
              : <><Copy size={12} /> Copiar todo</>
            }
          </button>
        </div>
        <div className="px-5 py-1">
          {bankFields.map(f => (
            <BankInfoRow key={f.label} label={f.label} value={f.value} />
          ))}
        </div>
      </div>

      {/* Nota informativa */}
      <div className="bg-[#1A2340] rounded-xl px-4 py-3">
        <p className="text-[0.75rem] text-[#8A96B8] leading-relaxed">
          Luego de confirmar el envío, recibirás un número de referencia para incluir en tu transferencia.
          Tu pago será verificado en <span className="text-white font-semibold">2–4 horas hábiles</span>.
        </p>
      </div>

      {/* Botón continuar */}
      <button
        onClick={() => onNext({ payinMethod: 'manual', payinVariant: 'manual' })}
        className="w-full py-4 rounded-2xl text-[0.9375rem] font-bold bg-[#C4CBD8] text-[#0F1628] shadow-[0_4px_20px_rgba(196,203,216,0.3)] active:scale-[0.98] transition-all duration-150"
      >
        Continuar
      </button>
    </div>
  )
}

// ── Step2PayinMethod ────────────────────────────────────────────────────────

export default function Step2PayinMethod({ onNext, originCountry = 'CL', stepData }) {
  const [selected, setSelected] = useState(null)

  // CL→BO manual corridor: show bank transfer instructions instead of method picker
  const isManualCorridor = stepData?.isManualCorridor === true
  if (isManualCorridor && originCountry === 'CL') {
    return <ManualCLBOScreen stepData={stepData} onNext={onNext} />
  }

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
        <h2 className="text-[1.125rem] font-bold text-white">¿Cómo pagas?</h2>
        <p className="text-[0.8125rem] text-[#8A96B8] mt-0.5">
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

      {/* Nota informativa — solo para CL (Fintoc) */}
      {originCountry !== 'BO' && (
        <div className="bg-[#1A2340] rounded-xl px-4 py-3">
          <p className="text-[0.75rem] text-[#8A96B8] leading-relaxed">
            El débito se realizará desde tu cuenta bancaria chilena en tiempo real. El monto será reservado durante el proceso del pago.
          </p>
        </div>
      )}

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
