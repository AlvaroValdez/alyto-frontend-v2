/**
 * AdminRoute.jsx — Guardia de Navegación para el Panel de Administración
 *
 * Protege la ruta /admin con doble verificación:
 *   1. Autenticación → JWT válido en sesión (isAuth)
 *   2. Autorización  → user.role === 'admin'
 *
 * Comportamiento de redirección:
 *   - Sin sesión activa  → /login  (usuario no autenticado)
 *   - Sesión sin rol admin → /    (usuario normal, redirección silenciosa)
 *
 * La redirección silenciosa a / impide enumerar rutas de admin
 * a usuarios autenticados sin los permisos correctos.
 *
 * Uso en App.jsx:
 *   <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * @param {{ children: React.ReactNode }} props
 */
export default function AdminRoute({ children }) {
  const { isAuth, user } = useAuth()
  const location         = useLocation()

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

  // ── 2. Autenticado pero no es admin → redirige al Dashboard ──────────────
  // Redirección silenciosa: no revela que la ruta existe ni por qué se denegó.
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  // ── 3. Admin verificado → renderiza el panel ──────────────────────────────
  return children
}
