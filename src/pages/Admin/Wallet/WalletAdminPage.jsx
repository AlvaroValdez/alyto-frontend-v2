/**
 * WalletAdminPage.jsx — Panel Admin: Wallets BOB Bolivia (Fase 25)
 *
 * Sección 1: Depósitos pendientes de confirmar
 * Sección 2: Conversiones BOB→USDC pendientes
 * Sección 3: Wallets activas con opción de congelar
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Wallet, CheckCircle2, AlertCircle, Loader2, RefreshCw,
  ChevronDown, X, Lock, Unlock, ArrowRightLeft,
} from 'lucide-react'
import { request } from '../../../services/api'
import { listPendingConversions, confirmConversion, rejectConversion } from '../../../services/adminService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBOB(amount) {
  if (amount == null) return 'Bs. 0,00'
  return `Bs. ${new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`
}

function formatDate(d) {
  if (!d) return ''
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function WalletStatusBadge({ status }) {
  const map = {
    active:    { bg: '#22C55E1A', text: '#22C55E', label: 'Activa' },
    frozen:    { bg: '#EF44441A', text: '#F87171', label: 'Congelada' },
    suspended: { bg: '#C4CBD81A', text: '#8A96B8', label: 'Suspendida' },
  }
  const s = map[status] ?? map.active
  return (
    <span className="text-[0.625rem] font-semibold px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  )
}

// ── Modal Confirmar Depósito ──────────────────────────────────────────────────

function ConfirmDepositModal({ deposit, open, onClose, onSuccess }) {
  const [bankReference, setBankReference] = useState('')
  const [note, setNote]                   = useState('')
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')

  function handleClose() {
    setBankReference(''); setNote(''); setError(''); onClose()
  }

  async function handleConfirm(e) {
    e.preventDefault(); setError('')
    if (!bankReference.trim()) return setError('La referencia bancaria es obligatoria.')
    setLoading(true)
    try {
      await request('/admin/wallet/deposit/confirm', {
        method: 'POST',
        body: JSON.stringify({ wtxId: deposit?.wtxId, bankReference, note }),
      })
      onSuccess?.()
      handleClose()
    } catch (err) {
      setError(err.message ?? 'Error al confirmar el depósito.')
    } finally {
      setLoading(false)
    }
  }

  if (!open || !deposit) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: '#0F162299' }}>
      <div className="w-full max-w-md bg-[#1A2340] rounded-2xl p-6"
        style={{ border: '1px solid #263050' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[1rem] font-bold text-white">Confirmar depósito</h3>
          <button onClick={handleClose} className="w-8 h-8 rounded-full bg-[#0F1628] flex items-center justify-center">
            <X size={16} className="text-[#8A96B8]" />
          </button>
        </div>

        {/* Resumen del depósito */}
        <div className="bg-[#0F1628] rounded-xl p-4 mb-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-[0.75rem] text-[#8A96B8]">Usuario</span>
            <span className="text-[0.875rem] font-semibold text-white">
              {deposit.userId?.firstName} {deposit.userId?.lastName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[0.75rem] text-[#8A96B8]">Email</span>
            <span className="text-[0.875rem] text-[#C4CBD8]">{deposit.userId?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[0.75rem] text-[#8A96B8]">Monto</span>
            <span className="text-[0.9375rem] font-bold text-[#22C55E]">{formatBOB(deposit.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[0.75rem] text-[#8A96B8]">Referencia</span>
            <span className="text-[0.75rem] font-mono text-[#C4CBD8]">{deposit.wtxId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[0.75rem] text-[#8A96B8]">Fecha</span>
            <span className="text-[0.75rem] text-white">{formatDate(deposit.createdAt)}</span>
          </div>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <label className="block text-[0.75rem] font-medium text-[#8A96B8] mb-1.5">
              Referencia bancaria <span className="text-[#F87171]">*</span>
            </label>
            <input type="text" value={bankReference} onChange={e => setBankReference(e.target.value)}
              placeholder="N° de comprobante o referencia del banco"
              className="w-full bg-[#0F1628] border border-[#263050] rounded-xl px-4 py-3 text-white text-[0.875rem] focus:border-[#C4CBD8] focus:outline-none" />
          </div>
          <div>
            <label className="block text-[0.75rem] font-medium text-[#8A96B8] mb-1.5">Nota interna (opcional)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              placeholder="Observaciones del admin"
              className="w-full bg-[#0F1628] border border-[#263050] rounded-xl px-4 py-3 text-white text-[0.875rem] focus:border-[#C4CBD8] focus:outline-none" />
          </div>
          {error && <p className="text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-4 py-2">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={handleClose}
              className="flex-1 py-3 rounded-xl font-semibold text-[0.875rem] text-white"
              style={{ border: '1.5px solid #263050' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-xl font-bold text-[0.875rem] text-[#0F1628] disabled:opacity-40"
              style={{ background: '#22C55E' }}>
              {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Confirmar depósito'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal Congelar Wallet ──────────────────────────────────────────────────────

function FreezeModal({ wallet, open, onClose, onSuccess }) {
  const [reason, setReason]           = useState('')
  const [reportNumber, setReportNumber] = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')

  function handleClose() {
    setReason(''); setReportNumber(''); setError(''); onClose()
  }

  async function handleFreeze(e) {
    e.preventDefault(); setError('')
    if (!reason.trim()) return setError('El motivo es obligatorio.')
    setLoading(true)
    try {
      await request(`/admin/wallet/${wallet?.userId?._id ?? wallet?.userId}/freeze`, {
        method: 'PATCH',
        body: JSON.stringify({ reason, reportNumber: reportNumber || undefined }),
      })
      onSuccess?.(); handleClose()
    } catch (err) {
      setError(err.message ?? 'Error al congelar la wallet.')
    } finally {
      setLoading(false)
    }
  }

  if (!open || !wallet) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: '#0F162299' }}>
      <div className="w-full max-w-md bg-[#1A2340] rounded-2xl p-6"
        style={{ border: '1px solid #263050' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[1rem] font-bold text-white flex items-center gap-2">
            <Lock size={16} className="text-[#F87171]" />
            Congelar wallet
          </h3>
          <button onClick={handleClose} className="w-8 h-8 rounded-full bg-[#0F1628] flex items-center justify-center">
            <X size={16} className="text-[#8A96B8]" />
          </button>
        </div>

        <div className="bg-[#0F1628] rounded-xl p-3 mb-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[0.75rem] text-[#0F1628] flex-shrink-0"
            style={{ background: '#C4CBD8' }}>
            {(wallet.userId?.firstName?.[0] ?? '?')}
          </div>
          <div>
            <p className="text-[0.875rem] font-semibold text-white">
              {wallet.userId?.firstName} {wallet.userId?.lastName}
            </p>
            <p className="text-[0.6875rem] text-[#8A96B8]">{wallet.userId?.email}</p>
          </div>
          <p className="ml-auto text-[0.9375rem] font-bold text-white">{formatBOB(wallet.balance)}</p>
        </div>

        <div className="bg-[#EF44441A] border border-[#EF444433] rounded-xl px-4 py-3 mb-4 flex items-start gap-2">
          <AlertCircle size={16} className="text-[#F87171] flex-shrink-0 mt-0.5" />
          <p className="text-[0.8125rem] text-[#F87171]">
            Esta acción congelará el saldo completo de la wallet. El usuario no podrá realizar ninguna operación hasta que se descongele.
          </p>
        </div>

        <form onSubmit={handleFreeze} className="space-y-4">
          <div>
            <label className="block text-[0.75rem] font-medium text-[#8A96B8] mb-1.5">
              Motivo de congelamiento <span className="text-[#F87171]">*</span>
            </label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="Ej. Actividad sospechosa. Orden ASFI-2026-001."
              className="w-full bg-[#0F1628] border border-[#263050] rounded-xl px-4 py-3 text-white text-[0.875rem] focus:border-[#C4CBD8] focus:outline-none resize-none" />
          </div>
          <div>
            <label className="block text-[0.75rem] font-medium text-[#8A96B8] mb-1.5">N° de reporte UIF (opcional)</label>
            <input type="text" value={reportNumber} onChange={e => setReportNumber(e.target.value)}
              placeholder="ROS-2026-XXX"
              className="w-full bg-[#0F1628] border border-[#263050] rounded-xl px-4 py-3 text-white text-[0.875rem] focus:border-[#C4CBD8] focus:outline-none" />
          </div>
          {error && <p className="text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-4 py-2">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={handleClose}
              className="flex-1 py-3 rounded-xl font-semibold text-[0.875rem] text-white"
              style={{ border: '1.5px solid #263050' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-xl font-bold text-[0.875rem] text-white disabled:opacity-40"
              style={{ background: '#EF4444' }}>
              {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Congelar wallet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal Confirmar Conversión ────────────────────────────────────────────────

function ConfirmConversionModal({ conversion, open, onClose, onSuccess }) {
  const [note, setNote]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  function handleClose() {
    setNote(''); setError(''); onClose()
  }

  async function handleConfirm(e) {
    e.preventDefault(); setError('')
    setLoading(true)
    try {
      await confirmConversion(conversion?.wtxId, note)
      onSuccess?.()
      handleClose()
    } catch (err) {
      setError(err.message ?? 'Error al confirmar la conversión.')
    } finally {
      setLoading(false)
    }
  }

  if (!open || !conversion) return null

  const { bobAmount, usdcAmount, bobPerUsdc } = conversion.metadata ?? {}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: '#0F162299' }}>
      <div className="w-full max-w-md bg-[#1A2340] rounded-2xl p-6"
        style={{ border: '1px solid #263050' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[1rem] font-bold text-white">Confirmar conversión BOB→USDC</h3>
          <button onClick={handleClose} className="w-8 h-8 rounded-full bg-[#0F1628] flex items-center justify-center">
            <X size={16} className="text-[#8A96B8]" />
          </button>
        </div>

        <div className="bg-[#0F1628] rounded-xl p-4 mb-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-[0.75rem] text-[#8A96B8]">Usuario</span>
            <span className="text-[0.875rem] font-semibold text-white">
              {conversion.userId?.firstName} {conversion.userId?.lastName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[0.75rem] text-[#8A96B8]">Email</span>
            <span className="text-[0.875rem] text-[#C4CBD8]">{conversion.userId?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[0.75rem] text-[#8A96B8]">Débito BOB</span>
            <span className="text-[0.9375rem] font-bold text-[#F87171]">-{formatBOB(bobAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[0.75rem] text-[#8A96B8]">Crédito USDC</span>
            <span className="text-[0.9375rem] font-bold text-[#22C55E]">+{Number(usdcAmount ?? 0).toFixed(6)} USDC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[0.75rem] text-[#8A96B8]">Tasa</span>
            <span className="text-[0.75rem] text-[#C4CBD8]">1 USDC = {Number(bobPerUsdc ?? 0).toFixed(2)} BOB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[0.75rem] text-[#8A96B8]">Referencia</span>
            <span className="text-[0.75rem] font-mono text-[#C4CBD8]">{conversion.wtxId}</span>
          </div>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <label className="block text-[0.75rem] font-medium text-[#8A96B8] mb-1.5">Nota interna (opcional)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              placeholder="Observaciones del admin"
              className="w-full bg-[#0F1628] border border-[#263050] rounded-xl px-4 py-3 text-white text-[0.875rem] focus:border-[#C4CBD8] focus:outline-none" />
          </div>
          {error && <p className="text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-4 py-2">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={handleClose}
              className="flex-1 py-3 rounded-xl font-semibold text-[0.875rem] text-white"
              style={{ border: '1.5px solid #263050' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-xl font-bold text-[0.875rem] text-[#0F1628] disabled:opacity-40"
              style={{ background: '#22C55E' }}>
              {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Aprobar conversión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal Rechazar Conversión ─────────────────────────────────────────────────

function RejectConversionModal({ conversion, open, onClose, onSuccess }) {
  const [reason, setReason]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  function handleClose() {
    setReason(''); setError(''); onClose()
  }

  async function handleReject(e) {
    e.preventDefault(); setError('')
    if (!reason.trim()) return setError('Indica la razón del rechazo.')
    setLoading(true)
    try {
      await rejectConversion(conversion?.wtxId, reason)
      onSuccess?.()
      handleClose()
    } catch (err) {
      setError(err.message ?? 'Error al rechazar la conversión.')
    } finally {
      setLoading(false)
    }
  }

  if (!open || !conversion) return null

  const { bobAmount } = conversion.metadata ?? {}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: '#0F162299' }}>
      <div className="w-full max-w-md bg-[#1A2340] rounded-2xl p-6"
        style={{ border: '1px solid #263050' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[1rem] font-bold text-white">Rechazar conversión</h3>
          <button onClick={handleClose} className="w-8 h-8 rounded-full bg-[#0F1628] flex items-center justify-center">
            <X size={16} className="text-[#8A96B8]" />
          </button>
        </div>

        <div className="bg-[#0F1628] rounded-xl p-4 mb-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-[0.75rem] text-[#8A96B8]">Usuario</span>
            <span className="text-[0.875rem] font-semibold text-white">
              {conversion.userId?.firstName} {conversion.userId?.lastName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[0.75rem] text-[#8A96B8]">Monto</span>
            <span className="text-[0.9375rem] font-bold text-white">{formatBOB(bobAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[0.75rem] text-[#8A96B8]">Referencia</span>
            <span className="text-[0.75rem] font-mono text-[#C4CBD8]">{conversion.wtxId}</span>
          </div>
        </div>

        <div className="bg-[#EF44441A] rounded-xl px-4 py-3 mb-4">
          <p className="text-[0.8125rem] text-[#F87171]">
            Al rechazar, los Bs. {Number(bobAmount ?? 0).toFixed(2)} reservados se devolverán al saldo disponible del usuario.
          </p>
        </div>

        <form onSubmit={handleReject} className="space-y-4">
          <div>
            <label className="block text-[0.75rem] font-medium text-[#8A96B8] mb-1.5">
              Razón del rechazo <span className="text-[#F87171]">*</span>
            </label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Ej: Fondos no verificados, monto excede límite..."
              className="w-full bg-[#0F1628] border border-[#263050] rounded-xl px-4 py-3 text-white text-[0.875rem] focus:border-[#C4CBD8] focus:outline-none" />
          </div>
          {error && <p className="text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-4 py-2">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={handleClose}
              className="flex-1 py-3 rounded-xl font-semibold text-[0.875rem] text-white"
              style={{ border: '1.5px solid #263050' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-xl font-bold text-[0.875rem] text-white disabled:opacity-40"
              style={{ background: '#EF4444' }}>
              {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Rechazar conversión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function WalletAdminPage() {
  const [deposits, setDeposits]       = useState([])
  const [conversions, setConversions] = useState([])
  const [wallets, setWallets]         = useState([])
  const [loading, setLoading]         = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  const [confirmDeposit, setConfirmDeposit]       = useState(null)
  const [confirmConv, setConfirmConv]             = useState(null)
  const [rejectConv, setRejectConv]               = useState(null)
  const [freezeWallet, setFreezeWallet]           = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [dep, conv, wal] = await Promise.all([
        request('/admin/wallet/deposits/pending'),
        listPendingConversions(),
        request(`/admin/wallet${statusFilter ? `?status=${statusFilter}` : ''}`),
      ])
      setDeposits(dep.deposits ?? [])
      setConversions(conv.conversions ?? [])
      setWallets(wal.wallets ?? [])
    } catch {
      // silencioso
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function handleUnfreeze(userId) {
    try {
      await request(`/admin/wallet/${userId}/unfreeze`, { method: 'PATCH' })
      fetchAll()
    } catch (err) {
      alert(err.message ?? 'Error al descongelar.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="animate-spin text-[#C4CBD8]" />
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[1.25rem] font-bold text-white flex items-center gap-2">
            <Wallet size={20} className="text-[#C4CBD8]" />
            Wallets Bolivia
          </h1>
          <p className="text-[0.8125rem] text-[#8A96B8] mt-0.5">
            Gestión de wallets BOB — AV Finance SRL
          </p>
        </div>
        <button onClick={fetchAll}
          className="flex items-center gap-2 text-[0.8125rem] font-medium text-[#8A96B8] hover:text-white px-3 py-2 rounded-xl transition-colors"
          style={{ border: '1px solid #263050' }}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* ── SECCIÓN 1: Depósitos pendientes ────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[1rem] font-bold text-white">Depósitos pendientes</h2>
          {deposits.length > 0 && (
            <span className="text-[0.6875rem] font-bold px-2 py-0.5 rounded-full"
              style={{ background: '#C4CBD81A', color: '#C4CBD8', border: '1px solid #C4CBD833' }}>
              {deposits.length}
            </span>
          )}
        </div>

        {deposits.length === 0 ? (
          <div className="bg-[#1A2340] rounded-2xl p-8 text-center" style={{ border: '1px solid #263050' }}>
            <CheckCircle2 size={28} className="mx-auto text-[#22C55E] mb-2" />
            <p className="text-[0.875rem] font-semibold text-[#8A96B8]">Sin depósitos pendientes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deposits.map(dep => (
              <div key={dep._id ?? dep.wtxId}
                className="flex items-center gap-4 px-5 py-4 rounded-2xl"
                style={{ background: '#1A2340', border: '1px solid #263050' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[0.9375rem] font-bold text-white">
                      {dep.userId?.firstName} {dep.userId?.lastName}
                    </p>
                    <span className="text-[0.625rem] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: '#C4CBD81A', color: '#C4CBD8' }}>
                      {dep.userId?.kycStatus}
                    </span>
                  </div>
                  <p className="text-[0.75rem] text-[#8A96B8]">{dep.userId?.email}</p>
                  <p className="text-[0.6875rem] text-[#4E5A7A] mt-0.5 font-mono">Ref: {dep.wtxId}</p>
                  <p className="text-[0.6875rem] text-[#4E5A7A]">{formatDate(dep.createdAt)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[1.0625rem] font-bold text-[#22C55E] mb-2">{formatBOB(dep.amount)}</p>
                  <button
                    onClick={() => setConfirmDeposit(dep)}
                    className="text-[0.75rem] font-bold px-3 py-1.5 rounded-xl text-[#0F1628]"
                    style={{ background: '#22C55E' }}>
                    Confirmar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── SECCIÓN 2: Conversiones BOB→USDC pendientes ─────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[1rem] font-bold text-white flex items-center gap-2">
            <ArrowRightLeft size={16} className="text-[#C4CBD8]" />
            Conversiones BOB→USDC
          </h2>
          {conversions.length > 0 && (
            <span className="text-[0.6875rem] font-bold px-2 py-0.5 rounded-full"
              style={{ background: '#F59E0B1A', color: '#F59E0B', border: '1px solid #F59E0B33' }}>
              {conversions.length}
            </span>
          )}
        </div>

        {conversions.length === 0 ? (
          <div className="bg-[#1A2340] rounded-2xl p-8 text-center" style={{ border: '1px solid #263050' }}>
            <CheckCircle2 size={28} className="mx-auto text-[#22C55E] mb-2" />
            <p className="text-[0.875rem] font-semibold text-[#8A96B8]">Sin conversiones pendientes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversions.map(conv => {
              const { bobAmount, usdcAmount, bobPerUsdc } = conv.metadata ?? {}
              return (
                <div key={conv._id ?? conv.wtxId}
                  className="flex items-center gap-4 px-5 py-4 rounded-2xl"
                  style={{ background: '#1A2340', border: '1px solid #263050' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[0.9375rem] font-bold text-white">
                        {conv.userId?.firstName} {conv.userId?.lastName}
                      </p>
                      <span className="text-[0.625rem] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: '#C4CBD81A', color: '#C4CBD8' }}>
                        {conv.userId?.kycStatus}
                      </span>
                    </div>
                    <p className="text-[0.75rem] text-[#8A96B8]">{conv.userId?.email}</p>
                    <p className="text-[0.6875rem] text-[#4E5A7A] mt-0.5">
                      {formatBOB(bobAmount)} → {Number(usdcAmount ?? 0).toFixed(6)} USDC
                      <span className="text-[#4E5A7A] ml-1">(1 USDC = {Number(bobPerUsdc ?? 0).toFixed(2)} BOB)</span>
                    </p>
                    <p className="text-[0.6875rem] text-[#4E5A7A] font-mono">Ref: {conv.wtxId}</p>
                    <p className="text-[0.6875rem] text-[#4E5A7A]">{formatDate(conv.createdAt)}</p>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1.5">
                    <button
                      onClick={() => setConfirmConv(conv)}
                      className="block w-full text-[0.75rem] font-bold px-3 py-1.5 rounded-xl text-[#0F1628]"
                      style={{ background: '#22C55E' }}>
                      Aprobar
                    </button>
                    <button
                      onClick={() => setRejectConv(conv)}
                      className="block w-full text-[0.75rem] font-bold px-3 py-1.5 rounded-xl text-[#F87171]"
                      style={{ background: '#EF44441A', border: '1px solid #EF444433' }}>
                      Rechazar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── SECCIÓN 3: Wallets activas ──────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[1rem] font-bold text-white">Wallets</h2>
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none bg-[#1A2340] border border-[#263050] rounded-xl pl-3 pr-8 py-2 text-[0.8125rem] text-white focus:border-[#C4CBD8] focus:outline-none cursor-pointer">
              <option value="">Todos</option>
              <option value="active">Activas</option>
              <option value="frozen">Congeladas</option>
              <option value="suspended">Suspendidas</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A96B8] pointer-events-none" />
          </div>
        </div>

        {wallets.length === 0 ? (
          <div className="bg-[#1A2340] rounded-2xl p-8 text-center" style={{ border: '1px solid #263050' }}>
            <p className="text-[0.875rem] text-[#8A96B8]">Sin wallets para mostrar.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {wallets.map(w => {
              const uid = w.userId?._id ?? w.userId
              return (
                <div key={w._id ?? w.walletId}
                  className="flex items-center gap-4 px-5 py-4 rounded-2xl"
                  style={{ background: '#1A2340', border: '1px solid #263050' }}>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[0.875rem] text-[#0F1628] flex-shrink-0"
                    style={{ background: '#C4CBD8' }}>
                    {w.userId?.firstName?.[0] ?? '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[0.9375rem] font-bold text-white truncate">
                        {w.userId?.firstName} {w.userId?.lastName}
                      </p>
                      <WalletStatusBadge status={w.status} />
                    </div>
                    <p className="text-[0.75rem] text-[#8A96B8] truncate">{w.userId?.email}</p>
                    {w.pendingTransactions > 0 && (
                      <p className="text-[0.625rem] text-[#C4CBD8] mt-0.5">
                        {w.pendingTransactions} tx pendiente{w.pendingTransactions > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Saldo y acciones */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-[1.0625rem] font-bold text-white mb-1.5">{formatBOB(w.balance)}</p>
                    {w.balanceFrozen > 0 && (
                      <p className="text-[0.6875rem] text-[#F87171] mb-1.5">Congelado: {formatBOB(w.balanceFrozen)}</p>
                    )}
                    <div className="flex gap-1.5 justify-end">
                      {w.status === 'active' ? (
                        <button onClick={() => setFreezeWallet(w)}
                          className="flex items-center gap-1 text-[0.6875rem] font-semibold px-2.5 py-1 rounded-lg"
                          style={{ background: '#EF44441A', color: '#F87171', border: '1px solid #EF444433' }}>
                          <Lock size={11} /> Congelar
                        </button>
                      ) : w.status === 'frozen' ? (
                        <button onClick={() => handleUnfreeze(uid)}
                          className="flex items-center gap-1 text-[0.6875rem] font-semibold px-2.5 py-1 rounded-lg"
                          style={{ background: '#22C55E1A', color: '#22C55E', border: '1px solid #22C55E33' }}>
                          <Unlock size={11} /> Descongelar
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <ConfirmDepositModal
        deposit={confirmDeposit}
        open={!!confirmDeposit}
        onClose={() => setConfirmDeposit(null)}
        onSuccess={fetchAll}
      />
      <FreezeModal
        wallet={freezeWallet}
        open={!!freezeWallet}
        onClose={() => setFreezeWallet(null)}
        onSuccess={fetchAll}
      />
      <ConfirmConversionModal
        conversion={confirmConv}
        open={!!confirmConv}
        onClose={() => setConfirmConv(null)}
        onSuccess={fetchAll}
      />
      <RejectConversionModal
        conversion={rejectConv}
        open={!!rejectConv}
        onClose={() => setRejectConv(null)}
        onSuccess={fetchAll}
      />
    </div>
  )
}
