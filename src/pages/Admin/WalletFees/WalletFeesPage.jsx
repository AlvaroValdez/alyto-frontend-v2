/**
 * WalletFeesPage.jsx — Comisiones y límites de transferencias USDC P2P
 *
 * Permite al admin:
 *  • Activar/desactivar la comisión P2P (toggle global)
 *  • Configurar tarifa retail: porcentaje, fija, piso, techo, franja gratis
 *  • Configurar tarifa business: porcentaje, fija
 *  • Configurar límites por-tx y diarios (retail y business)
 *  • Ver la revenue acumulada con su verificación de integridad
 *
 * GET  /api/v1/admin/wallet-fees
 * PUT  /api/v1/admin/wallet-fees
 * GET  /api/v1/admin/wallet-fees/revenue
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Percent, Save, RefreshCw, CheckCircle2, AlertCircle,
  Loader2, TrendingUp, Users, Building2, ShieldCheck,
} from 'lucide-react'
import { getWalletFees, updateWalletFees, getWalletFeeRevenue } from '../../../services/adminService'

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG_CARD    = '#1A2340'
const BG_DEEP    = '#0F1628'
const BORDER     = '#263050'
const TEXT_SEC   = '#8A96B8'
const TEXT_MUTED = '#4E5A7A'
const SILVER     = '#C4CBD8'

// ── Shared CSS strings ────────────────────────────────────────────────────────
const inputCls =
  'w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white border border-[#263050] bg-[#0F1628] ' +
  'focus:outline-none focus:border-[#C4CBD8] focus:shadow-[0_0_0_2px_#C4CBD820] ' +
  'placeholder-[#4E5A7A] [appearance:textfield] ' +
  '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, type = 'success', onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [onDone])

  const styles = type === 'success'
    ? { border: '1px solid #22C55E33', color: '#22C55E' }
    : { border: '1px solid #EF444433', color: '#EF4444' }

  return (
    <div
      className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg"
      style={{ background: BG_CARD, ...styles }}
    >
      {type === 'success'
        ? <CheckCircle2 size={16} />
        : <AlertCircle  size={16} />}
      <span className="text-[0.875rem] font-medium">{message}</span>
    </div>
  )
}

// ── Toggle switch ─────────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4CBD8]"
      style={{ background: checked ? '#22C55E' : BORDER }}
    >
      <span
        className="pointer-events-none absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
      />
    </button>
  )
}

// ── Field ─────────────────────────────────────────────────────────────────────

function Field({ label, value, onChange, type = 'number', placeholder, help, suffix, dimmed }) {
  return (
    <div className={`space-y-1.5 transition-opacity ${dimmed ? 'opacity-40' : 'opacity-100'}`}>
      <label className="block text-[0.8125rem] font-medium" style={{ color: TEXT_SEC }}>
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          min={type === 'number' ? 0 : undefined}
          step={type === 'number' ? 'any' : undefined}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? '0'}
          className={inputCls}
          style={suffix ? { paddingRight: '3.25rem' } : {}}
        />
        {suffix && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[0.75rem] font-medium pointer-events-none select-none"
            style={{ color: TEXT_MUTED }}
          >
            {suffix}
          </span>
        )}
      </div>
      {help && <p className="text-[0.6875rem]" style={{ color: TEXT_MUTED }}>{help}</p>}
    </div>
  )
}

// ── Sub-section header ────────────────────────────────────────────────────────

function SubHeader({ icon: Icon, label, color = TEXT_SEC }) {
  return (
    <div
      className="flex items-center gap-2 pb-3 mb-1"
      style={{ borderBottom: `1px solid ${BORDER}` }}
    >
      <Icon size={13} style={{ color }} />
      <p
        className="text-[0.6875rem] font-bold uppercase tracking-wider"
        style={{ color: TEXT_MUTED }}
      >
        {label}
      </p>
    </div>
  )
}

// ── Fee preview ───────────────────────────────────────────────────────────────

const PREVIEW_AMOUNTS = [5, 25, 100, 500]

function calcRetailFee(amount, form) {
  if (!form.usdcP2pEnabled) return 0
  const pct    = parseFloat(form.usdcP2pFeePercent)  || 0
  const fixed  = parseFloat(form.usdcP2pFeeFixed)    || 0
  const min    = parseFloat(form.usdcP2pFeeMin)       || 0
  const maxVal = form.usdcP2pFeeMax !== '' ? parseFloat(form.usdcP2pFeeMax) : null
  const freeBlw = parseFloat(form.usdcP2pFreeBelow)  || 0

  if (freeBlw > 0 && amount <= freeBlw) return 0
  const raw     = amount * pct / 100 + fixed
  const clamped = maxVal !== null
    ? Math.min(maxVal, Math.max(min, raw))
    : Math.max(min, raw)
  return Math.round(clamped * 10000) / 10000
}

function FeePreview({ form }) {
  const anyFee = form.usdcP2pEnabled && (
    parseFloat(form.usdcP2pFeePercent) > 0 ||
    parseFloat(form.usdcP2pFeeFixed)   > 0
  )

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: BG_DEEP, border: `1px solid ${BORDER}` }}>
      <p className="text-[0.75rem] font-semibold" style={{ color: TEXT_SEC }}>
        Simulador — fee retail estimado
      </p>
      {!form.usdcP2pEnabled && (
        <p className="text-[0.75rem]" style={{ color: TEXT_MUTED }}>
          Comisión desactivada. Todos los envíos son gratis.
        </p>
      )}
      {form.usdcP2pEnabled && !anyFee && (
        <p className="text-[0.75rem]" style={{ color: TEXT_MUTED }}>
          Con los valores actuales la comisión resultante es 0 USDC.
        </p>
      )}
      {form.usdcP2pEnabled && anyFee && (
        <div className="grid grid-cols-4 gap-2">
          {PREVIEW_AMOUNTS.map(amt => {
            const fee   = calcRetailFee(amt, form)
            const isFree = fee === 0
            return (
              <div
                key={amt}
                className="rounded-xl p-3 text-center"
                style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
              >
                <p className="text-[0.6875rem]" style={{ color: TEXT_MUTED }}>Envío</p>
                <p className="text-[0.875rem] font-bold text-white">{amt} USDC</p>
                <p
                  className="text-[0.75rem] font-semibold mt-1"
                  style={{ color: isFree ? '#22C55E' : SILVER }}
                >
                  {isFree ? 'Gratis' : `${fee} USDC`}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[180, 220, 120].map((h, i) => (
        <div
          key={i}
          className="rounded-2xl"
          style={{ background: BG_CARD, border: `1px solid ${BORDER}`, height: h }}
        />
      ))}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function configToForm(c) {
  return {
    usdcP2pEnabled:              c.usdcP2pEnabled             ?? false,
    usdcP2pFeePercent:           String(c.usdcP2pFeePercent   ?? 0),
    usdcP2pFeeFixed:             String(c.usdcP2pFeeFixed      ?? 0),
    usdcP2pFeeMin:               String(c.usdcP2pFeeMin        ?? 0),
    usdcP2pFeeMax:               c.usdcP2pFeeMax != null ? String(c.usdcP2pFeeMax) : '',
    usdcP2pFreeBelow:            String(c.usdcP2pFreeBelow     ?? 0),
    businessUsdcP2pFeePercent:   String(c.businessUsdcP2pFeePercent ?? 0),
    businessUsdcP2pFeeFixed:     String(c.businessUsdcP2pFeeFixed   ?? 0),
    usdcP2pMinPerTx:             String(c.usdcP2pMinPerTx      ?? 1),
    usdcP2pMaxPerTx:             String(c.usdcP2pMaxPerTx      ?? 1000),
    usdcP2pMaxDaily:             String(c.usdcP2pMaxDaily      ?? 2000),
    businessUsdcP2pMaxPerTx:     String(c.businessUsdcP2pMaxPerTx  ?? 5000),
    businessUsdcP2pMaxDaily:     String(c.businessUsdcP2pMaxDaily  ?? 10000),
  }
}

function formToPayload(form) {
  return {
    usdcP2pEnabled:              form.usdcP2pEnabled,
    usdcP2pFeePercent:           Number(form.usdcP2pFeePercent),
    usdcP2pFeeFixed:             Number(form.usdcP2pFeeFixed),
    usdcP2pFeeMin:               Number(form.usdcP2pFeeMin),
    usdcP2pFeeMax:               form.usdcP2pFeeMax !== '' ? Number(form.usdcP2pFeeMax) : null,
    usdcP2pFreeBelow:            Number(form.usdcP2pFreeBelow),
    businessUsdcP2pFeePercent:   Number(form.businessUsdcP2pFeePercent),
    businessUsdcP2pFeeFixed:     Number(form.businessUsdcP2pFeeFixed),
    usdcP2pMinPerTx:             Number(form.usdcP2pMinPerTx),
    usdcP2pMaxPerTx:             Number(form.usdcP2pMaxPerTx),
    usdcP2pMaxDaily:             Number(form.usdcP2pMaxDaily),
    businessUsdcP2pMaxPerTx:     Number(form.businessUsdcP2pMaxPerTx),
    businessUsdcP2pMaxDaily:     Number(form.businessUsdcP2pMaxDaily),
  }
}

const NUMERIC_FIELDS = [
  'usdcP2pFeePercent', 'usdcP2pFeeFixed', 'usdcP2pFeeMin', 'usdcP2pFreeBelow',
  'businessUsdcP2pFeePercent', 'businessUsdcP2pFeeFixed',
  'usdcP2pMinPerTx', 'usdcP2pMaxPerTx', 'usdcP2pMaxDaily',
  'businessUsdcP2pMaxPerTx', 'businessUsdcP2pMaxDaily',
]

function validateForm(form) {
  for (const f of NUMERIC_FIELDS) {
    const v = Number(form[f])
    if (isNaN(v) || v < 0) return `El campo "${f}" debe ser un número ≥ 0.`
  }
  if (form.usdcP2pFeeMax !== '') {
    const v = Number(form.usdcP2pFeeMax)
    if (isNaN(v) || v < 0) return 'El techo máximo debe ser un número ≥ 0 o dejarlo vacío.'
  }
  return null
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-BO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── WalletFeesPage ────────────────────────────────────────────────────────────

export default function WalletFeesPage() {
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState(null)
  const [saveErr,  setSaveErr]  = useState(null)
  const [toast,    setToast]    = useState(null)
  const [meta,     setMeta]     = useState(null)   // { updatedBy, updatedAt }
  const [revenue,  setRevenue]  = useState(null)   // from /revenue

  const [form, setForm] = useState(configToForm({}))

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
    setSaveErr(null)
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [config, rev] = await Promise.all([
        getWalletFees(),
        getWalletFeeRevenue().catch(() => null),
      ])
      setForm(configToForm(config))
      setMeta({ updatedBy: config.updatedBy, updatedAt: config.updatedAt })
      if (rev) setRevenue(rev)
    } catch (err) {
      setError(err.message || 'Error al cargar la configuración.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaveErr(null)
    const err = validateForm(form)
    if (err) { setSaveErr(err); return }

    setSaving(true)
    try {
      const updated = await updateWalletFees(formToPayload(form))
      setForm(configToForm(updated))
      setMeta({ updatedBy: updated.updatedBy, updatedAt: updated.updatedAt })
      // Refetch revenue after save
      getWalletFeeRevenue()
        .then(rev => { if (rev) setRevenue(rev) })
        .catch(() => {})
      setToast({ message: 'Configuración guardada correctamente.', type: 'success' })
    } catch (err) {
      setSaveErr(err.message || 'Error al guardar. Verifica los valores e intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-2">
        <Percent size={22} style={{ color: SILVER }} />
        <h1 className="text-[1.125rem] font-bold text-white">Comisiones y límites — USDC P2P</h1>
      </div>
      <Skeleton />
    </div>
  )

  const feeOn = form.usdcP2pEnabled

  return (
    <div className="space-y-6 p-4 md:p-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Percent size={20} style={{ color: SILVER }} />
            <h1 className="text-[1.125rem] font-bold text-white">
              Comisiones y límites — Transferencias USDC P2P
            </h1>
          </div>
          <p className="text-[0.8125rem]" style={{ color: TEXT_MUTED }}>
            Configura tarifas y límites para envíos P2P entre usuarios Alyto. La comisión
            arranca desactivada (0); actívala cuando el producto esté listo.
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-1.5 text-[0.8125rem] transition flex-shrink-0"
          style={{ color: TEXT_SEC }}
          onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
          onMouseLeave={e => e.currentTarget.style.color = TEXT_SEC}
        >
          <RefreshCw size={14} /> Recargar
        </button>
      </div>

      {/* ── Load error ── */}
      {error && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-[0.875rem]"
          style={{ background: '#EF44441A', border: '1px solid #EF444433', color: '#EF4444' }}
        >
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          BLOQUE 1 — Comisión
      ══════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl p-6 space-y-6" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>

        {/* Toggle header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Percent size={18} style={{ color: SILVER }} />
            <div>
              <h2 className="text-[0.9375rem] font-bold text-white">Comisión USDC P2P</h2>
              <p className="text-[0.75rem] mt-0.5" style={{ color: TEXT_MUTED }}>
                Tarifa aplicada a cada envío. Si está OFF, todos los envíos son gratuitos.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span
              className="text-[0.75rem] font-semibold px-2.5 py-1 rounded-full"
              style={feeOn
                ? { background: '#22C55E1A', border: '1px solid #22C55E33', color: '#22C55E' }
                : { background: '#26305033', border: `1px solid ${BORDER}`, color: TEXT_MUTED }
              }
            >
              {feeOn ? 'ACTIVA' : 'DESACTIVADA'}
            </span>
            <ToggleSwitch checked={feeOn} onChange={v => set('usdcP2pEnabled', v)} />
          </div>
        </div>

        {/* Notice when disabled */}
        {!feeOn && (
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-[0.8125rem]"
            style={{ background: '#4E5A7A18', border: `1px solid ${BORDER}`, color: TEXT_MUTED }}
          >
            <ShieldCheck size={14} className="flex-shrink-0" />
            Los inputs de comisión están visualmente apagados pero puedes editarlos y guardar.
            Se activarán cuando actives el toggle.
          </div>
        )}

        {/* ── Tarifa retail ── */}
        <div>
          <SubHeader icon={Users} label="Tarifa retail" />
          <div className={`grid grid-cols-2 gap-4 mt-4 transition-opacity ${!feeOn ? 'opacity-40' : ''}`}>
            <Field
              label="Porcentaje (%)"
              value={form.usdcP2pFeePercent}
              onChange={v => set('usdcP2pFeePercent', v)}
              suffix="%"
              help="Ej: 1 = 1 % del monto enviado"
            />
            <Field
              label="Fee fijo"
              value={form.usdcP2pFeeFixed}
              onChange={v => set('usdcP2pFeeFixed', v)}
              suffix="USDC"
              help="Se suma al % en cada operación"
            />
            <Field
              label="Piso mínimo"
              value={form.usdcP2pFeeMin}
              onChange={v => set('usdcP2pFeeMin', v)}
              suffix="USDC"
              help="Fee nunca será menor a este valor (0 = sin piso)"
            />
            <Field
              label="Techo máximo"
              value={form.usdcP2pFeeMax}
              onChange={v => set('usdcP2pFeeMax', v)}
              placeholder="Sin techo"
              suffix="USDC"
              help="Vacío o en blanco = sin límite superior"
            />
          </div>
          <div className={`mt-4 transition-opacity ${!feeOn ? 'opacity-40' : ''}`}>
            <Field
              label="Gratis si el monto es ≤"
              value={form.usdcP2pFreeBelow}
              onChange={v => set('usdcP2pFreeBelow', v)}
              suffix="USDC"
              help="Envíos por debajo de este monto son gratis (0 = sin franja gratis)"
            />
          </div>
        </div>

        {/* ── Tarifa business ── */}
        <div>
          <SubHeader icon={Building2} label="Tarifa business" color="#C4CBD8" />
          <div className={`grid grid-cols-2 gap-4 mt-4 transition-opacity ${!feeOn ? 'opacity-40' : ''}`}>
            <Field
              label="Porcentaje business (%)"
              value={form.businessUsdcP2pFeePercent}
              onChange={v => set('businessUsdcP2pFeePercent', v)}
              suffix="%"
              help="Aplica a cuentas con KYB aprobado"
            />
            <Field
              label="Fee fijo business"
              value={form.businessUsdcP2pFeeFixed}
              onChange={v => set('businessUsdcP2pFeeFixed', v)}
              suffix="USDC"
            />
          </div>
        </div>

        {/* ── Simulador ── */}
        <FeePreview form={form} />

      </div>

      {/* ══════════════════════════════════════════════════════════════════
          BLOQUE 2 — Límites
      ══════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl p-6 space-y-6" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} style={{ color: SILVER }} />
          <div>
            <h2 className="text-[0.9375rem] font-bold text-white">Límites por transacción</h2>
            <p className="text-[0.75rem] mt-0.5" style={{ color: TEXT_MUTED }}>
              El valor 0 en los máximos significa sin límite.
            </p>
          </div>
        </div>

        {/* Retail limits */}
        <div>
          <SubHeader icon={Users} label="Retail" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <Field
              label="Mínimo por envío"
              value={form.usdcP2pMinPerTx}
              onChange={v => set('usdcP2pMinPerTx', v)}
              suffix="USDC"
              help="Monto mínimo permitido"
            />
            <Field
              label="Máximo por envío"
              value={form.usdcP2pMaxPerTx}
              onChange={v => set('usdcP2pMaxPerTx', v)}
              suffix="USDC"
              help="0 = sin límite por operación"
            />
            <Field
              label="Máximo diario acumulado"
              value={form.usdcP2pMaxDaily}
              onChange={v => set('usdcP2pMaxDaily', v)}
              suffix="USDC"
              help="0 = sin límite diario"
            />
          </div>
        </div>

        {/* Business limits */}
        <div>
          <SubHeader icon={Building2} label="Business" color="#C4CBD8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Field
              label="Máximo por envío"
              value={form.businessUsdcP2pMaxPerTx}
              onChange={v => set('businessUsdcP2pMaxPerTx', v)}
              suffix="USDC"
              help="0 = sin límite por operación"
            />
            <Field
              label="Máximo diario acumulado"
              value={form.businessUsdcP2pMaxDaily}
              onChange={v => set('businessUsdcP2pMaxDaily', v)}
              suffix="USDC"
              help="0 = sin límite diario"
            />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          BLOQUE 3 — Revenue (read-only)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="rounded-2xl p-6 space-y-4" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2">
          <TrendingUp size={18} style={{ color: SILVER }} />
          <h2 className="text-[0.9375rem] font-bold text-white">Revenue acumulada</h2>
        </div>

        {revenue ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Amount */}
            <div
              className="rounded-xl px-5 py-4"
              style={{ background: BG_DEEP, border: `1px solid ${BORDER}` }}
            >
              <p className="text-[0.75rem] font-medium mb-1" style={{ color: TEXT_MUTED }}>
                Total comisiones cobradas
              </p>
              <p className="text-[2rem] font-extrabold text-white tabular-nums leading-none">
                {(revenue.revenueAccruedUsdc ?? 0).toFixed(4)}
                <span className="text-[0.9375rem] font-semibold ml-2" style={{ color: TEXT_SEC }}>USDC</span>
              </p>
            </div>

            {/* Verification */}
            <div className="space-y-3">
              <div
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.8125rem] font-semibold"
                style={revenue.verification?.matches
                  ? { background: '#22C55E1A', border: '1px solid #22C55E33', color: '#22C55E' }
                  : { background: '#EF44441A', border: '1px solid #EF444433', color: '#EF4444' }
                }
              >
                {revenue.verification?.matches
                  ? <><CheckCircle2 size={15} /> Integridad verificada</>
                  : <><AlertCircle  size={15} /> Desajuste — revisar manualmente</>
                }
              </div>
              {revenue.verification && (
                <p className="text-[0.75rem]" style={{ color: TEXT_MUTED }}>
                  {revenue.verification.count ?? 0} transacciones de comisión
                  {' · '}Suma en ledger: {(revenue.verification.sumFeeTransactions ?? 0).toFixed(4)} USDC
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl p-6 flex items-center justify-center" style={{ background: BG_DEEP, border: `1px solid ${BORDER}` }}>
            <p className="text-[0.8125rem]" style={{ color: TEXT_MUTED }}>
              No hay datos de revenue disponibles aún.
            </p>
          </div>
        )}
      </div>

      {/* ── Last updated ── */}
      {meta?.updatedAt && (
        <p className="text-[0.75rem]" style={{ color: TEXT_MUTED }}>
          Última actualización: {formatDate(meta.updatedAt)}
          {meta.updatedBy && ` · ID ${meta.updatedBy}`}
        </p>
      )}

      {/* ── Save error ── */}
      {saveErr && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-[0.875rem]"
          style={{ background: '#EF44441A', border: '1px solid #EF444433', color: '#EF4444' }}
        >
          <AlertCircle size={16} className="flex-shrink-0" />
          {saveErr}
        </div>
      )}

      {/* ── Save button ── */}
      <div className="flex justify-end pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[0.9375rem] font-bold text-[#0F1628] transition disabled:opacity-50"
          style={{ background: SILVER, boxShadow: '0 4px 20px rgba(196,203,216,0.2)' }}
        >
          {saving
            ? <><Loader2 size={16} className="animate-spin" /> Guardando…</>
            : <><Save size={16} /> Guardar cambios</>
          }
        </button>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

    </div>
  )
}
