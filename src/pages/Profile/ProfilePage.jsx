/**
 * ProfilePage.jsx — Pantalla de perfil de usuario de Alyto Wallet V2.0
 *
 * Layout:
 *   Header con avatar, nombre, email y badge de entidad
 *   KycStatusCard (siempre visible)
 *   Tabs: Datos personales | Seguridad | Notificaciones
 *   Bottom Nav (reutiliza el mismo patrón del Dashboard)
 */

import { useState, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { Home, BarChart2, FileText, User } from 'lucide-react'
import { useAuth }             from '../../context/AuthContext'
import { useProfile }          from '../../hooks/useProfile'
import KycStatusCard           from './KycStatusCard'
import PersonalInfoTab         from './PersonalInfoTab'
import SecurityTab             from './SecurityTab'
import NotificationsTab        from './NotificationsTab'

// ── Entity badge ──────────────────────────────────────────────────────────────

const ENTITY_COLORS = {
  LLC: { bg: '#C4CBD81A', border: '#C4CBD833', text: '#C4CBD8' },
  SpA: { bg: '#C4CBD81A', border: '#C4CBD833', text: '#C4CBD8' },
  SRL: { bg: '#22C55E1A', border: '#22C55E33', text: '#22C55E' },
}

function EntityBadge({ entity }) {
  const style = ENTITY_COLORS[entity] ?? ENTITY_COLORS.LLC
  return (
    <span
      className="inline-block text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border"
      style={{ background: style.bg, borderColor: style.border, color: style.text }}
    >
      AV Finance {entity}
    </span>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ firstName, lastName, size = 72 }) {
  const initials = [firstName?.[0], lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || 'A'

  return (
    <div
      className="rounded-full border-4 border-[#C4CBD8] bg-gradient-to-br from-[#1D3461] to-[#0F1628] flex items-center justify-center font-bold text-[#C4CBD8] tracking-wide shadow-[0_0_0_3px_#0F1628]"
      style={{ width: size, height: size, fontSize: size * 0.3 }}
    >
      {initials}
    </div>
  )
}

// ── Tab navigation ────────────────────────────────────────────────────────────

const TABS = [
  { key: 'info',    label: 'Datos personales' },
  { key: 'security', label: 'Seguridad'       },
  { key: 'notif',   label: 'Notificaciones'   },
]

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex flex-col items-center gap-3 px-5 pb-5">
        <div className="w-[72px] h-[72px] rounded-full bg-[#1A2340]" />
        <div className="h-5 w-36 bg-[#1A2340] rounded-full" />
        <div className="h-3.5 w-44 bg-[#1A2340] rounded-full" />
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const location   = useLocation()
  const { user }   = useAuth()
  const { profile, loading, saving, fetchProfile, updateProfile, changePassword, removeDevice } = useProfile()

  const [activeTab, setActiveTab] = useState('info')

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  // Usar datos del perfil si ya cargaron, sino hacer fallback al AuthContext
  const displayName = profile
    ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()
    : `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()

  const email       = profile?.email       ?? user?.email       ?? ''
  const kycStatus   = profile?.kycStatus   ?? user?.kycStatus   ?? null
  const legalEntity = profile?.legalEntity ?? user?.legalEntity ?? 'LLC'

  return (
    <div className="min-h-screen bg-[#0F1628] font-sans flex flex-col max-w-[430px] mx-auto relative">

      <div className="flex-1 overflow-y-auto scrollbar-hide pb-24">

        {/* ── STATUS BAR ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <span className="text-[0.8125rem] font-semibold text-white">
            {new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="flex items-center gap-1.5 text-white">
            <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor" opacity="0.9">
              <rect x="0" y="3" width="3" height="9" rx="1"/>
              <rect x="4.5" y="2" width="3" height="10" rx="1"/>
              <rect x="9" y="0.5" width="3" height="11.5" rx="1"/>
              <rect x="13.5" y="0" width="3" height="12" rx="1" opacity="0.3"/>
            </svg>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor" opacity="0.9">
              <path d="M8 2.4C10.4 2.4 12.6 3.4 14.1 5L15.5 3.5C13.6 1.3 10.9 0 8 0C5.1 0 2.4 1.3 0.5 3.5L1.9 5C3.4 3.4 5.6 2.4 8 2.4Z"/>
              <path d="M8 5.6C9.7 5.6 11.2 6.3 12.3 7.4L13.7 5.9C12.2 4.4 10.2 3.5 8 3.5C5.8 3.5 3.8 4.4 2.3 5.9L3.7 7.4C4.8 6.3 6.3 5.6 8 5.6Z"/>
              <circle cx="8" cy="10.5" r="1.5"/>
            </svg>
            <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
              <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="currentColor" strokeOpacity="0.35"/>
              <rect x="2" y="2" width="17" height="8" rx="2" fill="currentColor"/>
              <path d="M23 4.5V7.5C23.8 7.2 24.5 6.4 24.5 6C24.5 5.6 23.8 4.8 23 4.5Z" fill="currentColor" fillOpacity="0.4"/>
            </svg>
          </div>
        </div>

        {/* ── HEADER SECTION ──────────────────────────────────────── */}
        <div className="px-5 pt-4 pb-6">
          {/* Page title */}
          <p className="text-[0.75rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-5">
            Mi perfil
          </p>

          {loading && !profile ? (
            <ProfileSkeleton />
          ) : (
            <div className="flex flex-col items-center gap-2 text-center">
              {/* Avatar */}
              <Avatar
                firstName={profile?.firstName ?? user?.firstName}
                lastName={profile?.lastName  ?? user?.lastName}
                size={72}
              />

              {/* Nombre completo */}
              <div className="mt-1">
                <h1 className="text-[1.25rem] font-bold text-white leading-tight">
                  {displayName || 'Usuario Alyto'}
                </h1>
              </div>

              {/* Email — no editable */}
              <div className="flex items-center gap-1.5">
                <span className="text-[0.875rem] text-[#8A96B8]">{email}</span>
              </div>

              {/* Entity badge */}
              <EntityBadge entity={legalEntity} />
            </div>
          )}
        </div>

        {/* ── KYC STATUS CARD ─────────────────────────────────────── */}
        <KycStatusCard kycStatus={kycStatus} />

        {/* ── TABS ────────────────────────────────────────────────── */}
        <div className="px-4 mb-1">
          <div className="flex gap-2 bg-[#1A2340] rounded-2xl p-1.5 border border-[#263050]">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 text-[0.75rem] font-semibold rounded-xl transition-all ${
                  activeTab === tab.key
                    ? 'bg-[#C4CBD8] text-[#0F1628] shadow-sm'
                    : 'text-[#4E5A7A] hover:text-[#8A96B8]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── TAB CONTENT ─────────────────────────────────────────── */}
        {activeTab === 'info' && (
          <PersonalInfoTab
            profile={profile}
            saving={saving}
            onUpdate={updateProfile}
          />
        )}
        {activeTab === 'security' && (
          <SecurityTab
            profile={profile}
            saving={saving}
            onChangePassword={changePassword}
            onRemoveDevice={removeDevice}
          />
        )}
        {activeTab === 'notif' && (
          <NotificationsTab
            profile={profile}
            saving={saving}
            onUpdate={updateProfile}
          />
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
      </nav>

    </div>
  )
}
