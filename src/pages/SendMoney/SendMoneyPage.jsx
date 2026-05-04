/**
 * SendMoneyPage.jsx — Página principal del flujo de pago cross-border.
 *
 * Orquesta los 6 pasos:
 *   1. Step1Amount       — ¿Cuánto envías y a dónde?
 *   2. Step2PayinMethod  — ¿Cómo pagas?
 *   3. Step3Beneficiary  — ¿A quién le envías?
 *   4. Step4Confirm      — Confirma el envío
 *   5. Step5PaymentWidget — Widget de pago del proveedor
 *   6. Step6Success      — ¡Tu dinero está en camino!
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, X, AlertTriangle } from 'lucide-react'

import { useSendMoney }          from '../../hooks/useSendMoney'
import { useAuth }               from '../../context/AuthContext'
import StepIndicator             from '../../components/SendMoney/StepIndicator'
import Step1Amount               from '../../components/SendMoney/Step1Amount'
import Step2PayinMethod          from '../../components/SendMoney/Step2PayinMethod'
import Step3Beneficiary          from '../../components/SendMoney/Step3Beneficiary'
import Step4Confirm              from '../../components/SendMoney/Step4Confirm'
import Step5PaymentWidget        from '../../components/SendMoney/Step5PaymentWidget'
import Step6Success              from '../../components/SendMoney/Step6Success'

const STEP_TITLES = {
  1: 'Enviar dinero',
  2: 'Método de pago',
  3: 'Beneficiario',
  4: 'Confirmación',
  5: 'Pago',
  6: 'Listo',
}

export default function SendMoneyPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { step, stepData, nextStep, prevStep, resetFlow, goToStep } = useSendMoney()

  const isSuccess    = step === 6
  const hasPendingTx = !!stepData.transactionId && !isSuccess

  const [showLeaveWarning, setShowLeaveWarning] = useState(false)

  // Ref para saber si el popstate lo disparamos nosotros (pushState) o el usuario
  const blockingRef = useRef(false)

  // ── Interceptar el botón "atrás" del navegador con pushState/popstate ──────
  useEffect(() => {
    if (!hasPendingTx) return

    // Inyectamos una entrada en el historial para que el "back" del browser
    // dispare popstate en lugar de salir de /send
    window.history.pushState({ __alytoBlock: true }, '')
    blockingRef.current = true

    const handlePopState = () => {
      if (!blockingRef.current) return
      // Re-inyectar para que el siguiente "back" también quede interceptado
      window.history.pushState({ __alytoBlock: true }, '')
      setShowLeaveWarning(true)
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      blockingRef.current = false
    }
  }, [hasPendingTx])

  // ── Bloquear cierre/recarga de pestaña ─────────────────────────────────────
  useEffect(() => {
    if (!hasPendingTx) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasPendingTx])

  // Limpiar datos residuales al entrar y salir
  useEffect(() => {
    resetFlow()
    return () => resetFlow()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleBack() {
    if (hasPendingTx) {
      setShowLeaveWarning(true)
      return
    }
    if (step <= 1) {
      navigate(-1)
    } else {
      prevStep()
    }
  }

  function handleCancel() {
    if (hasPendingTx) {
      setShowLeaveWarning(true)
      return
    }
    resetFlow()
    navigate('/')
  }

  function handleReset() {
    resetFlow()
  }

  function handleLeaveConfirm() {
    blockingRef.current = false
    resetFlow()
    setShowLeaveWarning(false)
    navigate('/transactions')
  }

  function handleLeaveDismiss() {
    setShowLeaveWarning(false)
  }

  function handleRefreshQuote() {
    goToStep(1, { quote: null, quoteFetchedAt: null })
  }

  return (
    <div className="font-sans flex flex-col max-w-[430px] mx-auto">

      {/* ── Sub-header de pasos (bajo el AppLayout header) ── */}
      {!isSuccess && (
        <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0">
          <button
            onClick={handleBack}
            className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center text-[#4A5568] hover:text-[#0D1F3C] hover:border-[#1D3461] transition-all"
          >
            <ArrowLeft size={18} />
          </button>

          <span className="text-[0.9375rem] font-bold text-[#0D1F3C]">
            {STEP_TITLES[step]}
          </span>

          {step < 5 ? (
            <button
              onClick={handleCancel}
              className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center text-[#4A5568] hover:text-[#0D1F3C] hover:border-[#1D3461] transition-all"
            >
              <X size={18} />
            </button>
          ) : (
            <div className="w-9" />
          )}
        </div>
      )}

      {/* ── Step Indicator (no se muestra en success) ── */}
      {!isSuccess && (
        <div className="flex-shrink-0">
          <StepIndicator currentStep={step} skipStep2={!!stepData._skipStep2} />
        </div>
      )}

      {/* ── Contenido del paso activo ── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pt-2">
        {step === 1 && (
          <Step1Amount
            initialData={stepData}
            onNext={(data) => {
              const isManual = user?.legalEntity === 'SRL' || user?.legalEntity === 'LLC'
              nextStep({ ...data, payinMethod: isManual ? 'manual' : 'fintoc', _skipStep2: true }, 3)
            }}
          />
        )}

        {step === 2 && (
          <Step2PayinMethod
            onNext={(data) => nextStep(data)}
          />
        )}

        {step === 3 && (
          <Step3Beneficiary
            destinationCountry={stepData.destinationCountry}
            onNext={(data) => nextStep(data)}
          />
        )}

        {step === 4 && (
          <Step4Confirm
            stepData={stepData}
            onNext={(data) => nextStep(data)}
            onRefreshQuote={handleRefreshQuote}
          />
        )}

        {step === 5 && (
          <Step5PaymentWidget
            stepData={stepData}
            onNext={(data) => nextStep(data)}
          />
        )}

        {step === 6 && (
          <Step6Success
            stepData={stepData}
            onReset={handleReset}
          />
        )}
      </div>

      {/* ── Modal: advertencia de transacción pendiente ── */}
      {showLeaveWarning && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={handleLeaveDismiss}
        >
          <div
            className="w-full max-w-[430px] bg-white rounded-t-3xl px-6 pt-6 pb-10"
            style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-[#E2E8F0] mx-auto mb-5" />

            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#F59E0B1A] flex items-center justify-center">
                <AlertTriangle size={26} className="text-[#F59E0B]" />
              </div>

              <div>
                <h3 className="text-[1.0625rem] font-bold text-[#0D1F3C] mb-2">
                  Tu transferencia está esperando pago
                </h3>
                <p className="text-[0.8125rem] text-[#4A5568] leading-relaxed">
                  La transferencia fue creada y está pendiente de pago. Si sales ahora,
                  encuéntrala en <strong className="text-[#0D1F3C]">Mis transferencias</strong> para completarla cuando quieras.
                </p>
                {stepData.transactionId && (
                  <p className="text-[0.6875rem] text-[#94A3B8] mt-2 font-mono">
                    ID: {stepData.transactionId.slice(0, 8)}…{stepData.transactionId.slice(-6)}
                  </p>
                )}
              </div>

              <div className="w-full flex flex-col gap-2.5 mt-1">
                <button
                  onClick={handleLeaveDismiss}
                  className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] bg-[#0D1F3C] text-white"
                >
                  Continuar con el pago
                </button>
                <button
                  onClick={handleLeaveConfirm}
                  className="w-full py-3 rounded-2xl font-semibold text-[0.875rem] text-[#4A5568] border border-[#E2E8F0]"
                >
                  Ver mis transferencias
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
