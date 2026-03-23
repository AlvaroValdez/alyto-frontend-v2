/**
 * KycRoute.jsx — Guard de Verificación KYC
 *
 * Protege rutas que requieren KYC aprobado (ej. /send).
 * Si kycStatus !== 'approved' → redirige a /kyc con banner informativo.
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * @param {{ children: React.ReactNode }} props
 */
export default function KycRoute({ children }) {
  const { user } = useAuth()
  const location = useLocation()

  if (user?.kycStatus !== 'approved') {
    return (
      <Navigate
        to="/kyc"
        state={{
          from:          location,
          kycRequired:   true,
          kycBanner:     'Completa tu verificación de identidad para poder enviar dinero.',
        }}
        replace
      />
    )
  }

  return children
}
