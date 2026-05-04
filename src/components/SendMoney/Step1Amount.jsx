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
import { ChevronDown, ChevronUp, Clock, AlertCircle, RefreshCw, WifiOff, Loader2, Search, X, ChevronRight } from 'lucide-react'
import { useQuoteSocket } from '../../hooks/useQuoteSocket'
import { useAuth }        from '../../context/AuthContext'
import { listUserCorridors, getCurrentExchangeRates } from '../../services/paymentsService'

// ── Origen según entidad legal ────────────────────────────────────────────────

const ENTITY_ORIGIN = {
  SpA: { country: 'Chile',   currency: 'CLP', flag: '🇨🇱', symbol: '$',  currencyName: 'Peso chileno' },
  LLC: { country: 'EE.UU.',  currency: 'USD', flag: '🇺🇸', symbol: '$',  currencyName: 'Dólar'        },
  SRL: { country: 'Bolivia', currency: 'BOB', flag: '🇧🇴', symbol: 'Bs', currencyName: 'Boliviano'    },
}

// ── Info de países para enriquecer la respuesta del backend ──────────────────

const COUNTRY_INFO = {
  // LatAm — Vita
  CO: { name: 'Colombia',          currency: 'COP', currencyName: 'Peso Colombiano',    flagCode: 'co' },
  PE: { name: 'Perú',              currency: 'PEN', currencyName: 'Sol Peruano',         flagCode: 'pe' },
  BO: { name: 'Bolivia',           currency: 'BOB', currencyName: 'Boliviano',           flagCode: 'bo' },
  AR: { name: 'Argentina',         currency: 'ARS', currencyName: 'Peso Argentino',      flagCode: 'ar' },
  MX: { name: 'México',            currency: 'MXN', currencyName: 'Peso Mexicano',       flagCode: 'mx' },
  BR: { name: 'Brasil',            currency: 'BRL', currencyName: 'Real Brasileño',      flagCode: 'br' },
  CL: { name: 'Chile',             currency: 'CLP', currencyName: 'Peso Chileno',        flagCode: 'cl' },
  EC: { name: 'Ecuador',           currency: 'USD', currencyName: 'Dólar Americano',     flagCode: 'ec' },
  VE: { name: 'Venezuela',         currency: 'USD', currencyName: 'Dólar Americano',     flagCode: 've' },
  PY: { name: 'Paraguay',          currency: 'PYG', currencyName: 'Guaraní',             flagCode: 'py' },
  UY: { name: 'Uruguay',           currency: 'UYU', currencyName: 'Peso Uruguayo',       flagCode: 'uy' },
  CR: { name: 'Costa Rica',        currency: 'CRC', currencyName: 'Colón Costarricense', flagCode: 'cr' },
  PA: { name: 'Panamá',            currency: 'USD', currencyName: 'Dólar Americano',     flagCode: 'pa' },
  DO: { name: 'Rep. Dominicana',   currency: 'DOP', currencyName: 'Peso Dominicano',     flagCode: 'do' },
  GT: { name: 'Guatemala',         currency: 'GTQ', currencyName: 'Quetzal',             flagCode: 'gt' },
  // Global — OwlPay
  US: { name: 'Estados Unidos',    currency: 'USD', currencyName: 'Dólar Americano',     flagCode: 'us' },
  EU: { name: 'Europa',            currency: 'EUR', currencyName: 'Euro',                flagCode: 'eu' },
  CN: { name: 'China',             currency: 'CNY', currencyName: 'Yuan Chino',          flagCode: 'cn' },
  AE: { name: 'Emiratos Árabes',   currency: 'AED', currencyName: 'Dírham Emiratí',      flagCode: 'ae' },
  GB: { name: 'Reino Unido',       currency: 'GBP', currencyName: 'Libra Esterlina',     flagCode: 'gb' },
  CA: { name: 'Canadá',            currency: 'CAD', currencyName: 'Dólar Canadiense',    flagCode: 'ca' },
  AU: { name: 'Australia',         currency: 'AUD', currencyName: 'Dólar Australiano',   flagCode: 'au' },
  JP: { name: 'Japón',             currency: 'JPY', currencyName: 'Yen Japonés',         flagCode: 'jp' },
  IN: { name: 'India',             currency: 'INR', currencyName: 'Rupia India',         flagCode: 'in' },
  SG: { name: 'Singapur',          currency: 'SGD', currencyName: 'Dólar de Singapur',   flagCode: 'sg' },
}

