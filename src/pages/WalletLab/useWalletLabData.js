/**
 * useWalletLabData — lectura de la wallet para el apartado Dark Minimal.
 *
 * Consume EXACTAMENTE los mismos endpoints que `pages/Wallet/WalletPage.jsx`.
 * Acá no vive ni una regla de negocio: no escribe, no convierte, no dispersa.
 * Es una vista nueva sobre los mismos datos, para que el estilo se pueda
 * evaluar con los saldos de verdad y no con cifras de adorno.
 *
 * Por qué cada fallo se guarda por separado: el error de lectura NO puede
 * degradarse a cero. En la wallet vigente eso ya pasó una vez (ver el comentario
 * de `fetchWallet` en WalletPage.jsx:2401) y un saldo en cero que en realidad es
 * "no pude leerlo" es una mentira sobre el dinero del usuario. Si falla, la
 * tarjeta lo dice; nunca inventa un número.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { request } from '../../services/api'

/** Milisegundos del refresco automático de saldos, igual que la wallet vigente. */
const REFRESH_MS = 30_000

export default function useWalletLabData() {
  // ── BOB ───────────────────────────────────────────────────────────────────
  const [bob,        setBob]        = useState(null)
  const [bobError,   setBobError]   = useState('')
  const [bobTxs,     setBobTxs]     = useState([])
  const [bobTxTotal, setBobTxTotal] = useState(0)
  const [bobTxError, setBobTxError] = useState('')

  // ── USDC ──────────────────────────────────────────────────────────────────
  const [usdc,        setUsdc]        = useState(null)
  const [usdcError,   setUsdcError]   = useState('')
  const [usdcTxs,     setUsdcTxs]     = useState([])
  const [usdcTxTotal, setUsdcTxTotal] = useState(0)
  const [usdcTxError, setUsdcTxError] = useState('')

  // ── Comunes ───────────────────────────────────────────────────────────────
  const [limits,   setLimits]   = useState(null)   // { send:{used,limit}, withdrawal:{used,limit} }
  const [alias,    setAlias]    = useState(null)   // { alias, canChangeAt } | false
  const [rate,     setRate]     = useState(null)   // { buy, sell, market }
  const [loading,  setLoading]  = useState(true)
  const [txLoading, setTxLoading] = useState(false)

  // Filtros y paginación de la lista visible
  const [filter, setFilter] = useState('all')
  const [page,   setPage]   = useState(1)

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const fetchBob = useCallback(async () => {
    try {
      setBob(await request('/wallet/balance'))
      setBobError('')
    } catch (err) {
      console.warn('[lab] saldo BOB:', err?.status, err?.message)
      setBobError(err?.message || 'No se pudo leer el saldo.')
    }
  }, [])

  const fetchUsdc = useCallback(async () => {
    try {
      setUsdc(await request('/wallet/usdc/balance'))
      setUsdcError('')
    } catch (err) {
      console.warn('[lab] saldo USDC:', err?.status, err?.message)
      setUsdcError(err?.message || 'No se pudo leer el saldo.')
    }
  }, [])

  const fetchBobTxs = useCallback(async (p = 1, f = 'all') => {
    const typeParam = f !== 'all' ? `&type=${f}` : ''
    try {
      const data = await request(`/wallet/transactions?page=${p}&limit=10${typeParam}`)
      setBobTxs(data.transactions ?? [])
      setBobTxTotal(data.pagination?.total ?? 0)
      setBobTxError('')
    } catch (err) {
      console.warn('[lab] movimientos BOB:', err?.status, err?.message)
      setBobTxError(err?.message || 'No se pudieron cargar los movimientos.')
    }
  }, [])

  const fetchUsdcTxs = useCallback(async (p = 1, f = 'all') => {
    const typeParam = f !== 'all' ? `&type=${f}` : ''
    try {
      const data = await request(`/wallet/usdc/transactions?page=${p}&limit=10${typeParam}`)
      setUsdcTxs(data.transactions ?? [])
      setUsdcTxTotal(data.pagination?.total ?? 0)
      setUsdcTxError('')
    } catch (err) {
      console.warn('[lab] movimientos USDC:', err?.status, err?.message)
      setUsdcTxError(err?.message || 'No se pudieron cargar los movimientos.')
    }
  }, [])

  const fetchLimits = useCallback(async () => {
    try {
      const data = await request('/wallet/daily-limits')
      setLimits(data && typeof data === 'object' ? data : null)
    } catch (err) {
      // Sin límites la tarjeta se oculta: es preferible a dibujar barras vacías
      // que se leen como "no gastaste nada hoy".
      console.warn('[lab] límites diarios:', err?.status, err?.message)
      setLimits(null)
    }
  }, [])

  const fetchAlias = useCallback(async () => {
    try {
      const data = await request('/wallet/alias/me')
      setAlias(data ?? false)
    } catch {
      setAlias(false)
    }
  }, [])

  /**
   * Cotización BOB/USDC. Solo se publica si el backend devolvió un número
   * usable; si no, queda en null y el módulo de conversión dice que no hay
   * cotización. Nunca se cablea un valor por defecto: la tasa de Bolivia se
   * mueve y un número viejo incrustado en el código es peor que ninguno.
   */
  const fetchRate = useCallback(async () => {
    try {
      const data = await request('/wallet/usdc/rate')
      if (!data || typeof data !== 'object' || data instanceof Response) {
        setRate(null)
        return
      }
      const num = (v) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : null }
      const buy = num(data.bobPerUsdc ?? data.rate)
      if (!buy) {
        console.warn('[lab] cotización sin tasa válida:', data)
        setRate(null)
        return
      }
      setRate({ buy, sell: num(data.sellBobPerUsdc), market: num(data.marketRate) })
    } catch (err) {
      console.warn('[lab] cotización:', err?.status, err?.message)
      setRate(null)
    }
  }, [])

  // ── Carga inicial ─────────────────────────────────────────────────────────

  useEffect(() => {
    let vivo = true
    ;(async () => {
      await Promise.allSettled([
        fetchBob(), fetchUsdc(), fetchLimits(), fetchAlias(), fetchRate(),
      ])
      if (vivo) setLoading(false)
    })()
    return () => { vivo = false }
  }, [fetchBob, fetchUsdc, fetchLimits, fetchAlias, fetchRate])

  // Las dos listas se piden a la vez porque el usuario alterna de pestaña sin
  // recargar y esperar en cada toque se siente roto.
  useEffect(() => {
    let vivo = true
    setTxLoading(true)
    Promise.allSettled([fetchBobTxs(page, filter), fetchUsdcTxs(page, filter)])
      .then(() => { if (vivo) setTxLoading(false) })
    return () => { vivo = false }
  }, [fetchBobTxs, fetchUsdcTxs, page, filter])

  // ── Refresco en segundo plano ─────────────────────────────────────────────

  const refsRef = useRef({ fetchBob, fetchUsdc, fetchRate })
  refsRef.current = { fetchBob, fetchUsdc, fetchRate }

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      const { fetchBob: b, fetchUsdc: u, fetchRate: r } = refsRef.current
      b(); u(); r()
    }, REFRESH_MS)
    return () => clearInterval(id)
  }, [])

  const refresh = useCallback(() => Promise.allSettled([
    fetchBob(), fetchUsdc(), fetchLimits(), fetchRate(),
    fetchBobTxs(page, filter), fetchUsdcTxs(page, filter),
  ]), [fetchBob, fetchUsdc, fetchLimits, fetchRate, fetchBobTxs, fetchUsdcTxs, page, filter])

  // ── Derivados ─────────────────────────────────────────────────────────────
  // Disponible = total - reservado, igual que WalletPage.jsx:2625. `null`
  // cuando no hay lectura, para que la UI distinga "cero" de "no sé".

  const disponible = (w) =>
    w ? Math.max(0, (w.balance ?? 0) - (w.balanceReserved ?? 0)) : null

  return {
    loading,
    txLoading,
    refresh,

    filter, setFilter,
    page,   setPage,

    bob: {
      available: disponible(bob),
      reserved:  bob ? (bob.balanceReserved ?? 0) : null,
      frozen:    bob ? (bob.balanceFrozen ?? 0) : null,
      status:    bob?.status ?? null,
      error:     bobError,
      txs:       bobTxs,
      txTotal:   bobTxTotal,
      txError:   bobTxError,
    },
    usdc: {
      available: disponible(usdc),
      reserved:  usdc ? (usdc.balanceReserved ?? 0) : null,
      status:    usdc?.status ?? null,
      error:     usdcError,
      txs:       usdcTxs,
      txTotal:   usdcTxTotal,
      txError:   usdcTxError,
    },

    limits,
    alias,
    rate,
  }
}
