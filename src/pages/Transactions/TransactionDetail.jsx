/**
 * TransactionDetail.jsx — Vista de detalle de una transferencia
 *
 * Muestra el estado en tiempo real, resumen financiero, datos del beneficiario,
 * comprobante copiable/imprimible y soporte si la transferencia falló.
 *
 * Ruta: /transactions/:transactionId
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate }                    from 'react-router-dom'
import html2canvas                                   from 'html2canvas'
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  RefreshCw,
  XCircle,
  Copy,
  Printer,
  MessageCircle,
  Mail,
  ExternalLink,
  Link2,
  X,
  Download,
  CheckCheck,
  Share2,
} from 'lucide-react'

// ── QR helpers ────────────────────────────────────────────────────────────────

function toQrSrc(raw) {
  if (!raw) return null
  if (raw.startsWith('data:') || raw.startsWith('http')) return raw
  return `data:image/png;base64,${raw}`
}

// ── Masking helpers ────────────────────────────────────────────────────────────

/** "Juan García López" → "Juan G****" */
function maskName(name) {
  if (!name?.trim()) return null
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2) + '••••'
  return `${parts[0]} ${parts[1].slice(0, 1)}••••`
}

/** "****7890" stays; "12345678" → "****5678"; short → "••••" */
function maskAccount(account) {
  if (!account) return null
  const s = String(account)
  if (s.startsWith('*') || s.startsWith('•')) return s   // ya enmascarado por backend
  return `••••${s.slice(-4)}`
}

// ── PaymentInstructionsModal — muestra QR + datos bancarios ──────────────────

