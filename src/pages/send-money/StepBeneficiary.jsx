// StepBeneficiary.jsx — Step 2 of Send Money Flow v1.1 (spec §2.2)
// Route: /send/beneficiary
// Dynamic form per corridor provider. Navigates to /send/confirm on next.

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Step3Beneficiary from '../../components/SendMoney/Step3Beneficiary'

export default function StepBeneficiary({ flowData, updateFlow }) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!flowData.quote || !flowData.destinationCountry) {
      navigate('/send/amount', { replace: true })
    }
  }, [flowData.quote, flowData.destinationCountry, navigate])

  if (!flowData.quote || !flowData.destinationCountry) return null

  function handleNext(data) {
    updateFlow({ beneficiaryData: data.beneficiaryData })
    navigate('/send/confirm')
  }

  return (
    <Step3Beneficiary
      destinationCountry={flowData.destinationCountry}
      isManualCorridor={flowData.payinMethod === 'manual'}
      onNext={handleNext}
    />
  )
}
