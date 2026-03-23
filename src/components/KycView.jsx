import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ShieldCheck,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Camera,
  CreditCard,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { LEGAL_TERMS, ENTITY_NAMES, ENTITY_JURISDICTIONS } from '../utils/legalTerms'
import { submitKyc } from '../services/api'

// ── File Drop Zone ───────────────────────────────────────────────────────────

function FileDropZone({ id, label, hint, icon: Icon, file, onFileChange, accept }) {
  const inputRef      = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragging(false), [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) onFileChange(dropped)
  }, [onFileChange])

  const handleInputChange = (e) => {
    const selected = e.target.files?.[0]
    if (selected) onFileChange(selected)
  }

  const clearFile = (e) => {
    e.stopPropagation()
    onFileChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const hasFile = Boolean(file)

  return (
    <div>
      <p className="text-[0.8125rem] font-semibold text-[#8A96B8] mb-2">{label}</p>
      <button
        type="button"
        onClick={() => !hasFile && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`w-full rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-2 py-6 px-4 text-center
          ${hasFile
            ? 'border-[#22C55E] bg-[#22C55E08] cursor-default'
            : dragging
              ? 'border-[#C4CBD8] bg-[#C4CBD80D] cursor-copy'
              : 'border-[#263050] bg-[#0F1628] hover:border-[#C4CBD833] hover:bg-[#C4CBD808] cursor-pointer'
          }`}
      >
        {hasFile ? (
          <>
            <div className="w-10 h-10 rounded-xl bg-[#22C55E1A] flex items-center justify-center">
              <CheckCircle2 size={20} className="text-[#22C55E]" />
            </div>
            <div className="flex items-center gap-2">
              <p className="text-[0.8125rem] font-medium text-[#22C55E] truncate max-w-[180px]">
                {file.name}
              </p>
              <button
                type="button"
                onClick={clearFile}
                className="w-5 h-5 rounded-full bg-[#EF44441A] flex items-center justify-center flex-shrink-0"
              >
                <X size={11} className="text-[#EF4444]" />
              </button>
            </div>
            <p className="text-[0.6875rem] text-[#4E5A7A]">
              {(file.size / 1024).toFixed(0)} KB
            </p>
          </>
        ) : (
          <>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors
              ${dragging ? 'bg-[#C4CBD81A]' : 'bg-[#1A2340]'}`}>
              <Icon size={20} className={dragging ? 'text-[#C4CBD8]' : 'text-[#4E5A7A]'} />
            </div>
            <p className="text-[0.8125rem] font-medium text-[#8A96B8]">
              Arrastra o <span className="text-[#C4CBD8] underline underline-offset-2">selecciona</span>
            </p>
            <p className="text-[0.6875rem] text-[#4E5A7A]">{hint}</p>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  )
}

// ── Progress Step Indicator ──────────────────────────────────────────────────

function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-300
            ${i < current ? 'bg-[#22C55E] w-6' : i === current ? 'bg-[#C4CBD8] w-6' : 'bg-[#263050] w-3'}`}
        />
      ))}
    </div>
  )
}

// ── Main KYC View ────────────────────────────────────────────────────────────

