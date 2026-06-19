/**
 * navigation.js — Puente de navegación para el código nativo (Capacitor).
 *
 * Los handlers nativos (deep links, tap en push, botón atrás) viven fuera del
 * árbol React, así que no pueden usar useNavigate() directamente. Este módulo
 * expone una referencia que el componente <NativeBridge/> rellena con la función
 * navigate() de react-router una vez montado dentro del <BrowserRouter>.
 */

export const nav = {
  /** @type {((to: string, opts?: object) => void) | null} */
  navigate: null,
};

/** Navega a una ruta interna si el puente ya está listo; si no, hace fallback. */
export function goTo(path) {
  if (!path) return;
  if (nav.navigate) {
    nav.navigate(path);
  } else {
    // Fallback antes de que React monte (ej. cold start por tap en push):
    // guardar el destino y dejar que <NativeBridge/> lo consuma al inicializar.
    pendingPath = path;
  }
}

let pendingPath = null;

/** Devuelve y limpia una ruta pendiente capturada antes de montar el router. */
export function consumePendingPath() {
  const p = pendingPath;
  pendingPath = null;
  return p;
}
