import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Star, Trash2, Loader2, AlertCircle,
  Search, Plus, X, Send, ChevronRight, Check,
  CreditCard, FileText, Building2, Mail, UserCheck, Pencil, Filter,
} from 'lucide-react'
import { useContacts } from '../../hooks/useContacts'
import { deleteContact, toggleContactFavorite, createContact, updateContact } from '../../services/api'

// ── Datos de países ───────────────────────────────────────────────────────────

const COUNTRY_META = {
  CO: { name: 'Colombia',        currency: 'COP', flagCode: 'co',
        docTypes: ['CC','CE','NIT','Pasaporte'],
        accountTypes: ['Cuenta de Ahorros','Cuenta Corriente','Daviplata','Nequi'] },
  PE: { name: 'Perú',            currency: 'PEN', flagCode: 'pe',
        docTypes: ['DNI','CE','RUC','Pasaporte'],
        accountTypes: ['Cuenta de Ahorros','Cuenta Corriente'] },
  BO: { name: 'Bolivia',         currency: 'BOB', flagCode: 'bo',
        docTypes: ['CI','NIT','Pasaporte'],
        accountTypes: ['Cuenta de Ahorros','Cuenta Corriente'] },
  AR: { name: 'Argentina',       currency: 'ARS', flagCode: 'ar',
        docTypes: ['DNI','CUIL','CUIT','Pasaporte'],
        accountTypes: ['Caja de Ahorros','Cuenta Corriente'] },
  MX: { name: 'México',          currency: 'MXN', flagCode: 'mx',
        docTypes: ['CURP','RFC','Pasaporte'],
        accountTypes: ['Cuenta de Débito','CLABE'] },
  BR: { name: 'Brasil',          currency: 'BRL', flagCode: 'br',
        docTypes: ['CPF','CNPJ','Pasaporte'],
        accountTypes: ['Conta Corrente','Conta Poupança','Chave PIX'] },
  CL: { name: 'Chile',           currency: 'CLP', flagCode: 'cl',
        docTypes: ['RUT','Pasaporte'],
        accountTypes: ['Cuenta Vista','Cuenta Corriente','Cuenta de Ahorro'] },
  EC: { name: 'Ecuador',         currency: 'USD', flagCode: 'ec',
        docTypes: ['CI','RUC','Pasaporte'],
        accountTypes: ['Cuenta de Ahorros','Cuenta Corriente'] },
  VE: { name: 'Venezuela',       currency: 'USD', flagCode: 've',
        docTypes: ['CI','Pasaporte'],
        accountTypes: ['Cuenta de Ahorros','Cuenta Corriente'] },
  PY: { name: 'Paraguay',        currency: 'PYG', flagCode: 'py',
        docTypes: ['CI','RUC','Pasaporte'],
        accountTypes: ['Cuenta de Ahorros','Cuenta Corriente'] },
  UY: { name: 'Uruguay',         currency: 'UYU', flagCode: 'uy',
        docTypes: ['CI','Pasaporte'],
        accountTypes: ['Caja de Ahorro','Cuenta Corriente'] },
  CR: { name: 'Costa Rica',      currency: 'CRC', flagCode: 'cr',
        docTypes: ['CI','Pasaporte'],
        accountTypes: ['Cuenta de Ahorros','Cuenta Corriente'] },
  PA: { name: 'Panamá',          currency: 'USD', flagCode: 'pa',
        docTypes: ['Cédula','Pasaporte'],
        accountTypes: ['Cuenta de Ahorros','Cuenta Corriente'] },
  DO: { name: 'Rep. Dominicana', currency: 'DOP', flagCode: 'do',
        docTypes: ['Cédula','Pasaporte'],
        accountTypes: ['Cuenta de Ahorros','Cuenta Corriente'] },
  GT: { name: 'Guatemala',       currency: 'GTQ', flagCode: 'gt',
        docTypes: ['DPI','Pasaporte'],
        accountTypes: ['Cuenta de Ahorros','Cuenta Monetaria'] },
  US: { name: 'Estados Unidos',  currency: 'USD', flagCode: 'us',
        docTypes: ['SSN','ITIN','Pasaporte'],
        accountTypes: ['Checking','Savings'] },
  GB: { name: 'Reino Unido',     currency: 'GBP', flagCode: 'gb',
        docTypes: ['Pasaporte','DNI'],
        accountTypes: ['Current Account','Savings Account'] },
  EU: { name: 'Europa',          currency: 'EUR', flagCode: 'eu',
        docTypes: ['Pasaporte','DNI'],
        accountTypes: ['Cuenta Corriente','Cuenta de Ahorros'] },
}

