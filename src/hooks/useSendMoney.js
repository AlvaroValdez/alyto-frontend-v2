/**
 * useSendMoney.js — Orquestador del flujo de pago cross-border (pasos 1-6).
 *
 * Estado persistido en sessionStorage para sobrevivir refrescos accidentales.
 * Se limpia al completar o cancelar el flujo.
 *
 * Uso:
 *   const { step, stepData, nextStep, prevStep, setStepData, resetFlow } = useSendMoney()
 */

import { useState, useCallback } from 'react'
import Sentry from '../services/sentry.js'
import { initPayment } from '../services/paymentsService'

const SESSION_KEY = 'alyto_send_money'
const TOTAL_STEPS = 6

function loadFromSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveToSession(data) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data))
  } catch { /* sessionStorage no disponible */ }
}

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
  const [state, setState] = useState(() => {
    const saved = loadFromSession()
    return saved ?? INITIAL_STATE
  })

  const { step, stepData } = state

  // Actualiza datos de un paso específico (merge parcial)
  const setStepData = useCallback((partial) => {
    setState(prev => {
      const next = {
        ...prev,
        stepData: { ...prev.stepData, ...partial },
      }
      saveToSession(next)
      return next
    })
  }, [])

  // Avanza al siguiente paso (opcionalmente guardando datos)
  const nextStep = useCallback((dataForCurrentStep = {}) => {
    setState(prev => {
      if (prev.step >= TOTAL_STEPS) return prev
      const next = {
        step: prev.step + 1,
        stepData: { ...prev.stepData, ...dataForCurrentStep },
      }
      if (prev.step === 3) {
        console.log('[useSendMoney] stepData después de Step3:', JSON.stringify(next.stepData))
      }
      saveToSession(next)
      return next
    })
  }, [])

  // Retrocede al paso anterior
  const prevStep = useCallback(() => {
    setState(prev => {
      if (prev.step <= 1) return prev
      const next = { ...prev, step: prev.step - 1 }
      saveToSession(next)
      return next
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
