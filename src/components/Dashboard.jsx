import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  Bell,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Plus,
  Home,
  BarChart2,
  FileText,
  User,
  TrendingUp,
  Building2,
  Globe,
  Landmark,
  ShieldAlert,
  Shield,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// ── Mock data (multi-entity architecture) ──────────────────────────────────
const TRANSACTIONS = [
  {
    id: 1,
    type: 'payin',
    entity: 'SpA',
    jurisdiction: 'CL',
    description: 'Pay-in SpA',
    detail: 'AV Finance SpA · Fintoc A2A',
    amount: '+$4.200,00',
    currency: 'USDC',
    date: 'Hoy, 09:14',
    status: 'confirmed',
    icon: Landmark,
    iconBg: '#22C55E1A',
    iconColor: '#22C55E',
  },
  {
    id: 2,
    type: 'settlement',
    entity: 'SRL',
    jurisdiction: 'BO',
    description: 'Liquidación SRL',
    detail: 'AV Finance SRL · Anchor Manual BO',
    amount: '-$1.850,00',
    currency: 'BOB',
    date: 'Hoy, 08:32',
    status: 'confirmed',
    icon: Building2,
    iconBg: '#EF44441A',
    iconColor: '#EF4444',
  },
  {
    id: 3,
    type: 'crossborder',
    entity: 'LLC',
    jurisdiction: 'US',
    description: 'Pay-out internacional',
    detail: 'AV Finance LLC · OwlPay Harbor',
    amount: '+$9.000,00',
    currency: 'USDC',
    date: 'Ayer, 16:55',
    status: 'confirmed',
    icon: Globe,
    iconBg: '#C4CBD81A',
    iconColor: '#C4CBD8',
  },
  {
    id: 4,
    type: 'tokenization',
    entity: 'SpA',
    jurisdiction: 'CL',
    description: 'Tokenización CLPX',
    detail: 'AV Finance SpA · Stellar Network',
    amount: '+$2.340,00',
    currency: 'CLPX',
    date: 'Ayer, 11:20',
    status: 'confirmed',
    icon: TrendingUp,
    iconBg: '#22C55E1A',
    iconColor: '#22C55E',
  },
  {
    id: 5,
    type: 'payin',
    entity: 'LLC',
    jurisdiction: 'US',
    description: 'Pay-in B2B',
    detail: 'AV Finance LLC · Stripe',
    amount: '+$12.500,00',
    currency: 'USD',
    date: '15 mar, 14:05',
    status: 'pending',
    icon: TrendingUp,
    iconBg: '#C4CBD81A',
    iconColor: '#C4CBD8',
  },
  {
    id: 6,
    type: 'settlement',
    entity: 'SRL',
    jurisdiction: 'BO',
    description: 'Liquidación SRL',
    detail: 'AV Finance SRL · Anchor BO',
    amount: '-$3.100,00',
    currency: 'BOB',
    date: '14 mar, 10:00',
    status: 'confirmed',
    icon: Building2,
    iconBg: '#EF44441A',
    iconColor: '#EF4444',
  },
]

const ASSETS = [
  { symbol: 'USDC', name: 'USD Coin',           network: 'Stellar', balance: '$18,400', change: '+0.01%', up: true,  emoji: '💵' },
  { symbol: 'XLM',  name: 'Stellar Lumens',      network: 'Stellar', balance: '$3,210',  change: '+4.7%',  up: true,  emoji: '⭐' },
  { symbol: 'CLPX', name: 'Chilean Peso Token',  network: 'Stellar', balance: '$3,220',  change: '-1.2%',  up: false, emoji: '🪙' },
]

// ── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  if (status === 'confirmed') {
    return (
      <span className="text-[0.6875rem] font-medium px-2 py-0.5 rounded-full bg-[#22C55E1A] text-[#22C55E]">
        Confirmado
      </span>
    )
  }
  return (
    <span className="text-[0.6875rem] font-medium px-2 py-0.5 rounded-full bg-[#C4CBD81A] text-[#C4CBD8]">
      Pendiente
    </span>
  )
}

function EntityBadge({ entity, jurisdiction }) {
  const colors = {
    LLC: 'text-[#C4CBD8] border-[#C4CBD833]',
    SpA: 'text-[#8A96B8] border-[#26305080]',
    SRL: 'text-[#C4CBD8] border-[#C4CBD833]',
  }
  return (
    <span className={`text-[0.625rem] font-semibold px-1.5 py-0.5 rounded border ${colors[entity]} tracking-wide`}>
      {entity} · {jurisdiction}
    </span>
  )
}

