/**
 * CurrencyTabs — selector de moneda (BOB / USDC).
 *
 * El color protagonista cambia con la pestaña: azul institucional para
 * bolivianos, esmeralda para dólares digitales. Es la señal principal de en
 * qué moneda está operando el usuario, así que no se apoya solo en el color:
 * la etiqueta dice la moneda y el punto marca la activa.
 */

export default function CurrencyTabs({ value, onChange }) {
  const tabs = [
    { id: 'BOB',  label: 'Bolivianos', sub: 'BOB',  activa: 'adm__tab--active-bob' },
    { id: 'USDC', label: 'Dólares',    sub: 'USDC', activa: 'adm__tab--active-usdc' },
  ]

  return (
    <div className="px-4" role="tablist" aria-label="Moneda">
      <div className="adm__tabs">
        {tabs.map((t) => {
          const on = value === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onChange(t.id)}
              className={`adm__tab ${on ? t.activa : ''}`}
            >
              {on && <span className="adm__tab-dot" aria-hidden="true" />}
              <span>{t.label}</span>
              <span style={{ opacity: 0.7, fontSize: 11, fontWeight: 700 }}>{t.sub}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
