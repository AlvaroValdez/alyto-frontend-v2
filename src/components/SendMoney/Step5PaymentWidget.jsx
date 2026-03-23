/**
 * Step5PaymentWidget.jsx — Widget de pago del proveedor.
 *
 * Abre la payinUrl en nueva pestaña (tanto Fintoc como vitaWallet).
 * Fintoc devuelve una URL de checkout completa (https://checkout.fintoc.com/...).
 * vitaWallet también devuelve una URL de checkout.
 *
 * Polling cada 5s a GET /payments/:transactionId/status.
 * Avanza automáticamente cuando status === 'payin_confirmed' | 'completed' | 'in_transit'.
 * Timeout de 15 minutos con pantalla de soporte.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, ExternalLink, AlertCircle, MessageCircle } from 'lucide-react'
import { getTransactionStatus } from '../../services/paymentsService'
import Sentry from '../../services/sentry.js'

const POLL_INTERVAL_MS = 5_000
const TIMEOUT_MS       = 15 * 60 * 1000
const FINAL_STATUSES   = new Set(['payin_confirmed', 'payin_completed', 'completed', 'in_transit'])

function formatTransactionId(id) {
  if (!id) return ''
  return `${id.slice(0, 8)}...${id.slice(-6)}`
}

export default function Step5PaymentWidget({ stepData, onNext }) {
  const { transactionId, payinUrl, payinMethod } = stepData

  const [widgetOpened, setWidgetOpened] = useState(false)
  const [polling, setPolling]           = useState(false)
  const [timedOut, setTimedOut]         = useState(false)
  const [pollError, setPollError]       = useState(null)

  const pollTimer    = useRef(null)
  const timeoutTimer = useRef(null)

  // ── Polling ──────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    setPolling(false)
    if (pollTimer.current)    clearInterval(pollTimer.current)
    if (timeoutTimer.current) clearTimeout(timeoutTimer.current)
  }, [])

  const startPolling = useCallback(() => {
    setPolling(true)

    const doPoll = async () => {
      try {
        const data = await getTransactionStatus(transactionId)
        if (FINAL_STATUSES.has(data.status)) {
          stopPolling()
          onNext({ completedAt: data.updatedAt || new Date().toISOString() })
        }
      } catch (err) {
        setPollError(err.message)
      }
    }

    doPoll()
    pollTimer.current = setInterval(doPoll, POLL_INTERVAL_MS)

    timeoutTimer.current = setTimeout(() => {
      stopPolling()
      setTimedOut(true)
      Sentry.captureMessage('Payment polling timeout', {
        level: 'warning',
        extra: { transactionId },
      })
    }, TIMEOUT_MS)
  }, [transactionId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup de polling al desmontar
  useEffect(() => () => stopPolling(), [stopPolling])

  // ── Logs de diagnóstico al montar ────────────────────────────────────────

  useEffect(() => {
    console.log('[Step5] payinMethod:', payinMethod)
    console.log('[Step5] payinUrl:', payinUrl)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handler botón ─────────────────────────────────────────────────────────

  function handleOpenWidget() {
    if (!payinUrl) return
    window.open(payinUrl, '_blank', 'noopener,noreferrer')
    setWidgetOpened(true)
    if (!polling && !timedOut) startPolling()
  }

  // ── Render: payinUrl ausente ──────────────────────────────────────────────

  if (!payinUrl) {
    return (
      <div className="flex flex-col gap-5 px-4 pb-4">
        <div className="bg-[#EF44441A] border border-[#EF444433] rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-[0.9375rem] font-bold text-white mb-1">
                No se pudo obtener el enlace de pago
              </h3>
              <p className="text-[0.8125rem] text-[#8A96B8]">
                La transacción fue registrada pero el proveedor no retornó la URL.
                Contacta a soporte con tu ID de transacción.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#1A2340] rounded-2xl p-4">
          <p className="text-[0.75rem] text-[#8A96B8] mb-1">ID de transacción</p>
          <p className="text-[0.8125rem] font-mono font-semibold text-[#C4CBD8] break-all">
            {transactionId || '—'}
          </p>
        </div>

        <a
          href={`mailto:soporte@alyto.com?subject=URL%20de%20pago%20no%20disponible%20-%20${transactionId}`}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#1A2340] border border-[#263050] text-white text-[0.9375rem] font-semibold no-underline hover:border-[#C4CBD833] transition-colors"
        >
          <MessageCircle size={18} className="text-[#C4CBD8]" />
          Contactar soporte
        </a>
      </div>
    )
  }

  // ── Render: timeout ───────────────────────────────────────────────────────

  if (timedOut) {
    return (
      <div className="flex flex-col gap-5 px-4 pb-4">
        <div className="bg-[#EF44441A] border border-[#EF444433] rounded-2xl p-5 text-center">
          <AlertCircle size={32} className="text-[#EF4444] mx-auto mb-3" />
          <h3 className="text-[1rem] font-bold text-white mb-1">Tiempo agotado</h3>
          <p className="text-[0.8125rem] text-[#8A96B8]">
            No recibimos confirmación del pago en 15 minutos.
          </p>
        </div>

        <div className="bg-[#1A2340] rounded-2xl p-4">
          <p className="text-[0.75rem] text-[#8A96B8] mb-1">Referencia de tu operación</p>
          <p className="text-[0.8125rem] font-mono font-semibold text-[#C4CBD8]">
            {transactionId}
          </p>
        </div>

        <a
          href={`mailto:soporte@alyto.com?subject=Pago%20pendiente%20${transactionId}`}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#1A2340] border border-[#263050] text-white text-[0.9375rem] font-semibold no-underline hover:border-[#C4CBD833] transition-colors"
        >
          <MessageCircle size={18} className="text-[#C4CBD8]" />
          Contactar soporte
        </a>
      </div>
    )
  }

  // ── Render: principal ─────────────────────────────────────────────────────

  const isFintoc = payinMethod === 'fintoc'

  return (
    <div className="flex flex-col gap-5 px-4 pb-4">

      {/* ── Título ── */}
      <div>
        <h2 className="text-[1.125rem] font-bold text-white">
          {isFintoc ? 'Autoriza la transferencia' : 'Realiza el pago'}
        </h2>
        <p className="text-[0.8125rem] text-[#8A96B8] mt-0.5">
          {isFintoc
            ? 'Se abrirá el portal de pago de Fintoc en una nueva pestaña.'
            : 'Se abrirá la ventana de pago de tu proveedor.'}
        </p>
      </div>

      {/* ── Card del widget ── */}
      <div className="bg-[#1A2340] border border-[#263050] rounded-2xl p-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#263050] flex items-center justify-center mx-auto mb-4 text-3xl">
          🏦
        </div>
        <h3 className="text-[1rem] font-semibold text-white mb-1">
          {isFintoc ? 'Fintoc — Pago bancario directo' : 'Widget de pago'}
        </h3>
        <p className="text-[0.8125rem] text-[#8A96B8] mb-4">
          {isFintoc
            ? 'Selecciona tu banco y autoriza el pago de forma segura. Esta pantalla avanzará automáticamente al confirmar.'
            : 'Se abrirá en una nueva pestaña. Una vez que completes el pago, esta pantalla se actualizará automáticamente.'}
        </p>

        <button
          onClick={handleOpenWidget}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C4CBD8] text-[#0F1628] font-bold text-[0.9375rem] shadow-[0_4px_20px_rgba(196,203,216,0.3)] active:scale-[0.98] transition-all"
        >
          <ExternalLink size={16} />
          {widgetOpened ? 'Abrir de nuevo' : (isFintoc ? 'Ir a pagar con Fintoc' : 'Ir a pagar')}
        </button>
      </div>

      {/* ── Estado del polling ── */}
      {widgetOpened && (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="flex items-center gap-2.5">
            <Loader2 size={16} className="text-[#C4CBD8] animate-spin flex-shrink-0" />
            <span className="text-[0.8125rem] text-[#8A96B8]">
              Esperando confirmación de pago...
            </span>
          </div>

          <div className="bg-[#1A2340] rounded-xl px-4 py-2.5 w-full">
            <p className="text-[0.6875rem] text-[#4E5A7A] mb-0.5">
              ID de transacción (para soporte)
            </p>
            <p className="text-[0.8125rem] font-mono font-semibold text-[#C4CBD8]">
              {formatTransactionId(transactionId)}
            </p>
          </div>

          {pollError && (
            <p className="text-[0.75rem] text-[#EF4444]">{pollError}</p>
          )}
        </div>
      )}

      {/* Nota */}
      <p className="text-[0.6875rem] text-[#4E5A7A] text-center">
        No cierres esta pantalla hasta recibir la confirmación.
        Tienes hasta 15 minutos para completar el pago.
      </p>
    </div>
  )
}
