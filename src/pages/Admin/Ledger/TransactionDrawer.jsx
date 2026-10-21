/**
 * TransactionDrawer.jsx — Panel lateral de detalle de transacción
 *
 * Se desliza desde la derecha. Muestra todos los datos de la transacción
 * incluyendo ipnLog completo y permite actualizar el status manualmente.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  X, Copy, CheckCheck, ChevronDown, ChevronRight,
  Clock, CheckCircle2, XCircle, AlertCircle, Loader,
  User, Banknote, List, Edit3, ArrowRight, Paperclip, ZoomIn, FileText, RotateCcw,
} from 'lucide-react'
import { getTransactionDetail, updateTransactionStatus, getTransactionComprobante, getBusinessInvoice, getComprobanteOficial, simulateBankQrPayment, registrarDevolucion } from '../../../services/adminService'

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUS_STYLES = {
  initiated:        { bg: '#1D346140', text: '#8AB4F8',  label: 'Iniciada'         },
  payin_pending:    { bg: '#C4CBD81A', text: '#C4CBD8',  label: 'Pay-in pendiente' },
  payin_confirmed:  { bg: '#22C55E1A', text: '#22C55E',  label: 'Payin confirmado' },
  payin_completed:  { bg: '#22C55E1A', text: '#22C55E',  label: 'Pay-in OK'        },
  in_transit:       { bg: '#C4CBD81A', text: '#C4CBD8',  label: 'En tránsito'      },
  payout_pending:          { bg: '#C4CBD81A', text: '#C4CBD8',  label: 'Payout pend.'     },
  payout_pending_usdc_send:{ bg: '#F59E0B1A', text: '#F59E0B',  label: 'Enviando USDC'    },
  harbor_source_received:  { bg: '#3B82F61A', text: '#3B82F6',  label: 'USDC recibido'    },
  payout_sent:             { bg: '#C4CBD81A', text: '#C4CBD8',  label: 'Enviado'           },
  completed:               { bg: '#22C55E1A', text: '#22C55E',  label: 'Completada'       },
  failed:           { bg: '#EF44441A', text: '#F87171',  label: 'Fallida'          },
  refunded:         { bg: '#EF44441A', text: '#F87171',  label: 'Reembolsada'      },
}

const VALID_STATUSES = [
  'initiated', 'pending_comprobante', 'payin_pending', 'payin_confirmed', 'payin_completed',
  'in_transit', 'payout_pending', 'completed', 'failed', 'refunded',
]

const STATUS_LABELS = {
  initiated: 'Iniciada', pending_comprobante: 'Sin comprobante', payin_pending: 'Pay-in pendiente',
  payin_confirmed: 'Payin confirmado', payin_completed: 'Pay-in completado',
  in_transit: 'En tránsito', payout_pending: 'Payout pendiente',
  payout_pending_usdc_send: 'Enviando USDC', harbor_source_received: 'USDC recibido',
  payout_sent: 'Enviado', completed: 'Completada', failed: 'Fallida', refunded: 'Reembolsada',
}

// Statuses que requieren confirmación manual (SRL Bolivia o SpA→BO manual)
const MANUAL_PAYIN_PENDING = new Set(['initiated', 'pending_comprobante', 'payin_pending'])

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status, size = 'sm' }) {
  const s = STATUS_STYLES[status] ?? { bg: '#4E5A7A1A', text: '#8A96B8', label: status }
  const cls = size === 'lg'
    ? 'text-xs font-semibold px-3 py-1 rounded-full'
    : 'text-[0.625rem] font-semibold px-2 py-0.5 rounded-full'
  return (
    <span className={cls} style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  )
}

function Field({ label, value, mono = false, dim = false }) {
  if (value == null || value === '') return null
  return (
    <div>
      <p className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className={`text-[0.875rem] break-all ${mono ? 'font-mono text-[#C4CBD8]' : dim ? 'text-[#8A96B8]' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-lg bg-[#1F2B4D] flex items-center justify-center flex-shrink-0">
        <Icon size={12} className="text-[#C4CBD8]" />
      </div>
      <h3 className="text-[0.8125rem] font-bold text-white">{children}</h3>
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-[#263050] my-5" />
}

// ── Timeline desde ipnLog ─────────────────────────────────────────────────────

function Timeline({ ipnLog = [] }) {
  if (!ipnLog.length) {
    return <p className="text-[0.8125rem] text-[#4E5A7A]">Sin eventos registrados.</p>
  }
  return (
    <div className="space-y-0">
      {ipnLog.map((entry, i) => {
        const isLast = i === ipnLog.length - 1
        const isManual = entry.eventType === 'manual_status_update'
        return (
          <div key={i} className="flex gap-3">
            {/* Línea vertical */}
            <div className="flex flex-col items-center">
              <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                isManual ? 'bg-[#C4CBD8]' :
                entry.status === 'completed' ? 'bg-[#22C55E]' :
                entry.status === 'failed'    ? 'bg-[#EF4444]' :
                'bg-[#4E5A7A]'
              }`} />
              {!isLast && <div className="w-px flex-1 bg-[#263050] my-1" />}
            </div>
            {/* Contenido */}
            <div className={`pb-4 ${isLast ? '' : ''}`}>
              <p className="text-[0.8125rem] font-semibold text-white leading-tight">
                {entry.eventType ?? '—'}
                {entry.provider && (
                  <span className="text-[#4E5A7A] font-normal ml-1">· {entry.provider}</span>
                )}
              </p>
              {entry.status && (
                <StatusBadge status={entry.status} />
              )}
              <p className="text-[0.6875rem] text-[#4E5A7A] mt-0.5">
                {entry.receivedAt
                  ? new Date(entry.receivedAt).toLocaleString('es-BO', {
                      timeZone: 'America/La_Paz',
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })
                  : '—'
                }
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── IPN Log expandible ────────────────────────────────────────────────────────

function IpnLogEntry({ entry, index }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-[#263050] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[#1F2B4D20] transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[0.625rem] font-bold text-[#4E5A7A] w-4 flex-shrink-0">#{index + 1}</span>
          <span className="text-[0.75rem] font-mono text-[#8A96B8] truncate">{entry.eventType ?? 'event'}</span>
          {entry.provider && (
            <span className="text-[0.625rem] text-[#4E5A7A] flex-shrink-0">· {entry.provider}</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[0.625rem] text-[#4E5A7A]">
            {entry.receivedAt ? new Date(entry.receivedAt).toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz', hour: '2-digit', minute: '2-digit' }) : ''}
          </span>
          {open ? <ChevronDown size={12} className="text-[#4E5A7A]" /> : <ChevronRight size={12} className="text-[#4E5A7A]" />}
        </div>
      </button>
      {open && entry.rawPayload != null && (
        <div className="px-3 pb-3 border-t border-[#26305060]">
          <pre className="text-[0.6875rem] text-[#8A96B8] font-mono mt-2 whitespace-pre-wrap break-all leading-relaxed">
            {JSON.stringify(entry.rawPayload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

// ── Banner payin manual SRL — formulario inline ───────────────────────────────

function BankQrTestBanner({ tx, onConfirmed }) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSimulate = async () => {
    if (!window.confirm('¿Simular pago bancario BEC? Esto confirma la transacción y dispara el payout.')) return
    setLoading(true)
    setError(null)
    try {
      await simulateBankQrPayment(tx.alytoTransactionId)
      setSuccess(true)
      onConfirmed()
    } catch (err) {
      setError(err.message || 'Error al simular el pago.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="mb-5 flex items-center gap-3 p-4 rounded-2xl border border-[#22C55E40] bg-[#22C55E0A]">
        <CheckCircle2 size={20} className="text-[#22C55E] flex-shrink-0" />
        <div>
          <p className="text-[0.875rem] font-bold text-[#22C55E]">✅ Pago simulado</p>
          <p className="text-[0.75rem] text-[#8A96B8] mt-0.5">Payout iniciado automáticamente.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-5 p-4 rounded-2xl border border-[#8AB4F840] bg-[#8AB4F80A] space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none">🧪</span>
        <p className="text-[0.875rem] font-bold text-[#8AB4F8]">Sandbox — QR bancario pendiente</p>
        <span className="ml-auto text-[0.625rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#8AB4F820] text-[#8AB4F8] border border-[#8AB4F840]">
          Sandbox
        </span>
      </div>
      <div className="pl-1 space-y-0.5">
        <p className="text-[0.8125rem] text-[#8A96B8]">QR generado por el banco:</p>
        <p className="text-[0.75rem] font-mono text-[#C4CBD8]">{tx.bankQr?.qrId ?? '—'}</p>
        <p className="text-[0.75rem] text-[#4E5A7A]">
          En producción el banco notificará automáticamente cuando el QR sea pagado.
          En sandbox, usa el botón para simular esa notificación.
        </p>
      </div>
      {error && (
        <p className="text-[0.8125rem] text-[#F87171]">{error}</p>
      )}
      <button
        onClick={handleSimulate}
        disabled={loading}
        className="w-full py-2.5 rounded-xl bg-[#8AB4F8] text-[#0F1628] text-[0.875rem] font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:opacity-90"
      >
        {loading
          ? <><span className="animate-spin">⟳</span> Simulando...</>
          : '⚡ Simular pago bancario (sandbox)'}
      </button>
    </div>
  )
}

function PayinManualBanner({ tx, onConfirmed }) {
  const [bankRef, setBankRef] = useState('')
  const [note,    setNote]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)
  const [success, setSuccess] = useState(false)

  const handleConfirm = async () => {
    if (!bankRef.trim()) { setError('La referencia bancaria es requerida.'); return }
    setSaving(true)
    setError(null)
    try {
      const auditNote = note.trim() || `Confirmado via transferencia bancaria ref. ${bankRef.trim()}`
      const idempotencyKey = crypto.randomUUID()
      await updateTransactionStatus(
        tx.alytoTransactionId,
        'payin_confirmed',
        auditNote,
        { bankReference: bankRef.trim() },
        idempotencyKey,
      )
      setSuccess(true)
      onConfirmed()
    } catch (err) {
      setError(err.message || 'Error al confirmar.')
      setSaving(false)
    }
  }

  if (success) {
    return (
      <div className="mb-5 flex items-center gap-3 p-4 rounded-2xl border border-[#22C55E40] bg-[#22C55E0A]">
        <CheckCircle2 size={20} className="text-[#22C55E] flex-shrink-0" />
        <div>
          <p className="text-[0.875rem] font-bold text-[#22C55E]">
            ✅ Pago confirmado
          </p>
          <p className="text-[0.75rem] text-[#8A96B8] mt-0.5">
            Payout iniciado automáticamente.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-5 p-4 rounded-2xl border border-[#FBBF2440] bg-[#F59E0B0A] space-y-4">

      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none">⏳</span>
        <p className="text-[0.875rem] font-bold text-[#FBBF24]">
          Payin manual pendiente — {tx.legalEntity === 'SRL' ? 'Bolivia' : `${tx.originCountry}→${tx.destinationCountry}`}
        </p>
      </div>

      {/* Resumen */}
      <div className="pl-1 space-y-0.5">
        <p className="text-[0.8125rem] text-[#8A96B8]">El usuario debe transferir:</p>
        <p className="text-[1.125rem] font-extrabold text-white tabular-nums">
          {tx.originCurrency === 'CLP' ? '$ ' :
           tx.originCurrency === 'BOB' ? 'Bs ' :
           tx.originCurrency === 'USD' ? '$ ' :
           tx.originCurrency === 'EUR' ? '€ ' : ''}{tx.originalAmount?.toLocaleString('es-CL')} {tx.originCurrency ?? 'BOB'}
        </p>
        <p className="text-[0.75rem] font-mono text-[#4E5A7A]">
          Ref: {tx.alytoTransactionId}
        </p>
      </div>

      {/* Referencia bancaria */}
      <div>
        <label className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-1.5 block">
          Referencia bancaria <span className="text-[#EF4444]">*</span>
        </label>
        <input
          type="text"
          value={bankRef}
          onChange={e => setBankRef(e.target.value)}
          placeholder="Nro. de transacción del banco"
          className="w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white border border-[#FBBF2430] bg-[#1A2340] focus:outline-none focus:border-[#FBBF24] transition-colors placeholder-[#4E5A7A]"
        />
      </div>

      {/* Nota de confirmación */}
      <div>
        <label className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-1.5 block">
          Nota de confirmación
        </label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={2}
          placeholder='Ej: "Confirmado Banco Económico — transferencia recibida"'
          className="w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white border border-[#FBBF2430] bg-[#1A2340] focus:outline-none focus:border-[#FBBF24] transition-colors resize-none placeholder-[#4E5A7A]"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
          <AlertCircle size={12} className="text-[#F87171] flex-shrink-0" />
          <p className="text-[0.75rem] text-[#F87171]">{error}</p>
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={saving || !bankRef.trim()}
        className="w-full py-2.5 rounded-xl bg-[#22C55E] text-white text-[0.875rem] font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] disabled:opacity-40 transition-all"
      >
        {saving && <Loader size={13} className="animate-spin" />}
        {saving ? 'Confirmando…' : '✅ Confirmar pago recibido'}
      </button>
    </div>
  )
}

// ── RefundBanner — registrar la devolución de una operación cobrada y fallida ─

/**
 * La devolución del dinero se hace FUERA de la app (Alvaro transfiere desde la app
 * del banco). Esto no mueve plata: registra que se movió, con su evidencia.
 *
 * Por qué importa que exista este formulario y no solo el selector de estado:
 * poner `refunded` a mano en el selector no libera la deuda. `getBOBCommitted` sigue
 * contando el monto como pasivo hasta que haya `wtxId` o `bankReference`, porque la
 * etiqueta se puede poner sin mover un centavo y en producción pasó. O sea que el
 * selector esconde la deuda y esta vía la cierra.
 */
const METODOS_DEVOLUCION = [
  { id: 'walletBOB',    label: 'A la billetera', ayuda: 'Se acredita ahora mismo en su saldo de Alyto' },
  { id: 'bankTransfer', label: 'Transferencia',  ayuda: 'Transferiste desde la app del banco' },
  { id: 'external',     label: 'Otro medio',     ayuda: 'Efectivo u otra vía, con respaldo' },
]

const MAX_PROOF_BYTES = 5 * 1024 * 1024

function RefundBanner({ tx, onRegistered }) {
  const [method,    setMethod]    = useState('walletBOB')
  const [reference, setReference] = useState('')
  const [wtxId,     setWtxId]     = useState('')
  const [amount,    setAmount]    = useState(String(tx.originalAmount ?? ''))
  const [reason,    setReason]    = useState('')
  const [proof,     setProof]     = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState(null)

  // La evidencia que cierra la deuda depende del método: en una devolución a la
  // billetera el propio movimiento (wtxId) ES la evidencia, así que ahí el archivo
  // no se exige. En las otras dos no hay rastro en nuestros sistemas, así que el
  // respaldo es lo único que queda.
  const exigeArchivo = method !== 'walletBOB'
  // En la devolución a billetera no se pide NADA: el backend acredita el saldo y
  // genera el `wtxId`, que es la evidencia. El campo queda solo para el caso en que
  // el crédito ya se hizo por otra vía y acá únicamente se asienta.
  const identificadorOk = method === 'walletBOB' ? true : reference.trim() !== ''
  const montoNum = Number(amount)
  const montoOk  = Number.isFinite(montoNum) && montoNum > 0
  const puedeEnviar = identificadorOk && montoOk && (!exigeArchivo || proof) && !saving

  const elegirArchivo = (e) => {
    const f = e.target.files?.[0] ?? null
    if (f && f.size > MAX_PROOF_BYTES) {
      setError('El respaldo supera los 5 MB.')
      setProof(null)
      return
    }
    setError(null)
    setProof(f)
  }

  const handleRegistrar = async () => {
    setSaving(true)
    setError(null)
    try {
      await registrarDevolucion(
        tx.alytoTransactionId,
        {
          method,
          ...(method === 'walletBOB' ? { wtxId: wtxId.trim() } : { bankReference: reference.trim() }),
          amount: montoNum,
          reason: reason.trim() || undefined,
        },
        proof ?? undefined,
      )
      onRegistered()
    } catch (err) {
      setError(err.message || 'No se pudo registrar la devolución.')
      setSaving(false)
    }
  }

  const metodoActivo = METODOS_DEVOLUCION.find(m => m.id === method)

  return (
    <div className="mb-5 p-4 rounded-2xl border border-[#C4CBD833] bg-[#C4CBD80A] space-y-4">

      {/* Header */}
      <div className="flex items-start gap-2">
        <RotateCcw size={18} className="text-[#C4CBD8] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[0.875rem] font-bold text-[#C4CBD8]">
            Registrar devolución
          </p>
          <p className="text-[0.75rem] text-[#8A96B8] mt-0.5">
            El cobro sigue tomado y cuenta como pasivo. Devolvé el dinero por fuera y
            registralo acá con su respaldo.
          </p>
        </div>
      </div>

      {/* Método */}
      <div>
        <label className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-1.5 block">
          Cómo se devolvió
        </label>
        <div className="grid grid-cols-3 gap-2">
          {METODOS_DEVOLUCION.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => { setMethod(m.id); setError(null) }}
              className={`min-h-[44px] px-2 py-2 rounded-xl text-[0.75rem] font-semibold border transition-colors ${
                method === m.id
                  ? 'bg-[#C4CBD81A] border-[#C4CBD8] text-[#C4CBD8]'
                  : 'bg-[#1A2340] border-[#263050] text-[#8A96B8] hover:border-[#C4CBD833]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-[0.6875rem] text-[#4E5A7A] mt-1.5">{metodoActivo?.ayuda}</p>
      </div>

      {/* Identificador — lo que hace verificable la devolución */}
      {method === 'walletBOB' ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-[#22C55E0A] border border-[#22C55E33]">
            <CheckCircle2 size={14} className="text-[#22C55E] flex-shrink-0 mt-0.5" />
            <p className="text-[0.75rem] text-[#CBD5E1]">
              Se le acreditarán{' '}
              <span className="font-bold text-white tabular-nums">
                {montoOk ? montoNum.toLocaleString('es-BO') : '—'} {tx.originCurrency ?? 'BOB'}
              </span>{' '}
              a su saldo de Alyto al confirmar. El movimiento y el cierre del pasivo
              quedan en el mismo acto, y puede retirarlo o reenviarlo desde la app.
            </p>
          </div>
          <details>
            <summary className="text-[0.6875rem] text-[#4E5A7A] cursor-pointer hover:text-[#8A96B8] transition-colors">
              Ya lo acredité por otra vía
            </summary>
            <input
              type="text"
              value={wtxId}
              onChange={e => setWtxId(e.target.value)}
              placeholder="WTX-… (solo si el crédito ya existe)"
              className="w-full mt-2 rounded-xl px-3 py-2.5 text-[0.875rem] text-white font-mono border border-[#263050] bg-[#1A2340] focus:outline-none focus:border-[#C4CBD8] transition-colors placeholder-[#4E5A7A]"
            />
          </details>
        </div>
      ) : (
        <div>
          <label className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-1.5 block">
            Referencia del banco <span className="text-[#EF4444]">*</span>
          </label>
          <input
            type="text"
            value={reference}
            onChange={e => setReference(e.target.value)}
            placeholder="Nro. de documento del débito"
            className="w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white font-mono border border-[#263050] bg-[#1A2340] focus:outline-none focus:border-[#C4CBD8] transition-colors placeholder-[#4E5A7A]"
          />
        </div>
      )}

      {/* Monto */}
      <div>
        <label className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-1.5 block">
          Monto devuelto ({tx.originCurrency ?? 'BOB'})
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white tabular-nums border border-[#263050] bg-[#1A2340] focus:outline-none focus:border-[#C4CBD8] transition-colors"
        />
        {montoOk && montoNum !== tx.originalAmount && (
          <p className="text-[0.6875rem] text-[#F59E0B] mt-1.5">
            Distinto de lo cobrado ({tx.originalAmount} {tx.originCurrency ?? 'BOB'}). La diferencia sigue contando como pasivo.
          </p>
        )}
      </div>

      {/* Respaldo */}
      <div>
        <label className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-1.5 block">
          Respaldo {exigeArchivo
            ? <span className="text-[#EF4444]">*</span>
            : <span className="text-[#4E5A7A] normal-case tracking-normal font-normal">(opcional: el wtxId ya es evidencia)</span>}
        </label>
        <label className="flex items-center gap-2 min-h-[44px] px-3 py-2.5 rounded-xl border border-dashed border-[#263050] bg-[#1A2340] cursor-pointer hover:border-[#C4CBD833] transition-colors">
          <Paperclip size={14} className="text-[#8A96B8] flex-shrink-0" />
          <span className={`text-[0.8125rem] truncate ${proof ? 'text-white' : 'text-[#4E5A7A]'}`}>
            {proof ? proof.name : 'Captura del banco o PDF, hasta 5 MB'}
          </span>
          <input type="file" accept="image/*,application/pdf" onChange={elegirArchivo} className="hidden" />
        </label>
      </div>

      {/* Motivo */}
      <div>
        <label className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-1.5 block">
          Motivo
        </label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={2}
          placeholder='Ej: "Vita revirtió el payout, devuelto por transferencia"'
          className="w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white border border-[#263050] bg-[#1A2340] focus:outline-none focus:border-[#C4CBD8] transition-colors resize-none placeholder-[#4E5A7A]"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
          <AlertCircle size={12} className="text-[#F87171] flex-shrink-0" />
          <p className="text-[0.75rem] text-[#F87171]">{error}</p>
        </div>
      )}

      <button
        onClick={handleRegistrar}
        disabled={!puedeEnviar}
        className="w-full min-h-[44px] py-2.5 rounded-xl bg-[#C4CBD8] text-[#0F1628] text-[0.875rem] font-bold flex items-center justify-center gap-2 hover:bg-[#A8B0C0] active:scale-[0.98] disabled:opacity-40 disabled:hover:bg-[#C4CBD8] transition-all"
        style={puedeEnviar ? { boxShadow: '0 4px 20px rgba(196, 203, 216, 0.3)' } : undefined}
      >
        {saving && <Loader size={13} className="animate-spin" />}
        {saving
          ? (method === 'walletBOB' && !wtxId.trim() ? 'Acreditando…' : 'Registrando…')
          : (method === 'walletBOB' && !wtxId.trim() ? 'Acreditar y registrar' : 'Registrar devolución')}
      </button>

      {exigeArchivo && !proof && (
        <p className="text-[0.6875rem] text-[#4E5A7A] text-center">
          Falta adjuntar el respaldo
        </p>
      )}
    </div>
  )
}

