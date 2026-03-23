/**
 * useSendMoney.js — Orquestador del flujo de pago cross-border (pasos 1-6).
 *
 * El estado vive solo en memoria React: no se persiste en sessionStorage ni
 * localStorage. Cada vez que el usuario entra a /send el flujo empieza desde
 * Step 1. SendMoneyPage limpia cualquier dato residual al desmontar.
 *
 * Uso:
 *   const { step, stepData, nextStep, prevStep, setStepData, resetFlow } = useSendMoney()
 */

import { useState, useCallback } from 'react'
import Sentry from '../services/sentry.js'
import { initPayment } from '../services/paymentsService'

const SESSION_KEY = 'alyto_send_money'  // solo para limpiar datos de versiones anteriores
const TOTAL_STEPS = 6

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch { /* ignorar */ }
}

const INITIAL_STATE = {
  step: 1,
  stepData: {
    // Step 1
    originAmount: '',
    destinationCountry: '',
    quote: null,
    // Step 2
    payinMethod: null,
    // Step 3
    beneficiaryData: null,
    // Step 4 → confirmado implícitamente al llamar nextStep
    // Step 5
    transactionId: null,
    payinUrl: null,
    // Step 6 (info de éxito)
    completedAt: null,
  },
}

export function useSendMoney() {
  const [state, setState] = useState(INITIAL_STATE)

  const { step, stepData } = state

  // Actualiza datos de un paso específico (merge parcial)
  const setStepData = useCallback((partial) => {
    setState(prev => ({
      ...prev,
      stepData: { ...prev.stepData, ...partial },
    }))
  }, [])

  // Avanza al siguiente paso (opcionalmente guardando datos).
  // targetStep permite saltar pasos (ej. ir directo a 3 desde 1 cuando se salta el Step 2).
  const nextStep = useCallback((dataForCurrentStep = {}, targetStep = null) => {
    setState(prev => {
      if (prev.step >= TOTAL_STEPS) return prev
      const next = {
        step: targetStep ?? (prev.step + 1),
        stepData: { ...prev.stepData, ...dataForCurrentStep },
      }
      if (prev.step === 3) {
        console.log('[useSendMoney] stepData después de Step3:', JSON.stringify(next.stepData))
      }
      return next
    })
  }, [])

  // Retrocede al paso anterior.
  // Si _skipStep2 está activo y estamos en Step 3, vuelve directamente al Step 1.
  const prevStep = useCallback(() => {
    setState(prev => {
      if (prev.step <= 1) return prev
      const prevStepNum =
        prev.step === 3 && prev.stepData._skipStep2 ? 1 : prev.step - 1
      return { ...prev, step: prevStepNum }
    })
  }, [])

  // Reinicia el flujo completamente
  const resetFlow = useCallback(() => {
    clearSession()
    setState(INITIAL_STATE)
  }, [])

  /**
   * Envía la solicitud de pago cross-border al backend.
   * Captura automáticamente el error en Sentry si la llamada falla.
   *
   * @param {{ corridorId, originAmount, payinMethod, beneficiary }} payload
   * @returns {Promise<{ transactionId, payinUrl, status }>}
   * @throws {Error} — relanzado para que el componente maneje el estado UI
   */
  const submitPayment = useCallback(async (payload) => {
    try {
      return await initPayment(payload)
    } catch (error) {
      Sentry.captureException(error, {
        tags:  { step: 'crossborder_init' },
        extra: {
          corridorId:   payload?.corridorId,
          originAmount: payload?.originAmount,
        },
      })
      throw error
    }
  }, [])

  return { step, stepData, nextStep, prevStep, setStepData, resetFlow, submitPayment }
}