/** URL de bandera desde flagcdn.com (imágenes reales circulares) */
function flagUrl(code) {
  return `https://flagcdn.com/w80/${code}.png`
}

/** Convierte la lista de corredores en opciones de país destino únicas */
function corridorsToCountries(corridors) {
  const seen = new Set()
  const result = []
  for (const c of corridors) {
    const code = c.destinationCountry
    if (!code || seen.has(code)) continue
    seen.add(code)
    const info = COUNTRY_INFO[code] ?? {}
    result.push({
      code,
      name:         info.name         ?? code,
      currency:     c.destinationCurrency ?? info.currency ?? '—',
      currencyName: info.currencyName  ?? '',
      flagCode:     info.flagCode      ?? code.toLowerCase(),
    })
  }
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
          <div className="h-3.5 bg-[#F0F2F7] rounded w-28" />
          <div className="h-3.5 bg-[#F0F2F7] rounded w-20" />
        </div>
      ))}
    </div>
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
      <span className="flex items-center gap-1 text-[0.625rem] font-semibold text-[#1D3461]">
        <Loader2 size={10} className="animate-spin" />
        Actualizando
      </span>
    )
  }
  return null
}

// ── Step1Amount ───────────────────────────────────────────────────────────────

// ── CountryPickerModal ────────────────────────────────────────────────────────

const SELECTED_BG = '#F5C518'   // amarillo dorado Alyto — igual que la imagen de referencia

function CountryPickerModal({ countries, selected, onSelect, onClose }) {
  const [query, setQuery] = useState('')
  const inputRef          = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const filtered = query.trim()
    ? countries.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.currency.toLowerCase().includes(query.toLowerCase()) ||
        c.currencyName.toLowerCase().includes(query.toLowerCase()) ||
        c.code.toLowerCase().includes(query.toLowerCase())
      )
    : countries

  return (
    <div
      onClick={onClose}
      style={{
        position:   'fixed',
        inset:      0,
        zIndex:     200,
        background: 'rgba(0,0,0,0.55)',
        display:    'flex',
        alignItems: 'flex-end',
      }}
    >
      {/* Panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:         '100%',
          background:    '#FFFFFF',
          borderRadius:  '24px 24px 0 0',
          maxHeight:     '85dvh',
          display:       'flex',
          flexDirection: 'column',
          boxShadow:     '0 -4px 32px rgba(0,0,0,0.20)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '20px 20px 0',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#0D1F3C' }}>
            Selecciona país destino
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#F4F6FA', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} color="#4A5568" />
          </button>
        </div>

        {/* Buscador */}
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={15}
              color="#94A3B8"
              style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar país o moneda…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                width:        '100%',
                boxSizing:    'border-box',
                paddingLeft:  38,
                paddingRight: 12,
                paddingTop:   10,
                paddingBottom:10,
                borderRadius: 12,
                border:       '1px solid #E2E8F0',
                background:   '#F4F6FA',
                fontSize:     '0.875rem',
                color:        '#0D1F3C',
                outline:      'none',
                fontFamily:   "'Manrope', sans-serif",
              }}
            />
          </div>
        </div>

        {/* Lista */}
        <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8', fontSize: '0.875rem' }}>
              Sin resultados para "{query}"
            </div>
          ) : filtered.map(c => {
            const isActive = selected?.code === c.code
            return (
              <button
                key={c.code}
                onClick={() => { onSelect(c); onClose() }}
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          14,
                  width:        '100%',
                  padding:      '12px 20px',
                  background:   isActive ? SELECTED_BG : 'transparent',
                  border:       'none',
                  borderBottom: '1px solid #F0F2F7',
                  cursor:       'pointer',
                  textAlign:    'left',
                  fontFamily:   "'Manrope', sans-serif",
                  transition:   'background 0.1s',
                }}
              >
                {/* Bandera real en círculo */}
                <img
                  src={flagUrl(c.flagCode)}
                  alt={c.name}
                  width={48}
                  height={48}
                  style={{
                    width:        48,
                    height:       48,
                    borderRadius: '50%',
                    objectFit:    'cover',
                    flexShrink:   0,
                    border:       '1px solid rgba(0,0,0,0.08)',
                    background:   '#F4F6FA',
                  }}
                  onError={e => {
                    e.currentTarget.style.display = 'none'
                    const span = document.createElement('span')
                    span.textContent = c.code
                    span.style.cssText = 'width:48px;height:48px;border-radius:50%;background:#E2E8F0;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;color:#4A5568;flex-shrink:0'
                    e.currentTarget.parentNode.insertBefore(span, e.currentTarget)
                  }}
                />

                {/* Texto */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: isActive ? 700 : 600, color: '#0D1F3C', lineHeight: 1.25 }}>
                    {c.name}
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.8125rem', color: isActive ? '#5A4000' : '#4A5568' }}>
                    {c.currency}{c.currencyName ? ` · ${c.currencyName}` : ''}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Step1Amount ───────────────────────────────────────────────────────────────

