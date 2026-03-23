/**
 * App.jsx — Entry point de la SPA Alyto Wallet V2.0
 *
 * Monta los proveedores globales y delega el routing a router/index.jsx.
 */

import { BrowserRouter } from 'react-router-dom'
import { AuthProvider }  from './context/AuthContext'
import AppNotifications  from './components/AppNotifications'
import AppRouter         from './router/index'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Notificaciones push — debe estar dentro de AuthProvider y BrowserRouter */}
        <AppNotifications />
        <AppRouter />
      </BrowserRouter>
    </AuthProvider>
  )
}
