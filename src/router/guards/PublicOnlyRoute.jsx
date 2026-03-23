/**
 * PublicOnlyRoute.jsx — Guard para rutas solo accesibles sin sesión activa
 *
 * Si el usuario ya está autenticado lo redirige a /dashboard.
 * Úsalo en /login, /register, /forgot-password, /reset-password.
 */

import { Navigate } from 'react-router-dom'
import { useAuth }  from '../../context/AuthContext'

/**
 * @param {{ children: React.ReactNode }} props
 */
export default function PublicOnlyRoute({ children }) {
  const { isAuth, isLoading } = useAuth()

  // Esperar validación server-side antes de redirigir
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isAuth) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