export default function Step1Amount({ initialData, onNext }) {
  const { user } = useAuth()
  const origin   = ENTITY_ORIGIN[user?.legalEntity] ?? ENTITY_ORIGIN.SpA

  const [amountFocused,  setAmountFocused]  = useState(false)
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
  const [showCountryModal, setShowCountryModal]  = useState(false)

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
        const list = corridorsToCountries(res.corridors ?? res)
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

  const activeCurrency = quote?.originCurrency ?? origin.currency

  const isBlocked   = status === 'connecting' || status === 'expired' ||
                      status === 'disconnected' || status === 'error'
  const canContinue = !!quote && !isBlocked && !!rawAmount && !!selectedCountry

  function handleNext() {
    if (!canContinue) return
    onNext({ originAmount: rawAmount, destinationCountry: selectedCountry.code, quote, quoteFetchedAt: Date.now() })
  }

  const destCountry    = selectedCountry || countries[0]
  const showQuoteBlock = rawAmount > 0 && selectedCountry

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5 px-4 pb-4">

      {/* ── Título ── */}
      <div>
        <h2 className="text-[1.125rem] font-bold text-[#0D1F3C]">¿Cuánto envías?</h2>
        <div
          style={{
            display:     'inline-flex',
            alignItems:  'center',
            gap:         6,
            background:  '#EEF2FF',
            borderRadius: 999,
            padding:     '4px 12px',
            marginTop:   8,
          }}
        >
          <span style={{ fontSize: 18 }}>{origin.flag}</span>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4A5568' }}>
            {origin.currencyName}
          </span>
          <span
            style={{
              fontSize:     '0.75rem',
              fontWeight:   700,
              color:        '#0D1F3C',
              background:   'white',
              padding:      '2px 8px',
              borderRadius: 999,
            }}
          >
            {origin.currency}
          </span>
        </div>
      </div>

      {/* ── Input de monto ── */}
      <div>
        <label className="block text-[0.75rem] font-semibold text-[#4A5568] uppercase tracking-[0.08em] mb-2">
          Monto a enviar
        </label>
        <div
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        12,
            padding:    '12px 16px',
            background: 'white',
            border:     amountFocused ? '1.5px solid #1D3461' : '1.5px solid #E2E8F0',
            borderRadius: 14,
            boxShadow:  amountFocused ? '0 0 0 3px rgba(29,52,97,0.08)' : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
        >
          <input
            type="text"
            inputMode="numeric"
            value={displayAmount}
            onChange={handleAmountChange}
            onFocus={() => setAmountFocused(true)}
            onBlur={() => setAmountFocused(false)}
            placeholder="0"
            style={{
              flex:       1,
              background: 'transparent',
              border:     'none',
              fontSize:   '2rem',
              fontWeight: 800,
              color:      displayAmount ? '#0D1F3C' : '#CBD5E1',
              outline:    'none',
              textAlign:  'left',
              fontFamily: "'Manrope', sans-serif",
              minWidth:   0,
            }}
          />
          <span
            style={{
              background:    '#1D3461',
              color:         'white',
              padding:       '6px 12px',
              borderRadius:  999,
              fontSize:      '0.8125rem',
              fontWeight:    700,
              letterSpacing: '0.04em',
              flexShrink:    0,
            }}
          >
            {activeCurrency}
          </span>
        </div>
      </div>

      {/* ── Selector de país destino ── */}
      <div>
        <label className="block text-[0.75rem] font-semibold text-[#4A5568] uppercase tracking-[0.08em] mb-2">
          País de destino
        </label>

        {corridorsLoading ? (
          <div className="h-[60px] rounded-xl bg-white border border-[#E2E8F0] animate-pulse" />
        ) : corridorsError ? (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#EF44441A] border border-[#EF444433]">
            <AlertCircle size={14} className="text-[#EF4444] flex-shrink-0" />
            <p className="text-[0.8125rem] text-[#EF4444]">{corridorsError}</p>
          </div>
        ) : countries.length === 0 ? (
          <div className="px-4 py-4 rounded-xl bg-white border border-[#E2E8F0] text-center">
            <p className="text-[0.8125rem] text-[#4A5568]">No hay destinos disponibles para tu cuenta.</p>
            <p className="text-[0.75rem] text-[#94A3B8] mt-1">Contáctanos para más información.</p>
          </div>
        ) : (
          /* Botón trigger del modal */
          <button
            type="button"
            onClick={() => setShowCountryModal(true)}
            style={{
              width:          '100%',
              display:        'flex',
              alignItems:     'center',
              gap:            12,
              padding:        '10px 16px',
              background:     '#FFFFFF',
              border:         showCountryModal ? '1.5px solid #1D3461' : '1px solid #E2E8F0',
              borderRadius:   14,
              cursor:         'pointer',
              transition:     'border-color 0.15s',
              boxShadow:      showCountryModal ? '0 0 0 3px rgba(29,52,97,0.08)' : 'none',
              fontFamily:     "'Manrope', sans-serif",
              textAlign:      'left',
            }}
          >
            {/* Bandera real en círculo */}
            {selectedCountry ? (
              <img
                src={flagUrl(selectedCountry.flagCode)}
                alt={selectedCountry.name}
                width={44}
                height={44}
                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(0,0,0,0.08)' }}
              />
            ) : (
              <div
                style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: '#F4F6FA', border: '1px solid #E2E8F0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem', flexShrink: 0,
                }}
              >
                🌎
              </div>
            )}

            {/* Texto */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {selectedCountry ? (
                <>
                  <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0D1F3C', lineHeight: 1.2 }}>
                    {selectedCountry.name}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#4A5568' }}>
                    {selectedCountry.currency} · {selectedCountry.code}
                  </p>
                </>
              ) : (
                <p style={{ margin: 0, fontSize: '0.9375rem', color: '#94A3B8' }}>Selecciona un país</p>
              )}
            </div>

            <ChevronRight size={16} color="#94A3B8" style={{ flexShrink: 0 }} />
          </button>
        )}
      </div>

      {/* ── Bloque de cotización ── */}
      {showQuoteBlock && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4">

          {status === 'connecting' && <QuoteSkeleton />}

          {status === 'disconnected' && (
            <div className="flex items-center gap-3">
              <WifiOff size={15} className="text-[#F97316] flex-shrink-0" />
              <p className="flex-1 text-[0.8125rem] text-[#F97316] font-medium">
                Reconectando cotización…
              </p>
              <button
                onClick={reconnect}
                className="flex items-center gap-1 text-[0.75rem] text-[#1D3461] hover:text-[#0D1F3C] transition-colors"
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
                    <p className="text-[0.8125rem] text-[#0D1F3C] font-semibold">
                      {selectedCountry?.flag} {selectedCountry?.name}
                    </p>
                    <span className="text-[0.625rem] font-bold text-[#F59E0B] bg-[#F59E0B1A] border border-[#F59E0B33] px-2 py-0.5 rounded-full uppercase tracking-wide">
                      Próximamente
                    </span>
                  </div>
                  <p className="text-[0.75rem] text-[#4A5568] mt-0.5">
                    Este corredor estará disponible pronto.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <AlertCircle size={16} className="text-[#EF4444] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[0.8125rem] text-[#EF4444] font-medium">Error de cotización</p>
                  <p className="text-[0.75rem] text-[#4A5568] mt-0.5">{error}</p>
                </div>
                <button
                  onClick={reconnect}
                  className="flex items-center gap-1 text-[0.75rem] text-[#1D3461] hover:text-[#0D1F3C] transition-colors flex-shrink-0"
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
                <span className="text-[0.8125rem] text-[#4A5568]">{destCountry?.name} recibe</span>
                <div className="flex items-center gap-2">
                  {status === 'updating' && <Loader2 size={13} className="animate-spin text-[#1D3461]" />}
                  <span className="text-[1.125rem] font-bold text-[#22C55E]">
                    {formatDestAmount(quote.destinationAmount, quote.destinationCurrency)}
                  </span>
                </div>
              </div>

              {/* Tasa */}
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[0.75rem] text-[#4A5568]">Tasa aplicada</span>
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
                  <span className="text-[0.8125rem] font-semibold text-[#1D3461]">
                    1 {activeCurrency} = {Number(quote.exchangeRate).toFixed(4)} {quote.destinationCurrency}
                  </span>
                </div>
              </div>

              {/* Costo del envío */}
              {(() => {
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
                      <span className="text-[0.75rem] text-[#4A5568]">Costo del envío</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[0.8125rem] font-semibold text-[#0D1F3C]">
                          {totalCosto > 0 ? `${origin.symbol}${totalCosto.toLocaleString('es-CL')} ${activeCurrency}` : '—'}
                        </span>
                        {feesExpanded
                          ? <ChevronUp   size={14} className="text-[#94A3B8]" />
                          : <ChevronDown size={14} className="text-[#94A3B8]" />
                        }
                      </div>
                    </button>

                    {feesExpanded && (
                      <div className="mt-2 pt-3 border-t border-[#E2E8F0] space-y-2">
                        {comisionServicio > 0 && (
                          <div className="flex justify-between">
                            <span className="text-[0.6875rem] text-[#94A3B8]">· Comisión de servicio</span>
                            <span className="text-[0.6875rem] text-[#4A5568]">
                              {origin.symbol}{comisionServicio.toLocaleString('es-CL')} {activeCurrency}
                            </span>
                          </div>
                        )}
                        {feeProcesamiento > 0 && (
                          <div className="flex justify-between">
                            <span className="text-[0.6875rem] text-[#94A3B8]">· Fee de procesamiento</span>
                            <span className="text-[0.6875rem] text-[#4A5568]">
                              {origin.symbol}{feeProcesamiento.toLocaleString('es-CL')} {activeCurrency}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )
              })()}

              <div className="my-3 border-t border-[#E2E8F0]" />

              {/* Tasa BOB/USDT — solo para corredores Bolivia */}
              {activeCurrency === 'BOB' && bobRateInfo && (
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[0.75rem] text-[#94A3B8]">Tasa usada:</span>
                    <span className="text-[0.8125rem] font-semibold text-[#1D3461]">
                      1 {bobRateInfo.pair?.split('/')[1] ?? 'USDT'} = {Number(bobRateInfo.rate).toFixed(2)} BOB
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isBobRateStale(bobRateInfo.updatedAt) ? (
                      <span className="text-[0.6875rem] font-semibold px-2 py-0.5 rounded-full bg-[#F59E0B0F] border border-[#FBBF2430] text-[#FBBF24]">
                        ⚠️ Tasa desactualizada
                      </span>
                    ) : (
                      <span className="text-[0.6875rem] text-[#94A3B8]">
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
                    className="flex items-center gap-1 text-[0.75rem] text-[#1D3461] hover:text-[#0D1F3C] transition-colors"
                  >
                    <RefreshCw size={13} /> Actualizar
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-[#4A5568]">
                    <Clock size={13} />
                    <span className="text-[0.75rem]">{quote.estimatedDelivery || '1 día hábil'}</span>
                  </div>
                  {countdown !== null && (
                    <div className="flex items-center gap-1 text-[0.6875rem] text-[#94A3B8]">
                      <span>Cotización válida</span>
                      <span className={`font-mono font-semibold ${countdown <= 30 ? 'text-[#F59E0B]' : 'text-[#1D3461]'}`}>
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
            ? 'bg-[#1D3461] text-white shadow-[0_4px_20px_rgba(29,52,97,0.25)] active:scale-[0.98]'
            : 'bg-[#1D346140] text-[#94A3B8] cursor-not-allowed'
        }`}
      >
        Continuar
      </button>

      {/* ── Modal selector de país ── */}
      {showCountryModal && (
        <CountryPickerModal
          countries={countries}
          selected={selectedCountry}
          onSelect={setSelectedCountry}
          onClose={() => setShowCountryModal(false)}
        />
      )}
    </div>
  )
}
