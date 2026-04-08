/**
 * AdminDashboard.jsx — Panel de Administración Global Alyto V2.0
 *
 * Centro de control interno para auditoría de usuarios y operaciones.
 * Accesible únicamente para cuentas con role = 'admin'.
 *
 * Secciones:
 *   Usuarios     → Tabla de todos los clientes registrados con KYC y entidad legal.
 *   Libro Mayor  → Últimas 100 operaciones del sistema (cross-border, payin, payout).
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  BookOpen,
  RefreshCw,
  ArrowLeft,
  Shield,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  LayoutGrid,
  Bell,
  ChevronDown,
  ChevronUp,
  Send,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchAdminUsers, fetchAdminLedger } from '../services/api'
import { sendAdminNotification } from '../services/adminService'
import VitaBalanceWidget from './Admin/VitaBalanceWidget'

// ── Constantes de diseño ────────────────────────────────────────────────────

const ENTITY_STYLES = {
  SpA: { bg: '#1D346114', text: '#8AB4F8', border: '#1D346140', label: 'SpA · Chile' },
  LLC: { bg: '#4E5A7A14', text: '#C4CBD8',  border: '#4E5A7A40', label: 'LLC · EE.UU.' },
  SRL: { bg: '#22C55E14', text: '#22C55E',  border: '#22C55E40', label: 'SRL · Bolivia' },
}

const KYC_STYLES = {
  approved:  { bg: '#22C55E1A', text: '#22C55E',  icon: CheckCircle2, label: 'Aprobado'   },
  pending:   { bg: '#C4CBD81A', text: '#C4CBD8',   icon: Clock,        label: 'Pendiente'  },
  in_review: { bg: '#C4CBD81A', text: '#C4CBD8',   icon: Clock,        label: 'En revisión'},
  rejected:  { bg: '#EF44441A', text: '#F87171',   icon: XCircle,      label: 'Rechazado'  },
  expired:   { bg: '#EF44441A', text: '#F87171',   icon: AlertCircle,  label: 'Expirado'   },
}

const STATUS_STYLES = {
  completed:        { bg: '#22C55E1A', text: '#22C55E', label: 'Completada'   },
  in_transit:       { bg: '#C4CBD81A', text: '#C4CBD8', label: 'En tránsito'  },
  payin_completed:  { bg: '#22C55E1A', text: '#22C55E', label: 'Pay-in OK'    },
  payin_pending:    { bg: '#C4CBD81A', text: '#C4CBD8', label: 'Pay-in pend.' },
  payout_pending:   { bg: '#C4CBD81A', text: '#C4CBD8', label: 'Payout pend.' },
  initiated:        { bg: '#1D346140', text: '#8AB4F8', label: 'Iniciada'     },
  failed:           { bg: '#EF44441A', text: '#F87171', label: 'Fallida'      },
  refunded:         { bg: '#EF44441A', text: '#F87171', label: 'Reembolsada'  },
}

// ── Sub-componentes ─────────────────────────────────────────────────────────

function EntityBadge({ entity }) {
  const s = ENTITY_STYLES[entity] ?? ENTITY_STYLES.LLC
  return (
    <span
      className="text-[0.625rem] font-semibold px-2 py-0.5 rounded-full border"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {s.label}
    </span>
  )
}

function KycBadge({ status }) {
  const s = KYC_STYLES[status] ?? KYC_STYLES.pending
  const Icon = s.icon
  return (
    <span
      className="inline-flex items-center gap-1 text-[0.625rem] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.text }}
    >
      <Icon size={10} />
      {s.label}
    </span>
  )
}

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? { bg: '#4E5A7A1A', text: '#8A96B8', label: status }
  return (
    <span
      className="text-[0.625rem] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  )
}

function LoadingSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-[#1A2340] animate-pulse" />
      ))}
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-12 h-12 rounded-2xl bg-[#1A2340] flex items-center justify-center">
        <BookOpen size={20} className="text-[#4E5A7A]" />
      </div>
      <p className="text-[0.875rem] text-[#4E5A7A]">{message}</p>
    </div>
  )
}

// ── Sección Usuarios ─────────────────────────────────────────────────────────

function UsersSection({ users, loading, error }) {
  if (loading) return <LoadingSkeleton rows={6} />
  if (error)   return (
    <div className="flex items-center gap-3 p-4 bg-[#EF44441A] rounded-2xl border border-[#EF444433]">
      <AlertCircle size={18} className="text-[#F87171] flex-shrink-0" />
      <p className="text-[0.875rem] text-[#F87171]">{error}</p>
    </div>
  )
  if (!users.length) return <EmptyState message="No hay usuarios registrados." />

  return (
    <div className="overflow-x-auto -mx-4">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="border-b border-[#1A2340]">
            <th className="text-left text-[0.6875rem] font-semibold text-[#4E5A7A] uppercase tracking-wider px-4 py-3">Email</th>
            <th className="text-left text-[0.6875rem] font-semibold text-[#4E5A7A] uppercase tracking-wider px-4 py-3">Entidad Legal</th>
            <th className="text-left text-[0.6875rem] font-semibold text-[#4E5A7A] uppercase tracking-wider px-4 py-3">KYC</th>
            <th className="text-left text-[0.6875rem] font-semibold text-[#4E5A7A] uppercase tracking-wider px-4 py-3">Registro</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1A234080]">
          {users.map((u) => (
            <tr key={u._id} className="hover:bg-[#1F2B4D20] transition-colors">
              <td className="px-4 py-3.5">
                <p className="text-[0.875rem] font-medium text-white truncate max-w-[180px]">{u.email}</p>
                <p className="text-[0.6875rem] text-[#4E5A7A] mt-0.5">
                  {u.firstName} {u.lastName}
                </p>
              </td>
              <td className="px-4 py-3.5">
                <EntityBadge entity={u.legalEntity} />
              </td>
              <td className="px-4 py-3.5">
                <KycBadge status={u.kycStatus} />
              </td>
              <td className="px-4 py-3.5">
                <p className="text-[0.8125rem] text-[#8A96B8]">
                  {new Date(u.createdAt).toLocaleDateString('es-CL', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Sección Libro Mayor ──────────────────────────────────────────────────────

function LedgerSection({ transactions, loading, error }) {
  if (loading) return <LoadingSkeleton rows={6} />
  if (error)   return (
    <div className="flex items-center gap-3 p-4 bg-[#EF44441A] rounded-2xl border border-[#EF444433]">
      <AlertCircle size={18} className="text-[#F87171] flex-shrink-0" />
      <p className="text-[0.875rem] text-[#F87171]">{error}</p>
    </div>
  )
  if (!transactions.length) return <EmptyState message="No hay operaciones registradas." />

  return (
    <div className="overflow-x-auto -mx-4">
      <table className="w-full min-w-[720px]">
        <thead>
          <tr className="border-b border-[#1A2340]">
            <th className="text-left text-[0.6875rem] font-semibold text-[#4E5A7A] uppercase tracking-wider px-4 py-3">ID Operación</th>
            <th className="text-left text-[0.6875rem] font-semibold text-[#4E5A7A] uppercase tracking-wider px-4 py-3">Usuario / Entidad</th>
            <th className="text-left text-[0.6875rem] font-semibold text-[#4E5A7A] uppercase tracking-wider px-4 py-3">Monto Origen</th>
            <th className="text-left text-[0.6875rem] font-semibold text-[#4E5A7A] uppercase tracking-wider px-4 py-3">Activo Web3</th>
            <th className="text-left text-[0.6875rem] font-semibold text-[#4E5A7A] uppercase tracking-wider px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1A234080]">
          {transactions.map((tx) => (
            <tr key={tx._id} className="hover:bg-[#1F2B4D20] transition-colors">
              <td className="px-4 py-3.5">
                <p className="text-[0.75rem] font-mono text-[#C4CBD8] truncate max-w-[140px]">
                  {tx.alytoTransactionId ?? tx._id}
                </p>
                <p className="text-[0.6875rem] text-[#4E5A7A] mt-0.5">{tx.operationType}</p>
              </td>
              <td className="px-4 py-3.5">
                <p className="text-[0.8125rem] text-white truncate max-w-[140px]">
                  {tx.userId
                    ? `${tx.userId.firstName} ${tx.userId.lastName}`
                    : '—'
                  }
                </p>
                <EntityBadge entity={tx.legalEntity} />
              </td>
              <td className="px-4 py-3.5">
                <p className="text-[0.9375rem] font-bold text-white">
                  {tx.originalAmount?.toLocaleString('es-CL') ?? '—'}
                </p>
                <p className="text-[0.6875rem] text-[#4E5A7A]">{tx.originCurrency}</p>
              </td>
              <td className="px-4 py-3.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1D346120] border border-[#1D346150]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8AB4F8]" />
                  <span className="text-[0.75rem] font-semibold text-[#8AB4F8]">
                    {tx.digitalAsset ?? 'N/A'}
                  </span>
                  {tx.digitalAssetAmount != null && (
                    <span className="text-[0.6875rem] text-[#4E5A7A]">
                      {tx.digitalAssetAmount}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3.5">
                <StatusBadge status={tx.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Tipos de notificación disponibles ────────────────────────────────────────

const NOTIFICATION_TYPES = [
  { value: 'payin_confirmed',    label: 'Pay-in confirmado'         },
  { value: 'payment_completed',  label: 'Pago completado'           },
  { value: 'payout_sent',        label: 'Payout enviado'            },
  { value: 'payment_failed',     label: 'Pago fallido'              },
  { value: 'kyc_approved',       label: 'KYC aprobado'              },
  { value: 'kyc_rejected',       label: 'KYC rechazado'             },
  { value: 'transaction_update', label: 'Actualización de transacción' },
]

// ── Toast inline ──────────────────────────────────────────────────────────────

function InlineToast({ toast, onDismiss }) {
  if (!toast) return null
  const isSuccess = toast.type === 'success'
  return (
    <div
      className="flex items-start gap-3 p-3.5 rounded-2xl border"
      style={{
        background:   isSuccess ? '#22C55E1A' : '#EF44441A',
        borderColor:  isSuccess ? '#22C55E33' : '#EF444433',
      }}
    >
      {isSuccess
        ? <CheckCircle2 size={16} className="text-[#22C55E] flex-shrink-0 mt-0.5" />
        : <AlertCircle  size={16} className="text-[#F87171]  flex-shrink-0 mt-0.5" />
      }
      <p className="flex-1 text-[0.8125rem]" style={{ color: isSuccess ? '#22C55E' : '#F87171' }}>
        {toast.message}
      </p>
      <button onClick={onDismiss} className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity">
        <X size={14} style={{ color: isSuccess ? '#22C55E' : '#F87171' }} />
      </button>
    </div>
  )
}

// ── Widget: Enviar Notificación Manual ────────────────────────────────────────

function SendPushNotificationWidget() {
  const [userId,           setUserId]           = useState('')
  const [notificationType, setNotificationType] = useState('')
  const [metadataRaw,      setMetadataRaw]      = useState('')
  const [metaOpen,         setMetaOpen]         = useState(false)
  const [loading,          setLoading]          = useState(false)
  const [toast,            setToast]            = useState(null)

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 5000)
  }

  const handleSubmit = async () => {
    if (!userId.trim())      return showToast('error', 'El User ID es obligatorio.')
    if (!notificationType)   return showToast('error', 'Selecciona un tipo de notificación.')

    let metadata = undefined
    if (metadataRaw.trim()) {
      try {
        metadata = JSON.parse(metadataRaw)
      } catch {
        return showToast('error', 'El metadata no es un JSON válido.')
      }
    }

    setLoading(true)
    setToast(null)
    try {
      await sendAdminNotification({
        userId: userId.trim(),
        notificationType,
        ...(metadata !== undefined && { metadata }),
      })
      showToast('success', 'Notificación enviada correctamente.')
      setUserId('')
      setNotificationType('')
      setMetadataRaw('')
      setMetaOpen(false)
    } catch (err) {
      showToast('error', err.message || 'Error al enviar la notificación.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="rounded-2xl border border-[#263050] overflow-hidden mb-6"
      style={{ background: '#1A2340' }}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b border-[#26305060] flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#C4CBD81A' }}
        >
          <Bell size={14} className="text-[#C4CBD8]" />
        </div>
        <h2 className="text-[0.9375rem] font-bold text-white flex-1">
          Enviar Notificación Manual
        </h2>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4">

        {/* User ID */}
        <div className="space-y-1.5">
          <label className="block text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-wider">
            User ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            placeholder="64a3f1c2e45b7d0012a9b3c8"
            className="w-full rounded-xl px-4 py-3 text-[0.9375rem] text-white bg-[#0F1628] border border-[#263050] placeholder-[#4E5A7A] transition-all outline-none focus:border-[#C4CBD8]"
            style={{ boxShadow: 'none' }}
            onFocus={e  => { e.target.style.boxShadow = '0 0 0 2px #C4CBD820' }}
            onBlur={e   => { e.target.style.boxShadow = 'none' }}
            disabled={loading}
          />
        </div>

        {/* Notification Type */}
        <div className="space-y-1.5">
          <label className="block text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-wider">
            Tipo de Notificación
          </label>
          <select
            value={notificationType}
            onChange={e => setNotificationType(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-[0.9375rem] bg-[#0F1628] border border-[#263050] outline-none transition-all appearance-none cursor-pointer"
            style={{ color: notificationType ? '#FFFFFF' : '#4E5A7A' }}
            onFocus={e  => { e.target.style.boxShadow = '0 0 0 2px #C4CBD820'; e.target.style.borderColor = '#C4CBD8' }}
            onBlur={e   => { e.target.style.boxShadow = 'none';                e.target.style.borderColor = '#263050' }}
            disabled={loading}
          >
            <option value="" disabled style={{ color: '#4E5A7A', background: '#0F1628' }}>
              Seleccionar tipo…
            </option>
            {NOTIFICATION_TYPES.map(nt => (
              <option key={nt.value} value={nt.value} style={{ color: '#FFFFFF', background: '#0F1628' }}>
                {nt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Metadata (collapsible) */}
        <div>
          <button
            type="button"
            onClick={() => setMetaOpen(o => !o)}
            className="flex items-center gap-2 text-[0.8125rem] font-semibold text-[#4E5A7A] hover:text-[#8A96B8] transition-colors mb-2"
            disabled={loading}
          >
            {metaOpen
              ? <ChevronUp  size={14} />
              : <ChevronDown size={14} />
            }
            Metadata opcional (JSON)
          </button>
          {metaOpen && (
            <textarea
              value={metadataRaw}
              onChange={e => setMetadataRaw(e.target.value)}
              placeholder={'{\n  "transactionId": "abc123"\n}'}
              rows={5}
              className="w-full rounded-xl px-4 py-3 text-[0.8125rem] font-mono text-white bg-[#0F1628] border border-[#263050] placeholder-[#4E5A7A] resize-none outline-none transition-all"
              onFocus={e => { e.target.style.boxShadow = '0 0 0 2px #C4CBD820'; e.target.style.borderColor = '#C4CBD8' }}
              onBlur={e  => { e.target.style.boxShadow = 'none';                e.target.style.borderColor = '#263050' }}
              disabled={loading}
            />
          )}
        </div>

        {/* Toast */}
        <InlineToast toast={toast} onDismiss={() => setToast(null)} />

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3.5 text-[0.9375rem] font-bold transition-all"
          style={{
            background:  loading ? '#C4CBD840' : '#C4CBD8',
            color:       loading ? '#8A96B880' : '#0F1628',
            boxShadow:   loading ? 'none' : '0 4px 20px rgba(196,203,216,0.25)',
            cursor:      loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
          {loading ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
    </div>
  )
}

// ── AdminDashboard (componente principal) ────────────────────────────────────

export default function AdminDashboard() {
  const navigate          = useNavigate()
  const { user }          = useAuth()
  const [activeTab, setActiveTab] = useState('users')

  const [users,        setUsers]        = useState([])
  const [transactions, setTransactions] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingLedger, setLoadingLedger] = useState(false)
  const [errorUsers,   setErrorUsers]   = useState(null)
  const [errorLedger,  setErrorLedger]  = useState(null)

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    setErrorUsers(null)
    try {
      const data = await fetchAdminUsers()
      setUsers(data.users ?? [])
    } catch (err) {
      setErrorUsers(err.message || 'Error al cargar usuarios.')
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  const loadLedger = useCallback(async () => {
    setLoadingLedger(true)
    setErrorLedger(null)
    try {
      const data = await fetchAdminLedger()
      setTransactions(data.transactions ?? [])
    } catch (err) {
      setErrorLedger(err.message || 'Error al cargar el libro mayor.')
    } finally {
      setLoadingLedger(false)
    }
  }, [])

  // Cargar datos al montar y al cambiar de pestaña
  useEffect(() => {
    if (activeTab === 'users')  loadUsers()
    if (activeTab === 'ledger') loadLedger()
  }, [activeTab, loadUsers, loadLedger])

  const tabs = [
    { id: 'users',  label: 'Usuarios',     icon: Users,    count: users.length        },
    { id: 'ledger', label: 'Libro Mayor',   icon: BookOpen, count: transactions.length },
  ]

  return (
    <div className="min-h-screen bg-[#0F1628] font-sans">

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-10 px-4 pt-12 pb-4"
        style={{
          background: 'linear-gradient(180deg, #0F1628 70%, #0F162800 100%)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate('/')}
              className="w-9 h-9 rounded-full bg-[#1A2340] border border-[#263050] flex items-center justify-center transition-colors hover:border-[#C4CBD833]"
            >
              <ArrowLeft size={16} className="text-[#8A96B8]" />
            </button>

            <div className="flex items-center gap-2.5 flex-1">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #1D3461, #0F1628)' }}
              >
                <Shield size={14} className="text-[#C4CBD8]" />
              </div>
              <div>
                <h1 className="text-[1rem] font-bold text-white leading-none">Backoffice</h1>
                <p className="text-[0.6875rem] text-[#4E5A7A] mt-0.5">
                  Sesión admin: {user?.email}
                </p>
              </div>
            </div>

            <button
              onClick={activeTab === 'users' ? loadUsers : loadLedger}
              disabled={loadingUsers || loadingLedger}
              className="w-9 h-9 rounded-full bg-[#1A2340] border border-[#263050] flex items-center justify-center transition-colors hover:border-[#C4CBD833] disabled:opacity-40"
            >
              <RefreshCw
                size={14}
                className={`text-[#8A96B8] ${(loadingUsers || loadingLedger) ? 'animate-spin' : ''}`}
              />
            </button>
          </div>

          {/* ── Saldo Vita + alertas de liquidez ─────────────────────── */}
          <div className="mb-4">
            <VitaBalanceWidget />
          </div>

          {/* ── Acceso rápido al Ledger ───────────────────────────────── */}
          <button
            onClick={() => navigate('/admin/ledger')}
            className="w-full flex items-center justify-between px-4 py-3 mb-3 rounded-2xl border border-[#263050] bg-[#1A2340] hover:border-[#C4CBD833] hover:bg-[#1F2B4D] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#C4CBD81A' }}>
                <LayoutGrid size={14} className="text-[#C4CBD8]" />
              </div>
              <div className="text-left">
                <p className="text-[0.875rem] font-semibold text-white">Backoffice Ledger</p>
                <p className="text-[0.6875rem] text-[#4E5A7A]">Transacciones paginadas · filtros · corredores</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-[#4E5A7A] group-hover:text-[#C4CBD8] transition-colors" />
          </button>

          {/* ── TABS ──────────────────────────────────────────────────── */}
          <div className="flex gap-1 p-1 bg-[#1A2340] rounded-2xl">
            {tabs.map((tab) => {
              const Icon    = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[0.8125rem] font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#0F1628] text-white shadow-sm'
                      : 'text-[#4E5A7A] hover:text-[#8A96B8]'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className={`text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-[#C4CBD81A] text-[#C4CBD8]'
                          : 'bg-[#4E5A7A1A] text-[#4E5A7A]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* ── CONTENIDO ────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 pb-12">

        {/* Widget: notificación push manual */}
        <SendPushNotificationWidget />

        {/* Stats rápidas */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[#1A2340] rounded-2xl p-4 border border-[#263050]">
            <p className="text-[0.6875rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-2">
              Total usuarios
            </p>
            <p className="text-[1.5rem] font-bold text-white">{users.length}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {['LLC', 'SpA', 'SRL'].map((e) => {
                const count = users.filter(u => u.legalEntity === e).length
                if (!count) return null
                return (
                  <span key={e}>
                    <EntityBadge entity={e} />
                    <span className="text-[0.6875rem] text-[#4E5A7A] ml-1">{count}</span>
                  </span>
                )
              })}
            </div>
          </div>
          <div className="bg-[#1A2340] rounded-2xl p-4 border border-[#263050]">
            <p className="text-[0.6875rem] font-semibold text-[#4E5A7A] uppercase tracking-wider mb-2">
              Operaciones (100 recientes)
            </p>
            <p className="text-[1.5rem] font-bold text-white">{transactions.length}</p>
            <div className="flex gap-1 mt-2 flex-wrap">
              {['completed', 'in_transit', 'failed'].map((s) => {
                const count = transactions.filter(t => t.status === s).length
                if (!count) return null
                return (
                  <span key={s} className="flex items-center gap-1">
                    <StatusBadge status={s} />
                    <span className="text-[0.6875rem] text-[#4E5A7A]">{count}</span>
                  </span>
                )
              })}
            </div>
          </div>
        </div>

        {/* Tabla activa */}
        <div
          className="rounded-2xl border border-[#263050] overflow-hidden"
          style={{ background: '#1A2340' }}
        >
          <div className="px-4 py-4 border-b border-[#26305060] flex items-center justify-between">
            <h2 className="text-[0.9375rem] font-bold text-white">
              {activeTab === 'users' ? 'Directorio de Usuarios' : 'Libro Mayor de Operaciones'}
            </h2>
            {activeTab === 'users' && !loadingUsers && (
              <span className="text-[0.75rem] text-[#4E5A7A]">{users.length} registros</span>
            )}
            {activeTab === 'ledger' && !loadingLedger && (
              <span className="text-[0.75rem] text-[#4E5A7A]">{transactions.length} operaciones</span>
            )}
          </div>

          <div className="p-4">
            {activeTab === 'users' && (
              <UsersSection
                users={users}
                loading={loadingUsers}
                error={errorUsers}
              />
            )}
            {activeTab === 'ledger' && (
              <LedgerSection
                transactions={transactions}
                loading={loadingLedger}
                error={errorLedger}
              />
            )}
          </div>
        </div>

      </main>
    </div>
  )
}
