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

import { useNavigate } from 'react-router-dom'
import { ArrowLeft, X } from 'lucide-react'

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
  const { step, stepData, nextStep, prevStep, resetFlow } = useSendMoney()

  const isSuccess = step === 6

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
    <div className="min-h-screen bg-[#0F1628] font-sans flex flex-col max-w-[430px] mx-auto">

      {/* ── Header ── */}
      {!isSuccess && (
        <header className="flex items-center justify-between px-4 pt-12 pb-3 flex-shrink-0">
          <button
            onClick={handleBack}
            className="w-9 h-9 rounded-xl bg-[#1A2340] border border-[#263050] flex items-center justify-center text-[#8A96B8] hover:text-white hover:border-[#C4CBD833] transition-all"
          >
            <ArrowLeft size={18} />
          </button>

          <h1 className="text-[0.9375rem] font-bold text-white">
            {STEP_TITLES[step]}
          </h1>

          {step < 5 ? (
            <button
              onClick={handleCancel}
              className="w-9 h-9 rounded-xl bg-[#1A2340] border border-[#263050] flex items-center justify-center text-[#8A96B8] hover:text-white hover:border-[#C4CBD833] transition-all"
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
              // V2.0: origen siempre CL → Fintoc es el único método disponible.
              // Saltar Step 2 directamente. Step 2 queda como fallback para
              // futuros corredores con múltiples métodos de pago.
              nextStep({ ...data, payinMethod: 'fintoc', _skipStep2: true }, 3)
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
