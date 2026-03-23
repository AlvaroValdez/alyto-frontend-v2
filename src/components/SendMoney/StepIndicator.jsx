/**
 * StepIndicator.jsx — Barra de progreso visual para el flujo de 5 pasos.
 * El paso 6 (éxito) no necesita indicador.
 */

import { Check } from 'lucide-react'

const STEPS = [
  { number: 1, label: 'Monto' },
  { number: 2, label: 'Pago' },
  { number: 3, label: 'Destinatario' },
  { number: 4, label: 'Confirmar' },
  { number: 5, label: 'Transferencia' },
]

export default function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      {STEPS.map((s, idx) => {
        const isDone    = currentStep > s.number
        const isActive  = currentStep === s.number
        const isLast    = idx === STEPS.length - 1

        return (
          <div key={s.number} className="flex items-center flex-1">
            {/* Círculo del paso */}
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[0.6875rem] font-bold transition-all duration-200 ${
                  isDone
                    ? 'bg-[#22C55E] text-white'
                    : isActive
                      ? 'bg-[#C4CBD8] text-[#0F1628]'
                      : 'bg-[#1A2340] border border-[#263050] text-[#4E5A7A]'
                }`}
              >
                {isDone ? <Check size={13} /> : s.number}
              </div>
              <span
                className={`text-[0.5625rem] font-medium mt-1 whitespace-nowrap ${
                  isActive ? 'text-[#C4CBD8]' : isDone ? 'text-[#22C55E]' : 'text-[#4E5A7A]'
                }`}
              >
                {s.label}
              </span>
            </div>

            {/* Línea conectora */}
            {!isLast && (
              <div
                className={`flex-1 h-px mx-1 mb-4 transition-all duration-300 ${
                  currentStep > s.number ? 'bg-[#22C55E]' : 'bg-[#263050]'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
