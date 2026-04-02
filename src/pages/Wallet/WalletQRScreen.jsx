/**
 * WalletQRScreen.jsx — QR Alyto Wallet (Fase 29)
 *
 * Tres tabs:
 *   1. Cobrar  — genera QR de cobro con monto fijo o libre
 *   2. Pagar   — escanea QR con cámara, confirma y paga
 *   3. Mi QR   — QR fijo permanente (type: deposit) para comercios
 *
 * Exclusivo para usuarios legalEntity === 'SRL' con KYC aprobado.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import jsQR from 'jsqr'
import {
  ArrowLeft, QrCode, Camera, CameraOff, Download, Share2,
  RefreshCw, Clock, CheckCircle2, AlertCircle, Loader2,
  ChevronRight, X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { request } from '../../services/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Superpone el logo de Alyto en el centro del QR base64.
 * Usa Canvas API del navegador — no requiere dependencias adicionales.
 * El logo ocupa ~22% del ancho del QR (seguro con errorCorrectionLevel 'H').
 */
async function overlayLogoOnQR(qrBase64) {
  return new Promise((resolve) => {
    const qrImg   = new Image()
    const logoImg = new Image()
    let loaded = 0

    const onLoad = () => {
      loaded++
      if (loaded < 2) return

      const size       = qrImg.naturalWidth  || 400
      const canvas     = document.createElement('canvas')
      canvas.width     = size
      canvas.height    = size
      const ctx        = canvas.getContext('2d')

      // Dibuja el QR base
      ctx.drawImage(qrImg, 0, 0, size, size)

      // Tamaño del logo: 22% del QR
      const logoSize  = Math.round(size * 0.22)
      const padding   = Math.round(logoSize * 0.18)
      const boxSize   = logoSize + padding * 2
      const x         = Math.round((size - boxSize) / 2)
      const y         = Math.round((size - boxSize) / 2)

      // Fondo blanco redondeado detrás del logo
      ctx.fillStyle = '#FFFFFF'
      const r = Math.round(boxSize * 0.18)
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + boxSize - r, y)
      ctx.quadraticCurveTo(x + boxSize, y, x + boxSize, y + r)
      ctx.lineTo(x + boxSize, y + boxSize - r)
      ctx.quadraticCurveTo(x + boxSize, y + boxSize, x + boxSize - r, y + boxSize)
      ctx.lineTo(x + r, y + boxSize)
      ctx.quadraticCurveTo(x, y + boxSize, x, y + boxSize - r)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.closePath()
      ctx.fill()

      // Dibuja el logo centrado sobre el fondo
      ctx.drawImage(logoImg, x + padding, y + padding, logoSize, logoSize)

      resolve(canvas.toDataURL('image/png'))
    }

    qrImg.onload   = onLoad
    logoImg.onload = onLoad
    qrImg.onerror  = () => resolve(qrBase64) // fallback: QR sin logo
    logoImg.onerror = () => resolve(qrBase64)

    qrImg.src   = qrBase64
    logoImg.src = '/assets/LogoAlytoBlack.png'
  })
}

/**
 * Hook: recibe qrBase64 del servidor y devuelve la versión con logo superpuesto.
 */
function useQRWithLogo(qrBase64) {
  const [composited, setComposited] = useState(null)

  useEffect(() => {
    if (!qrBase64) { setComposited(null); return }
    overlayLogoOnQR(qrBase64).then(setComposited)
  }, [qrBase64])

  return composited
}

function formatBOB(amount) {
  if (amount == null || amount === '') return ''
  return new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount))
}

function useCountdown(expiresAt) {
  const [secs, setSecs] = useState(null)

  useEffect(() => {
    if (!expiresAt) { setSecs(null); return }
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000))
      setSecs(remaining)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return secs
}

