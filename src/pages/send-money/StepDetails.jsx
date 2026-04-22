/**
 * StepDetails.jsx — Paso 1 del flujo v1.0 (spec §2.1).
 *
 * Progressive disclosure: primero monto + país + cotización; una vez
 * válido aparece el formulario de beneficiario. Ambas piezas viven
 * bajo la misma URL (/send/details). El botón "Continuar" del beneficiario
 * avanza a /send/review.
 *
 * Reutiliza los componentes densos existentes (Step1Amount y
 * Step3Beneficiary) para no duplicar la validación dinámica de campos
 * Vita ni la lógica de corredores manuales Bolivia.
 */

import { useNavigate } from 'react-router-dom'

import Step1Amount       from '../../components/SendMoney/Step1Amount'
import Step3Beneficiary  from '../../components/SendMoney/Step3Beneficiary'

export default function StepDetails({ flowData, updateFlow }) {
  const navigate = useNavigate()

  const amountLocked = !!flowData.quote && !!flowData.destinationCountry

  function handleAmountDone(data) {
    const quote = data.quote
    const isManual =
      quote?.isManualCorridor === true ||
      quote?.payinMethod       === 'manual'
    updateFlow({
      originAmount:       data.originAmount,
      destinationCountry: data.destinationCountry,
      quote,
      payinMethod:        isManual ? 'manual' : (data.payinMethod ?? 'fintoc'),
    })
  }

  function handleBeneficiaryDone(data) {
    updateFlow({
      beneficiaryData: data.beneficiaryData,
    })
    navigate('/send/review')
  }

  return (
    <div className="flex flex-col">
      {!amountLocked && (
        <Step1Amount
          initialData={{
            originAmount:       flowData.originAmount || '',
            destinationCountry: flowData.destinationCountry,
            quote:              flowData.quote,
          }}
          onNext={handleAmountDone}
        />
      )}

      {amountLocked && (
        <Step3Beneficiary
          destinationCountry={flowData.destinationCountry}
          isManualCorridor={flowData.payinMethod === 'manual'}
          onNext={handleBeneficiaryDone}
        />
      )}
    </div>
  )
}
