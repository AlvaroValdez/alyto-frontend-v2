/**
 * UsersPage.jsx — Gestión de usuarios Alyto Backoffice
 *
 * Lista completa de usuarios con búsqueda y modal de edición.
 * Campos editables: accountType, legalEntity, kycStatus, role, isActive, sanctionsFlag.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Search, RefreshCw, Loader2, AlertCircle, CheckCircle2,
  ChevronRight, X, User as UserIcon, Shield, ShieldOff,
} from 'lucide-react'
import { fetchAdminUsers, updateAdminUser } from '../../../services/api'

// ─── Helpers visuales ─────────────────────────────────────────────────────────

const KYC_LABELS = {
  pending:    { label: 'Pendiente',   color: '#8A96B8', bg: '#1A2340' },
  in_review:  { label: 'En revisión', color: '#C4CBD8', bg: '#C4CBD81A' },
  approved:   { label: 'Aprobado',    color: '#22C55E', bg: '#22C55E1A' },
  rejected:   { label: 'Rechazado',   color: '#EF4444', bg: '#EF44441A' },
  expired:    { label: 'Expirado',    color: '#F59E0B', bg: '#F59E0B1A' },
}

const ENTITY_COLORS = { SRL: '#C4CBD8', SpA: '#22C55E', LLC: '#60A5FA' }

function Badge({ children, color = '#8A96B8', bg = '#1A2340' }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-semibold"
      style={{ color, background: bg }}>
      {children}
    </span>
  )
}

function KycBadge({ status }) {
  const cfg = KYC_LABELS[status] ?? { label: status ?? '—', color: '#8A96B8', bg: '#1A2340' }
  return <Badge color={cfg.color} bg={cfg.bg}>{cfg.label}</Badge>
}

function EntityBadge({ entity }) {
  return <Badge color={ENTITY_COLORS[entity] ?? '#8A96B8'}>{entity ?? '—'}</Badge>
}

// ─── Modal de edición ─────────────────────────────────────────────────────────

function EditUserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    accountType:   user.accountType   ?? 'personal',
    legalEntity:   user.legalEntity   ?? 'SRL',
    kycStatus:     user.kycStatus     ?? 'pending',
    role:          user.role          ?? 'user',
    isActive:      user.isActive      ?? true,
    sanctionsFlag: user.sanctionsFlag ?? false,
  })
  const [saving, setSaving]   = useState(false)
  const [error,  setError]    = useState(null)
  const [success, setSuccess] = useState(false)

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const data = await updateAdminUser(user._id, form)
      onSaved(data.user)
      setSuccess(true)
      setTimeout(onClose, 800)
    } catch (e) {
      setError(e.message ?? 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  const rowClass = 'flex flex-col gap-1.5'
  const labelClass = 'text-[0.6875rem] font-semibold text-[#4E5A7A] uppercase tracking-wider'
  const selectClass = 'w-full px-3 py-2.5 rounded-xl text-[0.875rem] text-white outline-none transition-all'
  const selectStyle = { background: '#1A2340', border: '1px solid #263050' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: '#0F162899' }}>
      <div className="w-full max-w-md rounded-2xl p-6 flex flex-col gap-5"
        style={{ background: '#1A2340', border: '1px solid #263050', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[1rem] font-bold text-white">Editar Usuario</p>
            <p className="text-[0.8125rem] text-[#8A96B8] mt-0.5 truncate">{user.email}</p>
            <p className="text-[0.75rem] text-[#4E5A7A]">
              {user.firstName} {user.lastName}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-[#263050]">
            <X size={16} className="text-[#8A96B8]" />
          </button>
        </div>

        {/* Formulario */}
        <div className="grid grid-cols-2 gap-4">

          <div className={rowClass}>
            <label className={labelClass}>Tipo de cuenta</label>
            <select className={selectClass} style={selectStyle}
              value={form.accountType} onChange={e => set('accountType', e.target.value)}>
              <option value="personal">Personal</option>
              <option value="business">Business</option>
            </select>
          </div>

          <div className={rowClass}>
            <label className={labelClass}>Entidad legal</label>
            <select className={selectClass} style={selectStyle}
              value={form.legalEntity} onChange={e => set('legalEntity', e.target.value)}>
              <option value="SRL">SRL (Bolivia)</option>
              <option value="SpA">SpA (Chile)</option>
              <option value="LLC">LLC (EE.UU.)</option>
            </select>
          </div>

          <div className={rowClass}>
            <label className={labelClass}>Estado KYC</label>
            <select className={selectClass} style={selectStyle}
              value={form.kycStatus} onChange={e => set('kycStatus', e.target.value)}>
              <option value="pending">Pendiente</option>
              <option value="in_review">En revisión</option>
              <option value="approved">Aprobado</option>
              <option value="rejected">Rechazado</option>
              <option value="expired">Expirado</option>
            </select>
          </div>

          <div className={rowClass}>
            <label className={labelClass}>Rol</label>
            <select className={selectClass} style={selectStyle}
              value={form.role} onChange={e => set('role', e.target.value)}>
              <option value="user">Usuario</option>
              <option value="admin">Admin</option>
            </select>
          </div>

        </div>

        {/* Toggles */}
        <div className="flex gap-3">
          <ToggleField
            label="Cuenta activa"
            value={form.isActive}
            onChange={v => set('isActive', v)}
            onColor="#22C55E"
            offColor="#EF4444"
            onLabel="Activa"
            offLabel="Bloqueada"
          />
          <ToggleField
            label="Flag OFAC/AML"
            value={form.sanctionsFlag}
            onChange={v => set('sanctionsFlag', v)}
            onColor="#EF4444"
            offColor="#4E5A7A"
            onLabel="Flagueado"
            offLabel="Sin flag"
            icon={form.sanctionsFlag ? <Shield size={13} /> : <ShieldOff size={13} />}
          />
        </div>

        {/* Warning si se bloquea */}
        {!form.isActive && user.isActive && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: '#EF44441A', border: '1px solid #EF444433' }}>
            <AlertCircle size={14} className="text-[#F87171] flex-shrink-0" />
            <p className="text-[0.75rem] text-[#F87171]">
              Se invalidarán todos los tokens activos del usuario.
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: '#EF44441A', border: '1px solid #EF444433' }}>
            <AlertCircle size={14} className="text-[#F87171] flex-shrink-0" />
            <p className="text-[0.75rem] text-[#F87171]">{error}</p>
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-[0.875rem] font-semibold text-white transition-all"
            style={{ border: '1.5px solid #263050' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving || success}
            className="flex-1 py-2.5 rounded-xl text-[0.875rem] font-bold transition-all flex items-center justify-center gap-2"
            style={{ background: success ? '#22C55E' : '#C4CBD8', color: '#0F1628', opacity: saving ? 0.7 : 1 }}>
            {success
              ? <><CheckCircle2 size={15} /> Guardado</>
              : saving
              ? <><Loader2 size={15} className="animate-spin" /> Guardando…</>
              : 'Guardar cambios'
            }
          </button>
        </div>

      </div>
    </div>
  )
}

