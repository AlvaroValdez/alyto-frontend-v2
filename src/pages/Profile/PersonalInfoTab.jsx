/**
 * PersonalInfoTab.jsx — Datos personales editables del usuario.
 *
 * Modo lectura por defecto; botón "Editar" activa el formulario.
 * PATCH /api/v1/user/profile al guardar.
 */

import { useState, useEffect } from 'react'
import { User, Phone, Globe, Languages, DollarSign, Lock, Edit2, Check, X, Loader2 } from 'lucide-react'

const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
]

const CURRENCIES = [
  { value: 'BOB',  label: 'BOB — Boliviano' },
  { value: 'CLP',  label: 'CLP — Peso chileno' },
  { value: 'USD',  label: 'USD — Dólar estadounidense' },
  { value: 'USDC', label: 'USDC — USD Coin' },
]

// ── Toast inline ─────────────────────────────────────────────────────────────

function SuccessToast({ visible }) {
  if (!visible) return null
  return (
    <div className="mx-4 mb-3 rounded-xl bg-[#1D9E751A] border border-[#1D9E7533] px-4 py-2.5 flex items-center gap-2">
      <Check size={14} className="text-[#1D9E75] flex-shrink-0" />
      <span className="text-[0.8125rem] font-medium text-[#1D9E75]">Perfil actualizado</span>
    </div>
  )
}

// ── Field component ───────────────────────────────────────────────────────────

