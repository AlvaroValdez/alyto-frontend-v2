/**
 * LabBottomNav — navegación inferior del apartado.
 *
 * Es propia porque esta pantalla se renderiza FUERA de `AppLayout`: si usara el
 * layout de la app traería el header y la barra claros, y el apartado dejaría
 * de ser una propuesta visual completa.
 *
 * Los destinos son las rutas reales, así que desde acá se vuelve a la app de
 * siempre con un toque.
 */

import { Home, ArrowLeftRight, LayoutGrid, User } from 'lucide-react'

export default function LabBottomNav({ activo = 'inicio', onNavigate }) {
  const items = [
    { id: 'inicio',      label: 'Inicio',      icon: Home,           to: null },
    { id: 'movimientos', label: 'Movimientos', icon: ArrowLeftRight, to: '/transactions' },
    { id: 'servicios',   label: 'Servicios',   icon: LayoutGrid,     to: '/dashboard' },
    { id: 'perfil',      label: 'Perfil',      icon: User,           to: '/profile' },
  ]

  return (
    <nav className="adm__nav" aria-label="Navegación principal">
      <div className="adm__frame flex w-full justify-around">
        {items.map(({ id, label, icon: Icon, to }) => {
          const on = activo === id
          return (
            <button
              key={id}
              type="button"
              aria-current={on ? 'page' : undefined}
              onClick={() => to && onNavigate(to)}
              className={`adm__nav-item ${on ? 'adm__nav-item--active' : ''}`}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
