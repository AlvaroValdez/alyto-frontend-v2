import { useState, useEffect } from 'react'
import { useAuth }            from '../../context/AuthContext'
import { useDashboard }       from '../../hooks/useDashboard'
import { listUserCorridors }  from '../../services/paymentsService'
import WelcomeBanner          from './WelcomeBanner'
import QuickActions           from './QuickActions'
import RecentTransactions     from './RecentTransactions'

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }) {
  return (
    <div
      style={{
        flexShrink:   0,
        width:        144,
        background:   'var(--color-bg-secondary)',
        borderRadius: 'var(--radius-xl)',
        padding:      16,
        border:       '1px solid var(--color-border)',
        boxShadow:    'var(--shadow-card)',
      }}
    >
      <p className="label-uppercase" style={{ marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </p>
      <p style={{ fontSize: '1.125rem', fontWeight: 700, color: accent ?? 'var(--color-text-primary)', lineHeight: 1 }}>
        {value}
      </p>
    </div>
  )
}

function StatsSkeletons() {
  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 mb-2 pb-1">
      {[1,2,3,4].map(i => (
        <div
          key={i}
          style={{
            flexShrink: 0, width: 144, borderRadius: 'var(--radius-xl)',
            padding: 16, border: '1px solid var(--color-border)',
            background: 'var(--color-bg-secondary)',
          }}
        >
          <div className="skeleton-line" style={{ height: 10, width: '80%', marginBottom: 12 }} />
          <div className="skeleton-line" style={{ height: 18, width: '60%' }} />
        </div>
      ))}
    </div>
  )
}

// ── Country meta ──────────────────────────────────────────────────────────────

const COUNTRY_META = {
  CO: { name: 'Colombia',         currencyName: 'Peso colombiano',    flag: '🇨🇴' },
  PE: { name: 'Perú',             currencyName: 'Sol peruano',         flag: '🇵🇪' },
  BO: { name: 'Bolivia',          currencyName: 'Boliviano',           flag: '🇧🇴' },
  AR: { name: 'Argentina',        currencyName: 'Peso argentino',      flag: '🇦🇷' },
  MX: { name: 'México',           currencyName: 'Peso mexicano',       flag: '🇲🇽' },
  BR: { name: 'Brasil',           currencyName: 'Real brasileño',      flag: '🇧🇷' },
  CL: { name: 'Chile',            currencyName: 'Peso chileno',        flag: '🇨🇱' },
  EC: { name: 'Ecuador',          currencyName: 'Dólar',               flag: '🇪🇨' },
  VE: { name: 'Venezuela',        currencyName: 'Dólar',               flag: '🇻🇪' },
  PY: { name: 'Paraguay',         currencyName: 'Guaraní',             flag: '🇵🇾' },
  UY: { name: 'Uruguay',          currencyName: 'Peso uruguayo',       flag: '🇺🇾' },
  CR: { name: 'Costa Rica',       currencyName: 'Colón',               flag: '🇨🇷' },
  PA: { name: 'Panamá',           currencyName: 'Dólar',               flag: '🇵🇦' },
  DO: { name: 'Rep. Dominicana',  currencyName: 'Peso dominicano',     flag: '🇩🇴' },
  GT: { name: 'Guatemala',        currencyName: 'Quetzal',             flag: '🇬🇹' },
  HT: { name: 'Haití',            currencyName: 'Gourde',              flag: '🇭🇹' },
  SV: { name: 'El Salvador',      currencyName: 'Dólar',               flag: '🇸🇻' },
  ES: { name: 'España',           currencyName: 'Euro',                flag: '🇪🇸' },
  PL: { name: 'Polonia',          currencyName: 'Esloti polaco',       flag: '🇵🇱' },
  US: { name: 'Estados Unidos',   currencyName: 'Dólar',               flag: '🇺🇸' },
  EU: { name: 'Europa',           currencyName: 'Euro',                flag: '🇪🇺' },
  CN: { name: 'China',            currencyName: 'Yuan chino',          flag: '🇨🇳' },
  AE: { name: 'Emiratos Árabes',  currencyName: 'Dírham emiratí',      flag: '🇦🇪' },
  GB: { name: 'Reino Unido',      currencyName: 'Libra esterlina',     flag: '🇬🇧' },
  CA: { name: 'Canadá',           currencyName: 'Dólar canadiense',    flag: '🇨🇦' },
  AU: { name: 'Australia',        currencyName: 'Dólar australiano',   flag: '🇦🇺' },
  HK: { name: 'Hong Kong',        currencyName: 'Dólar de Hong Kong',  flag: '🇭🇰' },
  JP: { name: 'Japón',            currencyName: 'Yen japonés',         flag: '🇯🇵' },
  SG: { name: 'Singapur',         currencyName: 'Dólar de Singapur',   flag: '🇸🇬' },
  ZA: { name: 'Sudáfrica',        currencyName: 'Rand sudafricano',    flag: '🇿🇦' },
  NG: { name: 'Nigeria',          currencyName: 'Naira nigeriana',     flag: '🇳🇬' },
}

function CountryFlag({ code }) {
  return (
    <img
      src={`https://flagcdn.com/48x36/${code.toLowerCase()}.png`}
      alt={code}
      style={{ width: 40, height: 30, borderRadius: 6, objectFit: 'cover' }}
      onError={e => {
        e.currentTarget.style.display = 'none'
        e.currentTarget.nextSibling && (e.currentTarget.nextSibling.style.display = 'flex')
      }}
    />
  )
}

function DestinationCountryCard({ country }) {
  const isManual = country.payinMethod === 'manual'
  return (
    <div
      style={{
        flexShrink:   0,
        background:   'var(--color-bg-secondary)',
        borderRadius: 'var(--radius-xl)',
        padding:      14,
        border:       '1px solid var(--color-border)',
        boxShadow:    'var(--shadow-card)',
        minWidth:     108,
        display:      'flex',
        flexDirection:'column',
        alignItems:   'center',
        gap:          8,
      }}
    >
      <div style={{ position: 'relative', width: 40, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CountryFlag code={country.code} />
        <div
          style={{
            position:        'absolute', inset: 0,
            alignItems:      'center', justifyContent: 'center',
            borderRadius:    6, background: 'var(--color-bg-elevated)',
            fontSize:        '0.625rem', fontWeight: 700,
            color:           'var(--color-text-muted)', display: 'none',
          }}
        >
          {country.code}
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.2 }}>
          {country.name}
        </p>
        <p style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
          {country.currencyName}
        </p>
        {isManual && (
          <span
            style={{
              display:      'inline-block', marginTop: 4,
              fontSize:     '0.5625rem', fontWeight: 600,
              color:        'var(--color-warning)',
              background:   'var(--color-warning-bg)',
              border:       '1px solid rgba(245,158,11,0.25)',
              padding:      '1px 6px',
              borderRadius: 'var(--radius-full)',
              lineHeight:   1.4,
            }}
          >
            Verificación manual
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user }                            = useAuth()
  const { data, loading, error }            = useDashboard()
  const [destCountries, setDestCountries]   = useState([])

  useEffect(() => {
    listUserCorridors()
      .then(res => {
        const seen = new Set()
        const list = []
        for (const c of (res.corridors ?? res)) {
          const code = c.destinationCountry
          if (!code || seen.has(code)) continue
          seen.add(code)
          const meta = COUNTRY_META[code] ?? {}
          list.push({
            code,
            name:         meta.name         || c.destinationCountryName || code,
            flag:         meta.flag         || c.destinationFlag        || '🌍',
            currencyName: meta.currencyName  || c.destinationCurrency   || '—',
            payinMethod:  c.payinMethod ?? null,
          })
        }
        setDestCountries(list)
      })
      .catch(() => {})
  }, [])

  const firstName         = data?.user?.firstName ?? user?.firstName ?? ''
  const legalEntity       = data?.user?.entity    ?? user?.legalEntity ?? 'LLC'
  const kycStatus         = data?.user?.kycStatus ?? user?.kycStatus  ?? 'pending'
  const activeTransactions = data?.stats?.activeTransactions ?? 0
  const stats             = data?.stats
  const recentTxs         = data?.recentTransactions ?? []
  const hasTransactions   = stats != null && stats.totalTransactions > 0

  const originCurrency = legalEntity === 'SRL' ? 'BOB' : legalEntity === 'LLC' ? 'USD' : 'CLP'

  function formatOriginAmount(amount) {
    if (!amount && amount !== 0) return '—'
    if (originCurrency === 'BOB') return `Bs ${Number(amount).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    if (originCurrency === 'USD') return `$ ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    return `$ ${Number(amount).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  return (
    <div style={{ paddingTop: 16 }}>

      <WelcomeBanner firstName={firstName} kycStatus={kycStatus} activeTransactions={activeTransactions} />

      {/* Stats */}
      {loading ? (
        <StatsSkeletons />
      ) : !hasTransactions ? (
        <div
          style={{
            margin: '0 16px 16px',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-bg-secondary)',
            padding: '24px 20px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '2rem', marginBottom: 8 }}>🚀</p>
          <p style={{ fontSize: 'var(--font-md)', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            Bienvenido a Alyto
          </p>
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-secondary)' }}>
            Realiza tu primera transferencia hoy
          </p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 mb-4 pb-1">
          <StatCard label="Total enviado" value={formatOriginAmount(stats.totalSent)} accent="var(--color-text-primary)" />
          <StatCard label="Transferencias" value={stats.totalTransactions} accent="var(--color-accent-teal)" />
          <StatCard label="Completadas" value={stats.completedTransactions} accent="var(--color-success)" />
          <StatCard label="En proceso" value={stats.activeTransactions} accent={stats.activeTransactions > 0 ? 'var(--color-teal-status)' : 'var(--color-text-muted)'} />
        </div>
      )}

      <QuickActions kycStatus={kycStatus} />

      <RecentTransactions transactions={recentTxs} loading={loading} />

      {/* Destination countries */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', marginBottom: 12 }}>
          <p style={{ fontSize: 'var(--font-lg)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            ¿A dónde puedes enviar?
          </p>
          {destCountries.length > 0 && (
            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--color-text-muted)' }}>
              {destCountries.length} país{destCountries.length !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
        {destCountries.length === 0 ? (
          <div
            style={{
              margin: '0 16px', padding: 16, borderRadius: 'var(--radius-xl)',
              background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-text-muted)' }}>Sin destinos disponibles aún.</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-1">
            {destCountries.map(c => <DestinationCountryCard key={c.code} country={c} />)}
          </div>
        )}
      </div>

      {error && !data && (
        <div
          style={{
            margin: '0 16px 16px',
            borderRadius: 'var(--radius-xl)',
            background: 'var(--color-error-bg)',
            border: '1px solid rgba(239,68,68,0.25)',
            padding: '12px 16px',
          }}
        >
          <p style={{ fontSize: 'var(--font-sm)', color: 'var(--color-error)' }}>{error}</p>
        </div>
      )}

    </div>
  )
}
