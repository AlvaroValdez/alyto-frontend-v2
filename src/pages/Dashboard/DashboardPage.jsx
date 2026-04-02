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

import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ChevronRight, Wallet, AlertCircle, Shield } from 'lucide-react'
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
    <div className="flex-shrink-0 w-36 bg-white rounded-2xl p-4 border border-[#E2E8F0]">
      <p className="text-[0.6875rem] font-medium text-[#64748B] uppercase tracking-[0.08em] mb-2 truncate">
        {label}
      </p>
      <p
        className="text-[1.125rem] font-bold leading-none"
        style={{ color: accent ?? '#0F172A' }}
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
        <div key={i} className="flex-shrink-0 w-36 bg-white rounded-2xl p-4 border border-[#E2E8F0] animate-pulse">
          <div className="h-2.5 bg-[#E2E8F0] rounded-full w-4/5 mb-3" />
          <div className="h-5 bg-[#F1F5F9] rounded-full w-3/5" />
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
    <div className="flex-shrink-0 bg-white rounded-2xl p-3.5 border border-[#E2E8F0] min-w-[108px] flex flex-col items-center gap-2">
      <span className="text-[2rem] leading-none">{country.flag}</span>
      <div className="text-center">
        <p className="text-[0.75rem] font-semibold text-[#0F172A] leading-tight">{country.name}</p>
        <p className="text-[0.625rem] text-[#94A3B8] mt-0.5">{country.currency}</p>
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
  const navigate = useNavigate()
  const { user } = useAuth()

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

  // Datos del dashboard: usar data de la API o fallback a AuthContext
  const firstName        = data?.user?.firstName ?? user?.firstName ?? ''
  const legalEntity      = data?.user?.entity    ?? user?.legalEntity ?? 'LLC'
  const kycStatus        = data?.user?.kycStatus ?? user?.kycStatus  ?? 'pending'
  const activeTransactions = data?.stats?.activeTransactions ?? 0
  const stats            = data?.stats
  const recentTxs        = data?.recentTransactions ?? []

  const hasTransactions = stats != null && stats.totalTransactions > 0

  // Moneda de origen según entidad del usuario
  const originCurrency = legalEntity === 'SRL' ? 'BOB' : legalEntity === 'LLC' ? 'USD' : 'CLP'

  function formatOriginAmount(amount) {
    const decimals = originCurrency === 'CLP' ? 0 : 2
    return new Intl.NumberFormat('es-CL', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount ?? 0)
  }

  return (
    <div className="pt-4">

        {/* ─────────────────────────────────────────────────────────── */}
        {/* Mi Wallet BOB — justo debajo del header (solo SRL)          */}
        {/* ─────────────────────────────────────────────────────────── */}
        {legalEntity === 'SRL' && (
          <div className="mx-4 mb-3">
            <Link
              to="/wallet"
              className="flex items-center justify-between px-4 py-4 rounded-2xl bg-white border border-[#E2E8F0] no-underline hover:border-[#233E5833] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#22C55E1A] flex items-center justify-center flex-shrink-0">
                  <Wallet size={18} className="text-[#22C55E]" />
                </div>
                <div>
                  <p className="text-[0.9375rem] font-bold text-[#0F172A] leading-tight">
                    Mi Wallet BOB
                  </p>
                  <p className="text-[0.75rem] text-[#94A3B8]">
                    Saldo en bolivianos · AV Finance SRL
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-[#94A3B8] group-hover:text-[#233E58] transition-colors flex-shrink-0" />
            </Link>
          </div>
        )}

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
          <div className="mx-4 mb-4 rounded-2xl border border-[#E2E8F0] bg-white px-5 py-6 text-center">
            <p className="text-[2rem] mb-2">🚀</p>
            <p className="text-[0.9375rem] font-semibold text-[#0F172A] mb-1">
              Bienvenido a Alyto
            </p>
            <p className="text-[0.8125rem] text-[#64748B]">
              Realiza tu primera transferencia hoy
            </p>
          </div>
        ) : (
          /* Stats cards — scroll horizontal */
          <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 mb-4 pb-1">
            <StatCard
              label="Total enviado"
              value={`${formatOriginAmount(stats.totalSent)} ${originCurrency}`}
              accent="#0F172A"
            />
            <StatCard
              label="Transferencias"
              value={stats.totalTransactions}
              accent="#233E58"
            />
            <StatCard
              label="Completadas"
              value={stats.completedTransactions}
              accent="#22C55E"
            />
            <StatCard
              label="En proceso"
              value={stats.activeTransactions}
              accent={stats.activeTransactions > 0 ? '#233E58' : '#94A3B8'}
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
              className="flex items-center justify-between px-4 py-4 rounded-2xl bg-white border border-[#E2E8F0] no-underline hover:border-[#233E5833] transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#233E581A] flex items-center justify-center flex-shrink-0">
                  <Shield size={18} className="text-[#233E58]" />
                </div>
                <div>
                  <p className="text-[0.9375rem] font-bold text-[#0F172A] leading-tight">
                    Plataforma Institucional
                  </p>
                  <p className="text-[0.75rem] text-[#94A3B8]">
                    On-ramp B2B · OwlPay Harbor · AV Finance LLC
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-[#94A3B8] group-hover:text-[#233E58] transition-colors flex-shrink-0" />
            </Link>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* SECCIÓN 3c — Acceso Reclamos PRILI (todos los usuarios)     */}
        {/* ─────────────────────────────────────────────────────────── */}
        <div className="mx-4 mb-4">
          <Link
            to="/reclamos"
            className="flex items-center justify-between px-4 py-4 rounded-2xl bg-white border border-[#E2E8F0] no-underline hover:border-[#233E5833] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#3B82F61A] flex items-center justify-center flex-shrink-0">
                <AlertCircle size={18} className="text-[#3B82F6]" />
              </div>
              <div>
                <p className="text-[0.9375rem] font-bold text-[#0F172A] leading-tight">
                  Mis Reclamos
                </p>
                <p className="text-[0.75rem] text-[#94A3B8]">
                  Punto de Reclamo PRILI · ASFI
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[#94A3B8] group-hover:text-[#233E58] transition-colors flex-shrink-0" />
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
            <p className="text-base font-bold text-[#0F172A]">¿A dónde puedes enviar?</p>
            {destCountries.length > 0 && (
              <span className="text-[0.6875rem] font-medium text-[#94A3B8]">
                {destCountries.length} país{destCountries.length !== 1 ? 'es' : ''}
              </span>
            )}
          </div>
          {destCountries.length === 0 ? (
            <div className="mx-4 px-4 py-4 rounded-2xl bg-white border border-[#E2E8F0] text-center">
              <p className="text-[0.8125rem] text-[#94A3B8]">
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
  )
}