function ReadField({ icon: Icon, label, value, locked }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#E2E8F0] last:border-0">
      <div className="w-8 h-8 rounded-xl bg-[#F0F2F7] flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-[#4A5568]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[0.6875rem] font-medium text-[#4A5568] uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-[0.9375rem] font-medium text-[#0D1F3C] truncate">{value || '—'}</p>
      </div>
      {locked && <Lock size={13} className="text-[#94A3B8] flex-shrink-0" />}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PersonalInfoTab({ profile, saving, onUpdate }) {
  const defaultCurrency =
    profile?.entity === 'SRL' ? 'BOB' :
    profile?.entity === 'LLC' ? 'USD' : 'CLP'

  const [editing,   setEditing]   = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [form,      setForm]      = useState({
    firstName:         '',
    lastName:          '',
    phone:             '',
    preferredLanguage: 'es',
    preferredCurrency: defaultCurrency,
  })

  // Sincronizar form cuando llega el perfil
  useEffect(() => {
    if (profile) {
      setForm({
        firstName:         profile.firstName                ?? '',
        lastName:          profile.lastName                 ?? '',
        phone:             profile.phone                    ?? '',
        preferredLanguage: profile.preferences?.language    ?? 'es',
        preferredCurrency: profile.preferences?.currency    ?? defaultCurrency,
      })
    }
  }, [profile])

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleCancel() {
    // Revertir al estado del perfil guardado
    if (profile) {
      setForm({
        firstName:         profile.firstName                ?? '',
        lastName:          profile.lastName                 ?? '',
        phone:             profile.phone                    ?? '',
        preferredLanguage: profile.preferences?.language    ?? 'es',
        preferredCurrency: profile.preferences?.currency    ?? defaultCurrency,
      })
    }
    setEditing(false)
  }

  async function handleSave() {
    try {
      await onUpdate({
        firstName: form.firstName,
        lastName:  form.lastName,
        phone:     form.phone,
        preferences: {
          language: form.preferredLanguage,
          currency: form.preferredCurrency,
        },
      })
      // Persistir idioma en localStorage para acceso global
      localStorage.setItem('alyto_language', form.preferredLanguage)
      document.documentElement.lang = form.preferredLanguage
      setEditing(false)
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } catch {
      // El error se maneja en el hook padre
    }
  }

  const countryLabel = profile?.country
    ? `${profile.country}${profile.entity ? ` · ${profile.entity}` : ''}`
    : '—'

  return (
    <div className="py-4">
      <SuccessToast visible={showToast} />

      {/* Cabecera de sección */}
      <div className="flex items-center justify-between px-4 mb-3">
        <p className="text-[0.75rem] font-semibold text-[#4A5568] uppercase tracking-wider">
          Datos personales
        </p>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-[#1D9E75] text-[0.8125rem] font-semibold"
          >
            <Edit2 size={13} />
            Editar
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="text-[#4A5568] text-[0.8125rem] font-medium flex items-center gap-1"
            >
              <X size={13} />
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 bg-[#1D9E75] text-[#0D1F3C] text-[0.8125rem] font-bold px-3 py-1.5 rounded-lg disabled:opacity-60 transition-opacity"
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Check size={13} />
              )}
              Guardar
            </button>
          </div>
        )}
      </div>

      {/* Tarjeta de campos */}
      <div className="mx-4 bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        {editing ? (
          /* ── Modo edición ─────────────────────────────────────── */
          <div className="divide-y divide-[#E2E8F0]">
            {/* Nombre */}
            <div className="px-4 py-3">
              <label className="text-[0.6875rem] font-medium text-[#4A5568] uppercase tracking-wide block mb-1.5">
                Nombre
              </label>
              <input
                type="text"
                value={form.firstName}
                onChange={e => handleChange('firstName', e.target.value)}
                placeholder="Tu nombre"
                className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-[0.9375rem] text-[#0D1F3C] placeholder:text-[#CBD5E1] focus:border-[#1D9E75] focus:shadow-[0_0_0_2px_#233E5820] outline-none transition-all"
              />
            </div>

            {/* Apellido */}
            <div className="px-4 py-3">
              <label className="text-[0.6875rem] font-medium text-[#4A5568] uppercase tracking-wide block mb-1.5">
                Apellido
              </label>
              <input
                type="text"
                value={form.lastName}
                onChange={e => handleChange('lastName', e.target.value)}
                placeholder="Tu apellido"
                className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-[0.9375rem] text-[#0D1F3C] placeholder:text-[#CBD5E1] focus:border-[#1D9E75] focus:shadow-[0_0_0_2px_#233E5820] outline-none transition-all"
              />
            </div>

            {/* Teléfono */}
            <div className="px-4 py-3">
              <label className="text-[0.6875rem] font-medium text-[#4A5568] uppercase tracking-wide block mb-1.5">
                Teléfono
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="+56 9 1234 5678"
                className="w-full bg-white border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-[0.9375rem] text-[#0D1F3C] placeholder:text-[#CBD5E1] focus:border-[#1D9E75] focus:shadow-[0_0_0_2px_#233E5820] outline-none transition-all"
              />
            </div>

            {/* País — solo lectura */}
            <div className="px-4 py-3">
              <label className="text-[0.6875rem] font-medium text-[#4A5568] uppercase tracking-wide block mb-1.5">
                País / Entidad
              </label>
              <div className="flex items-center gap-2 bg-[#F0F2F7] border border-[#E2E8F0] rounded-xl px-3 py-2.5">
                <Globe size={14} className="text-[#94A3B8]" />
                <span className="text-[0.9375rem] text-[#94A3B8]">{countryLabel}</span>
                <Lock size={12} className="text-[#94A3B8] ml-auto" />
              </div>
            </div>

            {/* Idioma */}
            <div className="px-4 py-3">
              <label className="text-[0.6875rem] font-medium text-[#4A5568] uppercase tracking-wide block mb-1.5">
                Idioma preferido
              </label>
              <div className="relative">
                <select
                  value={form.preferredLanguage}
                  onChange={e => handleChange('preferredLanguage', e.target.value)}
                  className="w-full appearance-none bg-white border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-[0.9375rem] text-[#0D1F3C] focus:border-[#1D9E75] focus:shadow-[0_0_0_2px_#233E5820] outline-none transition-all"
                >
                  {LANGUAGES.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
                <Languages size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
              </div>
            </div>

            {/* Moneda */}
            <div className="px-4 py-3">
              <label className="text-[0.6875rem] font-medium text-[#4A5568] uppercase tracking-wide block mb-1.5">
                Moneda preferida
              </label>
              <div className="relative">
                <select
                  value={form.preferredCurrency}
                  onChange={e => handleChange('preferredCurrency', e.target.value)}
                  className="w-full appearance-none bg-white border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-[0.9375rem] text-[#0D1F3C] focus:border-[#1D9E75] focus:shadow-[0_0_0_2px_#233E5820] outline-none transition-all"
                >
                  {CURRENCIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <DollarSign size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none" />
              </div>
            </div>
          </div>
        ) : (
          /* ── Modo lectura ─────────────────────────────────────── */
          <>
            <ReadField icon={User}      label="Nombre"          value={`${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim()} />
            <ReadField icon={Phone}     label="Teléfono"        value={profile?.phone} />
            <ReadField icon={Globe}     label="País / Entidad"  value={countryLabel} locked />
            <ReadField icon={Languages} label="Idioma"          value={LANGUAGES.find(l => l.value === (profile?.preferences?.language ?? 'es'))?.label} />
            <ReadField icon={DollarSign} label="Moneda"         value={profile?.preferences?.currency ?? defaultCurrency} />
          </>
        )}
      </div>
    </div>
  )
}