function CountdownBadge({ expiresAt }) {
  const secs = useCountdown(expiresAt)
  if (secs === null) return null
  const expired = secs <= 0
  const urgent  = secs <= 60

  const mm = String(Math.floor(secs / 60)).padStart(2, '0')
  const ss = String(secs % 60).padStart(2, '0')

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.75rem] font-semibold ${
      expired ? 'bg-[#EF44441A] text-[#EF4444]' :
      urgent  ? 'bg-[#F59E0B1A] text-[#F59E0B]' :
                'bg-[#F1F5F9] text-[#94A3B8]'
    }`}>
      <Clock size={12} />
      {expired ? 'Expirado' : `${mm}:${ss}`}
    </div>
  )
}

// ── Tab: Cobrar ───────────────────────────────────────────────────────────────

function TabCobrar({ user }) {
  const [fixedAmount, setFixedAmount]   = useState(true)
  const [amount,      setAmount]        = useState('')
  const [description, setDescription]  = useState('')
  const [loading,     setLoading]       = useState(false)
  const [qrData,      setQrData]        = useState(null)
  const [error,       setError]         = useState(null)

  async function handleGenerate() {
    setError(null)
    if (fixedAmount && (!amount || Number(amount) < 1)) {
      setError('Ingresa un monto válido (mínimo Bs. 1).')
      return
    }
    setLoading(true)
    try {
      const body = fixedAmount
        ? { type: 'charge', amount: Number(amount), description: description || undefined }
        : { type: 'deposit', description: description || undefined }

      const data = await request('/wallet/qr/generate', { method: 'POST', body: JSON.stringify(body) })
      setQrData(data)
    } catch (err) {
      setError(err.message || 'Error al generar el QR.')
    } finally {
      setLoading(false)
    }
  }

  const qrWithLogo = useQRWithLogo(qrData?.qrBase64)

  function handleShare() {
    const src = qrWithLogo ?? qrData?.qrBase64
    if (!src) return
    if (navigator.share) {
      navigator.share({ title: 'QR Alyto', text: `Págame Bs. ${formatBOB(qrData.amount)} con Alyto` })
        .catch(() => {})
    } else {
      handleDownload()
    }
  }

  function handleDownload() {
    const src = qrWithLogo ?? qrData?.qrBase64
    if (!src) return
    const a = document.createElement('a')
    a.href     = src
    a.download = `alyto-qr-${qrData.qrId}.png`
    a.click()
  }

  function handleReset() {
    setQrData(null)
    setAmount('')
    setDescription('')
    setError(null)
  }

  if (qrData) {
    return (
      <div className="flex flex-col items-center gap-5 px-4 py-2">
        {/* QR image */}
        <div className="bg-white rounded-2xl p-4 shadow-[0_4px_24px_rgba(15,23,42,0.08)] border border-[#E2E8F0]">
          <img src={qrWithLogo ?? qrData.qrBase64} alt="QR Alyto" className="w-64 h-64 rounded-xl" />
        </div>

        {/* Monto + nombre */}
        <div className="text-center">
          {qrData.amount != null && (
            <p className="text-[1.75rem] font-bold text-[#1D9E75]">Bs. {formatBOB(qrData.amount)}</p>
          )}
          <p className="text-[0.875rem] text-[#64748B] mt-0.5">
            {user.firstName} {user.lastName}
          </p>
          {qrData.expiresAt && <div className="mt-2 flex justify-center"><CountdownBadge expiresAt={qrData.expiresAt} /></div>}
        </div>

        {/* Acciones */}
        <div className="flex gap-3 w-full">
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[0.875rem] font-semibold text-white"
            style={{ background: '#1D9E75', boxShadow: '0 4px 20px rgba(29,158,117,0.25)' }}
          >
            <Share2 size={16} /> Compartir
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[0.875rem] font-semibold bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#1D9E7533] hover:text-[#1D9E75] transition-colors"
          >
            <Download size={16} />
          </button>
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[0.875rem] font-semibold bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#1D9E7533] hover:text-[#1D9E75] transition-colors"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-2">

      {/* Toggle monto fijo vs libre */}
      <div className="flex gap-2 p-1 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0]">
        {[
          { label: 'Monto fijo', val: true  },
          { label: 'Pagador elige', val: false },
        ].map(({ label, val }) => (
          <button
            key={String(val)}
            onClick={() => setFixedAmount(val)}
            className={`flex-1 py-2 rounded-lg text-[0.8125rem] font-semibold transition-all ${
              fixedAmount === val
                ? 'bg-[#1D9E75] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Input monto */}
      {fixedAmount && (
        <div>
          <label className="block text-[0.75rem] font-semibold text-[#94A3B8] uppercase tracking-wide mb-2">
            Monto a cobrar
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] font-bold text-[1.125rem]">Bs</span>
            <input
              type="number"
              inputMode="decimal"
              min="1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white border border-[#E2E8F0] rounded-xl pl-12 pr-4 py-4 text-[#0F172A] text-[1.5rem] font-bold focus:outline-none focus:border-[#1D9E75] focus:shadow-[0_0_0_3px_#1D9E7520] transition-all placeholder:text-[#CBD5E1]"
            />
          </div>
        </div>
      )}

      {/* Descripción */}
      <div>
        <label className="block text-[0.75rem] font-semibold text-[#94A3B8] uppercase tracking-wide mb-2">
          Descripción (opcional)
        </label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxLength={80}
          placeholder="Ej: café, servicio, producto..."
          className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0F172A] text-[0.9375rem] focus:outline-none focus:border-[#1D9E75] focus:shadow-[0_0_0_3px_#1D9E7520] transition-all placeholder:text-[#CBD5E1]"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
          <AlertCircle size={14} className="text-[#EF4444] flex-shrink-0" />
          <p className="text-[0.8125rem] text-[#EF4444]">{error}</p>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full py-4 rounded-2xl text-[0.9375rem] font-bold flex items-center justify-center gap-2 text-white transition-all disabled:opacity-50"
        style={{ background: '#1D9E75', boxShadow: '0 4px 20px rgba(29,158,117,0.25)' }}
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <QrCode size={18} />}
        {loading ? 'Generando...' : 'Generar QR'}
      </button>
    </div>
  )
}

