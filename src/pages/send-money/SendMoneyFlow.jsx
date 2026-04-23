/**
 * SendMoneyFlow.jsx — Contenedor del flujo Enviar dinero.
 *
 * Soporta dos versiones del flujo:
 *
 * v1.1 (spec docs/SEND_MONEY_FLOW.md):
 *   /send/amount       → StepAmount      (monto + país destino)
 *   /send/beneficiary  → StepBeneficiary (formulario dinámico por proveedor)
 *   /send/confirm      → StepConfirm     (review + pago + comprobante, 2 estados internos)
 *
 * v1.0 legacy (mantenido para compatibilidad):
 *   /send/details      → StepDetails
 *   /send/review       → StepReview
 *   /send/payment/:id  → StepPayment
 *
 * El estado del flujo vive en este contenedor y se comparte vía props.
 * Al salir de /send/* el estado se desmonta — sin persistencia entre sesiones.
 */

import { useMemo, useState, useCallback, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft, X } from 'lucide-react'

// v1.1
import StepAmount      from './StepAmount'
import StepBeneficiary from './StepBeneficiary'
import StepConfirm     from './StepConfirm'

// v1.0 legacy
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
  const v11Steps = ['amount', 'beneficiary', 'confirm']
  const v10Steps = ['details', 'review', 'payment']
  const steps = v11Steps.includes(current) ? v11Steps : v10Steps
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
    if (location.pathname.includes('/payment/'))        return 'payment'
    if (location.pathname.endsWith('/review'))          return 'review'
    if (location.pathname.endsWith('/confirm'))         return 'confirm'
    if (location.pathname.endsWith('/beneficiary'))     return 'beneficiary'
    if (location.pathname.endsWith('/amount'))          return 'amount'
    return 'details'
  }, [location.pathname])

  const title = {
    amount:      'Enviar dinero',
    beneficiary: 'Beneficiario',
    confirm:     'Confirmar transferencia',
    details:     'Enviar dinero',
    review:      'Revisar transferencia',
    payment:     'Realiza tu pago',
  }[currentStep] ?? 'Enviar dinero'

  function handleBack() {
    if (currentStep === 'amount')      navigate(-1)
    else if (currentStep === 'beneficiary') navigate('/send/amount')
    else if (currentStep === 'confirm')     navigate('/send/beneficiary')
    else if (currentStep === 'details')     navigate(-1)
    else if (currentStep === 'review')      navigate('/send/details')
    else if (currentStep === 'payment')     navigate('/send/review')
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
          {/* v1.1 routes */}
          <Route index element={<Navigate to="amount" replace />} />
          <Route
            path="amount"
            element={<StepAmount flowData={flowData} updateFlow={updateFlow} />}
          />
          <Route
            path="beneficiary"
            element={<StepBeneficiary flowData={flowData} updateFlow={updateFlow} />}
          />
          <Route
            path="confirm"
            element={<StepConfirm flowData={flowData} updateFlow={updateFlow} />}
          />

          {/* v1.0 legacy routes — kept for backward compatibility */}
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
