/**
 * App.jsx — Entry point de la SPA Alyto Wallet V2.0
 *
 * Monta los proveedores globales y delega el routing a router/index.jsx.
 * Muestra SplashScreen mientras AuthContext verifica la sesión.
 */

import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppNotifications  from './components/AppNotifications'
import AppRouter         from './router/index'
import SplashScreen      from './components/SplashScreen'

function AppContent() {
  const { isLoading } = useAuth()
  return (
    <>
      <SplashScreen isLoading={isLoading} />
      <AppNotifications />
      <AppRouter />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  )
}
