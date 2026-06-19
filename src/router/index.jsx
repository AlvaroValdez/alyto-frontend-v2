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
 *  - AuthLayout   → pantallas de auth (login, register, etc.)
 *  - AppLayout    → header + bottom nav flotante (todas las rutas privadas)
 *  - AdminLayout  → sidebar backoffice
 */

import { Routes, Route, Navigate } from 'react-router-dom'

// ── Guards ───────────────────────────────────────────────────────────────────
import ProtectedRoute  from '../components/ProtectedRoute'
import AdminRoute      from '../components/AdminRoute'
import KycRoute        from './guards/KycRoute'
import PublicOnlyRoute from './guards/PublicOnlyRoute'

// ── Layouts ──────────────────────────────────────────────────────────────────
import AppLayout   from '../components/Layout/AppLayout'
import AuthLayout  from '../components/Layout/AuthLayout'
import AdminLayout from '../components/Layout/AdminLayout'

// ── Páginas auth (públicas) ───────────────────────────────────────────────────
import LoginPage          from '../pages/Auth/LoginPage'
import RegisterPage       from '../pages/Auth/RegisterPage'
import EmailVerifyPage    from '../pages/Auth/EmailVerifyPage'
import ForgotPasswordPage from '../pages/Auth/ForgotPasswordPage'
import ResetPasswordPage  from '../pages/Auth/ResetPasswordPage'

// ── Páginas privadas ─────────────────────────────────────────────────────────
import DashboardPage      from '../pages/Dashboard/DashboardPage'
import SendMoneyPage      from '../pages/SendMoney/SendMoneyPage'
import TransactionsPage   from '../pages/Transactions/TransactionsPage'
import TransactionDetail  from '../pages/Transactions/TransactionDetail'
import ProfilePage        from '../pages/Profile/ProfilePage'
import ContactsPage       from '../pages/Contacts/ContactsPage'
import NotificationsPage  from '../pages/Notifications/NotificationsPage'
import WalletPage         from '../pages/Wallet/WalletPage'
import WalletQRScreen     from '../pages/Wallet/WalletQRScreen'
import SendUSDCPage       from '../pages/Wallet/SendUSDCPage'
import KycPage            from '../pages/Kyc/KycPage'
import KycReturnPage      from '../pages/Kyc/KycReturnPage'
import ReclamosPage       from '../pages/Reclamos/ReclamosPage'

// ── Páginas KYB ──────────────────────────────────────────────────────────────
import KybPage       from '../pages/Kyb/KybPage'
import KybForm       from '../pages/Kyb/KybForm'
import KybStatusPage from '../pages/Kyb/KybStatusPage'

// ── Páginas admin ─────────────────────────────────────────────────────────────
import LedgerPage          from '../pages/Admin/Ledger/LedgerPage'
import CorridorsPanel      from '../pages/Admin/Ledger/CorridorsPanel'
import AnalyticsPage       from '../pages/Admin/Analytics/AnalyticsPage'
import FundingPage         from '../pages/Admin/Funding/FundingPage'
import KybListPage         from '../pages/Admin/Kyb/KybListPage'
import KybDetailPage       from '../pages/Admin/Kyb/KybDetailPage'
import SRLConfigPage       from '../pages/Admin/SRLConfig/SRLConfigPage'
import SpAConfigPage       from '../pages/Admin/SpAConfig/SpAConfigPage'
import WalletAdminPage     from '../pages/Admin/Wallet/WalletAdminPage'
import WalletFeesPage      from '../pages/Admin/WalletFees/WalletFeesPage'
import ReclamosAdminPage   from '../pages/Admin/Reclamos/ReclamosAdminPage'
import SanctionsPage       from '../pages/Admin/Sanctions/SanctionsPage'
import UsersPage           from '../pages/Admin/Users/UsersPage'

// ── Páginas legacy ────────────────────────────────────────────────────────────
import TransferView   from '../components/TransferView'
import CorporateView  from '../components/CorporateView'
import SettlementView from '../components/SettlementView'
import VitaPayoutView from '../components/VitaPayoutView'
import VitaPayinView  from '../components/VitaPayinView'

// ── SEP-24 (Interactive Anchor — público, también para webviews externas) ─────
import Sep24DepositPage  from '../pages/Sep24/Sep24DepositPage'
import Sep24WithdrawPage from '../pages/Sep24/Sep24WithdrawPage'

// ── Otras ─────────────────────────────────────────────────────────────────────
import PaymentSuccessPage from '../pages/PaymentSuccess/PaymentSuccessPage'

// ── Legales públicas (requisito Google Play) ──
import LegalPage         from '../pages/Legal/LegalPage'
import DeleteAccountPage from '../pages/Legal/DeleteAccountPage'
import NotFoundPage       from '../pages/NotFound/NotFoundPage'

// ── Router ───────────────────────────────────────────────────────────────────

