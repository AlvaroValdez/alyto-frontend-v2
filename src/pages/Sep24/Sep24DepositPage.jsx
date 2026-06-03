/**
 * Sep24DepositPage.jsx — SEP-24 Deposit (Interactive Anchor)
 *
 * Ruta pública /sep24/deposit. Dos modos:
 *   A) ?transaction_id=ALY-D-...  → resume: trae la tx y muestra instrucciones.
 *      (flujo webview de wallet externa; auth vía ?token= SEP-10)
 *   B) sin transaction_id         → initiate: pide monto, crea la tx y muestra
 *      instrucciones (flujo in-app del usuario Alyto, auth de localStorage).
 *
 * Tras tener la tx, hace polling del estado hasta completed/error.
 */

import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, X, ArrowDownToLine, CheckCircle2, AlertCircle } from 'lucide-react'
import Button from '../../components/ui/Button'
import { initiateSep24Deposit } from '../../services/sep24Service'
import { useSep24Status } from '../../hooks/useSep24Status'
import { StatusPill, StellarInstructions } from './Sep24Shared'

export default function Sep24DepositPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const urlTxId  = params.get('transaction_id') || ''
  const token    = params.get('token') || ''
  const account  = params.get('account') || ''

  const [amount, setAmount]   = useState('')
  const [txId, setTxId]       = useState(urlTxId)
  const [instr, setInstr]     = useState(null)   // { address, memo, amount }
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  // Polling de estado una vez que tenemos un txId
  const { transaction } = useSep24Status(txId, token)

  // Si venimos con transaction_id en la URL (modo resume), derivamos la
  // instrucción desde la transacción que trae el polling.
  useEffect(() => {
    if (!transaction || instr) return
    if (transaction.to) {
      setInstr({
        address: transaction.to,
        memo:    transaction.deposit_memo,
        amount:  transaction.amount_in,
      })
    }
  }, [transaction, instr])

  const status = transaction?.status
  const isDone = status === 'completed'
  const isErr  = status === 'error'

  const handleInitiate = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await initiateSep24Deposit({ amount: parseFloat(amount), account }, token)
      setTxId(res.id)
      setInstr({
        address: res.instruction?.stellar_account,
        memo:    res.instruction?.memo,
        amount:  amount,
      })
    } catch (err) {
      setError(err.message || 'No se pudo iniciar el depósito')
    } finally {
      setLoading(false)
    }
  }

  const title = useMemo(() => {
    if (isDone) return 'Depósito completado'
    if (instr)  return 'Instrucciones de depósito'
    return 'Depositar USDC'
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
              <p className="text-[1.0625rem] font-bold text-[#0D1F3C]">¡Depósito acreditado!</p>
              <p className="text-[0.875rem] text-[#64748B]">
                Tu USDC ya está disponible en tu cuenta Alyto.
              </p>
              <Button fullWidth onClick={() => navigate('/wallet')}>Ir a mi wallet</Button>
            </div>
          )}

          {/* Error de estado */}
          {isErr && (
            <div className="bg-[#EF44441A] border border-[#EF444433] rounded-2xl p-4 flex items-start gap-3">
              <AlertCircle size={18} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[0.875rem] font-semibold text-[#0D1F3C]">El depósito falló</p>
                <p className="text-[0.8125rem] text-[#64748B] mt-0.5">
                  {transaction?.message || 'Contactá a soporte si el problema persiste.'}
                </p>
              </div>
            </div>
          )}

          {/* Paso 1 — pedir monto (solo modo initiate, sin instrucción aún) */}
          {!instr && !isDone && (
            <form onSubmit={handleInitiate} className="space-y-4">
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
                <div className="w-11 h-11 rounded-2xl bg-[#22C55E1A] flex items-center justify-center mb-4">
                  <ArrowDownToLine size={20} className="text-[#22C55E]" />
                </div>
                <label className="block text-[0.75rem] font-medium text-[#64748B] mb-1.5">
                  Monto a depositar (USDC)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="100.00"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3.5 text-[1.125rem] font-bold text-[#0F172A] focus:border-[#0D1F3C] focus:outline-none"
                />
              </div>

              {error && (
                <p className="text-[0.8125rem] text-[#EF4444] bg-[#EF44441A] rounded-xl px-4 py-3">
                  {error}
                </p>
              )}

              <Button type="submit" fullWidth loading={loading} disabled={!amount || Number(amount) <= 0}>
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
                Apenas recibamos tu transferencia, acreditaremos el USDC en tu cuenta.
                Podés cerrar esta pantalla — el estado se actualiza solo.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
