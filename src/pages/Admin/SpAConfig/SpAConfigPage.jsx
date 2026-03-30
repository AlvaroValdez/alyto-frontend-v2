import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  Settings2,
  Building2,
  DollarSign,
  Save,
  AlertCircle,
  Copy,
  RefreshCw,
} from 'lucide-react'
import { getSpaConfig, updateSpaConfig } from '../../../services/adminService'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-CL', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

// ── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div
      className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg"
      style={{ background: '#1A2340', border: '1px solid #22C55E33', color: '#22C55E' }}
    >
      <CheckCircle2 size={16} />
      <span className="text-[0.875rem] font-medium">{message}</span>
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2, 3, 4].map(i => (
        <div
          key={i}
          className="rounded-2xl p-5 h-40"
          style={{ background: '#1A2340', border: '1px solid #263050' }}
        />
      ))}
    </div>
  )
}

// ── Input reutilizable ───────────────────────────────────────────────────────

function Field({ label, value, onChange, type = 'text', placeholder, help, disabled }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[0.8125rem] font-medium text-[#8A96B8]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(type === 'number' ? e.target.value : e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white border border-[#263050] bg-[#0F1628] focus:outline-none focus:border-[#C4CBD8] disabled:opacity-50"
      />
      {help && <p className="text-[0.75rem] text-[#4E5A7A]">{help}</p>}
    </div>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[0.8125rem] font-medium text-[#8A96B8]">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl px-3 py-2.5 text-[0.875rem] text-white border border-[#263050] bg-[#0F1628] focus:outline-none focus:border-[#C4CBD8]"
      >
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}

// ── SpAConfigPage ────────────────────────────────────────────────────────────

export default function SpAConfigPage() {
  const [config, setConfig]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)
  const [toast, setToast]     = useState(null)

  // Form state
  const [clpPerUsdt, setClpPerUsdt]       = useState('')
  const [usdtPerBob, setUsdtPerBob]       = useState('')
  const [minAmountCLP, setMinAmountCLP]   = useState('')
  const [maxAmountCLP, setMaxAmountCLP]   = useState('')
  const [bankName, setBankName]           = useState('')
  const [accountType, setAccountType]     = useState('Cuenta Corriente')
  const [accountNumber, setAccountNumber] = useState('')
  const [rut, setRut]                     = useState('')
  const [accountHolder, setAccountHolder] = useState('AV Finance SpA')
  const [bankEmail, setBankEmail]         = useState('')

  // Auto-calculated clpPerBob
  const clpPerBob = clpPerUsdt && usdtPerBob && +usdtPerBob > 0
    ? (+clpPerUsdt / +usdtPerBob).toFixed(2)
    : ''

  async function fetchConfig() {
    setLoading(true)
    setError(null)
    try {
      const data = await getSpaConfig()
      setConfig(data)
      setClpPerUsdt(data.clpPerUsdt ?? '')
      setUsdtPerBob(data.usdtPerBob ?? '')
      setMinAmountCLP(data.minAmountCLP ?? 10000)
      setMaxAmountCLP(data.maxAmountCLP ?? 5000000)
      setBankName(data.bankName ?? '')
      setAccountType(data.accountType ?? 'Cuenta Corriente')
      setAccountNumber(data.accountNumber ?? '')
      setRut(data.rut ?? '')
      setAccountHolder(data.accountHolder ?? 'AV Finance SpA')
      setBankEmail(data.bankEmail ?? '')
    } catch (err) {
      setError(err.message || 'Error al cargar configuracion')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchConfig() }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        clpPerBob:     Number(clpPerBob),
        clpPerUsdt:    Number(clpPerUsdt),
        usdtPerBob:    Number(usdtPerBob),
        minAmountCLP:  Number(minAmountCLP),
        maxAmountCLP:  Number(maxAmountCLP),
        bankName,
        accountType,
        accountNumber,
        rut,
        accountHolder,
        bankEmail,
      }
      const updated = await updateSpaConfig(payload)
      setConfig(updated)
      setToast('Configuracion actualizada')
    } catch (err) {
      setError(err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  function copyBankData() {
    const text = `Banco: ${bankName}\n${accountType} N: ${accountNumber}\nRUT: ${rut}\nTitular: ${accountHolder}`
    navigator.clipboard.writeText(text)
    setToast('Datos copiados')
  }

  // Simulacion de envio con tasa actual
  const refAmount = 100000
  const rate      = Number(clpPerBob) || 99.59
  const spread    = 1.5
  const fixed     = 300
  const profit    = 0.5
  const round2    = n => Math.round(n * 100) / 100
  const spreadFee = round2(refAmount * spread / 100)
  const profitFee = round2(refAmount * profit / 100)
  const totalFees = round2(spreadFee + fixed + profitFee)
  const netCLP    = round2(refAmount - totalFees)
  const estBOB    = round2(netCLP / rate)

  if (loading) return (
    <div className="space-y-6 p-4 md:p-8">
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <Settings2 size={22} className="text-[#C4CBD8]" /> Config SpA — Transferencias Chile
      </h1>
      <Skeleton />
    </div>
  )

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings2 size={22} className="text-[#C4CBD8]" /> Config SpA — Transferencias Chile
        </h1>
        <button
          onClick={fetchConfig}
          className="flex items-center gap-1.5 text-[0.8125rem] text-[#8A96B8] hover:text-white transition"
        >
          <RefreshCw size={14} /> Recargar
        </button>
      </div>

      {error && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-[0.875rem]"
          style={{ background: '#EF44441A', border: '1px solid #EF444433', color: '#EF4444' }}
        >
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* SECCION 1 — Tasa CLP/BOB */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: '#1A2340', border: '1px solid #263050' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <DollarSign size={18} className="text-[#C4CBD8]" />
          <h2 className="text-[0.9375rem] font-bold text-white">Tasa CLP / BOB</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Precio compra USDT en CLP"
            value={clpPerUsdt}
            onChange={setClpPerUsdt}
            type="number"
            placeholder="926.82"
            help="Precio al que compraste USDT con CLP en Binance P2P"
          />
          <Field
            label="Precio venta USDT en BOB"
            value={usdtPerBob}
            onChange={setUsdtPerBob}
            type="number"
            placeholder="9.31"
            help="Precio al que vendiste USDT por BOB en Binance P2P"
          />
        </div>

        {/* Resultado auto-calculado */}
        <div
          className="rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ background: '#0F1628', border: '1px solid #263050' }}
        >
          <div>
            <p className="text-[0.75rem] text-[#4E5A7A]">1 BOB equivale a (CLP) — calculado automáticamente</p>
            <p className="text-[1.125rem] font-bold tabular-nums" style={{ color: clpPerBob ? '#22C55E' : '#4E5A7A' }}>
              {clpPerBob || '—'}
              {clpPerBob && (
                <span className="text-[0.75rem] text-[#4E5A7A] font-normal ml-2">
                  = {clpPerUsdt} ÷ {usdtPerBob}
                </span>
              )}
            </p>
          </div>
        </div>

        {config?.updatedAt && (
          <p className="text-[0.75rem] text-[#4E5A7A]">
            Ultima actualizacion: {formatDate(config.updatedAt)}
          </p>
        )}

        {/* Simulacion */}
        <div
          className="rounded-xl p-4 space-y-2"
          style={{ background: '#0F1628', border: '1px solid #263050' }}
        >
          <p className="text-[0.8125rem] font-medium text-[#8A96B8]">
            Simulacion: envio de {refAmount.toLocaleString('es-CL')} CLP a Bolivia
          </p>
          <div className="grid grid-cols-2 gap-2 text-[0.8125rem]">
            <span className="text-[#4E5A7A]">Spread (1.5%)</span>
            <span className="text-white text-right">-{spreadFee.toLocaleString('es-CL')} CLP</span>
            <span className="text-[#4E5A7A]">Fee fijo</span>
            <span className="text-white text-right">-{fixed.toLocaleString('es-CL')} CLP</span>
            <span className="text-[#4E5A7A]">Retencion (0.5%)</span>
            <span className="text-white text-right">-{profitFee.toLocaleString('es-CL')} CLP</span>
            <span className="text-[#8A96B8] font-medium border-t border-[#263050] pt-1">Neto</span>
            <span className="text-white font-medium text-right border-t border-[#263050] pt-1">
              {netCLP.toLocaleString('es-CL')} CLP
            </span>
            <span className="text-[#22C55E] font-bold">Recibe Bolivia</span>
            <span className="text-[#22C55E] font-bold text-right">{estBOB.toFixed(2)} BOB</span>
          </div>
        </div>
      </div>

      {/* SECCION 2 — Limites */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: '#1A2340', border: '1px solid #263050' }}
      >
        <h2 className="text-[0.9375rem] font-bold text-white">Limites del corredor</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Monto minimo (CLP)"
            value={minAmountCLP}
            onChange={setMinAmountCLP}
            type="number"
            placeholder="10000"
          />
          <Field
            label="Monto maximo (CLP)"
            value={maxAmountCLP}
            onChange={setMaxAmountCLP}
            type="number"
            placeholder="5000000"
          />
        </div>
      </div>

      {/* SECCION 3 — Datos bancarios */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: '#1A2340', border: '1px solid #263050' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Building2 size={18} className="text-[#C4CBD8]" />
          <h2 className="text-[0.9375rem] font-bold text-white">Datos bancarios SpA</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Banco" value={bankName} onChange={setBankName} placeholder="Banco Santander" />
          <Select
            label="Tipo de cuenta"
            value={accountType}
            onChange={setAccountType}
            options={['Cuenta Corriente', 'Cuenta Vista', 'Cuenta de Ahorro']}
          />
          <Field label="Numero de cuenta" value={accountNumber} onChange={setAccountNumber} placeholder="00-00000-0" />
          <Field label="RUT" value={rut} onChange={setRut} placeholder="77.777.777-7" />
          <Field label="Nombre titular" value={accountHolder} onChange={setAccountHolder} placeholder="AV Finance SpA" />
          <Field label="Email bancario" value={bankEmail} onChange={setBankEmail} type="email" placeholder="pagos@avfinance.cl" />
        </div>
      </div>

      {/* SECCION 4 — Preview */}
      <div
        className="rounded-2xl p-5 space-y-3"
        style={{ background: '#1A2340', border: '1px solid #263050' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[0.9375rem] font-bold text-white">Preview — Asi lo ve el usuario</h2>
          <button
            onClick={copyBankData}
            className="flex items-center gap-1.5 text-[0.8125rem] text-[#8A96B8] hover:text-white transition"
          >
            <Copy size={14} /> Copiar datos
          </button>
        </div>

        <div
          className="rounded-xl p-4 space-y-1.5 text-[0.875rem]"
          style={{ background: '#0F1628', border: '1px solid #263050' }}
        >
          <p className="text-white">
            <span className="text-[#4E5A7A]">Banco:</span> {bankName || '—'}
          </p>
          <p className="text-white">
            <span className="text-[#4E5A7A]">{accountType} N:</span> {accountNumber || '—'}
          </p>
          <p className="text-white">
            <span className="text-[#4E5A7A]">RUT:</span> {rut || '—'}
          </p>
          <p className="text-white">
            <span className="text-[#4E5A7A]">Titular:</span> {accountHolder || '—'}
          </p>
        </div>
      </div>

      {/* Boton guardar */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[0.875rem] font-bold text-[#0F1628] transition disabled:opacity-50"
          style={{ background: '#C4CBD8' }}
        >
          <Save size={16} />
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
