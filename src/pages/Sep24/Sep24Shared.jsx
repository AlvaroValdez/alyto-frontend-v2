/**
 * Sep24Shared.jsx — Componentes compartidos entre Deposit y Withdraw SEP-24.
 *   - StatusPill: badge de estado SEP-24
 *   - CopyRow: fila con valor monoespaciado + botón copiar
 *   - StellarInstructions: tarjeta "enviá X USDC a esta dirección con este memo"
 */

import { useState } from 'react'
import { Copy, CheckCheck, Clock, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react'

// Mapeo de estados SEP-24 → UI
export const STATUS_UI = {
  pending_user_transfer_start: { label: 'Esperando tu transferencia', color: '#F59E0B', bg: '#F59E0B1A', icon: Clock,        spin: false },
  pending_external:            { label: 'Confirmando en la red',       color: '#F59E0B', bg: '#F59E0B1A', icon: Loader2,      spin: true  },
  pending_anchor:              { label: 'Procesando',                  color: '#0D1F3C', bg: '#0D1F3C0D', icon: Loader2,      spin: true  },
  completed:                   { label: 'Completado',                  color: '#22C55E', bg: '#22C55E1A', icon: CheckCircle2, spin: false },
  error:                       { label: 'Error',                       color: '#EF4444', bg: '#EF44441A', icon: AlertCircle,  spin: false },
  refunded:                    { label: 'Reembolsado',                 color: '#64748B', bg: '#64748B1A', icon: Info,         spin: false },
}

export function StatusPill({ status }) {
  const ui = STATUS_UI[status] ?? STATUS_UI.pending_anchor
  const Icon = ui.icon
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[0.75rem] font-semibold px-3 py-1.5 rounded-full"
      style={{ background: ui.bg, color: ui.color }}
    >
      <Icon size={13} className={ui.spin ? 'animate-spin' : ''} />
      {ui.label}
    </span>
  )
}

export function CopyRow({ label, value, mono = true }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    if (!navigator.clipboard || !value) return
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-[#E2E8F0] last:border-b-0">
      <span className="text-[0.75rem] text-[#64748B] flex-shrink-0">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-[0.8125rem] text-[#0D1F3C] truncate ${mono ? 'font-mono' : 'font-semibold'}`}>
          {value}
        </span>
        <button
          onClick={copy}
          className="flex-shrink-0 text-[#94A3B8] hover:text-[#0D1F3C] transition-colors"
          aria-label={`Copiar ${label}`}
        >
          {copied ? <CheckCheck size={15} className="text-[#22C55E]" /> : <Copy size={15} />}
        </button>
      </div>
    </div>
  )
}

/**
 * Tarjeta de instrucciones: dirección Stellar + memo (obligatorio) + monto.
 * El memo es CRÍTICO — sin él, el depósito no se acredita a la transacción correcta.
 */
export function StellarInstructions({ address, memo, amount, assetCode = 'USDC' }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
      <p className="text-[0.6875rem] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1">
        Enviá {amount ? `${amount} ` : ''}{assetCode} a esta dirección
      </p>
      <CopyRow label="Dirección Stellar" value={address} />
      {memo && <CopyRow label="Memo (obligatorio)" value={memo} />}
      {amount && <CopyRow label="Monto" value={`${amount} ${assetCode}`} mono={false} />}

      <div className="flex items-start gap-2 mt-4 bg-[#F59E0B1A] rounded-xl px-3 py-2.5">
        <Info size={15} className="text-[#F59E0B] flex-shrink-0 mt-0.5" />
        <p className="text-[0.75rem] text-[#92610A] leading-snug">
          {memo ? (
            <>Incluí el <strong>memo</strong> exactamente como aparece. Sin el memo no podemos
            asociar tu transferencia y los fondos podrían demorarse.</>
          ) : (
            <>Enviá únicamente <strong>{assetCode}</strong> (red Stellar) a esta dirección.
            Es tu dirección exclusiva — <strong>no necesitás memo</strong>.</>
          )}
        </p>
      </div>
    </div>
  )
}
