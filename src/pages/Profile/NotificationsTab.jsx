/**
 * NotificationsTab.jsx — Preferencias de notificaciones.
 *
 * Toggle switches para email y push. Auto-save via PATCH /user/profile.
 * Conecta el toggle de push a FCM real: pide permiso al navegador,
 * genera token y lo registra en backend vía usePushNotifications.
 */

import { useState, useEffect } from 'react'
import { Mail, Bell, BellOff } from 'lucide-react'
import Toggle from '../../components/ui/Toggle'
import { usePushNotifications } from '../../hooks/usePushNotifications'

// ── Notification row ──────────────────────────────────────────────────────────

function NotifRow({ icon: Icon, title, description, checked, loading, onChange, disabled }) {
  return (
    <div className="flex items-center gap-3 px-4 py-4">
      <div className="w-9 h-9 rounded-xl bg-[#F8FAFC] flex items-center justify-center flex-shrink-0">
        <Icon size={15} className="text-[#64748B]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[0.9375rem] font-semibold text-[#0F172A] leading-tight">{title}</p>
        <p className="text-[0.75rem] text-[#64748B] mt-0.5 leading-snug">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled || loading} loading={loading} />
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function NotificationsTab({ profile, saving, onUpdate, onRemoveDevice }) {
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [pushEnabled,  setPushEnabled]  = useState(false)
  const [savingEmail,  setSavingEmail]  = useState(false)
  const [savingPush,   setSavingPush]   = useState(false)

  const {
    permission,
    token,
    requestPermission,
    clearToken,
  } = usePushNotifications()

  const pushBlocked = permission === 'denied'
  const pushGranted = permission === 'granted' && !!token
  const pushDefault = permission === 'default'

  // Sincronizar desde el perfil cargado — push activo solo si el dispositivo
  // obtuvo token en esta sesión + tiene permiso de navegador.
  useEffect(() => {
    const notifPrefs = profile?.preferences?.notifications ?? profile?.notifications
    if (notifPrefs) {
      setEmailEnabled(notifPrefs.email ?? true)
      const profilePush   = notifPrefs.push ?? false
      const hasPermission = typeof Notification !== 'undefined' && Notification.permission === 'granted'
      setPushEnabled(profilePush && !!token && hasPermission)
    }
  }, [profile, token])

  async function handleEmailToggle(val) {
    setEmailEnabled(val)
    setSavingEmail(true)
    try {
      await onUpdate({ preferences: { notifications: { email: val, push: pushEnabled } } })
    } catch {
      setEmailEnabled(!val)
    } finally {
      setSavingEmail(false)
    }
  }

  async function handlePushToggle(val) {
    if (pushBlocked) return

    // CASO 1: Desactivar
    if (!val) {
      setPushEnabled(false)
      setSavingPush(true)
      try {
        await onUpdate({ preferences: { notifications: { email: emailEnabled, push: false } } })
        if (token && onRemoveDevice) {
          await onRemoveDevice(token)
        }
        clearToken()
      } catch {
        setPushEnabled(true)
      } finally {
        setSavingPush(false)
      }
      return
    }

    // CASO 2 y 3 unificados: Activar (con o sin permiso/token previos)
    setSavingPush(true)
    try {
      await requestPermission()

      const granted = typeof Notification !== 'undefined' && Notification.permission === 'granted'

      if (granted) {
        setPushEnabled(true)
        await onUpdate({ preferences: { notifications: { email: emailEnabled, push: true } } })
      } else {
        console.warn('[FCM] Push activation failed: permission not granted')
        setPushEnabled(false)
      }
    } catch (err) {
      console.error('[FCM] Push activation error:', err)
      setPushEnabled(false)
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
          checked={emailEnabled}
          loading={savingEmail}
          onChange={handleEmailToggle}
        />

        <NotifRow
          icon={pushBlocked ? BellOff : Bell}
          title="Notificaciones push"
          description={
            pushBlocked ? 'Bloqueadas en el navegador — actívalas en configuración' :
            pushGranted ? 'Activas en este dispositivo' :
            pushDefault ? 'Toca para activar alertas en este dispositivo' :
                          'Recibir alertas en este dispositivo'
          }
          checked={pushEnabled && pushGranted}
          loading={savingPush}
          onChange={handlePushToggle}
          disabled={pushBlocked}
        />
      </div>

      {/* Aviso: bloqueadas en el navegador */}
      {pushBlocked && (
        <div className="mx-4 mt-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl px-4 py-3.5 flex items-start gap-3">
          <BellOff size={16} className="text-[#64748B] flex-shrink-0 mt-0.5" />
          <p className="text-[0.8125rem] text-[#64748B] leading-snug">
            Las notificaciones están <strong className="text-[#0F172A]">bloqueadas</strong> en tu navegador.
            Actívalas en la configuración de tu navegador para recibir alertas.
          </p>
        </div>
      )}

      {/* Aviso: permiso no solicitado aún */}
      {!pushBlocked && pushDefault && !pushEnabled && (
        <div className="mx-4 mt-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl px-4 py-3.5 flex items-start gap-3">
          <Bell size={16} className="text-[#3B82F6] flex-shrink-0 mt-0.5" />
          <p className="text-[0.8125rem] text-[#1D4ED8] leading-snug">
            Activa las notificaciones para recibir alertas instantáneas
            cuando tus pagos sean procesados.
          </p>
        </div>
      )}
    </div>
  )
}
