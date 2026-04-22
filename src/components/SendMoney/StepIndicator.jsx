/**
 * @deprecated Send Money Flow v1.0 (docs/SEND_MONEY_FLOW.md §2).
 *
 * Replaced by the 3-dot StepDots indicator embedded in
 * src/pages/send-money/SendMoneyFlow.jsx. The new flow has exactly 3
 * steps (details / review / payment) with no branching on payin method.
 *
 * --- Original documentation below ---
 * StepIndicator.jsx — Barra de progreso visual para el flujo de pasos.
 * El paso 6 (éxito) no necesita indicador.
 */

import { Check } from 'lucide-react'

const STEPS_FULL = [
  { number: 1, label: 'Monto' },
  { number: 2, label: 'Pago' },
  { number: 3, label: 'Destinatario' },
  { number: 4, label: 'Confirmar' },
  { number: 5, label: 'Transferencia' },
]

const STEPS_SKIP2 = [
  { number: 1, label: 'Monto' },
  { number: 3, label: 'Destinatario' },
  { number: 4, label: 'Confirmar' },
  { number: 5, label: 'Transferencia' },
]

export default function StepIndicator({ currentStep, skipStep2 = false }) {
  const steps = skipStep2 ? STEPS_SKIP2 : STEPS_FULL

  return (
    <div className="flex items-center justify-between px-4 py-3">
      {steps.map((s, idx) => {
        const isDone      = currentStep > s.number
        const isActive    = currentStep === s.number
        const isLast      = idx === steps.length - 1
        const displayNum  = idx + 1   // número visual 1-based

        return (
          <div key={s.number} className="flex items-center flex-1">
            {/* Círculo del paso */}
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[0.6875rem] font-bold transition-all duration-200 ${
                  isDone
                    ? 'bg-[#233E58] text-white'
                    : isActive
                      ? 'bg-[#233E58] text-white shadow-[0_0_0_3px_#233E5833]'
                      : 'bg-[#F1F5F9] border border-[#E2E8F0] text-[#94A3B8]'
                }`}
              >
                {isDone ? <Check size={13} /> : displayNum}
              </div>
              <span
                className={`text-[0.5625rem] font-medium mt-1 whitespace-nowrap ${
                  isActive ? 'text-[#233E58]' : isDone ? 'text-[#233E58]' : 'text-[#94A3B8]'
                }`}
              >
                {s.label}
              </span>
            </div>

            {/* Línea conectora */}
            {!isLast && (
              <div
                className={`flex-1 h-px mx-1 mb-4 transition-all duration-300 ${
                  currentStep > s.number ? 'bg-[#233E58]' : 'bg-[#E2E8F0]'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
