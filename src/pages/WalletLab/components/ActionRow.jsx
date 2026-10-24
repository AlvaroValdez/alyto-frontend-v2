/**
 * ActionRow — botonera táctil de la tarjeta de saldo.
 *
 * Los botones NO reimplementan ningún flujo: navegan a las pantallas reales
 * (/wallet, /send, /wallet/qr). Duplicar depósito, envío o retiro acá sería
 * tener dos veces la misma lógica de dinero, y la copia se desactualiza.
 *
 * Una sola acción primaria por tarjeta: es la única superficie clara de la
 * pantalla y dos compiten entre sí.
 */

export default function ActionRow({ acciones }) {
  return (
    <div className={`adm__actions adm__actions--${acciones.length}`}>
      {acciones.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={a.onClick}
          disabled={a.disabled}
          title={a.title}
          className={`adm__action ${a.primary ? 'adm__action--primary' : ''}`}
        >
          <a.icon size={18} aria-hidden="true" />
          <span>{a.label}</span>
        </button>
      ))}
    </div>
  )
}