const COUNTRY_LIST = Object.entries(COUNTRY_META).map(([code, m]) => ({ code, ...m }))

function flagSrc(flagCode) {
  return `https://flagcdn.com/w80/${flagCode}.png`
}

// ── CountryFlag ───────────────────────────────────────────────────────────────

function CountryFlag({ code, size = 40 }) {
  const [err, setErr] = useState(false)
  const meta = COUNTRY_META[code]
  if (!meta || err) {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: '#E2E8F0',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, flexShrink: 0 }}>
        🌍
      </div>
    )
  }
  return (
    <img
      src={flagSrc(meta.flagCode)}
      alt={meta.name}
      width={size} height={size}
      onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover',
        border: '1.5px solid rgba(255,255,255,0.9)', flexShrink: 0 }}
    />
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, size = 46 }) {
  const initial = (name || '?').charAt(0).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #1D3461 0%, #162852 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, color: '#FFFFFF',
      flexShrink: 0, letterSpacing: '0.01em',
      boxShadow: '0 2px 8px rgba(29,52,97,0.25)',
    }}>
      {initial}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function contactName(c) {
  return (c.nickname ?? `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim()) || 'Sin nombre'
}

function timeAgo(iso) {
  if (!iso) return null
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return 'ahora'
  if (mins  < 60) return `hace ${mins}m`
  if (hours < 24) return `hace ${hours}h`
  if (days  < 7)  return `hace ${days}d`
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

// ── CountryPickerModal ────────────────────────────────────────────────────────

function CountryPickerModal({ selected, onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const filtered = query.trim()
    ? COUNTRY_LIST.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.currency.toLowerCase().includes(query.toLowerCase()) ||
        c.code.toLowerCase().includes(query.toLowerCase())
      )
    : COUNTRY_LIST

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end' }}
    >
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: '#FFFFFF', borderRadius: '24px 24px 0 0',
        maxHeight: '80dvh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0D1F3C' }}>
            País destino
          </h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%',
            background: '#F4F6FA', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#4A5568" />
          </button>
        </div>

        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} color="#94A3B8"
              style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              autoFocus
              type="text"
              placeholder="Buscar país…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 38, paddingRight: 12,
                paddingTop: 10, paddingBottom: 10, borderRadius: 12,
                border: '1px solid #E2E8F0', background: '#F4F6FA',
                fontSize: '0.875rem', color: '#0D1F3C', outline: 'none',
                fontFamily: "'Manrope', sans-serif" }}
            />
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          {filtered.map(c => {
            const isActive = selected === c.code
            return (
              <button key={c.code}
                onClick={() => { onSelect(c.code); onClose() }}
                style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                  padding: '12px 20px', background: isActive ? '#F5C518' : 'transparent',
                  border: 'none', borderBottom: '1px solid #F0F2F7',
                  cursor: 'pointer', textAlign: 'left', fontFamily: "'Manrope', sans-serif" }}
              >
                <img src={flagSrc(c.flagCode)} alt={c.name} width={44} height={44}
                  style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover',
                    border: '1px solid rgba(0,0,0,0.08)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: isActive ? 700 : 600, color: '#0D1F3C' }}>
                    {c.name}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#4A5568' }}>
                    {c.currency}
                  </p>
                </div>
                {isActive && (
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#1D3461',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check size={12} color="#fff" strokeWidth={2.5} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── AddContactSheet ───────────────────────────────────────────────────────────

const INPUT_STYLE = {
  width: '100%', boxSizing: 'border-box',
  padding: '12px 14px', borderRadius: 12,
  border: '1px solid #E2E8F0', background: '#FFFFFF',
  fontSize: '0.9375rem', color: '#0D1F3C', outline: 'none',
  fontFamily: "'Manrope', sans-serif', transition: 'border-color 0.15s'",
}
const SELECT_STYLE = { ...INPUT_STYLE, appearance: 'none', cursor: 'pointer' }
const LABEL_STYLE = {
  display: 'block', fontSize: '0.6875rem', fontWeight: 700,
  color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
}

function AddContactSheet({ onClose, onSaved }) {
  const [showCountryModal, setShowCountryModal] = useState(false)
  const [saving,           setSaving]           = useState(false)
  const [saveError,        setSaveError]        = useState('')

  const [form, setForm] = useState({
    country:        '',
    nickname:       '',
    firstName:      '',
    lastName:       '',
    docType:        '',
    docNumber:      '',
    bank:           '',
    accountNumber:  '',
    accountType:    '',
    email:          '',
  })

  const meta      = COUNTRY_META[form.country]
  const isValid   = form.country && form.firstName && form.lastName &&
                    form.docType && form.docNumber && form.accountNumber

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSave() {
    if (!isValid || saving) return
    setSaving(true)
    setSaveError('')
    try {
      await createContact({
        firstName:           form.firstName.trim(),
        lastName:            form.lastName.trim(),
        nickname:            form.nickname.trim() || undefined,
        destinationCountry:  form.country,
        destinationCurrency: meta?.currency,
        formType:            'bank_data',
        beneficiaryData: {
          beneficiary_first_name:      form.firstName.trim(),
          beneficiary_last_name:       form.lastName.trim(),
          beneficiary_document_type:   form.docType,
          beneficiary_document_number: form.docNumber.trim(),
          beneficiary_bank:            form.bank.trim() || undefined,
          beneficiary_account_number:  form.accountNumber.trim(),
          account_type_bank:           form.accountType || undefined,
          beneficiary_email:           form.email.trim() || undefined,
        },
      })
      onSaved()
      onClose()
    } catch (err) {
      setSaveError(err.message || 'No se pudo guardar el contacto')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: '#F4F6FA', borderRadius: '24px 24px 0 0',
        maxHeight: '92dvh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 20px 16px', background: '#F4F6FA', borderRadius: '24px 24px 0 0' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0D1F3C' }}>
            Nuevo contacto
          </h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%',
            background: '#FFFFFF', border: '1px solid #E2E8F0', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#4A5568" />
          </button>
        </div>

        {/* Form */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px', paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>

          {/* País destino */}
          <div style={{ marginBottom: 12 }}>
            <span style={LABEL_STYLE}>País destino *</span>
            <button
              type="button"
              onClick={() => setShowCountryModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                padding: '10px 14px', background: '#FFFFFF', border: '1px solid #E2E8F0',
                borderRadius: 12, cursor: 'pointer', fontFamily: "'Manrope', sans-serif",
                textAlign: 'left' }}
            >
              {form.country ? (
                <>
                  <img src={flagSrc(meta.flagCode)} alt={meta.name} width={36} height={36}
                    style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover',
                      border: '1px solid rgba(0,0,0,0.08)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0D1F3C' }}>
                      {meta.name}
                    </p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#4A5568' }}>
                      {meta.currency}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F4F6FA',
                    border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                    🌎
                  </div>
                  <span style={{ fontSize: '0.9375rem', color: '#94A3B8', flex: 1 }}>
                    Selecciona un país
                  </span>
                </>
              )}
              <ChevronRight size={16} color="#94A3B8" />
            </button>
          </div>

          {/* Sección: Identidad */}
          {form.country && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16,
              padding: '16px', marginBottom: 12 }}>
              <p style={{ ...LABEL_STYLE, marginBottom: 12 }}>Datos del beneficiario</p>

              {/* Apodo */}
              <div style={{ marginBottom: 12 }}>
                <label style={LABEL_STYLE}>Apodo (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Mamá, Proveedor Lima"
                  value={form.nickname}
                  onChange={e => set('nickname', e.target.value)}
                  style={INPUT_STYLE}
                />
              </div>

              {/* Nombre + Apellido */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={LABEL_STYLE}>Nombre *</label>
                  <input type="text" placeholder="Juan" value={form.firstName}
                    onChange={e => set('firstName', e.target.value)} style={INPUT_STYLE} />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Apellido *</label>
                  <input type="text" placeholder="García" value={form.lastName}
                    onChange={e => set('lastName', e.target.value)} style={INPUT_STYLE} />
                </div>
              </div>

              {/* Tipo + Número de documento */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={LABEL_STYLE}>Tipo doc. *</label>
                  <select value={form.docType} onChange={e => set('docType', e.target.value)} style={SELECT_STYLE}>
                    <option value="">—</option>
                    {(meta?.docTypes ?? ['DNI','Pasaporte']).map(dt => (
                      <option key={dt} value={dt}>{dt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={LABEL_STYLE}>N.º documento *</label>
                  <input type="text" placeholder="12345678" value={form.docNumber}
                    onChange={e => set('docNumber', e.target.value)} style={INPUT_STYLE} />
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={LABEL_STYLE}>Email (opcional)</label>
                <input type="email" placeholder="email@ejemplo.com" value={form.email}
                  onChange={e => set('email', e.target.value)} style={INPUT_STYLE} />
              </div>
            </div>
          )}

          {/* Sección: Datos bancarios */}
          {form.country && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16,
              padding: '16px', marginBottom: 16 }}>
              <p style={{ ...LABEL_STYLE, marginBottom: 12 }}>Datos bancarios</p>

              {/* Banco */}
              <div style={{ marginBottom: 12 }}>
                <label style={LABEL_STYLE}>Banco (opcional)</label>
                <input type="text" placeholder="Ej: Bancolombia, BCP" value={form.bank}
                  onChange={e => set('bank', e.target.value)} style={INPUT_STYLE} />
              </div>

              {/* N.º de cuenta */}
              <div style={{ marginBottom: 12 }}>
                <label style={LABEL_STYLE}>N.º de cuenta *</label>
                <input type="text" placeholder="1234567890" value={form.accountNumber}
                  onChange={e => set('accountNumber', e.target.value)} style={INPUT_STYLE}
                  inputMode="numeric" />
              </div>

              {/* Tipo de cuenta */}
              <div>
                <label style={LABEL_STYLE}>Tipo de cuenta</label>
                <select value={form.accountType} onChange={e => set('accountType', e.target.value)} style={SELECT_STYLE}>
                  <option value="">— opcional —</option>
                  {(meta?.accountTypes ?? ['Cuenta de Ahorros','Cuenta Corriente']).map(at => (
                    <option key={at} value={at}>{at}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {saveError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px',
              background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, marginBottom: 12 }}>
              <AlertCircle size={14} color="#EF4444" />
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#EF4444' }}>{saveError}</p>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 14,
              background: isValid && !saving ? '#1D3461' : 'rgba(29,52,97,0.25)',
              border: 'none', color: isValid && !saving ? '#FFFFFF' : '#94A3B8',
              fontSize: '0.9375rem', fontWeight: 700, cursor: isValid && !saving ? 'pointer' : 'not-allowed',
              fontFamily: "'Manrope', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {saving ? <><Loader2 size={16} className="animate-spin" /> Guardando…</> : 'Guardar contacto'}
          </button>
        </div>
      </div>

      {showCountryModal && (
        <CountryPickerModal
          selected={form.country}
          onSelect={code => set('country', code)}
          onClose={() => setShowCountryModal(false)}
        />
      )}
    </div>
  )
}

// ── EditContactSheet ──────────────────────────────────────────────────────────

function EditContactSheet({ contact, onClose, onSaved }) {
  const meta0    = COUNTRY_META[contact.destinationCountry]
  const bd0      = contact.beneficiaryData ?? {}
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState('')

  const [form, setForm] = useState({
    nickname:      contact.nickname      ?? '',
    firstName:     contact.firstName     ?? '',
    lastName:      contact.lastName      ?? '',
    bank:          bd0.beneficiary_bank  ?? '',
    accountNumber: bd0.beneficiary_account_number ?? bd0.account_bank ?? '',
    accountType:   bd0.account_type_bank ?? '',
    email:         bd0.beneficiary_email ?? '',
  })

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  const isValid = form.firstName.trim() && form.lastName.trim()

  async function handleSave() {
    if (!isValid || saving) return
    setSaving(true)
    setSaveError('')
    try {
      await updateContact(contact._id, {
        nickname:    form.nickname.trim()    || undefined,
        firstName:   form.firstName.trim(),
        lastName:    form.lastName.trim(),
        beneficiaryData: {
          ...bd0,
          beneficiary_first_name:     form.firstName.trim(),
          beneficiary_last_name:      form.lastName.trim(),
          beneficiary_bank:           form.bank.trim()          || undefined,
          beneficiary_account_number: form.accountNumber.trim() || undefined,
          account_type_bank:          form.accountType          || undefined,
          beneficiary_email:          form.email.trim()         || undefined,
        },
      })
      onSaved()
      onClose()
    } catch (err) {
      setSaveError(err.message || 'No se pudo actualizar el contacto')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 250,
      background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: '#F4F6FA', borderRadius: '24px 24px 0 0',
        maxHeight: '92dvh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 20px 16px', background: '#F4F6FA', borderRadius: '24px 24px 0 0' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0D1F3C' }}>
            Editar contacto
          </h3>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%',
            background: '#FFFFFF', border: '1px solid #E2E8F0', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} color="#4A5568" />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px',
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>

          {/* País (no editable) */}
          {meta0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', background: '#FFFFFF', border: '1px solid #E2E8F0',
              borderRadius: 12, marginBottom: 12 }}>
              <CountryFlag code={contact.destinationCountry} size={28} />
              <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#4A5568' }}>
                {meta0.name} · {meta0.currency}
              </span>
            </div>
          )}

          {/* Identidad */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16,
            padding: '16px', marginBottom: 12 }}>
            <p style={{ ...LABEL_STYLE, marginBottom: 12 }}>Identidad</p>

            <div style={{ marginBottom: 12 }}>
              <label style={LABEL_STYLE}>Alias (opcional)</label>
              <input type="text" placeholder="Ej: Mamá, Proveedor Lima" value={form.nickname}
                onChange={e => set('nickname', e.target.value)} style={INPUT_STYLE} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 0 }}>
              <div>
                <label style={LABEL_STYLE}>Nombre *</label>
                <input type="text" value={form.firstName}
                  onChange={e => set('firstName', e.target.value)} style={INPUT_STYLE} />
              </div>
              <div>
                <label style={LABEL_STYLE}>Apellido *</label>
                <input type="text" value={form.lastName}
                  onChange={e => set('lastName', e.target.value)} style={INPUT_STYLE} />
              </div>
            </div>
          </div>

          {/* Datos bancarios */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16,
            padding: '16px', marginBottom: 12 }}>
            <p style={{ ...LABEL_STYLE, marginBottom: 12 }}>Datos bancarios</p>

            <div style={{ marginBottom: 12 }}>
              <label style={LABEL_STYLE}>Banco (opcional)</label>
              <input type="text" value={form.bank}
                onChange={e => set('bank', e.target.value)} style={INPUT_STYLE} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={LABEL_STYLE}>N.º de cuenta</label>
              <input type="text" value={form.accountNumber} inputMode="numeric"
                onChange={e => set('accountNumber', e.target.value)} style={INPUT_STYLE} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={LABEL_STYLE}>Tipo de cuenta</label>
              <select value={form.accountType} onChange={e => set('accountType', e.target.value)} style={SELECT_STYLE}>
                <option value="">— opcional —</option>
                {(meta0?.accountTypes ?? ['Cuenta de Ahorros','Cuenta Corriente']).map(at => (
                  <option key={at} value={at}>{at}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={LABEL_STYLE}>Email (opcional)</label>
              <input type="email" value={form.email}
                onChange={e => set('email', e.target.value)} style={INPUT_STYLE} />
            </div>
          </div>

          {saveError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px',
              background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, marginBottom: 12 }}>
              <AlertCircle size={14} color="#EF4444" />
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#EF4444' }}>{saveError}</p>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!isValid || saving}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 14,
              background: isValid && !saving ? '#1D3461' : 'rgba(29,52,97,0.25)',
              border: 'none', color: isValid && !saving ? '#FFFFFF' : '#94A3B8',
              fontSize: '0.9375rem', fontWeight: 700,
              cursor: isValid && !saving ? 'pointer' : 'not-allowed',
              fontFamily: "'Manrope', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {saving ? <><Loader2 size={16} className="animate-spin" /> Guardando…</> : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── ContactDetailSheet ────────────────────────────────────────────────────────

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
      borderBottom: '1px solid #F0F2F7' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F4F6FA',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={15} color="#4A5568" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: '0.6875rem', color: '#94A3B8', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
        <p style={{ margin: '2px 0 0', fontSize: '0.9375rem', fontWeight: 600, color: '#0D1F3C',
          wordBreak: 'break-all' }}>{value}</p>
      </div>
    </div>
  )
}

function ContactDetailSheet({ contact, onClose, onDelete, onToggleFavorite, onSend, onEdit }) {
  const [deleting, setDeleting] = useState(false)
  const name    = contactName(contact)
  const bd      = contact.beneficiaryData ?? {}
  const bank    = bd.beneficiary_bank ?? bd.beneficiary_bank_label ?? ''
  const account = bd.beneficiary_account_number ?? bd.account_bank ?? ''
  const docType = bd.beneficiary_document_type ?? ''
  const docNum  = bd.beneficiary_document_number ?? bd.beneficiary_document ?? ''
  const accType = bd.account_type_bank ?? ''
  const email   = bd.beneficiary_email ?? ''
  const meta    = COUNTRY_META[contact.destinationCountry]

  async function handleDelete() {
    setDeleting(true)
    await onDelete()
    setDeleting(false)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', background: '#F4F6FA', borderRadius: '24px 24px 0 0',
        maxHeight: '88dvh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.18)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E2E8F0' }} />
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px',
          paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>

          {/* Hero: avatar + flag + nombre */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '12px 0 20px', gap: 12 }}>
            {/* Avatares superpuestos: avatar del contacto + bandera del país */}
            <div style={{ position: 'relative' }}>
              <Avatar name={name} size={72} />
              <div style={{ position: 'absolute', bottom: -2, right: -2 }}>
                <CountryFlag code={contact.destinationCountry} size={26} />
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0D1F3C' }}>
                {name}
              </h2>
              {contact.nickname && (
                <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#4A5568' }}>
                  {contact.firstName} {contact.lastName}
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 }}>
                {meta && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: '#F0F2F7', borderRadius: 20, padding: '3px 10px',
                    fontSize: '0.75rem', fontWeight: 600, color: '#4A5568' }}>
                    {meta.name} · {meta.currency}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Botón enviar */}
          <button onClick={onSend} style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '13px 0', borderRadius: 14, background: '#1D3461', border: 'none',
            color: '#FFFFFF', fontSize: '0.9375rem', fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Manrope', sans-serif",
            boxShadow: '0 4px 16px rgba(29,52,97,0.25)', marginBottom: 12,
          }}>
            <Send size={16} />
            Enviar dinero
          </button>

          {/* Datos bancarios */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16,
            padding: '4px 16px', marginBottom: 12 }}>
            <DetailRow icon={Building2} label="Banco"            value={bank} />
            <DetailRow icon={CreditCard} label="N.º de cuenta"   value={account ? `****${account.slice(-4)}` : ''} />
            <DetailRow icon={FileText}  label="Tipo de cuenta"   value={accType} />
            <DetailRow icon={UserCheck} label={docType || 'Documento'} value={docNum} />
            <DetailRow icon={Mail}      label="Email"            value={email} />
          </div>

          {/* Historial */}
          {(contact.sendCount > 0 || contact.lastSentAt) && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16,
              padding: '4px 16px', marginBottom: 12 }}>
              {contact.sendCount > 0 && (
                <DetailRow icon={Send} label="Envíos realizados" value={`${contact.sendCount} envío${contact.sendCount !== 1 ? 's' : ''}`} />
              )}
              {contact.lastSentAt && (
                <DetailRow icon={Send} label="Último envío"
                  value={`${contact.lastAmount?.toLocaleString('es-CL')} ${contact.lastCurrency ?? ''} · ${timeAgo(contact.lastSentAt)}`} />
              )}
            </div>
          )}

          {/* Acciones secundarias */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            <button onClick={onToggleFavorite} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '12px 0', borderRadius: 12,
              background: contact.isFavorite ? '#FEF9C3' : '#FFFFFF',
              border: `1px solid ${contact.isFavorite ? '#FDE047' : '#E2E8F0'}`,
              color: contact.isFavorite ? '#A16207' : '#4A5568',
              fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
              fontFamily: "'Manrope', sans-serif",
            }}>
              <Star size={14} style={{ fill: contact.isFavorite ? '#FBBF24' : 'none', color: contact.isFavorite ? '#FBBF24' : '#4A5568' }} />
              {contact.isFavorite ? 'Fav.' : 'Fav.'}
            </button>

            <button onClick={onEdit} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '12px 0', borderRadius: 12,
              background: '#FFFFFF', border: '1px solid #E2E8F0',
              color: '#1D3461', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer',
              fontFamily: "'Manrope', sans-serif",
            }}>
              <Pencil size={14} />
              Editar
            </button>

            <button onClick={handleDelete} disabled={deleting} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '12px 0', borderRadius: 12,
              background: '#FEF2F2', border: '1px solid #FECACA',
              color: '#EF4444', fontSize: '0.8125rem', fontWeight: 600,
              cursor: deleting ? 'not-allowed' : 'pointer',
              fontFamily: "'Manrope', sans-serif",
            }}>
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ContactSkeleton() {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16,
      overflow: 'hidden', marginBottom: 12 }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
          borderBottom: i < 2 ? '1px solid #F0F2F7' : 'none' }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#F0F2F7', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 14, width: '40%', background: '#F0F2F7', borderRadius: 6, marginBottom: 6 }} />
            <div style={{ height: 11, width: '60%', background: '#F4F6FA', borderRadius: 5 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── ContactsPage ──────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const navigate = useNavigate()
  const [filterCountry, setFilterCountry] = useState(null)
  const { contacts, loading, error, reload } = useContacts(filterCountry)
  // All contacts (no filter) just for computing available country chips
  const { contacts: allContacts } = useContacts(null)

  const [selected,    setSelected]    = useState(null)
  const [showAdd,     setShowAdd]     = useState(false)
  const [showEdit,    setShowEdit]    = useState(false)
  const [search,      setSearch]      = useState('')

  const handleToggleFavorite = useCallback(async contact => {
    try { await toggleContactFavorite(contact._id); reload() } catch { /* silencioso */ }
    setSelected(null)
  }, [reload])

  const handleDelete = useCallback(async contact => {
    try { await deleteContact(contact._id); reload() } catch { /* silencioso */ }
    setSelected(null)
  }, [reload])

  const handleSend = useCallback(contact => {
    // Pre-cargar el contacto en sessionStorage para que Step3Beneficiary lo recoja
    sessionStorage.setItem('alyto_prefill_contact', JSON.stringify(contact))
    navigate('/send')
    setSelected(null)
  }, [navigate])

  const handleEdit = useCallback(() => {
    setShowEdit(true)
  }, [])

  // Countries present across all contacts (unfiltered) for the filter chips
  const availableCountries = [...new Set(allContacts.map(c => c.destinationCountry).filter(Boolean))].sort()

  const q        = search.toLowerCase()
  const filtered = contacts.filter(c => contactName(c).toLowerCase().includes(q))
  const favorites = filtered.filter(c => c.isFavorite)

  // Agrupar por inicial
  const grouped = filtered.reduce((acc, c) => {
    const initial = (contactName(c).charAt(0) || '#').toUpperCase()
    ;(acc[initial] ??= []).push(c)
    return acc
  }, {})
  const groupKeys = Object.keys(grouped).sort()

  return (
    <div style={{ paddingBottom: 16 }}>

      {/* Search + add */}
      <div style={{ padding: '16px 16px 12px', display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10,
          background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, padding: '10px 14px' }}>
          <Search size={16} color="#94A3B8" style={{ flexShrink: 0 }} />
          <input
            type="search"
            placeholder="Buscar contacto…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#0D1F3C', fontSize: '0.9375rem', fontFamily: "'Manrope', sans-serif" }}
          />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ width: 44, height: 44, borderRadius: 12, background: '#1D3461', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            flexShrink: 0, boxShadow: '0 4px 12px rgba(29,52,97,0.25)' }}
        >
          <Plus size={20} color="#FFFFFF" />
        </button>
      </div>

      {/* Country filter chips */}
      {!loading && availableCountries.length > 1 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px 12px',
          scrollbarWidth: 'none' }}>
          <button
            onClick={() => setFilterCountry(null)}
            style={{
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
              background: filterCountry === null ? '#1D3461' : '#FFFFFF',
              color: filterCountry === null ? '#FFFFFF' : '#4A5568',
              fontSize: '0.8125rem', fontWeight: 600,
              border: `1px solid ${filterCountry === null ? '#1D3461' : '#E2E8F0'}`,
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            <Filter size={12} />
            Todos
          </button>
          {availableCountries.map(code => {
            const meta = COUNTRY_META[code]
            const isActive = filterCountry === code
            return (
              <button key={code}
                onClick={() => setFilterCountry(isActive ? null : code)}
                style={{
                  flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
                  background: isActive ? '#1D3461' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#4A5568',
                  border: `1px solid ${isActive ? '#1D3461' : '#E2E8F0'}`,
                  fontSize: '0.8125rem', fontWeight: 600,
                  fontFamily: "'Manrope', sans-serif",
                }}
              >
                {meta && (
                  <img src={flagSrc(meta.flagCode)} alt={meta.name} width={18} height={18}
                    style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                )}
                {meta?.name ?? code}
              </button>
            )
          })}
        </div>
      )}

      {/* Loading */}
      {loading && <div style={{ padding: '0 16px' }}><ContactSkeleton /></div>}

      {/* Error */}
      {error && !loading && (
        <div style={{ margin: '0 16px', display: 'flex', alignItems: 'center', gap: 10,
          background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px' }}>
          <AlertCircle size={15} color="#EF4444" style={{ flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#EF4444' }}>
            No se pudieron cargar los contactos
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && contacts.length === 0 && (
        <div style={{ margin: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center',
          textAlign: 'center', padding: '48px 24px', background: '#FFFFFF', borderRadius: 20,
          border: '1px solid #E2E8F0', boxShadow: '0 2px 12px rgba(13,31,60,0.06)' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(29,52,97,0.08)',
            border: '1px solid rgba(29,52,97,0.15)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', marginBottom: 16 }}>
            <Users size={28} color="#1D3461" />
          </div>
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0D1F3C', marginBottom: 8 }}>
            Sin contactos guardados
          </p>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#4A5568', lineHeight: 1.6, maxWidth: 260,
            marginBottom: 20 }}>
            No tienes contactos guardados aún. Guárdalos al hacer tu próxima transferencia.
          </p>
          <button onClick={() => setShowAdd(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 12, background: '#1D3461', border: 'none',
            color: '#FFFFFF', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Manrope', sans-serif", boxShadow: '0 4px 12px rgba(29,52,97,0.25)',
          }}>
            <Plus size={16} />
            Agregar contacto
          </button>
        </div>
      )}

      {/* No results for search */}
      {!loading && contacts.length > 0 && filtered.length === 0 && (
        <div style={{ margin: '0 16px', padding: '32px', textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#94A3B8', fontSize: '0.875rem' }}>
            Sin resultados para "<strong>{search}</strong>"
          </p>
        </div>
      )}

      {/* Favorites horizontal scroll */}
      {!loading && favorites.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ padding: '0 16px', marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 700, color: '#94A3B8',
              textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Favoritos · {favorites.length}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '0 16px 4px',
            scrollbarWidth: 'none' }}>
            {favorites.map(c => {
              const name = contactName(c)
              return (
                <button key={c._id} onClick={() => setSelected(c)}
                  style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 8, padding: '14px 12px', borderRadius: 16, background: '#FFFFFF',
                    border: '1px solid #E2E8F0', cursor: 'pointer', minWidth: 76,
                    boxShadow: '0 2px 8px rgba(13,31,60,0.06)', fontFamily: "'Manrope', sans-serif" }}>
                  {/* Avatar + flag overlay */}
                  <div style={{ position: 'relative' }}>
                    <Avatar name={name} size={44} />
                    <div style={{ position: 'absolute', bottom: -2, right: -2 }}>
                      <CountryFlag code={c.destinationCountry} size={20} />
                    </div>
                  </div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#0D1F3C',
                    whiteSpace: 'nowrap', maxWidth: 68, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {name.split(' ')[0]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Contacts grouped alphabetically */}
      {!loading && groupKeys.length > 0 && (
        <div style={{ padding: '0 16px' }}>
          {contacts.length > 0 && (
            <p style={{ margin: '0 0 10px', fontSize: '0.6875rem', fontWeight: 700, color: '#94A3B8',
              textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Todos · {filtered.length}
            </p>
          )}
          {groupKeys.map(letter => (
            <div key={letter} style={{ marginBottom: 12 }}>
              {/* Separador de letra */}
              <div style={{ padding: '4px 4px 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#1D3461',
                  minWidth: 20, textAlign: 'center' }}>{letter}</span>
                <div style={{ flex: 1, height: 1, background: '#E2E8F0' }} />
              </div>

              <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0',
                borderRadius: 16, overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(13,31,60,0.05)' }}>
                {grouped[letter].map((c, idx) => {
                  const name    = contactName(c)
                  const bd      = c.beneficiaryData ?? {}
                  const bank    = bd.beneficiary_bank ?? bd.beneficiary_bank_label ?? ''
                  const account = bd.beneficiary_account_number ?? bd.account_bank ?? ''
                  const isLast  = idx === grouped[letter].length - 1

                  return (
                    <button key={c._id} onClick={() => setSelected(c)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                        width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                        borderBottom: isLast ? 'none' : '1px solid #F0F2F7',
                        fontFamily: "'Manrope', sans-serif", textAlign: 'left' }}>

                      {/* Avatar + flag badge */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <Avatar name={name} size={46} />
                        <div style={{ position: 'absolute', bottom: -2, right: -3 }}>
                          <CountryFlag code={c.destinationCountry} size={20} />
                        </div>
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700,
                            color: '#0D1F3C', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {name}
                          </p>
                          {c.isFavorite && (
                            <Star size={11} style={{ fill: '#FBBF24', color: '#FBBF24', flexShrink: 0 }} />
                          )}
                        </div>
                        <p style={{ margin: '3px 0 0', fontSize: '0.8125rem', color: '#4A5568',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {COUNTRY_META[c.destinationCountry]?.name ?? c.destinationCountry}
                          {bank ? ` · ${bank}` : ''}
                          {account ? ` ****${account.slice(-4)}` : ''}
                        </p>
                        {c.lastSentAt && (
                          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>
                            Último envío {timeAgo(c.lastSentAt)}
                          </p>
                        )}
                      </div>

                      <ChevronRight size={16} color="#CBD5E1" style={{ flexShrink: 0 }} />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {selected && !showEdit && (
        <ContactDetailSheet
          contact={selected}
          onClose={() => setSelected(null)}
          onDelete={() => handleDelete(selected)}
          onToggleFavorite={() => handleToggleFavorite(selected)}
          onSend={() => handleSend(selected)}
          onEdit={handleEdit}
        />
      )}

      {selected && showEdit && (
        <EditContactSheet
          contact={selected}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); setSelected(null); reload() }}
        />
      )}

      {showAdd && (
        <AddContactSheet
          onClose={() => setShowAdd(false)}
          onSaved={reload}
        />
      )}
    </div>
  )
}