function TransactionCard({ tx }) {
  const Icon = tx.icon
  const isPositive = tx.amount.startsWith('+')

  return (
    <div className="flex items-center gap-3 p-4 bg-[#1A2340] rounded-2xl">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: tx.iconBg }}
      >
        <Icon size={18} style={{ color: tx.iconColor }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[0.9375rem] text-white font-semibold truncate">
            {tx.description}
          </p>
          <EntityBadge entity={tx.entity} jurisdiction={tx.jurisdiction} />
        </div>
        <p className="text-[0.75rem] text-[#8A96B8] truncate">{tx.detail}</p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-[0.6875rem] text-[#4E5A7A]">{tx.date}</p>
          <StatusBadge status={tx.status} />
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className={`text-[0.9375rem] font-bold ${isPositive ? 'text-[#22C55E]' : 'text-[#F87171]'}`}>
          {tx.amount}
        </p>
        <p className="text-[0.6875rem] text-[#4E5A7A] mt-0.5">{tx.currency}</p>
      </div>
    </div>
  )
}

function QuickAction({ icon: Icon, label, primary, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? 'Disponible tras aprobación de identidad' : undefined}
      className={`flex flex-col items-center gap-2 bg-transparent border-none ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-150 ${
          disabled
            ? 'bg-[#1A2340] border border-[#263050] text-[#4E5A7A] opacity-40'
            : primary
              ? 'bg-[#C4CBD8] text-[#0F1628] shadow-silver'
              : 'bg-[#1A2340] border border-[#263050] text-[#8A96B8] hover:bg-[#1F2B4D] hover:border-[#C4CBD833] hover:text-[#C4CBD8]'
        }`}
      >
        <Icon size={20} />
      </div>
      <span className={`text-[0.6875rem] font-medium ${disabled ? 'text-[#4E5A7A]' : primary ? 'text-[#C4CBD8]' : 'text-[#8A96B8]'}`}>
        {label}
      </span>
    </button>
  )
}

// ── Main Dashboard ──────────────────────────────────────────────────────────

// ── KYC Banner ──────────────────────────────────────────────────────────────

function KycPendingBanner() {
  return (
    <Link
      to="/kyc"
      className="mx-4 mb-1 flex items-start gap-3 rounded-2xl px-4 py-3.5 no-underline transition-all duration-150 hover:border-[#C4CBD866]"
      style={{
        background:  '#C4CBD80D',
        border:      '1px solid #C4CBD833',
      }}
    >
      <div className="w-8 h-8 rounded-xl bg-[#C4CBD81A] flex items-center justify-center flex-shrink-0 mt-0.5">
        <ShieldAlert size={15} className="text-[#C4CBD8]" />
      </div>
      <div className="flex-1">
        <p className="text-[0.875rem] font-semibold text-[#C4CBD8] mb-0.5">
          Verificación pendiente — Toca para comenzar
        </p>
        <p className="text-[0.75rem] text-[#8A96B8] leading-relaxed">
          Sube tus documentos para activar todas las funciones de tu cuenta.
        </p>
      </div>
      <svg
        width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="#4E5A7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="flex-shrink-0 mt-1"
      >
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </Link>
  )
}

