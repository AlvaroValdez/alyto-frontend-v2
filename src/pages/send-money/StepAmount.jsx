// StepAmount.jsx — Step 1 of Send Money Flow v1.1 (spec §2.1)
// Route: /send/amount
// Amount + destination country only. Navigates to /send/beneficiary on next.

import { useNavigate } from 'react-router-dom'
import Step1Amount from '../../components/SendMoney/Step1Amount'

export default function StepAmount({ flowData, updateFlow }) {
  const navigate = useNavigate()

  function handleNext(data) {
    const quote = data.quote
    const payinMethod =
      quote?.payinMethod ||
      (quote?.isManualCorridor === true ? 'manual' : 'fintoc')
    updateFlow({
      originAmount:       data.originAmount,
      destinationCountry: data.destinationCountry,
      quote,
      payinMethod,
    })
    navigate('/send/beneficiary')
  }

  return (
    <Step1Amount
      initialData={{
        originAmount:       flowData.originAmount || '',
        destinationCountry: flowData.destinationCountry,
        quote:              flowData.quote,
      }}
      onNext={handleNext}
    />
  )
}
