/**
 * AliasCard — alias de cobro del usuario (exclusivo de la vista USDC).
 *
 * El alias sale de `/wallet/alias/me`. Dos correcciones respecto de la
 * especificación:
 *
 *  - El ejemplo "@huascar.alyto" no es un alias válido en este sistema: el
 *    backend acepta /^[a-z0-9_]{3,20}$/, sin puntos ni sufijo de dominio.
 *    Acá se muestra el alias real, y si el usuario no tiene ninguno, se lo
 *    invita a crearlo en la pantalla que ya hace esa gestión.
 *
 *  - La especificación lo describía como "sin comisión". Eso es una afirmación
 *    sobre el tarifario que esta pantalla no puede verificar, así que no se
 *    enuncia. El texto dice para qué sirve el alias, no cuánto cuesta.
 */

import { useState } from 'react'
import { AtSign, Check, Copy, Plus } from 'lucide-react'

export default function AliasCard({ alias, onGestionar }) {
  const [copiado, setCopiado] = useState(false)

  const valor = alias?.alias ? `@${alias.alias}` : null

  async function copiar() {
    if (!valor) return
    try {
      await navigator.clipboard.writeText(valor)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Sin portapapeles (WebView sin permiso, contexto no seguro) el alias
      // sigue visible en pantalla para copiarlo a mano. No se finge el éxito.
      setCopiado(false)
    }
  }

  return (
    <section className="adm__card mx-4">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 flex-none items-center justify-center rounded-xl"
          style={{ background: 'var(--adm-usdc-tint)', border: '1px solid var(--adm-usdc-border)' }}
        >
          <AtSign size={18} style={{ color: '#6EE7B7' }} aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          {valor ? (
            <>
              <p
                className="truncate text-[15px] font-bold"
                style={{ color: 'var(--adm-text)' }}
              >
                {valor}
              </p>
              <p className="mt-0.5 text-[11px] font-medium" style={{ color: 'var(--adm-text-muted)' }}>
                Tu alias para recibir pagos transfronterizos en USDC
              </p>
            </>
          ) : (
            <>
              <p className="text-[14px] font-semibold" style={{ color: 'var(--adm-text-70)' }}>
                Aún no tienes alias
              </p>
              <p className="mt-0.5 text-[11px] font-medium" style={{ color: 'var(--adm-text-muted)' }}>
                Créalo para recibir pagos sin compartir tu dirección Stellar
              </p>
            </>
          )}
        </div>

        {valor ? (
          <button
            type="button"
            onClick={copiar}
            aria-label={copiado ? 'Alias copiado' : 'Copiar alias'}
            className="flex h-11 w-11 flex-none items-center justify-center rounded-full"
            style={{ background: 'var(--adm-surface-soft)', border: '1px solid var(--adm-border)' }}
          >
            {copiado
              ? <Check size={17} style={{ color: 'var(--adm-success)' }} />
              : <Copy size={17} style={{ color: 'var(--adm-text-70)' }} />}
          </button>
        ) : (
          <button
            type="button"
            onClick={onGestionar}
            className="flex flex-none items-center gap-1.5 rounded-full px-3.5 text-[12px] font-bold"
            style={{
              minHeight: 44,
              background: 'var(--adm-usdc-tint)',
              border: '1px solid var(--adm-usdc-border)',
              color: '#6EE7B7',
            }}
          >
            <Plus size={14} aria-hidden="true" />
            Crear
          </button>
        )}
      </div>
    </section>
  )
}
