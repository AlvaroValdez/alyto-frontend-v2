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
      expired ? 'bg-[#EF44441A] text-[#F87171]' :
      urgent  ? 'bg-[#F59E0B1A] text-[#FBBF24]' :
                'bg-[#1A2340] text-[#8A96B8]'
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

  function handleShare() {
    if (!qrData?.qrBase64) return
    if (navigator.share) {
      navigator.share({ title: 'QR Alyto', text: `Págame Bs. ${formatBOB(qrData.amount)} con Alyto` })
        .catch(() => {})
    } else {
      handleDownload()
    }
  }

  function handleDownload() {
    if (!qrData?.qrBase64) return
    const a = document.createElement('a')
    a.href     = qrData.qrBase64
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
        <div className="bg-white rounded-2xl p-4 shadow-[0_0_40px_rgba(196,203,216,0.12)]">
          <img src={qrData.qrBase64} alt="QR Alyto" className="w-64 h-64 rounded-xl" />
        </div>

        {/* Monto + nombre */}
        <div className="text-center">
          {qrData.amount != null && (
            <p className="text-[1.75rem] font-bold text-[#22C55E]">Bs. {formatBOB(qrData.amount)}</p>
          )}
          <p className="text-[0.875rem] text-[#8A96B8] mt-0.5">
            {user.firstName} {user.lastName}
          </p>
          {qrData.expiresAt && <CountdownBadge expiresAt={qrData.expiresAt} />}
        </div>

        {/* Acciones */}
        <div className="flex gap-3 w-full">
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[0.875rem] font-semibold"
            style={{ background: '#C4CBD8', color: '#0F1628' }}
          >
            <Share2 size={16} /> Compartir
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[0.875rem] font-semibold"
            style={{ background: '#1A2340', border: '1px solid #263050', color: '#C4CBD8' }}
          >
            <Download size={16} />
          </button>
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[0.875rem] font-semibold"
            style={{ background: '#1A2340', border: '1px solid #263050', color: '#C4CBD8' }}
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
      <div className="flex gap-2 p-1 rounded-xl" style={{ background: '#1A2340', border: '1px solid #263050' }}>
        {[
          { label: 'Monto fijo', val: true  },
          { label: 'Pagador elige', val: false },
        ].map(({ label, val }) => (
          <button
            key={String(val)}
            onClick={() => setFixedAmount(val)}
            className={`flex-1 py-2 rounded-lg text-[0.8125rem] font-semibold transition-all ${
              fixedAmount === val ? 'bg-[#C4CBD8] text-[#0F1628]' : 'text-[#8A96B8]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Input monto */}
      {fixedAmount && (
        <div>
          <label className="block text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-wide mb-2">
            Monto a cobrar
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A96B8] font-bold text-[1.125rem]">Bs</span>
            <input
              type="number"
              inputMode="decimal"
              min="1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-[#1A2340] border border-[#263050] rounded-xl pl-12 pr-4 py-4 text-white text-[1.5rem] font-bold focus:outline-none focus:border-[#C4CBD8] transition-all placeholder:text-[#4E5A7A]"
            />
          </div>
        </div>
      )}

      {/* Descripción */}
      <div>
        <label className="block text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-wide mb-2">
          Descripción (opcional)
        </label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxLength={80}
          placeholder="Ej: café, servicio, producto..."
          className="w-full bg-[#1A2340] border border-[#263050] rounded-xl px-4 py-3 text-white text-[0.9375rem] focus:outline-none focus:border-[#C4CBD8] transition-all placeholder:text-[#4E5A7A]"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: '#EF44441A', border: '1px solid #EF444433' }}>
          <AlertCircle size={14} className="text-[#F87171] flex-shrink-0" />
          <p className="text-[0.8125rem] text-[#F87171]">{error}</p>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full py-4 rounded-2xl text-[0.9375rem] font-bold flex items-center justify-center gap-2 transition-all"
        style={{ background: '#C4CBD8', color: '#0F1628', opacity: loading ? 0.7 : 1 }}
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
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#22C55E1A' }}>
          <CheckCircle2 size={32} className="text-[#22C55E]" />
        </div>
        <div>
          <p className="text-[1.5rem] font-bold text-[#22C55E]">Bs. {formatBOB(result.amount)}</p>
          <p className="text-[0.875rem] text-[#8A96B8] mt-1">Enviado a {result.recipient}</p>
          <p className="text-[0.75rem] text-[#4E5A7A] mt-0.5">
            Saldo actual: Bs. {formatBOB(result.balanceAfter)}
          </p>
        </div>
        <button
          onClick={handleReset}
          className="w-full py-3 rounded-2xl text-[0.875rem] font-semibold"
          style={{ background: '#1A2340', border: '1px solid #263050', color: '#C4CBD8' }}
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
        <div className="rounded-2xl p-5" style={{ background: '#1A2340', border: '1px solid #263050' }}>
          <p className="text-[0.75rem] text-[#4E5A7A] mb-1">Destinatario</p>
          <p className="text-[1rem] font-bold text-white">{preview.creatorName}</p>

          {preview.type !== 'deposit' && preview.amount != null && (
            <>
              <p className="text-[0.75rem] text-[#4E5A7A] mt-3 mb-1">Monto</p>
              <p className="text-[1.75rem] font-bold text-[#22C55E]">Bs. {formatBOB(preview.amount)}</p>
            </>
          )}

          {preview.type === 'deposit' && (
            <div className="mt-3">
              <label className="block text-[0.75rem] text-[#4E5A7A] mb-1">Monto a enviar</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A96B8] font-bold">Bs</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  value={depositAmt}
                  onChange={e => setDepositAmt(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#0F1628] border border-[#263050] rounded-xl pl-10 pr-4 py-3 text-white text-[1.25rem] font-bold focus:outline-none focus:border-[#C4CBD8] placeholder:text-[#4E5A7A]"
                />
              </div>
            </div>
          )}

          {preview.description && (
            <>
              <p className="text-[0.75rem] text-[#4E5A7A] mt-3 mb-1">Descripción</p>
              <p className="text-[0.875rem] text-[#C4CBD8]">{preview.description}</p>
            </>
          )}

          {preview.expiresAt && (
            <div className="mt-3">
              <CountdownBadge expiresAt={preview.expiresAt} />
            </div>
          )}
        </div>

        {payError && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: '#EF44441A', border: '1px solid #EF444433' }}>
            <AlertCircle size={14} className="text-[#F87171] flex-shrink-0" />
            <p className="text-[0.8125rem] text-[#F87171]">{payError}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 py-3 rounded-2xl text-[0.875rem] font-semibold"
            style={{ background: '#1A2340', border: '1px solid #263050', color: '#8A96B8' }}
          >
            Cancelar
          </button>
          <button
            onClick={handlePay}
            disabled={paying || (preview.type === 'deposit' && !depositAmt)}
            className="flex-1 py-3 rounded-2xl text-[0.875rem] font-semibold flex items-center justify-center gap-2 transition-all"
            style={{ background: '#C4CBD8', color: '#0F1628', opacity: paying ? 0.7 : 1 }}
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
        className="relative rounded-2xl overflow-hidden flex items-center justify-center"
        style={{ background: '#0F1628', border: '1px solid #263050', aspectRatio: '1/1' }}
      >
        {scanning ? (
          <>
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
            {/* Marco de escaneo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-white rounded-2xl opacity-60" />
            </div>
            <button
              onClick={stopCamera}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
            >
              <X size={14} className="text-white" />
            </button>
          </>
        ) : (
          <button
            onClick={startCamera}
            className="flex flex-col items-center gap-3 py-12"
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#1A2340' }}>
              <Camera size={28} className="text-[#C4CBD8]" />
            </div>
            <p className="text-[0.875rem] font-semibold text-[#C4CBD8]">Activar cámara</p>
            <p className="text-[0.75rem] text-[#4E5A7A]">Apunta al QR Alyto</p>
          </button>
        )}
        {/* Canvas oculto para jsQR */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {camError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: '#EF44441A', border: '1px solid #EF444433' }}>
          <CameraOff size={14} className="text-[#F87171] flex-shrink-0" />
          <p className="text-[0.8125rem] text-[#F87171]">{camError}</p>
        </div>
      )}

      {payError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: '#EF44441A', border: '1px solid #EF444433' }}>
          <AlertCircle size={14} className="text-[#F87171] flex-shrink-0" />
          <p className="text-[0.8125rem] text-[#F87171]">{payError}</p>
        </div>
      )}

      {/* Modo manual */}
      <button
        onClick={() => setManualMode(v => !v)}
        className="flex items-center justify-between px-4 py-3 rounded-xl text-[0.8125rem] text-[#8A96B8]"
        style={{ background: '#1A2340', border: '1px solid #263050' }}
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
            className="w-full bg-[#1A2340] border border-[#263050] rounded-xl px-4 py-3 text-[0.75rem] text-white focus:outline-none focus:border-[#C4CBD8] placeholder:text-[#4E5A7A] font-mono resize-none"
          />
          <button
            onClick={handleManualSubmit}
            disabled={!manualText.trim()}
            className="w-full py-3 rounded-xl text-[0.875rem] font-semibold transition-all"
            style={{ background: manualText.trim() ? '#C4CBD8' : '#C4CBD840', color: manualText.trim() ? '#0F1628' : '#4E5A7A' }}
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

  function handleShare() {
    if (!qrData?.qrBase64) return
    if (navigator.share) {
      navigator.share({ title: `QR Alyto de ${user.firstName}`, text: 'Escanéame para enviarme BOB en Alyto' })
        .catch(() => {})
    } else {
      handleDownload()
    }
  }

  function handleDownload() {
    if (!qrData?.qrBase64) return
    const a = document.createElement('a')
    a.href     = qrData.qrBase64
    a.download = `alyto-mi-qr-${user.firstName}.png`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 px-4">
        <Loader2 size={32} className="animate-spin text-[#C4CBD8]" />
        <p className="text-[0.875rem] text-[#8A96B8]">Generando tu QR...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4 px-4 py-2">
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: '#EF44441A', border: '1px solid #EF444433' }}>
          <AlertCircle size={14} className="text-[#F87171] flex-shrink-0" />
          <p className="text-[0.8125rem] text-[#F87171]">{error}</p>
        </div>
        <button onClick={() => handleGenerate(true)} className="w-full py-3 rounded-2xl text-[0.875rem] font-semibold" style={{ background: '#C4CBD8', color: '#0F1628' }}>
          Reintentar
        </button>
      </div>
    )
  }

  if (!qrData) return null

  return (
    <div className="flex flex-col items-center gap-5 px-4 py-2">
      {/* QR */}
      <div className="bg-white rounded-2xl p-4 shadow-[0_0_40px_rgba(196,203,216,0.12)]">
        <img src={qrData.qrBase64} alt="Mi QR Alyto" className="w-64 h-64 rounded-xl" />
      </div>

      {/* Nombre */}
      <div className="text-center">
        <p className="text-[1.125rem] font-bold text-white">{user.firstName} {user.lastName}</p>
        <p className="text-[0.8125rem] text-[#8A96B8] mt-0.5">QR permanente · Sin monto fijo</p>
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.6875rem] font-semibold" style={{ background: '#22C55E1A', color: '#22C55E' }}>
          Sin expiración
        </div>
      </div>

      <p className="text-[0.75rem] text-[#4E5A7A] text-center px-4">
        Cualquier usuario Alyto puede escanearlo para enviarte BOB directamente a tu wallet.
      </p>

      {/* Acciones */}
      <div className="flex gap-3 w-full">
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[0.875rem] font-semibold"
          style={{ background: '#C4CBD8', color: '#0F1628' }}
        >
          <Share2 size={16} /> Compartir
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl"
          style={{ background: '#1A2340', border: '1px solid #263050', color: '#C4CBD8' }}
        >
          <Download size={16} />
        </button>
        <button
          onClick={() => { localStorage.removeItem(FIXED_QR_KEY); handleGenerate(true) }}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl"
          style={{ background: '#1A2340', border: '1px solid #263050', color: '#C4CBD8' }}
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
    <div className="min-h-screen flex flex-col" style={{ background: '#0F1628' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-4" style={{ borderBottom: '1px solid #1A2340' }}>
        <button
          onClick={() => navigate('/wallet')}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#1A2340', border: '1px solid #263050' }}
        >
          <ArrowLeft size={18} className="text-[#C4CBD8]" />
        </button>
        <div>
          <h1 className="text-[1rem] font-bold text-white leading-tight">QR Alyto</h1>
          <p className="text-[0.75rem] text-[#4E5A7A]">Pagar y cobrar al instante</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mx-4 mt-4 mb-2 p-1 rounded-xl" style={{ background: '#1A2340', border: '1px solid #263050' }}>
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 py-2.5 rounded-lg text-[0.8125rem] font-semibold transition-all ${
              tab === id ? 'bg-[#C4CBD8] text-[#0F1628]' : 'text-[#8A96B8] hover:text-[#C4CBD8]'
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