export default function KycView() {
  const navigate       = useNavigate()
  const { user, updateUser } = useAuth()

  // Determine entity — fallback to LLC if missing
  const entity    = user?.legalEntity ?? 'LLC'
  const terms     = LEGAL_TERMS[entity]    ?? LEGAL_TERMS.LLC
  const entName   = ENTITY_NAMES[entity]   ?? 'AV Finance LLC'
  const entJuris  = ENTITY_JURISDICTIONS[entity] ?? 'Delaware, EE.UU.'

  // Files
  const [frontDoc,  setFrontDoc]  = useState(null)
  const [backDoc,   setBackDoc]   = useState(null)
  const [selfie,    setSelfie]    = useState(null)

  // ToS
  const [tosAccepted,  setTosAccepted]  = useState(false)
  const [tosScrolled,  setTosScrolled]  = useState(false)
  const tosRef = useRef(null)

  // Submission
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)

  // Track scroll to enforce user reads the contract
  const handleTosScroll = () => {
    if (!tosRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = tosRef.current
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      setTosScrolled(true)
    }
  }

  // Derived state
  const filesComplete = frontDoc && backDoc && selfie
  const canSubmit     = filesComplete && tosAccepted && !loading

  // Count steps: documents (1-3) + ToS (4) = 4 steps; completed = docs + tos
  const completedSteps = [frontDoc, backDoc, selfie, tosAccepted].filter(Boolean).length

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return

    setError('')
    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('documentFront', frontDoc)
      formData.append('documentBack',  backDoc)
      formData.append('selfie',        selfie)
      formData.append('tosAccepted',   'true')
      formData.append('legalEntity',   entity)
      formData.append('tosVersion',    '2026-03-19')

      const result = await submitKyc(formData)

      // Actualizar usuario en contexto si el backend retorna user actualizado
      if (result?.user) {
        updateUser(result.user)
      } else {
        // Para desarrollo: simular aprobación local
        updateUser({ ...user, kycStatus: 'approved' })
      }

      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Error al enviar la verificación. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-[#0F1628] font-sans flex flex-col items-center justify-center px-6 max-w-[430px] mx-auto">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
          style={{ background: 'radial-gradient(circle, #22C55E1A 0%, #22C55E08 100%)', border: '2px solid #22C55E33' }}
        >
          <ShieldCheck size={36} className="text-[#22C55E]" />
        </div>
        <h2 className="text-[1.375rem] font-bold text-white text-center mb-2">
          ¡Verificación enviada!
        </h2>
        <p className="text-[0.875rem] text-[#8A96B8] text-center leading-relaxed mb-8">
          Tu documentación fue recibida correctamente. Tu perfil está siendo revisado por el equipo de cumplimiento de{' '}
          <span className="text-[#C4CBD8] font-medium">{entName}</span>.
        </p>
        <div className="w-full bg-[#1A2340] rounded-2xl p-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#C4CBD81A] flex items-center justify-center flex-shrink-0">
              <FileText size={16} className="text-[#C4CBD8]" />
            </div>
            <div>
              <p className="text-[0.8125rem] font-semibold text-white">Tiempo estimado de revisión</p>
              <p className="text-[0.75rem] text-[#8A96B8]">24–48 horas hábiles</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate('/')}
          className="w-full py-4 rounded-2xl font-bold text-[0.9375rem] text-[#0F1628]"
          style={{
            background: '#C4CBD8',
            boxShadow: '0 4px 20px rgba(196,203,216,0.3)',
          }}
        >
          Volver al inicio
        </button>
      </div>
    )
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0F1628] font-sans flex flex-col max-w-[430px] mx-auto">

      {/* ── STATUS BAR ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-1">
        <span className="text-[0.8125rem] font-semibold text-white">9:41</span>
        <div className="flex items-center gap-1.5 text-white">
          <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor" opacity="0.9">
            <rect x="0" y="3" width="3" height="9" rx="1"/>
            <rect x="4.5" y="2" width="3" height="10" rx="1"/>
            <rect x="9" y="0.5" width="3" height="11.5" rx="1"/>
            <rect x="13.5" y="0" width="3" height="12" rx="1" opacity="0.3"/>
          </svg>
          <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
            <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="currentColor" strokeOpacity="0.35"/>
            <rect x="2" y="2" width="17" height="8" rx="2" fill="currentColor"/>
            <path d="M23 4.5V7.5C23.8 7.2 24.5 6.4 24.5 6C24.5 5.6 23.8 4.8 23 4.5Z" fill="currentColor" fillOpacity="0.4"/>
          </svg>
        </div>
      </div>

      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-5 pt-4 pb-6">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-xl bg-[#1A2340] border border-[#263050] flex items-center justify-center flex-shrink-0"
        >
          <ArrowLeft size={18} className="text-[#8A96B8]" />
        </button>
        <div className="flex-1">
          <p className="text-[0.75rem] text-[#8A96B8]">Verificación de identidad</p>
          <h1 className="text-[1.0625rem] font-bold text-white leading-tight">Activar cuenta</h1>
        </div>
        <StepIndicator current={completedSteps} total={4} />
      </header>

      {/* ── SCROLL AREA ──────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-10">

        {/* ── ENTITY CARD ─────────────────────────────────────────────── */}
        <div
          className="rounded-2xl px-4 py-3 mb-5 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, #1D3461 0%, #162035 100%)',
            border: '1px solid #C4CBD820',
          }}
        >
          <div className="w-10 h-10 rounded-xl bg-[#C4CBD81A] flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={18} className="text-[#C4CBD8]" />
          </div>
          <div className="flex-1">
            <p className="text-[0.8125rem] font-bold text-white">{entName}</p>
            <p className="text-[0.6875rem] text-[#8A96B8]">
              {entity} · {entJuris}
            </p>
          </div>
          <span
            className="text-[0.625rem] font-bold px-2 py-1 rounded-lg"
            style={{ background: '#C4CBD81A', color: '#C4CBD8', border: '1px solid #C4CBD833' }}
          >
            {entity}
          </span>
        </div>

        {/* ── SECTION: DOCUMENTOS ─────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-[#C4CBD81A] flex items-center justify-center">
              <CreditCard size={13} className="text-[#C4CBD8]" />
            </div>
            <p className="text-[0.9375rem] font-bold text-white">Documento de identidad</p>
          </div>

          <div className="flex flex-col gap-3">
            <FileDropZone
              id="front-doc"
              label="Frente del documento"
              hint="Cédula, pasaporte o DNI · JPG, PNG o PDF · Máx. 10 MB"
              icon={CreditCard}
              file={frontDoc}
              onFileChange={setFrontDoc}
              accept="image/*,application/pdf"
            />

            <FileDropZone
              id="back-doc"
              label="Reverso del documento"
              hint="Parte trasera del documento de identidad · JPG, PNG o PDF"
              icon={FileText}
              file={backDoc}
              onFileChange={setBackDoc}
              accept="image/*,application/pdf"
            />
          </div>
        </div>

        {/* ── SECTION: SELFIE ──────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-[#C4CBD81A] flex items-center justify-center">
              <Camera size={13} className="text-[#C4CBD8]" />
            </div>
            <p className="text-[0.9375rem] font-bold text-white">Selfie de liveness</p>
          </div>

          <FileDropZone
            id="selfie"
            label="Fotografía de verificación"
            hint="Selfie sosteniendo tu documento · JPG o PNG · Buena iluminación"
            icon={Camera}
            file={selfie}
            onFileChange={setSelfie}
            accept="image/*"
          />

          <p className="text-[0.6875rem] text-[#4E5A7A] mt-2 leading-relaxed px-1">
            Asegúrate que tu rostro y el documento sean claramente visibles. Sin filtros ni recortes.
          </p>
        </div>

        {/* ── DIVIDER ─────────────────────────────────────────────────── */}
        <div className="border-t border-[#1A2340] mb-6" />

        {/* ── SECTION: TÉRMINOS DE SERVICIO ───────────────────────────── */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-[#C4CBD81A] flex items-center justify-center">
              <FileText size={13} className="text-[#C4CBD8]" />
            </div>
            <p className="text-[0.9375rem] font-bold text-white">Términos de Servicio</p>
          </div>

          {/* Contract scroll box */}
          <div
            ref={tosRef}
            onScroll={handleTosScroll}
            className="relative rounded-2xl overflow-y-auto"
            style={{
              height: '200px',
              background: '#0A101F',
              border: '1px solid #263050',
            }}
          >
            <pre
              className="p-4 text-[0.6875rem] text-[#8A96B8] leading-relaxed whitespace-pre-wrap font-sans"
            >
              {terms}
            </pre>

            {/* Scroll gradient hint — fades once user scrolled */}
            {!tosScrolled && (
              <div
                className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
                style={{ background: 'linear-gradient(to top, #0A101F 0%, transparent 100%)' }}
              />
            )}
          </div>

          {/* Read indicator */}
          <div className="flex items-center gap-2 mt-2 px-1">
            <div className={`w-1.5 h-1.5 rounded-full ${tosScrolled ? 'bg-[#22C55E]' : 'bg-[#263050]'}`} />
            <p className={`text-[0.6875rem] ${tosScrolled ? 'text-[#22C55E]' : 'text-[#4E5A7A]'}`}>
              {tosScrolled ? 'Has leído el contrato completo' : 'Desplázate para leer el contrato completo'}
            </p>
          </div>
        </div>

        {/* ── CHECKBOX ToS ────────────────────────────────────────────── */}
        <label
          className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all duration-200 mb-5
            ${tosAccepted
              ? 'border-[#22C55E33] bg-[#22C55E08]'
              : 'border-[#263050] bg-[#1A2340] hover:border-[#C4CBD833]'
            }`}
        >
          <div className="flex-shrink-0 mt-0.5">
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center border-2 transition-all duration-200
                ${tosAccepted
                  ? 'bg-[#22C55E] border-[#22C55E]'
                  : 'bg-transparent border-[#4E5A7A]'
                }`}
            >
              {tosAccepted && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="#0F1628" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </div>
          <div className="flex-1">
            <p className="text-[0.8125rem] font-semibold text-white leading-snug">
              He leído y acepto los Términos de Servicio y la Política de Privacidad de{' '}
              <span className="text-[#C4CBD8]">{entName}</span>
            </p>
            <p className="text-[0.6875rem] text-[#4E5A7A] mt-1">
              Jurisdicción: {entJuris} · Versión del contrato: 19 mar 2026
            </p>
          </div>
          <input
            type="checkbox"
            className="hidden"
            checked={tosAccepted}
            onChange={(e) => setTosAccepted(e.target.checked)}
            required
          />
        </label>

        {/* ── ERROR BANNER ─────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#EF44441A] border border-[#EF444433] mb-5">
            <AlertCircle size={16} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
            <p className="text-[0.8125rem] text-[#F87171]">{error}</p>
          </div>
        )}

        {/* ── REQUIREMENTS CHECKLIST ──────────────────────────────────── */}
        {!filesComplete && (
          <div className="bg-[#1A2340] rounded-2xl p-4 mb-5">
            <p className="text-[0.75rem] font-semibold text-[#8A96B8] mb-3">Requisitos pendientes:</p>
            <div className="flex flex-col gap-2">
              {[
                { label: 'Documento frontal',   done: Boolean(frontDoc)  },
                { label: 'Documento reverso',   done: Boolean(backDoc)   },
                { label: 'Selfie de liveness',  done: Boolean(selfie)    },
                { label: 'Aceptación de ToS',   done: tosAccepted        },
              ].map(({ label, done }) => (
                <div key={label} className="flex items-center gap-2.5">
                  {done
                    ? <CheckCircle2 size={14} className="text-[#22C55E] flex-shrink-0" />
                    : <div className="w-3.5 h-3.5 rounded-full border-2 border-[#263050] flex-shrink-0" />
                  }
                  <p className={`text-[0.75rem] ${done ? 'text-[#22C55E]' : 'text-[#4E5A7A]'}`}>
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SUBMIT BUTTON ────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full py-4 rounded-2xl font-bold text-[0.9375rem] flex items-center justify-center gap-2.5 transition-all duration-200
            ${canSubmit
              ? 'text-[#0F1628] hover:opacity-90'
              : 'text-[#4E5A7A] cursor-not-allowed'
            }`}
          style={{
            background: canSubmit
              ? '#C4CBD8'
              : '#1A2340',
            boxShadow: canSubmit ? '0 4px 20px rgba(196,203,216,0.3)' : 'none',
            border: canSubmit ? 'none' : '1px solid #263050',
          }}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Enviando documentación…</span>
            </>
          ) : (
            <>
              <Upload size={18} />
              <span>
                {canSubmit
                  ? 'Enviar verificación de identidad'
                  : 'Completa todos los requisitos'
                }
              </span>
            </>
          )}
        </button>

        {/* ── LEGAL FOOTER ────────────────────────────────────────────── */}
        <p className="text-[0.625rem] text-[#4E5A7A] text-center mt-4 leading-relaxed px-2">
          Tus documentos se procesan de forma segura bajo los estándares KYC/AML de{' '}
          <span className="text-[#8A96B8]">{entName}</span> y nunca se comparten con terceros sin tu consentimiento.
        </p>

      </form>
    </div>
  )
}
