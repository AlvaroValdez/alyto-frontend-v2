/**
 * DashboardPage.jsx — Pantalla principal post-login de Alyto Wallet V2.0
 *
 * Layout (top → bottom):
 *  1. Shell: status bar + header (logo + bell + avatar)
 *  2. SECCIÓN 1 — WelcomeBanner (saludo + alertas)
 *  3. SECCIÓN 2 — Stats cards (o mensaje de bienvenida si 0 transacciones)
 *  4. SECCIÓN 3 — QuickActions (grid 2×2)
 *  5. SECCIÓN 4 — RecentTransactions (últimas 3)
 *  6. SECCIÓN 5 — Corredores disponibles (scroll horizontal)
 *  7. Bottom Nav (fijo)
 */

import { useLocation, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Bell, Home, BarChart2, FileText, User, Shield, LogOut, ChevronRight, Wallet, AlertCircle } from 'lucide-react'
import { useAuth }            from '../../context/AuthContext'
import { useDashboard }       from '../../hooks/useDashboard'
import { listUserCorridors }  from '../../services/paymentsService'
import WelcomeBanner          from './WelcomeBanner'
import QuickActions           from './QuickActions'
import RecentTransactions     from './RecentTransactions'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCLP(amount) {
  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount ?? 0))
}

const COUNTRY_FLAGS = {
  CL: '🇨🇱', BO: '🇧🇴', US: '🇺🇸', AR: '🇦🇷',
  CO: '🇨🇴', PE: '🇵🇪', MX: '🇲🇽', BR: '🇧🇷',
  UY: '🇺🇾', EC: '🇪🇨', PY: '🇵🇾', ANY: '🌍',
}

function countryFlag(code) {
  return COUNTRY_FLAGS[code] ?? '🌍'
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }) {
  return (
    <div className="flex-shrink-0 w-36 bg-[#1A2340] rounded-2xl p-4 border border-[#263050]">
      <p className="text-[0.6875rem] font-medium text-[#8A96B8] uppercase tracking-[0.08em] mb-2 truncate">
        {label}
      </p>
      <p
        className="text-[1.125rem] font-bold leading-none"
        style={{ color: accent ?? '#FFFFFF' }}
      >
        {value}
      </p>
    </div>
  )
}

// ── Stats skeleton ────────────────────────────────────────────────────────────

function StatsSkeletons() {
  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 mb-2 pb-1">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex-shrink-0 w-36 bg-[#1A2340] rounded-2xl p-4 border border-[#263050] animate-pulse">
          <div className="h-2.5 bg-[#263050] rounded-full w-4/5 mb-3" />
          <div className="h-5 bg-[#1F2B4D] rounded-full w-3/5" />
        </div>
      ))}
    </div>
  )
}

// ── Destination countries section ─────────────────────────────────────────────

const COUNTRY_META = {
  CO: { name: 'Colombia',       flag: '🇨🇴' },
  PE: { name: 'Perú',           flag: '🇵🇪' },
  BO: { name: 'Bolivia',        flag: '🇧🇴' },
  AR: { name: 'Argentina',      flag: '🇦🇷' },
  MX: { name: 'México',         flag: '🇲🇽' },
  BR: { name: 'Brasil',         flag: '🇧🇷' },
  US: { name: 'Estados Unidos', flag: '🇺🇸' },
  EC: { name: 'Ecuador',        flag: '🇪🇨' },
  VE: { name: 'Venezuela',      flag: '🇻🇪' },
  PY: { name: 'Paraguay',       flag: '🇵🇾' },
  UY: { name: 'Uruguay',        flag: '🇺🇾' },
  CL: { name: 'Chile',          flag: '🇨🇱' },
}

