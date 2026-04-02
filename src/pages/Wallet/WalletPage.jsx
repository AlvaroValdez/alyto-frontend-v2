/**
 * WalletPage.jsx — Wallet con Saldo BOB (Fase 25)
 *
 * Exclusiva para usuarios legalEntity === 'SRL' (Bolivia).
 * No visible ni accesible para SpA (Chile) ni LLC (Delaware).
 *
 * Secciones:
 *  1. Card de saldo BOB con status badge
 *  2. Botones de acción: Cargar / Enviar / Retirar
 *  3. Modal "Cargar saldo" — instrucciones bancarias
 *  4. Modal "Enviar" — envío P2P a otro usuario SRL
 *  5. Modal "Retirar" — solicitud de retiro a cuenta bancaria
 *  6. Historial de movimientos paginado
 */

import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Wallet, ArrowDownToLine, ArrowUpRight,
  ArrowRightLeft, AlertCircle, CheckCircle2, Clock,
  ChevronLeft, ChevronRight, X, Loader2, Copy, CheckCheck, QrCode,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { request } from '../../services/api'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatBOB(amount) {
  if (amount == null) return 'Bs. 0,00'
  return `Bs. ${new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`
}

function formatDate(d) {
  if (!d) return ''
  const date = new Date(d)
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date)
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    active:    { bg: '#22C55E1A', text: '#22C55E', label: 'Activa' },
    frozen:    { bg: '#EF44441A', text: '#F87171', label: 'Congelada' },
    suspended: { bg: '#F1F5F9',   text: '#64748B', label: 'Suspendida' },
  }
  const s = map[status] ?? map.active
  return (
    <span
      className="text-[0.6875rem] font-semibold px-2.5 py-1 rounded-full"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  )
}

// ── Transaction Type Icon ─────────────────────────────────────────────────────

function TxIcon({ type }) {
  const map = {
    deposit:   { icon: ArrowDownToLine, color: '#22C55E', bg: '#22C55E1A' },
    withdrawal:{ icon: ArrowUpRight,    color: '#F87171', bg: '#EF44441A' },
    send:      { icon: ArrowUpRight,    color: '#F87171', bg: '#EF44441A' },
    receive:   { icon: ArrowDownToLine, color: '#22C55E', bg: '#22C55E1A' },
    freeze:    { icon: AlertCircle,     color: '#8A96B8', bg: '#C4CBD81A' },
    unfreeze:  { icon: CheckCircle2,    color: '#22C55E', bg: '#22C55E1A' },
    fee:       { icon: ArrowRightLeft,  color: '#8A96B8', bg: '#C4CBD81A' },
  }
  const m = map[type] ?? map.receive
  const Icon = m.icon
  return (
    <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
      style={{ background: m.bg }}>
      <Icon size={16} style={{ color: m.color }} />
    </div>
  )
}

