/**
 * Sep24WithdrawPage.jsx — SEP-24 Withdraw (Interactive Anchor)
 *
 * Ruta pública /sep24/withdraw. Dos modos:
 *   A) ?transaction_id=ALY-W-...  → resume: trae la tx y muestra instrucciones.
 *   B) sin transaction_id         → form (monto + datos bancarios) → crea la tx
 *      → muestra a dónde enviar el USDC. Al recibirlo, Alyto paga al banco.
 *
 * Hace polling del estado hasta completed/error.
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, X, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react'
import Button from '../../components/ui/Button'
import { initiateSep24Withdraw } from '../../services/sep24Service'
import { useSep24Status } from '../../hooks/useSep24Status'
import { StatusPill, StellarInstructions } from './Sep24Shared'

export default function Sep24WithdrawPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const urlTxId  = params.get('transaction_id') || ''
  const token    = params.get('token') || ''
  const account  = params.get('account') || ''

  const [form, setForm] = useState({ amount: '', dest: '', dest_extra: '' })
  const [txId, setTxId]       = useState(urlTxId)
  const [instr, setInstr]     = useState(null)   // { address, memo, amount }
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const { transaction } = useSep24Status(txId, token)

  // Modo resume: derivar instrucción desde la transacción del polling.
  useEffect(() => {
    if (!transaction || instr) return
    if (transaction.withdraw_anchor_account) {
      setInstr({
        address: transaction.withdraw_anchor_account,
        memo:    transaction.withdraw_memo,
        amount:  transaction.amount_in,
      })
    }
  }, [transaction, instr])

  const status = transaction?.status
  const isDone = status === 'completed'
  const isErr  = status === 'error'

  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const formValid = Number(form.amount) > 0 && form.dest.trim() && form.dest_extra.trim()

  const handleInitiate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await initiateSep24Withdraw({
        amount:     parseFloat(form.amount),
        account,
        dest:       form.dest.trim(),
        dest_extra: form.dest_extra.trim(),
      }, token)
      setTxId(res.id)
      setInstr({
        address: res.instruction?.stellar_account,
        memo:    res.instruction?.memo,
        amount:  form.amount,
      })
    } catch (err) {
      setError(err.message || 'No se pudo iniciar el retiro')
    } finally {
      setLoading(false)
    }
  }

  const title = useMemo(() => {
    if (isDone) return 'Retiro completado'
    if (instr)  return 'Enviá el USDC'
    return 'Retirar USDC'
  }, [isDone, instr])

  return (
    <div className="min-h-screen bg-[#F4F6FA] font-sans">
      <div className="flex flex-col max-w-[430px] mx-auto min-h-screen">

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-6 pb-3 flex-shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center text-[#4A5568] hover:text-[#0D1F3C] transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-[0.9375rem] font-bold text-[#0D1F3C]">{title}</span>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center text-[#4A5568] hover:text-[#0D1F3C] transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 px-4 pb-8 space-y-4">

          {/* Éxito */}
          {isDone && (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-[#22C55E1A]">
                <CheckCircle2 size={34} className="text-[#22C55E]" />
              </div>
              <p className="text-[1.0625rem] font-bold text-[#0D1F3C]">¡Retiro enviado!</p>
              <p className="text-[0.875rem] text-[#64748B]">
                Transferimos los fondos a tu cuenta bancaria.
              </p>
              <Button fullWidth onClick={() => navigate('/transactions')}>Ver mis transacciones</Button>
            </div>
          )}

          {/* Error */}
          {isErr && (
            <div className="bg-[#EF44441A] border border-[#EF444433] rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle size={18} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[0.875rem] font-semibold text-[#0D1F3C]">El retiro falló</p>
                <p className="text-[0.8125rem] text-[#64748B] mt-0.5">
                  {transaction?.message || 'Contactá a soporte si el problema persiste.'}
                </p>
              </div>
            </div>
          )}

          {/* Paso 1 — formulario (modo initiate) */}
          {!instr && !isDone && (
            <form onSubmit={handleInitiate} className="space-y-4">
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 space-y-4">
                <div className="w-11 h-11 rounded-2xl bg-[#0D1F3C0D] flex items-center justify-center">
                  <ArrowUpRight size={20} className="text-[#0D1F3C]" />
                </div>

                <div>
                  <label className="block text-[0.75rem] font-medium text-[#64748B] mb-1.5">
                    Monto a retirar (USDC)
                  </label>
                  <input
                    type="number" inputMode="decimal" step="0.01" min="0"
                    value={form.amount} onChange={onChange('amount')}
                    placeholder="100.00"
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3.5 text-[1.125rem] font-bold text-[#0F172A] focus:border-[#0D1F3C] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[0.75rem] font-medium text-[#64748B] mb-1.5">
                    Cuenta bancaria destino
                  </label>
                  <input
                    type="text" value={form.dest} onChange={onChange('dest')}
                    placeholder="Número de cuenta"
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3.5 text-[0.9375rem] text-[#0F172A] focus:border-[#0D1F3C] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[0.75rem] font-medium text-[#64748B] mb-1.5">
                    Código del banco / entidad
                  </label>
                  <input
                    type="text" value={form.dest_extra} onChange={onChange('dest_extra')}
                    placeholder="Ej. código bancario / CBU / CLABE"
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3.5 text-[0.9375rem] text-[#0F172A] focus:border-[#0D1F3C] focus:outline-none"
                  />
                </div>
              </div>

              {error && (
                <p className="text-[0.8125rem] text-[#EF4444] bg-[#EF44441A] rounded-xl px-4 py-3">
                  {error}
                </p>
              )}

              <Button type="submit" fullWidth loading={loading} disabled={!formValid}>
                Continuar
              </Button>
            </form>
          )}

          {/* Paso 2 — instrucciones + estado */}
          {instr && !isDone && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[0.875rem] font-semibold text-[#0D1F3C]">Estado</p>
                <StatusPill status={status || 'pending_user_transfer_start'} />
              </div>

              <StellarInstructions
                address={instr.address}
                memo={instr.memo}
                amount={instr.amount}
              />

              <p className="text-[0.75rem] text-[#94A3B8] text-center leading-relaxed">
                Cuando recibamos tu USDC, transferiremos los fondos a la cuenta bancaria indicada.
                El estado se actualiza solo.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
