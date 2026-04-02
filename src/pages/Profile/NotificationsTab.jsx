/**
 * NotificationsTab.jsx — Preferencias de notificaciones.
 *
 * Toggle switches para email y push. Auto-save via PATCH /user/profile.
 * Detecta si el navegador tiene notificaciones bloqueadas a nivel de sistema.
 */

import { useState, useEffect } from 'react'
import { Mail, Bell, BellOff, Loader2 } from 'lucide-react'

// ── Toggle Switch ─────────────────────────────────────────────────────────────

function Toggle({ enabled, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0 ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      } ${enabled ? 'bg-[#1D9E75]' : 'bg-[#E2E8F0]'}`}
      aria-checked={enabled}
      role="switch"
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
          enabled ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

// ── Notification row ──────────────────────────────────────────────────────────

function NotifRow({ icon: Icon, title, description, enabled, saving, onChange, disabled }) {
  return (
    <div className="flex items-start gap-3 px-4 py-4">
      <div className="w-9 h-9 rounded-xl bg-[#F8FAFC] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={15} className="text-[#64748B]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[0.9375rem] font-semibold text-[#0F172A] leading-tight">{title}</p>
        <p className="text-[0.75rem] text-[#64748B] mt-0.5 leading-snug">{description}</p>
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        {saving && <Loader2 size={12} className="text-[#1D9E75] animate-spin" />}
        <Toggle enabled={enabled} onChange={onChange} disabled={disabled || saving} />
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function NotificationsTab({ profile, saving, onUpdate }) {
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [pushEnabled,  setPushEnabled]  = useState(false)
  const [savingEmail,  setSavingEmail]  = useState(false)
  const [savingPush,   setSavingPush]   = useState(false)

  const pushBlocked = typeof window !== 'undefined'
    && 'Notification' in window
    && Notification.permission === 'denied'

  // Sincronizar desde el perfil cargado
  useEffect(() => {
    if (profile?.notifications) {
      setEmailEnabled(profile.notifications.email ?? true)
      setPushEnabled(profile.notifications.push   ?? false)
    }
  }, [profile])

  async function handleEmailToggle(val) {
    setEmailEnabled(val)
    setSavingEmail(true)
    try {
      await onUpdate({ notifications: { email: val, push: pushEnabled } })
    } catch {
      // Revertir en caso de error
      setEmailEnabled(!val)
    } finally {
      setSavingEmail(false)
    }
  }

  async function handlePushToggle(val) {
    if (pushBlocked) return
    setPushEnabled(val)
    setSavingPush(true)
    try {
      await onUpdate({ notifications: { email: emailEnabled, push: val } })
    } catch {
      setPushEnabled(!val)
    } finally {
      setSavingPush(false)
    }
  }

  return (
    <div className="py-4">
      <p className="text-[0.75rem] font-semibold text-[#64748B] uppercase tracking-wider px-4 mb-3">
        Preferencias
      </p>

      <div className="mx-4 bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden divide-y divide-[#E2E8F0]">
        <NotifRow
          icon={Mail}
          title="Notificaciones por email"
          description="Recibir emails cuando tu transferencia cambie de estado"
          enabled={emailEnabled}
          saving={savingEmail}
          onChange={handleEmailToggle}
        />

        <NotifRow
          icon={pushBlocked ? BellOff : Bell}
          title="Notificaciones push"
          description="Recibir alertas en este dispositivo"
          enabled={pushEnabled && !pushBlocked}
          saving={savingPush}
          onChange={handlePushToggle}
          disabled={pushBlocked}
        />
      </div>

      {/* Aviso bloqueadas en navegador */}
      {pushBlocked && (
        <div className="mx-4 mt-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl px-4 py-3.5 flex items-start gap-3">
          <BellOff size={16} className="text-[#64748B] flex-shrink-0 mt-0.5" />
          <p className="text-[0.8125rem] text-[#64748B] leading-snug">
            Las notificaciones están <strong className="text-[#0F172A]">bloqueadas</strong> en tu navegador.
            Actívalas en la configuración de tu navegador para recibir alertas.
          </p>
        </div>
      )}
    </div>
  )
}
