/**
 * router/index.jsx — Definición completa de rutas de Alyto Wallet V2.0
 *
 * Estructura de guards:
 *  - PublicOnlyRoute  → /login, /register, /forgot-password, /reset-password
 *  - ProtectedRoute   → todas las rutas privadas
 *  - KycRoute         → /send (requiere kycStatus === 'approved')
 *  - AdminRoute       → /admin/* (requiere role === 'admin')
 *
 * Layouts:
 *  - AuthLayout   → centra el contenido con logo arriba (auth flow)
 *  - AppLayout    → header + bottom nav (rutas privadas nuevas)
 *  - AdminLayout  → sidebar admin (backoffice)
 *
 * Nota: Las páginas existentes (DashboardPage, SendMoneyPage, etc.)
 * ya incluyen su propia navegación interna — no se envuelven en AppLayout.
 */

import { Routes, Route, Navigate } from 'react-router-dom'

// ── Guards ───────────────────────────────────────────────────────────────────
import ProtectedRoute from '../components/ProtectedRoute'
import AdminRoute     from '../components/AdminRoute'
import KycRoute       from './guards/KycRoute'
import PublicOnlyRoute from './guards/PublicOnlyRoute'

// ── Layouts ──────────────────────────────────────────────────────────────────
import AuthLayout  from '../components/Layout/AuthLayout'
import AdminLayout from '../components/Layout/AdminLayout'

// ── Páginas auth (públicas) ───────────────────────────────────────────────────
import LoginPage         from '../pages/Auth/LoginPage'
import RegisterPage      from '../pages/Auth/RegisterPage'
import ForgotPasswordPage from '../pages/Auth/ForgotPasswordPage'
import ResetPasswordPage  from '../pages/Auth/ResetPasswordPage'

// ── Páginas privadas ─────────────────────────────────────────────────────────
import DashboardPage     from '../pages/Dashboard/DashboardPage'
import SendMoneyPage     from '../pages/SendMoney/SendMoneyPage'
import TransactionsPage  from '../pages/Transactions/TransactionsPage'
import TransactionDetail from '../pages/Transactions/TransactionDetail'
import ProfilePage       from '../pages/Profile/ProfilePage'
import KycPage           from '../pages/Kyc/KycPage'
import KycReturnPage     from '../pages/Kyc/KycReturnPage'

// ── Páginas admin ─────────────────────────────────────────────────────────────
import LedgerPage     from '../pages/Admin/Ledger/LedgerPage'
import CorridorsPanel from '../pages/Admin/Ledger/CorridorsPanel'
import AnalyticsPage  from '../pages/Admin/Analytics/AnalyticsPage'
import FundingPage    from '../pages/Admin/Funding/FundingPage'
import KybListPage    from '../pages/Admin/Kyb/KybListPage'
import KybDetailPage  from '../pages/Admin/Kyb/KybDetailPage'
import SRLConfigPage      from '../pages/Admin/SRLConfig/SRLConfigPage'
import SpAConfigPage      from '../pages/Admin/SpAConfig/SpAConfigPage'
import WalletPage         from '../pages/Wallet/WalletPage'
import WalletAdminPage    from '../pages/Admin/Wallet/WalletAdminPage'
import ReclamosPage       from '../pages/Reclamos/ReclamosPage'
import ReclamosAdminPage  from '../pages/Admin/Reclamos/ReclamosAdminPage'
import SanctionsPage      from '../pages/Admin/Sanctions/SanctionsPage'

// ── Páginas KYB (usuario) ─────────────────────────────────────────────────────
import KybPage        from '../pages/Kyb/KybPage'
import KybForm        from '../pages/Kyb/KybForm'
import KybStatusPage  from '../pages/Kyb/KybStatusPage'

// ── Páginas legacy (mantener compatibilidad) ─────────────────────────────────
import TransferView       from '../components/TransferView'
import CorporateView      from '../components/CorporateView'
import SettlementView     from '../components/SettlementView'
import VitaPayoutView     from '../components/VitaPayoutView'
import VitaPayinView      from '../components/VitaPayinView'

// ── Payment Success (redirect de Fintoc tras pago) ───────────────────────────
import PaymentSuccessPage from '../pages/PaymentSuccess/PaymentSuccessPage'

// ── 404 ──────────────────────────────────────────────────────────────────────
import NotFoundPage from '../pages/NotFound/NotFoundPage'

// ── Router ───────────────────────────────────────────────────────────────────

