/**
 * WalletLabPage — apartado "Alyto Dark Minimal" para la wallet.
 *
 * QUÉ ES: una propuesta de estilo completa, viva en /lab/wallet, sobre los
 * datos REALES de la wallet del usuario. No reemplaza nada: /wallet sigue
 * intacta con su diseño claro, y ningún archivo de esa pantalla fue tocado.
 *
 * QUÉ NO HACE: no mueve dinero. Depositar, enviar, retirar, cobrar y convertir
 * navegan a las pantallas que ya tienen esos flujos probados. Reimplementar acá
 * la lógica de dinero daría dos copias de la misma regla, y la copia se
 * desactualiza en silencio.
 *
 * Se renderiza fuera de `AppLayout` a propósito: el header y la barra inferior
 * de la app son claros, y mezclarlos rompería la evaluación del tema oscuro.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownToLine, ArrowUpRight, Building2, FlaskConical,
  QrCode, ShieldCheck, X,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import useWalletLabData from './useWalletLabData'

import LabHeader       from './components/LabHeader'
import CurrencyTabs    from './components/CurrencyTabs'
import HeroBalanceCard from './components/HeroBalanceCard'
import ActionRow       from './components/ActionRow'
import QuickSwapCard   from './components/QuickSwapCard'
import DailyLimitsCard from './components/DailyLimitsCard'
import AliasCard       from './components/AliasCard'
import MovementsSection from './components/MovementsSection'
import LabBottomNav    from './components/LabBottomNav'

import './theme-dark-minimal.css'

export default function WalletLabPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [currency, setCurrency] = useState('BOB')
  const [avisoVisible, setAvisoVisible] = useState(true)

  const d = useWalletLabData()

  // Mismo guard que la wallet vigente (WalletPage.jsx:2392): el ledger dual en
  // bolivianos es exclusivo de los usuarios de la SRL boliviana.
  useEffect(() => {
    if (user && user.legalEntity !== 'SRL') navigate('/dashboard', { replace: true })
  }, [user, navigate])

  /**
   * El `body` de la app tiene fondo claro (`--color-bg-app` en index.css). Sin
   * esto, al hacer scroll por rebote asoma una banda blanca por debajo del
   * tema oscuro. Se revierte al desmontar para no contaminar el resto de la app.
   */
  useEffect(() => {
    const previo = document.body.style.background
    document.body.style.background = '#080E18'
    return () => { document.body.style.background = previo }
  }, [])

  // Al cambiar de moneda, el filtro vuelve a "Todos": las claves de filtro no
  // son las mismas en las dos listas y arrastrar una inválida deja la lista vacía.
  function cambiarMoneda(m) {
    setCurrency(m)
    d.setFilter('all')
    d.setPage(1)
  }

  const esBOB = currency === 'BOB'
  const act   = esBOB ? d.bob : d.usdc

  // ── Botoneras ─────────────────────────────────────────────────────────────
  // Cada acción abre el flujo real. `/wallet` es la pantalla que tiene los
  // modales de depósito, retiro y conversión.

  const accionesBOB = [
    { id: 'cargar',  label: 'Cargar',    icon: ArrowDownToLine, primary: true,
      onClick: () => navigate('/wallet'), title: 'Abre el depósito en la wallet' },
    { id: 'enviar',  label: 'Enviar',    icon: ArrowUpRight,
      onClick: () => navigate('/wallet') },
    { id: 'qr',      label: 'QR Simple', icon: QrCode,
      onClick: () => navigate('/wallet/qr') },
    { id: 'retirar', label: 'Retirar',   icon: Building2,
      onClick: () => navigate('/wallet') },
  ]

  const accionesUSDC = [
    { id: 'depositar', label: 'Depositar', icon: ArrowDownToLine, primary: true,
      onClick: () => navigate('/wallet') },
    { id: 'enviar',    label: 'Enviar',    icon: ArrowUpRight,
      onClick: () => navigate('/wallet/usdc/send') },
    { id: 'cobrar',    label: 'Cobrar',    icon: QrCode,
      onClick: () => navigate('/wallet') },
  ]

  return (
    <div className="adm">
      <div className="adm__frame">

        <LabHeader
          nombre={user?.firstName}
          subtitulo="Inicio"
          onScan={() => navigate('/wallet/qr')}
          onPerfil={() => navigate('/profile')}
        />

        {/* El apartado se identifica como propuesta de estilo. Sin esto, alguien
            que llega por URL no distingue esta pantalla de la wallet oficial. */}
        {avisoVisible && (
          <div className="mx-4 mb-3 flex items-start gap-2.5 rounded-2xl px-3.5 py-3"
               style={{ background: 'var(--adm-surface)', border: '1px solid var(--adm-border)' }}>
            <FlaskConical size={15} className="mt-0.5 flex-none" style={{ color: 'var(--adm-text-secondary)' }} />
            <p className="flex-1 text-[11px] font-medium leading-relaxed" style={{ color: 'var(--adm-text-60)' }}>
              Propuesta de estilo <strong style={{ color: 'var(--adm-text-70)' }}>Dark Minimal</strong>.
              Los saldos y movimientos son tus datos reales; las acciones te llevan
              a las pantallas de siempre. Tu wallet oficial sigue en <code>/wallet</code>.
            </p>
            <button type="button" onClick={() => setAvisoVisible(false)} aria-label="Ocultar aviso"
                    className="flex h-7 w-7 flex-none items-center justify-center rounded-full">
              <X size={13} style={{ color: 'var(--adm-text-muted)' }} />
            </button>
          </div>
        )}

        <div className="flex flex-col gap-4 pb-4">

          <CurrencyTabs value={currency} onChange={cambiarMoneda} />

          {esBOB ? (
            <HeroBalanceCard
              currency="BOB"
              available={d.bob.available}
              reserved={d.bob.reserved}
              frozen={d.bob.frozen}
              error={d.bob.error}
              loading={d.loading}
              onRetry={d.refresh}
              badge={
                <span className="adm__pill">
                  <ShieldCheck size={11} aria-hidden="true" />
                  Custodia segura
                </span>
              }
            >
              <ActionRow acciones={accionesBOB} />
            </HeroBalanceCard>
          ) : (
            <HeroBalanceCard
              currency="USDC"
              available={d.usdc.available}
              reserved={d.usdc.reserved}
              error={d.usdc.error}
              loading={d.loading}
              onRetry={d.refresh}
              /* La red se nombra por lo que de verdad liquida este activo:
                 Stellar. La especificación decía "Polygon / Solana" y en esta
                 wallet eso no es cierto: el USDC vive en Stellar. */
              badge={<span className="adm__pill adm__pill--usdc">Red Stellar</span>}
            >
              <ActionRow acciones={accionesUSDC} />
            </HeroBalanceCard>
          )}

          <QuickSwapCard
            rate={d.rate}
            currency={currency}
            onConvert={() => navigate('/wallet')}
          />

          {esBOB
            ? <DailyLimitsCard limits={d.limits} />
            : <AliasCard alias={d.alias} onGestionar={() => navigate('/wallet')} />}

          <MovementsSection
            currency={currency}
            txs={act.txs}
            total={act.txTotal}
            error={act.txError}
            loading={d.txLoading}
            filter={d.filter}
            onFilterChange={(f) => { d.setFilter(f); d.setPage(1) }}
            page={d.page}
            onPageChange={d.setPage}
            onVerTodos={() => navigate('/transactions')}
            onAbrirTx={(tx) => navigate(`/transactions/${tx.wtxId ?? tx._id}`)}
            onRetry={d.refresh}
          />

        </div>
      </div>

      <LabBottomNav activo="inicio" onNavigate={navigate} />
    </div>
  )
}