function TxStatusBadge({ status }) {
  const map = {
    pending:   { bg: '#64748B1A', text: '#64748B', label: 'Pendiente' },
    completed: { bg: '#22C55E1A', text: '#22C55E', label: 'Completado' },
    failed:    { bg: '#EF44441A', text: '#F87171', label: 'Fallido' },
    reversed:  { bg: '#64748B1A', text: '#64748B', label: 'Revertido' },
  }
  const s = map[status] ?? map.pending
  return (
    <span className="text-[0.625rem] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  )
}

// ── Modal base ─────────────────────────────────────────────────────────────────

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: '#0F162899' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-[430px] bg-white rounded-t-3xl px-6 pt-5 pb-8"
        style={{ border: '1px solid #E2E8F0', borderBottom: 'none' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[1rem] font-bold text-[#0F172A]">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center">
            <X size={16} className="text-[#64748B]" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}

// ── Modal Cargar Saldo ────────────────────────────────────────────────────────

function DepositModal({ open, onClose, onSuccess }) {
  const [amount, setAmount]   = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState('')
  const [copied, setCopied]   = useState(false)

  function handleClose() {
    setAmount(''); setResult(null); setError(''); setCopied(false)
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const n = Number(amount)
    if (!n || n < 50) return setError('El monto mínimo es Bs. 50.')
    if (n > 10000)    return setError('El monto máximo por depósito es Bs. 10.000.')
    setLoading(true)
    try {
      const data = await request('/wallet/deposit/initiate', {
        method: 'POST',
        body: JSON.stringify({ amount: n }),
      })
      setResult(data)
    } catch (err) {
      setError(err.message ?? 'Error al iniciar el depósito.')
    } finally {
      setLoading(false)
    }
  }

  function copyReference() {
    navigator.clipboard.writeText(result?.reference ?? '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal open={open} onClose={handleClose} title="Cargar saldo BOB">
      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[0.75rem] font-medium text-[#64748B] mb-1.5">Monto a depositar (BOB)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] font-semibold text-sm">Bs.</span>
              <input
                type="number"
                min={50}
                max={10000}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="100"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-3.5 text-[#0F172A] text-[0.9375rem] focus:border-[#233E58] focus:outline-none"
              />
            </div>
            <p className="text-[0.6875rem] text-[#94A3B8] mt-1">Mínimo Bs. 50 — Máximo Bs. 10.000</p>
          </div>
          {error && (
            <p className="text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-4 py-3">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !amount}
            className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white disabled:opacity-40"
            style={{ background: '#233E58' }}
          >
            {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Generar instrucciones'}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0] space-y-3">
            <div className="flex justify-between">
              <span className="text-[0.75rem] text-[#64748B]">Monto a transferir</span>
              <span className="text-[0.875rem] font-bold text-[#0F172A]">{formatBOB(result.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[0.75rem] text-[#64748B]">Banco</span>
              <span className="text-[0.875rem] font-semibold text-[#0F172A]">{result.bankName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[0.75rem] text-[#64748B]">Titular</span>
              <span className="text-[0.875rem] font-semibold text-[#0F172A]">{result.accountHolder}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[0.75rem] text-[#64748B]">N° de cuenta</span>
              <span className="text-[0.875rem] font-mono font-semibold text-[#0F172A]">{result.accountNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[0.75rem] text-[#64748B]">Tipo</span>
              <span className="text-[0.875rem] font-semibold text-[#0F172A]">{result.accountType}</span>
            </div>
            <div className="pt-2 border-t border-[#E2E8F0]">
              <p className="text-[0.6875rem] font-medium text-[#64748B] mb-1">Referencia (incluir en el concepto)</p>
              <div className="flex items-center gap-2">
                <span className="flex-1 text-[0.8125rem] font-mono font-bold text-[#233E58] truncate">{result.reference}</span>
                <button onClick={copyReference}
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: '#233E581A', border: '1px solid #233E5833' }}>
                  {copied ? <CheckCheck size={14} className="text-[#22C55E]" /> : <Copy size={14} className="text-[#233E58]" />}
                </button>
              </div>
            </div>
          </div>
          <p className="text-[0.75rem] text-[#64748B] text-center px-2">
            Tu saldo será acreditado en <span className="text-[#0F172A] font-semibold">2-4 horas hábiles</span> tras verificación del equipo Alyto.
          </p>
          <button
            onClick={() => { handleClose(); onSuccess?.() }}
            className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white"
            style={{ background: '#233E58' }}
          >
            Ya realicé la transferencia
          </button>
        </div>
      )}
    </Modal>
  )
}

// ── Modal Enviar ──────────────────────────────────────────────────────────────

function SendModal({ open, onClose, onSuccess, balanceAvailable }) {
  const [email, setEmail]     = useState('')
  const [amount, setAmount]   = useState('')
  const [description, setDescription] = useState('')
  const [step, setStep]       = useState(1)  // 1: form, 2: confirm
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [done, setDone]       = useState(false)

  function handleClose() {
    setEmail(''); setAmount(''); setDescription(''); setStep(1)
    setError(''); setDone(false)
    onClose()
  }

  function handleContinue(e) {
    e.preventDefault()
    setError('')
    if (!email) return setError('Ingresa el email del destinatario.')
    if (!amount || Number(amount) < 1) return setError('El monto mínimo es Bs. 1.')
    if (Number(amount) > balanceAvailable) return setError(`Saldo insuficiente. Disponible: ${formatBOB(balanceAvailable)}.`)
    setStep(2)
  }

  async function handleConfirm() {
    setLoading(true); setError('')
    try {
      await request('/wallet/send', {
        method: 'POST',
        body: JSON.stringify({ recipientEmail: email, amount: Number(amount), description }),
      })
      setDone(true)
      onSuccess?.()
    } catch (err) {
      setError(err.message ?? 'Error al procesar el envío.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Enviar BOB">
      {done ? (
        <div className="text-center py-4 space-y-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: '#22C55E1A' }}>
            <CheckCircle2 size={32} className="text-[#22C55E]" />
          </div>
          <div>
            <p className="text-[#0F172A] font-bold text-[1rem]">Envío completado</p>
            <p className="text-[#64748B] text-[0.875rem] mt-1">{formatBOB(Number(amount))} enviados a <span className="text-[#0F172A]">{email}</span></p>
          </div>
          <button onClick={handleClose} className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white" style={{ background: '#233E58' }}>
            Cerrar
          </button>
        </div>
      ) : step === 1 ? (
        <form onSubmit={handleContinue} className="space-y-4">
          <div>
            <label className="block text-[0.75rem] font-medium text-[#64748B] mb-1.5">Email del destinatario</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="usuario@email.com"
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3.5 text-[#0F172A] text-[0.9375rem] focus:border-[#233E58] focus:outline-none"
            />
            <p className="text-[0.6875rem] text-[#94A3B8] mt-1">Solo usuarios Bolivia (SRL) registrados en Alyto.</p>
          </div>
          <div>
            <label className="block text-[0.75rem] font-medium text-[#64748B] mb-1.5">Monto (BOB)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] font-semibold text-sm">Bs.</span>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-3.5 text-[#0F172A] text-[0.9375rem] focus:border-[#233E58] focus:outline-none"
              />
            </div>
            <p className="text-[0.6875rem] text-[#94A3B8] mt-1">Disponible: {formatBOB(balanceAvailable)}</p>
          </div>
          <div>
            <label className="block text-[0.75rem] font-medium text-[#64748B] mb-1.5">Descripción (opcional)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={100}
              placeholder="Ej. Pago alquiler"
              className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3.5 text-[#0F172A] text-[0.9375rem] focus:border-[#233E58] focus:outline-none"
            />
          </div>
          {error && <p className="text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-4 py-3">{error}</p>}
          <button type="submit" className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white" style={{ background: '#233E58' }}>
            Continuar
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0] space-y-3">
            <div className="flex justify-between">
              <span className="text-[0.75rem] text-[#64748B]">Para</span>
              <span className="text-[0.875rem] font-semibold text-[#0F172A]">{email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[0.75rem] text-[#64748B]">Monto</span>
              <span className="text-[0.875rem] font-bold text-[#233E58]">{formatBOB(Number(amount))}</span>
            </div>
            {description && (
              <div className="flex justify-between">
                <span className="text-[0.75rem] text-[#64748B]">Descripción</span>
                <span className="text-[0.875rem] text-[#0F172A]">{description}</span>
              </div>
            )}
          </div>
          {error && <p className="text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-4 py-3">{error}</p>}
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-2xl font-semibold text-[0.9375rem] text-[#64748B]" style={{ border: '1.5px solid #E2E8F0' }}>
              Volver
            </button>
            <button onClick={handleConfirm} disabled={loading} className="flex-1 py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white disabled:opacity-40" style={{ background: '#233E58' }}>
              {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Confirmar envío'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Modal Retirar ─────────────────────────────────────────────────────────────

function WithdrawModal({ open, onClose, onSuccess, balanceAvailable }) {
  const [form, setForm] = useState({
    amount: '', bankName: '', accountNumber: '', accountHolder: '', accountType: 'Caja de ahorros',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [done, setDone]       = useState(false)

  function handleClose() {
    setForm({ amount: '', bankName: '', accountNumber: '', accountHolder: '', accountType: 'Caja de ahorros' })
    setError(''); setDone(false); onClose()
  }

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  async function handleSubmit(e) {
    e.preventDefault(); setError('')
    const n = Number(form.amount)
    if (n < 100) return setError('El monto mínimo de retiro es Bs. 100.')
    if (n > balanceAvailable) return setError(`Saldo insuficiente. Disponible: ${formatBOB(balanceAvailable)}.`)
    if (!form.bankName || !form.accountNumber || !form.accountHolder) return setError('Completa todos los datos bancarios.')
    setLoading(true)
    try {
      await request('/wallet/withdraw/request', {
        method: 'POST',
        body: JSON.stringify({ ...form, amount: n }),
      })
      setDone(true); onSuccess?.()
    } catch (err) {
      setError(err.message ?? 'Error al solicitar el retiro.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Solicitar retiro">
      {done ? (
        <div className="text-center py-4 space-y-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ background: '#22C55E1A' }}>
            <CheckCircle2 size={32} className="text-[#22C55E]" />
          </div>
          <div>
            <p className="text-[#0F172A] font-bold text-[1rem]">Solicitud enviada</p>
            <p className="text-[#64748B] text-[0.875rem] mt-1">AV Finance SRL procesará tu retiro en <span className="text-[#0F172A]">1-2 días hábiles</span>.</p>
          </div>
          <button onClick={handleClose} className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white" style={{ background: '#233E58' }}>
            Cerrar
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[0.75rem] font-medium text-[#64748B] mb-1.5">Monto a retirar (BOB)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] font-semibold text-sm">Bs.</span>
              <input type="number" min={100} value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="100"
                className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-3.5 text-[#0F172A] text-[0.9375rem] focus:border-[#233E58] focus:outline-none" />
            </div>
            <p className="text-[0.6875rem] text-[#94A3B8] mt-1">Mínimo Bs. 100. Disponible: {formatBOB(balanceAvailable)}</p>
          </div>

          <div className="space-y-3 bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0]">
            <p className="text-[0.75rem] font-semibold text-[#64748B] uppercase tracking-wider">Datos bancarios de destino</p>
            {[
              { key: 'bankName', label: 'Banco', placeholder: 'Ej. Banco Bisa' },
              { key: 'accountHolder', label: 'Titular de la cuenta', placeholder: 'Nombre completo' },
              { key: 'accountNumber', label: 'Número de cuenta', placeholder: '0000000000' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[0.6875rem] font-medium text-[#64748B] mb-1">{f.label}</label>
                <input type="text" value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder}
                  className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0F172A] text-[0.875rem] focus:border-[#233E58] focus:outline-none" />
              </div>
            ))}
            <div>
              <label className="block text-[0.6875rem] font-medium text-[#64748B] mb-1">Tipo de cuenta</label>
              <select value={form.accountType} onChange={e => set('accountType', e.target.value)}
                className="w-full bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0F172A] text-[0.875rem] focus:border-[#233E58] focus:outline-none">
                <option>Caja de ahorros</option>
                <option>Cuenta corriente</option>
              </select>
            </div>
          </div>

          {error && <p className="text-[0.8125rem] text-[#F87171] bg-[#EF44441A] rounded-xl px-4 py-3">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3.5 rounded-2xl font-bold text-[0.9375rem] text-white disabled:opacity-40" style={{ background: '#233E58' }}>
            {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'Solicitar retiro'}
          </button>
        </form>
      )}
    </Modal>
  )
}

// ── Main WalletPage ───────────────────────────────────────────────────────────

export default function WalletPage() {
  const navigate          = useNavigate()
  const { user }          = useAuth()

  const [wallet, setWallet]     = useState(null)
  const [txs, setTxs]           = useState([])
  const [txPage, setTxPage]     = useState(1)
  const [txTotal, setTxTotal]   = useState(0)
  const [loading, setLoading]   = useState(true)
  const [txLoading, setTxLoading] = useState(false)

  const [showDeposit, setShowDeposit]   = useState(false)
  const [showSend, setShowSend]         = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)

  // Guard — solo SRL
  useEffect(() => {
    if (user && user.legalEntity !== 'SRL') {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  const fetchWallet = useCallback(async () => {
    try {
      const data = await request('/wallet/balance')
      setWallet(data)
    } catch {
      // silencioso
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchTxs = useCallback(async (page = 1) => {
    setTxLoading(true)
    try {
      const data = await request(`/wallet/transactions?page=${page}&limit=10`)
      setTxs(data.transactions ?? [])
      setTxTotal(data.pagination?.total ?? 0)
    } catch {
      // silencioso
    } finally {
      setTxLoading(false)
    }
  }, [])

  useEffect(() => { fetchWallet() }, [fetchWallet])
  useEffect(() => { fetchTxs(txPage) }, [fetchTxs, txPage])

  function handleRefresh() {
    fetchWallet(); fetchTxs(txPage)
  }

  const txPages = Math.ceil(txTotal / 10)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-[#233E58]" />
      </div>
    )
  }

  const balanceAvailable = wallet ? Math.max(0, (wallet.balance ?? 0) - (wallet.balanceReserved ?? 0)) : 0

  return (
    <div className="pt-4">

        {/* Page title */}
        <div className="flex items-center gap-2 px-5 pb-4">
          <h1 className="text-[1.0625rem] font-bold text-[#0F172A]">Mi Wallet BOB</h1>
          <span className="text-[0.625rem] font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#22C55E1A', color: '#22C55E', border: '1px solid #22C55E33' }}>
            SRL Bolivia
          </span>
        </div>

        {/* ── Saldo card ──────────────────────────────────────────────── */}
        <div className="mx-4 mb-5 rounded-3xl p-6 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #2D5F82 0%, #233E58 55%, #1A2F44 100%)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.18), 0 0 60px rgba(35,62,88,0.25)',
          }}>
          {/* Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, #233E5818 0%, transparent 70%)' }} />
          {/* Decorative circle */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
            style={{ border: '1px solid rgba(255,255,255,0.15)' }} />

          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[0.6875rem] font-medium uppercase tracking-widest text-white/70 mb-1">Saldo disponible</p>
              <p className="text-[2.5rem] font-extrabold text-white leading-none tracking-tight">
                {formatBOB(balanceAvailable)}
              </p>
            </div>
            <StatusBadge status={wallet?.status ?? 'active'} />
          </div>

          {(wallet?.balanceReserved > 0 || wallet?.balanceFrozen > 0) && (
            <div className="mt-4 pt-4 border-t border-white/20 flex gap-4">
              {wallet?.balanceReserved > 0 && (
                <div>
                  <p className="text-[0.625rem] text-white/60 uppercase tracking-wider">Reservado</p>
                  <p className="text-[0.875rem] font-semibold text-white/80">{formatBOB(wallet.balanceReserved)}</p>
                </div>
              )}
              {wallet?.balanceFrozen > 0 && (
                <div>
                  <p className="text-[0.625rem] text-white/60 uppercase tracking-wider">Congelado</p>
                  <p className="text-[0.875rem] font-semibold text-[#F87171]">{formatBOB(wallet.balanceFrozen)}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Botones de acción — dentro de la card ─────────────────── */}
          {wallet?.status === 'active' ? (
            <div className="flex gap-3 mt-5">
              {[
                { label: 'Cargar',  icon: ArrowDownToLine, action: () => setShowDeposit(true),    primary: true  },
                { label: 'Enviar',  icon: ArrowUpRight,    action: () => setShowSend(true),        primary: false },
                { label: 'QR',      icon: QrCode,          action: () => navigate('/wallet/qr'),  primary: false },
                { label: 'Retirar', icon: Wallet,          action: () => setShowWithdraw(true),   primary: false },
              ].map(({ label, icon: Icon, action, primary }) => (
                <button key={label} onClick={action}
                  className="flex-1 flex flex-col items-center gap-2 py-3.5 rounded-2xl transition-all active:scale-95"
                  style={{
                    background: primary ? 'white' : 'rgba(255,255,255,0.18)',
                    border:     primary ? 'none'  : '1px solid rgba(255,255,255,0.3)',
                  }}>
                  <Icon size={20} style={{ color: primary ? '#233E58' : 'white' }} />
                  <span className="text-[0.75rem] font-semibold" style={{ color: primary ? '#233E58' : 'white' }}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <AlertCircle size={18} className="text-[#F87171] flex-shrink-0" />
              <p className="text-[0.8125rem] text-[#F87171]">
                Wallet {wallet?.status === 'frozen' ? 'congelada por compliance ASFI' : 'suspendida'}. Contacta a soporte.
              </p>
            </div>
          )}
        </div>

        {/* ── Historial ───────────────────────────────────────────────── */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[1rem] font-bold text-[#0F172A]">Movimientos</h2>
            {txLoading && <Loader2 size={14} className="animate-spin text-[#64748B]" />}
          </div>

          {txs.length === 0 && !txLoading ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-[#E2E8F0]">
              <Clock size={32} className="mx-auto text-[#94A3B8] mb-3" />
              <p className="text-[0.875rem] font-semibold text-[#64748B]">Sin movimientos aún</p>
              <p className="text-[0.75rem] text-[#94A3B8] mt-1">Carga saldo para comenzar a operar.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {txs.map(tx => (
                <div key={tx._id ?? tx.wtxId}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-2xl"
                  style={{ background: 'white', border: '1px solid #E2E8F0' }}>
                  <TxIcon type={tx.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.875rem] font-semibold text-[#0F172A] truncate">
                      {tx.description ?? tx.type}
                    </p>
                    <p className="text-[0.6875rem] text-[#94A3B8] mt-0.5">{formatDate(tx.createdAt)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[0.9375rem] font-bold"
                      style={{ color: ['deposit', 'receive', 'unfreeze'].includes(tx.type) ? '#22C55E' : '#F87171' }}>
                      {['deposit', 'receive', 'unfreeze'].includes(tx.type) ? '+' : '-'}{formatBOB(tx.amount)}
                    </p>
                    <TxStatusBadge status={tx.status} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paginación */}
          {txPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <button onClick={() => setTxPage(p => Math.max(1, p - 1))} disabled={txPage === 1}
                className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-[#64748B] disabled:opacity-40">
                <ChevronLeft size={16} /> Anterior
              </button>
              <span className="text-[0.75rem] text-[#94A3B8]">{txPage} / {txPages}</span>
              <button onClick={() => setTxPage(p => Math.min(txPages, p + 1))} disabled={txPage === txPages}
                className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-[#64748B] disabled:opacity-40">
                Siguiente <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <DepositModal
        open={showDeposit}
        onClose={() => setShowDeposit(false)}
        onSuccess={handleRefresh}
      />
      <SendModal
        open={showSend}
        onClose={() => setShowSend(false)}
        onSuccess={handleRefresh}
        balanceAvailable={balanceAvailable}
      />
      <WithdrawModal
        open={showWithdraw}
        onClose={() => setShowWithdraw(false)}
        onSuccess={handleRefresh}
        balanceAvailable={balanceAvailable}
      />
    </div>
  )
}