function PaymentInstructionsModal({ tx, onClose }) {
  const [qrSrc,     setQrSrc]     = useState(null)
  const [qrLoading, setQrLoading] = useState(true)
  const [copiedRef, setCopiedRef] = useState(false)

  useEffect(() => {
    if (!tx.transactionId) { setQrLoading(false); return }
    let cancelled = false
    getPaymentQR(tx.transactionId)
      .then(res => {
        if (cancelled) return
        const raw = res.qrDataUrl ?? res.qrUrl ?? res.qr ?? res.qrBase64
        if (raw) setQrSrc(toQrSrc(raw))
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setQrLoading(false) })
    return () => { cancelled = true }
  }, [tx.transactionId])

  const copyRef = () => {
    navigator.clipboard?.writeText(tx.transactionId)
    setCopiedRef(true)
    setTimeout(() => setCopiedRef(false), 2000)
  }

  const downloadQR = () => {
    if (!qrSrc) return
    const a = document.createElement('a')
    a.download = `qr-alyto-${tx.transactionId}.png`
    a.href = qrSrc
    a.click()
  }

  const bank = tx.payinInstructions ?? {}

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-[430px] rounded-t-3xl overflow-hidden flex flex-col"
        style={{ background: 'white', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] flex-shrink-0">
          <h3 className="text-[1rem] font-bold text-[#0F172A]">Instrucciones de pago</h3>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172A] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body scrolleable */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">

          {/* QR */}
          {(qrLoading || qrSrc) && (
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-5 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📱</span>
                <p className="text-[0.875rem] font-bold text-[#0F172A]">Paga con QR</p>
              </div>
              {qrLoading ? (
                <div className="w-[180px] h-[180px] rounded-2xl bg-[#E2E8F0] animate-pulse" />
              ) : (
                <img src={qrSrc} alt="QR de pago" className="w-[180px] h-[180px] rounded-2xl bg-white p-2 object-contain border border-[#E2E8F0]" />
              )}
              <p className="text-[0.75rem] text-[#64748B] text-center">Escanea desde tu app bancaria</p>
              {qrSrc && (
                <button
                  onClick={downloadQR}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E2E8F0] text-[0.8125rem] text-[#64748B] hover:text-[#0F172A] hover:border-[#1D9E7533] transition-colors"
                >
                  <Download size={13} /> Descargar QR
                </button>
              )}
            </div>
          )}

          {/* Separador */}
          {qrSrc && (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[#E2E8F0]" />
              <span className="text-[0.75rem] text-[#94A3B8] flex-shrink-0">O transfiere manualmente</span>
              <div className="h-px flex-1 bg-[#E2E8F0]" />
            </div>
          )}

          {/* Datos bancarios */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[#E2E8F0]">
              <span className="text-xl">🏦</span>
              <p className="text-[0.875rem] font-bold text-[#0F172A]">Transferencia bancaria</p>
            </div>
            <div className="px-4 divide-y divide-[#E2E8F0]">
              {[
                ['Banco',   bank.bankName     ?? 'Banco Bisa'],
                ['Titular', bank.accountHolder ?? bank.holder ?? 'AV Finance SRL'],
                ['Cuenta',  bank.accountNumber ?? '—'],
                ['Tipo',    bank.accountType   ?? 'Cuenta Corriente'],
                ['Monto',   `Bs ${Number(tx.originAmount ?? 0).toLocaleString('es-CL')} BOB`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between py-2.5">
                  <span className="text-[0.75rem] text-[#94A3B8]">{label}</span>
                  <span className={`text-[0.875rem] font-semibold ${label === 'Monto' ? 'text-[#1D9E75]' : 'text-[#0F172A]'}`}>{value}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0]">
              <div className="min-w-0">
                <p className="text-[0.625rem] text-[#94A3B8] uppercase tracking-wider mb-0.5">Referencia (copiar en el concepto)</p>
                <p className="text-[0.75rem] font-mono font-semibold text-[#0F172A] truncate">{tx.transactionId}</p>
              </div>
              <button
                onClick={copyRef}
                className="ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] text-[0.75rem] text-[#64748B] hover:text-[#0F172A] transition-colors flex-shrink-0"
              >
                {copiedRef
                  ? <><CheckCheck size={12} className="text-[#1D9E75]" /> Copiado</>
                  : <><Copy size={12} /> Copiar</>
                }
              </button>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2.5 px-4 py-3.5 rounded-2xl bg-[#FFFBEB] border border-[#F59E0B33]">
            <span className="text-base flex-shrink-0">⚠️</span>
            <p className="text-[0.8125rem] text-[#FBBF24] font-medium">
              Incluye el número de referencia en el concepto de tu transferencia.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl border border-[#E2E8F0] text-[#64748B] text-[0.875rem] font-semibold hover:text-[#0F172A] transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
import { fetchTransactionDetail } from '../../services/transactionsService.js'
import { getPaymentQR }           from '../../services/paymentsService.js'

// ── Configuración de estados ──────────────────────────────────────────────────

const STATUS_CONFIG = {
  initiated:        { label: 'Iniciada',          color: '#64748B', bg: '#64748B1A' },
  payin_pending:    { label: 'Pago pendiente',     color: '#64748B', bg: '#64748B1A' },
  payin_confirmed:  { label: 'Pago confirmado',    color: '#1D9E75', bg: '#1D9E751A' },
  payin_completed:  { label: 'Pago completado',    color: '#1D9E75', bg: '#1D9E751A' },
  processing:       { label: 'Procesando',         color: '#3B82F6', bg: '#3B82F61A' },
  in_transit:       { label: 'En tránsito',        color: '#3B82F6', bg: '#3B82F61A' },
  payout_pending:   { label: 'Enviando...',        color: '#1D9E75', bg: '#1D9E751A' },
  payout_sent:      { label: 'Enviado al banco',   color: '#3B82F6', bg: '#3B82F61A' },
  completed:        { label: 'Completada',         color: '#1D9E75', bg: '#1D9E751A' },
  failed:           { label: 'Fallida',            color: '#EF4444', bg: '#EF44441A' },
  refunded:         { label: 'Reembolsada',        color: '#F59E0B', bg: '#F59E0B1A' },
}

// ── Pasos del timeline ────────────────────────────────────────────────────────

const TIMELINE_STEPS = [
  {
    label:      'Pago recibido',
    doneWhen:   s => !['initiated', 'payin_pending'].includes(s) && s !== 'failed' && s !== 'refunded',
    activeWhen: s => s === 'payin_pending' || s === 'initiated',
  },
  {
    label:      'En proceso',
    doneWhen:   s => ['payout_pending', 'payout_sent', 'completed'].includes(s),
    activeWhen: s => ['payin_confirmed', 'payin_completed', 'processing', 'in_transit'].includes(s),
  },
  {
    label:      'Enviado al banco',
    doneWhen:   s => ['payout_sent', 'completed'].includes(s),
    activeWhen: s => s === 'payout_pending',
  },
  {
    label:      'Entregado',
    doneWhen:   s => s === 'completed',
    activeWhen: s => s === 'payout_sent',
  },
]

// ── Utilidades ────────────────────────────────────────────────────────────────

function truncateTxId(txId) {
  if (!txId || txId.length <= 20) return txId
  return `${txId.slice(0, 8)}...${txId.slice(-8)}`
}

function formatAmount(amount, currency) {
  if (amount == null || !currency) return '—'
  const num = new Intl.NumberFormat('es-CL', {
    style:                 'decimal',
    maximumFractionDigits: 2,
  }).format(amount)
  return `${num} ${currency}`
}

function formatExactDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('es-CL', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function Row({ label, value, bold, valueColor }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[0.8125rem] text-[#64748B] flex-shrink-0">{label}</span>
      <span
        className={`text-[0.8125rem] text-right ${bold ? 'font-bold' : 'font-medium'}`}
        style={{ color: valueColor ?? '#0F172A' }}
      >
        {value}
      </span>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0]">
      <p className="text-[0.6875rem] font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">
        {title}
      </p>
      {children}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function TransactionDetail() {
  const { transactionId } = useParams()
  const navigate          = useNavigate()

  const [tx, setTx]           = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [copied, setCopied]         = useState(false)
  const [copiedTxid, setCopiedTxid] = useState(false)
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(false)
  const [sharing, setSharing] = useState(false)

  const comprobanteRef = useRef(null)

  const supportWhatsApp = import.meta.env.VITE_SUPPORT_WHATSAPP
  const supportEmail    = 'soporte@alyto.app'

  const loadDetail = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchTransactionDetail(transactionId)
      setTx(data)
    } catch (err) {
      setError(err.message || 'No se pudo cargar el detalle.')
    } finally {
      setLoading(false)
    }
  }, [transactionId])

  useEffect(() => { loadDetail() }, [loadDetail])

  function handleCopy() {
    if (!navigator.clipboard) return
    navigator.clipboard.writeText(tx?.transactionId ?? transactionId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handlePrint() {
    window.print()
  }

  async function handleShareImage() {
    if (!comprobanteRef.current || sharing) return
    setSharing(true)
    try {
      const canvas = await html2canvas(comprobanteRef.current, {
        backgroundColor: '#FFFFFF',
        scale: 2,
        useCORS: true,
        logging: false,
      })
      canvas.toBlob(async (blob) => {
        const filename = `comprobante-alyto-${tx.transactionId}.png`
        if (navigator.share && navigator.canShare?.({ files: [new File([blob], filename, { type: 'image/png' })] })) {
          await navigator.share({
            title: 'Comprobante Alyto',
            text:  `Transferencia ${tx.transactionId}`,
            files: [new File([blob], filename, { type: 'image/png' })],
          })
        } else {
          // Fallback: descargar como PNG
          const url = URL.createObjectURL(blob)
          const a   = document.createElement('a')
          a.href     = url
          a.download = filename
          a.click()
          URL.revokeObjectURL(url)
        }
        setSharing(false)
      }, 'image/png')
    } catch {
      setSharing(false)
    }
  }

  // ── Estado de carga ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="pt-4">
        <div className="flex items-center gap-3 px-4 pb-4">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center">
            <ArrowLeft size={18} className="text-[#64748B]" />
          </button>
          <div className="h-5 w-36 bg-[#F8FAFC] rounded animate-pulse" />
        </div>
        <div className="px-4 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-[#F8FAFC] rounded-2xl animate-pulse border border-[#E2E8F0]" />
          ))}
        </div>
      </div>
    )
  }

  // ── Estado de error ────────────────────────────────────────────────────────
  if (error || !tx) {
    return (
      <div className="pt-4">
        <div className="flex items-center gap-3 px-4 pb-4">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center">
            <ArrowLeft size={18} className="text-[#64748B]" />
          </button>
          <h1 className="text-lg font-bold text-[#0F172A]">Detalle</h1>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#EF44441A] flex items-center justify-center mb-4">
            <XCircle size={24} className="text-[#EF4444]" />
          </div>
          <p className="text-[#0F172A] font-semibold mb-1">No se pudo cargar</p>
          <p className="text-[#64748B] text-sm mb-4">{error}</p>
          <button onClick={loadDetail} className="px-4 py-2 rounded-xl font-semibold text-sm text-white" style={{ background: '#1D9E75' }}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const cfg      = STATUS_CONFIG[tx.status] ?? { label: tx.status, color: '#64748B', bg: '#64748B1A' }
  const isFailed = tx.status === 'failed' || tx.status === 'refunded'
  const isManualPending = tx.payinMethod === 'manual' &&
    (tx.status === 'initiated' || tx.status === 'payin_pending')

  // Monto destino: si viene 0/null del server, estimar desde tasa
  const effectiveDestAmount = (tx.destinationAmount && tx.destinationAmount > 0)
    ? tx.destinationAmount
    : (tx.exchangeRate > 0 ? Math.round(tx.originAmount * tx.exchangeRate * 100) / 100 : null)

  // Tiempo estimado: mostrar en lenguaje más atractivo
  const deliveryLabel = (() => {
    const raw = tx.estimatedDelivery ?? ''
    if (!raw || raw === '—') return '⚡ Pocas horas'
    if (raw.includes('hora') || raw.includes('Hora')) return `⚡ ${raw}`
    if (raw.toLowerCase() === 'pocas horas') return '⚡ Pocas horas'
    return raw
  })()

  return (
    <>
      {/* Estilos de impresión — solo muestra la sección de comprobante */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #comprobante-print { display: block !important; position: fixed; top: 0; left: 0; width: 100%; padding: 32px; background: white; color: #111; font-family: sans-serif; }
          #comprobante-print h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 12px; }
          #comprobante-print .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eee; font-size: 0.875rem; }
          #comprobante-print .label { color: #666; }
          #comprobante-print .value { font-weight: 600; }
        }
      `}</style>

      <div className="pt-4">

        {/* Back + title */}
        <div className="flex items-center gap-3 px-4 pb-4">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center flex-shrink-0">
            <ArrowLeft size={18} className="text-[#64748B]" />
          </button>
          <h1 className="text-lg font-bold text-[#0F172A] flex-1">Detalle</h1>
        </div>

        <div className="flex flex-col gap-3 px-4">

          {/* ── 1. ESTADO ACTUAL ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0]">

            {/* Badge de status */}
            <div className="flex justify-center mb-5">
              <span
                className="text-sm font-semibold px-4 py-1.5 rounded-full"
                style={{ background: cfg.bg, color: cfg.color }}
              >
                {cfg.label}
              </span>
            </div>

            {/* Timeline — no se muestra si falló */}
            {!isFailed && (
              <div className="flex items-start">
                {TIMELINE_STEPS.map((step, i) => {
                  const done   = step.doneWhen(tx.status)
                  const active = step.activeWhen(tx.status)
                  const isLast = i === TIMELINE_STEPS.length - 1

                  const nodeColor  = done ? '#1D9E75' : active ? cfg.color : '#E2E8F0'
                  const nodeBorder = done ? '#1D9E75' : active ? cfg.color : '#E2E8F0'

                  return (
                    <div key={step.label} className="flex items-center flex-1">
                      {/* Nodo */}
                      <div className="flex flex-col items-center">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: done ? '#1D9E751A' : active ? cfg.bg : '#F8FAFC',
                            border:     `2px solid ${nodeBorder}`,
                          }}
                        >
                          {done
                            ? <CheckCircle size={12} color="#1D9E75" />
                            : active
                              ? <RefreshCw size={10} color={cfg.color} className="animate-spin" style={{ animationDuration: '2s' }} />
                              : <div className="w-2 h-2 rounded-full bg-[#CBD5E1]" />
                          }
                        </div>
                        <span
                          className="text-[0.5625rem] font-medium text-center mt-1.5 max-w-[52px] leading-tight"
                          style={{ color: done ? '#1D9E75' : active ? cfg.color : '#94A3B8' }}
                        >
                          {step.label}
                        </span>
                      </div>

                      {/* Conector */}
                      {!isLast && (
                        <div
                          className="h-0.5 flex-1 mx-1 mb-5"
                          style={{ background: done ? '#1D9E7540' : '#E2E8F0' }}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── 1b. INSTRUCCIONES PAYIN MANUAL (Bolivia) ─────────────────── */}
          {isManualPending && (
            <div className="bg-white rounded-2xl p-5 border border-[#FBBF2430]">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-xl flex-shrink-0">⏳</span>
                <div>
                  <p className="text-[0.875rem] font-bold text-[#FBBF24]">Verificando tu pago</p>
                  <p className="text-[0.8125rem] text-[#64748B] mt-0.5">
                    Estamos verificando tu transferencia. Te notificaremos cuando sea confirmada.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentInstructions(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#FBBF2430] text-[#FBBF24] text-[0.875rem] font-semibold hover:bg-[#FBBF2410] transition-colors"
              >
                <span>🏦</span>
                Ver instrucciones de pago
              </button>
            </div>
          )}

          {/* ── 2. RESUMEN FINANCIERO ────────────────────────────────────── */}
          <Section title="Resumen financiero">
            <div className="flex flex-col gap-3">
              <Row
                label="Enviaste"
                value={formatAmount(tx.originAmount, tx.originCurrency)}
                bold
              />
              {tx.exchangeRate > 0 && tx.destinationCurrency && (
                <Row
                  label="Tasa aplicada"
                  value={`1 ${tx.originCurrency} = ${tx.exchangeRate.toFixed(6)} ${tx.destinationCurrency}`}
                />
              )}
              {tx.fees?.totalDeducted > 0 && (
                <Row
                  label="Fees cobrados"
                  value={formatAmount(tx.fees.totalDeducted, tx.originCurrency)}
                  valueColor="#EF4444"
                />
              )}
              <div className="h-px bg-[#E2E8F0]" />
              <Row
                label="Beneficiario recibe"
                value={effectiveDestAmount
                  ? formatAmount(effectiveDestAmount, tx.destinationCurrency)
                  : '—'}
                bold
                valueColor="#1D9E75"
              />
              <Row
                label="Tiempo estimado"
                value={deliveryLabel}
              />
            </div>
          </Section>

          {/* ── 3. BENEFICIARIO ──────────────────────────────────────────── */}
          {tx.beneficiary && (
            <Section title="Beneficiario">
              <div className="flex flex-col gap-3">
                {tx.beneficiary.fullName && (
                  <Row label="Nombre" value={maskName(tx.beneficiary.fullName)} />
                )}
                {tx.beneficiary.bankName && (
                  <Row label="Banco" value={tx.beneficiary.bankName} />
                )}
                <Row
                  label="Cuenta"
                  value={maskAccount(tx.beneficiary.accountNumber) ?? '••••'}
                />
                {tx.beneficiary.beneficiary_first_name && !tx.beneficiary.fullName && (
                  <Row label="Nombre" value={maskName(
                    [tx.beneficiary.beneficiary_first_name, tx.beneficiary.beneficiary_last_name]
                      .filter(Boolean).join(' ')
                  )} />
                )}
              </div>
            </Section>
          )}

          {/* ── 4. COMPROBANTE ───────────────────────────────────────────── */}
          <div ref={comprobanteRef} className="bg-white rounded-2xl p-5 border border-[#E2E8F0]">
            <p className="text-[0.6875rem] font-semibold text-[#94A3B8] uppercase tracking-wider mb-4">
              Comprobante
            </p>

            <div className="flex flex-col gap-3 mb-5">
              {/* ID copiable */}
              <div>
                <p className="text-[0.6875rem] text-[#94A3B8] mb-1">ID de transacción</p>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 text-[0.8125rem] font-mono text-[#0F172A] hover:text-[#1D9E75] transition-colors w-full text-left"
                >
                  <span className="truncate">{tx.transactionId}</span>
                  {copied
                    ? <CheckCircle size={14} className="text-[#1D9E75] flex-shrink-0" />
                    : <Copy size={14} className="text-[#94A3B8] flex-shrink-0" />
                  }
                </button>
                {copied && (
                  <p className="text-[0.6875rem] text-[#1D9E75] mt-1">¡Copiado!</p>
                )}
              </div>

              <Row label="Fecha y hora" value={formatExactDate(tx.createdAt)} />

              {tx.updatedAt && tx.updatedAt !== tx.createdAt && (
                <Row label="Última actualización" value={formatExactDate(tx.updatedAt)} />
              )}
            </div>

            {/* Botones compartir */}
            <div className="flex gap-2">
              <button
                onClick={handleShareImage}
                disabled={sharing}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B' }}
              >
                {sharing
                  ? <RefreshCw size={15} className="animate-spin" />
                  : <Share2 size={15} />
                }
                Compartir
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B' }}
                title="Imprimir / PDF"
              >
                <Printer size={15} />
              </button>
            </div>
          </div>

          {/* ── 5. COMPROBANTE BLOCKCHAIN — solo si completada ────────────── */}
          {tx.status === 'completed' && (
            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0]">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-[#1D9E751A] flex items-center justify-center flex-shrink-0">
                  <Link2 size={14} className="text-[#1D9E75]" />
                </div>
                <p className="text-[0.6875rem] font-semibold text-[#94A3B8] uppercase tracking-wider">
                  Verificado en blockchain
                </p>
              </div>

              {tx.stellarTxId ? (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[0.8125rem] text-[#64748B]">Red</span>
                    <span className="text-[0.8125rem] font-medium text-[#0F172A]">
                      {import.meta.env.VITE_STELLAR_NETWORK === 'mainnet'
                        ? 'Stellar Mainnet'
                        : 'Stellar Testnet'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-3">
                    <span className="text-[0.8125rem] text-[#64748B] flex-shrink-0">TXID</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[0.8125rem] font-mono text-[#0F172A] truncate">
                        {truncateTxId(tx.stellarTxId)}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(tx.stellarTxId).then(() => {
                            setCopiedTxid(true)
                            setTimeout(() => setCopiedTxid(false), 2000)
                          })
                        }}
                        className="flex-shrink-0 text-[#94A3B8] hover:text-[#1D9E75] transition-colors"
                        title="Copiar TXID completo"
                      >
                        {copiedTxid
                          ? <CheckCircle size={14} className="text-[#1D9E75]" />
                          : <Copy size={14} />
                        }
                      </button>
                    </div>
                  </div>

                  {copiedTxid && (
                    <p className="text-[0.6875rem] text-[#1D9E75] text-right -mt-1">¡TXID copiado!</p>
                  )}

                  <a
                    href={`https://stellar.expert/explorer/${
                      import.meta.env.VITE_STELLAR_NETWORK === 'mainnet' ? 'public' : 'testnet'
                    }/tx/${tx.stellarTxId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#1D9E7533] text-[#1D9E75] text-sm font-medium transition-colors hover:bg-[#1D9E751A]"
                  >
                    Ver en Stellar Explorer
                    <ExternalLink size={14} />
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-2 py-1">
                  <RefreshCw size={13} className="text-[#CBD5E1] animate-spin" style={{ animationDuration: '3s' }} />
                  <span className="text-[0.8125rem] text-[#94A3B8]">
                    Registro blockchain en proceso…
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── 6. SOPORTE — solo si falló ────────────────────────────────── */}
          {isFailed && (
            <div className="rounded-2xl p-5 border border-[#EF444433]" style={{ background: '#EF44441A' }}>
              <p className="text-[#0F172A] font-semibold mb-1">¿Necesitas ayuda?</p>
              <p className="text-[#64748B] text-sm mb-4">
                Contáctanos y resolveremos tu caso a la brevedad.
              </p>
              <div className="flex gap-3">
                {supportWhatsApp && (
                  <a
                    href={`https://wa.me/${supportWhatsApp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
                    style={{
                      background:   '#1D9E751A',
                      borderColor:  '#1D9E7533',
                      color:        '#1D9E75',
                    }}
                  >
                    <MessageCircle size={16} />
                    WhatsApp
                  </a>
                )}
                <a
                  href={`mailto:${supportEmail}`}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-colors"
                  style={{
                    background:  '#F8FAFC',
                    borderColor: '#E2E8F0',
                    color:       '#64748B',
                  }}
                >
                  <Mail size={16} />
                  Email
                </a>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modal instrucciones payin manual */}
      {showPaymentInstructions && (
        <PaymentInstructionsModal
          tx={tx}
          onClose={() => setShowPaymentInstructions(false)}
        />
      )}

      {/* Sección oculta para imprimir */}
      <div id="comprobante-print" style={{ display: 'none' }}>
        <h2>Comprobante Alyto</h2>
        <div className="row"><span className="label">ID:</span><span className="value">{tx.transactionId}</span></div>
        <div className="row"><span className="label">Estado:</span><span className="value">{cfg.label}</span></div>
        <div className="row"><span className="label">Enviaste:</span><span className="value">{formatAmount(tx.originAmount, tx.originCurrency)}</span></div>
        <div className="row"><span className="label">Beneficiario recibe:</span><span className="value">{formatAmount(tx.destinationAmount, tx.destinationCurrency)}</span></div>
        {tx.fees?.totalDeducted > 0 && (
          <div className="row"><span className="label">Fees:</span><span className="value">{formatAmount(tx.fees.totalDeducted, tx.originCurrency)}</span></div>
        )}
        {tx.beneficiary?.fullName && (
          <div className="row"><span className="label">Beneficiario:</span><span className="value">{tx.beneficiary.fullName}</span></div>
        )}
        {tx.beneficiary?.bankName && (
          <div className="row"><span className="label">Banco:</span><span className="value">{tx.beneficiary.bankName}</span></div>
        )}
        {tx.beneficiary?.accountNumber && (
          <div className="row"><span className="label">Cuenta:</span><span className="value">{tx.beneficiary.accountNumber}</span></div>
        )}
        <div className="row"><span className="label">Fecha:</span><span className="value">{formatExactDate(tx.createdAt)}</span></div>
      </div>
    </>
  )
}
