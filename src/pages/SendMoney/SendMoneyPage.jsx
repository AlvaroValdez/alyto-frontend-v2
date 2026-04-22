/**
 * @deprecated Send Money Flow v1.0 (docs/SEND_MONEY_FLOW.md §2).
 *
 * This 6-step orchestrator is superseded by the 3-step flow container at
 * src/pages/send-money/SendMoneyFlow.jsx. The router now points /send/* at
 * the new flow; this file is retained only to avoid breaking any lingering
 * deep-link imports until a cleanup pass removes it.
 *
 * --- Original documentation below ---
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

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, X } from 'lucide-react'

import { useAuth }               from '../../context/AuthContext'
import { useSendMoney }          from '../../hooks/useSendMoney'
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
  const { step, stepData, nextStep, prevStep, resetFlow } = useSendMoney()

  // Bolivia (SRL) usa Step2 para seleccionar método de pago (QR / transferencia).
  // Chile/LLC van directo a Step3 con Fintoc sin pasar por Step2.
  const isSRL = user?.legalEntity === 'SRL'

  const isSuccess = step === 6

  // Limpiar datos residuales de sessionStorage (versiones anteriores del app)
  // al entrar y al salir de la página de envío.
  useEffect(() => {
    resetFlow()
    return () => resetFlow()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleBack() {
    if (step <= 1) {
      navigate(-1)
    } else {
      prevStep()
    }
  }

  function handleCancel() {
    resetFlow()
    navigate('/')
  }

  function handleReset() {
    resetFlow()
  }

  return (
    <div className="flex flex-col">

      {/* ── Header ── */}
      {!isSuccess && (
        <header className="flex items-center justify-between px-4 pt-3 pb-3 flex-shrink-0">
          <button
            onClick={handleBack}
            className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:border-[#233E5833] transition-all"
          >
            <ArrowLeft size={18} />
          </button>

          <h1 className="text-[0.9375rem] font-bold text-[#0F172A]">
            {STEP_TITLES[step]}
          </h1>

          {step < 5 ? (
            <button
              onClick={handleCancel}
              className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:border-[#233E5833] transition-all"
            >
              <X size={18} />
            </button>
          ) : (
            <div className="w-9" />
          )}
        </header>
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
              if (isSRL) {
                // Bolivia: ir a Step2 para seleccionar metodo de pago (QR / transferencia)
                nextStep(data)
              } else if (data.quote?.payinMethod === 'manual' || data.quote?.isManualCorridor) {
                // CL→BO manual: ir a Step2 con instrucciones de transferencia
                nextStep({ ...data, payinMethod: 'manual', isManualCorridor: true })
              } else {
                // CL/LLC: solo Fintoc disponible, saltar Step2 directamente
                nextStep({ ...data, payinMethod: 'fintoc', _skipStep2: true }, 3)
              }
            }}
          />
        )}

        {step === 2 && (
          <Step2PayinMethod
            originCountry={isSRL ? 'BO' : 'CL'}
            stepData={stepData}
            onNext={(data) => nextStep(data)}
          />
        )}

        {step === 3 && (
          <Step3Beneficiary
            destinationCountry={stepData.destinationCountry}
            isManualCorridor={stepData.isManualCorridor === true}
            onNext={(data) => nextStep(data)}
          />
        )}

        {step === 4 && (
          <Step4Confirm
            stepData={stepData}
            onNext={(data) => nextStep(data)}
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
    </div>
  )
}
