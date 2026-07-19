/**
 * WalletAdminPage.jsx — Panel Admin: Wallets BOB Bolivia (Fase 25)
 *
 * Sección 1: Depósitos pendientes de confirmar
 * Sección 2: Conversiones BOB→USDC pendientes
 * Sección 3: Wallets activas con opción de congelar
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Wallet, CheckCircle2, AlertCircle, Loader2, RefreshCw,
  ChevronDown, X, Lock, Unlock, ArrowRightLeft, ArrowUpRight, QrCode,
  Percent, Save, Coins, Eye, FileText, Phone, CreditCard, Upload,
  Search, ExternalLink, Landmark, Clock, User, History,
} from 'lucide-react'
import { request, requestFormData } from '../../../services/api'
import {
  listPendingConversions, confirmConversion, rejectConversion,
  listPendingUSDCtoBOB, confirmUSDCtoBOB, rejectUSDCtoBOB,
  getWalletFees, updateWalletFees, getWalletFeeRevenue,
  traceWithdrawals, attachWithdrawalComprobante, listAllWithdrawals,
} from '../../../services/adminService'

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

// Extrae los datos del usuario del depósito de forma tolerante: prioriza el shape
// nuevo (d.user, rico) y cae al legacy (d.userId populado) por si el backend aún
// no expone el shape nuevo durante un deploy escalonado.
function depUser(d) {
  if (d?.user) return d.user
  const u = d?.userId ?? {}
  return {
    name:         `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—',
    email:        u.email ?? null,
    phone:        u.phone ?? null,
    documentType: null,
    kycStatus:    u.kycStatus ?? null,
  }
}

// ── Modal Ver Comprobante ─────────────────────────────────────────────────────

function ProofViewerModal({ wtxId, open, onClose, kind = 'deposit' }) {
  const [loading, setLoading] = useState(false)
  const [proof, setProof]     = useState(null)
  const [error, setError]     = useState('')

  useEffect(() => {
    if (!open || !wtxId) return
    let active = true
    setLoading(true); setError(''); setProof(null)
    const path = kind === 'withdrawal'
      ? `/admin/wallet/withdrawals/${encodeURIComponent(wtxId)}/comprobante`
      : `/admin/wallet/deposits/${encodeURIComponent(wtxId)}/comprobante`
    request(path)
      .then(d => { if (active) setProof(d) })
      .catch(e => { if (active) setError(e.message ?? 'No se pudo cargar el comprobante.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [open, wtxId, kind])

  if (!open) return null
  const isPdf = proof?.mimeType === 'application/pdf'
  const src   = proof ? `data:${proof.mimeType};base64,${proof.base64}` : ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: '#0F162299' }}>
      <div className="w-full max-w-lg bg-[#1A2340] rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ border: '1px solid #263050' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[1rem] font-bold text-white flex items-center gap-2">
            <FileText size={16} className="text-[#C4CBD8]" /> Comprobante
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#0F1628] flex items-center justify-center">
            <X size={16} className="text-[#8A96B8]" />
          </button>
        </div>
        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 size={22} className="animate-spin text-[#8A96B8]" /></div>
        ) : error ? (
          <p className="text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-4 py-3">{error}</p>
        ) : isPdf ? (
          <div className="text-center space-y-3">
            <p className="text-[0.8125rem] text-[#8A96B8]">{proof.filename ?? 'comprobante.pdf'}</p>
            <a href={src} download={proof.filename ?? 'comprobante.pdf'} target="_blank" rel="noreferrer"
              className="inline-block px-4 py-2.5 rounded-xl font-bold text-[0.8125rem] text-[#0F1628]"
              style={{ background: '#C4CBD8' }}>
              Abrir PDF
            </a>
          </div>
        ) : (
          <img src={src} alt="Comprobante" className="w-full rounded-xl" style={{ border: '1px solid #263050' }} />
        )}
      </div>
    </div>
  )
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
        {(() => {
          const u = depUser(deposit)
          return (
            <div className="bg-[#0F1628] rounded-xl p-4 mb-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-[0.75rem] text-[#8A96B8]">Usuario</span>
                <span className="text-[0.875rem] font-semibold text-white">{u.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[0.75rem] text-[#8A96B8]">Email</span>
                <span className="text-[0.875rem] text-[#C4CBD8]">{u.email ?? '—'}</span>
              </div>
              {u.phone && (
                <div className="flex justify-between">
                  <span className="text-[0.75rem] text-[#8A96B8]">Teléfono</span>
                  <span className="text-[0.875rem] text-[#C4CBD8]">{u.phone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[0.75rem] text-[#8A96B8]">KYC / Documento</span>
                <span className="text-[0.75rem] text-[#C4CBD8]">
                  {u.kycStatus ?? '—'}{u.documentType ? ` · ${u.documentType}` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[0.75rem] text-[#8A96B8]">Monto</span>
                <span className="text-[0.9375rem] font-bold text-[#22C55E]">{formatBOB(deposit.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[0.75rem] text-[#8A96B8]">Referencia</span>
                <span className="text-[0.75rem] font-mono text-[#C4CBD8]">{deposit.reference ?? deposit.wtxId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[0.75rem] text-[#8A96B8]">Fecha</span>
                <span className="text-[0.75rem] text-white">{formatDate(deposit.createdAt)}</span>
              </div>
            </div>
          )
        })()}

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

// ── Modal Confirmar Retiro ─────────────────────────────────────────────────────

function ConfirmWithdrawalModal({ withdrawal, open, onClose, onSuccess }) {
  const [bankReference, setBankReference] = useState('')
  const [note, setNote]                   = useState('')
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')
  const [showQr, setShowQr]               = useState(false)
  const [proofFile, setProofFile]         = useState(null)
  const [proofPreview, setProofPreview]   = useState(null)

  function handleClose() {
    setBankReference(''); setNote(''); setError(''); setShowQr(false)
    setProofFile(null); setProofPreview(null); onClose()
  }

  function handleProofChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('El comprobante no puede superar 5 MB.'); return }
    setProofFile(file); setError('')
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = ev => setProofPreview(ev.target.result)
      reader.readAsDataURL(file)
    } else {
      setProofPreview(null)
    }
  }

  async function handleConfirm(e) {
    e.preventDefault(); setError('')
    if (!bankReference.trim()) return setError('La referencia bancaria es obligatoria.')
    if (!proofFile) return setError('El comprobante de la transferencia es obligatorio.')
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('wtxId', withdrawal?.wtxId)
      fd.append('bankReference', bankReference)
      fd.append('note', note)
      fd.append('comprobante', proofFile)
      await requestFormData('/admin/wallet/withdrawal/confirm', fd)
      onSuccess?.(); handleClose()
    } catch (err) {
      setError(err.message ?? 'Error al confirmar el retiro.')
    } finally {
      setLoading(false)
    }
  }

  if (!open || !withdrawal) return null

  const { bankName, accountNumber, accountHolder, accountType, bankQrImage } = withdrawal.metadata ?? {}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: '#0F162299' }}>
      <div className="w-full max-w-md bg-[#1A2340] rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ border: '1px solid #263050' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[1rem] font-bold text-white flex items-center gap-2">
            <ArrowUpRight size={16} className="text-[#F59E0B]" /> Confirmar retiro
          </h3>
          <button onClick={handleClose} className="w-8 h-8 rounded-full bg-[#0F1628] flex items-center justify-center">
            <X size={16} className="text-[#8A96B8]" />
          </button>
        </div>

        <div className="bg-[#0F1628] rounded-xl p-4 mb-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-[0.75rem] text-[#8A96B8]">Usuario</span>
            <span className="text-[0.875rem] font-semibold text-white">
              {withdrawal.userId?.firstName} {withdrawal.userId?.lastName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[0.75rem] text-[#8A96B8]">Email</span>
            <span className="text-[0.875rem] text-[#C4CBD8]">{withdrawal.userId?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[0.75rem] text-[#8A96B8]">Monto</span>
            <span className="text-[0.9375rem] font-bold text-[#F59E0B]">{formatBOB(withdrawal.amount)}</span>
          </div>
          <div className="pt-2 border-t border-[#263050] space-y-1.5">
            <p className="text-[0.6875rem] font-semibold text-[#8A96B8] uppercase tracking-wider">Cuenta destino</p>
            {bankName && <div className="flex justify-between"><span className="text-[0.75rem] text-[#8A96B8]">Banco</span><span className="text-[0.75rem] text-white">{bankName}</span></div>}
            {accountHolder && <div className="flex justify-between"><span className="text-[0.75rem] text-[#8A96B8]">Titular</span><span className="text-[0.75rem] text-white">{accountHolder}</span></div>}
            {accountNumber && <div className="flex justify-between"><span className="text-[0.75rem] text-[#8A96B8]">N° cuenta</span><span className="text-[0.75rem] font-mono text-white">{accountNumber}</span></div>}
            {accountType && <div className="flex justify-between"><span className="text-[0.75rem] text-[#8A96B8]">Tipo</span><span className="text-[0.75rem] text-white">{accountType}</span></div>}
          </div>
          {bankQrImage && (
            <div className="pt-2 border-t border-[#263050]">
              <button onClick={() => setShowQr(v => !v)}
                className="flex items-center gap-2 text-[0.75rem] font-semibold text-[#C4CBD8] hover:text-white transition-colors">
                <QrCode size={14} />
                {showQr ? 'Ocultar QR bancario' : 'Ver QR bancario del usuario'}
              </button>
              {showQr && (
                <div className="mt-3 flex justify-center">
                  <img
                    src={`data:${bankQrImage.mimetype};base64,${bankQrImage.data}`}
                    alt="QR bancario"
                    className="max-w-[200px] rounded-xl"
                    style={{ border: '2px solid #263050' }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <label className="block text-[0.75rem] font-medium text-[#8A96B8] mb-1.5">
              Referencia bancaria <span className="text-[#F87171]">*</span>
            </label>
            <input type="text" value={bankReference} onChange={e => setBankReference(e.target.value)}
              placeholder="N° de transferencia o comprobante"
              className="w-full bg-[#0F1628] border border-[#263050] rounded-xl px-4 py-3 text-white text-[0.875rem] focus:border-[#C4CBD8] focus:outline-none" />
          </div>
          <div>
            <label className="block text-[0.75rem] font-medium text-[#8A96B8] mb-1.5">
              Comprobante de la transferencia <span className="text-[#F87171]">*</span>
              <span className="text-[#8A96B8] font-normal"> (obligatorio — lo verá el usuario)</span>
            </label>
            {!proofFile ? (
              <label className="flex flex-col items-center gap-1.5 py-4 rounded-xl cursor-pointer transition-colors hover:bg-[#0F1628]"
                style={{ border: '1.5px dashed #263050' }}>
                <Upload size={18} className="text-[#8A96B8]" />
                <span className="text-[0.75rem] text-[#8A96B8]">Subir comprobante (JPG, PNG o PDF)</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleProofChange} />
              </label>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ border: '1px solid #263050', background: '#0F1628' }}>
                {proofPreview
                  ? <img src={proofPreview} alt="Comprobante" className="w-12 h-12 rounded-lg object-contain flex-shrink-0" style={{ border: '1px solid #263050' }} />
                  : <FileText size={20} className="text-[#C4CBD8] flex-shrink-0" />}
                <span className="flex-1 min-w-0 text-[0.8125rem] text-white truncate">{proofFile.name}</span>
                <button type="button" onClick={() => { setProofFile(null); setProofPreview(null) }}
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#EF44441A' }}>
                  <X size={13} className="text-[#F87171]" />
                </button>
              </div>
            )}
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
              {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Confirmar retiro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal Dispersar Retiro (BANECO §9 Planillas) ───────────────────────────────

function DispatchWithdrawalModal({ withdrawal, open, onClose, onSuccess }) {
  const [bankCode, setBankCode]         = useState('')
  const [docId, setDocId]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')

  function handleClose() {
    setBankCode(''); setDocId(''); setError(''); onClose()
  }

  async function handleDispatch(e) {
    e.preventDefault(); setError('')
    if (!bankCode.trim()) return setError('El código ASFI de la entidad destino es obligatorio.')
    setLoading(true)
    try {
      await request('/admin/wallet/withdrawal/dispatch', {
        method: 'POST',
        body: JSON.stringify({
          wtxId: withdrawal?.wtxId,
          bankCode: bankCode.trim(),
          ...(docId.trim() ? { beneficiaryDocId: docId.trim() } : {}),
        }),
      })
      onSuccess?.(); handleClose()
    } catch (err) {
      setError(err.message ?? 'Error al dispersar el retiro.')
    } finally {
      setLoading(false)
    }
  }

  if (!open || !withdrawal) return null

  const { bankName, accountNumber, accountHolder, accountType } = withdrawal.metadata ?? {}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: '#0F162299' }}>
      <div className="w-full max-w-md bg-[#1A2340] rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ border: '1px solid #263050' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[1rem] font-bold text-white flex items-center gap-2">
            <ArrowUpRight size={16} className="text-[#3B82F6]" /> Dispersar vía BANECO
          </h3>
          <button onClick={handleClose} className="w-8 h-8 rounded-full bg-[#0F1628] flex items-center justify-center">
            <X size={16} className="text-[#8A96B8]" />
          </button>
        </div>

        <div className="bg-[#0F1628] rounded-xl p-4 mb-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-[0.75rem] text-[#8A96B8]">Usuario</span>
            <span className="text-[0.875rem] font-semibold text-white">{withdrawal.userId?.firstName} {withdrawal.userId?.lastName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[0.75rem] text-[#8A96B8]">Monto</span>
            <span className="text-[0.9375rem] font-bold text-[#3B82F6]">{formatBOB(withdrawal.amount)}</span>
          </div>
          <div className="pt-2 border-t border-[#263050] space-y-1.5">
            <p className="text-[0.6875rem] font-semibold text-[#8A96B8] uppercase tracking-wider">Cuenta destino</p>
            {bankName && <div className="flex justify-between"><span className="text-[0.75rem] text-[#8A96B8]">Banco</span><span className="text-[0.75rem] text-white">{bankName}</span></div>}
            {accountHolder && <div className="flex justify-between"><span className="text-[0.75rem] text-[#8A96B8]">Titular</span><span className="text-[0.75rem] text-white">{accountHolder}</span></div>}
            {accountNumber && <div className="flex justify-between"><span className="text-[0.75rem] text-[#8A96B8]">N° cuenta</span><span className="text-[0.75rem] font-mono text-white">{accountNumber}</span></div>}
            {accountType && <div className="flex justify-between"><span className="text-[0.75rem] text-[#8A96B8]">Tipo</span><span className="text-[0.75rem] text-white">{accountType}</span></div>}
          </div>
        </div>

        <form onSubmit={handleDispatch} className="space-y-4">
          <div>
            <label className="block text-[0.75rem] font-medium text-[#8A96B8] mb-1.5">
              Código ASFI entidad destino <span className="text-[#F87171]">*</span>
            </label>
            <input type="text" value={bankCode} onChange={e => setBankCode(e.target.value)}
              placeholder="ej. 1016 (Banco Económico)" list="asfi-bank-codes"
              className="w-full bg-[#0F1628] border border-[#263050] rounded-xl px-4 py-3 text-white text-[0.875rem] focus:border-[#3B82F6] focus:outline-none" />
            <datalist id="asfi-bank-codes">
              <option value="1016">Banco Económico</option>
            </datalist>
            <p className="text-[0.6875rem] text-[#4E5A7A] mt-1">Catálogo de códigos ASFI provisto por BANECO. En sandbox cualquier valor sirve.</p>
          </div>
          <div>
            <label className="block text-[0.75rem] font-medium text-[#8A96B8] mb-1.5">CI/NIT del beneficiario (opcional)</label>
            <input type="text" value={docId} onChange={e => setDocId(e.target.value)}
              placeholder="Documento del titular"
              className="w-full bg-[#0F1628] border border-[#263050] rounded-xl px-4 py-3 text-white text-[0.875rem] focus:border-[#3B82F6] focus:outline-none" />
          </div>
          {error && <p className="text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-4 py-2">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={handleClose}
              className="flex-1 py-3 rounded-xl font-semibold text-[0.875rem] text-white" style={{ border: '1.5px solid #263050' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 rounded-xl font-bold text-[0.875rem] text-white disabled:opacity-40" style={{ background: '#3B82F6' }}>
              {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Dispersar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal Rechazar Retiro ──────────────────────────────────────────────────────

function RejectWithdrawalModal({ withdrawal, open, onClose, onSuccess }) {
  const [reason, setReason]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  function handleClose() { setReason(''); setError(''); onClose() }

  async function handleReject(e) {
    e.preventDefault(); setError('')
    if (!reason.trim()) return setError('Indica la razón del rechazo.')
    setLoading(true)
    try {
      await request('/admin/wallet/withdrawal/reject', {
        method: 'POST',
        body: JSON.stringify({ wtxId: withdrawal?.wtxId, reason }),
      })
      onSuccess?.(); handleClose()
    } catch (err) {
      setError(err.message ?? 'Error al rechazar el retiro.')
    } finally {
      setLoading(false)
    }
  }

  if (!open || !withdrawal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: '#0F162299' }}>
      <div className="w-full max-w-md bg-[#1A2340] rounded-2xl p-6"
        style={{ border: '1px solid #263050' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[1rem] font-bold text-white">Rechazar retiro</h3>
          <button onClick={handleClose} className="w-8 h-8 rounded-full bg-[#0F1628] flex items-center justify-center">
            <X size={16} className="text-[#8A96B8]" />
          </button>
        </div>
        <div className="bg-[#EF44441A] border border-[#EF444433] rounded-xl px-4 py-3 mb-4">
          <p className="text-[0.8125rem] text-[#F87171]">
            Al rechazar, los {formatBOB(withdrawal.amount)} reservados se devolverán al saldo disponible del usuario.
          </p>
        </div>
        <form onSubmit={handleReject} className="space-y-4">
          <div>
            <label className="block text-[0.75rem] font-medium text-[#8A96B8] mb-1.5">
              Razón del rechazo <span className="text-[#F87171]">*</span>
            </label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Ej: Cuenta incorrecta, datos insuficientes..."
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
              {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Rechazar retiro'}
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
    if (!reportNumber.trim()) return setError('La referencia del oficio o instrucción regulatoria es obligatoria.')
    setLoading(true)
    try {
      await request(`/admin/wallet/${wallet?.userId?._id ?? wallet?.userId}/freeze`, {
        method: 'PATCH',
        body: JSON.stringify({ reason, regulatoryRef: reportNumber.trim() }),
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
            <label className="block text-[0.75rem] font-medium text-[#8A96B8] mb-1.5">Referencia del oficio / instrucción regulatoria *</label>
            <input type="text" value={reportNumber} onChange={e => setReportNumber(e.target.value)}
              placeholder="Ej. Oficio ASFI-2026-XXX / ROS-2026-XXX"
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

function ConfirmConversionModal({ conversion, open, onClose, onSuccess, kind = 'bob_to_usdc' }) {
  const [note, setNote]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const isSell = kind === 'usdc_to_bob'   // USDC→BOB: débito USDC, crédito BOB

  function handleClose() {
    setNote(''); setError(''); onClose()
  }

  async function handleConfirm(e) {
    e.preventDefault(); setError('')
    setLoading(true)
    try {
      await (isSell ? confirmUSDCtoBOB : confirmConversion)(conversion?.wtxId, note)
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
          <h3 className="text-[1rem] font-bold text-white">Confirmar conversión {isSell ? 'USDC→BOB' : 'BOB→USDC'}</h3>
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
            <span className="text-[0.75rem] text-[#8A96B8]">Débito {isSell ? 'USDC' : 'BOB'}</span>
            <span className="text-[0.9375rem] font-bold text-[#F87171]">
              {isSell ? `-${Number(usdcAmount ?? 0).toFixed(6)} USDC` : `-${formatBOB(bobAmount)}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[0.75rem] text-[#8A96B8]">Crédito {isSell ? 'BOB' : 'USDC'}</span>
            <span className="text-[0.9375rem] font-bold text-[#22C55E]">
              {isSell ? `+${formatBOB(bobAmount)}` : `+${Number(usdcAmount ?? 0).toFixed(6)} USDC`}
            </span>
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

function RejectConversionModal({ conversion, open, onClose, onSuccess, kind = 'bob_to_usdc' }) {
  const [reason, setReason]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const isSell = kind === 'usdc_to_bob'

  function handleClose() {
    setReason(''); setError(''); onClose()
  }

  async function handleReject(e) {
    e.preventDefault(); setError('')
    if (!reason.trim()) return setError('Indica la razón del rechazo.')
    setLoading(true)
    try {
      await (isSell ? rejectUSDCtoBOB : rejectConversion)(conversion?.wtxId, reason)
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

// ════════════════════════════════════════════════════════════════════════════
//  COMISIONES P2P USDC — config editable + revenue acumulada
// ════════════════════════════════════════════════════════════════════════════

// Campos editables (deben coincidir con EDITABLE del backend walletFeeController)
const FEE_FIELDS = [
  'usdcP2pFeePercent', 'usdcP2pFeeFixed', 'usdcP2pFeeMin', 'usdcP2pFeeMax', 'usdcP2pFreeBelow',
  'businessUsdcP2pFeePercent', 'businessUsdcP2pFeeFixed',
  'usdcP2pMinPerTx', 'usdcP2pMaxPerTx', 'usdcP2pMaxDaily',
  'businessUsdcP2pMaxPerTx', 'businessUsdcP2pMaxDaily',
  'convertBuySpreadPct', 'convertSellSpreadPct',
]

// Campos que admiten vacío = null ("usar default de entorno" / sin techo).
const NULLABLE_FEE_FIELDS = ['usdcP2pFeeMax', 'convertBuySpreadPct', 'convertSellSpreadPct']

// Normaliza un valor de config a string para el input (null → '')
const toStr = v => (v == null ? '' : String(v))

function FeeField({ label, value, onChange, suffix, help, placeholder }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[0.75rem] font-medium text-[#8A96B8]">{label}</label>
      <div className="relative">
        <input
          type="number" inputMode="decimal" step="0.01" min="0"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white border border-[#263050] bg-[#0F1628] focus:outline-none focus:border-[#C4CBD8] transition-colors placeholder:text-[#4E5A7A]"
          style={{ paddingRight: suffix ? 44 : undefined }}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.75rem] text-[#4E5A7A] pointer-events-none">{suffix}</span>
        )}
      </div>
      {help && <p className="text-[0.6875rem] text-[#4E5A7A]">{help}</p>}
    </div>
  )
}

function FeeToggle({ checked, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className="flex items-center gap-3">
      <span style={{
        display: 'inline-block', width: 46, height: 26, borderRadius: 13,
        background: checked ? '#22C55E' : '#263050', position: 'relative', flexShrink: 0, transition: 'background 0.2s',
      }}>
        <span style={{
          position: 'absolute', top: 3, left: checked ? 23 : 3,
          width: 20, height: 20, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }} />
      </span>
      <span className="text-[0.875rem] font-semibold" style={{ color: checked ? '#22C55E' : '#8A96B8' }}>
        {checked ? 'Cobrando comisión' : 'Comisión desactivada'}
      </span>
    </button>
  )
}

function FeeGroup({ title, children }) {
  return (
    <div className="rounded-xl p-4" style={{ background: '#0F1628', border: '1px solid #263050' }}>
      <p className="text-[0.6875rem] font-bold text-[#4E5A7A] uppercase tracking-wider mb-3">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

function WalletFeesPanel() {
  const [cfg,     setCfg]     = useState(null)   // config original cargada
  const [form,    setForm]    = useState(null)   // valores editables (strings + bool)
  const [revenue, setRevenue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)
  const [saved,   setSaved]   = useState(false)

  const buildForm = (c) => {
    const f = { usdcP2pEnabled: !!c.usdcP2pEnabled }
    for (const k of FEE_FIELDS) f[k] = toStr(c[k])
    return f
  }

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [c, r] = await Promise.all([getWalletFees(), getWalletFeeRevenue()])
      setCfg(c); setForm(buildForm(c)); setRevenue(r)
    } catch (err) {
      setError(err.message || 'No se pudo cargar la configuración de comisiones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Payload con SOLO los campos cambiados respecto a la config original
  const changedPayload = useMemo(() => {
    if (!cfg || !form) return {}
    const out = {}
    if (form.usdcP2pEnabled !== !!cfg.usdcP2pEnabled) out.usdcP2pEnabled = form.usdcP2pEnabled
    for (const k of FEE_FIELDS) {
      if (NULLABLE_FEE_FIELDS.includes(k)) {
        // null/'' = usar default de entorno (o sin techo)
        const formNull = form[k] === '' || form[k] == null
        const cfgNull  = cfg[k] == null
        if (formNull && cfgNull) continue
        if (formNull && !cfgNull) { out[k] = null; continue }
        if (Number(form[k]) !== Number(cfg[k])) out[k] = Number(form[k])
        continue
      }
      if (form[k] === '' ) continue                 // vacío en numérico → no tocar
      if (Number(form[k]) !== Number(cfg[k])) out[k] = Number(form[k])
    }
    return out
  }, [cfg, form])

  const dirty = Object.keys(changedPayload).length > 0

  async function save() {
    if (!dirty) return
    setSaving(true); setError(null)
    try {
      const updated = await updateWalletFees(changedPayload)
      setCfg(updated); setForm(buildForm(updated))
      setSaved(true); setTimeout(() => setSaved(false), 2000)
      getWalletFeeRevenue().then(setRevenue).catch(() => {})
    } catch (err) {
      setError(err.message || 'No se pudo guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  const matches = revenue?.verification?.matches

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[1rem] font-bold text-white flex items-center gap-2">
          <Percent size={17} className="text-[#C4CBD8]" />
          Comisiones & Spreads de Wallet
        </h2>
        <button onClick={load}
          className="flex items-center gap-2 text-[0.8125rem] font-medium text-[#8A96B8] hover:text-white px-3 py-2 rounded-xl transition-colors"
          style={{ border: '1px solid #263050' }}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {loading || !form ? (
        <div className="bg-[#1A2340] rounded-2xl p-8 flex items-center justify-center" style={{ border: '1px solid #263050' }}>
          <Loader2 size={22} className="animate-spin text-[#C4CBD8]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Config (2 columnas) */}
          <div className="lg:col-span-2 rounded-2xl p-5 space-y-4" style={{ background: '#1A2340', border: '1px solid #263050' }}>

            {/* Toggle cobrar */}
            <div className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: '#0F1628', border: '1px solid #263050' }}>
              <div>
                <p className="text-[0.875rem] font-semibold text-white">Cobrar comisión</p>
                <p className="text-[0.6875rem] text-[#4E5A7A] mt-0.5">Si está apagado, toda transferencia P2P USDC es sin costo.</p>
              </div>
              <FeeToggle checked={form.usdcP2pEnabled} onChange={v => set('usdcP2pEnabled', v)} />
            </div>

            <FeeGroup title="Retail">
              <FeeField label="Comisión %"     value={form.usdcP2pFeePercent} onChange={v => set('usdcP2pFeePercent', v)} suffix="%" />
              <FeeField label="Comisión fija"  value={form.usdcP2pFeeFixed}   onChange={v => set('usdcP2pFeeFixed', v)}   suffix="USDC" />
              <FeeField label="Mínimo de fee"  value={form.usdcP2pFeeMin}     onChange={v => set('usdcP2pFeeMin', v)}     suffix="USDC" />
              <FeeField label="Máximo de fee"  value={form.usdcP2pFeeMax}     onChange={v => set('usdcP2pFeeMax', v)}     suffix="USDC" placeholder="sin techo" help="Vacío = sin techo" />
              <FeeField label="Sin fee bajo"   value={form.usdcP2pFreeBelow}  onChange={v => set('usdcP2pFreeBelow', v)}  suffix="USDC" help="Montos menores no pagan fee" />
            </FeeGroup>

            <FeeGroup title="Business">
              <FeeField label="Comisión %"    value={form.businessUsdcP2pFeePercent} onChange={v => set('businessUsdcP2pFeePercent', v)} suffix="%" />
              <FeeField label="Comisión fija" value={form.businessUsdcP2pFeeFixed}   onChange={v => set('businessUsdcP2pFeeFixed', v)}   suffix="USDC" />
            </FeeGroup>

            <FeeGroup title="Límites retail">
              <FeeField label="Mín por tx"    value={form.usdcP2pMinPerTx} onChange={v => set('usdcP2pMinPerTx', v)} suffix="USDC" />
              <FeeField label="Máx por tx"    value={form.usdcP2pMaxPerTx} onChange={v => set('usdcP2pMaxPerTx', v)} suffix="USDC" />
              <FeeField label="Máx diario"    value={form.usdcP2pMaxDaily} onChange={v => set('usdcP2pMaxDaily', v)} suffix="USDC" />
            </FeeGroup>

            <FeeGroup title="Límites business">
              <FeeField label="Máx por tx"    value={form.businessUsdcP2pMaxPerTx} onChange={v => set('businessUsdcP2pMaxPerTx', v)} suffix="USDC" />
              <FeeField label="Máx diario"    value={form.businessUsdcP2pMaxDaily} onChange={v => set('businessUsdcP2pMaxDaily', v)} suffix="USDC" />
            </FeeGroup>

            <FeeGroup title="Spreads de conversión — Swap BOB ⇄ USDC">
              <FeeField
                label="Spread compra (BOB→USDC)"
                value={form.convertBuySpreadPct}
                onChange={v => set('convertBuySpreadPct', v)}
                suffix="%"
                placeholder={`def ${cfg?.effectiveConvertBuySpreadPct ?? 2}`}
                help={`Vacío = usar default de entorno (activo: ${cfg?.effectiveConvertBuySpreadPct ?? 2}%)`}
              />
              <FeeField
                label="Spread venta (USDC→BOB)"
                value={form.convertSellSpreadPct}
                onChange={v => set('convertSellSpreadPct', v)}
                suffix="%"
                placeholder={`def ${cfg?.effectiveConvertSellSpreadPct ?? 2}`}
                help={`Vacío = usar default de entorno (activo: ${cfg?.effectiveConvertSellSpreadPct ?? 2}%)`}
              />
            </FeeGroup>

            {error && (
              <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: '#EF44441A', border: '1px solid #EF444433' }}>
                <AlertCircle size={14} className="text-[#F87171] flex-shrink-0" />
                <p className="text-[0.75rem] text-[#F87171]">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              {dirty && !saving && <span className="text-[0.75rem] text-[#F59E0B]">Cambios sin guardar</span>}
              <button onClick={save} disabled={!dirty || saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.875rem] font-bold text-[#0F1628] disabled:opacity-40 transition-all active:scale-[0.98]"
                style={{ background: saved ? '#22C55E' : '#C4CBD8' }}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
                {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar cambios'}
              </button>
            </div>
          </div>

          {/* Revenue acumulada (1 columna) */}
          <div className="rounded-2xl p-5 flex flex-col" style={{ background: '#1A2340', border: '1px solid #263050' }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-xl bg-[#C4CBD81A] border border-[#C4CBD833] flex items-center justify-center">
                <Coins size={13} className="text-[#C4CBD8]" />
              </div>
              <p className="text-[0.875rem] font-bold text-white">Revenue acumulada</p>
            </div>

            <p className="text-[2rem] font-extrabold text-white leading-none">
              {Number(revenue?.revenueAccruedUsdc ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
              <span className="text-[0.875rem] font-bold text-[#8A96B8] ml-1.5">USDC</span>
            </p>

            <div className="mt-5 pt-4 space-y-2.5" style={{ borderTop: '1px solid #263050' }}>
              <div className="flex items-center justify-between">
                <span className="text-[0.75rem] text-[#8A96B8]">Suma ledger de fees</span>
                <span className="text-[0.8125rem] font-semibold text-white">
                  {Number(revenue?.verification?.sumFeeTransactions ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} USDC
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[0.75rem] text-[#8A96B8]">Transacciones de fee</span>
                <span className="text-[0.8125rem] font-semibold text-white">{revenue?.verification?.count ?? 0}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5"
              style={{
                background: matches ? '#22C55E1A' : '#EF44441A',
                border: `1px solid ${matches ? '#22C55E40' : '#EF444433'}`,
              }}>
              {matches
                ? <CheckCircle2 size={15} className="text-[#22C55E] flex-shrink-0" />
                : <AlertCircle size={15} className="text-[#F87171] flex-shrink-0" />}
              <p className="text-[0.75rem] font-semibold" style={{ color: matches ? '#22C55E' : '#F87171' }}>
                {matches ? 'Verificado: config = ledger' : 'Discrepancia entre config y ledger'}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// ── Badge de estado de retiro ──────────────────────────────────────────────────

function WithdrawalStatusBadge({ status }) {
  const map = {
    pending:    { bg: '#C4CBD81A', text: '#C4CBD8', label: 'Pendiente' },
    dispatched: { bg: '#3B82F61A', text: '#60A5FA', label: 'Dispersado' },
    completed:  { bg: '#22C55E1A', text: '#22C55E', label: 'Completado' },
    failed:     { bg: '#EF44441A', text: '#F87171', label: 'Fallido' },
    reversed:   { bg: '#EF44441A', text: '#F87171', label: 'Revertido' },
  }
  const s = map[status] ?? { bg: '#4E5A7A1A', text: '#8A96B8', label: status ?? '—' }
  return (
    <span className="text-[0.625rem] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  )
}

// ── Botón: adjuntar comprobante a un retiro existente ───────────────────────────

function ComprobanteAttachButton({ wtxId, onUploaded }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''   // permite re-seleccionar el mismo archivo
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Máx 5 MB'); return }
    setLoading(true); setError('')
    try {
      await attachWithdrawalComprobante(wtxId, file)
      onUploaded?.()
    } catch (err) {
      setError(err.message ?? 'Error al adjuntar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <label className="flex items-center gap-1.5 text-[0.75rem] font-semibold px-3 py-1.5 rounded-lg cursor-pointer"
      style={{ background: error ? '#EF44441A' : '#C4CBD81A', color: error ? '#F87171' : '#C4CBD8', border: `1px dashed ${error ? '#EF444433' : '#C4CBD833'}` }}
      title="Adjuntar comprobante de la transferencia">
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
      {error || 'Adjuntar comprobante'}
      <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={handleFile} disabled={loading} />
    </label>
  )
}

// ── Sección: Trazabilidad de retiros (soporte) ──────────────────────────────────

/**
 * Buscador de retiros por usuario para que soporte responda de forma óptima.
 * Muestra cada retiro con montos, horas, banco destino, admin que procesó,
 * comprobante y audit trail Stellar.
 */
function WithdrawalTraceSection() {
  const [query, setQuery]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [data, setData]       = useState(null)
  const [viewProof, setViewProof] = useState(null)   // wtxId del comprobante a ver

  async function handleSearch(e) {
    e?.preventDefault()
    const q = query.trim()
    if (!q) return
    setLoading(true); setError(''); setData(null)
    try {
      const res = await traceWithdrawals(q)
      setData(res)
    } catch (err) {
      setError(err.message ?? 'No se pudo obtener la trazabilidad.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        <History size={16} className="text-[#C4CBD8]" />
        <h2 className="text-[1rem] font-bold text-white">Trazabilidad de retiros</h2>
      </div>
      <p className="text-[0.8125rem] text-[#8A96B8] mb-4">
        Busca por email, nombre, alias, userId o wtxId para ver el historial completo de retiros de un usuario.
      </p>

      {/* Buscador */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4E5A7A]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="email, nombre, alias, userId o WTX-…"
            className="w-full bg-[#1A2340] text-white text-[0.9375rem] rounded-xl pl-9 pr-3 py-3 placeholder:text-[#4E5A7A] focus:outline-none"
            style={{ border: '1px solid #263050' }}
            onFocus={e => (e.target.style.borderColor = '#C4CBD8')}
            onBlur={e => (e.target.style.borderColor = '#263050')}
          />
        </div>
        <button type="submit" disabled={loading || !query.trim()}
          className="flex items-center gap-2 font-bold text-[0.9375rem] px-5 rounded-xl transition-colors disabled:opacity-40"
          style={{ background: '#C4CBD8', color: '#0F1628' }}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Buscar
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-4 py-3 mb-4">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {/* Resumen */}
          <div className="flex flex-wrap items-center gap-3 text-[0.8125rem]">
            <span className="text-[#8A96B8]">
              {data.usuarios?.length === 1
                ? <>Usuario: <span className="text-white font-semibold">{data.usuarios[0].nombre}</span> <span className="text-[#4E5A7A]">· {data.usuarios[0].email}</span></>
                : <><span className="text-white font-semibold">{data.usuarios?.length ?? 0}</span> usuarios coincidentes</>}
            </span>
            <span className="px-2.5 py-1 rounded-full" style={{ background: '#C4CBD81A', color: '#C4CBD8' }}>
              {data.resumen?.totalRetiros ?? 0} retiros
            </span>
            <span className="px-2.5 py-1 rounded-full" style={{ background: '#22C55E1A', color: '#22C55E' }}>
              {formatBOB(data.resumen?.totalRetiradoBOB)} retirado
            </span>
          </div>

          {(data.retiros?.length ?? 0) === 0 ? (
            <div className="text-[0.8125rem] text-[#8A96B8] bg-[#1A2340] rounded-xl px-4 py-6 text-center"
              style={{ border: '1px solid #263050' }}>
              Este usuario no tiene retiros registrados.
            </div>
          ) : (
            <div className="space-y-3">
              {data.retiros.map((r) => (
                <div key={r.wtxId} className="bg-[#1A2340] rounded-2xl p-4"
                  style={{ border: '1px solid #263050' }}>

                  {/* Cabecera: monto + estado */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-[1.125rem] font-extrabold text-white leading-none">{formatBOB(r.monto)}</p>
                      <p className="text-[0.6875rem] text-[#4E5A7A] mt-1 font-mono">{r.wtxId}</p>
                    </div>
                    <WithdrawalStatusBadge status={r.estado} />
                  </div>

                  {/* Grid de detalle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[0.8125rem]">
                    {/* Usuario */}
                    <div className="flex items-start gap-2">
                      <User size={13} className="text-[#4E5A7A] mt-0.5 shrink-0" />
                      <span className="text-[#8A96B8]">
                        {r.usuario?.nombre}{r.usuario?.email ? <span className="text-[#4E5A7A]"> · {r.usuario.email}</span> : null}
                      </span>
                    </div>
                    {/* Banco destino */}
                    <div className="flex items-start gap-2">
                      <Landmark size={13} className="text-[#4E5A7A] mt-0.5 shrink-0" />
                      <span className="text-[#8A96B8]">
                        {r.destino?.banco ?? r.destino?.metodo ?? '—'}
                        {r.destino?.numeroCuenta ? <span className="text-[#4E5A7A]"> · {r.destino.numeroCuenta}</span> : null}
                        {r.destino?.titular ? <><br /><span className="text-[#4E5A7A]">{r.destino.titular} · {r.destino.tipoCuenta ?? ''}</span></> : null}
                      </span>
                    </div>
                    {/* Solicitado */}
                    <div className="flex items-start gap-2">
                      <Clock size={13} className="text-[#4E5A7A] mt-0.5 shrink-0" />
                      <span className="text-[#8A96B8]">Solicitado: <span className="text-white">{formatDate(r.tiempos?.solicitado)}</span></span>
                    </div>
                    {/* Confirmado */}
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={13} className="text-[#4E5A7A] mt-0.5 shrink-0" />
                      <span className="text-[#8A96B8]">
                        {r.tiempos?.confirmado
                          ? <>Confirmado: <span className="text-white">{formatDate(r.tiempos.confirmado)}</span></>
                          : <span className="text-[#4E5A7A]">Sin confirmar</span>}
                      </span>
                    </div>
                    {/* Referencia bancaria */}
                    {r.destino?.referenciaBancaria && (
                      <div className="flex items-start gap-2">
                        <FileText size={13} className="text-[#4E5A7A] mt-0.5 shrink-0" />
                        <span className="text-[#8A96B8]">Ref. banco: <span className="text-white">{r.destino.referenciaBancaria}</span></span>
                      </div>
                    )}
                    {/* Procesado por */}
                    {(r.procesadoPor?.confirmadoPor || r.procesadoPor?.dispersadoPor) && (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 size={13} className="text-[#4E5A7A] mt-0.5 shrink-0" />
                        <span className="text-[#8A96B8]">Procesado por: <span className="text-white">{r.procesadoPor.confirmadoPor ?? r.procesadoPor.dispersadoPor}</span></span>
                      </div>
                    )}
                    {/* Rechazo */}
                    {r.destino?.rechazo && (
                      <div className="flex items-start gap-2 sm:col-span-2">
                        <AlertCircle size={13} className="text-[#F87171] mt-0.5 shrink-0" />
                        <span className="text-[#F87171]">{r.destino.rechazo}</span>
                      </div>
                    )}
                  </div>

                  {/* Acciones: comprobante + Stellar */}
                  <div className="flex flex-wrap items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #263050' }}>
                    {r.comprobante?.disponible ? (
                      <button onClick={() => setViewProof(r.wtxId)}
                        className="flex items-center gap-1.5 text-[0.75rem] font-semibold px-3 py-1.5 rounded-lg"
                        style={{ background: '#C4CBD81A', color: '#C4CBD8', border: '1px solid #C4CBD833' }}>
                        <Eye size={13} /> Ver comprobante
                      </button>
                    ) : (
                      <ComprobanteAttachButton wtxId={r.wtxId} onUploaded={() => handleSearch()} />
                    )}
                    {r.stellar?.txId ? (
                      <a href={r.stellar.explorerUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[0.75rem] font-semibold px-3 py-1.5 rounded-lg"
                        style={{ background: '#22C55E1A', color: '#22C55E', border: '1px solid #22C55E33' }}>
                        <ExternalLink size={13} /> Audit trail Stellar
                      </a>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[0.75rem] text-[#4E5A7A] px-3 py-1.5">
                        <AlertCircle size={13} /> Sin audit trail on-chain
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Visor de comprobante de retiro */}
      <ProofViewerModal
        kind="withdrawal"
        wtxId={viewProof}
        open={!!viewProof}
        onClose={() => setViewProof(null)}
      />
    </section>
  )
}

// ── Sección: Historial global de retiros ────────────────────────────────────────

const WITHDRAWAL_STATUSES = [
  { value: '',            label: 'Todos los estados' },
  { value: 'pending',     label: 'Pendiente'  },
  { value: 'dispatched',  label: 'Dispersado' },
  { value: 'completed',   label: 'Completado' },
  { value: 'failed',      label: 'Fallido'    },
  { value: 'reversed',    label: 'Revertido'  },
]

/** Formatea un monto según su moneda (BOB con Bs., USDC con sufijo). */
function formatWithdrawalAmount(amount, currency) {
  if (currency === 'USDC') {
    const n = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount ?? 0)
    return `${n} USDC`
  }
  return formatBOB(amount)
}

/**
 * Listado global y paginado de TODOS los retiros (cualquier estado), con filtros
 * por estado, moneda y rango de fechas. Para auditoría y seguimiento operativo.
 */
function AllWithdrawalsSection() {
  const [filters, setFilters] = useState({ status: '', currency: '', from: '', to: '' })
  const [page, setPage]       = useState(1)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [viewProof, setViewProof] = useState(null)
  const limit = 25

  const load = useCallback(async (opts) => {
    setLoading(true); setError('')
    try {
      const res = await listAllWithdrawals({ ...opts, limit })
      setData(res)
    } catch (err) {
      setError(err.message ?? 'No se pudo obtener el historial de retiros.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Carga inicial + recarga al cambiar de página.
  useEffect(() => {
    load({ ...filters, page })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  function applyFilters(e) {
    e?.preventDefault()
    if (page === 1) load({ ...filters, page: 1 })
    else setPage(1)   // el efecto recarga
  }

  function updateFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const totalPages = data?.totalPages ?? 1

  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        <ArrowUpRight size={16} className="text-[#C4CBD8]" />
        <h2 className="text-[1rem] font-bold text-white">Historial de retiros</h2>
        {data?.total != null && (
          <span className="text-[0.75rem] font-semibold px-2.5 py-0.5 rounded-full"
            style={{ background: '#C4CBD81A', color: '#C4CBD8' }}>
            {data.total} total
          </span>
        )}
      </div>
      <p className="text-[0.8125rem] text-[#8A96B8] mb-4">
        Todos los retiros de todos los usuarios, en cualquier estado. Filtra por estado, moneda o fecha.
      </p>

      {/* Filtros */}
      <form onSubmit={applyFilters} className="flex flex-wrap items-end gap-2 mb-4">
        <div className="flex flex-col gap-1">
          <label className="text-[0.6875rem] text-[#8A96B8] uppercase tracking-wide">Estado</label>
          <select value={filters.status} onChange={e => updateFilter('status', e.target.value)}
            className="bg-[#1A2340] text-white text-[0.875rem] rounded-xl px-3 py-2.5 focus:outline-none"
            style={{ border: '1px solid #263050' }}>
            {WITHDRAWAL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[0.6875rem] text-[#8A96B8] uppercase tracking-wide">Moneda</label>
          <select value={filters.currency} onChange={e => updateFilter('currency', e.target.value)}
            className="bg-[#1A2340] text-white text-[0.875rem] rounded-xl px-3 py-2.5 focus:outline-none"
            style={{ border: '1px solid #263050' }}>
            <option value="">Todas</option>
            <option value="BOB">BOB</option>
            <option value="USDC">USDC</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[0.6875rem] text-[#8A96B8] uppercase tracking-wide">Desde</label>
          <input type="date" value={filters.from} onChange={e => updateFilter('from', e.target.value)}
            className="bg-[#1A2340] text-white text-[0.875rem] rounded-xl px-3 py-2.5 focus:outline-none"
            style={{ border: '1px solid #263050' }} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[0.6875rem] text-[#8A96B8] uppercase tracking-wide">Hasta</label>
          <input type="date" value={filters.to} onChange={e => updateFilter('to', e.target.value)}
            className="bg-[#1A2340] text-white text-[0.875rem] rounded-xl px-3 py-2.5 focus:outline-none"
            style={{ border: '1px solid #263050' }} />
        </div>
        <button type="submit" disabled={loading}
          className="flex items-center gap-2 font-bold text-[0.875rem] px-5 py-2.5 rounded-xl transition-colors disabled:opacity-40"
          style={{ background: '#C4CBD8', color: '#0F1628' }}>
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          Filtrar
        </button>
      </form>

      {error && (
        <div className="flex items-center gap-2 text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-4 py-3 mb-4">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Lista */}
      {(data?.withdrawals?.length ?? 0) === 0 && !loading ? (
        <div className="text-[0.8125rem] text-[#8A96B8] bg-[#1A2340] rounded-xl px-4 py-6 text-center"
          style={{ border: '1px solid #263050' }}>
          No hay retiros para los filtros seleccionados.
        </div>
      ) : (
        <div className="space-y-3">
          {data?.withdrawals?.map((w) => {
            const u = w.userId
            const m = w.metadata ?? {}
            return (
              <div key={w._id} className="bg-[#1A2340] rounded-2xl p-4" style={{ border: '1px solid #263050' }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-[1.0625rem] font-extrabold text-white leading-none">
                      {formatWithdrawalAmount(w.amount, w.currency)}
                    </p>
                    <p className="text-[0.6875rem] text-[#4E5A7A] mt-1 font-mono">{w.wtxId}</p>
                  </div>
                  <WithdrawalStatusBadge status={w.status} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[0.8125rem]">
                  <div className="flex items-start gap-2">
                    <User size={13} className="text-[#4E5A7A] mt-0.5 shrink-0" />
                    <span className="text-[#8A96B8]">
                      {u ? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email : '—'}
                      {u?.email ? <span className="text-[#4E5A7A]"> · {u.email}</span> : null}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Landmark size={13} className="text-[#4E5A7A] mt-0.5 shrink-0" />
                    <span className="text-[#8A96B8]">
                      {m.bankName ?? m.method ?? '—'}
                      {m.accountNumber ? <span className="text-[#4E5A7A]"> · {m.accountNumber}</span> : null}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock size={13} className="text-[#4E5A7A] mt-0.5 shrink-0" />
                    <span className="text-[#8A96B8]">Solicitado: <span className="text-white">{formatDate(w.createdAt)}</span></span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 size={13} className="text-[#4E5A7A] mt-0.5 shrink-0" />
                    <span className="text-[#8A96B8]">
                      {w.confirmedAt
                        ? <>Confirmado: <span className="text-white">{formatDate(w.confirmedAt)}</span></>
                        : <span className="text-[#4E5A7A]">Sin confirmar</span>}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3" style={{ borderTop: '1px solid #263050' }}>
                  {w.comprobanteDisponible && (
                    <button onClick={() => setViewProof(w.wtxId)}
                      className="flex items-center gap-1.5 text-[0.75rem] font-semibold px-3 py-1.5 rounded-lg"
                      style={{ background: '#C4CBD81A', color: '#C4CBD8', border: '1px solid #C4CBD833' }}>
                      <Eye size={13} /> Ver comprobante
                    </button>
                  )}
                  {w.stellarTxId && w.stellarExplorerUrl && (
                    <a href={w.stellarExplorerUrl}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[0.75rem] font-semibold px-3 py-1.5 rounded-lg"
                      style={{ background: '#22C55E1A', color: '#22C55E', border: '1px solid #22C55E33' }}>
                      <ExternalLink size={13} /> Audit trail Stellar
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading}
            className="text-[0.8125rem] font-semibold px-3 py-1.5 rounded-lg disabled:opacity-40"
            style={{ background: '#1A2340', color: '#C4CBD8', border: '1px solid #263050' }}>
            Anterior
          </button>
          <span className="text-[0.8125rem] text-[#8A96B8]">Página {page} de {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}
            className="text-[0.8125rem] font-semibold px-3 py-1.5 rounded-lg disabled:opacity-40"
            style={{ background: '#1A2340', color: '#C4CBD8', border: '1px solid #263050' }}>
            Siguiente
          </button>
        </div>
      )}

      <ProofViewerModal kind="withdrawal" wtxId={viewProof} open={!!viewProof} onClose={() => setViewProof(null)} />
    </section>
  )
}

export default function WalletAdminPage() {
  const [deposits, setDeposits]         = useState([])
  const [withdrawals, setWithdrawals]   = useState([])
  const [conversions, setConversions]   = useState([])
  const [bobConversions, setBobConversions] = useState([])   // USDC→BOB pendientes
  const [wallets, setWallets]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  const [confirmDeposit, setConfirmDeposit]         = useState(null)
  const [viewProof, setViewProof]                   = useState(null)
  const [confirmWithdrawal, setConfirmWithdrawal]   = useState(null)
  const [rejectWithdrawal, setRejectWithdrawal]     = useState(null)
  const [dispatchWithdrawal, setDispatchWithdrawal] = useState(null)
  const [simulatingId, setSimulatingId]             = useState(null)
  const [confirmConv, setConfirmConv]               = useState(null)
  const [rejectConv, setRejectConv]                 = useState(null)
  const [confirmBobConv, setConfirmBobConv]         = useState(null)   // USDC→BOB
  const [rejectBobConv, setRejectBobConv]           = useState(null)   // USDC→BOB
  const [freezeWallet, setFreezeWallet]             = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [dep, wdr, conv, bobConv, wal] = await Promise.all([
        request('/admin/wallet/deposits/pending'),
        request('/admin/wallet/withdrawals/pending'),
        listPendingConversions(),
        listPendingUSDCtoBOB(),
        request(`/admin/wallet${statusFilter ? `?status=${statusFilter}` : ''}`),
      ])
      setDeposits(dep.deposits ?? [])
      setWithdrawals(wdr.withdrawals ?? [])
      setConversions(conv.conversions ?? [])
      setBobConversions(bobConv.conversions ?? [])
      setWallets(wal.wallets ?? [])
    } catch {
      // silencioso
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Simula la confirmación del banco (notifyStatus) para retiros 'dispatched' en staging.
  async function handleSimulateSettle(wdr, accepted) {
    setSimulatingId(wdr.wtxId)
    try {
      await request('/admin/wallet/withdrawal/simulate-settle', {
        method: 'POST',
        body: JSON.stringify({ wtxId: wdr.wtxId, accepted }),
      })
      fetchAll()
    } catch (err) {
      alert(err.message ?? 'Error al simular la confirmación.')
    } finally {
      setSimulatingId(null)
    }
  }

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
            {deposits.map(dep => {
              const u            = depUser(dep)
              const hasProof     = dep.comprobante?.present ?? !!dep.metadata?.paymentProof
              return (
                <div key={dep._id ?? dep.wtxId}
                  className="flex items-center gap-4 px-5 py-4 rounded-2xl"
                  style={{ background: '#1A2340', border: '1px solid #263050' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="text-[0.9375rem] font-bold text-white">{u.name}</p>
                      <span className="text-[0.625rem] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: '#C4CBD81A', color: '#C4CBD8' }}>
                        {u.kycStatus ?? '—'}{u.documentType ? ` · ${u.documentType}` : ''}
                      </span>
                      <span className="text-[0.625rem] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: '#233E581A', color: '#8AA6C8' }}>
                        {dep.method === 'bankQr' ? 'QR bancario' : 'Manual'}
                      </span>
                    </div>
                    <p className="text-[0.75rem] text-[#8A96B8]">{u.email ?? '—'}</p>
                    {u.phone && (
                      <p className="text-[0.6875rem] text-[#8A96B8] flex items-center gap-1">
                        <Phone size={10} /> {u.phone}
                      </p>
                    )}
                    <p className="text-[0.6875rem] text-[#4E5A7A] mt-0.5 font-mono">Ref: {dep.reference ?? dep.wtxId}</p>
                    <p className="text-[0.6875rem] text-[#4E5A7A]">{formatDate(dep.createdAt)}</p>
                  </div>
                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                    <p className="text-[1.0625rem] font-bold text-[#22C55E]">{formatBOB(dep.amount)}</p>
                    {hasProof && (
                      <button
                        onClick={() => setViewProof(dep.wtxId)}
                        className="text-[0.6875rem] font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                        style={{ border: '1px solid #263050', color: '#C4CBD8' }}>
                        <Eye size={12} /> Comprobante
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmDeposit(dep)}
                      className="text-[0.75rem] font-bold px-3 py-1.5 rounded-xl text-[#0F1628]"
                      style={{ background: '#22C55E' }}>
                      Confirmar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── SECCIÓN 2: Retiros pendientes ──────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[1rem] font-bold text-white flex items-center gap-2">
            <ArrowUpRight size={16} className="text-[#F59E0B]" />
            Retiros pendientes
          </h2>
          {withdrawals.length > 0 && (
            <span className="text-[0.6875rem] font-bold px-2 py-0.5 rounded-full"
              style={{ background: '#F59E0B1A', color: '#F59E0B', border: '1px solid #F59E0B33' }}>
              {withdrawals.length}
            </span>
          )}
        </div>

        {withdrawals.length === 0 ? (
          <div className="bg-[#1A2340] rounded-2xl p-8 text-center" style={{ border: '1px solid #263050' }}>
            <CheckCircle2 size={28} className="mx-auto text-[#22C55E] mb-2" />
            <p className="text-[0.875rem] font-semibold text-[#8A96B8]">Sin retiros pendientes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {withdrawals.map(wdr => {
              const { bankName, accountNumber, accountHolder, accountType, bankQrImage } = wdr.metadata ?? {}
              return (
                <div key={wdr._id ?? wdr.wtxId}
                  className="flex items-start gap-4 px-5 py-4 rounded-2xl"
                  style={{ background: '#1A2340', border: '1px solid #263050' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[0.9375rem] font-bold text-white">
                        {wdr.userId?.firstName} {wdr.userId?.lastName}
                      </p>
                    </div>
                    <p className="text-[0.75rem] text-[#8A96B8]">{wdr.userId?.email}</p>
                    {bankName && (
                      <p className="text-[0.6875rem] text-[#4E5A7A] mt-1">
                        {bankName} · {accountHolder} · {accountNumber}
                        {accountType && ` (${accountType})`}
                      </p>
                    )}
                    {bankQrImage && (
                      <div className="flex items-center gap-1 mt-1">
                        <QrCode size={12} className="text-[#C4CBD8]" />
                        <span className="text-[0.6875rem] text-[#C4CBD8]">QR bancario adjunto</span>
                      </div>
                    )}
                    <p className="text-[0.6875rem] text-[#4E5A7A] font-mono mt-0.5">Ref: {wdr.wtxId}</p>
                    <p className="text-[0.6875rem] text-[#4E5A7A]">{formatDate(wdr.createdAt)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[1.0625rem] font-bold text-[#F59E0B] mb-2">{formatBOB(wdr.amount)}</p>
                    {wdr.status === 'dispatched' ? (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[0.6875rem] font-bold px-2 py-1 rounded-full"
                          style={{ background: '#3B82F61A', color: '#60A5FA', border: '1px solid #3B82F633' }}>
                          Dispersado · esperando banco
                        </span>
                        <button
                          onClick={() => handleSimulateSettle(wdr, true)} disabled={simulatingId === wdr.wtxId}
                          className="text-[0.75rem] font-bold px-3 py-1.5 rounded-xl text-[#0F1628] disabled:opacity-40"
                          style={{ background: '#22C55E' }}>
                          {simulatingId === wdr.wtxId ? '…' : 'Simular ACEP (sandbox)'}
                        </button>
                        <button
                          onClick={() => handleSimulateSettle(wdr, false)} disabled={simulatingId === wdr.wtxId}
                          className="text-[0.75rem] font-bold px-3 py-1.5 rounded-xl disabled:opacity-40"
                          style={{ background: '#EF44441A', color: '#F87171', border: '1px solid #EF444433' }}>
                          Simular RECH (sandbox)
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {wdr.metadata?.method === 'bank' && (
                          <button
                            onClick={() => setDispatchWithdrawal(wdr)}
                            className="text-[0.75rem] font-bold px-3 py-1.5 rounded-xl text-white"
                            style={{ background: '#3B82F6' }}>
                            Dispersar (BANECO)
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmWithdrawal(wdr)}
                          className="text-[0.75rem] font-bold px-3 py-1.5 rounded-xl text-[#0F1628]"
                          style={{ background: '#22C55E' }}>
                          Confirmar manual
                        </button>
                        <button
                          onClick={() => setRejectWithdrawal(wdr)}
                          className="text-[0.75rem] font-bold px-3 py-1.5 rounded-xl"
                          style={{ background: '#EF44441A', color: '#F87171', border: '1px solid #EF444433' }}>
                          Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── SECCIÓN 3: Conversiones BOB→USDC pendientes ─────────────────── */}
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

      {/* ── SECCIÓN 4: Conversiones USDC→BOB pendientes ─────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[1rem] font-bold text-white flex items-center gap-2">
            <ArrowRightLeft size={16} className="text-[#C4CBD8]" />
            Conversiones USDC→BOB
          </h2>
          {bobConversions.length > 0 && (
            <span className="text-[0.6875rem] font-bold px-2 py-0.5 rounded-full"
              style={{ background: '#F59E0B1A', color: '#F59E0B', border: '1px solid #F59E0B33' }}>
              {bobConversions.length}
            </span>
          )}
        </div>

        {bobConversions.length === 0 ? (
          <div className="bg-[#1A2340] rounded-2xl p-8 text-center" style={{ border: '1px solid #263050' }}>
            <CheckCircle2 size={28} className="mx-auto text-[#22C55E] mb-2" />
            <p className="text-[0.875rem] font-semibold text-[#8A96B8]">Sin conversiones pendientes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bobConversions.map(conv => {
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
                      {Number(usdcAmount ?? 0).toFixed(6)} USDC → {formatBOB(bobAmount)}
                      <span className="text-[#4E5A7A] ml-1">(1 USDC = {Number(bobPerUsdc ?? 0).toFixed(2)} BOB)</span>
                    </p>
                    <p className="text-[0.6875rem] text-[#4E5A7A] font-mono">Ref: {conv.wtxId}</p>
                    <p className="text-[0.6875rem] text-[#4E5A7A]">{formatDate(conv.createdAt)}</p>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1.5">
                    <button
                      onClick={() => setConfirmBobConv(conv)}
                      className="block w-full text-[0.75rem] font-bold px-3 py-1.5 rounded-xl text-[#0F1628]"
                      style={{ background: '#22C55E' }}>
                      Aprobar
                    </button>
                    <button
                      onClick={() => setRejectBobConv(conv)}
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

      {/* ── SECCIÓN 5: Comisiones P2P USDC ──────────────────────────────── */}
      <WalletFeesPanel />

      {/* ── SECCIÓN 6: Historial global de retiros ──────────────────────── */}
      <AllWithdrawalsSection />

      {/* ── SECCIÓN 7: Trazabilidad de retiros (soporte) ────────────────── */}
      <WithdrawalTraceSection />

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <ConfirmDepositModal
        deposit={confirmDeposit}
        open={!!confirmDeposit}
        onClose={() => setConfirmDeposit(null)}
        onSuccess={fetchAll}
      />
      <ProofViewerModal
        wtxId={viewProof}
        open={!!viewProof}
        onClose={() => setViewProof(null)}
      />
      <ConfirmWithdrawalModal
        withdrawal={confirmWithdrawal}
        open={!!confirmWithdrawal}
        onClose={() => setConfirmWithdrawal(null)}
        onSuccess={fetchAll}
      />
      <RejectWithdrawalModal
        withdrawal={rejectWithdrawal}
        open={!!rejectWithdrawal}
        onClose={() => setRejectWithdrawal(null)}
        onSuccess={fetchAll}
      />
      <DispatchWithdrawalModal
        withdrawal={dispatchWithdrawal}
        open={!!dispatchWithdrawal}
        onClose={() => setDispatchWithdrawal(null)}
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
      <ConfirmConversionModal
        kind="usdc_to_bob"
        conversion={confirmBobConv}
        open={!!confirmBobConv}
        onClose={() => setConfirmBobConv(null)}
        onSuccess={fetchAll}
      />
      <RejectConversionModal
        kind="usdc_to_bob"
        conversion={rejectBobConv}
        open={!!rejectBobConv}
        onClose={() => setRejectBobConv(null)}
        onSuccess={fetchAll}
      />
    </div>
  )
}