export default function Dashboard() {
  const navigate         = useNavigate()
  const location         = useLocation()
  const { user, logout } = useAuth()

  const kycPending = !user?.kycStatus || user.kycStatus === 'pending' || user.kycStatus === 'in_review'

  return (
    <div className="min-h-screen bg-[#0F1628] font-sans flex flex-col max-w-[430px] mx-auto relative">

      {/* ── SCROLL AREA ── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide pb-24">

        {/* ── STATUS BAR ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-1">
          <span className="text-[0.8125rem] font-semibold text-white">9:41</span>
          <div className="flex items-center gap-1.5 text-white">
            <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor" opacity="0.9">
              <rect x="0" y="3" width="3" height="9" rx="1"/>
              <rect x="4.5" y="2" width="3" height="10" rx="1"/>
              <rect x="9" y="0.5" width="3" height="11.5" rx="1"/>
              <rect x="13.5" y="0" width="3" height="12" rx="1" opacity="0.3"/>
            </svg>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor" opacity="0.9">
              <path d="M8 2.4C10.4 2.4 12.6 3.4 14.1 5L15.5 3.5C13.6 1.3 10.9 0 8 0C5.1 0 2.4 1.3 0.5 3.5L1.9 5C3.4 3.4 5.6 2.4 8 2.4Z"/>
              <path d="M8 5.6C9.7 5.6 11.2 6.3 12.3 7.4L13.7 5.9C12.2 4.4 10.2 3.5 8 3.5C5.8 3.5 3.8 4.4 2.3 5.9L3.7 7.4C4.8 6.3 6.3 5.6 8 5.6Z"/>
              <circle cx="8" cy="10.5" r="1.5"/>
            </svg>
            <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
              <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="currentColor" strokeOpacity="0.35"/>
              <rect x="2" y="2" width="17" height="8" rx="2" fill="currentColor"/>
              <path d="M23 4.5V7.5C23.8 7.2 24.5 6.4 24.5 6C24.5 5.6 23.8 4.8 23 4.5Z" fill="currentColor" fillOpacity="0.4"/>
            </svg>
          </div>
        </div>

        {/* ── HEADER ──────────────────────────────────────────────── */}
        <header className="px-5 pt-3 pb-5">
          <div className="flex items-center justify-between mb-5">

            {/* Logo principal */}
            <img
              src="/assets/logo-alyto.png"
              alt="Alyto"
              className="h-9 w-auto object-contain"
            />

            {/* Right controls */}
            <div className="flex items-center gap-2.5">
              {/* Acceso discreto al Backoffice — solo visible para admins */}
              {user?.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin')}
                  title="Backoffice"
                  className="flex items-center gap-1.5 px-3 h-9 rounded-full border border-[#C4CBD833] bg-[#C4CBD80D] text-[#C4CBD8] text-[0.75rem] font-semibold transition-all hover:bg-[#C4CBD81A] hover:border-[#C4CBD866]"
                >
                  <Shield size={13} />
                  Backoffice
                </button>
              )}
              <button className="w-10 h-10 rounded-full bg-[#1A2340] flex items-center justify-center">
                <Bell size={17} className="text-[#8A96B8]" />
              </button>
              <div className="w-10 h-10 rounded-full border-2 border-[#C4A84F] bg-[#2A2010] flex items-center justify-center text-[#C4A84F] text-xs font-bold tracking-wide">
                AV
              </div>
            </div>
          </div>

          {/* Greeting */}
          <p className="text-[0.8125rem] text-[#8A96B8] mb-0.5">Buenos días,</p>
          <p className="text-[1.125rem] font-bold text-white">Alejandro Vargas 👋</p>
        </header>

        {/* ── BANNER KYC (visible solo si kycStatus es pending/in_review) ── */}
        {kycPending && <KycPendingBanner />}

        {/* ── BALANCE HERO CARD ────────────────────────────────────── */}
        <div className="px-4 mb-1">
          <div
            className="rounded-3xl px-6 pt-6 pb-5 relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #162035 0%, #111827 55%, #0F1628 100%)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            {/* Subtle glow top-right */}
            <div
              className="absolute top-0 right-0 w-48 h-32 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at top right, rgba(196,203,216,0.06) 0%, transparent 65%)' }}
            />

            {/* Label */}
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[0.6875rem] font-semibold text-[#8A96B8] uppercase tracking-[0.12em]">
                Balance Total
              </p>
              {/* Eye icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4E5A7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>

            {/* Amount — integer large, decimal small */}
            <div className="flex items-baseline gap-0.5 mb-2">
              <span className="text-[0.6875rem] font-bold text-white mr-0.5">$</span>
              <span className="text-[2.75rem] font-extrabold text-white leading-none tracking-tight">24,831</span>
              <span className="text-[1.375rem] font-bold text-white leading-none">.50</span>
            </div>

            {/* Change */}
            <p className="text-[0.8125rem] font-medium text-[#22C55E] mb-5">
              → +2.4% hoy
            </p>

            {/* Stats: Ingresos + Gastos as colored boxes */}
            <div className="flex gap-3">
              <div className="flex items-center gap-2.5 bg-[#22C55E15] rounded-2xl px-4 py-3 flex-1">
                <div className="w-8 h-8 rounded-xl bg-[#22C55E25] flex items-center justify-center flex-shrink-0">
                  <ArrowDownLeft size={15} className="text-[#22C55E]" />
                </div>
                <div>
                  <p className="text-[0.6875rem] text-[#8A96B8] mb-0.5">Ingresos</p>
                  <p className="text-[0.9375rem] font-bold text-white">$8,420</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 bg-[#EF444415] rounded-2xl px-4 py-3 flex-1">
                <div className="w-8 h-8 rounded-xl bg-[#EF444425] flex items-center justify-center flex-shrink-0">
                  <ArrowUpRight size={15} className="text-[#EF4444]" />
                </div>
                <div>
                  <p className="text-[0.6875rem] text-[#8A96B8] mb-0.5">Gastos</p>
                  <p className="text-[0.9375rem] font-bold text-white">$3,150</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── ACCESO INSTITUCIONAL ─────────────────────────────────── */}
        <div className="px-4 mb-1">
          <Link
            to="/corporate"
            className="flex items-center justify-between w-full px-4 py-3 rounded-2xl border border-[#C4CBD833] transition-colors hover:border-[#C4CBD866]"
            style={{ background: '#C4CBD81A' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#1D346120] flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D3461" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                </svg>
              </div>
              <span className="text-[0.8125rem] font-semibold text-[#C4CBD8]">Acceso Institucional</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded border border-[#3B82F633] text-[#3B82F6] bg-[#3B82F61A]">LLC</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4E5A7A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </Link>
        </div>

        {/* ── QUICK ACTIONS ────────────────────────────────────────── */}
        <div className="flex justify-around px-4 py-5">
          {/* Enviar bloqueado visualmente si KYC está pendiente */}
          <QuickAction
            icon={ArrowUpRight}
            label="Enviar"
            primary
            disabled={kycPending}
            onClick={() => !kycPending && navigate('/send')}
          />
          <QuickAction icon={ArrowDownLeft}  label="Recibir" />
          <QuickAction icon={ArrowLeftRight} label="Swap"    />
          <QuickAction icon={Plus}           label="Comprar" />
        </div>

        {/* ── ASSETS SECTION ──────────────────────────────────────── */}
        <div className="flex justify-between items-center px-5 pt-1 pb-3">
          <p className="text-base font-bold text-white">Mis Activos</p>
          <button className="text-[0.8125rem] font-medium text-[#C4CBD8]">Ver todos</button>
        </div>

        <div className="px-4 flex flex-col gap-2 mb-2">
          {ASSETS.map((asset) => (
            <div key={asset.symbol} className="flex items-center gap-3 p-4 bg-[#1A2340] rounded-2xl">
              <div className="w-11 h-11 rounded-xl bg-[#263050] flex items-center justify-center text-xl flex-shrink-0">
                {asset.emoji}
              </div>
              <div className="flex-1">
                <p className="text-[0.9375rem] font-semibold text-white">{asset.symbol}</p>
                <p className="text-[0.75rem] text-[#8A96B8] mt-0.5">{asset.name} · {asset.network}</p>
              </div>
              <div className="text-right">
                <p className="text-[0.9375rem] font-bold text-white">{asset.balance}</p>
                <p className={`text-[0.75rem] font-medium mt-0.5 ${asset.up ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                  {asset.change}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── TRANSACTIONS SECTION ────────────────────────────────── */}
        <div className="flex justify-between items-center px-5 pt-4 pb-3">
          <p className="text-base font-bold text-white">Historial</p>
          <button className="text-[0.8125rem] font-medium text-[#C4CBD8]">Ver todos</button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 px-4 mb-3">
          {['Todos', 'Pay-in', 'Liquidación', 'Cross-border'].map((chip, i) => (
            <button
              key={chip}
              className={`px-3 py-1.5 rounded-full text-[0.75rem] font-medium border transition-all ${
                i === 0
                  ? 'bg-[#C4CBD81A] border-[#C4CBD833] text-[#C4CBD8]'
                  : 'bg-transparent border-[#263050] text-[#4E5A7A]'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Transaction cards */}
        <div className="px-4 flex flex-col gap-2 pb-4">
          {TRANSACTIONS.map((tx) => (
            <TransactionCard key={tx.id} tx={tx} />
          ))}
        </div>
      </div>

      {/* ── BOTTOM NAV (fixed) ──────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#0F1628] border-t border-[#1A2340] flex justify-around px-2 pt-2.5 pb-6 z-50">
        {[
          { icon: Home,      label: 'Inicio',          to: '/'             },
          { icon: BarChart2, label: 'Activos',          to: '/assets'       },
          { icon: FileText,  label: 'Transferencias',   to: '/transactions' },
          { icon: User,      label: 'Perfil',           to: '/profile'      },
        ].map(({ icon: Icon, label, to }) => {
          const active = to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(to)
          return (
            <Link
              key={label}
              to={to}
              className="flex flex-col items-center gap-1 min-w-[56px] no-underline"
            >
              <Icon size={20} className={active ? 'text-[#C4CBD8]' : 'text-[#4E5A7A]'} />
              <span className={`text-[0.625rem] font-medium ${active ? 'text-[#C4CBD8]' : 'text-[#4E5A7A]'}`}>
                {label}
              </span>
              {active && <span className="w-1 h-1 rounded-full bg-[#C4CBD8]" />}
            </Link>
          )
        })}
      </nav>

    </div>
  )
}
