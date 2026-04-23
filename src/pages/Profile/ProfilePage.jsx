/**
 * ProfilePage.jsx — Pantalla de perfil de usuario de Alyto Wallet V2.0
 *
 * Layout:
 *   Header con avatar, nombre, email y badge de entidad
 *   KycStatusCard (siempre visible)
 *   Tabs: Datos personales | Seguridad | Notificaciones
 *   Bottom Nav (reutiliza el mismo patrón del Dashboard)
 */

import { useState, useEffect, useRef } from 'react'
import { Camera, FileText, Shield, ChevronRight } from 'lucide-react'
import { useAuth }             from '../../context/AuthContext'
import { useProfile }          from '../../hooks/useProfile'
import KycStatusCard           from './KycStatusCard'
import PersonalInfoTab         from './PersonalInfoTab'
import SecurityTab             from './SecurityTab'
import NotificationsTab        from './NotificationsTab'
import KybTab                  from './KybTab'
import LegalModal              from '../../components/Legal/LegalModal'

// ── Entity badge ──────────────────────────────────────────────────────────────

const ENTITY_COLORS = {
  LLC: { bg: '#233E581A', border: '#233E5833', text: '#1D3461' },
  SpA: { bg: '#233E581A', border: '#233E5833', text: '#1D3461' },
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

/**
 * Avatar interactivo con foto de perfil + overlay de cámara para cambiarla.
 * Redimensiona la imagen en canvas antes de enviar (max 400×400, JPEG 85%).
 */
function Avatar({ firstName, lastName, avatarUrl, size = 72, onUpload, uploading }) {
  const inputRef = useRef(null)

  const initials = [firstName?.[0], lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || 'A'

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    // Redimensionar en canvas antes de enviar (max 400×400, JPEG 85%)
    const resized = await resizeImage(file, 400, 0.85)
    onUpload(resized)
  }

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      {/* Foto o iniciales */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="Foto de perfil"
          className="rounded-full border-4 border-[#1D3461] object-cover shadow-[0_0_0_3px_#FFFFFF]"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="rounded-full border-4 border-[#1D3461] bg-gradient-to-br from-[#1D3461] to-[#0D1F3C] flex items-center justify-center font-bold text-white tracking-wide shadow-[0_0_0_3px_#FFFFFF]"
          style={{ width: size, height: size, fontSize: size * 0.3 }}
        >
          {initials}
        </div>
      )}

      {/* Overlay cámara */}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label="Cambiar foto de perfil"
        className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#1D3461] border-2 border-white flex items-center justify-center shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {uploading
          ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <Camera size={13} className="text-white" />
        }
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

/** Redimensiona imagen a maxPx×maxPx y devuelve un File JPEG. */
function resizeImage(file, maxPx, quality) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale  = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w      = Math.round(img.width  * scale)
      const h      = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        blob => resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' })),
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => resolve(file)   // fallback: enviar original
    img.src = URL.createObjectURL(file)
  })
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
        <div className="w-[72px] h-[72px] rounded-full bg-[#E2E8F0]" />
        <div className="h-5 w-36 bg-[#E2E8F0] rounded-full" />
        <div className="h-3.5 w-44 bg-[#E2E8F0] rounded-full" />
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user }   = useAuth()
  const { profile, loading, saving, fetchProfile, updateProfile, changePassword, removeDevice, uploadAvatar } = useProfile()

  const [activeTab,     setActiveTab]     = useState('info')
  const [avatarError,   setAvatarError]   = useState('')
  const [legalDoc,      setLegalDoc]      = useState(null)

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
  const avatarUrl   = profile?.avatarUrl   ?? user?.avatarUrl   ?? null

  async function handleAvatarUpload(file) {
    setAvatarError('')
    try {
      await uploadAvatar(file)
    } catch (err) {
      setAvatarError(err.message || 'No se pudo subir la foto.')
    }
  }

  return (
    <div className="pt-2">

        {/* ── HEADER SECTION ──────────────────────────────────────── */}
        <div className="px-5 pt-4 pb-6">
          {/* Page title */}
          <p className="text-[0.75rem] font-semibold text-[#94A3B8] uppercase tracking-wider mb-5">
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
                avatarUrl={avatarUrl}
                size={72}
                onUpload={handleAvatarUpload}
                uploading={saving}
              />
              {avatarError && (
                <p className="text-[0.75rem] text-[#EF4444]">{avatarError}</p>
              )}

              {/* Nombre completo */}
              <div className="mt-1">
                <h1 className="text-[1.25rem] font-bold text-white leading-tight">
                  {displayName || 'Usuario Alyto'}
                </h1>
              </div>

              {/* Email — no editable */}
              <div className="flex items-center gap-1.5">
                <span className="text-[0.875rem] text-[#4A5568]">{email}</span>
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
          <div className="flex gap-2 bg-[#F0F2F7] rounded-2xl p-1.5 border border-[#E2E8F0]">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 text-[0.75rem] font-semibold rounded-xl transition-all ${
                  activeTab === tab.key
                    ? 'bg-[#1D3461] text-white shadow-sm'
                    : 'text-[#94A3B8] hover:text-[#4A5568]'
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
            onRemoveDevice={removeDevice}
          />
        )}
        {activeTab === 'business' && (
          <KybTab kycStatus={kycStatus} legalEntity={legalEntity} />
        )}

        {/* ── LEGAL SECTION ───────────────────────────────────────── */}
        <div className="px-4 mt-6 mb-4">
          <p className="text-[0.6875rem] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2 px-1">
            Legal
          </p>
          <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
            <button
              onClick={() => setLegalDoc('terms')}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#F0F2F7] transition-colors border-b border-[#E2E8F0]"
            >
              <div className="w-8 h-8 rounded-lg bg-[#1D34611A] flex items-center justify-center flex-shrink-0">
                <FileText size={15} className="text-[#1D3461]" />
              </div>
              <span className="flex-1 text-left text-[0.875rem] font-semibold text-white">
                Términos y Condiciones
              </span>
              <ChevronRight size={16} className="text-[#94A3B8] flex-shrink-0" />
            </button>
            <button
              onClick={() => setLegalDoc('privacy')}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#F0F2F7] transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-[#1D34611A] flex items-center justify-center flex-shrink-0">
                <Shield size={15} className="text-[#1D3461]" />
              </div>
              <span className="flex-1 text-left text-[0.875rem] font-semibold text-white">
                Política de Privacidad
              </span>
              <ChevronRight size={16} className="text-[#94A3B8] flex-shrink-0" />
            </button>
          </div>
        </div>

        <LegalModal
          isOpen={!!legalDoc}
          onClose={() => setLegalDoc(null)}
          docType={legalDoc ?? 'terms'}
        />

    </div>
  )
}
