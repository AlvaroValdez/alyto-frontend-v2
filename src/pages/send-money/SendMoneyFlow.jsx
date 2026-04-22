/**
 * SendMoneyFlow.jsx — Contenedor del flujo Enviar dinero (Send Money Flow v1.0).
 *
 * Implementa el contrato canónico de 3 pasos definido en
 * docs/SEND_MONEY_FLOW.md §2:
 *
 *   /send/details           → StepDetails  (país + monto + beneficiario)
 *   /send/review            → StepReview   (revisión con desglose expandible)
 *   /send/payment/:txId     → StepPayment  (instrucciones + comprobante)
 *
 * El estado del flujo vive en este contenedor y se comparte vía props a las
 * sub-rutas (se monta una sola vez mientras el usuario navega entre pasos).
 * Al salir de /send/* el estado se desmonta — no hay persistencia entre
 * sesiones (spec §1.6).
 */

import { useMemo, useState, useCallback, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, X } from 'lucide-react'

import StepDetails from './StepDetails'
import StepReview  from './StepReview'
import StepPayment from './StepPayment'

const INITIAL_DATA = {
  originAmount:       0,
  destinationCountry: null,
  quote:              null,
  beneficiaryData:    null,
  beneficiaryLabel:   null,
  payinMethod:        null,
  transactionId:      null,
  payinUrl:           null,
}

function StepHeader({ title, onBack, onCancel, showCancel = true }) {
  return (
    <header className="flex items-center justify-between px-4 pt-3 pb-3 flex-shrink-0">
      <button
        onClick={onBack}
        aria-label="Volver"
        className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:border-[#233E5833] transition-all"
      >
        <ArrowLeft size={18} />
      </button>
      <h1 className="text-[0.9375rem] font-bold text-[#0F172A]">{title}</h1>
      {showCancel ? (
        <button
          onClick={onCancel}
          aria-label="Cancelar"
          className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:border-[#233E5833] transition-all"
        >
          <X size={18} />
        </button>
      ) : (
        <div className="w-9" />
      )}
    </header>
  )
}

function StepDots({ current }) {
  const steps = ['details', 'review', 'payment']
  const idx   = steps.indexOf(current)
  return (
    <div className="flex justify-center items-center gap-2 px-4 pb-2 flex-shrink-0">
      {steps.map((s, i) => (
        <span
          key={s}
          className={`h-1.5 rounded-full transition-all ${
            i <= idx ? 'w-8 bg-[#233E58]' : 'w-4 bg-[#E2E8F0]'
          }`}
        />
      ))}
    </div>
  )
}

export default function SendMoneyFlow() {
  const navigate = useNavigate()
  const location = useLocation()

  const [flowData, setFlowData] = useState(INITIAL_DATA)

  const updateFlow = useCallback((partial) => {
    setFlowData(prev => ({ ...prev, ...partial }))
  }, [])

  const resetFlow = useCallback(() => setFlowData(INITIAL_DATA), [])

  const currentStep = useMemo(() => {
    if (location.pathname.includes('/payment/')) return 'payment'
    if (location.pathname.endsWith('/review'))   return 'review'
    return 'details'
  }, [location.pathname])

  const title = {
    details: 'Enviar dinero',
    review:  'Revisar transferencia',
    payment: 'Realiza tu pago',
  }[currentStep]

  function handleBack() {
    if (currentStep === 'details') navigate(-1)
    else if (currentStep === 'review')  navigate('/send/details')
    else if (currentStep === 'payment') navigate('/send/review')
  }

  function handleCancel() {
    resetFlow()
    navigate('/')
  }

  useEffect(() => {
    return () => resetFlow()
  }, [resetFlow])

  return (
    <div className="flex flex-col">
      <StepHeader
        title={title}
        onBack={handleBack}
        onCancel={handleCancel}
        showCancel={currentStep !== 'payment'}
      />
      <StepDots current={currentStep} />

      <div className="flex-1 overflow-y-auto scrollbar-hide pt-2">
        <Routes>
          <Route index element={<Navigate to="details" replace />} />
          <Route
            path="details"
            element={<StepDetails flowData={flowData} updateFlow={updateFlow} />}
          />
          <Route
            path="review"
            element={<StepReview flowData={flowData} updateFlow={updateFlow} />}
          />
          <Route
            path="payment/:txId"
            element={<StepPaymentRouteAdapter flowData={flowData} updateFlow={updateFlow} />}
          />
        </Routes>
      </div>
    </div>
  )
}

function StepPaymentRouteAdapter({ flowData, updateFlow }) {
  const { txId } = useParams()
  return <StepPayment flowData={flowData} updateFlow={updateFlow} txId={txId} />
}