function DestinationCountryCard({ country }) {
  const isManual = country.payinMethod === 'manual'
  return (
    <div className="flex-shrink-0 bg-[#1A2340] rounded-2xl p-3.5 border border-[#263050] min-w-[108px] flex flex-col items-center gap-2">
      <span className="text-[2rem] leading-none">{country.flag}</span>
      <div className="text-center">
        <p className="text-[0.75rem] font-semibold text-white leading-tight">{country.name}</p>
        <p className="text-[0.625rem] text-[#4E5A7A] mt-0.5">{country.currency}</p>
        {isManual && (
          <span className="inline-block mt-1 text-[0.5625rem] font-semibold text-[#FBBF24] bg-[#F59E0B1A] border border-[#F59E0B33] px-1.5 py-0.5 rounded-full leading-none">
            Verificación manual
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const { data, loading, error } = useDashboard()

  // Corredores disponibles para el usuario (lista dinámica del backend)
  const [destCountries, setDestCountries] = useState([])
  useEffect(() => {
    listUserCorridors()
      .then(res => {
        const seen = new Set()
        const list = []
        for (const c of (res.corridors ?? res)) {
          const code = c.destinationCountry
          if (!code || seen.has(code)) continue
          seen.add(code)
          const meta = COUNTRY_META[code] ?? {}
          list.push({
            code,
            name:        meta.name ?? code,
            flag:        meta.flag ?? '🌍',
            currency:    c.destinationCurrency ?? '—',
            payinMethod: c.payinMethod ?? null,
          })
        }
        setDestCountries(list)
      })
      .catch(() => {}) // silencioso — no es crítico para el dashboard
  }, [])

  function handleLogout() {
    logout()
    navigate('/login?logout=1', { replace: true })
  }

  // Datos del dashboard: usar data de la API o fallback a AuthContext
  const firstName        = data?.user?.firstName ?? user?.firstName ?? ''
  const legalEntity      = data?.user?.legalEntity ?? user?.legalEntity ?? 'LLC'
  const kycStatus        = data?.user?.kycStatus  ?? user?.kycStatus  ?? 'pending'
  const activeTransactions = data?.stats?.activeTransactions ?? 0
  const stats            = data?.stats
  const recentTxs        = data?.recentTransactions ?? []

  const hasTransactions = stats != null && stats.totalTransactions > 0

  return (
    <div className="min-h-screen bg-[#0F1628] font-sans flex flex-col max-w-[430px] mx-auto relative">

      {/* ── SCROLL AREA ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pb-24">

        {/* ── STATUS BAR ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <span className="text-[0.8125rem] font-semibold text-white">
            {new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="flex items-center gap-1.5 text-white">
            {/* Signal bars */}
            <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor" opacity="0.9">
              <rect x="0" y="3" width="3" height="9" rx="1"/>
              <rect x="4.5" y="2" width="3" height="10" rx="1"/>
              <rect x="9" y="0.5" width="3" height="11.5" rx="1"/>
              <rect x="13.5" y="0" width="3" height="12" rx="1" opacity="0.3"/>
            </svg>
            {/* WiFi */}
            <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor" opacity="0.9">
              <path d="M8 2.4C10.4 2.4 12.6 3.4 14.1 5L15.5 3.5C13.6 1.3 10.9 0 8 0C5.1 0 2.4 1.3 0.5 3.5L1.9 5C3.4 3.4 5.6 2.4 8 2.4Z"/>
              <path d="M8 5.6C9.7 5.6 11.2 6.3 12.3 7.4L13.7 5.9C12.2 4.4 10.2 3.5 8 3.5C5.8 3.5 3.8 4.4 2.3 5.9L3.7 7.4C4.8 6.3 6.3 5.6 8 5.6Z"/>
              <circle cx="8" cy="10.5" r="1.5"/>
            </svg>
            {/* Battery */}
            <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
              <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="currentColor" strokeOpacity="0.35"/>
              <rect x="2" y="2" width="17" height="8" rx="2" fill="currentColor"/>
              <path d="M23 4.5V7.5C23.8 7.2 24.5 6.4 24.5 6C24.5 5.6 23.8 4.8 23 4.5Z" fill="currentColor" fillOpacity="0.4"/>
            </svg>
          </div>
        </div>

        {/* ── HEADER ────────────────────────────────────────────────── */}
        <header className="px-5 pt-3 pb-5">
          <div className="flex items-center justify-between">
            <img
              src="/assets/logo-alyto.png"
              alt="Alyto"
              className="h-9 w-auto object-contain"
            />
            <div className="flex items-center gap-2.5">
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 px-3 h-9 rounded-full border border-[#C4CBD833] bg-[#C4CBD80D] text-[#C4CBD8] text-[0.75rem] font-semibold no-underline transition-all hover:bg-[#C4CBD81A] hover:border-[#C4CBD866]"
                >
                  <Shield size={13} />
                  Backoffice
                </Link>
              )}
              <button className="w-10 h-10 rounded-full bg-[#1A2340] flex items-center justify-center">
                <Bell size={17} className="text-[#8A96B8]" />
              </button>
              {/* Usuario: nombre + badge entidad */}
              {firstName && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[0.8125rem] font-semibold text-white leading-none">
                    {firstName}
                  </span>
                  <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded-md bg-[#1A2340] border border-[#263050] text-[#8A96B8] leading-none">
                    {legalEntity}
                  </span>
                </div>
              )}
              {/* Avatar con iniciales */}
              <div className="w-10 h-10 rounded-full border-2 border-[#C4CBD8] bg-[#1D3461] flex items-center justify-center text-[#C4CBD8] text-xs font-bold tracking-wide">
                {firstName ? firstName.charAt(0).toUpperCase() : 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* SECCIÓN 1 — WelcomeBanner                                   */}
        {/* ─────────────────────────────────────────────────────────── */}
        <WelcomeBanner
          firstName={firstName}
          kycStatus={kycStatus}
          activeTransactions={activeTransactions}
        />

        {/* ─────────────────────────────────────────────────────────── */}
        {/* SECCIÓN 2 — Stats cards                                     */}
        {/* ─────────────────────────────────────────────────────────── */}
        {loading ? (
          <StatsSkeletons />
        ) : !hasTransactions ? (
          /* Estado vacío — primera visita */
          <div className="mx-4 mb-4 rounded-2xl border border-[#263050] bg-[#1A2340] px-5 py-6 text-center">
            <p className="text-[2rem] mb-2">🚀</p>
            <p className="text-[0.9375rem] font-semibold text-white mb-1">
              Bienvenido a Alyto
            </p>
            <p className="text-[0.8125rem] text-[#8A96B8]">
              Realiza tu primera transferencia hoy
            </p>
          </div>
        ) : (
          /* Stats cards — scroll horizontal */
          <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 mb-4 pb-1">
            <StatCard
              label="Total enviado"
              value={`$${formatCLP(stats.totalSent)} CLP`}
              accent="#FFFFFF"
            />
            <StatCard
              label="Transferencias"
              value={stats.totalTransactions}
              accent="#C4CBD8"
            />
            <StatCard
              label="Completadas"
              value={stats.completedTransactions}
              accent="#22C55E"
            />
            <StatCard
              label="En proceso"
              value={stats.activeTransactions}
              accent={stats.activeTransactions > 0 ? '#C4CBD8' : '#4E5A7A'}
            />
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* SECCIÓN 3 — QuickActions                                    */}
        {/* ─────────────────────────────────────────────────────────── */}
        <QuickActions kycStatus={kycStatus} />

        {/* ─────────────────────────────────────────────────────────── */}
        {/* SECCIÓN 3b — Acceso Plataforma Institucional (solo LLC)    */}
        {/* ─────────────────────────────────────────────────────────── */}
        {legalEntity === 'LLC' && (
          <div className="mx-4 mb-4">
            <Link
              to="/institutional"
              className="flex items-center justify-between px-4 py-4 rounded-2xl bg-[#1A2340] border border-[#263050] no-underline hover:border-[#C4CBD833] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#C4CBD81A] flex items-center justify-center flex-shrink-0">
                  <Shield size={18} className="text-[#C4CBD8]" />
                </div>
                <div>
                  <p className="text-[0.9375rem] font-bold text-white leading-tight">
                    Plataforma Institucional
                  </p>
                  <p className="text-[0.75rem] text-[#4E5A7A]">
                    On-ramp B2B · OwlPay Harbor · AV Finance LLC
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-[#4E5A7A] group-hover:text-[#C4CBD8] transition-colors flex-shrink-0" />
            </Link>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* SECCIÓN 3c — Acceso Wallet BOB (solo SRL Bolivia)           */}
        {/* ─────────────────────────────────────────────────────────── */}
        {legalEntity === 'SRL' && (
          <div className="mx-4 mb-4">
            <Link
              to="/wallet"
              className="flex items-center justify-between px-4 py-4 rounded-2xl bg-[#1A2340] border border-[#263050] no-underline hover:border-[#C4CBD833] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#22C55E1A] flex items-center justify-center flex-shrink-0">
                  <Wallet size={18} className="text-[#22C55E]" />
                </div>
                <div>
                  <p className="text-[0.9375rem] font-bold text-white leading-tight">
                    Mi Wallet BOB
                  </p>
                  <p className="text-[0.75rem] text-[#4E5A7A]">
                    Saldo en bolivianos · AV Finance SRL
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-[#4E5A7A] group-hover:text-[#C4CBD8] transition-colors flex-shrink-0" />
            </Link>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* SECCIÓN 3d — Acceso Reclamos PRILI (todos los usuarios)     */}
        {/* ─────────────────────────────────────────────────────────── */}
        <div className="mx-4 mb-4">
          <Link
            to="/reclamos"
            className="flex items-center justify-between px-4 py-4 rounded-2xl bg-[#1A2340] border border-[#263050] no-underline hover:border-[#C4CBD833] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#3B82F61A] flex items-center justify-center flex-shrink-0">
                <AlertCircle size={18} className="text-[#3B82F6]" />
              </div>
              <div>
                <p className="text-[0.9375rem] font-bold text-white leading-tight">
                  Mis Reclamos
                </p>
                <p className="text-[0.75rem] text-[#4E5A7A]">
                  Punto de Reclamo PRILI · ASFI
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#4E5A7A] group-hover:text-[#C4CBD8] transition-colors flex-shrink-0" />
          </Link>
        </div>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* SECCIÓN 4 — RecentTransactions                              */}
        {/* ─────────────────────────────────────────────────────────── */}
        <RecentTransactions
          transactions={recentTxs}
          loading={loading}
        />

        {/* ─────────────────────────────────────────────────────────── */}
        {/* SECCIÓN 5 — ¿A dónde puedes enviar?                        */}
        {/* ─────────────────────────────────────────────────────────── */}
        <div className="mb-4">
          <div className="flex items-center justify-between px-4 mb-3">
            <p className="text-base font-bold text-white">¿A dónde puedes enviar?</p>
            {destCountries.length > 0 && (
              <span className="text-[0.6875rem] font-medium text-[#4E5A7A]">
                {destCountries.length} país{destCountries.length !== 1 ? 'es' : ''}
              </span>
            )}
          </div>
          {destCountries.length === 0 ? (
            <div className="mx-4 px-4 py-4 rounded-2xl bg-[#1A2340] border border-[#263050] text-center">
              <p className="text-[0.8125rem] text-[#4E5A7A]">
                Sin destinos disponibles aún.
              </p>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-1">
              {destCountries.map((c) => (
                <DestinationCountryCard key={c.code} country={c} />
              ))}
            </div>
          )}
        </div>

        {/* Error global — solo si no hay datos previos */}
        {error && !data && (
          <div className="mx-4 mb-4 rounded-2xl border border-[#EF444433] bg-[#EF44441A] px-4 py-3">
            <p className="text-[0.875rem] text-[#EF4444]">{error}</p>
          </div>
        )}

      </div>

      {/* ── BOTTOM NAV (fijo) ──────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#0F1628] border-t border-[#1A2340] flex justify-around px-2 pt-2.5 pb-6 z-50">
        {[
          { icon: Home,      label: 'Inicio',          to: '/'             },
          { icon: BarChart2, label: 'Activos',          to: '/assets'       },
          { icon: FileText,  label: 'Transferencias',   to: '/transactions' },
          { icon: User,      label: 'Perfil',           to: '/profile'      },
        ].map(({ icon: Icon, label, to }) => {
          const active = to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(to)
          return (
            <Link
              key={label}
              to={to}
              className="flex flex-col items-center gap-1 min-w-[56px] no-underline"
            >
              <Icon size={20} className={active ? 'text-[#C4CBD8]' : 'text-[#4E5A7A]'} />
              <span className={`text-[0.625rem] font-medium ${active ? 'text-[#C4CBD8]' : 'text-[#4E5A7A]'}`}>
                {label}
              </span>
              {active && <span className="w-1 h-1 rounded-full bg-[#C4CBD8]" />}
            </Link>
          )
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 min-w-[56px] text-[#4E5A7A] transition-colors active:text-[#F87171]"
        >
          <LogOut size={20} />
          <span className="text-[0.625rem] font-medium">Salir</span>
        </button>
      </nav>

    </div>
  )
}