// ── RefundDoneCard — devolución ya registrada, con su evidencia ───────────────

function RefundDoneCard({ refund, currency }) {
  const etiqueta = METODOS_DEVOLUCION.find(m => m.id === refund.method)?.label ?? refund.method
  return (
    <div className="mb-5 p-4 rounded-2xl border border-[#22C55E40] bg-[#22C55E0A] space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle2 size={18} className="text-[#22C55E] flex-shrink-0" />
        <p className="text-[0.875rem] font-bold text-[#22C55E]">
          Devolución registrada
        </p>
      </div>
      <div className="pl-1 space-y-1.5">
        <Field label="Método"     value={etiqueta} />
        {refund.amount != null && (
          <Field label="Monto" value={`${refund.amount} ${currency ?? 'BOB'}`} />
        )}
        {refund.bankReference && <Field label="Referencia del banco" value={refund.bankReference} mono />}
        {refund.wtxId         && <Field label="Movimiento de billetera" value={refund.wtxId} mono />}
        {refund.at && (
          <Field label="Registrada" value={new Date(refund.at).toLocaleString('es-BO')} dim />
        )}
        {refund.reason && <Field label="Motivo" value={refund.reason} dim />}
        <p className="text-[0.6875rem] text-[#22C55E] pt-1">
          ✓ Con evidencia: el monto dejó de contar como pasivo
        </p>
      </div>
    </div>
  )
}

// ── PaymentProofSection — comprobante subido por el usuario ──────────────────

function PaymentProofSection({ paymentProof }) {
  const [modalOpen,  setModalOpen]  = useState(false)
  const [blobUrl,    setBlobUrl]    = useState(null)

  // paymentProof viene del detalle de transacción ya cargado.
  // El campo mimetype llega en minúsculas desde el modelo MongoDB.
  const mimeType = paymentProof?.mimeType ?? paymentProof?.mimetype ?? 'image/jpeg'

  // Convertir base64 → Blob URL para evitar el límite de ~2MB de los data URLs en <img>
  useEffect(() => {
    if (!paymentProof?.data) return
    try {
      const byteChars = atob(paymentProof.data)
      const bytes = new Uint8Array(byteChars.length)
      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i)
      const blob = new Blob([bytes], { type: mimeType })
      const url  = URL.createObjectURL(blob)
      setBlobUrl(url)
      return () => URL.revokeObjectURL(url)
    } catch {
      // Si el base64 es inválido, no hacer nada
    }
  }, [paymentProof?.data, mimeType])

  const isPdf   = mimeType === 'application/pdf'
  const isImage = !isPdf

  const uploadedLabel = paymentProof?.uploadedAt
    ? new Date(paymentProof.uploadedAt).toLocaleString('es-BO', {
        timeZone: 'America/La_Paz',
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <>
      <div className="mb-5 rounded-2xl bg-[#1A2340] border border-[#263050] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#263050]">
          <Paperclip size={13} className="text-[#C4CBD8] flex-shrink-0" />
          <p className="text-[0.8125rem] font-bold text-white">Comprobante del usuario</p>
        </div>

        <div className="px-4 py-4">
          <div className="flex flex-col gap-3">
            {/* Metadata */}
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[0.8125rem] font-semibold text-white truncate">
                  {paymentProof?.filename ?? 'comprobante'}
                </p>
                {uploadedLabel && (
                  <p className="text-[0.6875rem] text-[#4E5A7A] mt-0.5">{uploadedLabel}</p>
                )}
              </div>
            </div>

            {/* Thumbnail imagen — usa Blob URL para evitar el límite de ~2MB de data URLs */}
            {isImage && blobUrl && (
              <button
                onClick={() => setModalOpen(true)}
                className="group relative w-full rounded-xl overflow-hidden border border-[#263050] bg-[#0F1628] hover:border-[#C4CBD833] transition-colors"
                title="Ver imagen completa"
              >
                <img
                  src={blobUrl}
                  alt="Comprobante de pago"
                  className="w-full max-h-48 object-contain"
                />
                <div className="absolute inset-0 bg-[#0F162860] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ZoomIn size={22} className="text-white" />
                </div>
              </button>
            )}

            {/* Botón PDF */}
            {isPdf && blobUrl && (
              <a
                href={blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#263050] text-[0.8125rem] text-[#8A96B8] hover:text-white hover:border-[#C4CBD833] transition-colors no-underline w-fit"
              >
                <FileText size={14} className="text-[#C4CBD8]" />
                Ver PDF
              </a>
            )}

            {/* Indicador mientras se procesa el blob */}
            {!blobUrl && (
              <div className="flex items-center gap-2">
                <Loader size={13} className="animate-spin text-[#4E5A7A]" />
                <span className="text-[0.8125rem] text-[#4E5A7A]">Cargando vista previa…</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal imagen a pantalla completa */}
      {modalOpen && blobUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: '#0F162899', backdropFilter: 'blur(8px)' }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative max-w-2xl w-full rounded-2xl overflow-hidden border border-[#263050] bg-[#0F1628]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#263050]">
              <p className="text-[0.875rem] font-semibold text-white">{paymentProof?.filename ?? 'Comprobante'}</p>
              <button
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#1A2340] border border-[#263050] flex items-center justify-center hover:border-[#C4CBD833] transition-colors"
              >
                <X size={12} className="text-[#8A96B8]" />
              </button>
            </div>
            <img
              src={blobUrl}
              alt="Comprobante de pago"
              className="w-full max-h-[70vh] object-contain bg-[#0F1628] p-4"
            />
          </div>
        </div>
      )}
    </>
  )
}

// ── TransactionDrawer ─────────────────────────────────────────────────────────

/**
 * @param {{ transactionId: string|null, onClose: () => void, onStatusUpdated: () => void }} props
 */
export default function TransactionDrawer({ transactionId, onClose, onStatusUpdated }) {
  const [tx,          setTx]          = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)
  const [copied,      setCopied]      = useState(false)

  // Actualización manual de status
  const [newStatus,   setNewStatus]   = useState('')
  const [note,        setNote]        = useState('')
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState(null)
  const [saveOk,      setSaveOk]      = useState(false)
  const [downloadingB2B, setDownloadingB2B] = useState(false)
  const [downloadingComprobante, setDownloadingComprobante] = useState(false)
  const [comprobanteError, setComprobanteError] = useState(null)

  const load = useCallback(async () => {
    if (!transactionId) return
    setLoading(true)
    setError(null)
    setTx(null)
    try {
      const data = await getTransactionDetail(transactionId)
      setTx(data.transaction)
      setNewStatus(data.transaction.status)
    } catch (err) {
      setError(err.message || 'Error al cargar la transacción.')
    } finally {
      setLoading(false)
    }
  }, [transactionId])

  useEffect(() => { load() }, [load])

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const copyId = () => {
    if (!tx?.alytoTransactionId) return
    navigator.clipboard.writeText(tx.alytoTransactionId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleStatusUpdate = async () => {
    if (!note.trim()) { setSaveError('La nota es requerida.'); return }
    setSaving(true)
    setSaveError(null)
    setSaveOk(false)
    try {
      const idempotencyKey = crypto.randomUUID()
      await updateTransactionStatus(tx.alytoTransactionId, newStatus, note.trim(), {}, idempotencyKey)
      setSaveOk(true)
      setNote('')
      onStatusUpdated?.()
      await load()
    } catch (err) {
      setSaveError(err.message || 'Error al actualizar.')
    } finally {
      setSaving(false)
    }
  }

  const isOpen = !!transactionId

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: '#0F162880', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className={`fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          width: 'min(520px, 100vw)',
          background: '#0F1628',
          borderLeft: '1px solid #263050',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header del drawer */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0 border-b border-[#263050]"
          style={{ background: 'linear-gradient(180deg, #1A2340 0%, #0F1628 100%)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {tx && (
              <>
                <button
                  onClick={copyId}
                  className="flex items-center gap-1.5 group"
                  title="Copiar ID"
                >
                  <span className="text-[0.75rem] font-mono text-[#C4CBD8] truncate max-w-[200px]">
                    {tx.alytoTransactionId}
                  </span>
                  {copied
                    ? <CheckCheck size={12} className="text-[#22C55E] flex-shrink-0" />
                    : <Copy size={12} className="text-[#4E5A7A] group-hover:text-[#C4CBD8] flex-shrink-0 transition-colors" />
                  }
                </button>
                <StatusBadge status={tx.status} size="lg" />
              </>
            )}
            {loading && <span className="text-[0.8125rem] text-[#4E5A7A]">Cargando...</span>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1A2340] border border-[#263050] flex items-center justify-center hover:border-[#C4CBD833] transition-colors flex-shrink-0 ml-3"
          >
            <X size={14} className="text-[#8A96B8]" />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader size={24} className="text-[#4E5A7A] animate-spin" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 bg-[#EF44441A] rounded-2xl border border-[#EF444433]">
              <AlertCircle size={16} className="text-[#F87171] flex-shrink-0" />
              <p className="text-[0.875rem] text-[#F87171]">{error}</p>
            </div>
          )}

          {tx && (
            <div>

              {/* ── Comprobante de pago del usuario ─────────────────────── */}
              {tx.paymentProof?.data && (
                <PaymentProofSection
                  paymentProof={tx.paymentProof}
                />
              )}

              {/* ── Beneficiario ─────────────────────────────────────────── */}
              {tx.beneficiary && Object.keys(tx.beneficiary).length > 0 && (() => {
                const df  = tx.beneficiary.dynamicFields ?? {}
                const ben = { ...tx.beneficiary, ...df }
                const benType = ben.type ?? df.type

                // Nombre: Vita usa first+last; Harbor usa beneficiary_name o company_name
                const fullName = [ben.beneficiary_first_name ?? ben.firstName, ben.beneficiary_last_name ?? ben.lastName]
                  .filter(Boolean).join(' ') || ben.beneficiary_name || ben.company_name || null

                // Banco: Vita usa bank_code; Harbor usa bank_name
                const bankDisplay = ben.bank_name ?? ben.bank_code ?? ben.bankCode ?? ben.beneficiary_bank ?? null

                // Cuenta: Vita usa account_bank; Harbor usa account_number
                const accountDisplay = ben.account_bank ?? ben.accountBank ?? ben.account_number ?? ben.beneficiary_account_number ?? null

                const accountTypeDisplay = ben.account_type_bank ?? ben.accountType ?? ben.beneficiary_account_type ?? null
                const swiftDisplay  = ben.swift_bic ?? ben.swift_code ?? null
                const bsbDisplay    = ben.routing_number ?? null
                const docDisplay    = ben.beneficiary_document_number ?? ben.documentNumber ?? ben.beneficiary_document ?? null
                const docTypeDisplay = ben.beneficiary_document_type ?? ben.documentType ?? null

                return (
                  <>
                    <SectionTitle icon={User}>Beneficiario</SectionTitle>

                    {/* Bolivia manual (bank_data / qr_image) */}
                    {benType === 'bank_data' || benType === 'qr_image' ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Nombre" value={fullName} />
                          <Field label="CI Bolivia" value={docDisplay} mono />
                          <Field label="Teléfono" value={ben.beneficiary_phone ?? ben.phone} dim />
                          <Field label="Tipo pago" value={benType === 'bank_data' ? 'Cuenta bancaria' : 'QR de cobro'} dim />
                        </div>
                        {benType === 'bank_data' && (
                          <div className="p-3 rounded-xl bg-[#1A2340] border border-[#263050] grid grid-cols-2 gap-3">
                            <Field label="Banco" value={bankDisplay} />
                            <Field label="Tipo cuenta" value={accountTypeDisplay} dim />
                            <Field label="N° cuenta" value={accountDisplay} mono />
                          </div>
                        )}
                        {benType === 'qr_image' && (ben.qr_image ?? df.qr_image) && (
                          <div className="p-3 rounded-xl bg-[#1A2340] border border-[#263050] flex flex-col items-center gap-2">
                            <p className="text-[0.75rem] text-[#4E5A7A] font-semibold uppercase tracking-wider">QR del beneficiario</p>
                            <img src={ben.qr_image ?? df.qr_image} alt="QR beneficiario"
                              className="w-[180px] h-[180px] rounded-xl bg-white p-1.5 object-contain" />
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Vita / Harbor — todos los campos disponibles */
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Nombre" value={fullName} />
                          <Field label="Email" value={ben.beneficiary_email ?? ben.email} dim />
                          {docDisplay && <Field label="Documento" value={docTypeDisplay ? `${docTypeDisplay} ${docDisplay}` : docDisplay} dim />}
                          <Field label="País destino" value={ben.beneficiary_country ?? tx.destinationCountry} dim />
                          {(ben.city ?? ben.beneficiary_city) && <Field label="Ciudad" value={ben.city ?? ben.beneficiary_city} dim />}
                          {(ben.state ?? ben.state_province) && <Field label="Provincia/Estado" value={ben.state ?? ben.state_province} dim />}
                          {(ben.zipcode ?? ben.postal_code) && <Field label="Código postal" value={ben.zipcode ?? ben.postal_code} dim />}
                          {ben.phone && <Field label="Teléfono" value={ben.phone} dim />}
                          {(ben.beneficiary_address ?? ben.street) && (
                            <div className="col-span-2">
                              <Field label="Dirección" value={ben.beneficiary_address ?? ben.street} dim />
                            </div>
                          )}
                        </div>
                        <div className="p-3 rounded-xl bg-[#1A2340] border border-[#263050] grid grid-cols-2 gap-3">
                          {bankDisplay    && <Field label="Banco"       value={bankDisplay}        />}
                          {accountDisplay && <Field label="N° cuenta"   value={accountDisplay} mono />}
                          {accountTypeDisplay && <Field label="Tipo cuenta" value={accountTypeDisplay} dim />}
                          {swiftDisplay   && <Field label="SWIFT / BIC" value={swiftDisplay}   mono />}
                          {bsbDisplay     && <Field label="Código BSB"  value={bsbDisplay}     mono />}
                          {ben.account_holder_name && ben.account_holder_name !== fullName && (
                            <Field label="Titular cuenta" value={ben.account_holder_name} dim />
                          )}
                        </div>
                        {(ben.purpose ?? ben.transfer_purpose) && (
                          <div className="p-2 rounded-lg bg-[#1A2340] border border-[#263050] grid grid-cols-2 gap-2">
                            <Field label="Propósito" value={ben.purpose ?? ben.transfer_purpose} dim />
                            {ben.purpose_comentary && <Field label="Comentario" value={ben.purpose_comentary} dim />}
                          </div>
                        )}
                      </div>
                    )}
                    <Divider />
                  </>
                )
              })()}

              {/* ── Banner sandbox: simular pago QR bancario ── */}
              {tx.status === 'payin_pending' && tx.bankQr?.qrId && (
                <BankQrTestBanner
                  tx={tx}
                  onConfirmed={() => { load(); onStatusUpdated?.() }}
                />
              )}

              {/* ── Banner payin manual (SRL Bolivia o SpA→BO manual) ── */}
              {MANUAL_PAYIN_PENDING.has(tx.status)
                && !tx.bankQr?.qrId
                && (tx.legalEntity === 'SRL' || (tx.legalEntity === 'SpA' && tx.destinationCountry === 'BO'))
                && (
                <PayinManualBanner
                  tx={tx}
                  onConfirmed={() => { load(); onStatusUpdated?.() }}
                />
              )}

              {/* ── Banner FALLO técnico (admin-facing failureReason) ─── */}
              {tx.status === 'failed' && tx.failureReason && (
                <div className="mb-5 p-4 rounded-2xl border border-[#EF444440] bg-[#EF44440A] space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none">⚠️</span>
                    <p className="text-[0.875rem] font-bold text-[#EF4444]">
                      Transferencia fallida {tx.failureCategory ? `· ${tx.failureCategory}` : ''}
                    </p>
                  </div>
                  <div className="space-y-2 pl-1">
                    <div>
                      <p className="text-[0.625rem] font-semibold text-[#8A96B8] uppercase tracking-wider mb-0.5">
                        Detalle técnico (admin)
                      </p>
                      <p className="text-[0.8125rem] text-white break-words">
                        {tx.failureReason}
                      </p>
                    </div>
                    {tx.userFailureReason && (
                      <div>
                        <p className="text-[0.625rem] font-semibold text-[#8A96B8] uppercase tracking-wider mb-0.5">
                          Mensaje mostrado al usuario
                        </p>
                        <p className="text-[0.8125rem] text-[#CBD5E1]">
                          {tx.userFailureReason}
                        </p>
                        {tx.userFailureAction && (
                          <p className="text-[0.75rem] text-[#94A3B8] mt-1 italic">
                            → {tx.userFailureAction}
                          </p>
                        )}
                      </div>
                    )}
                    {tx.failureRetryable && (
                      <p className="text-[0.6875rem] text-[#22C55E]">
                        ✓ El usuario puede reintentar tras corregir los datos
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ── Devolución ──────────────────────────────────────────
                  Con evidencia se muestra como cerrada; sin ella se ofrece el
                  formulario. 'refunded' SIN evidencia entra acá a propósito: es el
                  caso que el backend sigue contando como pasivo, así que el panel
                  tiene que pedir el respaldo en vez de darlo por saldado. */}
              {(() => {
                const r = tx.refund
                const conEvidencia = Boolean(r?.bankReference || r?.wtxId)
                if (conEvidencia) {
                  return <RefundDoneCard refund={r} currency={tx.originCurrency} />
                }
                if (tx.status === 'failed' || tx.status === 'refunded') {
                  return (
                    <RefundBanner
                      tx={tx}
                      onRegistered={() => { load(); onStatusUpdated?.() }}
                    />
                  )
                }
                return null
              })()}

              {/* ── Banner USDC pendiente de envío (Harbor off-ramp) ─── */}
              {tx.status === 'payout_pending_usdc_send' && tx.harborTransfer?.instructionAddress && (
                <div className="mb-5 p-4 rounded-2xl border border-[#F59E0B40] bg-[#F59E0B08] space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none">⚡</span>
                    <p className="text-[0.875rem] font-bold text-[#F59E0B]">
                      Acción requerida — Enviar USDC a Harbor
                    </p>
                  </div>
                  <div className="space-y-1.5 pl-1">
                    <p className="text-[0.8125rem] text-[#8A96B8]">
                      Enviar exactamente:
                    </p>
                    <p className="text-[1.25rem] font-extrabold text-white tabular-nums">
                      {tx.harborTransfer.usdcAmountRequired} USDC
                    </p>
                    <p className="text-[0.6875rem] text-[#4E5A7A]">
                      Red: {tx.harborTransfer.instructionChain ?? 'Stellar'}
                      {tx.harborTransfer.instructionMemo ? ` · Memo: ${tx.harborTransfer.instructionMemo}` : ''}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0F162880] border border-[#F59E0B30]">
                    <p className="text-[0.625rem] font-semibold text-[#F59E0B] uppercase tracking-wider mb-1">
                      Dirección destino
                    </p>
                    <p className="text-[0.8125rem] font-mono text-white break-all">
                      {tx.harborTransfer.instructionAddress}
                    </p>
                  </div>
                  {tx.harborTransfer.expiresAt && (
                    <p className="text-[0.75rem] text-[#F87171]">
                      ⏰ Expira: {new Date(tx.harborTransfer.expiresAt).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}
                    </p>
                  )}
                </div>
              )}

              {/* ── 1. Flujo de pago (timeline) ─────────────────────────── */}
              <SectionTitle icon={ArrowRight}>Flujo de pago</SectionTitle>
              <Timeline ipnLog={tx.ipnLog} />

              <Divider />

              {/* ── 2. Datos financieros ──────────────────────────────────── */}
              <SectionTitle icon={Banknote}>Datos financieros</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Monto enviado" value={tx.originalAmount != null ? `${tx.originalAmount?.toLocaleString('es-CL')} ${tx.originCurrency}` : null} />
                <Field label="Monto a recibir" value={tx.destinationAmount != null ? `${tx.destinationAmount?.toLocaleString('es-CL')} ${tx.destinationCurrency}` : null} />
                <Field label="Tasa de cambio" value={tx.exchangeRate != null ? `1 ${tx.originCurrency} = ${tx.exchangeRate} ${tx.destinationCurrency}` : null} dim />
                <Field label="Activo digital" value={tx.digitalAsset ? `${tx.digitalAsset} ${tx.digitalAssetAmount ?? ''}` : null} dim />
                <Field label="País origen" value={tx.originCountry} dim />
                <Field label="País destino" value={tx.destinationCountry} dim />
                <Field label="Entidad" value={tx.legalEntity} dim />
                <Field label="Corredor" value={tx.routingScenario ? `Escenario ${tx.routingScenario}` : null} dim />
              </div>

              {/* Desglose de fees actual (Transaction.fees). Incluye la ganancia
                  Alyto = spread + fijo + retención (admin only). payoutFee va en
                  moneda destino; el resto en moneda origen (feeCurrency). */}
              {tx.fees ? (() => {
                const f   = tx.fees
                const cur = f.feeCurrency ?? tx.originCurrency ?? ''
                const num = n => (n != null ? Number(n).toLocaleString('es-CL') : null)
                const ganancia = (f.alytoCSpread ?? 0) + (f.fixedFee ?? 0) + (f.profitRetention ?? 0)
                return (
                  <div className="mt-3 p-3 rounded-xl bg-[#1A2340] border border-[#263050] grid grid-cols-2 gap-2">
                    <Field label="Spread Alyto"        value={f.alytoCSpread != null ? `${num(f.alytoCSpread)} ${cur}` : null} dim />
                    <Field label="Fee fijo"            value={f.fixedFee != null ? `${num(f.fixedFee)} ${cur}` : null} dim />
                    <Field label="Fee payin (prov.)"   value={f.payinFee != null ? `${num(f.payinFee)} ${cur}` : null} dim />
                    <Field label="Fee payout (prov.)"  value={f.payoutFee != null ? `${num(f.payoutFee)} ${tx.destinationCurrency ?? ''}` : null} dim />
                    <Field label="Retención (interna)" value={f.profitRetention != null ? `${num(f.profitRetention)} ${cur}` : null} dim />
                    <Field label="Total deducido (usuario)" value={f.totalDeducted != null ? `${num(f.totalDeducted)} ${cur}` : null} dim />
                    <Field label="Ganancia Alyto"      value={`${num(ganancia)} ${cur}`} />
                  </div>
                )
              })() : tx.feeBreakdown && (
                <div className="mt-3 p-3 rounded-xl bg-[#1A2340] border border-[#263050] grid grid-cols-2 gap-2">
                  <Field label="Fee proveedor" value={tx.feeBreakdown.providerFee != null ? tx.feeBreakdown.providerFee?.toLocaleString('es-CL') : null} dim />
                  <Field label="Spread Alyto" value={tx.feeBreakdown.alytoFee != null ? tx.feeBreakdown.alytoFee?.toLocaleString('es-CL') : null} dim />
                  <Field label="Fee red" value={tx.feeBreakdown.networkFee != null ? tx.feeBreakdown.networkFee?.toLocaleString('es-CL') : null} dim />
                  <Field label="Fee total" value={tx.feeBreakdown.totalFee != null ? `${tx.feeBreakdown.totalFee?.toLocaleString('es-CL')} ${tx.feeBreakdown.feeCurrency ?? tx.originCurrency}` : null} />
                </div>
              )}

              {tx.stellarTxId && (
                <div className="mt-3">
                  <Field label="Stellar TXID" value={tx.stellarTxId} mono />
                </div>
              )}

              {/* ── Harbor Transfer (owlPay off-ramp) — panel INFORMATIVO ──
                   Estilo neutro (no ámbar) para no confundirlo con el banner de
                   "Acción requerida — Enviar USDC a Harbor". El off-ramp es
                   automático (OWLPAY_USDC_SEND_ENABLED=1); esto solo muestra el
                   detalle del transfer ya creado/enviado. */}
              {tx.harborTransfer?.transferId && (
                <div className="mt-4 p-4 rounded-2xl border border-[#263050] bg-[#1A2340]">
                  <p className="text-[0.6875rem] font-bold text-[#8A96B8] uppercase tracking-wider mb-3">
                    Off-ramp Harbor (automático)
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Field label="Transfer ID" value={tx.harborTransfer.transferId} mono />
                    <Field label="Estado Harbor" value={tx.harborTransfer.status ?? '—'} dim />
                    <Field label="USDC enviado" value={tx.harborTransfer.usdcAmountRequired != null ? `${tx.harborTransfer.usdcAmountRequired} USDC` : null} />
                    <Field label="Red / Chain" value={tx.harborTransfer.instructionChain ?? '—'} dim />
                    <Field label="Memo" value={tx.harborTransfer.instructionMemo ?? null} mono />
                    <Field label="Vence" value={tx.harborTransfer.expiresAt ? new Date(tx.harborTransfer.expiresAt).toLocaleString('es-BO', { timeZone: 'America/La_Paz' }) : null} dim />
                  </div>
                  {tx.harborTransfer.instructionAddress && (
                    <div className="mt-2.5">
                      <p className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-1">
                        Dirección USDC destino
                      </p>
                      <p className="text-[0.8125rem] font-mono text-[#8A96B8] break-all leading-relaxed">
                        {tx.harborTransfer.instructionAddress}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <Divider />

              {/* ── 4. Usuario ────────────────────────────────────────────── */}
              {tx.userId && (
                <>
                  <SectionTitle icon={User}>Usuario</SectionTitle>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Email" value={tx.userId.email} />
                    <Field label="Nombre" value={[tx.userId.firstName, tx.userId.lastName].filter(Boolean).join(' ')} dim />
                    <Field label="Entidad" value={tx.userId.legalEntity} dim />
                    <Field label="KYC" value={tx.userId.kycStatus} dim />
                  </div>
                  <Divider />
                </>
              )}

              {/* ── 4a2. Comprobante Oficial retail (BOL) — SRL, no business ──── */}
              {tx.boliviaCompliance?.numeroComprobante && tx.userId?.accountType !== 'business' && (
                <>
                  <div className="flex items-center gap-2">
                    <SectionTitle icon={FileText}>Comprobante Oficial</SectionTitle>
                  </div>
                  <p className="text-[0.75rem] text-[#8A96B8] mb-1">
                    N.º {tx.boliviaCompliance.numeroComprobante}
                  </p>
                  <button
                    onClick={async () => {
                      setDownloadingComprobante(true)
                      setComprobanteError(null)
                      try {
                        await getComprobanteOficial(tx.alytoTransactionId)
                      } catch (err) {
                        setComprobanteError(err.message || 'No se pudo abrir el comprobante.')
                      } finally {
                        setDownloadingComprobante(false)
                      }
                    }}
                    disabled={downloadingComprobante}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[0.8125rem] font-semibold transition-all active:scale-95 disabled:opacity-50"
                    style={{
                      background: downloadingComprobante ? '#C4CBD840' : '#C4CBD8',
                      color: '#0F1628',
                      boxShadow: downloadingComprobante ? 'none' : '0 4px 20px rgba(196,203,216,0.3)',
                    }}
                  >
                    {downloadingComprobante
                      ? <Loader size={13} className="animate-spin" />
                      : <FileText size={13} />}
                    {downloadingComprobante ? 'Abriendo...' : 'Ver / descargar Comprobante Oficial'}
                  </button>
                  {comprobanteError && (
                    <p className="text-[0.75rem] text-[#F87171] mt-1">{comprobanteError}</p>
                  )}
                  <Divider />
                </>
              )}

              {/* ── 4b. Factura B2B — solo business + completed + SRL ──── */}
              {tx.status === 'completed' && tx.legalEntity === 'SRL' && tx.userId?.accountType === 'business' && (
                <>
                  <div className="flex items-center gap-2">
                    <SectionTitle icon={FileText}>Factura B2B</SectionTitle>
                  </div>
                  <button
                    onClick={async () => {
                      setDownloadingB2B(true)
                      try {
                        await getBusinessInvoice(tx.alytoTransactionId)
                      } catch {
                        // silently handled
                      } finally {
                        setDownloadingB2B(false)
                      }
                    }}
                    disabled={downloadingB2B}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[0.8125rem] font-semibold transition-all active:scale-95 disabled:opacity-50"
                    style={{
                      background: downloadingB2B ? '#C4CBD840' : '#C4CBD8',
                      color: '#0F1628',
                      boxShadow: downloadingB2B ? 'none' : '0 4px 20px rgba(196,203,216,0.3)',
                    }}
                  >
                    {downloadingB2B
                      ? <Loader size={13} className="animate-spin" />
                      : <FileText size={13} />}
                    {downloadingB2B ? 'Generando...' : 'Descargar Comprobante B2B'}
                  </button>
                  <Divider />
                </>
              )}

              {/* ── 5. IPN Log ────────────────────────────────────────────── */}
              <SectionTitle icon={List}>IPN Log ({tx.ipnLog?.length ?? 0} eventos)</SectionTitle>
              {tx.ipnLog?.length > 0 ? (
                <div className="space-y-1.5">
                  {tx.ipnLog.map((entry, i) => (
                    <IpnLogEntry key={i} entry={entry} index={i} />
                  ))}
                </div>
              ) : (
                <p className="text-[0.8125rem] text-[#4E5A7A]">Sin eventos.</p>
              )}

              {/* ── 6. Actualización manual ───────────────────────────────── */}
              {tx.status !== 'completed' && (
                <>
                  <Divider />
                  <SectionTitle icon={Edit3}>Actualizar status manualmente</SectionTitle>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-1.5 block">
                        Nuevo status
                      </label>
                      <select
                        value={newStatus}
                        onChange={e => setNewStatus(e.target.value)}
                        className="w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white border border-[#263050] bg-[#1A2340] focus:outline-none focus:border-[#C4CBD8] focus:shadow-[0_0_0_2px_#C4CBD820]"
                      >
                        {VALID_STATUSES.map(s => (
                          <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[0.625rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-1.5 block">
                        Nota de auditoría <span className="text-[#EF4444]">*</span>
                      </label>
                      <textarea
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Razón del cambio manual..."
                        rows={3}
                        className="w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white border border-[#263050] bg-[#1A2340] focus:outline-none focus:border-[#C4CBD8] focus:shadow-[0_0_0_2px_#C4CBD820] resize-none placeholder-[#4E5A7A]"
                      />
                    </div>

                    {saveError && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
                        <AlertCircle size={14} className="text-[#F87171] flex-shrink-0" />
                        <p className="text-[0.8125rem] text-[#F87171]">{saveError}</p>
                      </div>
                    )}
                    {saveOk && (
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-[#22C55E1A] border border-[#22C55E33]">
                        <CheckCircle2 size={14} className="text-[#22C55E] flex-shrink-0" />
                        <p className="text-[0.8125rem] text-[#22C55E]">Status actualizado correctamente.</p>
                      </div>
                    )}

                    <button
                      onClick={handleStatusUpdate}
                      disabled={saving || !note.trim()}
                      className="w-full py-3 rounded-2xl text-[0.9375rem] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{
                        background: saving || !note.trim() ? '#C4CBD840' : '#C4CBD8',
                        color: '#0F1628',
                        boxShadow: saving || !note.trim() ? 'none' : '0 4px 20px rgba(196,203,216,0.3)',
                      }}
                    >
                      {saving && <Loader size={14} className="animate-spin" />}
                      {saving ? 'Guardando...' : 'Actualizar status'}
                    </button>
                  </div>
                </>
              )}

            </div>
          )}
        </div>
      </aside>
    </>
  )
}
