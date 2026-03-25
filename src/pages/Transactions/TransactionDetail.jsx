/**
 * TransactionDetail.jsx — Vista de detalle de una transferencia
 *
 * Muestra el estado en tiempo real, resumen financiero, datos del beneficiario,
 * comprobante copiable/imprimible y soporte si la transferencia falló.
 *
 * Ruta: /transactions/:transactionId
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate }            from 'react-router-dom'
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
} from 'lucide-react'

// ── QR helpers ────────────────────────────────────────────────────────────────

function toQrSrc(raw) {
  if (!raw) return null
  if (raw.startsWith('data:') || raw.startsWith('http')) return raw
  return `data:image/png;base64,${raw}`
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
        const raw = res.qrDataUrl ?? res.qrUrl ?? res.qr
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-[430px] rounded-t-3xl overflow-hidden flex flex-col"
        style={{ background: '#0F1628', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#263050] flex-shrink-0">
          <h3 className="text-[1rem] font-bold text-white">Instrucciones de pago</h3>
          <button onClick={onClose} className="text-[#4E5A7A] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body scrolleable */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">

          {/* QR */}
          {(qrLoading || qrSrc) && (
            <div className="bg-[#1A2340] border border-[#263050] rounded-2xl p-5 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📱</span>
                <p className="text-[0.875rem] font-bold text-white">Paga con QR</p>
              </div>
              {qrLoading ? (
                <div className="w-[180px] h-[180px] rounded-2xl bg-[#263050] animate-pulse" />
              ) : (
                <img src={qrSrc} alt="QR de pago" className="w-[180px] h-[180px] rounded-2xl bg-white p-2 object-contain" />
              )}
              <p className="text-[0.75rem] text-[#8A96B8] text-center">Escanea desde tu app bancaria</p>
              {qrSrc && (
                <button
                  onClick={downloadQR}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#263050] text-[0.8125rem] text-[#8A96B8] hover:text-white hover:border-[#C4CBD833] transition-colors"
                >
                  <Download size={13} /> Descargar QR
                </button>
              )}
            </div>
          )}

          {/* Separador */}
          {qrSrc && (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-[#263050]" />
              <span className="text-[0.75rem] text-[#4E5A7A] flex-shrink-0">O transfiere manualmente</span>
              <div className="h-px flex-1 bg-[#263050]" />
            </div>
          )}

          {/* Datos bancarios */}
          <div className="bg-[#1A2340] border border-[#263050] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3.5 border-b border-[#263050]">
              <span className="text-xl">🏦</span>
              <p className="text-[0.875rem] font-bold text-white">Transferencia bancaria</p>
            </div>
            <div className="px-4 divide-y divide-[#26305050]">
              {[
                ['Banco',   bank.bankName     ?? 'Banco Bisa'],
                ['Titular', bank.holder       ?? 'AV Finance SRL'],
                ['Cuenta',  bank.accountNumber ?? '—'],
                ['Tipo',    bank.accountType   ?? 'Cuenta Corriente'],
                ['Monto',   `Bs ${Number(tx.originAmount ?? 0).toLocaleString('es-CL')} BOB`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between py-2.5">
                  <span className="text-[0.75rem] text-[#4E5A7A]">{label}</span>
                  <span className={`text-[0.875rem] font-semibold ${label === 'Monto' ? 'text-[#22C55E]' : 'text-white'}`}>{value}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#263050]">
              <div className="min-w-0">
                <p className="text-[0.625rem] text-[#4E5A7A] uppercase tracking-wider mb-0.5">Referencia (copiar en el concepto)</p>
                <p className="text-[0.75rem] font-mono font-semibold text-[#C4CBD8] truncate">{tx.transactionId}</p>
              </div>
              <button
                onClick={copyRef}
                className="ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#263050] text-[0.75rem] text-[#8A96B8] hover:text-white transition-colors flex-shrink-0"
              >
                {copiedRef
                  ? <><CheckCheck size={12} className="text-[#22C55E]" /> Copiado</>
                  : <><Copy size={12} /> Copiar</>
                }
              </button>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2.5 px-4 py-3.5 rounded-2xl bg-[#F59E0B0F] border border-[#F59E0B33]">
            <span className="text-base flex-shrink-0">⚠️</span>
            <p className="text-[0.8125rem] text-[#FBBF24] font-medium">
              Incluye el número de referencia en el concepto de tu transferencia.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl border border-[#263050] text-[#8A96B8] text-[0.875rem] font-semibold hover:text-white transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
import { fetchTransactionDetail } from '../../services/transactionsService.js'
import { getPaymentQR }           from '../../services/paymentsService.js'

// ── Configuración de estados ──────────────────────────────────────────────────

const STATUS_CONFIG = {
  initiated:        { label: 'Iniciada',          color: '#8A96B8', bg: '#8A96B81A' },
  payin_pending:    { label: 'Pago pendiente',     color: '#8A96B8', bg: '#8A96B81A' },
  payin_confirmed:  { label: 'Pago confirmado',    color: '#C4CBD8', bg: '#C4CBD81A' },
  payin_completed:  { label: 'Pago completado',    color: '#C4CBD8', bg: '#C4CBD81A' },
  processing:       { label: 'Procesando',         color: '#3B82F6', bg: '#3B82F61A' },
  in_transit:       { label: 'En tránsito',        color: '#3B82F6', bg: '#3B82F61A' },
  payout_pending:   { label: 'Enviando...',        color: '#C4CBD8', bg: '#C4CBD81A' },
  payout_sent:      { label: 'Enviado al banco',   color: '#3B82F6', bg: '#3B82F61A' },
  completed:        { label: 'Completada',         color: '#22C55E', bg: '#22C55E1A' },
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
      <span className="text-[0.8125rem] text-[#8A96B8] flex-shrink-0">{label}</span>
      <span
        className={`text-[0.8125rem] text-right ${bold ? 'font-bold' : 'font-medium'}`}
        style={{ color: valueColor ?? '#FFFFFF' }}
      >
        {value}
      </span>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-[#1A2340] rounded-2xl p-5">
      <p className="text-[0.6875rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-4">
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

  // ── Estado de carga ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1628] flex flex-col max-w-[430px] mx-auto">
        <header className="flex items-center gap-3 px-4 pt-12 pb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-[#1A2340] flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-[#8A96B8]" />
          </button>
          <div className="h-5 w-36 bg-[#1A2340] rounded animate-pulse" />
        </header>
        <div className="px-4 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-[#1A2340] rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // ── Estado de error ────────────────────────────────────────────────────────
  if (error || !tx) {
    return (
      <div className="min-h-screen bg-[#0F1628] flex flex-col max-w-[430px] mx-auto">
        <header className="flex items-center gap-3 px-4 pt-12 pb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-[#1A2340] flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-[#8A96B8]" />
          </button>
          <h1 className="text-lg font-bold text-white">Detalle</h1>
        </header>
        <div className="flex flex-col items-center justify-center flex-1 px-4 py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#EF44441A] flex items-center justify-center mb-4">
            <XCircle size={24} className="text-[#EF4444]" />
          </div>
          <p className="text-white font-semibold mb-1">No se pudo cargar</p>
          <p className="text-[#8A96B8] text-sm mb-4">{error}</p>
          <button
            onClick={loadDetail}
            className="px-4 py-2 rounded-xl font-semibold text-sm text-[#0F1628]"
            style={{ background: '#C4CBD8' }}
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const cfg      = STATUS_CONFIG[tx.status] ?? { label: tx.status, color: '#8A96B8', bg: '#8A96B81A' }
  const isFailed = tx.status === 'failed' || tx.status === 'refunded'
  const isManualPending = tx.payinMethod === 'manual' &&
    (tx.status === 'initiated' || tx.status === 'payin_pending')

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

      <div className="min-h-screen bg-[#0F1628] flex flex-col max-w-[430px] mx-auto pb-10">

        {/* Header */}
        <header className="flex items-center gap-3 px-4 pt-12 pb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-[#1A2340] flex items-center justify-center flex-shrink-0"
          >
            <ArrowLeft size={18} className="text-[#8A96B8]" />
          </button>
          <h1 className="text-lg font-bold text-white flex-1">Detalle</h1>
        </header>

        <div className="flex flex-col gap-3 px-4">

          {/* ── 1. ESTADO ACTUAL ─────────────────────────────────────────── */}
          <div className="bg-[#1A2340] rounded-2xl p-5">

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

                  const nodeColor  = done ? '#22C55E' : active ? cfg.color : '#263050'
                  const nodeBorder = done ? '#22C55E' : active ? cfg.color : '#263050'

                  return (
                    <div key={step.label} className="flex items-center flex-1">
                      {/* Nodo */}
                      <div className="flex flex-col items-center">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: done ? '#22C55E1A' : active ? cfg.bg : '#1F2B4D',
                            border:     `2px solid ${nodeBorder}`,
                          }}
                        >
                          {done
                            ? <CheckCircle size={12} color="#22C55E" />
                            : active
                              ? <RefreshCw size={10} color={cfg.color} className="animate-spin" style={{ animationDuration: '2s' }} />
                              : <div className="w-2 h-2 rounded-full bg-[#4E5A7A]" />
                          }
                        </div>
                        <span
                          className="text-[0.5625rem] font-medium text-center mt-1.5 max-w-[52px] leading-tight"
                          style={{ color: done ? '#22C55E' : active ? cfg.color : '#4E5A7A' }}
                        >
                          {step.label}
                        </span>
                      </div>

                      {/* Conector */}
                      {!isLast && (
                        <div
                          className="h-0.5 flex-1 mx-1 mb-5"
                          style={{ background: done ? '#22C55E40' : '#263050' }}
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
            <div className="bg-[#1A2340] rounded-2xl p-5 border border-[#FBBF2430]">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-xl flex-shrink-0">⏳</span>
                <div>
                  <p className="text-[0.875rem] font-bold text-[#FBBF24]">Verificando tu pago</p>
                  <p className="text-[0.8125rem] text-[#8A96B8] mt-0.5">
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
              <div className="h-px bg-[#263050]" />
              <Row
                label="Beneficiario recibe"
                value={formatAmount(tx.destinationAmount, tx.destinationCurrency)}
                bold
                valueColor="#22C55E"
              />
              <Row
                label="Tiempo estimado"
                value={tx.estimatedDelivery ?? '1 día hábil'}
              />
            </div>
          </Section>

          {/* ── 3. BENEFICIARIO ──────────────────────────────────────────── */}
          {(tx.beneficiary?.fullName || tx.beneficiary?.bankName || tx.beneficiary?.accountNumber) && (
            <Section title="Beneficiario">
              <div className="flex flex-col gap-3">
                {tx.beneficiary.fullName && (
                  <Row label="Nombre" value={tx.beneficiary.fullName} />
                )}
                {tx.beneficiary.bankName && (
                  <Row label="Banco" value={tx.beneficiary.bankName} />
                )}
                {tx.beneficiary.accountNumber && (
                  <Row label="Cuenta" value={tx.beneficiary.accountNumber} />
                )}
              </div>
            </Section>
          )}

          {/* ── 4. COMPROBANTE ───────────────────────────────────────────── */}
          <div className="bg-[#1A2340] rounded-2xl p-5">
            <p className="text-[0.6875rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-4">
              Comprobante
            </p>

            <div className="flex flex-col gap-3 mb-5">
              {/* ID copiable */}
              <div>
                <p className="text-[0.6875rem] text-[#4E5A7A] mb-1">ID de transacción</p>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 text-[0.8125rem] font-mono text-[#C4CBD8] hover:text-white transition-colors w-full text-left"
                >
                  <span className="truncate">{tx.transactionId}</span>
                  {copied
                    ? <CheckCircle size={14} className="text-[#22C55E] flex-shrink-0" />
                    : <Copy size={14} className="text-[#4E5A7A] flex-shrink-0" />
                  }
                </button>
                {copied && (
                  <p className="text-[0.6875rem] text-[#22C55E] mt-1">¡Copiado!</p>
                )}
              </div>

              <Row label="Fecha y hora" value={formatExactDate(tx.createdAt)} />

              {tx.updatedAt && tx.updatedAt !== tx.createdAt && (
                <Row label="Última actualización" value={formatExactDate(tx.updatedAt)} />
              )}
            </div>

            {/* Botón descargar / imprimir */}
            <button
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#263050] text-[#8A96B8] text-sm font-medium transition-colors hover:border-[#C4CBD833] hover:text-[#C4CBD8]"
            >
              <Printer size={16} />
              Descargar comprobante
            </button>
          </div>

          {/* ── 5. COMPROBANTE BLOCKCHAIN — solo si completada ────────────── */}
          {tx.status === 'completed' && (
            <div className="bg-[#1A2340] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-[#C4CBD81A] flex items-center justify-center flex-shrink-0">
                  <Link2 size={14} className="text-[#C4CBD8]" />
                </div>
                <p className="text-[0.6875rem] font-semibold text-[#4E5A7A] uppercase tracking-wider">
                  Verificado en blockchain
                </p>
              </div>

              {tx.stellarTxId ? (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[0.8125rem] text-[#8A96B8]">Red</span>
                    <span className="text-[0.8125rem] font-medium text-white">
                      {import.meta.env.VITE_STELLAR_NETWORK === 'mainnet'
                        ? 'Stellar Mainnet'
                        : 'Stellar Testnet'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-3">
                    <span className="text-[0.8125rem] text-[#8A96B8] flex-shrink-0">TXID</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[0.8125rem] font-mono text-[#C4CBD8] truncate">
                        {truncateTxId(tx.stellarTxId)}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(tx.stellarTxId).then(() => {
                            setCopiedTxid(true)
                            setTimeout(() => setCopiedTxid(false), 2000)
                          })
                        }}
                        className="flex-shrink-0 text-[#4E5A7A] hover:text-[#C4CBD8] transition-colors"
                        title="Copiar TXID completo"
                      >
                        {copiedTxid
                          ? <CheckCircle size={14} className="text-[#22C55E]" />
                          : <Copy size={14} />
                        }
                      </button>
                    </div>
                  </div>

                  {copiedTxid && (
                    <p className="text-[0.6875rem] text-[#22C55E] text-right -mt-1">¡TXID copiado!</p>
                  )}

                  <a
                    href={`https://stellar.expert/explorer/${
                      import.meta.env.VITE_STELLAR_NETWORK === 'mainnet' ? 'public' : 'testnet'
                    }/tx/${tx.stellarTxId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#C4CBD833] text-[#C4CBD8] text-sm font-medium transition-colors hover:bg-[#C4CBD81A]"
                  >
                    Ver en Stellar Explorer
                    <ExternalLink size={14} />
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-2 py-1">
                  <RefreshCw size={13} className="text-[#4E5A7A] animate-spin" style={{ animationDuration: '3s' }} />
                  <span className="text-[0.8125rem] text-[#4E5A7A]">
                    Registro blockchain en proceso…
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── 6. SOPORTE — solo si falló ────────────────────────────────── */}
          {isFailed && (
            <div className="rounded-2xl p-5 border border-[#EF444433]" style={{ background: '#EF44441A' }}>
              <p className="text-white font-semibold mb-1">¿Necesitas ayuda?</p>
              <p className="text-[#8A96B8] text-sm mb-4">
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
                      background:   '#22C55E1A',
                      borderColor:  '#22C55E33',
                      color:        '#22C55E',
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
                    background:  '#C4CBD81A',
                    borderColor: '#C4CBD833',
                    color:       '#C4CBD8',
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