export default function AppRouter() {
  return (
    <Routes>

      {/* ── Raíz: redirect a dashboard ──────────────────────────────────── */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Navigate to="/dashboard" replace />
          </ProtectedRoute>
        }
      />

      {/* ── Auth (públicas, sin AppLayout) ──────────────────────────────── */}
      <Route element={<PublicOnlyRoute><AuthLayout /></PublicOnlyRoute>}>
        <Route path="/login"                  element={<LoginPage />} />
        <Route path="/register"               element={<RegisterPage />} />
        <Route path="/forgot-password"        element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token"  element={<ResetPasswordPage />} />
      </Route>

      {/* ── Payment Success — pública (redirect Fintoc) ─────────────────── */}
      <Route path="/payment-success" element={<PaymentSuccessPage />} />
      <Route path="/success"         element={<PaymentSuccessPage />} />

      {/* ── SEP-24 Interactive Anchor — pública (webview de wallets externas) ── */}
      <Route path="/sep24/deposit"   element={<Sep24DepositPage />} />
      <Route path="/sep24/withdraw"  element={<Sep24WithdrawPage />} />

      {/* ── Legales públicas (URL pública requerida por Google Play) ───────── */}
      <Route path="/terms"           element={<LegalPage docType="terms" />} />
      <Route path="/privacy"         element={<LegalPage docType="privacy" />} />
      <Route path="/eliminar-cuenta" element={<DeleteAccountPage />} />
      <Route path="/delete-account"  element={<DeleteAccountPage />} />

      {/* ══════════════════════════════════════════════════════════════════
          RUTAS PRIVADAS — todas dentro de AppLayout
          Header + Bottom Nav flotante se renderizan en todas
          ══════════════════════════════════════════════════════════════════ */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>

        {/* Dashboard */}
        <Route path="/dashboard"     element={<DashboardPage />} />

        {/* Enviar dinero — con KYC guard, dentro de AppLayout */}
        <Route path="/send"          element={<KycRoute><SendMoneyPage /></KycRoute>} />

        {/* Onboarding — verificación de email (paso previo al KYC) */}
        <Route path="/verify-email"  element={<EmailVerifyPage />} />

        {/* KYC — dentro de AppLayout */}
        <Route path="/kyc"           element={<KycPage />} />
        <Route path="/kyc/return"    element={<KycReturnPage />} />

        {/* Wallet (activos / liquidación BOB para SRL) */}
        <Route path="/wallet"            element={<WalletPage />} />
        <Route path="/wallet/qr"         element={<WalletQRScreen />} />
        <Route path="/wallet/usdc/send"  element={<SendUSDCPage />} />

        {/* Transferencias */}
        <Route path="/transactions"                element={<TransactionsPage />} />
        <Route path="/transactions/:transactionId" element={<TransactionDetail />} />

        {/* Contactos */}
        <Route path="/contacts"      element={<ContactsPage />} />

        {/* Notificaciones */}
        <Route path="/notifications" element={<NotificationsPage />} />

        {/* Reclamos */}
        <Route path="/reclamos"      element={<ReclamosPage />} />

        {/* Perfil */}
        <Route path="/profile"       element={<ProfilePage />} />

        {/* KYB */}
        <Route path="/kyb"           element={<KybPage />} />
        <Route path="/kyb/apply"     element={<KybForm />} />
        <Route path="/kyb/status"    element={<KybStatusPage />} />

        {/* Legacy */}
        <Route path="/transfer"   element={<TransferView />} />
        <Route path="/corporate"  element={<CorporateView />} />
        <Route path="/settlement" element={<SettlementView />} />
        <Route path="/payout"     element={<VitaPayoutView onBack={() => window.history.back()} />} />
        <Route path="/deposit"    element={<VitaPayinView  onBack={() => window.history.back()} />} />

      </Route>

      {/* ── Admin con AdminLayout ────────────────────────────────────────── */}
      <Route path="/admin" element={
        <AdminRoute><Navigate to="/admin/ledger" replace /></AdminRoute>
      } />
      <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route path="/admin/ledger"          element={<LedgerPage />}        />
        <Route path="/admin/corridors"       element={<CorridorsPanel />}    />
        <Route path="/admin/analytics"       element={<AnalyticsPage />}     />
        <Route path="/admin/funding"         element={<FundingPage />}       />
        <Route path="/admin/kyb"             element={<KybListPage />}       />
        <Route path="/admin/kyb/:businessId" element={<KybDetailPage />}     />
        <Route path="/admin/srl-config"      element={<SRLConfigPage />}     />
        <Route path="/admin/spa-config"      element={<SpAConfigPage />}     />
        <Route path="/admin/wallet"          element={<WalletAdminPage />}   />
        <Route path="/admin/wallet-fees"     element={<WalletFeesPage />}    />
        <Route path="/admin/reclamos"        element={<ReclamosAdminPage />} />
        <Route path="/admin/sanctions"       element={<SanctionsPage />}     />
        <Route path="/admin/users"           element={<UsersPage />}         />
      </Route>

      {/* ── 404 ─────────────────────────────────────────────────────────── */}
      <Route path="*" element={<NotFoundPage />} />

    </Routes>
  )
}
