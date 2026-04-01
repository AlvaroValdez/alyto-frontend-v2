/**
 * Step1Amount.jsx — "¿Cuánto envías y a dónde?"
 *
 * - Lista de países destino obtenida del backend (GET /payments/corridors)
 *   filtrada por la entidad del usuario autenticado — sin hardcode.
 * - Input en la moneda del usuario (CLP/BOB/USD según legalEntity).
 * - Cotización en tiempo real vía WebSocket (useQuoteSocket).
 * - Desglose de fees colapsable.
 * - Contador regresivo de la cotización.
 */

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ChevronUp, Clock, AlertCircle, RefreshCw, WifiOff, Loader2, Search, X, ChevronRight, Check } from 'lucide-react'
import { useQuoteSocket } from '../../hooks/useQuoteSocket'
import { useAuth }        from '../../context/AuthContext'
import { listUserCorridors, getCurrentExchangeRates } from '../../services/paymentsService'

// ── Origen según entidad legal ────────────────────────────────────────────────

const ENTITY_ORIGIN = {
  SpA: { country: 'Chile',   currency: 'CLP', flag: '🇨🇱', symbol: '$'  },
  LLC: { country: 'EE.UU.',  currency: 'USD', flag: '🇺🇸', symbol: '$'  },
  SRL: { country: 'Bolivia', currency: 'BOB', flag: '🇧🇴', symbol: 'Bs' },
}

// ── Info de países para enriquecer la respuesta del backend ──────────────────

const COUNTRY_INFO = {
  // LatAm — Vita
  CO: { name: 'Colombia',          currency: 'COP', flag: '🇨🇴' },
  PE: { name: 'Perú',              currency: 'PEN', flag: '🇵🇪' },
  BO: { name: 'Bolivia',           currency: 'BOB', flag: '🇧🇴' },
  AR: { name: 'Argentina',         currency: 'ARS', flag: '🇦🇷' },
  MX: { name: 'México',            currency: 'MXN', flag: '🇲🇽' },
  BR: { name: 'Brasil',            currency: 'BRL', flag: '🇧🇷' },
  CL: { name: 'Chile',             currency: 'CLP', flag: '🇨🇱' },
  EC: { name: 'Ecuador',           currency: 'USD', flag: '🇪🇨' },
  VE: { name: 'Venezuela',         currency: 'USD', flag: '🇻🇪' },
  PY: { name: 'Paraguay',          currency: 'PYG', flag: '🇵🇾' },
  UY: { name: 'Uruguay',           currency: 'UYU', flag: '🇺🇾' },
  CR: { name: 'Costa Rica',        currency: 'CRC', flag: '🇨🇷' },
  PA: { name: 'Panamá',            currency: 'USD', flag: '🇵🇦' },
  DO: { name: 'Rep. Dominicana',   currency: 'DOP', flag: '🇩🇴' },
  GT: { name: 'Guatemala',         currency: 'GTQ', flag: '🇬🇹' },
  HT: { name: 'Haití',             currency: 'HTG', flag: '🇭🇹' },
  SV: { name: 'El Salvador',       currency: 'USD', flag: '🇸🇻' },
  ES: { name: 'España',            currency: 'EUR', flag: '🇪🇸' },
  PL: { name: 'Polonia',           currency: 'PLN', flag: '🇵🇱' },
  // Global — OwlPay
  US: { name: 'Estados Unidos',    currency: 'USD', flag: '🇺🇸' },
  EU: { name: 'Europa (EUR)',       currency: 'EUR', flag: '🇪🇺' },
  CN: { name: 'China',             currency: 'CNY', flag: '🇨🇳' },
  AE: { name: 'Emiratos Árabes',   currency: 'AED', flag: '🇦🇪' },
  GB: { name: 'Reino Unido',       currency: 'GBP', flag: '🇬🇧' },
  CA: { name: 'Canadá',            currency: 'CAD', flag: '🇨🇦' },
  AU: { name: 'Australia',         currency: 'AUD', flag: '🇦🇺' },
  JP: { name: 'Japón',             currency: 'JPY', flag: '🇯🇵' },
  IN: { name: 'India',             currency: 'INR', flag: '🇮🇳' },
  SG: { name: 'Singapur',          currency: 'SGD', flag: '🇸🇬' },
}

