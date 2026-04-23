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
          <h3 className="text-[1rem] font-bold text-[#0D1F3C]">Instrucciones de pago</h3>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0D1F3C] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body scrolleable */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">

          {/* QR */}
          {(qrLoading || qrSrc) && (
            <div className="bg-[#F0F2F7] border border-[#E2E8F0] rounded-2xl p-5 flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📱</span>
                <p className="text-[0.875rem] font-bold text-[#0D1F3C]">Paga con QR</p>
              </div>
              {qrLoading ? (
                <div className="w-[180px] h-[180px] rounded-2xl bg-[#E2E8F0] animate-pulse" />
              ) : (
                <img src={qrSrc} alt="QR de pago" className="w-[180px] h-[180px] rounded-2xl bg-white p-2 object-contain border border-[#E2E8F0]" />
              )}
              <p className="text-[0.75rem] text-[#4A5568] text-center">Escanea desde tu app bancaria</p>
              {qrSrc && (
                <button
                  onClick={downloadQR}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E2E8F0] text-[0.8125rem] text-[#4A5568] hover:text-[#0D1F3C] hover:border-[#1D346133] transition-colors"
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
              <p className="text-[0.875rem] font-bold text-[#0D1F3C]">Transferencia bancaria</p>
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
                  <span className={`text-[0.875rem] font-semibold ${label === 'Monto' ? 'text-[#1D3461]' : 'text-[#0D1F3C]'}`}>{value}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0]">
              <div className="min-w-0">
                <p className="text-[0.625rem] text-[#94A3B8] uppercase tracking-wider mb-0.5">Referencia (copiar en el concepto)</p>
                <p className="text-[0.75rem] font-mono font-semibold text-[#0D1F3C] truncate">{tx.transactionId}</p>
              </div>
              <button
                onClick={copyRef}
                className="ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] text-[0.75rem] text-[#4A5568] hover:text-[#0D1F3C] transition-colors flex-shrink-0"
              >
                {copiedRef
                  ? <><CheckCheck size={12} className="text-[#1D3461]" /> Copiado</>
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
            className="w-full py-3 rounded-2xl border border-[#E2E8F0] text-[#4A5568] text-[0.875rem] font-semibold hover:text-[#0D1F3C] transition-colors"
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
import { downloadBusinessInvoice } from '../../services/api.js'
import { useAuth }                 from '../../context/AuthContext.jsx'

// ── Configuración de estados ──────────────────────────────────────────────────

const STATUS_CONFIG = {
  initiated:        { label: 'Iniciada',          color: 'var(--color-text-secondary)', bg: '#64748B1A' },
  payin_pending:    { label: 'Pago pendiente',     color: 'var(--color-text-secondary)', bg: '#64748B1A' },
  payin_confirmed:  { label: 'Pago confirmado',    color: 'var(--color-accent-teal)', bg: '#233E581A' },
  payin_completed:  { label: 'Pago completado',    color: 'var(--color-accent-teal)', bg: '#233E581A' },
  processing:       { label: 'Procesando',         color: '#3B82F6', bg: '#3B82F61A' },
  in_transit:       { label: 'En tránsito',        color: '#3B82F6', bg: '#3B82F61A' },
  payout_pending:   { label: 'Enviando...',        color: 'var(--color-accent-teal)', bg: '#233E581A' },
  payout_sent:      { label: 'Enviado al banco',   color: '#3B82F6', bg: '#3B82F61A' },
  completed:        { label: 'Completada',         color: 'var(--color-accent-teal)', bg: '#233E581A' },
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

function countryFlag(code) {
  if (!code || code.length !== 2) return '🌍'
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 - 65 + c.charCodeAt(0)))
}

function currencyToCountry(currency) {
  const map = { BOB: 'BO', CLP: 'CL', USD: 'US', COP: 'CO', PEN: 'PE', ARS: 'AR', MXN: 'MX', BRL: 'BR', EUR: 'EU', GBP: 'GB' }
  return map[currency] ?? null
}

// Códigos bancarios de Vita Wallet → nombre legible
const VITA_BANK_NAMES = {
  // Colombia
  '1':   'Banco de Bogotá',
  '2':   'Banco Popular',
  '6':   'Banco Corpbanca',
  '7':   'Bancolombia',
  '9':   'Citibank Colombia',
  '12':  'Banco GNB Sudameris',
  '13':  'BBVA Colombia',
  '23':  'Banco de Occidente',
  '31':  'Bancoldex',
  '32':  'Bancoomeva',
  '40':  'Banco Agrario',
  '41':  'Banco Agrario',
  '42':  'Banco Santander',
  '47':  'Banco Multibank',
  '51':  'Davivienda',
  '52':  'Banco Av Villas',
  '53':  'Banco WWB',
  '58':  'Banco Caja Social',
  '62':  'Banco Falabella',
  '66':  'Banco Coopcentral',
  '83':  'Compensar',
  '84':  'Aportes en Línea',
  '86':  'IRIS',
  '87':  'Itaú',
  '89':  'Banco Pichincha',
  '891': 'Bancolombia',
  '90':  'Banco Finandina',
  '93':  'Banco Credifinanciera',
  '94':  'Banco Agrario',
  '121': 'Juriscoop',
  '283': 'CFA Cooperativa Financiera',
  '289': 'Confiar',
  '292': 'Confiar Cooperativa',
  '370': 'Coltefinanciera',
  '507': 'Nequi',
  '550': 'DECEVAL',
  '685': 'Daviplata',
  '706': 'Itaú',
  '755': 'Daviplata',
  '777': 'Nequi',
  // Chile
  '001': 'Banco de Chile',
  '009': 'Banco Internacional',
  '012': 'Banco Estado',
  '014': 'Scotiabank',
  '016': 'BCI',
  '028': 'Banco BICE',
  '031': 'HSBC Chile',
  '037': 'Banco Santander',
  '039': 'Itaú Chile',
  '049': 'Banco Security',
  '051': 'Falabella',
  '053': 'Banco Ripley',
  '055': 'Banco Consorcio',
  '067': 'Coopeuch',
}

function resolveBankName(code) {
  if (!code) return null
  return VITA_BANK_NAMES[String(code)] ?? null
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function Row({ label, value, bold, valueColor }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[0.8125rem] text-[#4A5568] flex-shrink-0">{label}</span>
      <span
        className={`text-[0.8125rem] text-right ${bold ? 'font-bold' : 'font-medium'}`}
        style={{ color: valueColor ?? 'var(--color-text-primary)' }}
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
  const { user }          = useAuth()

  const [tx, setTx]           = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [copied, setCopied]         = useState(false)
  const [copiedTxid, setCopiedTxid] = useState(false)
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [downloadingB2B, setDownloadingB2B] = useState(false)

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

  async function captureComprobante() {
    const el = comprobanteRef.current
    return html2canvas(el, {
      backgroundColor: '#FFFFFF',
      scale: 2,
      useCORS: true,
      logging: false,
      width:  el.scrollWidth,
      height: el.scrollHeight,
      windowWidth:  el.scrollWidth,
      windowHeight: el.scrollHeight,
      scrollX: 0,
      scrollY: -window.scrollY,
    })
  }

  async function handleShareImage() {
    if (!comprobanteRef.current || sharing) return
    setSharing(true)
    try {
      const canvas = await captureComprobante()
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob returned null')), 'image/png')
      })
      const filename = `comprobante-alyto-${tx.transactionId}.png`
      const file = new File([blob], filename, { type: 'image/png' })
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Comprobante Alyto',
          text:  `Transferencia ${tx.transactionId}`,
          files: [file],
        })
      } else {
        // Fallback: descargar imagen directamente (desktop sin Web Share API)
        const url = URL.createObjectURL(blob)
        const a   = document.createElement('a')
        a.href     = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('[Share] Error compartiendo comprobante:', err.message)
    } finally {
      setSharing(false)
    }
  }

  async function handleDownloadImage() {
    if (!comprobanteRef.current || sharing) return
    setSharing(true)
    try {
      const canvas = await captureComprobante()
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob returned null')), 'image/png')
      })
      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href     = url
      a.download = `comprobante-alyto-${tx.transactionId}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[Download] Error descargando comprobante:', err.message)
    } finally {
      setSharing(false)
    }
  }

  // ── Estado de carga ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="pt-4">
        <div className="flex items-center gap-3 px-4 pb-4">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-[#F0F2F7] border border-[#E2E8F0] flex items-center justify-center">
            <ArrowLeft size={18} className="text-[#4A5568]" />
          </button>
          <div className="h-5 w-36 bg-[#F0F2F7] rounded animate-pulse" />
        </div>
        <div className="px-4 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-[#F0F2F7] rounded-2xl animate-pulse border border-[#E2E8F0]" />
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
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-[#F0F2F7] border border-[#E2E8F0] flex items-center justify-center">
            <ArrowLeft size={18} className="text-[#4A5568]" />
          </button>
          <h1 className="text-lg font-bold text-[#0D1F3C]">Detalle</h1>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#EF44441A] flex items-center justify-center mb-4">
            <XCircle size={24} className="text-[#EF4444]" />
          </div>
          <p className="text-[#0D1F3C] font-semibold mb-1">No se pudo cargar</p>
          <p className="text-[#4A5568] text-sm mb-4">{error}</p>
          <button onClick={loadDetail} className="px-4 py-2 rounded-xl font-semibold text-sm text-[#0D1F3C]" style={{ background: '#233E58' }}>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const cfg      = STATUS_CONFIG[tx.status] ?? { label: tx.status, color: 'var(--color-text-secondary)', bg: '#64748B1A' }
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
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-[#F0F2F7] border border-[#E2E8F0] flex items-center justify-center flex-shrink-0">
            <ArrowLeft size={18} className="text-[#4A5568]" />
          </button>
          <h1 className="text-lg font-bold text-[#0D1F3C] flex-1">Detalle</h1>
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

                  const nodeColor  = done ? '#233E58' : active ? cfg.color : 'var(--color-border)'
                  const nodeBorder = done ? '#233E58' : active ? cfg.color : 'var(--color-border)'

                  return (
                    <div key={step.label} className="flex items-center flex-1">
                      {/* Nodo */}
                      <div className="flex flex-col items-center">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{
                            background: done ? '#233E581A' : active ? cfg.bg : 'var(--color-bg-elevated)',
                            border:     `2px solid ${nodeBorder}`,
                          }}
                        >
                          {done
                            ? <CheckCircle size={12} color="#233E58" />
                            : active
                              ? <RefreshCw size={10} color={cfg.color} className="animate-spin" style={{ animationDuration: '2s' }} />
                              : <div className="w-2 h-2 rounded-full bg-[#CBD5E1]" />
                          }
                        </div>
                        <span
                          className="text-[0.5625rem] font-medium text-center mt-1.5 max-w-[52px] leading-tight"
                          style={{ color: done ? '#233E58' : active ? cfg.color : '#94A3B8' }}
                        >
                          {step.label}
                        </span>
                      </div>

                      {/* Conector */}
                      {!isLast && (
                        <div
                          className="h-0.5 flex-1 mx-1 mb-5"
                          style={{ background: done ? '#233E5840' : 'var(--color-border)' }}
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
                  <p className="text-[0.8125rem] text-[#4A5568] mt-0.5">
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
                valueColor="#233E58"
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
                  <Row label="Banco" value={resolveBankName(tx.beneficiary.bankName) ?? tx.beneficiary.bankName} />
                )}
                <Row
                  label="Cuenta"
                  value={maskAccount(tx.beneficiary.accountNumber) ?? '••••'}
                />
                {tx.beneficiary.accountType && (
                  <Row label="Tipo" value={tx.beneficiary.accountType} />
                )}
              </div>
            </Section>
          )}

          {/* ── 4. COMPROBANTE ───────────────────────────────────────────── */}
          <div>
            {/* Comprobante card — solo esta parte es capturada por html2canvas */}
            <div ref={comprobanteRef} className="bg-white rounded-2xl border border-[#E2E8F0]">

              {/* Header branding */}
              <div className="flex flex-col items-center py-5 px-5" style={{ background: 'linear-gradient(180deg, #233E580D 0%, #ffffff 100%)' }}>
                <img
                  src="/assets/logo-alyto.png"
                  alt="Alyto"
                  crossOrigin="anonymous"
                  style={{ height: '28px', width: 'auto', marginBottom: 6 }}
                />
                <p style={{ color: '#94A3B8', fontSize: '0.6875rem', marginTop: 2 }}>Comprobante de transferencia</p>
              </div>

              <div className="px-5 pb-6 flex flex-col">

                {/* ID de transacción */}
                <div className="mb-4 pb-4" style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <p style={{ color: '#94A3B8', fontSize: '0.6875rem', marginBottom: 4 }}>ID de transacción</p>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 w-full text-left hover:opacity-70 transition-opacity"
                    style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: copied ? 'var(--color-accent-teal)' : 'var(--color-text-primary)' }}
                  >
                    <span className="truncate">{tx.transactionId}</span>
                    {copied
                      ? <CheckCircle size={13} color="#1D3461" style={{ flexShrink: 0 }} />
                      : <Copy size={13} color="#94A3B8" style={{ flexShrink: 0 }} />
                    }
                  </button>
                  {copied && <p style={{ color: 'var(--color-accent-teal)', fontSize: '0.625rem', marginTop: 2 }}>¡Copiado!</p>}
                </div>

                {/* Tú enviaste / Ellos reciben / Tasa */}
                <div className="flex flex-col gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>Tú enviaste</span>
                    <span style={{ color: 'var(--color-text-primary)', fontSize: '0.8125rem', fontWeight: 600 }}>
                      {countryFlag(currencyToCountry(tx.originCurrency))} {formatAmount(tx.originAmount, tx.originCurrency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>Ellos reciben</span>
                    <span style={{ color: 'var(--color-accent-teal)', fontSize: '0.8125rem', fontWeight: 700 }}>
                      {countryFlag(tx.destinationCountry)} {formatAmount(effectiveDestAmount, tx.destinationCurrency)}
                    </span>
                  </div>
                  {tx.exchangeRate > 0 && (
                    <div className="flex items-center justify-between">
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>Tasa de cambio</span>
                      <span style={{ color: 'var(--color-text-primary)', fontSize: '0.8125rem', fontWeight: 500 }}>
                        1 {tx.originCurrency} = {tx.exchangeRate.toLocaleString('es-CL', { maximumFractionDigits: 4 })} {tx.destinationCurrency}
                      </span>
                    </div>
                  )}
                </div>

                {/* Beneficiario */}
                {tx.beneficiary && (
                  <div className="flex flex-col gap-3 mb-4 pb-4" style={{ borderBottom: '1px solid #F1F5F9' }}>
                    {tx.beneficiary.fullName && (
                      <div className="flex items-center justify-between">
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>Beneficiario</span>
                        <span style={{ color: 'var(--color-text-primary)', fontSize: '0.8125rem', fontWeight: 500 }}>
                          {tx.beneficiary.fullName}
                        </span>
                      </div>
                    )}
                    {tx.beneficiary.bankName && (
                      <div className="flex items-center justify-between">
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>Banco</span>
                        <span style={{ color: 'var(--color-text-primary)', fontSize: '0.8125rem', fontWeight: 500 }}>
                          {resolveBankName(tx.beneficiary.bankName) ?? tx.beneficiary.bankName}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>Cuenta</span>
                      <span style={{ color: 'var(--color-text-primary)', fontSize: '0.8125rem', fontWeight: 500 }}>
                        {maskAccount(tx.beneficiary.accountNumber) ?? '••••'}
                      </span>
                    </div>
                    {tx.beneficiary.accountType && (
                      <div className="flex items-center justify-between">
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>Tipo</span>
                        <span style={{ color: 'var(--color-text-primary)', fontSize: '0.8125rem', fontWeight: 500 }}>{tx.beneficiary.accountType}</span>
                      </div>
                    )}
                    {tx.beneficiary.documentNumber && (
                      <div className="flex items-center justify-between">
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                          {tx.beneficiary.documentType ? tx.beneficiary.documentType.toUpperCase() : 'CI / Documento'}
                        </span>
                        <span style={{ color: 'var(--color-text-primary)', fontSize: '0.8125rem', fontWeight: 500 }}>
                          {tx.beneficiary.documentNumber}
                        </span>
                      </div>
                    )}
                    {tx.concept && (
                      <div className="flex items-center justify-between gap-3">
                        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', flexShrink: 0 }}>Concepto</span>
                        <span style={{ color: 'var(--color-text-primary)', fontSize: '0.8125rem', fontWeight: 500, textAlign: 'right' }}>
                          {tx.concept}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Fecha, tiempo estimado, estado */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>Fecha de envío</span>
                    <span style={{ color: 'var(--color-text-primary)', fontSize: '0.8125rem', fontWeight: 500 }}>{formatExactDate(tx.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>Tiempo estimado</span>
                    <span style={{ color: 'var(--color-text-primary)', fontSize: '0.8125rem', fontWeight: 500 }}>{deliveryLabel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>Estado</span>
                    <span
                      style={{ background: cfg.bg, color: cfg.color, fontSize: '0.75rem', fontWeight: 600, padding: '3px 12px', borderRadius: 999 }}
                    >
                      {cfg.label}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Botones — FUERA del ref: no aparecen en la imagen capturada */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleShareImage}
                disabled={sharing}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-60"
                style={{ background: '#25D366', color: 'white' }}
              >
                {sharing ? <RefreshCw size={15} className="animate-spin" /> : <MessageCircle size={15} />}
                WhatsApp
              </button>
              <button
                onClick={handleDownloadImage}
                disabled={sharing}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-60"
                style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                <Download size={15} />
                Guardar
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-95"
                style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
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
                <div className="w-7 h-7 rounded-lg bg-[#233E581A] flex items-center justify-center flex-shrink-0">
                  <Link2 size={14} className="text-[#1D3461]" />
                </div>
                <p className="text-[0.6875rem] font-semibold text-[#94A3B8] uppercase tracking-wider">
                  Verificado en blockchain
                </p>
              </div>

              {tx.stellarTxId ? (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[0.8125rem] text-[#4A5568]">Red</span>
                    <span className="text-[0.8125rem] font-medium text-[#0D1F3C]">
                      {import.meta.env.VITE_STELLAR_NETWORK === 'mainnet'
                        ? 'Stellar Mainnet'
                        : 'Stellar Testnet'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-3">
                    <span className="text-[0.8125rem] text-[#4A5568] flex-shrink-0">TXID</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[0.8125rem] font-mono text-[#0D1F3C] truncate">
                        {truncateTxId(tx.stellarTxId)}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(tx.stellarTxId).then(() => {
                            setCopiedTxid(true)
                            setTimeout(() => setCopiedTxid(false), 2000)
                          })
                        }}
                        className="flex-shrink-0 text-[#94A3B8] hover:text-[#1D3461] transition-colors"
                        title="Copiar TXID completo"
                      >
                        {copiedTxid
                          ? <CheckCircle size={14} className="text-[#1D3461]" />
                          : <Copy size={14} />
                        }
                      </button>
                    </div>
                  </div>

                  {copiedTxid && (
                    <p className="text-[0.6875rem] text-[#1D3461] text-right -mt-1">¡TXID copiado!</p>
                  )}

                  <a
                    href={`https://stellar.expert/explorer/${
                      import.meta.env.VITE_STELLAR_NETWORK === 'mainnet' ? 'public' : 'testnet'
                    }/tx/${tx.stellarTxId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#1D346133] text-[#1D3461] text-sm font-medium transition-colors hover:bg-[#233E581A]"
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

          {/* ── 6. FACTURA B2B — solo para business + completed ────────── */}
          {tx.status === 'completed' && user?.accountType === 'business' && (
            <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-[#233E581A] flex items-center justify-center flex-shrink-0">
                  <Download size={14} className="text-[#1D3461]" />
                </div>
                <p className="text-[0.6875rem] font-semibold text-[#94A3B8] uppercase tracking-wider">
                  Comprobante de Servicio B2B
                </p>
              </div>
              <button
                onClick={async () => {
                  setDownloadingB2B(true)
                  try {
                    await downloadBusinessInvoice(tx.transactionId)
                  } catch {
                    // silently fail — request() will handle 401
                  } finally {
                    setDownloadingB2B(false)
                  }
                }}
                disabled={downloadingB2B}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-60"
                style={{ background: '#233E58', color: 'white' }}
              >
                {downloadingB2B
                  ? <RefreshCw size={15} className="animate-spin" />
                  : <Download size={15} />}
                {downloadingB2B ? 'Generando...' : 'Descargar Factura B2B'}
              </button>
            </div>
          )}

          {/* ── 7. SOPORTE — solo si falló ────────────────────────────────── */}
          {isFailed && (
            <div className="rounded-2xl p-5 border border-[#EF444433]" style={{ background: '#EF44441A' }}>
              <p className="text-[#0D1F3C] font-semibold mb-1">¿Necesitas ayuda?</p>
              <p className="text-[#4A5568] text-sm mb-4">
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
                      background:   '#233E581A',
                      borderColor:  '#233E5833',
                      color:        '#233E58',
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
                    background:  'var(--color-bg-elevated)',
                    borderColor: 'var(--color-border)',
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
          <div className="row"><span className="label">Banco:</span><span className="value">{resolveBankName(tx.beneficiary.bankName) ?? tx.beneficiary.bankName}</span></div>
        )}
        {tx.beneficiary?.accountNumber && (
          <div className="row"><span className="label">Cuenta:</span><span className="value">{tx.beneficiary.accountNumber}</span></div>
        )}
        <div className="row"><span className="label">Fecha:</span><span className="value">{formatExactDate(tx.createdAt)}</span></div>
      </div>
    </>
  )
}