export default function AppRouter() {
  return (
    <Routes>

      {/* ── Raíz: redirect según estado de auth ────────────────────────── */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Navigate to="/dashboard" replace />
          </ProtectedRoute>
        }
      />

      {/* ── Rutas públicas (auth) con AuthLayout ────────────────────────── */}
      <Route element={<PublicOnlyRoute><AuthLayout /></PublicOnlyRoute>}>
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/register"        element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      </Route>

      {/* ── Dashboard ───────────────────────────────────────────────────── */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />

      {/* ── KYC — verificación de identidad ─────────────────────────────── */}
      <Route path="/kyc" element={
        <ProtectedRoute>
          <KycPage />
        </ProtectedRoute>
      } />

      {/* ── KYC return — Stripe redirige aquí tras verificación móvil ───── */}
      <Route path="/kyc/return" element={
        <ProtectedRoute>
          <KycReturnPage />
        </ProtectedRoute>
      } />

      {/* ── Enviar dinero (requiere KYC aprobado) ────────────────────────── */}
      <Route path="/send" element={
        <ProtectedRoute>
          <KycRoute>
            <SendMoneyPage />
          </KycRoute>
        </ProtectedRoute>
      } />

      {/* ── Historial ────────────────────────────────────────────────────── */}
      <Route path="/transactions" element={
        <ProtectedRoute>
          <TransactionsPage />
        </ProtectedRoute>
      } />
      <Route path="/transactions/:transactionId" element={
        <ProtectedRoute>
          <TransactionDetail />
        </ProtectedRoute>
      } />

      {/* ── Perfil ───────────────────────────────────────────────────────── */}
      <Route path="/profile" element={
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      } />

      {/* ── KYB — Cuenta Business ────────────────────────────────────────── */}
      <Route path="/kyb" element={
        <ProtectedRoute>
          <KybPage />
        </ProtectedRoute>
      } />
      <Route path="/kyb/apply" element={
        <ProtectedRoute>
          <KybForm />
        </ProtectedRoute>
      } />
      <Route path="/kyb/status" element={
        <ProtectedRoute>
          <KybStatusPage />
        </ProtectedRoute>
      } />

      {/* ── Wallet BOB — Exclusivo SRL Bolivia (Fase 25) ────────────────── */}
      <Route path="/wallet" element={
        <ProtectedRoute requiredEntity="SRL">
          <WalletPage />
        </ProtectedRoute>
      } />

      {/* ── Reclamos PRILI — Todos los usuarios (Fase 27) ────────────────── */}
      <Route path="/reclamos" element={
        <ProtectedRoute>
          <ReclamosPage />
        </ProtectedRoute>
      } />

      {/* ── Notificaciones (futuro) ────────────────────────────────────── */}
      <Route path="/notifications" element={
        <ProtectedRoute>
          <Navigate to="/dashboard" replace />
        </ProtectedRoute>
      } />

      {/* ── Payment Success — Fintoc redirige aquí tras completar el pago ─── */}
      {/* Ruta pública: el usuario llega aquí desde Fintoc, sin sesión activa */}
      <Route path="/payment-success" element={<PaymentSuccessPage />} />
      {/* Alias /success para redirect_url de Fintoc */}
      <Route path="/success" element={<PaymentSuccessPage />} />

      {/* ── Plataforma Institucional LLC ─────────────────────────────────── */}
      <Route path="/institutional" element={
        <ProtectedRoute>
          <CorporateView />
        </ProtectedRoute>
      } />

      {/* ── Rutas legacy — mantener compatibilidad ───────────────────────── */}
      <Route path="/transfer" element={
        <ProtectedRoute><TransferView /></ProtectedRoute>
      } />
      <Route path="/corporate" element={
        <ProtectedRoute requiredEntity="LLC"><CorporateView /></ProtectedRoute>
      } />
      <Route path="/settlement" element={
        <ProtectedRoute requiredEntity="SRL"><SettlementView /></ProtectedRoute>
      } />
      <Route path="/payout" element={
        <ProtectedRoute>
          <VitaPayoutView onBack={() => window.history.back()} />
        </ProtectedRoute>
      } />
      <Route path="/deposit" element={
        <ProtectedRoute>
          <VitaPayinView onBack={() => window.history.back()} />
        </ProtectedRoute>
      } />

      {/* ── Admin con AdminLayout ────────────────────────────────────────── */}
      <Route path="/admin" element={
        <AdminRoute>
          <Navigate to="/admin/ledger" replace />
        </AdminRoute>
      } />

      <Route element={
        <AdminRoute>
          <AdminLayout />
        </AdminRoute>
      }>
        <Route path="/admin/ledger"          element={<LedgerPage />}     />
        <Route path="/admin/corridors"       element={<CorridorsPanel />}  />
        <Route path="/admin/analytics"       element={<AnalyticsPage />}   />
        <Route path="/admin/funding"         element={<FundingPage />}     />
        <Route path="/admin/kyb"             element={<KybListPage />}     />
        <Route path="/admin/kyb/:businessId" element={<KybDetailPage />}   />
        <Route path="/admin/srl-config"      element={<SRLConfigPage />}   />
        <Route path="/admin/spa-config"      element={<SpAConfigPage />}   />
        <Route path="/admin/wallet"          element={<WalletAdminPage />}    />
        <Route path="/admin/reclamos"        element={<ReclamosAdminPage />}  />
        <Route path="/admin/sanctions"       element={<SanctionsPage />}       />
      </Route>

      {/* ── 404 ─────────────────────────────────────────────────────────── */}
      <Route path="*" element={<NotFoundPage />} />

    </Routes>
  )
}
