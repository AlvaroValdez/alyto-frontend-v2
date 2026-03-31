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
import { useAuth }             from '../../context/AuthContext'
import { useProfile }          from '../../hooks/useProfile'
import KycStatusCard           from './KycStatusCard'
import PersonalInfoTab         from './PersonalInfoTab'
import SecurityTab             from './SecurityTab'
import NotificationsTab        from './NotificationsTab'
import KybTab                  from './KybTab'

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
  { key: 'info',     label: 'Datos personales' },
  { key: 'security', label: 'Seguridad'        },
  { key: 'notif',    label: 'Notificaciones'   },
  { key: 'business', label: 'Business'         },
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
    <div className="pt-2">

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
        {activeTab === 'business' && (
          <KybTab kycStatus={kycStatus} legalEntity={legalEntity} />
        )}

    </div>
  )
}
