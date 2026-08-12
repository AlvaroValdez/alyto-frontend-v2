/**
 * QuoteContext.jsx — Cotización viva durante todo el flujo de envío.
 *
 * El socket de cotización vive aquí, por encima de los pasos del wizard, y no
 * dentro del Step 1. Antes se montaba en Step1Amount: al avanzar al formulario
 * de beneficiario ese componente se desmontaba, el WebSocket se cerraba y el
 * countdown quedaba congelado en el valor que tenía al salir del paso 1. El
 * usuario llenaba 9-15 campos contra un reloj que ya venía corriendo y llegaba
 * al paso 4 con la cotización vencida.
 *
 * Manteniendo el proveedor montado, el backend sigue empujando `quote_update`
 * cada 60 s (ver quoteSocket.js → scheduleRefresh) y `quoteExpiresAt` se renueva
 * solo mientras el usuario escribe.
 *
 * Step1Amount publica los parámetros con setQuoteParams(); el resto de los pasos
 * solo consume la cotización.
 */

import { createContext, useCallback, useContext, useState } from 'react'
import { useQuoteSocket } from '../hooks/useQuoteSocket'

const QuoteContext = createContext(null)

const EMPTY_PARAMS = { originAmount: null, destinationCountry: null, corridorId: null }

export function QuoteProvider({ children }) {
  const [params, setParams] = useState(EMPTY_PARAMS)

  const socket = useQuoteSocket(
    params.originAmount,
    params.destinationCountry,
    params.corridorId,
  )

  // Solo cambia la referencia cuando algún parámetro cambió de verdad: evita
  // re-suscripciones del socket en cada render del Step 1.
  const setQuoteParams = useCallback((next) => {
    setParams(prev =>
      prev.originAmount       === next.originAmount &&
      prev.destinationCountry === next.destinationCountry &&
      prev.corridorId         === next.corridorId
        ? prev
        : { ...next },
    )
  }, [])

  return (
    <QuoteContext.Provider value={{ ...socket, setQuoteParams }}>
      {children}
    </QuoteContext.Provider>
  )
}

export function useQuoteContext() {
  const ctx = useContext(QuoteContext)
  if (!ctx) throw new Error('useQuoteContext debe usarse dentro de <QuoteProvider>')
  return ctx
}