const COUNTRY_PRIORITY = {
  SpA: ['CO', 'PE', 'AR', 'MX', 'BR', 'US', 'EC', 'VE', 'PY', 'UY', 'BO', 'EU', 'CN', 'AE', 'GB'],
  SRL: ['CO', 'PE', 'CL', 'AR', 'MX', 'BR', 'EC', 'VE', 'PY', 'UY', 'US', 'EU', 'CN', 'AE', 'GB'],
  LLC: ['CO', 'PE', 'AR', 'MX', 'BR', 'CL', 'EU', 'CN', 'AE', 'US', 'GB'],
}

/** Convierte la lista de corredores en opciones de país destino únicas, ordenadas por relevancia */
function corridorsToCountries(corridors, legalEntity = 'SpA') {
  const seen   = new Set()
  const result = []
  for (const c of corridors) {
    const code = c.destinationCountry
    if (!code || seen.has(code)) continue
    seen.add(code)
    const info = COUNTRY_INFO[code] ?? {}
    result.push({
      code,
      name:     info.name     ?? code,
      currency: c.destinationCurrency ?? info.currency ?? '—',
      flag:     info.flag     ?? '🌍',
    })
  }
  const priority = COUNTRY_PRIORITY[legalEntity] ?? []
  result.sort((a, b) => {
    const ia = priority.indexOf(a.code)
    const ib = priority.indexOf(b.code)
    if (ia === -1 && ib === -1) return a.name.localeCompare(b.name)
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
  return result
}

// ── Formatters ────────────────────────────────────────────────────────────────

function formatAmount(value) {
  if (!value) return ''
  const num = parseInt(value.replace(/\D/g, ''), 10)
  if (isNaN(num)) return ''
  return num.toLocaleString('es-CL')
}

function formatDestAmount(amount, currency) {
  if (!amount) return '—'
  return `${Number(amount).toLocaleString('es-CL')} ${currency}`
}

function timeAgoShort(iso) {
  if (!iso) return null
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return 'ahora'
  if (mins  < 60) return `${mins} min`
  if (hours < 24) return `${hours}h`
  return `${days}d`
}

function isBobRateStale(iso) {
  if (!iso) return true
  return (Date.now() - new Date(iso).getTime()) > 24 * 3_600_000
}

function formatCountdown(secs) {
  if (!secs || secs <= 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function QuoteSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex justify-between">
          <div className="h-3.5 bg-[#1F2B4D] rounded w-28" />
          <div className="h-3.5 bg-[#1F2B4D] rounded w-20" />
        </div>
      ))}
    </div>
  )
}

// ── CountryPickerModal ────────────────────────────────────────────────────────