// ── Tab: Pagar ────────────────────────────────────────────────────────────────

function TabPagar() {
  const videoRef        = useRef(null)
  const canvasRef       = useRef(null)
  const rafRef          = useRef(null)
  const streamRef       = useRef(null)

  const [camError,    setCamError]    = useState(null)
  const [scanning,    setScanning]    = useState(false)
  const [preview,     setPreview]     = useState(null)   // datos del QR previsualizado
  const [manualMode,  setManualMode]  = useState(false)
  const [manualText,  setManualText]  = useState('')
  const [depositAmt,  setDepositAmt]  = useState('')
  const [paying,      setPaying]      = useState(false)
  const [result,      setResult]      = useState(null)
  const [payError,    setPayError]    = useState(null)

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    setScanning(false)
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  async function startCamera() {
    setCamError(null)
    setPreview(null)
    setResult(null)
    setPayError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScanning(true)
      scanLoop()
    } catch {
      setCamError('No se pudo acceder a la cámara. Verifica los permisos.')
    }
  }

  function scanLoop() {
    if (!videoRef.current || !canvasRef.current) return
    const video  = videoRef.current
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')

    const tick = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width  = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)
        if (code?.data) {
          stopCamera()
          handleQrDetected(code.data)
          return
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  async function handleQrDetected(raw) {
    try {
      const encoded = encodeURIComponent(raw)
      const data = await request(`/wallet/qr/preview?qrContent=${encoded}`)
      setPreview({ ...data, _rawContent: raw })
    } catch (err) {
      setPayError(err.message || 'QR no reconocido como QR Alyto.')
    }
  }

  async function handleManualSubmit() {
    if (!manualText.trim()) return
    await handleQrDetected(manualText.trim())
  }

  async function handlePay() {
    if (!preview) return
    setPaying(true)
    setPayError(null)
    try {
      const body = { qrContent: preview._rawContent }
      if (preview.type === 'deposit') body.amount = Number(depositAmt)
      const data = await request('/wallet/qr/scan', { method: 'POST', body: JSON.stringify(body) })
      setResult(data)
      setPreview(null)
    } catch (err) {
      setPayError(err.message || 'Error al procesar el pago.')
    } finally {
      setPaying(false)
    }
  }

  function handleReset() {
    setPreview(null); setResult(null); setPayError(null)
    setManualText(''); setManualMode(false); setDepositAmt('')
  }

  // ── Pantalla de resultado ──
  if (result) {
    return (
      <div className="flex flex-col items-center gap-5 px-4 py-6 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center bg-[#1D9E751A] border border-[#1D9E7533]">
          <CheckCircle2 size={32} className="text-[#1D9E75]" />
        </div>
        <div>
          <p className="text-[1.5rem] font-bold text-[#1D9E75]">Bs. {formatBOB(result.amount)}</p>
          <p className="text-[0.875rem] text-[#64748B] mt-1">Enviado a {result.recipient}</p>
          <p className="text-[0.75rem] text-[#94A3B8] mt-0.5">
            Saldo actual: Bs. {formatBOB(result.balanceAfter)}
          </p>
        </div>
        <button
          onClick={handleReset}
          className="w-full py-3 rounded-2xl text-[0.875rem] font-semibold bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#1D9E7533] hover:text-[#1D9E75] transition-colors"
        >
          Nuevo pago
        </button>
      </div>
    )
  }

  // ── Pantalla de confirmación ──
  if (preview) {
    return (
      <div className="flex flex-col gap-4 px-4 py-2">
        <div className="rounded-2xl p-5 bg-white border border-[#E2E8F0]">
          <p className="text-[0.75rem] text-[#94A3B8] mb-1">Destinatario</p>
          <p className="text-[1rem] font-bold text-[#0F172A]">{preview.creatorName}</p>

          {preview.type !== 'deposit' && preview.amount != null && (
            <>
              <p className="text-[0.75rem] text-[#94A3B8] mt-3 mb-1">Monto</p>
              <p className="text-[1.75rem] font-bold text-[#1D9E75]">Bs. {formatBOB(preview.amount)}</p>
            </>
          )}

          {preview.type === 'deposit' && (
            <div className="mt-3">
              <label className="block text-[0.75rem] text-[#94A3B8] mb-1">Monto a enviar</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] font-bold">Bs</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  value={depositAmt}
                  onChange={e => setDepositAmt(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-3 text-[#0F172A] text-[1.25rem] font-bold focus:outline-none focus:border-[#1D9E75] focus:shadow-[0_0_0_3px_#1D9E7520] placeholder:text-[#CBD5E1]"
                />
              </div>
            </div>
          )}

          {preview.description && (
            <>
              <p className="text-[0.75rem] text-[#94A3B8] mt-3 mb-1">Descripción</p>
              <p className="text-[0.875rem] text-[#64748B]">{preview.description}</p>
            </>
          )}

          {preview.expiresAt && (
            <div className="mt-3">
              <CountdownBadge expiresAt={preview.expiresAt} />
            </div>
          )}
        </div>

        {payError && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
            <AlertCircle size={14} className="text-[#EF4444] flex-shrink-0" />
            <p className="text-[0.8125rem] text-[#EF4444]">{payError}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 py-3 rounded-2xl text-[0.875rem] font-semibold bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handlePay}
            disabled={paying || (preview.type === 'deposit' && !depositAmt)}
            className="flex-1 py-3 rounded-2xl text-[0.875rem] font-semibold flex items-center justify-center gap-2 text-white transition-all disabled:opacity-50"
            style={{ background: '#1D9E75', boxShadow: '0 4px 20px rgba(29,158,117,0.25)' }}
          >
            {paying ? <Loader2 size={16} className="animate-spin" /> : null}
            {paying ? 'Procesando...' : 'Confirmar pago'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-2">
      {/* Visor cámara */}
      <div
        className="relative rounded-2xl overflow-hidden flex items-center justify-center bg-[#F1F5F9] border border-[#E2E8F0]"
        style={{ aspectRatio: '1/1' }}
      >
        {scanning ? (
          <>
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
            {/* Marco de escaneo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-[#1D9E75] rounded-2xl opacity-80" />
            </div>
            <button
              onClick={stopCamera}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow-sm"
            >
              <X size={14} className="text-[#64748B]" />
            </button>
          </>
        ) : (
          <button
            onClick={startCamera}
            className="flex flex-col items-center gap-3 py-12"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white border border-[#E2E8F0] shadow-sm">
              <Camera size={28} className="text-[#1D9E75]" />
            </div>
            <p className="text-[0.875rem] font-semibold text-[#0F172A]">Activar cámara</p>
            <p className="text-[0.75rem] text-[#94A3B8]">Apunta al QR Alyto</p>
          </button>
        )}
        {/* Canvas oculto para jsQR */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {camError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
          <CameraOff size={14} className="text-[#EF4444] flex-shrink-0" />
          <p className="text-[0.8125rem] text-[#EF4444]">{camError}</p>
        </div>
      )}

      {payError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
          <AlertCircle size={14} className="text-[#EF4444] flex-shrink-0" />
          <p className="text-[0.8125rem] text-[#EF4444]">{payError}</p>
        </div>
      )}

      {/* Modo manual */}
      <button
        onClick={() => setManualMode(v => !v)}
        className="flex items-center justify-between px-4 py-3 rounded-xl text-[0.8125rem] text-[#64748B] bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] transition-colors"
      >
        <span>Ingresar código manualmente</span>
        <ChevronRight size={14} className={`transition-transform ${manualMode ? 'rotate-90' : ''}`} />
      </button>

      {manualMode && (
        <div className="flex flex-col gap-2">
          <textarea
            value={manualText}
            onChange={e => setManualText(e.target.value)}
            rows={4}
            placeholder='Pega el JSON del QR aquí...'
            className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-[0.75rem] text-[#0F172A] focus:outline-none focus:border-[#1D9E75] focus:shadow-[0_0_0_3px_#1D9E7520] placeholder:text-[#CBD5E1] font-mono resize-none"
          />
          <button
            onClick={handleManualSubmit}
            disabled={!manualText.trim()}
            className="w-full py-3 rounded-xl text-[0.875rem] font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: '#1D9E75', boxShadow: manualText.trim() ? '0 4px 20px rgba(29,158,117,0.25)' : 'none' }}
          >
            Verificar QR
          </button>
        </div>
      )}
    </div>
  )
}

// ── Tab: Mi QR fijo ───────────────────────────────────────────────────────────

const FIXED_QR_KEY = 'alyto_fixed_qr'

function TabMiQR({ user }) {
  const [qrData,   setQrData]   = useState(() => {
    try { return JSON.parse(localStorage.getItem(FIXED_QR_KEY)) } catch { return null }
  })
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  async function handleGenerate(force = false) {
    if (qrData && !force) return
    setLoading(true)
    setError(null)
    try {
      const data = await request('/wallet/qr/generate', {
        method: 'POST',
        body: JSON.stringify({ type: 'deposit' }),
      })
      localStorage.setItem(FIXED_QR_KEY, JSON.stringify(data))
      setQrData(data)
    } catch (err) {
      setError(err.message || 'Error al generar el QR.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!qrData) handleGenerate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const qrWithLogo = useQRWithLogo(qrData?.qrBase64)

  function handleShare() {
    const src = qrWithLogo ?? qrData?.qrBase64
    if (!src) return
    if (navigator.share) {
      navigator.share({ title: `QR Alyto de ${user.firstName}`, text: 'Escanéame para enviarme BOB en Alyto' })
        .catch(() => {})
    } else {
      handleDownload()
    }
  }

  function handleDownload() {
    const src = qrWithLogo ?? qrData?.qrBase64
    if (!src) return
    const a = document.createElement('a')
    a.href     = src
    a.download = `alyto-mi-qr-${user.firstName}.png`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 px-4">
        <Loader2 size={32} className="animate-spin text-[#1D9E75]" />
        <p className="text-[0.875rem] text-[#64748B]">Generando tu QR...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4 px-4 py-2">
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
          <AlertCircle size={14} className="text-[#EF4444] flex-shrink-0" />
          <p className="text-[0.8125rem] text-[#EF4444]">{error}</p>
        </div>
        <button
          onClick={() => handleGenerate(true)}
          className="w-full py-3 rounded-2xl text-[0.875rem] font-semibold text-white"
          style={{ background: '#1D9E75', boxShadow: '0 4px 20px rgba(29,158,117,0.25)' }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!qrData) return null

  return (
    <div className="flex flex-col items-center gap-5 px-4 py-2">
      {/* QR */}
      <div className="bg-white rounded-2xl p-4 shadow-[0_4px_24px_rgba(15,23,42,0.08)] border border-[#E2E8F0]">
        <img src={qrWithLogo ?? qrData.qrBase64} alt="Mi QR Alyto" className="w-64 h-64 rounded-xl" />
      </div>

      {/* Nombre */}
      <div className="text-center">
        <p className="text-[1.125rem] font-bold text-[#0F172A]">{user.firstName} {user.lastName}</p>
        <p className="text-[0.8125rem] text-[#64748B] mt-0.5">QR permanente · Sin monto fijo</p>
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.6875rem] font-semibold bg-[#1D9E751A] text-[#1D9E75]">
          Sin expiración
        </div>
      </div>

      <p className="text-[0.75rem] text-[#94A3B8] text-center px-4">
        Cualquier usuario Alyto puede escanearlo para enviarte BOB directamente a tu wallet.
      </p>

      {/* Acciones */}
      <div className="flex gap-3 w-full">
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[0.875rem] font-semibold text-white"
          style={{ background: '#1D9E75', boxShadow: '0 4px 20px rgba(29,158,117,0.25)' }}
        >
          <Share2 size={16} /> Compartir
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#1D9E7533] hover:text-[#1D9E75] transition-colors"
        >
          <Download size={16} />
        </button>
        <button
          onClick={() => { localStorage.removeItem(FIXED_QR_KEY); handleGenerate(true) }}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#1D9E7533] hover:text-[#1D9E75] transition-colors"
          title="Regenerar QR"
        >
          <RefreshCw size={16} />
        </button>
      </div>
    </div>
  )
}

// ── WalletQRScreen ────────────────────────────────────────────────────────────

const TABS = [
  { id: 'cobrar', label: 'Cobrar',  icon: QrCode   },
  { id: 'pagar',  label: 'Pagar',   icon: Camera   },
  { id: 'mi-qr',  label: 'Mi QR',   icon: QrCode   },
]

export default function WalletQRScreen() {
  const { user }    = useAuth()
  const navigate    = useNavigate()
  const [tab, setTab] = useState('cobrar')

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">

      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-safe pt-4 pb-4"
        style={{ borderBottom: '1px solid #E2E8F0' }}
      >
        <button
          onClick={() => navigate('/wallet')}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white border border-[#E2E8F0] shadow-sm"
        >
          <ArrowLeft size={18} className="text-[#64748B]" />
        </button>
        <div>
          <h1 className="text-[1rem] font-bold text-[#0F172A] leading-tight">QR Alyto</h1>
          <p className="text-[0.75rem] text-[#94A3B8]">Pagar y cobrar al instante</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mx-4 mt-4 mb-2 p-1 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0]">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2.5 rounded-lg text-[0.8125rem] font-semibold transition-all ${
              tab === id
                ? 'bg-[#1D9E75] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pt-2 pb-8">
        {tab === 'cobrar' && <TabCobrar user={user} />}
        {tab === 'pagar'  && <TabPagar />}
        {tab === 'mi-qr'  && <TabMiQR  user={user} />}
      </div>

    </div>
  )
}
