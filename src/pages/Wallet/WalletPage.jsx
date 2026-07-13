/**
 * WalletPage.jsx — Wallet Dual Ledger Bolivia (Fase 35)
 *
 * Exclusiva para usuarios legalEntity === 'SRL' (Bolivia).
 * Dos tabs:
 *   - BOB: saldo en bolivianos, depósito/envío/retiro manual
 *   - USDC: saldo en USDC, depósito Stellar directo, conversión BOB→USDC
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'
import {
  ArrowLeft, Wallet, ArrowDownToLine, ArrowUpRight,
  ArrowRightLeft, AlertCircle, CheckCircle2, Clock,
  ChevronLeft, ChevronRight, X, Loader2, Copy, CheckCheck, QrCode,
  RefreshCw, Info, Upload, Building2, Mail, Camera, CameraOff,
  Download, AtSign, Share2, FileText, Eye,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { request, requestFormData } from '../../services/api'
import QRDisplay, { buildQRWithLogo } from '../../components/ui/QRDisplay'
import { shareQRImage } from '../../utils/shareImage'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBOB(amount) {
  if (amount == null) return 'Bs. 0,00'
  return `Bs. ${new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`
}

function formatUSDC(amount) {
  if (amount == null) return '0.00 USDC'
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)} USDC`
}

function formatDate(d) {
  if (!d) return ''
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',   // Bolivia (UTC-4) — no la zona del dispositivo
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

const ALIAS_RE = /^[a-z0-9_]{3,20}$/

function useCountdown(expiresAt) {
  const [secs, setSecs] = useState(null)
  useEffect(() => {
    if (!expiresAt) { setSecs(null); return }
    const tick = () => setSecs(Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  return secs
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    active:    { bg: '#22C55E1A', text: '#22C55E', label: 'Activa' },
    frozen:    { bg: '#EF44441A', text: '#F87171', label: 'Congelada' },
    suspended: { bg: '#F1F5F9',   text: '#64748B', label: 'Suspendida' },
  }
  const s = map[status] ?? map.active
  return (
    <span className="text-[0.6875rem] font-semibold px-2.5 py-1 rounded-full"
      style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  )
}

// ── Transaction Type Icon ─────────────────────────────────────────────────────

function TxIcon({ type }) {
  const map = {
    deposit:     { icon: ArrowDownToLine, color: '#22C55E', bg: '#22C55E1A' },
    withdrawal:  { icon: ArrowUpRight,    color: '#F87171', bg: '#EF44441A' },
    send:        { icon: ArrowUpRight,    color: '#F87171', bg: '#EF44441A' },
    receive:     { icon: ArrowDownToLine, color: '#22C55E', bg: '#22C55E1A' },
    freeze:      { icon: AlertCircle,     color: '#8A96B8', bg: '#C4CBD81A' },
    unfreeze:    { icon: CheckCircle2,    color: '#22C55E', bg: '#22C55E1A' },
    fee:         { icon: ArrowRightLeft,  color: '#8A96B8', bg: '#C4CBD81A' },
    bob_to_usdc: { icon: ArrowRightLeft,  color: '#F59E0B', bg: '#F59E0B1A' },
    usdc_to_bob: { icon: ArrowRightLeft,  color: '#F59E0B', bg: '#F59E0B1A' },
    usdc_deposit:{ icon: ArrowDownToLine, color: '#22C55E', bg: '#22C55E1A' },
    p2p_send:    { icon: ArrowUpRight,    color: '#F87171', bg: '#EF44441A' },
    p2p_receive: { icon: ArrowDownToLine, color: '#22C55E', bg: '#22C55E1A' },
  }
  const m = map[type] ?? map.receive
  const Icon = m.icon
  return (
    <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{ background: m.bg }}>
      <Icon size={16} style={{ color: m.color }} />
    </div>
  )
}

function TxStatusBadge({ status }) {
  const map = {
    awaiting_proof: { bg: '#F59E0B1A', text: '#D97706', label: 'Pendiente de comprobante' },
    pending:        { bg: '#64748B1A', text: '#64748B', label: 'Pendiente' },
    completed:      { bg: '#22C55E1A', text: '#22C55E', label: 'Completado' },
    failed:         { bg: '#EF44441A', text: '#F87171', label: 'Fallido' },
    reversed:       { bg: '#64748B1A', text: '#64748B', label: 'Revertido' },
  }
  const s = map[status] ?? map.pending
  return (
    <span className="text-[0.625rem] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  )
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ data, width = 96, height = 32, id = 'bob' }) {
  if (!data || data.length < 2) return null
  const values = data.map(d => d.balance ?? 0)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = (max - min) || 1
  const pad = 2
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: pad + (1 - (v - min) / range) * (height - pad * 2),
  }))
  const line = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const fill = [`M0,${height}`, ...pts.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`), `L${width},${height}`, 'Z'].join(' ')
  const isUp  = values[values.length - 1] >= values[0]
  const c     = isUp ? '#22C55E' : '#F87171'
  const pct   = values[0] === 0 ? null : ((values[values.length - 1] - values[0]) / values[0] * 100)
  return (
    <div className="flex flex-col items-end gap-0.5">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={`sg-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c} stopOpacity="0.3" />
            <stop offset="100%" stopColor={c} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={fill} fill={`url(#sg-${id})`} />
        <polyline points={line} fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2.5" fill={c} />
      </svg>
      {pct !== null && Math.abs(pct) >= 0.01 && (
        <span className="text-[0.5625rem] font-bold" style={{ color: c }}>
          {isUp ? '+' : ''}{pct.toFixed(1)}%
        </span>
      )}
    </div>
  )
}

// ── Daily Limit Bar ────────────────────────────────────────────────────────────

function DailyLimitBar({ label, used, limit }) {
  const pct       = limit > 0 ? Math.min(100, (used / limit) * 100) : 0
  const barColor  = pct > 80 ? '#F87171' : pct > 60 ? '#F59E0B' : 'rgba(255,255,255,0.65)'
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[0.5625rem] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</span>
        <span className="text-[0.5625rem] font-bold" style={{ color: pct > 60 ? barColor : 'rgba(255,255,255,0.65)' }}>
          {formatBOB(used).replace('Bs. ', '')} / {(limit / 1000).toFixed(0)}K
        </span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  )
}

// ── Filter Chips ───────────────────────────────────────────────────────────────

function FilterChips({ filters, active, onChange, accent = '#233E58' }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {filters.map(f => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className="flex-shrink-0 text-[0.75rem] font-semibold px-3.5 py-1.5 rounded-full transition-all"
          style={active === f.key
            ? { background: accent, color: 'white', boxShadow: `0 2px 8px ${accent}40` }
            : { background: '#F1F5F9', color: '#64748B' }
          }
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

// ── Modal base ─────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center"
      style={{ background: '#0F162899' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div
        className="w-full max-w-[430px] bg-white rounded-t-3xl px-6 pt-5 overflow-y-auto"
        style={{
          border: '1px solid #E2E8F0',
          borderBottom: 'none',
          maxHeight: '90dvh',
          paddingBottom: 'max(2rem, env(safe-area-inset-bottom) + 1.5rem)',
        }}
      >
        <div className="flex items-center justify-between mb-5 sticky top-0 bg-white pt-1 pb-2 z-10">
          <h3 className="text-[1rem] font-bold text-[#0F172A]">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center flex-shrink-0">
            <X size={16} className="text-[#64748B]" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}

// ── Modal Cargar Saldo BOB ────────────────────────────────────────────────────

const DEPOSIT_MIN_BOB = parseInt(import.meta.env.VITE_DEPOSIT_MIN_BOB || '50', 10)
const DEPOSIT_MAX_BOB = parseInt(import.meta.env.VITE_DEPOSIT_MAX_BOB || '10000', 10)

// Convierte el paymentQR del banco (base64 SVG en mock BEC) a una src usable en <img>.
// El mock BEC devuelve base64 de un SVG; el banco real podría devolver PNG/data-uri.
function bankQrSrc(raw) {
  if (!raw) return ''
  if (raw.startsWith('data:')) return raw
  if (raw.trim().startsWith('<svg')) return `data:image/svg+xml;utf8,${encodeURIComponent(raw)}`
  return `data:image/svg+xml;base64,${raw}`
}

function DepositModal({ open, onClose, onSuccess }) {
  // ─── state ───────────────────────────────────────────────────────────────────
  const [view, setView]           = useState('amount')   // 'amount' | 'instructions' | 'bankqr'
  const [amount, setAmount]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState(null)       // response from /deposit/initiate
  const [qrImages, setQrImages]   = useState([])         // QRs estáticos del admin
  const [payTab, setPayTab]       = useState('transfer') // 'transfer' | 'qr'
  const [error, setError]         = useState('')
  const [copied, setCopied]       = useState(false)

  // comprobante upload (solo flujo manual)
  const [proofFile, setProofFile]       = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [uploading, setUploading]       = useState(false)
  const [uploadError, setUploadError]   = useState('')
  const [uploadDone, setUploadDone]     = useState(false)

  // bankQr — confirmación automática vía polling
  const [bankConfirmed, setBankConfirmed] = useState(false)
  const [bankFailed, setBankFailed]       = useState('')

  function resetAll() {
    setView('amount'); setAmount(''); setResult(null); setQrImages([])
    setPayTab('transfer'); setError(''); setCopied(false)
    setProofFile(null); setProofPreview(null); setUploading(false)
    setUploadError(''); setUploadDone(false)
    setBankConfirmed(false); setBankFailed('')
  }

  // Polling del estado del depósito bankQr — el banco confirma vía IPN y el saldo
  // se acredita solo. Detectamos el cambio a 'completed'/'failed' en el historial.
  useEffect(() => {
    if (view !== 'bankqr' || !result?.wtxId || bankConfirmed || bankFailed) return
    let active = true
    async function poll() {
      try {
        const res = await request('/wallet/transactions?type=deposit&limit=15')
        const tx  = (res?.transactions ?? []).find(t => t.wtxId === result.wtxId)
        if (!active || !tx) return
        if (tx.status === 'completed') { setBankConfirmed(true); onSuccess?.() }
        else if (tx.status === 'failed') { setBankFailed('El QR expiró o el pago no se completó.') }
      } catch { /* reintenta en el próximo tick */ }
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => { active = false; clearInterval(id) }
  }, [view, result, bankConfirmed, bankFailed])

  function handleClose() { resetAll(); onClose() }

  // ─── Step 1: iniciar depósito ─────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const n = Number(amount)
    if (!n || n < DEPOSIT_MIN_BOB)  return setError(`El monto mínimo es Bs. ${DEPOSIT_MIN_BOB}.`)
    if (n > DEPOSIT_MAX_BOB)        return setError(`El monto máximo es Bs. ${DEPOSIT_MAX_BOB.toLocaleString('es-BO')}.`)
    setLoading(true)
    try {
      const data = await request('/wallet/deposit/initiate', {
        method: 'POST',
        body: JSON.stringify({ amount: n }),
      })
      setResult(data)

      // Camino bankQr: QR dinámico del banco + confirmación automática (sin comprobante).
      if (data.method === 'bankQr') {
        setView('bankqr')
        return
      }

      // Camino manual: instrucciones bancarias + comprobante. Traemos los QRs estáticos del admin.
      const instrData = await request('/wallet/deposit/qr-images').catch(() => ({ qrImages: [] }))
      const imgs = Array.isArray(instrData?.qrImages) ? instrData.qrImages.filter(q => q.imageBase64) : []
      setQrImages(imgs)
      setPayTab(imgs.length > 0 ? 'qr' : 'transfer')
      setView('instructions')
    } catch (err) {
      setError(err.message ?? 'Error al iniciar el depósito.')
    } finally {
      setLoading(false)
    }
  }

  function copyReference() {
    navigator.clipboard.writeText(result?.reference ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ─── Step 2: seleccionar comprobante ────────────────────────────────────────
  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('El archivo no puede superar 5 MB.')
      return
    }
    setProofFile(file)
    setUploadError('')
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = ev => setProofPreview(ev.target.result)
      reader.readAsDataURL(file)
    } else {
      setProofPreview(null)
    }
  }

  async function handleUpload() {
    if (!proofFile || !result?.wtxId) return
    setUploading(true); setUploadError('')
    try {
      const fd = new FormData()
      fd.append('comprobante', proofFile)
      await requestFormData(`/wallet/deposit/${encodeURIComponent(result.wtxId)}/comprobante`, fd)
      setUploadDone(true)
      onSuccess?.()
    } catch (err) {
      setUploadError(err.message ?? 'Error al subir el comprobante.')
    } finally {
      setUploading(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Modal open={open} onClose={handleClose} title="Cargar saldo BOB">

      {/* ── PASO 1: monto ── */}
      {view === 'amount' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[0.75rem] font-medium text-[#64748B] mb-1.5">
              Monto a depositar (BOB)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] font-semibold text-sm">Bs.</span>
              <input
                type="number" min={DEPOSIT_MIN_BOB} max={DEPOSIT_MAX_BOB}
                value={amount} onChange={e => setAmount(e.target.value)} placeholder="100"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-3.5 text-[#0F172A] text-[0.9375rem] focus:border-[#233E58] focus:outline-none"
              />
            </div>
            <p className="text-[0.6875rem] text-[#94A3B8] mt-1">
              Mínimo Bs. {DEPOSIT_MIN_BOB} — Máximo Bs. {DEPOSIT_MAX_BOB.toLocaleString('es-BO')}
            </p>
          </div>
          {error && (
            <p className="text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-4 py-3">{error}</p>
          )}
          <button type="submit" disabled={loading || !amount}
            className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white disabled:opacity-40"
            style={{ background: '#233E58' }}>
            {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Generar instrucciones de pago'}
          </button>
        </form>
      )}

      {/* ── PASO 2: instrucciones + comprobante ── */}
      {view === 'instructions' && (
        <div className="space-y-5">

          {/* Referencia */}
          <div className="bg-[#233E580D] rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
            style={{ border: '1px solid #233E5822' }}>
            <div className="min-w-0">
              <p className="text-[0.6875rem] font-medium text-[#64748B] mb-0.5">Referencia — incluir en el concepto</p>
              <p className="text-[0.875rem] font-mono font-bold text-[#233E58] truncate">{result?.reference}</p>
            </div>
            <button onClick={copyReference}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#233E581A', border: '1px solid #233E5833' }}>
              {copied ? <CheckCheck size={15} className="text-[#22C55E]" /> : <Copy size={15} className="text-[#233E58]" />}
            </button>
          </div>

          {/* Tabs método de pago */}
          <div>
            <div className="flex rounded-xl overflow-hidden mb-4"
              style={{ border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
              {[
                { key: 'transfer', icon: Building2, label: 'Transferencia' },
                { key: 'qr',       icon: QrCode,    label: 'QR Bancario'   },
              ].map(tab => (
                <button key={tab.key} onClick={() => setPayTab(tab.key)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[0.8125rem] font-semibold transition-all"
                  style={payTab === tab.key
                    ? { background: '#233E58', color: '#FFFFFF', borderRadius: '10px' }
                    : { color: '#64748B' }}>
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Transferencia bancaria */}
            {payTab === 'transfer' && (
              <div className="bg-[#F8FAFC] rounded-2xl p-4 space-y-2.5" style={{ border: '1px solid #E2E8F0' }}>
                {[
                  ['Monto a transferir', formatBOB(result?.amount)],
                  ['Banco',              result?.bankName],
                  ['Titular',           result?.accountHolder],
                  ['N° de cuenta',      result?.accountNumber],
                  ['Tipo de cuenta',    result?.accountType],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-[0.75rem] text-[#64748B]">{label}</span>
                    <span className="text-[0.875rem] font-semibold text-[#0F172A] text-right max-w-[55%] break-all">{val}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: QR Bancario */}
            {payTab === 'qr' && (
              <div>
                {qrImages.length > 0 ? (
                  <div className={`w-full ${qrImages.length > 1 ? 'grid grid-cols-2 gap-3' : 'flex justify-center'}`}>
                    {qrImages.map((qr, i) => (
                      <div key={i} className="flex flex-col items-center gap-2 bg-[#F8FAFC] rounded-2xl p-3"
                        style={{ border: '1px solid #E2E8F0' }}>
                        <img
                          src={qr.imageBase64}
                          alt={qr.label ?? `QR ${i + 1}`}
                          className="w-full max-w-[160px] rounded-xl"
                          style={{ border: '2px solid #233E5833' }}
                        />
                        {qr.label && (
                          <span className="text-[0.6875rem] font-semibold text-[#64748B]">{qr.label}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-6 text-center bg-[#F8FAFC] rounded-2xl"
                    style={{ border: '1px solid #E2E8F0' }}>
                    <QrCode size={32} className="text-[#94A3B8]" />
                    <p className="text-[0.8125rem] text-[#64748B]">No hay QRs configurados.</p>
                    <p className="text-[0.75rem] text-[#94A3B8]">Usa transferencia bancaria.</p>
                  </div>
                )}
                <p className="text-[0.6875rem] text-[#94A3B8] mt-2 text-center">
                  Escanea con tu app bancaria e incluye la referencia en el concepto.
                </p>
              </div>
            )}
          </div>

          {/* Subir comprobante */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #E2E8F0' }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <Upload size={14} className="text-[#233E58]" />
              <p className="text-[0.8125rem] font-bold text-[#0F172A]">Subir comprobante</p>
              <span className="ml-auto text-[0.6875rem] font-semibold text-[#F87171]">Requerido</span>
            </div>

            {uploadDone ? (
              <div className="px-4 py-5 flex flex-col items-center gap-2 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#22C55E1A' }}>
                  <CheckCircle2 size={24} className="text-[#22C55E]" />
                </div>
                <p className="text-[0.875rem] font-bold text-[#0F172A]">Comprobante recibido</p>
                <p className="text-[0.75rem] text-[#64748B]">
                  Verificaremos tu depósito en <span className="font-semibold text-[#0F172A]">2–4 horas hábiles</span>.
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {!proofFile ? (
                  <label className="flex flex-col items-center gap-2 py-5 rounded-xl cursor-pointer transition-colors"
                    style={{ border: '1.5px dashed #CBD5E1', background: '#FAFBFD' }}>
                    <Upload size={22} className="text-[#94A3B8]" />
                    <span className="text-[0.8125rem] font-medium text-[#64748B]">Toca para adjuntar</span>
                    <span className="text-[0.6875rem] text-[#94A3B8]">JPG, PNG o PDF — máx. 5 MB</span>
                    <input type="file" accept="image/jpeg,image/png,application/pdf"
                      className="hidden" onChange={handleFileChange} />
                  </label>
                ) : (
                  <div className="flex flex-col gap-2">
                    {proofPreview && (
                      <img src={proofPreview} alt="Vista previa" className="w-full max-h-36 object-contain rounded-xl"
                        style={{ border: '1px solid #E2E8F0' }} />
                    )}
                    <div className="flex items-center gap-2 bg-[#F8FAFC] rounded-xl px-3 py-2.5"
                      style={{ border: '1px solid #E2E8F0' }}>
                      <Upload size={14} className="text-[#233E58] flex-shrink-0" />
                      <span className="text-[0.8125rem] text-[#0F172A] flex-1 truncate">{proofFile.name}</span>
                      <button onClick={() => { setProofFile(null); setProofPreview(null) }}
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: '#EF44441A' }}>
                        <X size={12} className="text-[#F87171]" />
                      </button>
                    </div>
                  </div>
                )}

                {uploadError && (
                  <p className="text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-3 py-2">{uploadError}</p>
                )}

                <button onClick={handleUpload} disabled={!proofFile || uploading}
                  className="w-full py-3 rounded-2xl font-bold text-[0.875rem] text-white disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: '#233E58' }}>
                  {uploading
                    ? <><Loader2 size={16} className="animate-spin" /> Enviando...</>
                    : <><Upload size={16} /> Enviar comprobante</>}
                </button>
              </div>
            )}
          </div>

          {uploadDone && (
            <button onClick={handleClose}
              className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white"
              style={{ background: '#22C55E' }}>
              Cerrar
            </button>
          )}
        </div>
      )}

      {/* ── PASO 2 (bankQr): QR del banco + confirmación automática ── */}
      {view === 'bankqr' && (
        <div className="space-y-5">

          {bankConfirmed ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#22C55E1A' }}>
                <CheckCircle2 size={28} className="text-[#22C55E]" />
              </div>
              <p className="text-[1rem] font-bold text-[#0F172A]">¡Pago confirmado!</p>
              <p className="text-[0.8125rem] text-[#64748B]">
                Se acreditaron <span className="font-bold text-[#0F172A]">{formatBOB(result?.amount)}</span> a tu saldo.
              </p>
              <button onClick={handleClose}
                className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white mt-2"
                style={{ background: '#22C55E' }}>
                Cerrar
              </button>
            </div>
          ) : bankFailed ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#EF44441A' }}>
                <X size={28} className="text-[#F87171]" />
              </div>
              <p className="text-[1rem] font-bold text-[#0F172A]">El QR no se completó</p>
              <p className="text-[0.8125rem] text-[#64748B]">{bankFailed}</p>
              <button onClick={() => { resetAll() }}
                className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white mt-2"
                style={{ background: '#233E58' }}>
                Generar un nuevo QR
              </button>
            </div>
          ) : (
            <>
              {/* QR bancario dinámico */}
              <div className="flex flex-col items-center gap-3">
                <div className="bg-white rounded-2xl p-4" style={{ border: '2px solid #233E5833' }}>
                  <img src={bankQrSrc(result?.paymentQR)} alt="QR bancario"
                    className="w-[200px] h-[200px] object-contain" />
                </div>
                <p className="text-[1.25rem] font-bold text-[#0F172A]">{formatBOB(result?.amount)}</p>
              </div>

              {/* Estado: esperando pago */}
              <div className="flex items-center justify-center gap-2 bg-[#233E580D] rounded-2xl px-4 py-3"
                style={{ border: '1px solid #233E5822' }}>
                <Loader2 size={16} className="animate-spin text-[#233E58]" />
                <p className="text-[0.8125rem] font-semibold text-[#233E58]">Esperando confirmación del pago…</p>
              </div>

              <div className="bg-[#F8FAFC] rounded-2xl p-4 space-y-2" style={{ border: '1px solid #E2E8F0' }}>
                <div className="flex items-start gap-2">
                  <QrCode size={15} className="text-[#64748B] mt-0.5 flex-shrink-0" />
                  <p className="text-[0.75rem] text-[#64748B]">
                    Escanea el QR con tu app bancaria y paga el monto exacto. El saldo se acredita
                    <span className="font-semibold text-[#0F172A]"> automáticamente</span> al confirmarse el pago —
                    no necesitas subir comprobante.
                  </p>
                </div>
                {result?.expiresAt && (
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-[#94A3B8] flex-shrink-0" />
                    <p className="text-[0.6875rem] text-[#94A3B8]">Válido hasta {formatDate(result.expiresAt)}</p>
                  </div>
                )}
              </div>

              <button onClick={handleClose}
                className="w-full py-3 rounded-2xl font-semibold text-[0.875rem]"
                style={{ border: '1.5px solid #E2E8F0', color: '#64748B' }}>
                Pagar más tarde
              </button>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}

// ── Modal Enviar BOB — dos métodos: email o escanear QR ──────────────────────

function SendModal({ open, onClose, onSuccess, balanceAvailable }) {
  const [tab, setTab]           = useState('email')  // 'email' | 'qr'
  const [done, setDone]         = useState(false)
  const [doneInfo, setDoneInfo] = useState({ recipient: '', amount: '' })

  // Email tab
  const [email, setEmail]             = useState('')
  const [amount, setAmount]           = useState('')
  const [description, setDescription] = useState('')
  const [step, setStep]               = useState(1)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  // QR tab
  const [scanning,  setScanning]  = useState(false)
  const [camError,  setCamError]  = useState(null)
  const [preview,   setPreview]   = useState(null)
  const [qrAmount,  setQrAmount]  = useState('')
  const [payError,  setPayError]  = useState(null)
  const [paying,    setPaying]    = useState(false)
  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const streamRef   = useRef(null)
  const rafRef      = useRef(null)
  const fileInputRef = useRef(null)
  // Idempotency-Key: una por intento de pago; se reusa en retry del mismo pago
  const sendKeyRef  = useRef(null)
  const qrKeyRef    = useRef(null)

  const stopCamera = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    setScanning(false)
  }, [])

  useEffect(() => { if (!open) stopCamera() }, [open, stopCamera])
  useEffect(() => { if (tab !== 'qr') stopCamera() }, [tab, stopCamera])

  function resetAll() {
    stopCamera()
    setTab('email'); setDone(false); setDoneInfo({ recipient: '', amount: '' })
    setEmail(''); setAmount(''); setDescription(''); setStep(1); setError('')
    setScanning(false); setCamError(null); setPreview(null)
    setQrAmount(''); setPayError(null); setPaying(false)
  }

  function handleClose() { resetAll(); onClose() }

  // ── Email handlers ────────────────────────────────────────────────────────

  function handleContinue(e) {
    e.preventDefault(); setError('')
    if (!email) return setError('Ingresa el email del destinatario.')
    if (!amount || Number(amount) < 1) return setError('El monto mínimo es Bs. 1.')
    if (Number(amount) > balanceAvailable) return setError(`Saldo insuficiente. Disponible: ${formatBOB(balanceAvailable)}.`)
    setStep(2)
  }

  async function handleConfirm() {
    setLoading(true); setError('')
    if (!sendKeyRef.current) sendKeyRef.current = crypto.randomUUID()
    try {
      await request('/wallet/send', {
        method: 'POST',
        body: JSON.stringify({ recipientEmail: email, amount: Number(amount), description }),
        headers: { 'Idempotency-Key': sendKeyRef.current },
      })
      sendKeyRef.current = null
      setDoneInfo({ recipient: email, amount: formatBOB(Number(amount)) })
      setDone(true); onSuccess?.()
    } catch (err) {
      // Mantener la key: el retry del mismo envío reusa la misma key
      setError(err.message ?? 'Error al procesar el envío.')
    } finally {
      setLoading(false)
    }
  }

  // ── QR handlers ───────────────────────────────────────────────────────────

  async function startCamera() {
    setCamError(null); setPreview(null); setPayError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 }, aspectRatio: { ideal: 1 } },
      })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      setScanning(true)
      scanLoop()
    } catch {
      setCamError('No se pudo acceder a la cámara. Verifica los permisos en tu navegador.')
    }
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setCamError(null); setPayError(null)
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      canvas.width = img.width
      canvas.height = img.height
      canvas.getContext('2d').drawImage(img, 0, 0)
      const imageData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      if (code?.data) { handleQrDetected(code.data) }
      else { setCamError('No se encontró un QR Alyto en la imagen seleccionada.') }
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
  }

  function scanLoop() {
    const tick = () => {
      const video = videoRef.current; const canvas = canvasRef.current
      if (!video || !canvas || !streamRef.current) return
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth; canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0)
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(img.data, img.width, img.height)
        if (code?.data) { stopCamera(); handleQrDetected(code.data); return }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  async function handleQrDetected(raw) {
    try {
      const data = await request(`/wallet/qr/preview?qrContent=${encodeURIComponent(raw)}`)
      setPreview({ ...data, _rawContent: raw })
    } catch (err) {
      setPayError(err.message || 'QR no reconocido como QR Alyto.')
    }
  }

  async function handleQrPay() {
    if (!preview) return
    const payAmt = preview.amount > 0 ? preview.amount : Number(qrAmount)
    if (!payAmt || payAmt < 1) { setPayError('Ingresa un monto válido.'); return }
    if (payAmt > balanceAvailable) { setPayError(`Saldo insuficiente. Disponible: ${formatBOB(balanceAvailable)}.`); return }
    setPaying(true); setPayError(null)
    if (!qrKeyRef.current) qrKeyRef.current = crypto.randomUUID()
    try {
      const body = { qrContent: preview._rawContent }
      if (!(preview.amount > 0)) body.amount = Number(qrAmount)
      await request('/wallet/qr/scan', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Idempotency-Key': qrKeyRef.current },
      })
      qrKeyRef.current = null
      setDoneInfo({ recipient: preview.recipientName || preview.recipientEmail || 'Destinatario', amount: formatBOB(payAmt) })
      setDone(true); onSuccess?.()
    } catch (err) {
      // Mantener la key: el retry del mismo pago reusa la misma key
      setPayError(err.message || 'Error al procesar el pago.')
    } finally {
      setPaying(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Enviar BOB">

      {/* ── Pantalla de éxito (ambos tabs) ── */}
      {done ? (
        <div className="text-center py-4 space-y-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: '#22C55E1A' }}>
            <CheckCircle2 size={32} className="text-[#22C55E]" />
          </div>
          <div>
            <p className="text-[#0F172A] font-bold text-[1rem]">Envío completado</p>
            <p className="text-[#64748B] text-[0.875rem] mt-1">{doneInfo.amount} enviados a {doneInfo.recipient}</p>
          </div>
          <button onClick={handleClose} className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white" style={{ background: '#233E58' }}>Cerrar</button>
        </div>
      ) : (
        <>
          {/* ── Tabs ── */}
          <div className="flex rounded-xl overflow-hidden border border-[#E2E8F0] mb-5">
            <button
              onClick={() => setTab('email')}
              className={`flex-1 py-2.5 text-[0.875rem] font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                tab === 'email' ? 'bg-[#233E58] text-white' : 'text-[#64748B] hover:bg-[#F8FAFC]'
              }`}
            >
              <Mail size={14} /> Por email
            </button>
            <button
              onClick={() => setTab('qr')}
              className={`flex-1 py-2.5 text-[0.875rem] font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                tab === 'qr' ? 'bg-[#233E58] text-white' : 'text-[#64748B] hover:bg-[#F8FAFC]'
              }`}
            >
              <QrCode size={14} /> Escanear QR
            </button>
          </div>

          {/* ── Tab email ── */}
          {tab === 'email' && (
            step === 1 ? (
              <form onSubmit={handleContinue} className="space-y-4">
                <div>
                  <label className="block text-[0.75rem] font-medium text-[#64748B] mb-1.5">Email del destinatario</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@email.com"
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3.5 text-[#0F172A] text-[0.9375rem] focus:border-[#233E58] focus:outline-none" />
                  <p className="text-[0.6875rem] text-[#94A3B8] mt-1">Solo usuarios Bolivia (SRL) registrados en Alyto.</p>
                </div>
                <div>
                  <label className="block text-[0.75rem] font-medium text-[#64748B] mb-1.5">Monto (BOB)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] font-semibold text-sm">Bs.</span>
                    <input type="number" min={1} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                      className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-3.5 text-[#0F172A] text-[0.9375rem] focus:border-[#233E58] focus:outline-none" />
                  </div>
                  <p className="text-[0.6875rem] text-[#94A3B8] mt-1">Disponible: {formatBOB(balanceAvailable)}</p>
                </div>
                <div>
                  <label className="block text-[0.75rem] font-medium text-[#64748B] mb-1.5">Descripción (opcional)</label>
                  <input type="text" value={description} onChange={e => setDescription(e.target.value)} maxLength={100}
                    placeholder="Ej. Pago alquiler"
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3.5 text-[#0F172A] text-[0.9375rem] focus:border-[#233E58] focus:outline-none" />
                </div>
                {error && <p className="text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-4 py-3">{error}</p>}
                <button type="submit" className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white" style={{ background: '#233E58' }}>Continuar</button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0] space-y-3">
                  <div className="flex justify-between"><span className="text-[0.75rem] text-[#64748B]">Para</span><span className="text-[0.875rem] font-semibold text-[#0F172A]">{email}</span></div>
                  <div className="flex justify-between"><span className="text-[0.75rem] text-[#64748B]">Monto</span><span className="text-[0.875rem] font-bold text-[#233E58]">{formatBOB(Number(amount))}</span></div>
                  {description && <div className="flex justify-between"><span className="text-[0.75rem] text-[#64748B]">Descripción</span><span className="text-[0.875rem] text-[#0F172A]">{description}</span></div>}
                </div>
                {error && <p className="text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-4 py-3">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-2xl font-semibold text-[0.9375rem] text-[#64748B]" style={{ border: '1.5px solid #E2E8F0' }}>Volver</button>
                  <button onClick={handleConfirm} disabled={loading} className="flex-1 py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white disabled:opacity-40" style={{ background: '#233E58' }}>
                    {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Confirmar envío'}
                  </button>
                </div>
              </div>
            )
          )}

          {/* ── Tab QR ── */}
          {tab === 'qr' && (
            <div className="space-y-4">
              <canvas ref={canvasRef} className="hidden" />

              {!preview ? (
                <>
                  {/* Área de cámara */}
                  <div className="relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '1', maxHeight: '260px' }}>
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                    {scanning && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-44 h-44 relative">
                          <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-white rounded-tl-lg" />
                          <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-white rounded-tr-lg" />
                          <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-white rounded-bl-lg" />
                          <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-white rounded-br-lg" />
                        </div>
                      </div>
                    )}
                    {!scanning && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <QrCode size={44} className="text-white/40" />
                        <p className="text-white/60 text-[0.875rem]">Cámara inactiva</p>
                      </div>
                    )}
                  </div>

                  {camError && <p className="text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-4 py-3">{camError}</p>}
                  {payError && <p className="text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-4 py-3">{payError}</p>}

                  <div className="flex gap-3">
                    {!scanning ? (
                      <button
                        onClick={startCamera}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white"
                        style={{ background: '#233E58' }}
                      >
                        <Camera size={18} /> Activar cámara
                      </button>
                    ) : (
                      <button
                        onClick={stopCamera}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-[0.9375rem] text-[#64748B]"
                        style={{ border: '1.5px solid #E2E8F0' }}
                      >
                        <CameraOff size={18} /> Detener cámara
                      </button>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-[0.9375rem] text-[#233E58]"
                      style={{ border: '1.5px solid #233E58' }}
                    >
                      <Upload size={18} /> Galería
                    </button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

                  <p className="text-center text-[0.6875rem] text-[#94A3B8]">
                    Escanea el QR de otro usuario Alyto para enviarle BOB al instante
                  </p>
                </>
              ) : (
                /* Preview post-scan */
                <div className="space-y-4">
                  <div className="bg-[#F0FDF4] border border-[#22C55E33] rounded-2xl px-4 py-3 flex items-center gap-2 mb-1">
                    <CheckCircle2 size={16} className="text-[#22C55E] flex-shrink-0" />
                    <p className="text-[0.8125rem] font-semibold text-[#22C55E]">QR Alyto detectado</p>
                  </div>

                  <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0] space-y-3">
                    {preview.recipientName && (
                      <div className="flex justify-between">
                        <span className="text-[0.75rem] text-[#64748B]">Destinatario</span>
                        <span className="text-[0.875rem] font-semibold text-[#0F172A]">{preview.recipientName}</span>
                      </div>
                    )}
                    {preview.recipientEmail && (
                      <div className="flex justify-between">
                        <span className="text-[0.75rem] text-[#64748B]">Email</span>
                        <span className="text-[0.8125rem] text-[#0F172A]">{preview.recipientEmail}</span>
                      </div>
                    )}
                    {preview.amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-[0.75rem] text-[#64748B]">Monto solicitado</span>
                        <span className="text-[0.875rem] font-bold text-[#233E58]">{formatBOB(preview.amount)}</span>
                      </div>
                    )}
                    {preview.description && (
                      <div className="flex justify-between">
                        <span className="text-[0.75rem] text-[#64748B]">Concepto</span>
                        <span className="text-[0.875rem] text-[#0F172A]">{preview.description}</span>
                      </div>
                    )}
                  </div>

                  {/* Monto libre si el QR es de tipo depósito sin monto fijo */}
                  {!(preview.amount > 0) && (
                    <div>
                      <label className="block text-[0.75rem] font-medium text-[#64748B] mb-1.5">Monto a enviar (BOB)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] font-semibold text-sm">Bs.</span>
                        <input
                          type="number" min={1} value={qrAmount}
                          onChange={e => setQrAmount(e.target.value)} placeholder="0"
                          className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-3.5 text-[#0F172A] text-[0.9375rem] focus:border-[#233E58] focus:outline-none"
                        />
                      </div>
                      <p className="text-[0.6875rem] text-[#94A3B8] mt-1">Disponible: {formatBOB(balanceAvailable)}</p>
                    </div>
                  )}

                  {payError && <p className="text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-4 py-3">{payError}</p>}

                  <div className="flex gap-3">
                    <button
                      onClick={() => { setPreview(null); setPayError(null); setQrAmount('') }}
                      className="flex-1 py-3.5 rounded-2xl font-semibold text-[0.9375rem] text-[#64748B]"
                      style={{ border: '1.5px solid #E2E8F0' }}
                    >
                      Escanear otro
                    </button>
                    <button
                      onClick={handleQrPay}
                      disabled={paying}
                      className="flex-1 py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white disabled:opacity-40"
                      style={{ background: '#233E58' }}
                    >
                      {paying ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Confirmar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Modal>
  )
}

// ── Modal Retirar BOB ─────────────────────────────────────────────────────────

function WithdrawModal({ open, onClose, onSuccess, balanceAvailable }) {
  const fileInputRef = useRef(null)
  const [method, setMethod] = useState('bank')   // 'bank' | 'qr'
  const [form, setForm] = useState({
    amount: '', bankName: '', accountNumber: '', accountHolder: '', accountType: 'Caja de ahorros',
  })
  const [qrFile, setQrFile]       = useState(null)
  const [qrPreview, setQrPreview] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [done, setDone]           = useState(false)

  function handleClose() {
    setMethod('bank')
    setForm({ amount: '', bankName: '', accountNumber: '', accountHolder: '', accountType: 'Caja de ahorros' })
    setQrFile(null); setQrPreview(null)
    setError(''); setDone(false); onClose()
  }
  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function handleQrFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('La imagen del QR no puede superar 5 MB.'); return }
    setQrFile(file)
    setError('')
    const reader = new FileReader()
    reader.onload = ev => setQrPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    const n = Number(form.amount)
    if (n < 100) return setError('El monto mínimo de retiro es Bs. 100.')
    if (n > balanceAvailable) return setError(`Saldo insuficiente. Disponible: ${formatBOB(balanceAvailable)}.`)
    if (method === 'bank') {
      if (!form.bankName || !form.accountNumber || !form.accountHolder) return setError('Completa todos los datos bancarios.')
    } else if (!qrFile) {
      return setError('Adjunta el QR de tu cuenta bancaria.')
    }
    setLoading(true)
    try {
      if (method === 'qr') {
        const fd = new FormData()
        fd.append('method', 'qr')
        fd.append('amount', n)
        fd.append('bankQrImage', qrFile)
        await requestFormData('/wallet/withdraw/request', fd)
      } else {
        await request('/wallet/withdraw/request', {
          method: 'POST',
          body: JSON.stringify({ ...form, amount: n, method: 'bank' }),
        })
      }
      setDone(true); onSuccess?.()
    } catch (err) {
      setError(err.message ?? 'Error al solicitar el retiro.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Solicitar retiro">
      {done ? (
        <div className="text-center py-4 space-y-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: '#22C55E1A' }}>
            <CheckCircle2 size={32} className="text-[#22C55E]" />
          </div>
          <div>
            <p className="text-[#0F172A] font-bold text-[1rem]">Solicitud enviada</p>
            <p className="text-[#64748B] text-[0.875rem] mt-1">Procesaremos tu retiro en <span className="text-[#0F172A]">1-2 días hábiles</span>. Verás el comprobante en tus movimientos al completarse.</p>
          </div>
          <button onClick={handleClose} className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white" style={{ background: '#233E58' }}>Cerrar</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[0.75rem] font-medium text-[#64748B] mb-1.5">Monto a retirar (BOB)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] font-semibold text-sm">Bs.</span>
              <input type="number" min={100} value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="100"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-3.5 text-[#0F172A] text-[0.9375rem] focus:border-[#233E58] focus:outline-none" />
            </div>
            <p className="text-[0.6875rem] text-[#94A3B8] mt-1">Mínimo Bs. 100. Disponible: {formatBOB(balanceAvailable)}</p>
          </div>

          {/* Tabs método de retiro — mismas dos pestañas que la carga */}
          <div className="flex rounded-xl overflow-hidden"
            style={{ border: '1px solid #E2E8F0', background: '#F8FAFC' }}>
            {[
              { key: 'bank', icon: Building2, label: 'Cuenta bancaria' },
              { key: 'qr',   icon: QrCode,    label: 'QR' },
            ].map(t => (
              <button type="button" key={t.key} onClick={() => { setMethod(t.key); setError('') }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[0.8125rem] font-semibold transition-all"
                style={method === t.key
                  ? { background: '#233E58', color: '#FFFFFF', borderRadius: '10px' }
                  : { color: '#64748B' }}>
                <t.icon size={14} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab: Cuenta bancaria */}
          {method === 'bank' && (
            <div className="space-y-3 bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0]">
              <p className="text-[0.75rem] font-semibold text-[#64748B] uppercase tracking-wider">Datos bancarios de destino</p>
              {[
                { key: 'bankName',       label: 'Banco',                placeholder: 'Ej. Banco Económico' },
                { key: 'accountHolder',  label: 'Titular de la cuenta', placeholder: 'Nombre completo' },
                { key: 'accountNumber',  label: 'Número de cuenta',     placeholder: '0000000000' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[0.6875rem] font-medium text-[#64748B] mb-1">{f.label}</label>
                  <input type="text" value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder}
                    className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0F172A] text-[0.875rem] focus:border-[#233E58] focus:outline-none" />
                </div>
              ))}
              <div>
                <label className="block text-[0.6875rem] font-medium text-[#64748B] mb-1">Tipo de cuenta</label>
                <select value={form.accountType} onChange={e => set('accountType', e.target.value)}
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0F172A] text-[0.875rem] focus:border-[#233E58] focus:outline-none">
                  <option>Caja de ahorros</option>
                  <option>Cuenta corriente</option>
                </select>
              </div>
            </div>
          )}

          {/* Tab: QR */}
          {method === 'qr' && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px dashed #CBD5E1' }}>
              <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: '#F8FAFC', borderBottom: qrFile ? '1px solid #E2E8F0' : 'none' }}>
                <QrCode size={14} className="text-[#94A3B8]" />
                <p className="text-[0.8125rem] font-medium text-[#64748B]">QR de tu cuenta</p>
              </div>
              {!qrFile ? (
                <label className="flex flex-col items-center gap-1.5 py-5 cursor-pointer hover:bg-[#F8FAFC] transition-colors">
                  <Upload size={20} className="text-[#CBD5E1]" />
                  <span className="text-[0.75rem] text-[#94A3B8]">Adjunta el QR de tu cuenta bancaria</span>
                  <span className="text-[0.6875rem] text-[#CBD5E1] text-center px-4">Lo escaneamos para transferirte directamente. El QR ya contiene tu cuenta destino.</span>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleQrFileChange} />
                </label>
              ) : (
                <div className="p-3 flex items-center gap-3">
                  {qrPreview && (
                    <img src={qrPreview} alt="QR bancario" className="w-16 h-16 rounded-xl object-contain flex-shrink-0"
                      style={{ border: '1px solid #E2E8F0' }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.8125rem] font-medium text-[#0F172A] truncate">{qrFile.name}</p>
                    <p className="text-[0.6875rem] text-[#22C55E]">QR adjunto</p>
                  </div>
                  <button type="button" onClick={() => { setQrFile(null); setQrPreview(null) }}
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: '#EF44441A' }}>
                    <X size={13} className="text-[#F87171]" />
                  </button>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-4 py-3">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white disabled:opacity-40" style={{ background: '#233E58' }}>
            {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Solicitar retiro'}
          </button>
        </form>
      )}
    </Modal>
  )
}

// ── Modal Depósito USDC (instrucciones Stellar) ────────────────────────────────

function USDCDepositModal({ open, onClose, instructions }) {
  const [copiedField, setCopiedField] = useState(null)

  function copy(field, text) {
    navigator.clipboard.writeText(text ?? '')
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const CopyBtn = ({ field, text }) => (
    <button onClick={() => copy(field, text)}
      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ background: '#233E581A', border: '1px solid #233E5833' }}>
      {copiedField === field
        ? <CheckCheck size={13} className="text-[#22C55E]" />
        : <Copy size={13} className="text-[#233E58]" />
      }
    </button>
  )

  // ── Contrato nuevo (Camino A: dirección custodial propia, sin memo) ─────────
  // Decidimos SOLO por el flag memoRequired. El default del nuevo modelo es
  // "sin memo": solo mostramos memo si el backend lo exige explícitamente
  // (memoRequired === true). Si el flag está ausente o es false → no hay memo.
  //   - ready ausente → asumir true (no bloquear el flujo)
  const memoRequired = instructions?.memoRequired === true
  const isReady      = instructions ? instructions.ready !== false : true
  const warningText  = instructions?.warning
    ?? (memoRequired
      ? 'Debes incluir el memo exacto en tu transferencia Stellar. Sin memo tu depósito no podrá ser acreditado.'
      : 'Envía USDC (red Stellar) únicamente a tu dirección. No necesitas memo.')
  const steps = Array.isArray(instructions?.instructions) ? instructions.instructions : []

  return (
    <Modal open={open} onClose={onClose} title="Depositar USDC vía Stellar">
      {!instructions ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-[#233E58]" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Aviso: cuenta preparándose (trustline USDC estableciéndose) */}
          {!isReady && (
            <div className="rounded-2xl px-4 py-3 flex items-start gap-3"
              style={{ background: '#F59E0B1A', border: '1px solid #F59E0B33' }}>
              <Loader2 size={16} className="text-[#F59E0B] mt-0.5 flex-shrink-0 animate-spin" />
              <p className="text-[0.75rem] text-[#92400E] leading-relaxed">
                <span className="font-bold">Preparando tu cuenta:</span> estamos habilitando tu dirección para recibir USDC (estableciendo la trustline). Espera unos minutos y reintenta antes de depositar.
              </p>
            </div>
          )}

          {/* Aviso principal: con memo (legacy) o sin memo (Camino A) */}
          {memoRequired ? (
            <div className="rounded-2xl px-4 py-3 flex items-start gap-3"
              style={{ background: '#F59E0B1A', border: '1px solid #F59E0B33' }}>
              <AlertCircle size={16} className="text-[#F59E0B] mt-0.5 flex-shrink-0" />
              <p className="text-[0.75rem] text-[#92400E] leading-relaxed">
                <span className="font-bold">IMPORTANTE:</span> {warningText}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl px-4 py-3 flex items-start gap-3"
              style={{ background: '#233E581A', border: '1px solid #233E5833' }}>
              <Info size={16} className="text-[#233E58] mt-0.5 flex-shrink-0" />
              <p className="text-[0.75rem] text-[#334155] leading-relaxed">{warningText}</p>
            </div>
          )}

          {/* Datos Stellar */}
          <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0] space-y-3">
            <div>
              <p className="text-[0.6875rem] font-medium text-[#64748B] mb-1">Red</p>
              <p className="text-[0.875rem] font-semibold text-[#0F172A] capitalize">{instructions.network ?? 'testnet'}</p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-medium text-[#64748B] mb-1">Asset</p>
              <p className="text-[0.875rem] font-semibold text-[#0F172A]">USDC (USD Coin)</p>
            </div>
            <div>
              <p className="text-[0.6875rem] font-medium text-[#64748B] mb-1">Tu dirección de depósito</p>
              <div className="flex items-center gap-2">
                <span className="flex-1 text-[0.75rem] font-mono text-[#0F172A] break-all">{instructions.stellarAddress}</span>
                <CopyBtn field="address" text={instructions.stellarAddress} />
              </div>
            </div>
            {/* Memo: solo si el contrato lo exige (compat legacy) */}
            {memoRequired && instructions.stellarMemo && (
              <div className="pt-2 border-t border-[#E2E8F0]">
                <p className="text-[0.6875rem] font-bold text-[#F59E0B] mb-1 uppercase tracking-wider">Memo obligatorio</p>
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-[0.9375rem] font-mono font-bold text-[#233E58]">{instructions.stellarMemo}</span>
                  <CopyBtn field="memo" text={instructions.stellarMemo} />
                </div>
              </div>
            )}
          </div>

          {/* Pasos (desde el backend, si los provee) */}
          {steps.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] space-y-2">
              <p className="text-[0.6875rem] font-medium text-[#64748B] uppercase tracking-wider">Cómo depositar</p>
              <ol className="space-y-1.5">
                {steps.map((step, i) => (
                  <li key={i} className="text-[0.8125rem] text-[#334155] leading-relaxed flex gap-2">
                    <span className="font-semibold text-[#233E58] flex-shrink-0">{i + 1}.</span>
                    <span>{String(step).replace(/^\s*\d+[.)]\s*/, '')}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <p className="text-[0.75rem] text-[#64748B] text-center">
            El equipo Alyto acreditará tu saldo en <span className="text-[#0F172A] font-semibold">1-2 horas hábiles</span>.
          </p>
          <button onClick={onClose} className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white" style={{ background: '#233E58' }}>
            Entendido
          </button>
        </div>
      )}
    </Modal>
  )
}

// ── Modal Swap BOB ⇄ USDC (conversión bidireccional unificada) ──────────────────

const SWAP_MIN_BOB  = 50
const SWAP_MIN_USDC = 5

function ConvertModal({ open, onClose, onSuccess, bobBalance, usdcBalance, buyRate, sellRate, marketRate, initialDirection = 'bob_to_usdc' }) {
  const [direction, setDirection] = useState(initialDirection) // 'bob_to_usdc' | 'usdc_to_bob'
  const [amount, setAmount]   = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')

  // Al abrir, preseleccionar la dirección según la card desde donde se invocó.
  useEffect(() => {
    if (open) { setDirection(initialDirection); setAmount(''); setResult(null); setError('') }
  }, [open, initialDirection])

  const isBuy      = direction === 'bob_to_usdc'
  const rate       = isBuy ? buyRate : sellRate           // bobPerUsdc (compra o venta)
  const min        = isBuy ? SWAP_MIN_BOB : SWAP_MIN_USDC
  const srcBalance = isBuy ? bobBalance : usdcBalance
  const srcLabel   = isBuy ? 'BOB' : 'USDC'
  const dstLabel   = isBuy ? 'USDC' : 'BOB'
  const fmtSrc     = isBuy ? formatBOB : formatUSDC
  const fmtDst     = isBuy ? formatUSDC : formatBOB

  const n      = Number(amount)
  const estOut = (rate && n) ? (isBuy ? n / rate : n * rate) : null

  // Spread por dirección (vs. tasa de mercado) + comisión estimada para este monto.
  // Compra (BOB→USDC): perdés USDC vs. mercado. Venta (USDC→BOB): perdés BOB vs. mercado.
  const spreadPct = (rate && marketRate)
    ? (isBuy ? (rate / marketRate - 1) : (1 - rate / marketRate)) * 100
    : null
  const feeEst = (rate && marketRate && n)
    ? (isBuy ? (n / marketRate - n / rate)        // comisión en USDC
             : (n * marketRate - n * rate))       // comisión en BOB
    : null
  const fmtFee = (v) => isBuy ? `${v.toFixed(4)} USDC` : formatBOB(v)

  function handleClose() { setAmount(''); setResult(null); setError(''); setDirection(initialDirection); onClose() }
  function switchDir(d)  { if (d === direction) return; setDirection(d); setAmount(''); setError(''); setResult(null) }

  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    if (!n || n < min)   return setError(`El monto mínimo es ${isBuy ? `Bs. ${SWAP_MIN_BOB}` : `${SWAP_MIN_USDC} USDC`}.`)
    if (n > srcBalance)  return setError(`Saldo ${srcLabel} insuficiente. Disponible: ${fmtSrc(srcBalance)}.`)
    setLoading(true)
    try {
      const endpoint = isBuy ? '/wallet/usdc/convert-bob' : '/wallet/usdc/convert-to-bob'
      const data = await request(endpoint, { method: 'POST', body: JSON.stringify({ amount: n }) })
      setResult({ ...data, direction })
      onSuccess?.()
    } catch (err) {
      setError(err.message ?? 'Error al solicitar la conversión.')
    } finally {
      setLoading(false)
    }
  }

  // ── Pantalla de resultado ──
  if (result) {
    const completed = result.status === 'completed'   // auto-conversión instantánea
    const rBuy      = result.direction === 'bob_to_usdc'
    const debit     = rBuy ? formatBOB(result.bobAmount)  : formatUSDC(result.usdcAmount)
    const credit    = rBuy ? formatUSDC(result.usdcAmount) : formatBOB(result.bobAmount)
    // Spread aplicado + comisión de esta conversión (vs. tasa de mercado)
    const rSpreadPct = (result.bobPerUsdc && marketRate)
      ? (rBuy ? (result.bobPerUsdc / marketRate - 1) : (1 - result.bobPerUsdc / marketRate)) * 100
      : null
    const rFee = (result.bobPerUsdc && marketRate)
      ? (rBuy ? (result.bobAmount / marketRate - result.usdcAmount)
              : (result.usdcAmount * marketRate - result.bobAmount))
      : null
    return (
      <Modal open={open} onClose={handleClose} title="Convertir">
        <div className="space-y-4">
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: completed ? '#22C55E1A' : '#233E580D' }}>
              {completed
                ? <CheckCircle2 size={28} className="text-[#22C55E]" />
                : <ArrowRightLeft size={28} className="text-[#233E58]" />}
            </div>
            <p className="text-[#0F172A] font-bold text-[1rem]">{completed ? 'Conversión completada' : 'Solicitud enviada'}</p>
          </div>
          <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0] space-y-3">
            <div className="flex justify-between">
              <span className="text-[0.75rem] text-[#64748B]">Débito {rBuy ? 'BOB' : 'USDC'}</span>
              <span className="text-[0.875rem] font-bold text-[#F87171]">- {debit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[0.75rem] text-[#64748B]">{completed ? 'Acreditado' : 'Recibirás'} {rBuy ? 'USDC' : 'BOB'}</span>
              <span className="text-[0.875rem] font-bold text-[#22C55E]">≈ {credit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[0.75rem] text-[#64748B]">Tipo de cambio</span>
              <span className="text-[0.875rem] text-[#0F172A]">{result.bobPerUsdc?.toFixed(2)} BOB = 1 USDC</span>
            </div>
            {rSpreadPct != null && (
              <div className="flex justify-between pt-2 border-t border-[#E2E8F0]">
                <span className="text-[0.75rem] text-[#64748B]">Spread incluido ({rSpreadPct.toFixed(2)}%)</span>
                <span className="text-[0.875rem] text-[#94A3B8]">
                  ≈ {rBuy ? `${rFee.toFixed(4)} USDC` : formatBOB(rFee)}
                </span>
              </div>
            )}
          </div>
          <p className="text-[0.75rem] text-[#64748B] text-center">
            {completed
              ? <>Los fondos ya están en tu saldo <span className="text-[#0F172A] font-semibold">{rBuy ? 'USDC' : 'BOB'}</span>.</>
              : <>El equipo Alyto confirmará la conversión en <span className="text-[#0F172A] font-semibold">1-4 horas hábiles</span>.</>}
          </p>
          <button onClick={handleClose} className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white" style={{ background: '#233E58' }}>Cerrar</button>
        </div>
      </Modal>
    )
  }

  // ── Formulario ──
  return (
    <Modal open={open} onClose={handleClose} title="Convertir">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Toggle de dirección */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl" style={{ background: '#F1F5F9' }}>
          {[
            { id: 'bob_to_usdc', label: 'BOB → USDC' },
            { id: 'usdc_to_bob', label: 'USDC → BOB' },
          ].map(opt => (
            <button key={opt.id} type="button" onClick={() => switchDir(opt.id)}
              className="py-2.5 rounded-xl text-[0.8125rem] font-bold transition-colors"
              style={direction === opt.id
                ? { background: '#233E58', color: '#fff' }
                : { background: 'transparent', color: '#64748B' }}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Saldo disponible de la moneda origen */}
        <div className="rounded-2xl px-4 py-3 flex items-center justify-between"
          style={{ background: '#233E580D', border: '1px solid #233E5820' }}>
          <span className="text-[0.75rem] text-[#64748B]">Saldo disponible en {srcLabel}</span>
          <span className="text-[1rem] font-bold text-[#233E58]">{fmtSrc(srcBalance)}</span>
        </div>

        {/* Tipo de cambio + estimación */}
        <div className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ background: '#22C55E0D', border: '1px solid #22C55E22' }}>
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={13} className="text-[#22C55E]" />
            <span className="text-[0.8125rem] font-semibold text-[#22C55E]">
              {rate ? `1 USDC = Bs. ${rate.toFixed(2)}` : 'Cargando tasa...'}
            </span>
          </div>
          {estOut != null && n >= min && (
            <span className="text-[0.8125rem] font-bold text-[#22C55E]">
              ≈ {isBuy ? `${estOut.toFixed(4)} USDC` : formatBOB(estOut)}
            </span>
          )}
        </div>

        {/* Spread / comisión de la conversión */}
        {spreadPct != null && (
          <div className="flex items-center justify-between rounded-xl px-4 py-2.5"
            style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <span className="text-[0.75rem] text-[#64748B]">
              Spread incluido <span className="font-semibold text-[#0F172A]">{spreadPct.toFixed(2)}%</span>
            </span>
            {feeEst != null && n >= min && (
              <span className="text-[0.75rem] font-semibold text-[#94A3B8]">≈ {fmtFee(feeEst)}</span>
            )}
          </div>
        )}

        <div>
          <label className="block text-[0.75rem] font-medium text-[#64748B] mb-1.5">¿Cuánto {srcLabel} quieres convertir?</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] font-semibold text-sm">{isBuy ? 'Bs.' : 'USDC'}</span>
            <input type="number" min={min} step="any" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder={isBuy ? '100' : '10'}
              className={`w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl ${isBuy ? 'pl-10' : 'pl-16'} pr-4 py-3.5 text-[#0F172A] text-[0.9375rem] focus:border-[#233E58] focus:outline-none`} />
          </div>
          <p className="text-[0.6875rem] text-[#94A3B8] mt-1.5">Recibirás {dstLabel} al tipo de cambio Alyto vigente. Mínimo {isBuy ? `Bs. ${SWAP_MIN_BOB}` : `${SWAP_MIN_USDC} USDC`}.</p>
        </div>

        {error && <p className="text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-4 py-3">{error}</p>}
        <button type="submit" disabled={loading || !amount}
          className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white disabled:opacity-40"
          style={{ background: '#233E58' }}>
          {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : `Convertir ${srcLabel} → ${dstLabel}`}
        </button>
      </form>
    </Modal>
  )
}

// ── Tab de transacciones compartido ──────────────────────────────────────────

function txLabel(tx) {
  const alias = tx.metadata?.recipientAlias || tx.metadata?.senderAlias
  const map = {
    deposit:      'Depósito BOB',
    withdrawal:   'Retiro BOB',
    send:         tx.metadata?.recipientAlias ? `Para @${tx.metadata.recipientAlias}` : 'Envío BOB',
    receive:      tx.metadata?.senderAlias    ? `De @${tx.metadata.senderAlias}`       : 'BOB recibido',
    freeze:       'Congelamiento',
    unfreeze:     'Descongelamiento',
    fee:          'Comisión',
    bob_to_usdc:  'Conversión BOB → USDC',
    usdc_to_bob:  'Conversión USDC → BOB',
    usdc_deposit: 'Depósito USDC',
    p2p_send:     tx.metadata?.recipientAlias ? `Para @${tx.metadata.recipientAlias}` : 'Envío USDC',
    p2p_receive:  tx.metadata?.senderAlias    ? `De @${tx.metadata.senderAlias}`       : 'USDC recibido',
  }
  return tx.description || map[tx.type] || tx.type
}

// ── Modal Detalle de movimiento (incluye comprobante de retiro) ───────────────

function TxDetailModal({ tx, open, onClose, currency }) {
  const [proof, setProof]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!open) { setProof(null); setError(''); setLoading(false) }
  }, [open])

  if (!tx) return null

  const m       = tx.metadata ?? {}
  const isWithdrawal = tx.type === 'withdrawal'
  const hasProof = tx.hasComprobante || m.withdrawalProof?.present

  async function loadProof() {
    setLoading(true); setError('')
    try {
      const data = await request(`/wallet/transactions/${encodeURIComponent(tx.wtxId)}/comprobante`)
      setProof(data)
    } catch (err) {
      setError(err.message ?? 'No se pudo cargar el comprobante.')
    } finally {
      setLoading(false)
    }
  }

  const isPdf = proof?.mimeType === 'application/pdf'
  const src   = proof ? `data:${proof.mimeType};base64,${proof.base64}` : ''

  return (
    <Modal open={open} onClose={onClose} title="Detalle del movimiento">
      <div className="space-y-4">
        <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0] space-y-2.5">
          <div className="flex justify-between"><span className="text-[0.75rem] text-[#94A3B8]">Tipo</span>
            <span className="text-[0.875rem] font-semibold text-[#0F172A]">{txLabel(tx)}</span></div>
          <div className="flex justify-between"><span className="text-[0.75rem] text-[#94A3B8]">Monto</span>
            <span className="text-[0.875rem] font-bold text-[#0F172A]">{currency === 'USDC' ? formatUSDC(tx.amount) : formatBOB(tx.amount)}</span></div>
          <div className="flex justify-between items-center"><span className="text-[0.75rem] text-[#94A3B8]">Estado</span>
            <TxStatusBadge status={tx.status} /></div>
          <div className="flex justify-between"><span className="text-[0.75rem] text-[#94A3B8]">Fecha</span>
            <span className="text-[0.8125rem] text-[#0F172A]">{formatDate(tx.createdAt)}</span></div>
          {tx.reference && (
            <div className="flex justify-between gap-3"><span className="text-[0.75rem] text-[#94A3B8] flex-shrink-0">Referencia</span>
              <span className="text-[0.75rem] font-mono text-[#0F172A] truncate">{tx.reference}</span></div>
          )}
        </div>

        {/* Cuenta destino del retiro */}
        {isWithdrawal && (m.bankName || m.accountNumber) && (
          <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0] space-y-1.5">
            <p className="text-[0.6875rem] font-semibold text-[#64748B] uppercase tracking-wider mb-1">Cuenta de destino</p>
            {m.bankName      && <div className="flex justify-between"><span className="text-[0.75rem] text-[#94A3B8]">Banco</span><span className="text-[0.8125rem] text-[#0F172A]">{m.bankName}</span></div>}
            {m.accountHolder && <div className="flex justify-between"><span className="text-[0.75rem] text-[#94A3B8]">Titular</span><span className="text-[0.8125rem] text-[#0F172A]">{m.accountHolder}</span></div>}
            {m.accountNumber && <div className="flex justify-between"><span className="text-[0.75rem] text-[#94A3B8]">N° cuenta</span><span className="text-[0.8125rem] font-mono text-[#0F172A]">{m.accountNumber}</span></div>}
            {m.accountType   && <div className="flex justify-between"><span className="text-[0.75rem] text-[#94A3B8]">Tipo</span><span className="text-[0.8125rem] text-[#0F172A]">{m.accountType}</span></div>}
            {m.method === 'qr' && !m.bankName && <p className="text-[0.75rem] text-[#94A3B8]">Retiro solicitado vía QR bancario.</p>}
          </div>
        )}

        {/* Comprobante de la transferencia (subido por Alyto al completar) */}
        {isWithdrawal && (
          <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-2 bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <FileText size={15} className="text-[#64748B]" />
              <p className="text-[0.8125rem] font-bold text-[#0F172A]">Comprobante de transferencia</p>
            </div>
            <div className="p-4">
              {!hasProof ? (
                <p className="text-[0.8125rem] text-[#94A3B8]">
                  {tx.status === 'completed'
                    ? 'Este retiro se completó sin comprobante adjunto.'
                    : 'El comprobante estará disponible cuando se procese tu retiro.'}
                </p>
              ) : !proof ? (
                <button onClick={loadProof} disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold text-[0.875rem] text-white flex items-center justify-center gap-2 disabled:opacity-40"
                  style={{ background: '#233E58' }}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <><Eye size={16} /> Ver comprobante</>}
                </button>
              ) : isPdf ? (
                <a href={src} download={proof.filename ?? 'comprobante.pdf'} target="_blank" rel="noreferrer"
                  className="w-full py-3 rounded-xl font-semibold text-[0.875rem] text-white flex items-center justify-center gap-2"
                  style={{ background: '#233E58' }}>
                  <Download size={16} /> Descargar {proof.filename ?? 'comprobante.pdf'}
                </a>
              ) : (
                <div className="space-y-3">
                  <img src={src} alt="Comprobante" className="w-full rounded-xl" style={{ border: '1px solid #E2E8F0' }} />
                  <a href={src} download={proof.filename ?? 'comprobante.png'} target="_blank" rel="noreferrer"
                    className="w-full py-2.5 rounded-xl font-semibold text-[0.8125rem] flex items-center justify-center gap-2 border border-[#E2E8F0] text-[#64748B]">
                    <Download size={14} /> Descargar
                  </a>
                </div>
              )}
              {error && <p className="text-[0.8125rem] text-[#F87171] mt-2">{error}</p>}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

function TxList({ txs, txLoading, txPages, txPage, setTxPage, currency }) {
  const isCredit = (type) => ['deposit', 'receive', 'unfreeze', 'usdc_deposit', 'p2p_receive'].includes(type)
  const [selectedTx, setSelectedTx] = useState(null)

  if (txLoading && txs.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={24} className="animate-spin text-[#233E58]" />
      </div>
    )
  }

  if (txs.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-[#E2E8F0]">
        <Clock size={32} className="mx-auto text-[#94A3B8] mb-3" />
        <p className="text-[0.875rem] font-semibold text-[#64748B]">Sin movimientos aún</p>
        <p className="text-[0.75rem] text-[#94A3B8] mt-1">
          {currency === 'USDC' ? 'Convierte BOB o deposita USDC para comenzar.' : 'Carga saldo para comenzar a operar.'}
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-2">
        {txs.map(tx => {
          const clickable = tx.type === 'withdrawal'
          return (
          <button key={tx._id ?? tx.wtxId} type="button"
            onClick={clickable ? () => setSelectedTx(tx) : undefined}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left ${clickable ? 'hover:border-[#CBD5E1] transition-colors cursor-pointer' : 'cursor-default'}`}
            style={{ background: 'white', border: '1px solid #E2E8F0' }}>
            <TxIcon type={tx.type} />
            <div className="flex-1 min-w-0">
              <p className="text-[0.875rem] font-semibold text-[#0F172A] truncate">
                {txLabel(tx)}
              </p>
              <p className="text-[0.6875rem] text-[#94A3B8] mt-0.5 flex items-center gap-1">
                {formatDate(tx.createdAt)}
                {tx.metadata?.fee > 0 && ` · fee ${formatUSDC(tx.metadata.fee)}`}
                {tx.type === 'withdrawal' && (tx.hasComprobante || tx.metadata?.withdrawalProof?.present) && (
                  <span className="inline-flex items-center gap-0.5 text-[#22C55E]"><FileText size={11} /> comprobante</span>
                )}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[0.9375rem] font-bold"
                style={{ color: isCredit(tx.type) ? '#22C55E' : '#F87171' }}>
                {isCredit(tx.type) ? '+' : '-'}
                {currency === 'USDC' ? formatUSDC(tx.amount) : formatBOB(tx.amount)}
              </p>
              <TxStatusBadge status={tx.status} />
            </div>
          </button>
          )
        })}
      </div>
      <TxDetailModal tx={selectedTx} open={!!selectedTx} onClose={() => setSelectedTx(null)} currency={currency} />
      {txPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button onClick={() => setTxPage(p => Math.max(1, p - 1))} disabled={txPage === 1}
            className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-[#64748B] disabled:opacity-40">
            <ChevronLeft size={16} /> Anterior
          </button>
          <span className="text-[0.75rem] text-[#94A3B8]">{txPage} / {txPages}</span>
          <button onClick={() => setTxPage(p => Math.min(txPages, p + 1))} disabled={txPage === txPages}
            className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-[#64748B] disabled:opacity-40">
            Siguiente <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Modal Alias Alyto ─────────────────────────────────────────────────────────

function AliasModal({ open, onClose, currentAlias, canChangeAt, onSaved }) {
  const [input,      setInput]      = useState('')
  const [checking,   setChecking]   = useState(false)
  const [available,  setAvailable]  = useState(null)  // null | true | false
  const [checkError, setCheckError] = useState('')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [done,       setDone]       = useState(false)
  const [savedAlias, setSavedAlias] = useState('')
  const debounceRef  = useRef(null)

  const aliasClean = input.trim().toLowerCase().replace(/^@/, '')
  const formatOK   = ALIAS_RE.test(aliasClean)
  const cooldown   = !!(canChangeAt && currentAlias && new Date(canChangeAt) > new Date())

  function handleClose() {
    setInput(''); setAvailable(null); setCheckError('')
    setSaving(false); setError(''); setDone(false); setSavedAlias('')
    clearTimeout(debounceRef.current)
    onClose()
  }

  useEffect(() => {
    if (!open) return
    setAvailable(null); setCheckError('')
    if (!formatOK) { setChecking(false); return }
    setChecking(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await request(`/wallet/alias/available?alias=${encodeURIComponent(aliasClean)}`)
        setAvailable(data.available)
        setCheckError(data.available ? '' : (data.reason || 'Este alias no está disponible.'))
      } catch (err) {
        setCheckError(err.message || 'Error al verificar.')
        setAvailable(false)
      } finally {
        setChecking(false)
      }
    }, 600)
    return () => clearTimeout(debounceRef.current)
  }, [aliasClean, formatOK, open])

  async function handleSave(e) {
    e.preventDefault()
    if (!available) return
    setError(''); setSaving(true)
    try {
      const data = await request('/wallet/alias', {
        method: 'PUT',
        body: JSON.stringify({ alias: aliasClean }),
      })
      setSavedAlias(data.alias)
      setDone(true)
      onSaved?.(data.alias)
    } catch (err) {
      if (err.status === 409) {
        setError('Este alias ya está en uso. Elige otro.')
      } else if (err.status === 429) {
        const cd = err.data?.canChangeAt
        setError(`Período de espera activo. Próximo cambio: ${cd ? new Date(cd).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' }) : 'en 30 días'}.`)
      } else {
        setError(err.message || 'Error al guardar el alias.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Tu alias Alyto">
      {done ? (
        <div className="text-center py-4 space-y-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: '#22C55E1A' }}>
            <CheckCircle2 size={32} className="text-[#22C55E]" />
          </div>
          <div>
            <p className="text-[1.125rem] font-bold text-[#0F172A]">@{savedAlias}</p>
            <p className="text-[0.875rem] text-[#64748B] mt-1">
              Alias registrado. Compártelo para recibir USDC al instante.
            </p>
          </div>
          <button onClick={handleClose}
            className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white"
            style={{ background: '#0D6E52' }}>
            Listo
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Current alias display */}
          {currentAlias && (
            <div className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ background: '#0D6E520D', border: '1px solid #0D6E5222' }}>
              <div className="w-9 h-9 rounded-xl bg-[#0D6E521A] flex items-center justify-center flex-shrink-0">
                <AtSign size={16} className="text-[#0D6E52]" />
              </div>
              <div>
                <p className="text-[0.6875rem] text-[#64748B]">Alias actual</p>
                <p className="text-[0.9375rem] font-bold text-[#0F172A]">@{currentAlias}</p>
              </div>
            </div>
          )}

          {/* Cooldown notice */}
          {cooldown ? (
            <>
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl"
                style={{ background: '#F59E0B1A', border: '1px solid #F59E0B33' }}>
                <AlertCircle size={14} className="text-[#F59E0B] mt-0.5 flex-shrink-0" />
                <p className="text-[0.8125rem] text-[#92400E]">
                  Cambio disponible el{' '}
                  <span className="font-bold">
                    {new Date(canChangeAt).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>.
                </p>
              </div>
              <button onClick={handleClose}
                className="w-full py-3.5 rounded-2xl font-semibold text-[0.9375rem] text-[#64748B]"
                style={{ border: '1.5px solid #E2E8F0' }}>
                Cerrar
              </button>
            </>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[0.75rem] font-medium text-[#64748B] mb-1.5">
                  {currentAlias ? 'Cambiar alias' : 'Elegir alias'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] font-semibold">@</span>
                  <input
                    type="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={input}
                    onChange={e => { setInput(e.target.value); setError('') }}
                    placeholder="tualias"
                    maxLength={20}
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-8 pr-10 py-3.5 text-[#0F172A] text-[0.9375rem] focus:border-[#0D6E52] focus:outline-none transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checking && <Loader2 size={15} className="animate-spin text-[#94A3B8]" />}
                    {!checking && available === true  && <CheckCircle2 size={15} className="text-[#22C55E]" />}
                    {!checking && available === false && <AlertCircle  size={15} className="text-[#EF4444]" />}
                  </div>
                </div>
                <p className="text-[0.6875rem] text-[#94A3B8] mt-1">
                  3-20 caracteres: letras minúsculas, números o _
                </p>
                {!checking && available === true && (
                  <p className="text-[0.75rem] text-[#22C55E] mt-1">@{aliasClean} está disponible.</p>
                )}
                {!checking && checkError && (
                  <p className="text-[0.75rem] text-[#F87171] mt-1">{checkError}</p>
                )}
              </div>
              {error && (
                <p className="text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-4 py-3">{error}</p>
              )}
              <button
                type="submit"
                disabled={!available || saving}
                className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white disabled:opacity-40"
                style={{ background: '#0D6E52' }}>
                {saving
                  ? <Loader2 size={18} className="animate-spin mx-auto" />
                  : currentAlias ? 'Cambiar alias' : 'Guardar alias'}
              </button>
            </form>
          )}
        </div>
      )}
    </Modal>
  )
}

// ── Modal Cobrar USDC (generar QR) ────────────────────────────────────────────

const USDC_TTL_OPTIONS = [
  { label: '10 min', secs: 600   },
  { label: '30 min', secs: 1800  },
  { label: '1 hora', secs: 3600  },
  { label: '24 hs',  secs: 86400 },
]

function ReceiveUSDCModal({ open, onClose, user }) {
  const [fixedAmount,  setFixedAmount]  = useState(true)
  const [amount,       setAmount]       = useState('')
  const [description,  setDescription] = useState('')
  const [expirySecs,   setExpirySecs]  = useState(600)
  const [loading,      setLoading]     = useState(false)
  const [qrData,       setQrData]      = useState(null)
  const [error,        setError]       = useState(null)

  const countdown = useCountdown(qrData?.expiresAt)
  const mm = countdown != null ? String(Math.floor(countdown / 60)).padStart(2, '0') : '00'
  const ss = countdown != null ? String(countdown % 60).padStart(2, '0') : '00'
  const expired = countdown === 0

  function resetAll() {
    setFixedAmount(true); setAmount(''); setDescription('')
    setExpirySecs(600); setLoading(false); setQrData(null); setError(null)
  }

  function handleClose() { resetAll(); onClose() }

  async function handleGenerate() {
    setError(null)
    if (fixedAmount && (!amount || Number(amount) < 1)) {
      setError('Ingresa un monto válido (mínimo 1 USDC).')
      return
    }
    setLoading(true)
    try {
      const body = fixedAmount
        ? { type: 'charge', asset: 'USDC', amount: Number(amount), description: description || undefined, expiresInSecs: expirySecs }
        : { type: 'deposit', asset: 'USDC', description: description || undefined, expiresInSecs: expirySecs }
      const data = await request('/wallet/qr/generate', { method: 'POST', body: JSON.stringify(body) })
      setQrData(data)
    } catch (err) {
      setError(err.message || 'Error al generar el QR.')
    } finally {
      setLoading(false)
    }
  }

  async function handleShare() {
    if (!qrData?.qrBase64) return
    const src  = await buildQRWithLogo(qrData.qrBase64, 'USDC')
    const text = qrData.amount
      ? `Págame ${qrData.amount} USDC con Alyto`
      : `Envíame USDC en Alyto${description ? ` — ${description}` : ''}`
    // Comparte la IMAGEN del QR (antes solo enviaba texto → WhatsApp no mostraba el QR)
    await shareQRImage({ dataUrl: src, text, title: 'QR USDC Alyto', filename: 'alyto-qr-usdc.png' })
  }

  return (
    <Modal open={open} onClose={handleClose} title="Cobrar USDC">
      {qrData ? (
        <div className="flex flex-col items-center gap-5 py-2">
          <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-sm flex items-center justify-center">
            <QRDisplay src={qrData.qrBase64} alt="QR USDC Alyto" size={256} asset="USDC" />
          </div>

          <div className="text-center">
            {qrData.amount != null && (
              <p className="text-[1.5rem] font-bold text-[#0D6E52]">
                {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(qrData.amount)} USDC
              </p>
            )}
            <p className="text-[0.875rem] text-[#64748B] mt-0.5">
              {user?.firstName} {user?.lastName}
            </p>
            {countdown != null && !expired && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.75rem] font-semibold bg-[#F1F5F9] text-[#94A3B8]">
                <Clock size={12} /> Expira en {mm}:{ss}
              </div>
            )}
            {expired && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.75rem] font-semibold bg-[#EF44441A] text-[#EF4444]">
                <AlertCircle size={12} /> QR expirado
              </div>
            )}
          </div>

          <div className="flex gap-3 w-full">
            <button onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[0.875rem] font-semibold text-white"
              style={{ background: '#0D6E52' }}>
              <Share2 size={16} /> Compartir
            </button>
            <button onClick={resetAll}
              className="px-4 py-3 rounded-2xl bg-white border border-[#E2E8F0] text-[#64748B]"
              title="Generar nuevo QR">
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex p-1 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0] gap-1">
            {[{ label: 'Monto fijo', val: true }, { label: 'Pagador elige', val: false }].map(({ label, val }) => (
              <button key={String(val)} onClick={() => setFixedAmount(val)}
                className={`flex-1 py-2 rounded-lg text-[0.8125rem] font-semibold transition-all ${
                  fixedAmount === val ? 'bg-[#0D6E52] text-white shadow-sm' : 'text-[#64748B]'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {fixedAmount && (
            <div>
              <label className="block text-[0.75rem] font-medium text-[#64748B] mb-1.5">
                Monto a cobrar (USDC)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] font-semibold text-sm">$</span>
                <input
                  type="number" min={1} step="0.01"
                  value={amount} onChange={e => setAmount(e.target.value)} placeholder="1.00"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-9 pr-16 py-3.5 text-[#0F172A] text-[1.25rem] font-bold focus:border-[#0D6E52] focus:outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] font-semibold text-sm">USDC</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[0.75rem] font-medium text-[#64748B] mb-1.5">Motivo (opcional)</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} maxLength={80}
              placeholder="Ej: servicio, producto..."
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0F172A] text-[0.9375rem] focus:border-[#0D6E52] focus:outline-none" />
          </div>

          <div>
            <label className="block text-[0.75rem] font-medium text-[#64748B] mb-2">Vence en</label>
            <div className="flex gap-2 flex-wrap">
              {USDC_TTL_OPTIONS.map(opt => (
                <button key={opt.secs} onClick={() => setExpirySecs(opt.secs)}
                  className={`px-3 py-1.5 rounded-lg text-[0.8125rem] font-semibold border transition-all ${
                    expirySecs === opt.secs
                      ? 'bg-[#0D6E52] text-white border-[#0D6E52]'
                      : 'bg-white text-[#64748B] border-[#E2E8F0]'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-4 py-3">{error}</p>
          )}

          <button onClick={handleGenerate} disabled={loading}
            className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: '#0D6E52' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <><QrCode size={18} /> Generar QR USDC</>}
          </button>
        </div>
      )}
    </Modal>
  )
}

// ── Main WalletPage ───────────────────────────────────────────────────────────

export default function WalletPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState('BOB')

  // BOB state
  const [wallet, setWallet]         = useState(null)
  const [txs, setTxs]               = useState([])
  const [txPage, setTxPage]         = useState(1)
  const [txTotal, setTxTotal]       = useState(0)
  const [loading, setLoading]       = useState(true)
  const [txLoading, setTxLoading]   = useState(false)

  const [showDeposit, setShowDeposit]   = useState(false)
  const [showSend, setShowSend]         = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)

  // USDC state
  const [walletUSDC, setWalletUSDC]         = useState(null)
  const [usdcTxs, setUsdcTxs]               = useState([])
  const [usdcTxPage, setUsdcTxPage]         = useState(1)
  const [usdcTxTotal, setUsdcTxTotal]       = useState(0)
  const [usdcLoading, setUsdcLoading]       = useState(false)
  const [usdcTxLoading, setUsdcTxLoading]   = useState(false)
  const [depositInstructions, setDepositInstructions] = useState(null)
  const [instrLoading, setInstrLoading]     = useState(false)

  const [showUSDCDeposit,   setShowUSDCDeposit]   = useState(false)
  const [showConvert,       setShowConvert]       = useState(false)
  const [convertDirection,  setConvertDirection]  = useState('bob_to_usdc')
  const openConvert = (dir) => { setConvertDirection(dir); setShowConvert(true) }
  const [showAlias,         setShowAlias]         = useState(false)
  const [showReceiveUSDC,   setShowReceiveUSDC]   = useState(false)
  const [aliasData,         setAliasData]         = useState(null)  // { alias, canChangeAt } | false

  // New state — improvements
  const [bobHistory,        setBobHistory]        = useState([])
  const [usdcHistory,       setUsdcHistory]       = useState([])
  const [dailyLimits,       setDailyLimits]       = useState(null)
  const [usdcRate,          setUsdcRate]          = useState(null)
  const [usdcSellRate,      setUsdcSellRate]      = useState(null)
  const [usdcMarketRate,    setUsdcMarketRate]    = useState(null)
  const [bobTxFilter,       setBobTxFilter]       = useState('all')
  const [usdcTxFilter,      setUsdcTxFilter]      = useState('all')
  const [copiedMemo,        setCopiedMemo]        = useState(false)
  const [exportBobLoading,  setExportBobLoading]  = useState(false)
  const [exportUsdcLoading, setExportUsdcLoading] = useState(false)

  // Guard — solo SRL
  useEffect(() => {
    if (user && user.legalEntity !== 'SRL') {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  // ── BOB fetchers ────────────────────────────────────────────────────────────

  const fetchWallet = useCallback(async () => {
    try {
      const data = await request('/wallet/balance')
      setWallet(data)
    } catch { /* silencioso */ } finally {
      setLoading(false)
    }
  }, [])

  const fetchTxs = useCallback(async (page = 1, filter = 'all') => {
    setTxLoading(true)
    try {
      const typeParam = filter !== 'all' ? `&type=${filter}` : ''
      const data = await request(`/wallet/transactions?page=${page}&limit=10${typeParam}`)
      setTxs(data.transactions ?? [])
      setTxTotal(data.pagination?.total ?? 0)
    } catch { /* silencioso */ } finally {
      setTxLoading(false)
    }
  }, [])

  // ── USDC fetchers ───────────────────────────────────────────────────────────

  const fetchWalletUSDC = useCallback(async () => {
    setUsdcLoading(true)
    try {
      const data = await request('/wallet/usdc/balance')
      setWalletUSDC(data)
    } catch { /* silencioso */ } finally {
      setUsdcLoading(false)
    }
  }, [])

  const fetchUSDCTxs = useCallback(async (page = 1, filter = 'all') => {
    setUsdcTxLoading(true)
    try {
      const typeParam = filter !== 'all' ? `&type=${filter}` : ''
      const data = await request(`/wallet/usdc/transactions?page=${page}&limit=10${typeParam}`)
      setUsdcTxs(data.transactions ?? [])
      setUsdcTxTotal(data.pagination?.total ?? 0)
    } catch { /* silencioso */ } finally {
      setUsdcTxLoading(false)
    }
  }, [])

  const fetchBobHistory = useCallback(async () => {
    try {
      const data = await request('/wallet/balance-history?days=7&currency=BOB')
      setBobHistory(data.history ?? [])
    } catch { /* silencioso */ }
  }, [])

  const fetchUsdcHistory = useCallback(async () => {
    try {
      const data = await request('/wallet/balance-history?days=7&currency=USDC')
      setUsdcHistory(data.history ?? [])
    } catch { /* silencioso */ }
  }, [])

  const fetchDailyLimits = useCallback(async () => {
    try {
      const data = await request('/wallet/daily-limits')
      setDailyLimits(data)
    } catch { /* silencioso */ }
  }, [])

  const fetchAlias = useCallback(async () => {
    try {
      const data = await request('/wallet/alias/me')
      setAliasData(data ?? false)
    } catch {
      setAliasData(false)
    }
  }, [])

  const fetchUSDCRate = useCallback(async () => {
    try {
      const data = await request('/wallet/usdc/rate')
      // El backend devuelve `bobPerUsdc` (alias `rate`). Si por proxy/404 llega
      // una respuesta no-JSON, `request` devuelve el objeto Response → ignorar.
      const r = (data && typeof data === 'object' && !(data instanceof Response))
        ? (data.bobPerUsdc ?? data.rate)
        : undefined
      const n = Number(r)
      if (Number.isFinite(n) && n > 0) setUsdcRate(n)
      else console.warn('[fetchUSDCRate] respuesta sin tasa válida:', data)
      // Tasa de venta (USDC→BOB) para el swap unificado
      const s = Number(data?.sellBobPerUsdc)
      if (Number.isFinite(s) && s > 0) setUsdcSellRate(s)
      // Tasa de mercado (referencia sin spread) para mostrar la comisión por conversión
      const mk = Number(data?.marketRate)
      if (Number.isFinite(mk) && mk > 0) setUsdcMarketRate(mk)
    } catch (err) {
      console.warn('[fetchUSDCRate] error al obtener tasa:', err?.status, err?.message)
    }
  }, [])

  async function exportCSV(currency) {
    const setLoading = currency === 'BOB' ? setExportBobLoading : setExportUsdcLoading
    setLoading(true)
    try {
      const res = await request(`/wallet/export?currency=${currency}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `movimientos_${currency.toLowerCase()}_${new Date().toISOString().slice(0, 7)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* silencioso */ } finally {
      setLoading(false)
    }
  }

  async function openUSDCDeposit() {
    setShowUSDCDeposit(true)
    if (!depositInstructions) {
      setInstrLoading(true)
      try {
        const data = await request('/wallet/usdc/deposit-instructions')
        setDepositInstructions(data)
      } catch { /* silencioso */ } finally {
        setInstrLoading(false)
      }
    }
  }

  // ── Effects ─────────────────────────────────────────────────────────────────

  useEffect(() => { fetchWallet() }, [fetchWallet])
  useEffect(() => { fetchTxs(txPage, bobTxFilter) }, [fetchTxs, txPage, bobTxFilter])
  useEffect(() => { fetchWalletUSDC() }, [fetchWalletUSDC])
  useEffect(() => { fetchUSDCTxs(usdcTxPage, usdcTxFilter) }, [fetchUSDCTxs, usdcTxPage, usdcTxFilter])
  useEffect(() => { fetchBobHistory() }, [fetchBobHistory])
  useEffect(() => { fetchUsdcHistory() }, [fetchUsdcHistory])
  useEffect(() => { fetchDailyLimits() }, [fetchDailyLimits])
  useEffect(() => { fetchUSDCRate() }, [fetchUSDCRate])
  useEffect(() => { fetchAlias() }, [fetchAlias])

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchWallet(); fetchWalletUSDC()
      }
    }, 30000)
    return () => clearInterval(id)
  }, [fetchWallet, fetchWalletUSDC])

  function handleRefresh() {
    fetchWallet(); fetchTxs(txPage, bobTxFilter)
    fetchWalletUSDC(); fetchUSDCTxs(usdcTxPage, usdcTxFilter)
    fetchBobHistory(); fetchUsdcHistory()
    fetchDailyLimits(); fetchUSDCRate(); fetchAlias()
  }

  const txPages     = Math.ceil(txTotal / 10)
  const usdcTxPages = Math.ceil(usdcTxTotal / 10)

  const bobAvailable  = wallet ? Math.max(0, (wallet.balance ?? 0) - (wallet.balanceReserved ?? 0)) : 0
  const usdcAvailable = walletUSDC ? Math.max(0, (walletUSDC.balance ?? 0) - (walletUSDC.balanceReserved ?? 0)) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-[#233E58]" />
      </div>
    )
  }

  return (
    <div className="pt-4">

      {/* Page title */}
      <div className="flex items-center justify-between px-5 pb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-[1.0625rem] font-bold text-[#0F172A]">Mi Wallet</h1>
          <span className="text-[0.625rem] font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#22C55E1A', color: '#22C55E', border: '1px solid #22C55E33' }}>
            SRL Bolivia
          </span>
        </div>
        <button onClick={handleRefresh}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: '#F1F5F9' }}>
          <RefreshCw size={14} className="text-[#64748B]" />
        </button>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <div className="flex gap-2 px-5 mb-5">
        {['BOB', 'USDC'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="flex-1 py-2.5 rounded-2xl text-[0.875rem] font-bold transition-all"
            style={activeTab === tab
              ? { background: '#233E58', color: 'white' }
              : { background: '#F1F5F9', color: '#64748B' }
            }>
            {tab === 'BOB' ? 'Bolivianos (BOB)' : 'USDC'}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB BOB
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'BOB' && (
        <>
          {/* Saldo card BOB */}
          <div className="mx-4 mb-5 rounded-3xl p-6 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #2D5F82 0%, #233E58 55%, #1A2F44 100%)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse, #233E5818 0%, transparent 70%)' }} />
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
              style={{ border: '1px solid rgba(255,255,255,0.15)' }} />

            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[0.6875rem] font-medium uppercase tracking-widest text-white/70 mb-1">Saldo disponible</p>
                <p className="text-[2.5rem] font-extrabold text-white leading-none tracking-tight">{formatBOB(bobAvailable)}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={wallet?.status ?? 'active'} />
                {bobHistory.length >= 2 && <Sparkline data={bobHistory} id="bob" width={80} height={28} />}
              </div>
            </div>

            {(wallet?.balanceReserved > 0 || wallet?.balanceFrozen > 0) && (
              <div className="mt-4 pt-4 border-t border-white/20 flex gap-4">
                {wallet?.balanceReserved > 0 && (
                  <div>
                    <p className="text-[0.625rem] text-white/60 uppercase tracking-wider">Reservado</p>
                    <p className="text-[0.875rem] font-semibold text-white/80">{formatBOB(wallet.balanceReserved)}</p>
                  </div>
                )}
                {wallet?.balanceFrozen > 0 && (
                  <div>
                    <p className="text-[0.625rem] text-white/60 uppercase tracking-wider">Congelado</p>
                    <p className="text-[0.875rem] font-semibold text-[#F87171]">{formatBOB(wallet.balanceFrozen)}</p>
                  </div>
                )}
              </div>
            )}

            {wallet?.status === 'active' ? (
              <div className="flex gap-3 mt-5">
                {[
                  { label: 'Cargar',    icon: ArrowDownToLine, action: () => setShowDeposit(true),   primary: true  },
                  { label: 'Enviar',    icon: ArrowUpRight,    action: () => setShowSend(true),       primary: false },
                  { label: 'QR',        icon: QrCode,          action: () => navigate('/wallet/qr'),  primary: false },
                  { label: 'Retirar',   icon: Wallet,          action: () => setShowWithdraw(true),  primary: false },
                ].map(({ label, icon: Icon, action, primary }) => (
                  <button key={label} onClick={action}
                    className="flex-1 flex flex-col items-center gap-2 py-3.5 rounded-2xl transition-all active:scale-95"
                    style={{
                      background: primary ? 'white' : 'rgba(255,255,255,0.18)',
                      border:     primary ? 'none'  : '1px solid rgba(255,255,255,0.3)',
                    }}>
                    <Icon size={20} style={{ color: primary ? '#233E58' : 'white' }} />
                    <span className="text-[0.75rem] font-semibold" style={{ color: primary ? '#233E58' : 'white' }}>{label}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {/* Conversión directa BOB → USDC */}
            {wallet?.status === 'active' && (
              <button onClick={() => openConvert('bob_to_usdc')}
                className="w-full mt-2.5 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all active:scale-95"
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.28)' }}>
                <ArrowRightLeft size={16} className="text-white" />
                <span className="text-[0.8125rem] font-semibold text-white">Convertir a USDC</span>
              </button>
            )}

            {wallet?.status !== 'active' && wallet?.status && (
              <div className="mt-4 rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <AlertCircle size={18} className="text-[#F87171] flex-shrink-0" />
                <p className="text-[0.8125rem] text-[#F87171]">
                  Wallet {wallet?.status === 'frozen' ? 'congelada por compliance ASFI' : 'suspendida'}. Contacta a soporte.
                </p>
              </div>
            )}

            {dailyLimits && (
              <div className="mt-4 pt-4 flex items-center gap-3"
                style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                <DailyLimitBar label="Envíos hoy" used={dailyLimits.send?.used ?? 0} limit={dailyLimits.send?.limit ?? 5000} />
                <div className="self-stretch w-px" style={{ background: 'rgba(255,255,255,0.2)' }} />
                <DailyLimitBar label="Retiros hoy" used={dailyLimits.withdrawal?.used ?? 0} limit={dailyLimits.withdrawal?.limit ?? 10000} />
              </div>
            )}
          </div>

          {/* Historial BOB */}
          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[1rem] font-bold text-[#0F172A]">Movimientos BOB</h2>
              <div className="flex items-center gap-2">
                {txLoading && <Loader2 size={14} className="animate-spin text-[#64748B]" />}
                <button onClick={() => exportCSV('BOB')} disabled={exportBobLoading}
                  title="Exportar CSV"
                  className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-40"
                  style={{ background: '#F1F5F9' }}>
                  {exportBobLoading
                    ? <Loader2 size={14} className="animate-spin text-[#64748B]" />
                    : <Download size={14} className="text-[#64748B]" />}
                </button>
              </div>
            </div>
            <div className="mb-3">
              <FilterChips
                filters={[
                  { key: 'all',         label: 'Todos'        },
                  { key: 'deposit',     label: 'Depósitos'    },
                  { key: 'send',        label: 'Envíos'       },
                  { key: 'withdrawal',  label: 'Retiros'      },
                  { key: 'receive',     label: 'Recibidos'    },
                  { key: 'bob_to_usdc', label: 'Conversiones' },
                ]}
                active={bobTxFilter}
                onChange={f => { setBobTxFilter(f); setTxPage(1) }}
                accent="#233E58"
              />
            </div>
            <TxList txs={txs} txLoading={txLoading} txPages={txPages} txPage={txPage} setTxPage={setTxPage} currency="BOB" />
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB USDC
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'USDC' && (
        <>
          {/* Saldo card USDC */}
          <div className="mx-4 mb-5 rounded-3xl p-6 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #0D4A36 0%, #1D9E75 60%, #17875F 100%)',
              boxShadow: '0 8px 32px rgba(29,158,117,0.35), 0 2px 8px rgba(29,158,117,0.20)',
            }}>
            {/* Grid overlay sutil */}
            <div className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }} />
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />
            <div className="absolute -bottom-5 left-5 w-24 h-24 rounded-full pointer-events-none"
              style={{ background: 'rgba(255,255,255,0.03)' }} />

            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[0.6875rem] font-medium uppercase tracking-widest text-white/70">Saldo USDC</p>
                  <span className="text-[0.5625rem] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)' }}>
                    Stellar
                  </span>
                </div>
                {usdcLoading ? (
                  <Loader2 size={24} className="animate-spin text-white/60 mt-2" />
                ) : (
                  <p className="text-[2.25rem] font-extrabold text-white leading-none tracking-tight">
                    {formatUSDC(usdcAvailable)}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={walletUSDC?.status ?? 'active'} />
                {usdcHistory.length >= 2 && <Sparkline data={usdcHistory} id="usdc" width={80} height={28} />}
              </div>
            </div>

            {!usdcLoading && walletUSDC?.balanceReserved > 0 && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <p className="text-[0.625rem] text-white/60 uppercase tracking-wider">En conversión (pendiente)</p>
                <p className="text-[0.875rem] font-semibold text-white/80">{formatUSDC(walletUSDC.balanceReserved)}</p>
              </div>
            )}

            {/* Memo Stellar — solo si el backend lo exige (modelo legacy con
                dirección compartida). Camino A (dirección custodial propia) no
                usa memo, así que el flag llega ausente/false y NO se muestra. */}
            {!usdcLoading && walletUSDC?.memoRequired === true && walletUSDC?.stellarMemo && (
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                <p className="text-[0.6875rem] text-white/60 mb-1">Tu memo Stellar</p>
                <div className="flex items-center gap-2">
                  <p className="text-[0.9375rem] font-mono font-bold text-white flex-1">{walletUSDC.stellarMemo}</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(walletUSDC.stellarMemo)
                      setCopiedMemo(true)
                      setTimeout(() => setCopiedMemo(false), 2000)
                    }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
                    {copiedMemo
                      ? <CheckCheck size={14} className="text-[#22C55E]" />
                      : <Copy size={14} className="text-white" />}
                  </button>
                </div>
              </div>
            )}

            {/* Botones de acción USDC */}
            {(walletUSDC?.status ?? 'active') === 'active' && (
              <>
                <div className="flex gap-2 mt-5">
                  {[
                    { label: 'Depositar', icon: ArrowDownToLine, action: openUSDCDeposit,                        primary: true  },
                    { label: 'Enviar',    icon: ArrowUpRight,    action: () => navigate('/wallet/usdc/send'),     primary: false },
                    { label: 'Cobrar',    icon: QrCode,          action: () => setShowReceiveUSDC(true),          primary: false },
                  ].map(({ label, icon: Icon, action, primary }) => (
                    <button key={label} onClick={action}
                      className="flex-1 flex flex-col items-center gap-2 py-3.5 rounded-2xl transition-all active:scale-95"
                      style={{
                        background: primary ? 'white' : 'rgba(255,255,255,0.18)',
                        border:     primary ? 'none'  : '1px solid rgba(255,255,255,0.3)',
                      }}>
                      <Icon size={20} style={{ color: primary ? '#0D4A36' : 'white' }} />
                      <span className="text-[0.75rem] font-semibold" style={{ color: primary ? '#0D4A36' : 'white' }}>{label}</span>
                    </button>
                  ))}
                </div>
                {/* Conversión directa USDC → BOB */}
                <button onClick={() => openConvert('usdc_to_bob')}
                  className="w-full mt-2.5 flex items-center justify-center gap-2 py-3 rounded-2xl transition-all active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.28)' }}>
                  <ArrowRightLeft size={16} className="text-white" />
                  <span className="text-[0.8125rem] font-semibold text-white">
                    Convertir a BOB{usdcRate ? ` · 1 USDC = Bs. ${usdcRate.toFixed(2)}` : ''}
                  </span>
                </button>
              </>
            )}
          </div>

          {/* Alias section */}
          <div className="px-4 mb-4">
            {aliasData && aliasData.alias ? (
              <button
                onClick={() => setShowAlias(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-[#E2E8F0] text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-[#0D6E521A] flex items-center justify-center flex-shrink-0">
                  <AtSign size={15} className="text-[#0D6E52]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.6875rem] text-[#94A3B8]">Tu alias</p>
                  <p className="text-[0.9375rem] font-bold text-[#0F172A]">@{aliasData.alias}</p>
                </div>
                <ChevronRight size={15} className="text-[#94A3B8] flex-shrink-0" />
              </button>
            ) : aliasData !== null ? (
              <button
                onClick={() => setShowAlias(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
                style={{ background: '#0D6E520D', border: '1px solid #0D6E5222' }}
              >
                <div className="w-9 h-9 rounded-xl bg-[#0D6E521A] flex items-center justify-center flex-shrink-0">
                  <AtSign size={15} className="text-[#0D6E52]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.75rem] font-semibold text-[#0D6E52]">Elegí tu alias Alyto</p>
                  <p className="text-[0.6875rem] text-[#64748B]">Recibí USDC por @alias al instante</p>
                </div>
                <ChevronRight size={15} className="text-[#0D6E52] flex-shrink-0" />
              </button>
            ) : null}
          </div>

          {/* Historial USDC */}
          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[1rem] font-bold text-[#0F172A]">Movimientos USDC</h2>
              <div className="flex items-center gap-2">
                {usdcTxLoading && <Loader2 size={14} className="animate-spin text-[#64748B]" />}
                <button onClick={() => exportCSV('USDC')} disabled={exportUsdcLoading}
                  title="Exportar CSV"
                  className="w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-40"
                  style={{ background: '#F1F5F9' }}>
                  {exportUsdcLoading
                    ? <Loader2 size={14} className="animate-spin text-[#64748B]" />
                    : <Download size={14} className="text-[#64748B]" />}
                </button>
              </div>
            </div>
            <div className="mb-3">
              <FilterChips
                filters={[
                  { key: 'all',          label: 'Todos'        },
                  { key: 'receive',      label: 'Recibidos'    },
                  { key: 'send',         label: 'Enviados'     },
                  { key: 'usdc_deposit', label: 'Depósitos'    },
                  { key: 'usdc_to_bob',  label: 'Conversiones' },
                ]}
                active={usdcTxFilter}
                onChange={f => { setUsdcTxFilter(f); setUsdcTxPage(1) }}
                accent="#0D6E52"
              />
            </div>
            <TxList txs={usdcTxs} txLoading={usdcTxLoading} txPages={usdcTxPages} txPage={usdcTxPage} setTxPage={setUsdcTxPage} currency="USDC" />
          </div>
        </>
      )}

      {/* ── Modals BOB ─────────────────────────────────────────────────────── */}
      <DepositModal open={showDeposit} onClose={() => setShowDeposit(false)} onSuccess={handleRefresh} />
      <SendModal    open={showSend}    onClose={() => setShowSend(false)}    onSuccess={handleRefresh} balanceAvailable={bobAvailable} />
      <WithdrawModal open={showWithdraw} onClose={() => setShowWithdraw(false)} onSuccess={handleRefresh} balanceAvailable={bobAvailable} />

      {/* ── Modals USDC ────────────────────────────────────────────────────── */}
      <USDCDepositModal
        open={showUSDCDeposit}
        onClose={() => setShowUSDCDeposit(false)}
        instructions={instrLoading ? null : depositInstructions}
      />
      <ConvertModal
        open={showConvert}
        onClose={() => setShowConvert(false)}
        onSuccess={handleRefresh}
        bobBalance={bobAvailable}
        usdcBalance={usdcAvailable}
        buyRate={usdcRate}
        sellRate={usdcSellRate}
        marketRate={usdcMarketRate}
        initialDirection={convertDirection}
      />
      <AliasModal
        open={showAlias}
        onClose={() => setShowAlias(false)}
        currentAlias={aliasData?.alias ?? null}
        canChangeAt={aliasData?.canChangeAt ?? null}
        onSaved={(newAlias) => setAliasData(prev => ({ ...prev, alias: newAlias }))}
      />
      <ReceiveUSDCModal
        open={showReceiveUSDC}
        onClose={() => setShowReceiveUSDC(false)}
        user={user}
      />

    </div>
  )
}
