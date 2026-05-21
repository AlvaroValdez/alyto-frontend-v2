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
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { request, requestFormData } from '../../services/api'

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
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
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
    usdc_deposit:{ icon: ArrowDownToLine, color: '#22C55E', bg: '#22C55E1A' },
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
    pending:   { bg: '#64748B1A', text: '#64748B', label: 'Pendiente' },
    completed: { bg: '#22C55E1A', text: '#22C55E', label: 'Completado' },
    failed:    { bg: '#EF44441A', text: '#F87171', label: 'Fallido' },
    reversed:  { bg: '#64748B1A', text: '#64748B', label: 'Revertido' },
  }
  const s = map[status] ?? map.pending
  return (
    <span className="text-[0.625rem] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  )
}

// ── Modal base ─────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: '#0F162899' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[430px] bg-white rounded-t-3xl px-6 pt-5 pb-8"
        style={{ border: '1px solid #E2E8F0', borderBottom: 'none' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[1rem] font-bold text-[#0F172A]">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center">
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

function DepositModal({ open, onClose, onSuccess }) {
  // ─── state ───────────────────────────────────────────────────────────────────
  const [view, setView]           = useState('amount')   // 'amount' | 'instructions' | 'done'
  const [amount, setAmount]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState(null)       // response from /deposit/initiate
  const [qrImages, setQrImages]   = useState([])         // QRs estáticos del admin
  const [payTab, setPayTab]       = useState('transfer') // 'transfer' | 'qr'
  const [error, setError]         = useState('')
  const [copied, setCopied]       = useState(false)

  // comprobante upload
  const [proofFile, setProofFile]       = useState(null)
  const [proofPreview, setProofPreview] = useState(null)
  const [uploading, setUploading]       = useState(false)
  const [uploadError, setUploadError]   = useState('')
  const [uploadDone, setUploadDone]     = useState(false)

  function resetAll() {
    setView('amount'); setAmount(''); setResult(null); setQrImages([])
    setPayTab('transfer'); setError(''); setCopied(false)
    setProofFile(null); setProofPreview(null); setUploading(false)
    setUploadError(''); setUploadDone(false)
  }

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
      const [data, instrData] = await Promise.all([
        request('/wallet/deposit/initiate', {
          method: 'POST',
          body: JSON.stringify({ amount: n }),
        }),
        request('/wallet/deposit/qr-images').catch(() => ({ qrImages: [] })),
      ])
      setResult(data)
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
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef    = useRef(null)

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
    try {
      await request('/wallet/send', {
        method: 'POST',
        body: JSON.stringify({ recipientEmail: email, amount: Number(amount), description }),
      })
      setDoneInfo({ recipient: email, amount: formatBOB(Number(amount)) })
      setDone(true); onSuccess?.()
    } catch (err) {
      setError(err.message ?? 'Error al procesar el envío.')
    } finally {
      setLoading(false)
    }
  }

  // ── QR handlers ───────────────────────────────────────────────────────────

  async function startCamera() {
    setCamError(null); setPreview(null); setPayError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      setScanning(true)
      scanLoop()
    } catch {
      setCamError('No se pudo acceder a la cámara. Verifica los permisos en tu navegador.')
    }
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
    try {
      const body = { qrContent: preview._rawContent }
      if (!(preview.amount > 0)) body.amount = Number(qrAmount)
      await request('/wallet/qr/scan', { method: 'POST', body: JSON.stringify(body) })
      setDoneInfo({ recipient: preview.recipientName || preview.recipientEmail || 'Destinatario', amount: formatBOB(payAmt) })
      setDone(true); onSuccess?.()
    } catch (err) {
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

                  {!scanning ? (
                    <button
                      onClick={startCamera}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white"
                      style={{ background: '#233E58' }}
                    >
                      <Camera size={18} /> Activar cámara
                    </button>
                  ) : (
                    <button
                      onClick={stopCamera}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-[0.9375rem] text-[#64748B]"
                      style={{ border: '1.5px solid #E2E8F0' }}
                    >
                      <CameraOff size={18} /> Detener cámara
                    </button>
                  )}

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
  const [form, setForm] = useState({
    amount: '', bankName: '', accountNumber: '', accountHolder: '', accountType: 'Caja de ahorros',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [done, setDone]       = useState(false)

  function handleClose() {
    setForm({ amount: '', bankName: '', accountNumber: '', accountHolder: '', accountType: 'Caja de ahorros' })
    setError(''); setDone(false); onClose()
  }
  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    const n = Number(form.amount)
    if (n < 100) return setError('El monto mínimo de retiro es Bs. 100.')
    if (n > balanceAvailable) return setError(`Saldo insuficiente. Disponible: ${formatBOB(balanceAvailable)}.`)
    if (!form.bankName || !form.accountNumber || !form.accountHolder) return setError('Completa todos los datos bancarios.')
    setLoading(true)
    try {
      await request('/wallet/withdraw/request', { method: 'POST', body: JSON.stringify({ ...form, amount: n }) })
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
            <p className="text-[#64748B] text-[0.875rem] mt-1">AV Finance SRL procesará tu retiro en <span className="text-[#0F172A]">1-2 días hábiles</span>.</p>
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
          <div className="space-y-3 bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0]">
            <p className="text-[0.75rem] font-semibold text-[#64748B] uppercase tracking-wider">Datos bancarios de destino</p>
            {[
              { key: 'bankName',       label: 'Banco',                placeholder: 'Ej. Banco Bisa' },
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

  return (
    <Modal open={open} onClose={onClose} title="Depositar USDC vía Stellar">
      {!instructions ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-[#233E58]" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Warning */}
          <div className="rounded-2xl px-4 py-3 flex items-start gap-3"
            style={{ background: '#F59E0B1A', border: '1px solid #F59E0B33' }}>
            <AlertCircle size={16} className="text-[#F59E0B] mt-0.5 flex-shrink-0" />
            <p className="text-[0.75rem] text-[#92400E] leading-relaxed">
              <span className="font-bold">IMPORTANTE:</span> Debes incluir el memo exacto en tu transferencia Stellar. Sin memo tu depósito no podrá ser acreditado.
            </p>
          </div>

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
              <p className="text-[0.6875rem] font-medium text-[#64748B] mb-1">Dirección de destino</p>
              <div className="flex items-center gap-2">
                <span className="flex-1 text-[0.75rem] font-mono text-[#0F172A] break-all">{instructions.stellarAddress}</span>
                <CopyBtn field="address" text={instructions.stellarAddress} />
              </div>
            </div>
            <div className="pt-2 border-t border-[#E2E8F0]">
              <p className="text-[0.6875rem] font-bold text-[#F59E0B] mb-1 uppercase tracking-wider">Memo obligatorio</p>
              <div className="flex items-center gap-2">
                <span className="flex-1 text-[0.9375rem] font-mono font-bold text-[#233E58]">{instructions.stellarMemo}</span>
                <CopyBtn field="memo" text={instructions.stellarMemo} />
              </div>
            </div>
          </div>

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

// ── Modal Convertir BOB → USDC ─────────────────────────────────────────────────

function ConvertModal({ open, onClose, onSuccess, bobBalance }) {
  const [amount, setAmount]   = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')

  function handleClose() {
    setAmount(''); setResult(null); setError(''); onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    const n = Number(amount)
    if (!n || n < 50)      return setError('El monto mínimo de conversión es Bs. 50.')
    if (n > bobBalance)    return setError(`Saldo BOB insuficiente. Disponible: ${formatBOB(bobBalance)}.`)
    setLoading(true)
    try {
      const data = await request('/wallet/usdc/convert-bob', {
        method: 'POST',
        body: JSON.stringify({ amount: n }),
      })
      setResult(data)
      onSuccess?.()
    } catch (err) {
      setError(err.message ?? 'Error al solicitar la conversión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Convertir BOB → USDC">
      {result ? (
        <div className="space-y-4">
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: '#F59E0B1A' }}>
              <ArrowRightLeft size={28} className="text-[#F59E0B]" />
            </div>
            <p className="text-[#0F172A] font-bold text-[1rem]">Solicitud enviada</p>
          </div>
          <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0] space-y-3">
            <div className="flex justify-between">
              <span className="text-[0.75rem] text-[#64748B]">Débito BOB</span>
              <span className="text-[0.875rem] font-bold text-[#F87171]">- {formatBOB(result.bobAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[0.75rem] text-[#64748B]">Crédito USDC estimado</span>
              <span className="text-[0.875rem] font-bold text-[#22C55E]">≈ {formatUSDC(result.usdcAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[0.75rem] text-[#64748B]">Tasa</span>
              <span className="text-[0.875rem] text-[#0F172A]">{result.bobPerUsdc?.toFixed(4)} BOB / 1 USDC</span>
            </div>
          </div>
          <p className="text-[0.75rem] text-[#64748B] text-center">El equipo Alyto confirmará la conversión en <span className="text-[#0F172A] font-semibold">1-4 horas hábiles</span>.</p>
          <button onClick={handleClose} className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white" style={{ background: '#233E58' }}>Cerrar</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl px-4 py-3 flex items-start gap-3"
            style={{ background: '#233E581A', border: '1px solid #233E5833' }}>
            <Info size={15} className="text-[#233E58] mt-0.5 flex-shrink-0" />
            <p className="text-[0.75rem] text-[#233E58] leading-relaxed">
              Convierte BOB de tu wallet al equivalente en USDC. La tasa es la tasa Alyto vigente.
            </p>
          </div>
          <div>
            <label className="block text-[0.75rem] font-medium text-[#64748B] mb-1.5">Monto a convertir (BOB)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] font-semibold text-sm">Bs.</span>
              <input type="number" min={50} value={amount} onChange={e => setAmount(e.target.value)} placeholder="100"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-3.5 text-[#0F172A] text-[0.9375rem] focus:border-[#233E58] focus:outline-none" />
            </div>
            <p className="text-[0.6875rem] text-[#94A3B8] mt-1">Mínimo Bs. 50. Disponible: {formatBOB(bobBalance)}</p>
          </div>
          {error && <p className="text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-4 py-3">{error}</p>}
          <button type="submit" disabled={loading || !amount}
            className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white disabled:opacity-40"
            style={{ background: '#233E58' }}>
            {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Solicitar conversión'}
          </button>
        </form>
      )}
    </Modal>
  )
}

// ── Tab de transacciones compartido ──────────────────────────────────────────

function TxList({ txs, txLoading, txPages, txPage, setTxPage, currency }) {
  const isCredit = (type) => ['deposit', 'receive', 'unfreeze', 'usdc_deposit'].includes(type)

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
        {txs.map(tx => (
          <div key={tx._id ?? tx.wtxId}
            className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
            style={{ background: 'white', border: '1px solid #E2E8F0' }}>
            <TxIcon type={tx.type} />
            <div className="flex-1 min-w-0">
              <p className="text-[0.875rem] font-semibold text-[#0F172A] truncate">
                {tx.description ?? tx.type}
              </p>
              <p className="text-[0.6875rem] text-[#94A3B8] mt-0.5">{formatDate(tx.createdAt)}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[0.9375rem] font-bold"
                style={{ color: isCredit(tx.type) ? '#22C55E' : '#F87171' }}>
                {isCredit(tx.type) ? '+' : '-'}
                {currency === 'USDC' ? formatUSDC(tx.amount) : formatBOB(tx.amount)}
              </p>
              <TxStatusBadge status={tx.status} />
            </div>
          </div>
        ))}
      </div>
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

  const [showUSDCDeposit, setShowUSDCDeposit] = useState(false)
  const [showConvert, setShowConvert]         = useState(false)

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

  const fetchTxs = useCallback(async (page = 1) => {
    setTxLoading(true)
    try {
      const data = await request(`/wallet/transactions?page=${page}&limit=10`)
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

  const fetchUSDCTxs = useCallback(async (page = 1) => {
    setUsdcTxLoading(true)
    try {
      const data = await request(`/wallet/usdc/transactions?page=${page}&limit=10`)
      setUsdcTxs(data.transactions ?? [])
      setUsdcTxTotal(data.pagination?.total ?? 0)
    } catch { /* silencioso */ } finally {
      setUsdcTxLoading(false)
    }
  }, [])

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
  useEffect(() => { fetchTxs(txPage) }, [fetchTxs, txPage])
  useEffect(() => { fetchWalletUSDC() }, [fetchWalletUSDC])
  useEffect(() => { fetchUSDCTxs(usdcTxPage) }, [fetchUSDCTxs, usdcTxPage])

  function handleRefresh() {
    fetchWallet(); fetchTxs(txPage)
    fetchWalletUSDC(); fetchUSDCTxs(usdcTxPage)
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
              <StatusBadge status={wallet?.status ?? 'active'} />
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
                  { label: 'QR',        icon: QrCode,          action: () => navigate('/wallet/qr'), primary: false },
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
            ) : (
              <div className="mt-4 rounded-2xl px-4 py-3 flex items-center gap-3"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <AlertCircle size={18} className="text-[#F87171] flex-shrink-0" />
                <p className="text-[0.8125rem] text-[#F87171]">
                  Wallet {wallet?.status === 'frozen' ? 'congelada por compliance ASFI' : 'suspendida'}. Contacta a soporte.
                </p>
              </div>
            )}
          </div>

          {/* Historial BOB */}
          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[1rem] font-bold text-[#0F172A]">Movimientos BOB</h2>
              {txLoading && <Loader2 size={14} className="animate-spin text-[#64748B]" />}
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
              background: 'linear-gradient(135deg, #1D4E6A 0%, #164060 55%, #0F3050 100%)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            }}>
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
              style={{ border: '1px solid rgba(255,255,255,0.15)' }} />

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
              <StatusBadge status={walletUSDC?.status ?? 'active'} />
            </div>

            {!usdcLoading && walletUSDC?.balanceReserved > 0 && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <p className="text-[0.625rem] text-white/60 uppercase tracking-wider">En conversión (pendiente)</p>
                <p className="text-[0.875rem] font-semibold text-white/80">{formatUSDC(walletUSDC.balanceReserved)}</p>
              </div>
            )}

            {/* Stellar address/memo hint */}
            {!usdcLoading && walletUSDC?.stellarMemo && (
              <div className="mt-4 pt-3 border-t border-white/20">
                <p className="text-[0.6875rem] text-white/60 mb-0.5">Tu memo Stellar</p>
                <p className="text-[0.9375rem] font-mono font-bold text-white">{walletUSDC.stellarMemo}</p>
              </div>
            )}

            {/* Botones de acción USDC */}
            {(walletUSDC?.status ?? 'active') === 'active' && (
              <div className="flex gap-3 mt-5">
                {[
                  { label: 'Depositar',  icon: ArrowDownToLine, action: openUSDCDeposit,             primary: true  },
                  { label: 'Convertir',  icon: ArrowRightLeft,  action: () => setShowConvert(true),  primary: false },
                ].map(({ label, icon: Icon, action, primary }) => (
                  <button key={label} onClick={action}
                    className="flex-1 flex flex-col items-center gap-2 py-3.5 rounded-2xl transition-all active:scale-95"
                    style={{
                      background: primary ? 'white' : 'rgba(255,255,255,0.18)',
                      border:     primary ? 'none'  : '1px solid rgba(255,255,255,0.3)',
                    }}>
                    <Icon size={20} style={{ color: primary ? '#164060' : 'white' }} />
                    <span className="text-[0.75rem] font-semibold" style={{ color: primary ? '#164060' : 'white' }}>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Historial USDC */}
          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[1rem] font-bold text-[#0F172A]">Movimientos USDC</h2>
              {usdcTxLoading && <Loader2 size={14} className="animate-spin text-[#64748B]" />}
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
      />
    </div>
  )
}