function CountryPickerModal({ countries, selected, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  const filtered = search.trim()
    ? countries.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.currency.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      )
    : countries

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={handleBackdrop}
    >
      <div
        className="w-full max-w-sm rounded-2xl flex flex-col"
        style={{
          background: '#0F1628',
          border: '1px solid #263050',
          maxHeight: '70vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#263050] flex-shrink-0">
          <p className="text-[1rem] font-bold text-white">¿A dónde envías?</p>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1A2340] border border-[#263050] flex items-center justify-center"
          >
            <X size={14} className="text-[#8A96B8]" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#4E5A7A]" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar país o moneda…"
              className="w-full bg-[#1A2340] border border-[#263050] rounded-xl pl-9 pr-4 py-2.5 text-[0.875rem] text-white placeholder:text-[#4E5A7A] focus:outline-none focus:border-[#C4CBD8] transition-colors"
            />
          </div>
        </div>

        {/* Country list */}
        <div className="flex-1 overflow-y-auto pb-4">
          {filtered.map((c, idx) => (
            <button
              key={c.code}
              onClick={() => { onSelect(c); onClose() }}
              className={`w-full flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[#1A2340] active:bg-[#1A2340] ${
                idx < filtered.length - 1 ? 'border-b border-[#1A234060]' : ''
              } ${selected?.code === c.code ? 'bg-[#1A234080]' : ''}`}
            >
              {/* Flag */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-xl"
                style={{ background: '#0F1628', border: '1px solid #263050' }}
              >
                {c.flag}
              </div>

              {/* Nombre + moneda */}
              <div className="flex-1 text-left min-w-0">
                <p className="text-[0.9375rem] font-semibold text-white leading-tight truncate">
                  {c.name}
                </p>
                <p className="text-[0.75rem] text-[#8A96B8]">{c.currency}</p>
              </div>

              {/* Checkmark si está seleccionado */}
              {selected?.code === c.code && (
                <div className="w-5 h-5 rounded-full bg-[#1D9E75] flex items-center justify-center flex-shrink-0">
                  <Check size={11} className="text-white" />
                </div>
              )}
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="px-5 py-10 text-center">
              <p className="text-[0.875rem] text-[#4E5A7A]">No se encontraron países</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  if (status === 'connected') {
    return (
      <span className="flex items-center gap-1 text-[0.625rem] font-semibold text-[#22C55E]">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#22C55E]" />
        </span>
        En vivo
      </span>
    )
  }
  if (status === 'updating') {
    return (
      <span className="flex items-center gap-1 text-[0.625rem] font-semibold text-[#C4CBD8]">
        <Loader2 size={10} className="animate-spin" />
        Actualizando
      </span>
    )
  }
  return null
}

// ── Step1Amount ───────────────────────────────────────────────────────────────

export default function Step1Amount({ initialData, onNext }) {
  const { user } = useAuth()
  const origin   = ENTITY_ORIGIN[user?.legalEntity] ?? ENTITY_ORIGIN.SpA

  const [rawAmount,      setRawAmount]      = useState(initialData?.originAmount || 0)
  const [displayAmount,  setDisplayAmount]  = useState(
    initialData?.originAmount ? formatAmount(String(initialData.originAmount)) : '',
  )
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [countries,        setCountries]       = useState([])
  const [corridorsLoading, setCorridorsLoading] = useState(true)
  const [corridorsError,   setCorridorsError]   = useState(null)
  const [feesExpanded,     setFeesExpanded]      = useState(false)
  const [bobRateInfo,      setBobRateInfo]       = useState(null)  // { rate, source, updatedAt }
  const [showCountryModal, setShowCountryModal] = useState(false)

  // ── Cargar tasa BOB/USDT cuando el origen es Bolivia ─────────────────────

  useEffect(() => {
    if (origin.currency !== 'BOB') return
    let cancelled = false
    getCurrentExchangeRates()
      .then(res => {
        if (cancelled) return
        const rates   = res.rates ?? res ?? []
        const bobUsdt = rates.find(r => r.pair === 'BOB/USDT' || r.pair === 'BOB/USDC')
        if (bobUsdt) setBobRateInfo(bobUsdt)
      })
      .catch(() => { /* opcional — no bloquea la cotización */ })
    return () => { cancelled = true }
  }, [origin.currency])

  // ── Cargar corredores del backend ─────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    setCorridorsLoading(true)
    setCorridorsError(null)
    listUserCorridors()
      .then(res => {
        if (cancelled) return
        const list = corridorsToCountries(res.corridors ?? res, user?.legalEntity)
        setCountries(list)
        // Restaurar selección si venimos de initialData
        if (initialData?.destinationCountry) {
          const found = list.find(c => c.code === initialData.destinationCountry)
          if (found) setSelectedCountry(found)
        }
      })
      .catch(err => {
        if (!cancelled) setCorridorsError(err.message || 'No se pudieron cargar los destinos.')
      })
      .finally(() => { if (!cancelled) setCorridorsLoading(false) })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── WebSocket quote ───────────────────────────────────────────────────────

  const { quote, status, error, isStale, countdown, reconnect } =
    useQuoteSocket(rawAmount || null, selectedCountry?.code || null)

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleAmountChange(e) {
    const digits = e.target.value.replace(/\D/g, '')
    const num    = parseInt(digits, 10) || 0
    setRawAmount(num)
    setDisplayAmount(num ? num.toLocaleString('es-CL') : '')
  }

  function handleCountrySelect(country) {
    setSelectedCountry(country)
  }

  const activeCurrency = quote?.originCurrency ?? origin.currency

  const isBlocked   = status === 'connecting' || status === 'expired' ||
                      status === 'disconnected' || status === 'error'
  const canContinue = !!quote && !isBlocked && !!rawAmount && !!selectedCountry

  function handleNext() {
    if (!canContinue) return
    onNext({ originAmount: rawAmount, destinationCountry: selectedCountry.code, quote })
  }

  const destCountry    = selectedCountry || countries[0]
  const showQuoteBlock = rawAmount > 0 && selectedCountry

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5 px-4 pb-4">

      {/* ── Título ── */}
      <div>
        <h2 className="text-[1.125rem] font-bold text-white">¿Cuánto envías?</h2>
        <p className="text-[0.8125rem] text-[#8A96B8] mt-0.5">
          {origin.flag} Tu cuenta está en {origin.country} · {origin.currency}
        </p>
      </div>

      {/* ── Input de monto ── */}
      <div>
        <label className="block text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-wide mb-2">
          Monto a enviar
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A96B8] font-bold text-[1.125rem]">
            {origin.symbol}
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={displayAmount}
            onChange={handleAmountChange}
            placeholder="0"
            className={`w-full bg-[#1A2340] border border-[#263050] rounded-xl pr-16 py-4 text-white text-[1.5rem] font-bold focus:outline-none focus:border-[#C4CBD8] focus:shadow-[0_0_0_2px_#C4CBD820] transition-all placeholder:text-[#4E5A7A] ${origin.symbol.length > 1 ? 'pl-14' : 'pl-8'}`}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[0.75rem] font-semibold text-[#4E5A7A]">
            {activeCurrency}
          </span>
        </div>
      </div>

      {/* ── Selector de país destino ── */}
      <div>
        <label className="block text-[0.75rem] font-semibold text-[#8A96B8] uppercase tracking-wide mb-2">
          País de destino
        </label>

        {corridorsLoading ? (
          /* Skeleton del selector */
          <div className="h-14 rounded-xl bg-[#1A2340] border border-[#263050] animate-pulse" />
        ) : corridorsError ? (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
            <AlertCircle size={14} className="text-[#EF4444] flex-shrink-0" />
            <p className="text-[0.8125rem] text-[#EF4444]">{corridorsError}</p>
          </div>
        ) : countries.length === 0 ? (
          <div className="px-4 py-4 rounded-xl bg-[#1A2340] border border-[#263050] text-center">
            <p className="text-[0.8125rem] text-[#8A96B8]">
              No hay destinos disponibles para tu cuenta.
            </p>
            <p className="text-[0.75rem] text-[#4E5A7A] mt-1">
              Contáctanos para más información.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCountryModal(true)}
            className="w-full flex items-center gap-3 bg-[#1A2340] border border-[#263050] rounded-xl px-4 py-3.5 transition-all hover:border-[#C4CBD840] active:scale-[0.99] focus:outline-none focus:border-[#C4CBD8]"
          >
            {/* Flag circle */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xl"
              style={{ background: '#0F1628', border: '1px solid #263050' }}
            >
              {selectedCountry?.flag || '🌎'}
            </div>

            {/* Text */}
            <div className="flex-1 text-left min-w-0">
              {selectedCountry ? (
                <>
                  <p className="text-[0.9375rem] font-semibold text-white leading-tight">
                    {selectedCountry.name}
                  </p>
                  <p className="text-[0.75rem] text-[#8A96B8]">{selectedCountry.currency}</p>
                </>
              ) : (
                <p className="text-[0.9375rem] text-[#4E5A7A]">Selecciona un país</p>
              )}
            </div>

            <ChevronRight size={16} className="text-[#4E5A7A] flex-shrink-0" />
          </button>
        )}
      </div>

      {/* ── Bloque de cotización ── */}
      {showQuoteBlock && (
        <div className="bg-[#1A2340] border border-[#263050] rounded-2xl p-4">

          {status === 'connecting' && <QuoteSkeleton />}

          {status === 'disconnected' && (
            <div className="flex items-center gap-3">
              <WifiOff size={15} className="text-[#F97316] flex-shrink-0" />
              <p className="flex-1 text-[0.8125rem] text-[#F97316] font-medium">
                Reconectando cotización…
              </p>
              <button
                onClick={reconnect}
                className="flex items-center gap-1 text-[0.75rem] text-[#C4CBD8] hover:text-white transition-colors"
              >
                <RefreshCw size={13} /> Reintentar
              </button>
            </div>
          )}

          {status === 'error' && (
            error?.includes('Corredor no disponible') ? (
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(245,158,11,0.12)' }}
                >
                  <Clock size={15} className="text-[#F59E0B]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[0.8125rem] text-white font-semibold">
                      {selectedCountry?.flag} {selectedCountry?.name}
                    </p>
                    <span className="text-[0.625rem] font-bold text-[#F59E0B] bg-[#F59E0B1A] border border-[#F59E0B33] px-2 py-0.5 rounded-full uppercase tracking-wide">
                      Próximamente
                    </span>
                  </div>
                  <p className="text-[0.75rem] text-[#8A96B8] mt-0.5">
                    Este corredor estará disponible pronto.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <AlertCircle size={16} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[0.8125rem] text-[#EF4444] font-medium">Error de cotización</p>
                  <p className="text-[0.75rem] text-[#8A96B8] mt-0.5">{error}</p>
                </div>
                <button
                  onClick={reconnect}
                  className="flex items-center gap-1 text-[0.75rem] text-[#C4CBD8] hover:text-white transition-colors flex-shrink-0"
                >
                  <RefreshCw size={13} /> Reintentar
                </button>
              </div>
            )
          )}

          {quote && status !== 'connecting' && status !== 'disconnected' && status !== 'error' && (
            <>
              {/* Recibe */}
              <div className="flex justify-between items-center mb-3">
                <span className="text-[0.8125rem] text-[#8A96B8]">{destCountry?.name} recibe</span>
                <div className="flex items-center gap-2">
                  {status === 'updating' && <Loader2 size={13} className="animate-spin text-[#C4CBD8]" />}
                  <span className="text-[1.125rem] font-bold text-[#22C55E]">
                    {formatDestAmount(quote.destinationAmount, quote.destinationCurrency)}
                  </span>
                </div>
              </div>

              {/* Tasa */}
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[0.75rem] text-[#8A96B8]">Tasa aplicada</span>
                  {isStale && (
                    <span
                      className="text-[0.5625rem] font-semibold text-[#F59E0B] bg-[#F59E0B1A] px-1.5 py-0.5 rounded"
                      title="La tasa puede haber cambiado — reconectando"
                    >
                      ⚠ Referencial
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={status} />
                  <span className="text-[0.8125rem] font-semibold text-[#C4CBD8]">
                    1 {activeCurrency} = {Number(quote.exchangeRate).toFixed(4)} {quote.destinationCurrency}
                  </span>
                </div>
              </div>

              {/* Costo del envío — oculto en corredor manual (comisión absorbida en tasa) */}
              {!quote.isManualCorridor && (() => {
                const f = quote.fees || {}
                const totalCosto =
                  (f.alytoCSpread || 0) + (f.fixedFee || 0) +
                  (f.payinFee     || 0) + (f.payoutFee || 0)
                const comisionServicio = (f.alytoCSpread || 0) + (f.fixedFee || 0)
                const feeProcesamiento = (f.payinFee     || 0) + (f.payoutFee || 0)
                return (
                  <>
                    <button
                      onClick={() => setFeesExpanded(v => !v)}
                      className="w-full flex justify-between items-center py-1"
                    >
                      <span className="text-[0.75rem] text-[#8A96B8]">Costo del envío</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[0.8125rem] font-semibold text-white">
                          {totalCosto > 0 ? `${origin.symbol}${totalCosto.toLocaleString('es-CL')} ${activeCurrency}` : '—'}
                        </span>
                        {feesExpanded
                          ? <ChevronUp   size={14} className="text-[#4E5A7A]" />
                          : <ChevronDown size={14} className="text-[#4E5A7A]" />
                        }
                      </div>
                    </button>

                    {feesExpanded && (
                      <div className="mt-2 pt-3 border-t border-[#263050] space-y-2">
                        {comisionServicio > 0 && (
                          <div className="flex justify-between">
                            <span className="text-[0.6875rem] text-[#4E5A7A]">· Comisión de servicio</span>
                            <span className="text-[0.6875rem] text-[#8A96B8]">
                              {origin.symbol}{comisionServicio.toLocaleString('es-CL')} {activeCurrency}
                            </span>
                          </div>
                        )}
                        {feeProcesamiento > 0 && (
                          <div className="flex justify-between">
                            <span className="text-[0.6875rem] text-[#4E5A7A]">· Fee de procesamiento</span>
                            <span className="text-[0.6875rem] text-[#8A96B8]">
                              {origin.symbol}{feeProcesamiento.toLocaleString('es-CL')} {activeCurrency}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )
              })()}

              {!quote.isManualCorridor && <div className="my-3 border-t border-[#263050]" />}

              {/* Tasa BOB/USDT — solo para corredores Bolivia vía Vita (no manual) */}
              {!quote.isManualCorridor && activeCurrency === 'BOB' && bobRateInfo && (
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[0.75rem] text-[#4E5A7A]">Tasa usada:</span>
                    <span className="text-[0.8125rem] font-semibold text-[#C4CBD8]">
                      1 {bobRateInfo.pair?.split('/')[1] ?? 'USDT'} = {Number(bobRateInfo.rate).toFixed(2)} BOB
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isBobRateStale(bobRateInfo.updatedAt) ? (
                      <span className="text-[0.6875rem] font-semibold px-2 py-0.5 rounded-full bg-[#F59E0B0F] border border-[#FBBF2430] text-[#FBBF24]">
                        ⚠️ Tasa desactualizada
                      </span>
                    ) : (
                      <span className="text-[0.6875rem] text-[#4E5A7A]">
                        {bobRateInfo.source ?? 'Binance P2P'} · {timeAgoShort(bobRateInfo.updatedAt)}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Pie */}
              {status === 'expired' ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[#F59E0B]">
                    <AlertCircle size={13} />
                    <span className="text-[0.75rem] font-medium">Cotización caducada</span>
                  </div>
                  <button
                    onClick={reconnect}
                    className="flex items-center gap-1 text-[0.75rem] text-[#C4CBD8] hover:text-white transition-colors"
                  >
                    <RefreshCw size={13} /> Actualizar
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-[#8A96B8]">
                    <Clock size={13} />
                    <span className="text-[0.75rem]">{quote.estimatedDelivery || '1 día hábil'}</span>
                  </div>
                  {countdown !== null && (
                    <div className="flex items-center gap-1 text-[0.6875rem] text-[#4E5A7A]">
                      <span>Cotización válida</span>
                      <span className={`font-mono font-semibold ${countdown <= 30 ? 'text-[#F59E0B]' : 'text-[#C4CBD8]'}`}>
                        {formatCountdown(countdown)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Botón continuar ── */}
      <button
        onClick={handleNext}
        disabled={!canContinue}
        className={`w-full py-4 rounded-2xl text-[0.9375rem] font-bold transition-all duration-150 ${
          canContinue
            ? 'bg-[#C4CBD8] text-[#0F1628] shadow-[0_4px_20px_rgba(196,203,216,0.3)] active:scale-[0.98]'
            : 'bg-[#C4CBD840] text-[#4E5A7A] cursor-not-allowed'
        }`}
      >
        Continuar
      </button>

      {/* ── Modal selector de país ── */}
      {showCountryModal && (
        <CountryPickerModal
          countries={countries}
          selected={selectedCountry}
          onSelect={handleCountrySelect}
          onClose={() => setShowCountryModal(false)}
        />
      )}
    </div>
  )
}