function ToggleField({ label, value, onChange, onColor, offColor, onLabel, offLabel, icon }) {
  return (
    <button onClick={() => onChange(!value)}
      className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl transition-all"
      style={{ background: '#0F1628', border: `1px solid ${value ? onColor + '33' : '#263050'}` }}>
      <div>
        <p className="text-[0.6875rem] font-semibold text-[#4E5A7A] uppercase tracking-wider text-left">
          {label}
        </p>
        <p className="text-[0.8125rem] font-semibold mt-0.5 flex items-center gap-1"
          style={{ color: value ? onColor : offColor }}>
          {icon}
          {value ? onLabel : offLabel}
        </p>
      </div>
      <div className="w-9 h-5 rounded-full transition-colors relative flex-shrink-0"
        style={{ background: value ? onColor : '#263050' }}>
        <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all bg-white"
          style={{ left: value ? '18px' : '2px' }} />
      </div>
    </button>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [search,  setSearch]  = useState('')
  const [editing, setEditing] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminUsers()
      setUsers(data.users ?? [])
    } catch (e) {
      setError(e.message ?? 'Error al cargar usuarios.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = users.filter(u => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      u.email?.toLowerCase().includes(q) ||
      u.firstName?.toLowerCase().includes(q) ||
      u.lastName?.toLowerCase().includes(q) ||
      u.legalEntity?.toLowerCase().includes(q) ||
      u.accountType?.toLowerCase().includes(q)
    )
  })

  function handleSaved(updatedUser) {
    setUsers(us => us.map(u => u._id === updatedUser._id ? { ...u, ...updatedUser } : u))
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[1.25rem] font-bold text-white">Gestión de Usuarios</h1>
          <p className="text-[0.8125rem] text-[#8A96B8] mt-0.5">
            {users.length} usuarios registrados
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[0.8125rem] font-semibold transition-all"
          style={{ background: '#1A2340', border: '1px solid #263050', color: '#C4CBD8' }}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4E5A7A]" />
        <input
          type="text"
          placeholder="Buscar por email, nombre, entidad…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-[0.875rem] text-white outline-none"
          style={{ background: '#1A2340', border: '1px solid #263050' }}
        />
      </div>

      {/* Tabla */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #1A2340' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead style={{ background: '#0F1628' }}>
              <tr>
                {['Usuario', 'Entidad / Tipo', 'KYC', 'Rol', 'Estado', ''].map(h => (
                  <th key={h} className="text-left text-[0.6875rem] font-semibold text-[#4E5A7A] uppercase tracking-wider px-4 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#1A234040' }}>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center">
                    <Loader2 size={20} className="animate-spin text-[#C4CBD8] mx-auto" />
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={6} className="px-4 py-6">
                    <div className="flex items-center gap-2 text-[#F87171]">
                      <AlertCircle size={15} />
                      <span className="text-[0.875rem]">{error}</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[0.875rem] text-[#4E5A7A]">
                    No se encontraron usuarios.
                  </td>
                </tr>
              )}
              {!loading && filtered.map(u => (
                <tr key={u._id}
                  className="transition-colors cursor-pointer hover:bg-[#1F2B4D30]"
                  onClick={() => setEditing(u)}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[0.6875rem] font-bold text-[#0F1628]"
                        style={{ background: '#C4CBD8' }}>
                        {(u.firstName?.[0] ?? u.email?.[0] ?? '?').toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[0.875rem] font-medium text-white truncate max-w-[180px]">
                          {u.email}
                        </p>
                        <p className="text-[0.6875rem] text-[#4E5A7A]">
                          {u.firstName} {u.lastName}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-1">
                      <EntityBadge entity={u.legalEntity} />
                      <span className="text-[0.6875rem] text-[#4E5A7A] capitalize">
                        {u.accountType ?? 'personal'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <KycBadge status={u.kycStatus} />
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-[0.8125rem] text-[#8A96B8] capitalize">{u.role ?? 'user'}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-1">
                      <Badge
                        color={u.isActive ? '#22C55E' : '#EF4444'}
                        bg={u.isActive ? '#22C55E1A' : '#EF44441A'}>
                        {u.isActive ? 'Activo' : 'Bloqueado'}
                      </Badge>
                      {u.sanctionsFlag && (
                        <Badge color="#EF4444" bg="#EF44441A">⚠ AML</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <ChevronRight size={15} className="text-[#4E5A7A]" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal edición */}
      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}

    </div>
  )
}
