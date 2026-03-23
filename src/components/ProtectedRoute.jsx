/**
 * ProtectedRoute.jsx — Guardia de Navegación por Autenticación JWT
 *
 * Envuelve cualquier ruta privada. Si el usuario no está autenticado
 * (token ausente o expirado en localStorage), redirige a /login
 * preservando la ruta de origen en `state.from` para poder volver
 * tras el login exitoso.
 *
 * Uso en App.jsx:
 *   <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
 *
 * Restricción por entidad legal (opcional):
 *   <Route path="/settlement" element={
 *     <ProtectedRoute requiredEntity="SRL"><SettlementView /></ProtectedRoute>
 *   } />
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * @param {{ children: React.ReactNode, requiredEntity?: 'LLC'|'SpA'|'SRL' }} props
 */
export default function ProtectedRoute({ children, requiredEntity }) {
  const { isAuth, isLoading, user } = useAuth()
  const location                    = useLocation()

  // ── 0. Esperando validación server-side → no redirigir aún ───────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── 1. Sin sesión → redirige a /login ────────────────────────────────────
  if (!isAuth) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    )
  }

  // ── 2. Entidad requerida pero no coincide → redirige al inicio ────────────
  if (requiredEntity && user?.legalEntity !== requiredEntity) {
    return (
      <Navigate
        to="/"
        state={{ entityError: `Esta sección requiere una cuenta ${requiredEntity}.` }}
        replace
      />
    )
  }

  // ── 3. Autenticado y entidad válida → renderiza los hijos ─────────────────
  return children
}
